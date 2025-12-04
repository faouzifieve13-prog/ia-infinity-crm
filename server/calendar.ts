// Google Calendar integration using Replit connection
import { google, calendar_v3 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  htmlLink?: string;
  status?: string;
  colorId?: string;
}

export async function testCalendarConnection(): Promise<{ connected: boolean; email?: string; error?: string }> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const calendarList = await calendar.calendarList.list({ maxResults: 1 });
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
    return { 
      connected: true, 
      email: primaryCalendar?.id || undefined 
    };
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

export async function getCalendarEvents(
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = 50
): Promise<CalendarEvent[]> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const now = new Date();
  const defaultTimeMin = timeMin || new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTimeMax = timeMax || new Date(now.getFullYear(), now.getMonth() + 2, 0);
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: defaultTimeMin.toISOString(),
    timeMax: defaultTimeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  
  return events.map((event: calendar_v3.Schema$Event) => ({
    id: event.id || '',
    title: event.summary || 'Sans titre',
    description: event.description || undefined,
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    location: event.location || undefined,
    attendees: event.attendees?.map(a => a.email || '').filter(Boolean) || [],
    htmlLink: event.htmlLink || undefined,
    status: event.status || undefined,
    colorId: event.colorId || undefined,
  }));
}

export async function getCalendarList(): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const response = await calendar.calendarList.list();
  const calendars = response.data.items || [];
  
  return calendars.map(cal => ({
    id: cal.id || '',
    summary: cal.summary || 'Sans nom',
    primary: cal.primary || false,
  }));
}

export async function createCalendarEvent(event: {
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
}): Promise<CalendarEvent> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const eventData: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.start,
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: event.end,
      timeZone: 'Europe/Paris',
    },
    attendees: event.attendees?.map(email => ({ email })),
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventData,
    sendUpdates: 'all',
  });

  const created = response.data;
  return {
    id: created.id || '',
    title: created.summary || 'Sans titre',
    description: created.description || undefined,
    start: created.start?.dateTime || created.start?.date || '',
    end: created.end?.dateTime || created.end?.date || '',
    location: created.location || undefined,
    attendees: created.attendees?.map(a => a.email || '').filter(Boolean) || [],
    htmlLink: created.htmlLink || undefined,
    status: created.status || undefined,
  };
}

export async function updateCalendarEvent(
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    location?: string;
  }
): Promise<CalendarEvent> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const eventData: calendar_v3.Schema$Event = {
    ...existing.data,
    summary: updates.title ?? existing.data.summary,
    description: updates.description ?? existing.data.description,
    location: updates.location ?? existing.data.location,
  };

  if (updates.start) {
    eventData.start = { dateTime: updates.start, timeZone: 'Europe/Paris' };
  }
  if (updates.end) {
    eventData.end = { dateTime: updates.end, timeZone: 'Europe/Paris' };
  }

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: eventData,
  });

  const updated = response.data;
  return {
    id: updated.id || '',
    title: updated.summary || 'Sans titre',
    description: updated.description || undefined,
    start: updated.start?.dateTime || updated.start?.date || '',
    end: updated.end?.dateTime || updated.end?.date || '',
    location: updated.location || undefined,
    attendees: updated.attendees?.map(a => a.email || '').filter(Boolean) || [],
    htmlLink: updated.htmlLink || undefined,
    status: updated.status || undefined,
  };
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}
