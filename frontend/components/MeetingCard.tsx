"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Hash, Video } from "lucide-react";

interface MeetingCardProps {
  title: string;
  time: string;
  date: string;
  meetingId: string;
  duration?: number | null;
  type?: "upcoming" | "recent";
}

export default function MeetingCard({
  title,
  time,
  date,
  meetingId,
  duration,
  type = "upcoming",
}: MeetingCardProps) {

  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Remove spaces from IDs such as "847 291 563"
  const cleanMeetingId = meetingId.replace(/\s/g, "");

  const handleJoin = () => {
    router.push(`/meeting/${cleanMeetingId}`);
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/meeting/${cleanMeetingId}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
    }
  };

  return (
    <div className="group flex items-center justify-between rounded-xl border border-[#e5e7ed] bg-white p-5 transition duration-200 hover:-translate-y-[1px] hover:border-[#cbd5e1] hover:shadow-[0_6px_20px_rgba(35,35,51,0.06)]">

      <div className="flex min-w-0 items-center gap-4">

        {/* Meeting icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-[#0b5cff]">
          <Video size={21} strokeWidth={1.8} />
        </div>

        {/* Meeting information */}
        <div className="min-w-0">

          <h3 className="truncate text-[14px] font-semibold text-[#232333]">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#626274]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} strokeWidth={1.8} className="text-[#858597]" />
              {date}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} strokeWidth={1.8} className="text-[#858597]" />
              {time}
            </span>

            {duration && (
              <span>{duration} min</span>
            )}

            <span className="inline-flex items-center gap-1">
              <Hash size={13} strokeWidth={1.8} className="text-[#858597]" />
              ID: {meetingId}
            </span>
          </div>

        </div>

      </div>


      {/* Action */}
      {type === "upcoming" ? (

        <div className="ml-3 flex shrink-0 items-center gap-2">
          <button
            onClick={handleCopyInvite}
            className="rounded-[9px] border border-[#e1e3e8] px-3 py-2 text-xs font-semibold text-[#454556] transition hover:bg-[#f8f9fb]"
            title="Copy invite link"
          >
            {copied ? "Copied" : "Copy invite"}
          </button>
          <button
            onClick={handleJoin}
            className="rounded-[9px] bg-[#0b5cff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084dcc]"
          >
            Start
          </button>
        </div>

      ) : (

        <button
          onClick={handleJoin}
          className="ml-4 hidden shrink-0 rounded-[9px] border border-[#e1e3e8] px-4 py-2 text-xs font-semibold text-[#454556] transition hover:bg-[#f8f9fb] sm:block"
        >
          Details
        </button>

      )}

    </div>
  );
}