"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useParams,
  useSearchParams,
  useRouter,
} from "next/navigation";

type Participant = {
  participant_id: string;
  name: string;
  mic?: boolean;
  camera?: boolean;
  host?: boolean;
  raised?: boolean;
};

type PeerMap = {
  [id: string]: RTCPeerConnection;
};

type ChatMessage = {
  sender_id: string;
  name: string;
  text: string;
  time: string;
};

type ReactionMap = Record<
  string,
  {
    emoji: string;
    at: number;
  }
>;

type RoomIconName =
  | "video"
  | "mic"
  | "micOff"
  | "camera"
  | "cameraOff"
  | "share"
  | "reaction"
  | "people"
  | "chat"
  | "hand"
  | "leave"
  | "clock"
  | "link"
  | "check"
  | "stop";

const roomIconPaths: Record<RoomIconName, ReactNode> = {
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></>,
  micOff: <><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V5a3 3 0 0 0-5.83-.95M5 10v2a7 7 0 0 0 11.9 5M19 10v2a7 7 0 0 1-.45 2.48M12 19v3m-4 0h8M3 3l18 18" /></>,
  camera: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>,
  cameraOff: <><path d="m3 3 18 18M10.5 6H14a2 2 0 0 1 2 2v2l5-3v10l-4-2.4M6 6.6A2 2 0 0 0 3 8v8a2 2 0 0 0 2 2h9" /></>,
  share: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8M12 13V7m-3 3 3-3 3 3" /></>,
  reaction: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
  hand: <><path d="M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v8l1-2a2 2 0 0 1 3 2l-3 7a5 5 0 0 1-4.7 3H13a5 5 0 0 1-4-2l-4-5a2 2 0 0 1 3-2l2 2" transform="translate(-1 -1) scale(.92)" /></>,
  leave: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  stop: <><rect x="4" y="4" width="16" height="16" rx="3" /></>,
};

function RoomIcon({
  name,
  className = "h-5 w-5",
}: {
  name: RoomIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {roomIconPaths[name]}
    </svg>
  );
}

export default function MeetingRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const meetingId = params.meetingId as string;

  const name =
    searchParams.get("name") || "Guest";

  // =========================================================
  // STATE
  // =========================================================

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [participantCount, setParticipantCount] =
    useState(1);

  const [isConnected, setIsConnected] =
    useState(false);

  const [isHost, setIsHost] =
    useState(false);

  const [micOn, setMicOn] =
    useState(true);

  const [cameraOn, setCameraOn] =
    useState(true);

  const [screenSharing, setScreenSharing] =
    useState(false);

  const [showPeople, setShowPeople] =
    useState(false);

  const [showChat, setShowChat] =
    useState(false);

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [chatText, setChatText] =
    useState("");

  const [handRaised, setHandRaised] =
    useState(false);

  const [waitingForApproval, setWaitingForApproval] =
    useState(false);

  const [waitingMessage, setWaitingMessage] =
    useState("");

  const [waitingParticipants, setWaitingParticipants] =
    useState<Participant[]>([]);

  const [waitingRoomEnabled, setWaitingRoomEnabled] =
    useState(false);

  const [meetingEnded, setMeetingEnded] =
    useState(false);

  const [meetingEndedMessage, setMeetingEndedMessage] =
    useState("");

  const [meetingStartedAt, setMeetingStartedAt] =
    useState<number | null>(null);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [reactionMap, setReactionMap] =
    useState<ReactionMap>({});

  const [reactionMenuOpen, setReactionMenuOpen] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  // =========================================================
  // REFS
  // =========================================================

  const socketRef =
    useRef<WebSocket | null>(null);

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const screenStreamRef =
    useRef<MediaStream | null>(null);

  const peerConnectionsRef =
    useRef<PeerMap>({});

  const participantIdRef =
    useRef<string>("");

  const formatElapsedTime =
    (totalSeconds: number) => {
      const safeSeconds = Math.max(
        0,
        totalSeconds
      );
      const hours = Math.floor(
        safeSeconds / 3600
      );
      const minutes = Math.floor(
        (safeSeconds % 3600) / 60
      );
      const seconds = safeSeconds % 60;

      return [
        hours,
        minutes,
        seconds,
      ]
        .map((value) =>
          String(value).padStart(2, "0")
        )
        .join(":");
    };

  // =========================================================
  // UNIQUE PARTICIPANT ID
  // =========================================================

  if (!participantIdRef.current) {
    participantIdRef.current =
      crypto.randomUUID();
  }

  useEffect(() => {
    if (meetingStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const nextSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() -
            meetingStartedAt * 1000) /
            1000
        )
      );

      setElapsedSeconds(nextSeconds);
    };

    updateElapsed();

    const timer = window.setInterval(
      updateElapsed,
      1000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [meetingStartedAt]);

  // =========================================================
  // LOCAL CAMERA + MICROPHONE
  // =========================================================

  const startLocalMedia = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          stream;
      }

      return stream;
    } catch (err) {
      console.error(
        "Media error:",
        err
      );

      setError(
        "Camera or microphone permission was denied."
      );

      return null;
    }
  };

  // =========================================================
  // CREATE PEER CONNECTION
  // =========================================================

  const createPeerConnection = (
    remoteId: string,
    remoteName: string
  ) => {
    if (
      peerConnectionsRef.current[
        remoteId
      ]
    ) {
      return peerConnectionsRef.current[
        remoteId
      ];
    }

    const peer =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    // -------------------------------------------------------
    // ADD LOCAL TRACKS
    // -------------------------------------------------------

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            localStreamRef.current!
          );
        });
    }

    // -------------------------------------------------------
    // ICE
    // -------------------------------------------------------

    peer.onicecandidate =
      (event) => {
        if (!event.candidate) {
          return;
        }

        const socket =
          socketRef.current;

        if (
          !socket ||
          socket.readyState !==
            WebSocket.OPEN
        ) {
          return;
        }

        socket.send(
          JSON.stringify({
            type:
              "ice-candidate",

            target:
              remoteId,

            candidate:
              event.candidate,
          })
        );
      };

    // -------------------------------------------------------
    // REMOTE TRACK
    // -------------------------------------------------------

    peer.ontrack =
      (event) => {
        console.log(
          "Remote track received:",
          remoteName
        );

        const video =
          document.getElementById(
            `remote-${remoteId}`
          ) as HTMLVideoElement | null;

        if (video) {
          video.srcObject =
            event.streams[0];
        }
      };

    // -------------------------------------------------------
    // CONNECTION STATE
    // -------------------------------------------------------

    peer.onconnectionstatechange =
      () => {
        console.log(
          `Peer ${remoteId}:`,
          peer.connectionState
        );

        if (
          peer.connectionState ===
            "failed" ||
          peer.connectionState ===
            "closed"
        ) {
          peer.close();

          delete peerConnectionsRef.current[
            remoteId
          ];
        }
      };

    peerConnectionsRef.current[
      remoteId
    ] = peer;

    return peer;
  };

  // =========================================================
  // CREATE OFFER
  // =========================================================

  const createOffer = async (
    remoteId: string,
    remoteName: string
  ) => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    const peer =
      createPeerConnection(
        remoteId,
        remoteName
      );

    try {
      const offer =
        await peer.createOffer();

      await peer.setLocalDescription(
        offer
      );

      socket.send(
        JSON.stringify({
          type: "offer",
          target: remoteId,
          offer,
        })
      );
    } catch (err) {
      console.error(
        "Offer error:",
        err
      );
    }
  };

  // =========================================================
  // HANDLE OFFER
  // =========================================================

  const handleOffer =
    async (message: any) => {
      const senderId =
        message.sender_id;

      if (!senderId) {
        return;
      }

      const peer =
        createPeerConnection(
          senderId,
          message.sender_name ||
            "Guest"
        );

      try {
        await peer.setRemoteDescription(
          new RTCSessionDescription(
            message.offer
          )
        );

        const answer =
          await peer.createAnswer();

        await peer.setLocalDescription(
          answer
        );

        const socket =
          socketRef.current;

        if (
          socket &&
          socket.readyState ===
            WebSocket.OPEN
        ) {
          socket.send(
            JSON.stringify({
              type: "answer",
              target: senderId,
              answer,
            })
          );
        }
      } catch (err) {
        console.error(
          "Offer handling error:",
          err
        );
      }
    };

  // =========================================================
  // HANDLE ANSWER
  // =========================================================

  const handleAnswer =
    async (message: any) => {
      const senderId =
        message.sender_id;

      if (!senderId) {
        return;
      }

      const peer =
        peerConnectionsRef.current[
          senderId
        ];

      if (!peer) {
        return;
      }

      try {
        await peer.setRemoteDescription(
          new RTCSessionDescription(
            message.answer
          )
        );
      } catch (err) {
        console.error(
          "Answer error:",
          err
        );
      }
    };

  // =========================================================
  // HANDLE ICE
  // =========================================================

  const handleIceCandidate =
    async (message: any) => {
      const senderId =
        message.sender_id;

      if (!senderId) {
        return;
      }

      const peer =
        peerConnectionsRef.current[
          senderId
        ];

      if (!peer) {
        return;
      }

      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(
            message.candidate
          )
        );
      } catch (err) {
        console.error(
          "ICE error:",
          err
        );
      }
    };

  // =========================================================
  // START MEETING
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    let socket:
      | WebSocket
      | null = null;

    let stream:
      | MediaStream
      | null = null;

    const startMeeting =
      async () => {
        console.log(
          "Starting meeting:",
          meetingId
        );

        // ---------------------------------------------------
        // CAMERA
        // ---------------------------------------------------

        stream =
          await startLocalMedia();

        if (
          cancelled ||
          !stream
        ) {
          return;
        }

        // ---------------------------------------------------
        // WEBSOCKET
        // ---------------------------------------------------

        socket =
          new WebSocket(
            `wss://zoom-clone-backend-vie2.onrender.com/ws/meetings/${meetingId}`
          );

        socketRef.current =
          socket;

        // ---------------------------------------------------
        // OPEN
        // ---------------------------------------------------

        socket.onopen =
          () => {
            if (cancelled) {
              socket?.close();
              return;
            }

            console.log(
              "WEBSOCKET CONNECTED"
            );

            setIsConnected(true);

            socket?.send(
              JSON.stringify({
                type: "join",

                participantId:
                  participantIdRef.current,

                name,
              })
            );
          };

        // ---------------------------------------------------
        // MESSAGE
        // ---------------------------------------------------

        socket.onmessage =
          async (event) => {
            try {
              const message =
                JSON.parse(
                  event.data
                );

              console.log(
                "WS MESSAGE:",
                message
              );

              if (
                message.type ===
                "welcome"
              ) {
                setParticipantCount(
                  Number(
                    message.count || 1
                  )
                );
                setIsHost(
                  Boolean(message.host)
                );

                if (
                  message.started_at
                ) {
                  setMeetingStartedAt(
                    Number(
                      message.started_at
                    )
                  );
                }

                return;
              }

              if (
                message.type ===
                "participant-list"
              ) {
                const list =
                  message.participants ||
                  [];
                const remote =
                  list
                    .filter(
                      (p: Participant) =>
                        p.participant_id !==
                        participantIdRef.current
                    )
                    .map((p: Participant) => ({
                      ...p,
                      raised: !!p.raised,
                    }));

                setParticipants(remote);
                setParticipantCount(
                  Number(
                    message.count ||
                      remote.length + 1
                  )
                );
                return;
              }

              if (
                message.type ===
                "existing-participants"
              ) {
                const existing =
                  message.participants ||
                  [];
                const remote =
                  existing
                    .filter(
                      (p: Participant) =>
                        p.participant_id !==
                        participantIdRef.current
                    )
                    .map((p: Participant) => ({
                      ...p,
                      raised: !!p.raised,
                    }));

                setParticipants(remote);
                setParticipantCount(
                  remote.length + 1
                );

                for (const participant of remote) {
                  await createOffer(
                    participant.participant_id,
                    participant.name
                  );
                }

                return;
              }

              if (
                message.type ===
                "participant-joined"
              ) {
                const remoteId =
                  message.participant_id ||
                  message.participantId;

                if (
                  !remoteId ||
                  remoteId ===
                    participantIdRef.current
                ) {
                  return;
                }

                const remoteParticipant =
                  {
                    participant_id:
                      remoteId,
                    name:
                      message.name ||
                      "Guest",
                    raised: false,
                  };

                setParticipants(
                  (previous) => {
                    const exists =
                      previous.some(
                        (p) =>
                          p.participant_id ===
                          remoteId
                      );

                    if (exists) {
                      return previous;
                    }

                    return [
                      ...previous,
                      remoteParticipant,
                    ];
                  }
                );

                setParticipantCount(
                  (count) =>
                    Math.max(
                      count,
                      2
                    )
                );

                return;
              }

              if (
                message.type ===
                "participant-left"
              ) {
                const leftId =
                  message.participant_id ||
                  message.participantId ||
                  message.sender_id;

                setParticipants(
                  (previous) =>
                    previous.filter(
                      (p) =>
                        p.participant_id !==
                        leftId
                    )
                );

                setReactionMap((previous) => {
                  const next = { ...previous };
                  delete next[leftId];
                  return next;
                });

                const peer =
                  peerConnectionsRef.current[
                    leftId
                  ];

                if (peer) {
                  peer.close();

                  delete peerConnectionsRef.current[
                    leftId
                  ];
                }

                setParticipantCount(
                  (count) =>
                    Math.max(
                      1,
                      count - 1
                    )
                );

                return;
              }

              if (
                message.type ===
                "participant-status"
              ) {
                const participantId =
                  message.participant_id;

                if (!participantId) {
                  return;
                }

                setParticipants((previous) =>
                  previous.map((participant) =>
                    participant.participant_id ===
                    participantId
                      ? {
                          ...participant,
                          ...(typeof message.mic === "boolean"
                            ? { mic: message.mic }
                            : {}),
                          ...(typeof message.camera === "boolean"
                            ? { camera: message.camera }
                            : {}),
                        }
                      : participant
                  )
                );
                return;
              }

              if (
                message.type ===
                "offer"
              ) {
                await handleOffer(message);
                return;
              }

              if (
                message.type ===
                "answer"
              ) {
                await handleAnswer(message);
                return;
              }

              if (
                message.type ===
                "ice-candidate"
              ) {
                await handleIceCandidate(
                  message
                );
                return;
              }

              if (
                message.type ===
                "waiting"
              ) {
                setWaitingForApproval(true);
                setWaitingMessage(
                  message.message ||
                    "Waiting for the host to let you in."
                );
                return;
              }

              if (
                message.type ===
                "waiting-list"
              ) {
                setWaitingParticipants(
                  message.participants ||
                    []
                );
                return;
              }

              if (
                message.type ===
                "waiting-approved"
              ) {
                setWaitingForApproval(false);
                setWaitingMessage("");
                return;
              }

              if (
                message.type ===
                "waiting-rejected"
              ) {
                setWaitingForApproval(false);
                setWaitingMessage(
                  message.message ||
                    "The host did not allow you to join."
                );

                const socket =
                  socketRef.current;
                if (
                  socket &&
                  socket.readyState ===
                    WebSocket.OPEN
                ) {
                  socket.close();
                }

                return;
              }

              if (
                message.type ===
                "waiting-room-status"
              ) {
                setWaitingRoomEnabled(
                  Boolean(
                    message.enabled
                  )
                );
                return;
              }

              if (
                message.type ===
                "chat"
              ) {
                const incomingMessage =
                  {
                    sender_id:
                      message.participant_id ||
                      message.sender_id ||
                      "",
                    name:
                      message.name ||
                      "Guest",
                    text:
                      message.message ||
                      "",
                    time:
                      message.timestamp
                        ? new Date(
                            message.timestamp *
                              1000
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : new Date().toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          ),
                  };

                setChatMessages(
                  (previous) => {
                    const isDuplicate =
                      previous.some(
                        (item) =>
                          item.sender_id ===
                            incomingMessage.sender_id &&
                          item.name ===
                            incomingMessage.name &&
                          item.text ===
                            incomingMessage.text &&
                          item.time ===
                            incomingMessage.time
                      );

                    if (isDuplicate) {
                      return previous;
                    }

                    return [
                      ...previous,
                      incomingMessage,
                    ];
                  }
                );

                setShowChat(true);
                return;
              }

              if (
                message.type ===
                "hand-raised"
              ) {
                const targetId =
                  message.participant_id ||
                  message.sender_id;
                const raised = Boolean(
                  message.raised
                );

                if (targetId) {
                  setParticipants(
                    (previous) =>
                      previous.map((participant) =>
                        participant.participant_id ===
                        targetId
                          ? {
                              ...participant,
                              raised,
                            }
                          : participant
                      )
                  );

                  if (
                    targetId ===
                    participantIdRef.current
                  ) {
                    setHandRaised(raised);
                  }
                }

                return;
              }

              if (
                message.type ===
                "reaction"
              ) {
                const targetId =
                  message.participant_id ||
                  message.sender_id;

                if (!targetId) {
                  return;
                }

                const reaction = {
                  emoji: message.emoji || "👍",
                  at: Date.now(),
                };

                setReactionMap(
                  (previous) => ({
                    ...previous,
                    [targetId]: reaction,
                  })
                );

                window.setTimeout(() => {
                  setReactionMap(
                    (previous) => {
                      if (
                        previous[targetId]
                      ) {
                        const next = { ...previous };
                        delete next[targetId];
                        return next;
                      }
                      return previous;
                    }
                  );
                }, 2200);

                return;
              }

              if (
                message.type ===
                "force-mute"
              ) {
                const targetId =
                  message.participant_id ||
                  message.sender_id;

                if (
                  targetId ===
                  participantIdRef.current
                ) {
                  setMicOn(false);
                }

                setParticipants(
                  (previous) =>
                    previous.map((participant) =>
                      participant.participant_id ===
                      targetId
                        ? {
                            ...participant,
                            mic: false,
                          }
                        : participant
                    )
                );
                return;
              }

              if (
                message.type ===
                "force-camera-off"
              ) {
                const targetId =
                  message.participant_id ||
                  message.sender_id;

                if (
                  targetId ===
                  participantIdRef.current
                ) {
                  setCameraOn(false);
                }

                setParticipants(
                  (previous) =>
                    previous.map((participant) =>
                      participant.participant_id ===
                      targetId
                        ? {
                            ...participant,
                            camera: false,
                          }
                        : participant
                    )
                );
                return;
              }

              if (
                message.type ===
                "removed-by-host"
              ) {
                setMeetingEnded(true);
                setMeetingEndedMessage(
                  message.message ||
                    "You were removed by the host."
                );

                const socket =
                  socketRef.current;
                if (
                  socket &&
                  socket.readyState ===
                    WebSocket.OPEN
                ) {
                  socket.close();
                }

                return;
              }

              if (
                message.type ===
                "meeting-ended"
              ) {
                setMeetingEnded(true);
                setMeetingEndedMessage(
                  message.message ||
                    "The host ended the meeting."
                );

                const socket =
                  socketRef.current;
                if (
                  socket &&
                  socket.readyState ===
                    WebSocket.OPEN
                ) {
                  socket.close();
                }

                return;
              }
            } catch (err) {
              console.error(
                "WS message error:",
                err
              );
            }
          };

        // ---------------------------------------------------
        // ERROR
        // ---------------------------------------------------

        socket.onerror =
          (event) => {
            console.error(
              "WEBSOCKET ERROR:",
              event
            );

            setIsConnected(
              false
            );
          };

        // ---------------------------------------------------
        // CLOSE
        // ---------------------------------------------------

        socket.onclose =
          () => {
            console.log(
              "WEBSOCKET CLOSED"
            );

            setIsConnected(
              false
            );
          };
      };

    startMeeting();

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      cancelled = true;

      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (peer) =>
          peer.close()
      );

      peerConnectionsRef.current =
        {};

      if (stream) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      if (socket) {
        try {
          if (
            socket.readyState ===
            WebSocket.OPEN
          ) {
            socket.send(
              JSON.stringify({
                type: "leave",
              })
            );
          }

          socket.close();
        } catch (err) {
          console.error(
            err
          );
        }
      }
    };
  }, [meetingId]);

  // =========================================================
  // MICROPHONE
  // =========================================================

  const toggleMic = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks =
      stream.getAudioTracks();

    const enabled = !micOn;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    setMicOn(enabled);

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "mic-status",
          enabled,
        })
      );
    }
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const toggleCamera = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks =
      stream.getVideoTracks();

    const enabled = !cameraOn;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    setCameraOn(enabled);

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "camera-status",
          enabled,
        })
      );
    }
  };

  // =========================================================
  // SCREEN SHARE
  // =========================================================

  const toggleScreenShare =
    async () => {
      if (
        screenSharing
      ) {
        stopScreenShare();
        return;
      }

      try {
        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
            }
          );

        screenStreamRef.current =
          screenStream;

        const screenTrack =
          screenStream.getVideoTracks()[0];

        // Replace camera video
        // track in every peer.

        Object.values(
          peerConnectionsRef.current
        ).forEach(
          (peer) => {
            const sender =
              peer
                .getSenders()
                .find(
                  (s) =>
                    s.track?.kind ===
                    "video"
                );

            if (sender) {
              sender.replaceTrack(
                screenTrack
              );
            }
          }
        );

        // Show screen locally.

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            screenStream;
        }

        setScreenSharing(
          true
        );

        screenTrack.onended =
          () => {
            stopScreenShare();
          };
      } catch (err) {
        console.error(
          "Screen share error:",
          err
        );
      }
    };

  // =========================================================
  // STOP SCREEN SHARE
  // =========================================================

  const stopScreenShare =
    async () => {
      const screenStream =
        screenStreamRef.current;

      if (screenStream) {
        screenStream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      screenStreamRef.current =
        null;

      const cameraTrack =
        localStreamRef.current?.getVideoTracks()[0];

      if (cameraTrack) {
        Object.values(
          peerConnectionsRef.current
        ).forEach(
          (peer) => {
            const sender =
              peer
                .getSenders()
                .find(
                  (s) =>
                    s.track?.kind ===
                    "video"
                );

            if (sender) {
              sender.replaceTrack(
                cameraTrack
              );
            }
          }
        );
      }

      if (
        localVideoRef.current &&
        localStreamRef.current
      ) {
        localVideoRef.current.srcObject =
          localStreamRef.current;
      }

      setScreenSharing(
        false
      );
    };

  // =========================================================
  // CHAT
  // =========================================================

  const sendChatMessage =
    () => {
      const text =
        chatText.trim();

      const socket =
        socketRef.current;

      if (
        !text ||
        !socket ||
        socket.readyState !==
          WebSocket.OPEN
      ) {
        return;
      }

      const message = {
        type: "chat",
        participant_id:
          participantIdRef.current,
        name,
        message: text,
        timestamp:
          Math.floor(
            Date.now() / 1000
          ),
      };

      setChatMessages(
        (previous) => {
          const formatted = {
            sender_id:
              participantIdRef.current,
            name,
            text,
            time:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              ),
          };

          const isDuplicate =
            previous.some(
              (item) =>
                item.sender_id ===
                  formatted.sender_id &&
                item.name ===
                  formatted.name &&
                item.text ===
                  formatted.text &&
                item.time ===
                  formatted.time
            );

          if (isDuplicate) {
            return previous;
          }

          return [...previous, formatted];
        }
      );

      socket.send(
        JSON.stringify(message)
      );

      setChatText("");
    };

  // =========================================================
  // COPY MEETING LINK
  // =========================================================

  const copyMeetingLink =
    async () => {
      try {
        const link =
          `${window.location.origin}/meeting/${meetingId}`;

        await navigator.clipboard.writeText(
          link
        );

        setCopied(true);

        setTimeout(
          () => {
            setCopied(false);
          },
          2000
        );
      } catch (err) {
        console.error(
          "Copy error:",
          err
        );
      }
    };

  // =========================================================
  // RAISE HAND
  // =========================================================

  const toggleHand = () => {
    const next = !handRaised;

    setHandRaised(next);

    const socket =
      socketRef.current;

    if (
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {
      socket.send(
        JSON.stringify({
          type: "raise-hand",
          raised: next,
        })
      );
    }
  };

  const sendReaction = (
    emoji: string
  ) => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "reaction",
        emoji,
      })
    );

    setReactionMap((previous) => ({
      ...previous,
      [participantIdRef.current]: {
        emoji,
        at: Date.now(),
      },
    }));

    setReactionMenuOpen(false);

    window.setTimeout(() => {
      setReactionMap((previous) => {
        const next = { ...previous };
        delete next[participantIdRef.current];
        return next;
      });
    }, 2200);
  };

  const sendHostAction = (
    type:
      | "host-mute"
      | "host-camera-off"
      | "remove-participant"
      | "end-meeting",
    target?: string
  ) => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    const message: Record<string, unknown> = {
      type,
    };

    if (target) {
      message.target = target;
    }

    socket.send(
      JSON.stringify(message)
    );
  };

  // =========================================================
  // LEAVE
  // =========================================================

  const leaveMeeting =
    () => {
      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (peer) =>
          peer.close()
      );

      peerConnectionsRef.current =
        {};

      if (
        socketRef.current
      ) {
        try {
          if (
            socketRef.current
              .readyState ===
            WebSocket.OPEN
          ) {
            socketRef.current.send(
              JSON.stringify({
                type: "leave",
              })
            );
          }

          socketRef.current.close();
        } catch (err) {
          console.error(
            err
          );
        }
      }

      router.push("/");
    };

  // =========================================================
  // UI
  // =========================================================

  if (meetingEnded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#18181b] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#202124] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-2xl">
            ⏹
          </div>
          <h2 className="text-2xl font-semibold">
            Meeting ended
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {meetingEndedMessage ||
              "The host ended this meeting."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (waitingForApproval) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#18181b] px-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#202124] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20 text-2xl">
            ⏳
          </div>
          <h2 className="text-2xl font-semibold">
            Waiting for approval
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {waitingMessage ||
              "Waiting for the host to let you in."}
          </p>
          <button
            onClick={leaveMeeting}
            className="mt-6 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold hover:bg-red-600"
          >
            Leave meeting
          </button>
        </div>
      </div>
    );
  }

  const videoTileCount = participants.length + 1;
  const videoGridColumns =
    videoTileCount === 1
      ? "grid-cols-1"
      : videoTileCount === 2
        ? "grid-cols-2"
        : videoTileCount <= 4
          ? "grid-cols-2"
          : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="relative h-dvh overflow-hidden bg-[#18181b] text-white">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 flex-nowrap items-center justify-between gap-3 border-b border-white/10 bg-[#202124] px-3 sm:px-5">

        <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b5cff] text-white">
            <RoomIcon name="video" className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Zoom Clone
            </p>

            <p className="truncate text-xs text-white/50">
              Meeting ID: {meetingId}
            </p>
          </div>

        </div>

        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3">

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/85">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            {isConnected ? "Connected" : "Connecting..."}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/90">
            <RoomIcon name="clock" className="h-4 w-4 text-white/60" />
            {formatElapsedTime(elapsedSeconds)}
          </div>

          <button
            onClick={() =>
              setShowPeople(!showPeople)
            }
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              showPeople
                ? "border-blue-400/40 bg-blue-500/20 text-white"
                : "border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/10"
            }`}
            title="Participants"
          >
            <RoomIcon name="people" className="h-4 w-4" />
            {participantCount}{" "}
            {participantCount === 1 ? "participant" : "participants"}
          </button>

          <button
            onClick={copyMeetingLink}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/85 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:inline-flex"
            title="Copy meeting link"
          >
            <RoomIcon name={copied ? "check" : "link"} className="h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </button>

          {isHost && (
            <button
              onClick={() =>
                sendHostAction("end-meeting")
              }
              className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <RoomIcon name="stop" className="h-4 w-4" />
              End meeting
            </button>
          )}

          <button
            onClick={leaveMeeting}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202124]"
          >
            <RoomIcon name="leave" className="h-4 w-4" />
            Leave
          </button>

        </div>

      </header>

      <main className="fixed inset-x-0 bottom-[74px] top-16 flex min-h-0 justify-center overflow-hidden p-3 sm:p-5">

        {error && (
          <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-xl bg-red-500/20 px-5 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div
          className={`grid h-full min-h-0 w-full grid-flow-row auto-rows-fr gap-3 sm:gap-4 ${videoGridColumns}`}
        >

          <div className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#242528] shadow-2xl">

            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            {!cameraOn && !screenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#303134]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0b5cff] text-2xl font-semibold">
                  {name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {reactionMap[participantIdRef.current] && (
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-2xl shadow-lg">
                {reactionMap[participantIdRef.current].emoji}
              </div>
            )}

            <div className="absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 text-sm">
              {name}
              <span className="text-white/50"> (You)</span>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1.5">
              <span
                title={micOn ? "Microphone on" : "Microphone muted"}
                aria-label={micOn ? "Microphone on" : "Microphone muted"}
                className={micOn ? "text-white/85" : "text-red-400"}
              >
                <RoomIcon name={micOn ? "mic" : "micOff"} className="h-4 w-4" />
              </span>
              <span
                title={cameraOn ? "Camera on" : "Camera off"}
                aria-label={cameraOn ? "Camera on" : "Camera off"}
                className={cameraOn ? "text-white/85" : "text-red-400"}
              >
                <RoomIcon
                  name={cameraOn ? "camera" : "cameraOff"}
                  className="h-4 w-4"
                />
              </span>
            </div>

            {screenSharing && (
              <div className="absolute left-4 top-4 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold">
                Screen sharing
              </div>
            )}

            {handRaised && (
              <div className="absolute right-4 top-4 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-black">
                Hand raised
              </div>
            )}

          </div>

          {participants.map((participant) => (
            <div
              key={participant.participant_id}
              className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#242528] shadow-2xl"
            >
              <video
                id={`remote-${participant.participant_id}`}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />

              {participant.raised && (
                <div className="absolute right-4 top-4 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-black">
                  Hand raised
                </div>
              )}

              {reactionMap[participant.participant_id] && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-2xl shadow-lg">
                  {reactionMap[participant.participant_id].emoji}
                </div>
              )}

              <div className="absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 text-sm">
                {participant.name}
                {participant.host && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-300">
                    Host
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1.5">
                <span
                  title={participant.mic === false ? "Microphone muted" : "Microphone on"}
                  aria-label={participant.mic === false ? "Microphone muted" : "Microphone on"}
                  className={participant.mic === false ? "text-red-400" : "text-white/85"}
                >
                  <RoomIcon
                    name={participant.mic === false ? "micOff" : "mic"}
                    className="h-4 w-4"
                  />
                </span>
                <span
                  title={participant.camera === false ? "Camera off" : "Camera on"}
                  aria-label={participant.camera === false ? "Camera off" : "Camera on"}
                  className={participant.camera === false ? "text-red-400" : "text-white/85"}
                >
                  <RoomIcon
                    name={participant.camera === false ? "cameraOff" : "camera"}
                    className="h-4 w-4"
                  />
                </span>
              </div>
            </div>
          ))}

        </div>

      </main>

      {showPeople && (
        <div className="fixed right-5 top-20 z-40 w-80 rounded-2xl border border-white/10 bg-[#202124] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">People</h2>
            <button
              onClick={() => setShowPeople(false)}
              className="text-white/50 hover:text-white"
            >
              X
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 p-3">
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-white/40">You</p>
            </div>
            <div className="text-xs text-green-400">Connected</div>
          </div>

          {isHost && waitingParticipants.length > 0 && (
            <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                Waiting room
              </p>

              {waitingParticipants.map((participant) => (
                <div
                  key={participant.participant_id}
                  className="mb-2 rounded-lg bg-black/20 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{participant.name}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          socketRef.current?.send(
                            JSON.stringify({
                              type: "approve-participant",
                              target: participant.participant_id,
                            })
                          )
                        }
                        className="rounded bg-green-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-600"
                      >
                        Admit
                      </button>
                      <button
                        onClick={() =>
                          socketRef.current?.send(
                            JSON.stringify({
                              type: "reject-participant",
                              target: participant.participant_id,
                            })
                          )
                        }
                        className="rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {participants.map((participant) => (
            <div
              key={participant.participant_id}
              className="mb-2 rounded-xl bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm">{participant.name}</p>
                  {participant.raised && (
                    <span className="text-sm">✋</span>
                  )}
                </div>
                {participant.host && (
                  <span className="text-[10px] uppercase tracking-wide text-blue-300">
                    Host
                  </span>
                )}
              </div>

              {isHost && !participant.host && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      sendHostAction(
                        "host-mute",
                        participant.participant_id
                      )
                    }
                    className="rounded bg-white/10 px-2 py-1 text-[10px] hover:bg-white/20"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() =>
                      sendHostAction(
                        "host-camera-off",
                        participant.participant_id
                      )
                    }
                    className="rounded bg-white/10 px-2 py-1 text-[10px] hover:bg-white/20"
                  >
                    Camera off
                  </button>
                  <button
                    onClick={() =>
                      sendHostAction(
                        "remove-participant",
                        participant.participant_id
                      )
                    }
                    className="rounded bg-red-500/80 px-2 py-1 text-[10px] hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showChat && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[500px] w-80 flex-col rounded-2xl border border-white/10 bg-[#202124] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h2 className="font-semibold">Chat</h2>
            <button
              onClick={() => setShowChat(false)}
              className="text-white/50 hover:text-white"
            >
              X
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.length === 0 && (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/30">
                No messages yet
              </div>
            )}

            {chatMessages.map((message, index) => (
              <div key={index} className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{message.name}</span>
                  <span className="text-[10px] text-white/30">{message.time}</span>
                </div>
                <div className="mt-1 rounded-xl bg-white/5 px-3 py-2 text-sm">
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendChatMessage();
                  }
                }}
                placeholder="Type a message..."
                className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={sendChatMessage}
                className="rounded-xl bg-blue-600 px-3 text-sm font-semibold hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#202124]/95 px-2 py-2 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-2">
          <button
            onClick={toggleMic}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
              micOn ? "text-white hover:bg-white/10" : "bg-red-500/90 text-white hover:bg-red-500"
            }`}
            title={micOn ? "Mute" : "Unmute"}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            <RoomIcon name={micOn ? "mic" : "micOff"} />
            <span className="hidden text-[10px] font-medium sm:block">
              {micOn ? "Mute" : "Unmute"}
            </span>
          </button>

          <button
            onClick={toggleCamera}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
              cameraOn ? "text-white hover:bg-white/10" : "bg-red-500/90 text-white hover:bg-red-500"
            }`}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          >
            <RoomIcon name={cameraOn ? "camera" : "cameraOff"} />
            <span className="hidden text-[10px] font-medium sm:block">
              {cameraOn ? "Camera" : "Start video"}
            </span>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
              screenSharing ? "bg-blue-600 text-white hover:bg-blue-500" : "text-white hover:bg-white/10"
            }`}
            title={screenSharing ? "Stop sharing" : "Share screen"}
            aria-label={screenSharing ? "Stop screen sharing" : "Share screen"}
          >
            <RoomIcon name="share" />
            <span className="hidden text-[10px] font-medium sm:block">
              {screenSharing ? "Stop share" : "Share screen"}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setReactionMenuOpen(!reactionMenuOpen)}
              className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
                reactionMenuOpen ? "bg-blue-600 text-white" : "text-white hover:bg-white/10"
              }`}
              title="Add reaction"
              aria-label="Open reactions"
            >
              <RoomIcon name="reaction" />
              <span className="hidden text-[10px] font-medium sm:block">Reactions</span>
            </button>

            {reactionMenuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] left-1/2 flex -translate-x-1/2 gap-2 rounded-xl border border-white/10 bg-[#202124] p-2 shadow-xl">
                {['👍', '🎉', '👏', '🔥', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-xl hover:bg-white/10"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPeople(!showPeople)}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
              showPeople ? "bg-blue-600 text-white" : "text-white hover:bg-white/10"
            }`}
            title="People"
            aria-label="Toggle participants panel"
          >
            <RoomIcon name="people" />
            <span className="hidden text-[10px] font-medium sm:block">Participants</span>
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-14 sm:w-[68px] ${
              showChat ? "bg-blue-600 text-white" : "text-white hover:bg-white/10"
            }`}
            title="Chat"
            aria-label="Toggle chat panel"
          >
            <RoomIcon name="chat" />
            <span className="hidden text-[10px] font-medium sm:block">Chat</span>
          </button>

          <button
            onClick={toggleHand}
            className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 sm:h-14 sm:w-[68px] ${
              handRaised ? "bg-yellow-500 text-black hover:bg-yellow-400" : "text-white hover:bg-white/10"
            }`}
            title={handRaised ? "Lower hand" : "Raise hand"}
            aria-label={handRaised ? "Lower hand" : "Raise hand"}
          >
            <RoomIcon name="hand" />
            <span className="hidden text-[10px] font-medium sm:block">
              {handRaised ? "Lower hand" : "Raise hand"}
            </span>
          </button>

          <button
            onClick={leaveMeeting}
            className="ml-1 flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-red-600 text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:ml-3 sm:h-14 sm:w-[76px]"
            title="Leave meeting"
            aria-label="Leave meeting"
          >
            <RoomIcon name="leave" />
            <span className="hidden text-[10px] font-medium sm:block">Leave</span>
          </button>
        </div>
      </footer>
    </div>
  );
}