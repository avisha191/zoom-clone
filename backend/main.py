from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Meeting

import random
import time


# ============================================================
# CONNECTION MANAGER
# ============================================================

class ConnectionManager:

    def __init__(self):

        # ----------------------------------------------------
        # ACTIVE ROOMS
        # ----------------------------------------------------
        #
        # rooms = {
        #   meeting_id: {
        #       participant_id: {
        #           "websocket": websocket,
        #           "name": "Avisha",
        #           "mic": True,
        #           "camera": True,
        #           "host": True
        #       }
        #   }
        # }
        #

        self.rooms = {}

        # ----------------------------------------------------
        # WAITING ROOMS
        # ----------------------------------------------------

        self.waiting_rooms = {}

        # ----------------------------------------------------
        # MEETING SETTINGS
        # ----------------------------------------------------
        #
        # meeting_settings = {
        #   meeting_id: {
        #       "host_id": "...",
        #       "waiting_room": False,
        #       "started_at": ...
        #   }
        # }
        #

        self.meeting_settings = {}

        # ----------------------------------------------------
        # ENDED MEETINGS
        # ----------------------------------------------------

        self.ended_meetings = set()


    # ========================================================
    # ENSURE ROOM
    # ========================================================

    def ensure_room(self, meeting_id: str):

        if meeting_id not in self.rooms:

            self.rooms[meeting_id] = {}

        if meeting_id not in self.waiting_rooms:

            self.waiting_rooms[meeting_id] = {}

        if meeting_id not in self.meeting_settings:

            self.meeting_settings[meeting_id] = {

                "host_id": None,

                "waiting_room": False,

                "started_at": time.time()
            }


    # ========================================================
    # GET COUNT
    # ========================================================

    def get_count(self, meeting_id: str):

        if meeting_id not in self.rooms:

            return 0

        return len(
            self.rooms[meeting_id]
        )


    # ========================================================
    # CONNECT PARTICIPANT
    # ========================================================

    async def connect(
        self,
        meeting_id: str,
        participant_id: str,
        name: str,
        websocket: WebSocket
    ):

        if meeting_id in self.ended_meetings:

            await websocket.send_json({

                "type": "meeting-ended",

                "message":
                    "This meeting has ended."
            })

            await websocket.close()

            return False


        self.ensure_room(meeting_id)


        # ----------------------------------------------------
        # If same participant reconnects,
        # replace the old socket.
        # ----------------------------------------------------

        self.rooms[meeting_id][participant_id] = {

            "websocket":
                websocket,

            "name":
                name,

            "mic":
                True,

            "camera":
                True,

            "host":
                False
        }


        print(

            f"[JOIN] "
            f"meeting={meeting_id} "
            f"name={name} "
            f"id={participant_id} "
            f"participants="
            f"{self.get_count(meeting_id)}"

        )

        return True


    # ========================================================
    # DISCONNECT
    # ========================================================

    def disconnect(
        self,
        meeting_id: str,
        participant_id: str,
        websocket: WebSocket
    ):

        if meeting_id not in self.rooms:

            return False


        participant = self.rooms[
            meeting_id
        ].get(
            participant_id
        )


        if not participant:

            return False


        # ----------------------------------------------------
        # IMPORTANT
        # Old React/WebSocket connection must NOT remove
        # a newer connection of the same participant.
        # ----------------------------------------------------

        if participant["websocket"] is not websocket:

            print(

                f"[IGNORE OLD SOCKET] "
                f"participant={participant_id}"

            )

            return False


        was_host = participant.get(
            "host",
            False
        )


        del self.rooms[
            meeting_id
        ][participant_id]


        print(

            f"[LEAVE] "
            f"meeting={meeting_id} "
            f"participant={participant_id} "
            f"participants="
            f"{self.get_count(meeting_id)}"

        )


        # ----------------------------------------------------
        # REMOVE FROM WAITING ROOM TOO
        # ----------------------------------------------------

        if meeting_id in self.waiting_rooms:

            self.waiting_rooms[
                meeting_id
            ].pop(
                participant_id,
                None
            )


        # ----------------------------------------------------
        # HOST LEFT
        # Give host role to another participant.
        # ----------------------------------------------------

        if was_host and meeting_id in self.rooms:

            remaining = list(
                self.rooms[
                    meeting_id
                ].keys()
            )


            if remaining:

                new_host_id = remaining[0]


                self.rooms[
                    meeting_id
                ][
                    new_host_id
                ][
                    "host"
                ] = True


                if meeting_id in self.meeting_settings:

                    self.meeting_settings[
                        meeting_id
                    ][
                        "host_id"
                    ] = new_host_id


                print(

                    f"[NEW HOST] "
                    f"{new_host_id}"

                )


        # ----------------------------------------------------
        # REMOVE EMPTY ROOM
        # ----------------------------------------------------

        if len(
            self.rooms[meeting_id]
        ) == 0:

            del self.rooms[
                meeting_id
            ]

            self.waiting_rooms.pop(
                meeting_id,
                None
            )

            self.meeting_settings.pop(
                meeting_id,
                None
            )


        return True


    # ========================================================
    # PARTICIPANT LIST
    # ========================================================

    def get_participants(
        self,
        meeting_id: str
    ):

        if meeting_id not in self.rooms:

            return []


        result = []


        for participant_id, data in self.rooms[
            meeting_id
        ].items():

            result.append({

                "participant_id":
                    participant_id,

                "name":
                    data.get(
                        "name",
                        "Guest"
                    ),

                "mic":
                    data.get(
                        "mic",
                        True
                    ),

                "camera":
                    data.get(
                        "camera",
                        True
                    ),

                "host":
                    data.get(
                        "host",
                        False
                    )
            })


        return result


    # ========================================================
    # WAITING PARTICIPANT LIST
    # ========================================================

    def get_waiting_participants(
        self,
        meeting_id: str
    ):

        if meeting_id not in self.waiting_rooms:

            return []


        result = []


        for participant_id, data in self.waiting_rooms[
            meeting_id
        ].items():

            result.append({

                "participant_id":
                    participant_id,

                "name":
                    data.get(
                        "name",
                        "Guest"
                    )
            })


        return result


    # ========================================================
    # SEND TO ONE PARTICIPANT
    # ========================================================

    async def send_to(
        self,
        meeting_id: str,
        participant_id: str,
        message: dict
    ):

        if meeting_id not in self.rooms:

            return


        participant = self.rooms[
            meeting_id
        ].get(
            participant_id
        )


        if not participant:

            return


        try:

            await participant[
                "websocket"
            ].send_json(
                message
            )

        except Exception as error:

            print(
                f"[SEND ERROR] {error}"
            )


    # ========================================================
    # BROADCAST
    # ========================================================

    async def broadcast(
        self,
        meeting_id: str,
        message: dict,
        exclude: str | None = None
    ):

        if meeting_id not in self.rooms:

            return


        dead_connections = []


        for participant_id, data in list(
            self.rooms[
                meeting_id
            ].items()
        ):

            if participant_id == exclude:

                continue


            websocket = data[
                "websocket"
            ]


            try:

                await websocket.send_json(
                    message
                )

            except Exception:

                dead_connections.append(
                    participant_id
                )


        # ----------------------------------------------------
        # Remove dead connections
        # ----------------------------------------------------

        for participant_id in dead_connections:

            if meeting_id not in self.rooms:

                continue


            self.rooms[
                meeting_id
            ].pop(
                participant_id,
                None
            )


    # ========================================================
    # BROADCAST PARTICIPANT LIST
    # ========================================================

    async def broadcast_participant_list(
        self,
        meeting_id: str
    ):

        participants = self.get_participants(
            meeting_id
        )


        await self.broadcast(

            meeting_id,

            {

                "type":
                    "participant-list",

                "participants":
                    participants,

                "count":
                    len(participants)

            }
        )


    # ========================================================
    # UPDATE MIC
    # ========================================================

    async def update_mic(
        self,
        meeting_id: str,
        participant_id: str,
        value: bool
    ):

        if meeting_id not in self.rooms:

            return


        if participant_id not in self.rooms[
            meeting_id
        ]:

            return


        self.rooms[
            meeting_id
        ][
            participant_id
        ][
            "mic"
        ] = value


        await self.broadcast(

            meeting_id,

            {

                "type":
                    "participant-status",

                "participant_id":
                    participant_id,

                "mic":
                    value

            }
        )


        await self.broadcast_participant_list(
            meeting_id
        )


    # ========================================================
    # UPDATE CAMERA
    # ========================================================

    async def update_camera(
        self,
        meeting_id: str,
        participant_id: str,
        value: bool
    ):

        if meeting_id not in self.rooms:

            return


        if participant_id not in self.rooms[
            meeting_id
        ]:

            return


        self.rooms[
            meeting_id
        ][
            participant_id
        ][
            "camera"
        ] = value


        await self.broadcast(

            meeting_id,

            {

                "type":
                    "participant-status",

                "participant_id":
                    participant_id,

                "camera":
                    value

            }
        )


        await self.broadcast_participant_list(
            meeting_id
        )


    # ========================================================
    # HOST CHECK
    # ========================================================

    def is_host(
        self,
        meeting_id: str,
        participant_id: str
    ):

        if meeting_id not in self.rooms:

            return False


        participant = self.rooms[
            meeting_id
        ].get(
            participant_id
        )


        if not participant:

            return False


        return participant.get(
            "host",
            False
        )


    # ========================================================
    # ASSIGN FIRST HOST
    # ========================================================

    def assign_first_host(
        self,
        meeting_id: str,
        participant_id: str
    ):

        self.ensure_room(
            meeting_id
        )


        settings = self.meeting_settings[
            meeting_id
        ]


        if settings[
            "host_id"
        ] is None:

            settings[
                "host_id"
            ] = participant_id


            if participant_id in self.rooms[
                meeting_id
            ]:

                self.rooms[
                    meeting_id
                ][
                    participant_id
                ][
                    "host"
                ] = True


            return True


        return False


    # ========================================================
    # WAITING ROOM
    # ========================================================

    def set_waiting_room(
        self,
        meeting_id: str,
        enabled: bool
    ):

        self.ensure_room(
            meeting_id
        )


        self.meeting_settings[
            meeting_id
        ][
            "waiting_room"
        ] = enabled


        return enabled


    def waiting_room_enabled(
        self,
        meeting_id: str
    ):

        if meeting_id not in self.meeting_settings:

            return False


        return self.meeting_settings[
            meeting_id
        ].get(
            "waiting_room",
            False
        )


    # ========================================================
    # START TIME
    # ========================================================

    def get_started_at(
        self,
        meeting_id: str
    ):

        if meeting_id not in self.meeting_settings:

            return None


        return self.meeting_settings[
            meeting_id
        ].get(
            "started_at"
        )


    # ========================================================
    # END MEETING
    # ========================================================

    async def end_meeting(
        self,
        meeting_id: str
    ):

        # ----------------------------------------------------
        # Notify active participants
        # ----------------------------------------------------

        if meeting_id in self.rooms:

            for participant_id, data in list(
                self.rooms[
                    meeting_id
                ].items()
            ):

                try:

                    await data[
                        "websocket"
                    ].send_json({

                        "type":
                            "meeting-ended",

                        "message":
                            "The host ended the meeting."

                    })

                    await data[
                        "websocket"
                    ].close()

                except Exception:

                    pass


        # ----------------------------------------------------
        # Notify waiting participants
        # ----------------------------------------------------

        if meeting_id in self.waiting_rooms:

            for participant_id, data in list(
                self.waiting_rooms[
                    meeting_id
                ].items()
            ):

                try:

                    await data[
                        "websocket"
                    ].send_json({

                        "type":
                            "meeting-ended",

                        "message":
                            "The host ended the meeting."

                    })

                    await data[
                        "websocket"
                    ].close()

                except Exception:

                    pass


        # ----------------------------------------------------
        # CLEANUP
        # ----------------------------------------------------

        self.rooms.pop(
            meeting_id,
            None
        )

        self.waiting_rooms.pop(
            meeting_id,
            None
        )

        self.meeting_settings.pop(
            meeting_id,
            None
        )

        self.ended_meetings.add(
            meeting_id
        )


    # ========================================================
    # BROADCAST WAITING LIST TO HOST
    # ========================================================

    async def broadcast_waiting_list(
        self,
        meeting_id: str
    ):

        settings = self.meeting_settings.get(
            meeting_id
        )


        if not settings:

            return


        host_id = settings.get(
            "host_id"
        )


        if not host_id:

            return


        await self.send_to(

            meeting_id,

            host_id,

            {

                "type":
                    "waiting-list",

                "participants":
                    self.get_waiting_participants(
                        meeting_id
                    )

            }
        )


manager = ConnectionManager()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(

    title="Zoom Clone API",

    version="4.0"
)


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(
    bind=engine
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:3000",

        "http://127.0.0.1:3000"

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# ============================================================
# MEETING ID
# ============================================================

def generate_meeting_id():

    return str(

        random.randint(

            100000000,

            999999999

        )

    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "message":
            "Zoom Clone API is running"

    }


# ============================================================
# CREATE MEETING
# ============================================================

@app.post("/meetings")
def create_meeting(

    title: str = "Instant Meeting",

    description: str = "",

    meeting_type: str = "instant",

    db: Session = Depends(get_db)

):

    meeting_id = generate_meeting_id()


    while db.query(Meeting).filter(

        Meeting.meeting_id ==
        meeting_id

    ).first():

        meeting_id = generate_meeting_id()


    meeting = Meeting(

        meeting_id=
            meeting_id,

        title=
            title,

        description=
            description,

        meeting_type=
            meeting_type

    )


    db.add(
        meeting
    )

    db.commit()

    db.refresh(
        meeting
    )


    return {

        "id":
            meeting.id,

        "meeting_id":
            meeting.meeting_id,

        "title":
            meeting.title,

        "meeting_type":
            meeting.meeting_type,

        "meeting_link":
            (
                f"http://localhost:3000/"
                f"meeting/{meeting.meeting_id}"
            )

    }


# ============================================================
# GET ALL MEETINGS
# ============================================================

@app.get("/meetings")
def get_meetings(

    db: Session = Depends(get_db)

):

    return (

        db.query(Meeting)

        .order_by(
            Meeting.id.desc()
        )

        .all()

    )


# ============================================================
# GET SINGLE MEETING
# ============================================================

@app.get("/meetings/{meeting_id}")
def get_meeting(

    meeting_id: str,

    db: Session = Depends(get_db)

):

    meeting = (

        db.query(Meeting)

        .filter(

            Meeting.meeting_id ==
            meeting_id

        )

        .first()

    )


    if not meeting:

        raise HTTPException(

            status_code=404,

            detail="Meeting not found"

        )


    return meeting


# ============================================================
# GET PARTICIPANTS
# ============================================================

@app.get(
    "/meetings/{meeting_id}/participants"
)
def get_current_participants(
    meeting_id: str
):

    return {

        "meeting_id":
            meeting_id,

        "participants":
            manager.get_participants(
                meeting_id
            ),

        "count":
            manager.get_count(
                meeting_id
            )

    }


# ============================================================
# GET MEETING STATUS
# ============================================================

@app.get(
    "/meetings/{meeting_id}/status"
)
def get_meeting_status(
    meeting_id: str
):

    return {

        "meeting_id":
            meeting_id,

        "participants":
            manager.get_participants(
                meeting_id
            ),

        "count":
            manager.get_count(
                meeting_id
            ),

        "waiting_room":
            manager.waiting_room_enabled(
                meeting_id
            ),

        "started_at":
            manager.get_started_at(
                meeting_id
            ),

        "waiting_participants":
            manager.get_waiting_participants(
                meeting_id
            )

    }


# ============================================================
# WEBSOCKET
# ============================================================

@app.websocket(
    "/ws/meetings/{meeting_id}"
)
async def meeting_websocket(

    websocket: WebSocket,

    meeting_id: str

):

    participant_id = None

    participant_name = "Guest"

    print(

        f"[WEBSOCKET ATTEMPT] "
        f"meeting={meeting_id}"

    )


    try:

        # ====================================================
        # ACCEPT
        # ====================================================

        await websocket.accept()


        # ====================================================
        # FIRST MESSAGE = JOIN
        # ====================================================

        join_message = (

            await websocket.receive_json()

        )


        print(

            f"[JOIN MESSAGE] "
            f"{join_message}"

        )


        if join_message.get(
            "type"
        ) != "join":

            await websocket.close()

            return


        participant_id = (

            join_message.get(
                "participantId"
            )

        )


        participant_name = (

            join_message.get(
                "name",
                "Guest"
            )

        )


        if not participant_id:

            print(
                "[ERROR] No participantId"
            )

            await websocket.close()

            return


        # ====================================================
        # CHECK ENDED MEETING
        # ====================================================

        if meeting_id in manager.ended_meetings:

            await websocket.send_json({

                "type":
                    "meeting-ended",

                "message":
                    "This meeting has ended."

            })

            await websocket.close()

            return


        # ====================================================
        # INITIALIZE
        # ====================================================

        manager.ensure_room(
            meeting_id
        )


        # ====================================================
        # WAITING ROOM
        # ====================================================

        existing_count = (

            manager.get_count(
                meeting_id
            )

        )


        waiting_enabled = (

            manager.waiting_room_enabled(
                meeting_id
            )

        )


        should_wait = (

            waiting_enabled
            and existing_count > 0

        )


        if should_wait:

            manager.waiting_rooms[
                meeting_id
            ][
                participant_id
            ] = {

                "websocket":
                    websocket,

                "name":
                    participant_name

            }


            print(

                f"[WAITING ROOM] "
                f"name={participant_name} "
                f"meeting={meeting_id}"

            )


            await websocket.send_json({

                "type":
                    "waiting",

                "message":
                    "Waiting for the host to let you in."

            })


            await manager.broadcast_waiting_list(
                meeting_id
            )


            # ------------------------------------------------
            # WAIT FOR HOST
            # ------------------------------------------------

            while True:

                message = (

                    await websocket.receive_json()

                )


                print(

                    f"[WAITING MESSAGE] "
                    f"{message}"

                )


                message_type = message.get(
                    "type"
                )


                # ------------------------------------------------
                # APPROVED
                # ------------------------------------------------

                if message_type == "waiting-approved":

                    manager.waiting_rooms[
                        meeting_id
                    ].pop(
                        participant_id,
                        None
                    )

                    await manager.broadcast_waiting_list(
                        meeting_id
                    )

                    break


                # ------------------------------------------------
                # REJECTED
                # ------------------------------------------------

                if message_type == "waiting-rejected":

                    manager.waiting_rooms[
                        meeting_id
                    ].pop(
                        participant_id,
                        None
                    )

                    await websocket.send_json({

                        "type":
                            "waiting-rejected",

                        "message":
                            "The host did not allow you to join."

                    })

                    await websocket.close()

                    return


        # ====================================================
        # EXISTING PARTICIPANTS
        # ====================================================

        existing_participants = (

            manager.get_participants(
                meeting_id
            )

        )


        # ====================================================
        # REGISTER
        # ====================================================

        # If same ID already exists, replace it safely.

        manager.rooms[
            meeting_id
        ][
            participant_id
        ] = {

            "websocket":
                websocket,

            "name":
                participant_name,

            "mic":
                True,

            "camera":
                True,

            "host":
                False

        }


        # ====================================================
        # HOST
        # ====================================================

        is_host = (

            manager.assign_first_host(

                meeting_id,

                participant_id

            )

        )


        print(

            f"[JOIN] "
            f"meeting={meeting_id} "
            f"name={participant_name} "
            f"id={participant_id} "
            f"host={is_host} "
            f"participants="
            f"{manager.get_count(meeting_id)}"

        )


        # ====================================================
        # WELCOME
        # ====================================================

        await websocket.send_json({

            "type":
                "welcome",

            "participant_id":
                participant_id,

            "count":
                manager.get_count(
                    meeting_id
                ),

            "host":
                manager.is_host(
                    meeting_id,
                    participant_id
                ),

            "started_at":
                manager.get_started_at(
                    meeting_id
                )

        })


        # ====================================================
        # EXISTING PARTICIPANTS
        # ====================================================

        await websocket.send_json({

            "type":
                "existing-participants",

            "participants":
                existing_participants

        })


        # ====================================================
        # FULL PARTICIPANT LIST TO NEW USER
        # ====================================================

        await websocket.send_json({

            "type":
                "participant-list",

            "participants":
                manager.get_participants(
                    meeting_id
                ),

            "count":
                manager.get_count(
                    meeting_id
                )

        })


        # ====================================================
        # INFORM OTHERS
        # ====================================================

        await manager.broadcast(

            meeting_id,

            {

                "type":
                    "participant-joined",

                "participant_id":
                    participant_id,

                "name":
                    participant_name,

                "host":
                    manager.is_host(
                        meeting_id,
                        participant_id
                    ),

                "count":
                    manager.get_count(
                        meeting_id
                    )

            },

            exclude=participant_id

        )


        # ====================================================
        # BROADCAST PARTICIPANT LIST
        # ====================================================

        await manager.broadcast_participant_list(
            meeting_id
        )


        # ====================================================
        # MAIN MESSAGE LOOP
        # ====================================================

        while True:

            message = (

                await websocket.receive_json()

            )


            print(

                f"[MESSAGE] "
                f"meeting={meeting_id} "
                f"{message}"

            )


            message_type = message.get(
                "type"
            )


            # =================================================
            # LEAVE
            # =================================================

            if message_type == "leave":

                print(

                    f"[LEAVE MESSAGE] "
                    f"{participant_name}"

                )

                break


            # =================================================
            # WEBRTC
            # =================================================

            if message_type in [

                "offer",

                "answer",

                "ice-candidate"

            ]:

                target = message.get(
                    "target"
                )


                if target:

                    outgoing_message = dict(
                        message
                    )


                    outgoing_message[
                        "sender_id"
                    ] = participant_id


                    outgoing_message[
                        "sender_name"
                    ] = participant_name


                    await manager.send_to(

                        meeting_id,

                        target,

                        outgoing_message

                    )


                continue


            # =================================================
            # MICROPHONE STATUS
            # =================================================

            if message_type == "mic-status":

                enabled = bool(

                    message.get(
                        "enabled",
                        True
                    )

                )


                await manager.update_mic(

                    meeting_id,

                    participant_id,

                    enabled

                )

                continue


            # =================================================
            # CAMERA STATUS
            # =================================================

            if message_type == "camera-status":

                enabled = bool(

                    message.get(
                        "enabled",
                        True
                    )

                )


                await manager.update_camera(

                    meeting_id,

                    participant_id,

                    enabled

                )

                continue


            # =================================================
            # REACTION / EMOJI
            # =================================================

            if message_type == "reaction":

                emoji = message.get(

                    "emoji",

                    "👍"

                )


                await manager.broadcast(

                    meeting_id,

                    {

                        "type":
                            "reaction",

                        "participant_id":
                            participant_id,

                        "name":
                            participant_name,

                        "emoji":
                            emoji

                    }

                )

                continue


            # =================================================
            # HAND RAISE
            # =================================================

            if message_type == "raise-hand":

                raised = bool(

                    message.get(
                        "raised",
                        True
                    )

                )


                await manager.broadcast(

                    meeting_id,

                    {

                        "type":
                            "hand-raised",

                        "participant_id":
                            participant_id,

                        "name":
                            participant_name,

                        "raised":
                            raised

                    }

                )

                continue


            # =================================================
            # CHAT
            # =================================================

            if message_type == "chat":

                chat_text = message.get(

                    "message",

                    ""

                )


                if chat_text.strip():

                    await manager.broadcast(

                        meeting_id,

                        {

                            "type":
                                "chat",

                            "participant_id":
                                participant_id,

                            "name":
                                participant_name,

                            "message":
                                chat_text,

                            "timestamp":
                                int(
                                    time.time()
                                )

                        }

                    )

                continue


            # =================================================
            # HOST CONTROLS
            # =================================================

            if message_type in [

                "host-mute",

                "host-camera-off",

                "remove-participant",

                "waiting-room",

                "approve-participant",

                "reject-participant",

                "end-meeting"

            ]:


                # ------------------------------------------------
                # HOST ONLY
                # ------------------------------------------------

                if not manager.is_host(

                    meeting_id,

                    participant_id

                ):

                    await websocket.send_json({

                        "type":
                            "host-error",

                        "message":
                            "Only the host can perform this action."

                    })

                    continue


                # =================================================
                # HOST MUTE
                # =================================================

                if message_type == "host-mute":

                    target = message.get(
                        "target"
                    )


                    if target:

                        # Update server state

                        if (

                            meeting_id in manager.rooms

                            and target in manager.rooms[
                                meeting_id
                            ]

                        ):

                            manager.rooms[
                                meeting_id
                            ][
                                target
                            ][
                                "mic"
                            ] = False


                        await manager.send_to(

                            meeting_id,

                            target,

                            {

                                "type":
                                    "force-mute",

                                "by":
                                    participant_name

                            }

                        )


                        await manager.broadcast_participant_list(
                            meeting_id
                        )

                    continue


                # =================================================
                # HOST CAMERA OFF
                # =================================================

                if message_type == "host-camera-off":

                    target = message.get(
                        "target"
                    )


                    if target:

                        if (

                            meeting_id in manager.rooms

                            and target in manager.rooms[
                                meeting_id
                            ]

                        ):

                            manager.rooms[
                                meeting_id
                            ][
                                target
                            ][
                                "camera"
                            ] = False


                        await manager.send_to(

                            meeting_id,

                            target,

                            {

                                "type":
                                    "force-camera-off",

                                "by":
                                    participant_name

                            }

                        )


                        await manager.broadcast_participant_list(
                            meeting_id
                        )

                    continue


                # =================================================
                # REMOVE PARTICIPANT
                # =================================================

                if message_type == "remove-participant":

                    target = message.get(
                        "target"
                    )


                    if (

                        target
                        and target != participant_id

                    ):

                        await manager.send_to(

                            meeting_id,

                            target,

                            {

                                "type":
                                    "removed-by-host",

                                "message":
                                    "You were removed by the host."

                            }

                        )


                    continue


                # =================================================
                # WAITING ROOM ON / OFF
                # =================================================

                if message_type == "waiting-room":

                    enabled = bool(

                        message.get(
                            "enabled",
                            False
                        )

                    )


                    manager.set_waiting_room(

                        meeting_id,

                        enabled

                    )


                    await manager.broadcast(

                        meeting_id,

                        {

                            "type":
                                "waiting-room-status",

                            "enabled":
                                enabled

                        }

                    )

                    continue


                # =================================================
                # APPROVE PARTICIPANT
                # =================================================

                if message_type == "approve-participant":

                    target = message.get(
                        "target"
                    )


                    waiting_user = (

                        manager.waiting_rooms
                        .get(
                            meeting_id,
                            {}
                        )
                        .get(
                            target
                        )

                    )


                    if waiting_user:

                        try:

                            await waiting_user[
                                "websocket"
                            ].send_json({

                                "type":
                                    "waiting-approved"

                            })

                        except Exception as error:

                            print(

                                f"[APPROVE ERROR] "
                                f"{error}"

                            )

                    continue


                # =================================================
                # REJECT PARTICIPANT
                # =================================================

                if message_type == "reject-participant":

                    target = message.get(
                        "target"
                    )


                    waiting_user = (

                        manager.waiting_rooms
                        .get(
                            meeting_id,
                            {}
                        )
                        .pop(
                            target,
                            None
                        )

                    )


                    if waiting_user:

                        try:

                            await waiting_user[
                                "websocket"
                            ].send_json({

                                "type":
                                    "waiting-rejected",

                                "message":
                                    "The host rejected your request."

                            })


                            await waiting_user[
                                "websocket"
                            ].close()

                        except Exception:

                            pass


                        await manager.broadcast_waiting_list(
                            meeting_id
                        )

                    continue


                # =================================================
                # END MEETING
                # =================================================

                if message_type == "end-meeting":

                    print(

                        f"[END MEETING] "
                        f"meeting={meeting_id} "
                        f"host={participant_name}"

                    )


                    await manager.end_meeting(
                        meeting_id
                    )


                    break


                continue


            # =================================================
            # NORMAL BROADCAST
            # =================================================

            await manager.broadcast(

                meeting_id,

                message,

                exclude=participant_id

            )


    # ========================================================
    # DISCONNECTED
    # ========================================================

    except WebSocketDisconnect:

        print(

            f"[WEBSOCKET DISCONNECTED] "
            f"meeting={meeting_id} "
            f"participant={participant_id}"

        )


    except Exception as error:

        print(

            f"[WEBSOCKET ERROR] "
            f"{error}"

        )


    finally:

        # ----------------------------------------------------
        # REMOVE ONLY CURRENT SOCKET
        # ----------------------------------------------------

        if participant_id:

            removed = manager.disconnect(

                meeting_id,

                participant_id,

                websocket

            )


            if removed:

                count = manager.get_count(
                    meeting_id
                )


                print(

                    f"[FINAL COUNT] "
                    f"meeting={meeting_id} "
                    f"participants={count}"

                )


                if meeting_id in manager.rooms:

                    # ----------------------------------------
                    # PARTICIPANT LEFT
                    # ----------------------------------------

                    await manager.broadcast(

                        meeting_id,

                        {

                            "type":
                                "participant-left",

                            "participant_id":
                                participant_id,

                            "count":
                                count

                        }

                    )


                    # ----------------------------------------
                    # UPDATED PARTICIPANT LIST
                    # ----------------------------------------

                    await manager.broadcast_participant_list(

                        meeting_id

                    )


                    # ----------------------------------------
                    # WAITING LIST
                    # ----------------------------------------

                    await manager.broadcast_waiting_list(

                        meeting_id

                    )