"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

import { getMeeting } from "@/lib/api";

interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string;
  meeting_type: string;
}

export default function MeetingPage() {

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const meetingId = params.meetingId as string;

  const name =
    searchParams.get("name") || "Guest";

  const initialName =
    name && name.trim() ? name : "Guest";


  const [meeting, setMeeting] =
    useState<Meeting | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [displayName, setDisplayName] =
    useState(name);


  const [cameraOn, setCameraOn] =
    useState(true);

  const [micOn, setMicOn] =
    useState(true);


  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const attachStreamToVideo = useCallback((videoElement: HTMLVideoElement | null = videoRef.current) => {
    const video = videoElement;
    const stream = streamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.play().catch(() => undefined);
  }, []);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    attachStreamToVideo(node);
  }, [attachStreamToVideo]);


  // ==========================================
  // LOAD MEETING
  // ==========================================

  useEffect(() => {

    async function loadMeeting() {

      try {

        const data =
          await getMeeting(meetingId);

        setMeeting(data);

      } catch (error) {

        console.error(error);

        setError(
          "This meeting does not exist."
        );

      } finally {

        setLoading(false);

      }

    }

    loadMeeting();

  }, [meetingId]);


  // ==========================================
  // START CAMERA
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        attachStreamToVideo();
      } catch (error) {
        console.error("Camera permission error:", error);
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [attachStreamToVideo]);

  useEffect(() => {
    if (!streamRef.current) {
      return;
    }

    const videoTracks = streamRef.current.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = cameraOn;
    });

    if (cameraOn) {
      attachStreamToVideo();
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraOn, attachStreamToVideo]);


  // ==========================================
  // MICROPHONE
  // ==========================================

  useEffect(() => {

    if (!streamRef.current) {
      return;
    }

    const audioTracks =
      streamRef.current.getAudioTracks();

    audioTracks.forEach((track) => {

      track.enabled = micOn;

    });

  }, [micOn]);


  // ==========================================
  // JOIN MEETING
  // ==========================================

  const handleJoinMeeting = () => {
    const nextName = displayName.trim();

    if (!nextName) {
      setError("Please enter your display name.");
      return;
    }

    router.push(
      `/meeting/${meetingId}/room?name=${encodeURIComponent(
        nextName
      )}`
    );
  };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#18191b]">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#4b4d50] border-t-white" />

          <p className="mt-4 text-sm text-[#b8b9bb]">
            Joining meeting...
          </p>

        </div>

      </div>

    );

  }


  // ==========================================
  // ERROR
  // ==========================================

  if (error || !meeting) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-5">

        <div className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-lg">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2] text-2xl text-[#dc2626]">
            !
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#111827]">
            Meeting not found
          </h1>

          <p className="mt-2 text-sm text-[#6b7280]">
            The meeting ID you entered is invalid
            or the meeting no longer exists.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#0b5cff] px-5 py-3 text-sm font-semibold text-white hover:bg-[#084dcc]"
          >
            Back to Home
          </button>

        </div>

      </div>

    );

  }


  // ==========================================
  // PRE-JOIN SCREEN
  // ==========================================

  return (

    <div className="h-dvh overflow-hidden bg-[#18191b] text-white">


      {/* ======================================
          TOP BAR
      ====================================== */}

      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#303236] bg-[#18191b] px-5 sm:px-8">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b5cff] text-lg font-bold">
            Z
          </div>

          <span className="text-lg font-semibold">
            Zoom Clone
          </span>

        </div>


        <div className="text-right">

          <p className="text-xs text-[#9fa1a5]">
            Meeting ID
          </p>

          <p className="text-sm font-medium">
            {meeting.meeting_id}
          </p>

        </div>

      </header>



      {/* ======================================
          MAIN
      ====================================== */}

      <main className="flex h-[calc(100dvh-68px)] min-h-0 items-center justify-center overflow-hidden px-5 py-3 sm:py-4">

        <div className="grid h-full min-h-0 w-full max-w-[900px] grid-rows-[auto_minmax(0,1fr)_auto_auto_auto_auto] place-items-center gap-2 sm:gap-3">


          {/* Meeting title */}

          <div className="shrink-0 text-center">

            <h1 className="text-2xl font-semibold">
              {meeting.title}
            </h1>

            <p className="mt-2 text-sm text-[#9fa1a5]">
              Ready to join?
            </p>

          </div>



          {/* ==================================
              VIDEO PREVIEW
          ================================== */}

          <div className="relative h-full min-h-0 aspect-video w-auto max-w-full overflow-hidden rounded-2xl bg-[#242628] shadow-2xl">

            {cameraOn ? (

              <video
                ref={setVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

            ) : (

              <div className="flex h-full w-full items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#4a4c50] text-2xl font-semibold">
                    {displayName.trim().charAt(0).toUpperCase() || "G"}
                  </div>

                  <p className="mt-4 text-sm text-[#b8b9bb]">
                    Camera is off
                  </p>

                </div>

              </div>

            )}


            {/* Name label */}

            <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 text-sm">
              {displayName.trim() || "Guest"}
            </div>

          </div>



          {/* ==================================
              CONTROLS
          ================================== */}

          <div className="flex shrink-0 items-center justify-center gap-4">


            {/* MIC */}

            <button
              onClick={() =>
                setMicOn(!micOn)
              }
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                micOn
                  ? "bg-[#3a3c40] hover:bg-[#494b50]"
                  : "bg-[#dc2626] hover:bg-[#b91c1c]"
              }`}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              title={
                micOn
                  ? "Mute microphone"
                  : "Unmute microphone"
              }
            >
              {micOn ? (
                <Mic size={20} strokeWidth={1.8} />
              ) : (
                <MicOff size={20} strokeWidth={1.8} />
              )}
            </button>



            {/* CAMERA */}

            <button
              onClick={() =>
                setCameraOn(!cameraOn)
              }
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                cameraOn
                  ? "bg-[#3a3c40] hover:bg-[#494b50]"
                  : "bg-[#dc2626] hover:bg-[#b91c1c]"
              }`}
              aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              title={
                cameraOn
                  ? "Turn camera off"
                  : "Turn camera on"
              }
            >
              {cameraOn ? (
                <Video size={20} strokeWidth={1.8} />
              ) : (
                <VideoOff size={20} strokeWidth={1.8} />
              )}
            </button>

          </div>



          {/* ==================================
              DISPLAY NAME INPUT
          ================================== */}

          <div className="w-full max-w-[360px] shrink-0 text-left">
            <label htmlFor="displayName" className="mb-2 block text-sm text-[#9fa1a5]">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleJoinMeeting();
                }
              }}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-[#3a3c40] bg-[#202225] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e9197] focus:border-[#0b5cff]"
            />
          </div>



          {/* ==================================
              JOIN BUTTON
          ================================== */}

          <div className="flex shrink-0 justify-center">

            <button
              onClick={handleJoinMeeting}
              className="rounded-xl bg-[#0b5cff] px-10 py-3.5 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(11,92,255,0.25)] transition hover:bg-[#084dcc] hover:shadow-[0_10px_30px_rgba(11,92,255,0.35)]"
            >
              Join Meeting
            </button>

          </div>



          {/* Back */}

          <div className="shrink-0 text-center">

            <button
              onClick={() => router.push("/")}
              className="text-sm text-[#9fa1a5] hover:text-white"
            >
              ← Leave
            </button>

          </div>

        </div>

      </main>

    </div>

  );
}