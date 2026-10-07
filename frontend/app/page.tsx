"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Info,
  LogIn,
  Plus,
  Video,
  X,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import MeetingCard from "@/components/MeetingCard";

import {
  createMeeting,
  getMeetings,
} from "@/lib/api";

interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string;
  scheduled_time?: string | null;
  duration?: number | null;
  meeting_type: string;
}

export default function Home() {

  const router = useRouter();

  const [showNewMeeting, setShowNewMeeting] =
    useState(false);

  const [showScheduleMeeting, setShowScheduleMeeting] =
    useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "",
  });

  const [scheduleError, setScheduleError] = useState("");

  const [scheduleSuccess, setScheduleSuccess] = useState("");

  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [loadingMeetings, setLoadingMeetings] =
    useState(true);

  const [creatingMeeting, setCreatingMeeting] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState<number | null>(null);

  const [minimumDate, setMinimumDate] =
    useState("");


  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.getTime());
      setMinimumDate(
        new Date(
          now.getTime() - now.getTimezoneOffset() * 60_000
        ).toISOString().slice(0, 10)
      );
    };

    updateClock();

    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);


  // ==========================================
  // LOAD MEETINGS FROM FASTAPI
  // ==========================================

  useEffect(() => {

    async function loadMeetings() {

      try {

        const data = await getMeetings();

        setMeetings(data);

      } catch (error) {

        console.error(
          "Failed to load meetings:",
          error
        );

      } finally {

        setLoadingMeetings(false);

      }
    }

    loadMeetings();

  }, []);


  // ==========================================
  // CREATE INSTANT MEETING
  // ==========================================

  const handleCreateMeeting = async () => {

    try {

      setCreatingMeeting(true);

      const meeting = await createMeeting();

      // Close modal
      setShowNewMeeting(false);

      // Go directly to meeting room
      router.push(
        `/meeting/${meeting.meeting_id}`
      );

    } catch (error) {

      console.error(
        "Failed to create meeting:",
        error
      );

      alert(
        "Could not create meeting. Please make sure the backend is running."
      );

    } finally {

      setCreatingMeeting(false);

    }
  };

  const handleScheduleMeeting = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setScheduleError("");

    const title = scheduleForm.title.trim();
    const selectedDateTime = new Date(
      `${scheduleForm.date}T${scheduleForm.time}`
    );

    if (!title || !scheduleForm.date || !scheduleForm.time || !scheduleForm.duration) {
      setScheduleError("Complete all required fields to schedule the meeting.");
      return;
    }

    if (
      Number.isNaN(selectedDateTime.getTime()) ||
      selectedDateTime.getTime() <= Date.now()
    ) {
      setScheduleError("Choose a date and time in the future.");
      return;
    }

    setSchedulingMeeting(true);

    try {
      const createdMeeting = await createMeeting({
        title,
        description: scheduleForm.description.trim(),
        meeting_type: "scheduled",
        scheduled_time: `${scheduleForm.date}T${scheduleForm.time}:00`,
        duration: Number(scheduleForm.duration),
      });

      setMeetings((current) => [
        ...current.filter(
          (meeting) => meeting.meeting_id !== createdMeeting.meeting_id
        ),
        createdMeeting,
      ]);

      try {
        setMeetings(await getMeetings());
      } catch (refreshError) {
        console.error("Failed to refresh scheduled meetings:", refreshError);
      }

      setScheduleSuccess(`“${createdMeeting.title}” has been scheduled.`);
      setScheduleForm({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: "",
      });
      setShowScheduleMeeting(false);
    } catch (error) {
      console.error("Failed to schedule meeting:", error);
      setScheduleError(
        error instanceof Error
          ? error.message
          : "Could not schedule the meeting. Please try again."
      );
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const upcomingMeetings = meetings
    .filter(
      (meeting) =>
        meeting.meeting_type === "scheduled" &&
        meeting.scheduled_time &&
        currentTime !== null &&
        new Date(meeting.scheduled_time).getTime() > currentTime
    )
    .sort(
      (first, second) =>
        new Date(first.scheduled_time || 0).getTime() -
        new Date(second.scheduled_time || 0).getTime()
    );


  return (

    <div className="min-h-screen bg-[#f7f8fa] font-sans text-[#232333]">

      <Sidebar />

      <Navbar />


      <main className="pt-[76px] lg:ml-[240px]">

        <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10">


          {/* ==========================================
              WELCOME
          ========================================== */}

          <section className="mb-8">

            <p className="mb-2 text-[13px] font-medium text-[#626274]">
              {currentTime === null
                ? ""
                : new Intl.DateTimeFormat(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(currentTime))}
            </p>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <h1 className="text-[30px] font-semibold tracking-[-1.1px] text-[#232333] sm:text-[34px]">
                  Good evening, Avisha
                </h1>

                <p className="mt-2 text-[14px] text-[#626274]">
                  Ready to connect? Start or schedule your next meeting.
                </p>

              </div>

              <button className="hidden items-center gap-1.5 text-[13px] font-semibold text-[#0b5cff] hover:underline sm:flex">
                View calendar <ArrowUpRight size={15} strokeWidth={1.8} />
              </button>

            </div>

          </section>



          {/* ==========================================
              ACTION CARDS
          ========================================== */}

          <section className="grid gap-5 sm:grid-cols-3">


            {/* NEW MEETING */}

            <button
              onClick={() =>
                setShowNewMeeting(true)
              }
              className="group relative overflow-hidden rounded-xl bg-[#0b5cff] p-6 text-left shadow-[0_5px_18px_rgba(11,92,255,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#084dcc]"
            >

              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

              <div className="relative">

                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                  <Plus size={23} strokeWidth={1.8} />
                </div>

                <h2 className="text-[15px] font-semibold text-white">
                  New Meeting
                </h2>

                <p className="mt-1 text-xs leading-5 text-blue-100">
                  Start an instant meeting now
                </p>

                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-white">
                  Start meeting <ArrowRight size={14} strokeWidth={1.9} />
                </div>

              </div>

            </button>



            {/* JOIN */}

            <button
              onClick={() =>
                router.push("/join")
              }
              className="group rounded-xl border border-[#e5e7ed] bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-[0_6px_20px_rgba(35,35,51,0.06)]"
            >

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#454556]">
                <LogIn size={21} strokeWidth={1.8} />
              </div>

              <h2 className="text-[15px] font-semibold text-[#232333]">
                Join Meeting
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Join using a meeting ID or link
              </p>

              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#0b5cff]">
                Enter meeting <ArrowRight size={14} strokeWidth={1.9} />
              </div>

            </button>



            {/* SCHEDULE */}

            <button
              onClick={() => {
                setScheduleError("");
                setScheduleSuccess("");
                setShowScheduleMeeting(true);
              }}
              className="group rounded-xl border border-[#e5e7ed] bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-[0_6px_20px_rgba(35,35,51,0.06)]"
            >

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#454556]">
                <CalendarPlus size={21} strokeWidth={1.8} />
              </div>

              <h2 className="text-[15px] font-semibold text-[#232333]">
                Schedule Meeting
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                Plan a meeting for later
              </p>

              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#0b5cff]">
                Schedule now <ArrowRight size={14} strokeWidth={1.9} />
              </div>

            </button>

          </section>

          {scheduleSuccess && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-[#bfe8d2] bg-[#f0faf4] px-4 py-3 text-sm font-medium text-[#16794c]"
            >
              {scheduleSuccess}
            </div>
          )}



          {/* ==========================================
              CONTENT GRID
          ========================================== */}

          <section className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_1fr]">


            {/* ==========================================
                UPCOMING MEETINGS
            ========================================== */}

            <div>

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#232333]">
                    Upcoming meetings
                  </h2>

                  <p className="mt-1 text-xs text-[#858597]">
                    Your scheduled meetings
                  </p>

                </div>

                <button className="text-xs font-semibold text-[#0b5cff] hover:underline">
                  View all
                </button>

              </div>



              <div className="space-y-3">

                {loadingMeetings ? (

                  <div className="rounded-xl border border-[#e5e7ed] bg-white p-8 text-center">

                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#0b5cff]" />

                    <p className="mt-3 text-xs text-[#6b7280]">
                      Loading meetings...
                    </p>

                  </div>

                ) : upcomingMeetings.length === 0 ? (

                  <div className="rounded-xl border border-dashed border-[#d4d8e0] bg-white p-10 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf4ff] text-[#0b5cff]">
                      <CalendarDays size={22} strokeWidth={1.8} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-[#232333]">
                      No upcoming meetings
                    </h3>

                    <p className="mt-1 text-xs text-[#6b7280]">
                      Schedule a meeting and it will appear here.
                    </p>

                  </div>

                ) : (

                  upcomingMeetings.map((meeting) => (

                    <MeetingCard
                      key={meeting.id}
                      title={meeting.title}
                      date={
                        meeting.scheduled_time
                          ? new Date(
                              meeting.scheduled_time
                            ).toLocaleDateString()
                          : "Today"
                      }
                      time={
                        meeting.scheduled_time
                          ? new Date(
                              meeting.scheduled_time
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Now"
                      }
                      meetingId={
                        meeting.meeting_id
                      }
                      duration={meeting.duration}
                    />

                  ))

                )}

              </div>

            </div>



            {/* ==========================================
                RECENT MEETINGS
            ========================================== */}

            <div>

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#232333]">
                    Recent meetings
                  </h2>

                  <p className="mt-1 text-xs text-[#858597]">
                    Your meeting history
                  </p>

                </div>

                <button className="text-xs font-semibold text-[#0b5cff] hover:underline">
                  View all
                </button>

              </div>


              <div className="rounded-xl border border-[#e5e7ed] bg-white p-2">

                <MeetingCard
                  title="Project Discussion"
                  date="Yesterday"
                  time="4:30 PM"
                  meetingId="521 903 741"
                  type="recent"
                />

                <MeetingCard
                  title="Design Review"
                  date="Oct 4"
                  time="2:00 PM"
                  meetingId="761 428 305"
                  type="recent"
                />

              </div>

            </div>

          </section>



          {/* ==========================================
              QUICK TIP
          ========================================== */}

          <section className="mt-8 flex flex-col justify-between gap-4 rounded-xl border border-[#e5e7ed] bg-white p-5 sm:flex-row sm:items-center">

            <div className="flex items-center gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-[#0b5cff]">
                <Info size={19} strokeWidth={1.8} />
              </div>

              <div>

                <p className="text-sm font-semibold text-[#232333]">
                  Quick tip
                </p>

                <p className="mt-1 text-xs text-[#6b7280]">
                  Share your meeting link with participants before the meeting starts.
                </p>

              </div>

            </div>

            <button className="flex items-center gap-1.5 text-left text-xs font-semibold text-[#0b5cff] sm:text-right">
              Learn more <ArrowRight size={14} strokeWidth={1.9} />
            </button>

          </section>

        </div>

      </main>



      {/* ==========================================
          NEW MEETING MODAL
      ========================================== */}

      {showNewMeeting && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">


            {/* Modal header */}

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-xl font-semibold text-[#111827]">
                  Start a new meeting
                </h2>

                <p className="mt-1 text-sm text-[#6b7280]">
                  Create an instant meeting and invite participants.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowNewMeeting(false)
                }
                aria-label="Close new meeting dialog"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#626274] transition-colors hover:bg-[#f3f4f6]"
              >
                <X size={18} strokeWidth={1.8} />
              </button>

            </div>



            {/* Meeting type */}

            <div className="mt-6 rounded-xl bg-[#f8f9fb] p-4">

              <p className="text-xs font-medium text-[#6b7280]">
                Meeting type
              </p>

              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#232333]">
                <Video size={16} strokeWidth={1.8} className="text-[#0b5cff]" />
                Instant Meeting
              </p>

            </div>



            {/* Buttons */}

            <div className="mt-6 flex gap-3">

              <button
                onClick={() =>
                  setShowNewMeeting(false)
                }
                disabled={creatingMeeting}
                className="flex-1 rounded-xl border border-[#e5e7eb] py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#f8f9fb] disabled:opacity-50"
              >
                Cancel
              </button>


              <button
                onClick={handleCreateMeeting}
                disabled={creatingMeeting}
                className="flex-1 rounded-xl bg-[#0b5cff] py-3 text-sm font-semibold text-white transition hover:bg-[#084dcc] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {creatingMeeting
                  ? "Creating..."
                  : "Start Meeting"}

              </button>

            </div>

          </div>

        </div>

      )}

      {showScheduleMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-meeting-title"
            className="my-auto w-full max-w-xl rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="schedule-meeting-title" className="text-xl font-semibold text-[#111827]">
                  Schedule a meeting
                </h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Set the details and invite people with your meeting link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleMeeting(false)}
                disabled={schedulingMeeting}
                aria-label="Close scheduling form"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#626274] transition-colors hover:bg-[#f3f4f6]"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting}>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                    Meeting title <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    maxLength={200}
                    value={scheduleForm.title}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Team planning"
                    className="w-full rounded-xl border border-[#d9dee7] px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/15"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                    Description <span className="text-xs font-normal text-[#9ca3af]">(optional)</span>
                  </span>
                  <textarea
                    rows={3}
                    value={scheduleForm.description}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Add an agenda or meeting notes"
                    className="w-full resize-y rounded-xl border border-[#d9dee7] px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/15"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Date <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      type="date"
                      min={minimumDate}
                      value={scheduleForm.date}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[#d9dee7] px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/15"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Time <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      type="time"
                      value={scheduleForm.time}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          time: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[#d9dee7] px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/15"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                    Duration <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={scheduleForm.duration}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        duration: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#d9dee7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/15"
                  >
                    <option value="" disabled>Select duration</option>
                    {[15, 30, 45, 60, 90, 120].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {scheduleError && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {scheduleError}
                </p>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowScheduleMeeting(false)}
                  disabled={schedulingMeeting}
                  className="rounded-xl border border-[#e5e7eb] px-5 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#f8f9fb] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingMeeting}
                  className="rounded-xl bg-[#0b5cff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#084dcc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {schedulingMeeting ? "Scheduling..." : "Schedule meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
