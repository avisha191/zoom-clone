const API_URL = "http://127.0.0.1:8000";

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meeting_type?: "instant" | "scheduled";
  scheduled_time?: string;
  duration?: number;
}

export async function createMeeting(
  meeting?: CreateMeetingInput
) {
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

export async function getMeetings() {
  const response = await fetch(
    `${API_URL}/meetings`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch meetings");
  }

  return response.json();
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