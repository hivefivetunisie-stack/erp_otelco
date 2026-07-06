import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

let cachedAccessToken: string | null = null;

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const clearCachedToken = (): void => {
  cachedAccessToken = null;
};

export const requestCalendarToken = async (): Promise<string | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    // We can suggest to select account and prompt consent to assure we get the token
    provider.setCustomParameters({
      prompt: 'consent'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible de récupérer le jeton d'accès Google Calendar.");
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error) {
    console.error("Erreur lors de l'authentification Calendar:", error);
    throw error;
  }
};

interface CalendarEventParams {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  clientEmail?: string;
  clientName?: string;
}

export const createCalendarEvent = async (
  token: string,
  params: CalendarEventParams
): Promise<{ id: string } | null> => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Tunis';
  
  // Format dates: e.g. YYYY-MM-DDTHH:MM:00
  const startDateTime = `${params.date}T${params.startTime}:00`;
  const endDateTime = `${params.date}T${params.endTime}:00`;

  const attendees = params.clientEmail 
    ? [{ email: params.clientEmail, displayName: params.clientName || '' }]
    : [];

  const body = {
    summary: params.title,
    description: params.description || `Réservation de salle facilitée par HiveFive. Client: ${params.clientName || 'Inconnu'}`,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone
    },
    attendees: attendees,
    reminders: {
      useDefault: true
    }
  };

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearCachedToken();
      }
      const errText = await response.text();
      throw new Error(`Google Calendar API Error code ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return { id: data.id };
  } catch (err) {
    console.error("Erreur createCalendarEvent:", err);
    throw err;
  }
};

export const updateCalendarEvent = async (
  token: string,
  eventId: string,
  params: CalendarEventParams
): Promise<boolean> => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Tunis';
  const startDateTime = `${params.date}T${params.startTime}:00`;
  const endDateTime = `${params.date}T${params.endTime}:00`;

  const attendees = params.clientEmail 
    ? [{ email: params.clientEmail, displayName: params.clientName || '' }]
    : [];

  const body = {
    summary: params.title,
    description: params.description || `Réservation de salle. Client: ${params.clientName || 'Inconnu'}`,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone
    },
    attendees: attendees,
    reminders: {
      useDefault: true
    }
  };

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearCachedToken();
      }
      const errText = await response.text();
      throw new Error(`Google Calendar API Error code ${response.status}: ${errText}`);
    }

    return true;
  } catch (err) {
    console.error("Erreur updateCalendarEvent:", err);
    throw err;
  }
};

export const deleteCalendarEvent = async (
  token: string,
  eventId: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok && response.status !== 404) {
      if (response.status === 401) {
        clearCachedToken();
      }
      const errText = await response.text();
      throw new Error(`Google Calendar API Error code ${response.status}: ${errText}`);
    }

    return true;
  } catch (err) {
    console.error("Erreur deleteCalendarEvent:", err);
    throw err;
  }
};
