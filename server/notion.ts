// Notion Integration for IA Infinity
// Uses Replit's Notion connector for authentication

import { Client } from '@notionhq/client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

export async function getNotionClient(): Promise<Client> {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

export async function listNotionDatabases(): Promise<Array<{ id: string; title: string }>> {
  const notion = await getNotionClient();
  const response = await notion.search({
    filter: { property: 'object', value: 'database' }
  });
  
  return response.results
    .filter((result): result is any => result.object === 'database')
    .map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database'
    }));
}

export async function getDatabaseSchema(databaseId: string): Promise<any> {
  const notion = await getNotionClient();
  const database = await notion.databases.retrieve({ database_id: databaseId });
  return database;
}

export async function queryDatabase(databaseId: string, startCursor?: string): Promise<{
  results: any[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const notion = await getNotionClient();
  const response = await notion.databases.query({
    database_id: databaseId,
    start_cursor: startCursor,
    page_size: 100
  });
  
  return {
    results: response.results,
    nextCursor: response.next_cursor,
    hasMore: response.has_more
  };
}

// Helper to extract property value from Notion page
export function getPropertyValue(page: any, propertyName: string): any {
  const property = page.properties[propertyName];
  if (!property) return null;
  
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || null;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || null;
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map((s: any) => s.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'email':
      return property.email || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'url':
      return property.url || null;
    case 'checkbox':
      return property.checkbox;
    case 'people':
      return property.people?.map((p: any) => p.name || p.id) || [];
    case 'relation':
      return property.relation?.map((r: any) => r.id) || [];
    case 'formula':
      return property.formula?.string || property.formula?.number || null;
    case 'rollup':
      return property.rollup?.number || property.rollup?.array || null;
    case 'status':
      return property.status?.name || null;
    default:
      return null;
  }
}

// Find the most likely property name for a field
export function findPropertyByPossibleNames(properties: any, possibleNames: string[]): string | null {
  const propertyKeys = Object.keys(properties);
  for (const name of possibleNames) {
    const found = propertyKeys.find(key => 
      key.toLowerCase() === name.toLowerCase() ||
      key.toLowerCase().includes(name.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}
