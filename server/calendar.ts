// Google Calendar integration using Replit connection
import { google, calendar_v3 } from 'googleapis';
import { db } from './db';
import { calendarEvents, contacts, accounts } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { CalendarEvent as DBCalendarEvent, InsertCalendarEvent } from '@shared/schema';

async function getConnectionSettings() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings;
}

async function getAccessToken() {
  const connectionSettings = await getConnectionSettings();
  
  // Debug: log connection settings status
  console.log('Calendar connection status:', connectionSettings?.status, 'has settings:', !!connectionSettings?.settings);
  
  // Check if connection has an error status (e.g., token revoked)
  if (connectionSettings?.status === 'error') {
    console.log('Calendar connection error details:', JSON.stringify(connectionSettings, null, 2));
    throw new Error('Token has been revoked - please reconnect Google Calendar in Replit integrations panel');
  }

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  
  // Check if token is expired
  const expiresAt = connectionSettings?.settings?.oauth?.credentials?.expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    throw new Error('Token expired - please reconnect Google Calendar');
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
    const calendarList = await calendar.calendarList.list({ maxResults: 10 });
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
    const email = primaryCalendar?.id || calendarList.data.items?.[0]?.id;
    return { 
      connected: true, 
      email: email || undefined 
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

// Database synchronization functions

async function matchAttendeeToContact(orgId: string, attendeeEmails: string[]): Promise<{ accountId?: string; contactId?: string }> {
  for (const email of attendeeEmails) {
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.orgId, orgId), eq(contacts.email, email.toLowerCase())));
    
    if (contact) {
      return {
        accountId: contact.accountId || undefined,
        contactId: contact.id
      };
    }
    
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.orgId, orgId), eq(accounts.contactEmail, email.toLowerCase())));
    
    if (account) {
      return {
        accountId: account.id,
        contactId: undefined
      };
    }
  }
  
  return {};
}

export async function syncCalendarEventsToDb(orgId: string, daysAhead: number = 30): Promise<{ synced: number; errors: string[] }> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });
    
    const events = response.data.items || [];
    let synced = 0;
    const errors: string[] = [];
    
    for (const event of events) {
      try {
        if (!event.id || !event.summary) continue;
        
        const attendeeEmails = (event.attendees || [])
          .filter(a => a.email && !a.self)
          .map(a => a.email!.toLowerCase());
        
        const { accountId, contactId } = await matchAttendeeToContact(orgId, attendeeEmails);
        
        const startDateTime = event.start?.dateTime || event.start?.date;
        const endDateTime = event.end?.dateTime || event.end?.date;
        
        if (!startDateTime || !endDateTime) continue;
        
        const eventData: InsertCalendarEvent = {
          orgId,
          googleEventId: event.id,
          title: event.summary,
          description: event.description || null,
          start: new Date(startDateTime),
          end: new Date(endDateTime),
          timezone: event.start?.timeZone || 'Europe/Paris',
          location: event.location || null,
          meetLink: event.hangoutLink || null,
          status: (event.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
          attendees: attendeeEmails,
          accountId: accountId || null,
          contactId: contactId || null,
          dealId: null,
        };
        
        const existing = await db.select().from(calendarEvents)
          .where(and(
            eq(calendarEvents.orgId, orgId),
            eq(calendarEvents.googleEventId, event.id)
          ));
        
        if (existing.length > 0) {
          await db.update(calendarEvents)
            .set({
              ...eventData,
              lastSyncedAt: new Date(),
            })
            .where(eq(calendarEvents.id, existing[0].id));
        } else {
          await db.insert(calendarEvents).values(eventData);
        }
        
        synced++;
      } catch (err: any) {
        errors.push(`Event ${event.id}: ${err.message}`);
      }
    }
    
    return { synced, errors };
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    throw new Error(`Failed to sync calendar: ${error.message}`);
  }
}

export async function getUpcomingDbEvents(
  orgId: string, 
  options: { 
    days?: number; 
    accountId?: string; 
    contactId?: string;
    limit?: number;
  } = {}
): Promise<DBCalendarEvent[]> {
  const { days = 30, accountId, contactId, limit = 50 } = options;
  
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const baseConditions = [
    eq(calendarEvents.orgId, orgId),
    gte(calendarEvents.start, now),
    lte(calendarEvents.start, futureDate)
  ];
  
  if (accountId) {
    baseConditions.push(eq(calendarEvents.accountId, accountId));
  }
  if (contactId) {
    baseConditions.push(eq(calendarEvents.contactId, contactId));
  }
  
  return db.select().from(calendarEvents)
    .where(and(...baseConditions))
    .orderBy(calendarEvents.start)
    .limit(limit);
}

export async function getPastDbEvents(
  orgId: string,
  options: {
    days?: number;
    limit?: number;
  } = {}
): Promise<DBCalendarEvent[]> {
  const { days = 7, limit = 20 } = options;
  
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);
  
  return db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.orgId, orgId),
      gte(calendarEvents.start, pastDate),
      lte(calendarEvents.end, now)
    ))
    .orderBy(desc(calendarEvents.start))
    .limit(limit);
}

export async function getDbCalendarEvent(id: string, orgId: string): Promise<DBCalendarEvent | undefined> {
  const [event] = await db.select().from(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)));
  return event;
}

export async function updateCalendarEventLinks(
  id: string, 
  orgId: string, 
  data: { accountId?: string | null; contactId?: string | null; dealId?: string | null }
): Promise<DBCalendarEvent | undefined> {
  const [updated] = await db.update(calendarEvents)
    .set(data)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)))
    .returning();
  return updated;
}

export async function updateMessageStatus(
  id: string,
  orgId: string,
  messageType: 'preConfirmation' | 'reminder' | 'thankYou',
  status: 'pending' | 'sent' | 'skipped' | 'failed'
): Promise<DBCalendarEvent | undefined> {
  const updateData: any = {};
  
  if (messageType === 'preConfirmation') {
    updateData.preConfirmationStatus = status;
    if (status === 'sent') updateData.preConfirmationSentAt = new Date();
  } else if (messageType === 'reminder') {
    updateData.reminderStatus = status;
    if (status === 'sent') updateData.reminderSentAt = new Date();
  } else if (messageType === 'thankYou') {
    updateData.thankYouStatus = status;
    if (status === 'sent') updateData.thankYouSentAt = new Date();
  }
  
  const [updated] = await db.update(calendarEvents)
    .set(updateData)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)))
    .returning();
  return updated;
}

export async function getEventsNeedingMessages(orgId: string): Promise<{
  needsConfirmation: DBCalendarEvent[];
  needsReminder: DBCalendarEvent[];
  needsThankYou: DBCalendarEvent[];
}> {
  const now = new Date();
  
  const in48Hours = new Date();
  in48Hours.setHours(in48Hours.getHours() + 48);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const allUpcoming = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.orgId, orgId),
      gte(calendarEvents.start, now),
      lte(calendarEvents.start, in48Hours)
    ));
  
  const allPast = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.orgId, orgId),
      gte(calendarEvents.end, yesterday),
      lte(calendarEvents.end, now)
    ));
  
  return {
    needsConfirmation: allUpcoming.filter(e => 
      e.preConfirmationStatus === 'pending' && (e.accountId || e.contactId)
    ),
    needsReminder: allUpcoming.filter(e => 
      e.reminderStatus === 'pending' && (e.accountId || e.contactId)
    ),
    needsThankYou: allPast.filter(e => 
      e.thankYouStatus === 'pending' && (e.accountId || e.contactId)
    ),
  };
}

export async function getAllDbCalendarEvents(orgId: string): Promise<DBCalendarEvent[]> {
  return db.select().from(calendarEvents)
    .where(eq(calendarEvents.orgId, orgId))
    .orderBy(calendarEvents.start);
}
