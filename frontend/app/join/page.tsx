"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getMeeting } from "@/lib/api";

export default function JoinMeeting() {

  const router = useRouter();

  const [meetingId, setMeetingId] =
    useState("");

  const [displayName, setDisplayName] =
    useState("Avisha Sahu");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const handleJoin = async () => {

    setError("");

    // Remove spaces from meeting ID
    const cleanMeetingId =
      meetingId.replace(/\s/g, "");


    // Basic validation
    if (!cleanMeetingId) {

      setError(
        "Please enter a meeting ID."
      );

      return;
    }


    if (!displayName.trim()) {

      setError(
        "Please enter your name."
      );

      return;
    }


    if (!/^\d{9}$/.test(cleanMeetingId)) {

      setError(
        "Meeting ID must contain 9 digits."
      );

      return;
    }


    try {

      setLoading(true);


      // Check meeting exists
      await getMeeting(
        cleanMeetingId
      );


      // Meeting exists
      router.push(
        `/meeting/${cleanMeetingId}?name=${encodeURIComponent(
          displayName.trim()
        )}`
      );


    } catch (error) {

      console.error(error);

      setError(
        "Meeting not found. Please check the meeting ID."
      );

    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="min-h-screen bg-[#f8f9fb]">

      {/* =========================================
          TOP NAVBAR
      ========================================= */}

      <header className="flex h-[72px] items-center border-b border-[#e5e7eb] bg-white px-6 sm:px-10">

        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
        >

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b5cff] text-lg font-bold text-white">
            Z
          </div>

          <span className="text-xl font-semibold text-[#111827]">
            Zoom
          </span>

        </button>


        <div className="ml-auto">

          <button
            onClick={() => router.push("/")}
            className="text-sm font-medium text-[#6b7280] hover:text-[#111827]"
          >
            Back to Home
          </button>

        </div>

      </header>



      {/* =========================================
          MAIN
      ========================================= */}

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5 py-12">

        <div className="w-full max-w-[460px]">


          {/* Heading */}

          <div className="mb-8 text-center">

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-2xl text-[#0b5cff]">
              ↗
            </div>

            <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[#111827]">
              Join a meeting
            </h1>

            <p className="mt-2 text-sm text-[#6b7280]">
              Enter the meeting ID provided by the host.
            </p>

          </div>



          {/* Card */}

          <div className="rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-8">


            {/* Meeting ID */}

            <div>

              <label
                htmlFor="meetingId"
                className="mb-2 block text-sm font-semibold text-[#374151]"
              >
                Meeting ID
              </label>

              <input
                id="meetingId"
                type="text"
                value={meetingId}
                onChange={(event) =>
                  setMeetingId(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key === "Enter"
                  ) {
                    handleJoin();
                  }

                }}
                placeholder="Enter 9-digit meeting ID"
                maxLength={11}
                className="w-full rounded-xl border border-[#dfe3e8] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#0b5cff] focus:ring-4 focus:ring-[#0b5cff]/10"
              />

              <p className="mt-2 text-xs text-[#9ca3af]">
                Example: 383704380
              </p>

            </div>



            {/* Display Name */}

            <div className="mt-5">

              <label
                htmlFor="displayName"
                className="mb-2 block text-sm font-semibold text-[#374151]"
              >
                Your name
              </label>

              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key === "Enter"
                  ) {
                    handleJoin();
                  }

                }}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-[#dfe3e8] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#0b5cff] focus:ring-4 focus:ring-[#0b5cff]/10"
              />

            </div>



            {/* Error */}

            {error && (

              <div className="mt-5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">

                <p className="text-sm text-[#dc2626]">
                  {error}
                </p>

              </div>

            )}



            {/* Join */}

            <button
              onClick={handleJoin}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#0b5cff] py-3.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(11,92,255,0.18)] transition hover:bg-[#084dcc] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading
                ? "Checking meeting..."
                : "Join Meeting"}

            </button>



            {/* Information */}

            <div className="mt-6 border-t border-[#eef0f3] pt-5">

              <p className="text-center text-xs leading-5 text-[#9ca3af]">
                By joining this meeting, you agree to
                participate respectfully and follow the
                meeting host's instructions.
              </p>

            </div>

          </div>



          {/* Bottom */}

          <p className="mt-6 text-center text-xs text-[#9ca3af]">
            No account required
          </p>

        </div>

      </main>

    </div>
  );
}