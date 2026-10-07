# Zoom Clone

A real-time video conferencing application inspired by Zoom, built for instant meetings, scheduled sessions, and collaborative room experiences.

## Features

- Instant meeting creation and scheduled meetings
- Real-time participant join/leave tracking
- Audio and video toggle for each participant
- Host controls, waiting room support, and meeting status updates
- Chat, reactions, and raised-hand interactions
- WebRTC-based peer-to-peer media streaming for live meetings
- SQLite-backed meeting persistence

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, SQLAlchemy
- Real-time communication: WebSockets and WebRTC
- Database: SQLite
- Deployment: Vercel (frontend) and Render (backend)

## Project Structure

```text
zoom-clone/
├── backend/
│   ├── main.py               # FastAPI app, WebSocket logic, meeting APIs
│   ├── models.py             # Meeting database model
│   ├── database.py           # SQLite engine and session setup
│   ├── requirements.txt      # Python dependencies
│   └── zoom_clone.db         # Local SQLite database
├── frontend/
│   ├── app/                  # Next.js app routes
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Shared frontend API utilities
│   ├── package.json          # Frontend dependencies and scripts
│   └── public/               # Static assets
├── README.md
└── .gitignore
```

## How to Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Then open: http://localhost:3000

If you are testing against the local backend instead of the live deployment, update the API base URL in `frontend/lib/api.ts` to `http://localhost:8000`.

## How to Run Backend Locally

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

## Environment Variables / Configuration

- `FRONTEND_URL` (backend): used for CORS and generated meeting links. Default is `http://localhost:3000`.
- `API_URL` (frontend): configured in `frontend/lib/api.ts` and points to the deployed backend by default.
- SQLite database: configured in `backend/database.py` as `sqlite:///./zoom_clone.db`.

## Deployed Frontend and Backend Links

- Frontend: https://zoom-clone-frontend.vercel.app
- Backend: https://zoom-clone-backend-vie2.onrender.com

## How WebSocket Communication Is Used

The application uses WebSockets to manage real-time meeting state. Once a user joins a room, the frontend connects to the meeting WebSocket endpoint and sends a `join` message with the participant ID and name. The backend then broadcasts room updates such as:

- participant joins and leaves
- mic and camera status changes
- waiting-room approvals and rejections
- meeting start/end events
- WebRTC signaling messages (`offer`, `answer`, `ice-candidate`)

This allows the app to coordinate live peer connections and room activity without reloading the page.

## Future Improvements

- End-to-end encryption for meeting streams
- Recording and playback support
- Better host moderation tools and meeting analytics
- Improved scalability for larger group meetings
- Authentication and user profiles
- Enhanced chat moderation and file sharing
