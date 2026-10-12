const API_URL = "https://zoom-clone-backend-vie2.onrender.com";

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string;
  meeting_type: string;
  scheduled_time?: string | null;
  duration?: number | null;
  created_at?: string | null;
  completed_at?: string | null;
  is_active?: boolean;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meeting_type?: "instant" | "scheduled";
  scheduled_time?: string;
  duration?: number;
}

export async function createMeeting(
  meeting?: CreateMeetingInput
): Promise<Meeting> {
  const response = await fetch(
    `${API_URL}/meetings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      ...(meeting ? { body: JSON.stringify(meeting) } : {}),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create meeting");
  }

  return response.json();
}

export async function getMeetings(): Promise<Meeting[]> {
  const response = await fetch(
    `${API_URL}/meetings`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch meetings");
  }

  const meetings: unknown = await response.json();
  if (!Array.isArray(meetings)) {
    throw new Error("The meetings API returned an invalid response");
  }
  return meetings as Meeting[];
}

export async function getMeeting(
  meetingId: string
) {
  const response = await fetch(
    `${API_URL}/meetings/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Meeting not found");
  }

  return response.json();
}