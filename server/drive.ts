// Google Drive integration using Replit connection
import { google } from 'googleapis';
import { Readable } from 'stream';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
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
  
  if (connectionSettings?.status === 'error') {
    throw new Error('Token has been revoked - please reconnect Google Drive');
  }

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  
  return accessToken;
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function testDriveConnection(): Promise<{ connected: boolean; email?: string; error?: string }> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    const about = await drive.about.get({ fields: 'user' });
    return { 
      connected: true, 
      email: about.data.user?.emailAddress || undefined 
    };
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

// Create or get the IA Infinity quotes folder
async function getOrCreateQuotesFolder(): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  // Search for existing folder
  const searchResponse = await drive.files.list({
    q: "name='IA Infinity - Devis' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create folder if it doesn't exist
  const folderMetadata = {
    name: 'IA Infinity - Devis',
    mimeType: 'application/vnd.google-apps.folder'
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Upload a PDF file to Drive
export async function uploadQuoteToDrive(
  pdfBuffer: Buffer,
  filename: string,
  dealName: string
): Promise<DriveFile> {
  const drive = await getUncachableGoogleDriveClient();
  const folderId = await getOrCreateQuotesFolder();

  // Convert Buffer to Readable stream
  const stream = new Readable();
  stream.push(pdfBuffer);
  stream.push(null);

  const fileMetadata = {
    name: filename,
    parents: [folderId],
    description: `Devis pour ${dealName} - Généré par IA Infinity`
  };

  const media = {
    mimeType: 'application/pdf',
    body: stream
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime'
  });

  // Make the file accessible via link
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  // Get updated file info with sharing link
  const updatedFile = await drive.files.get({
    fileId: file.data.id!,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime'
  });

  return {
    id: updatedFile.data.id!,
    name: updatedFile.data.name!,
    mimeType: updatedFile.data.mimeType!,
    webViewLink: updatedFile.data.webViewLink || undefined,
    webContentLink: updatedFile.data.webContentLink || undefined,
    createdTime: updatedFile.data.createdTime || undefined,
    modifiedTime: updatedFile.data.modifiedTime || undefined
  };
}

// List all quotes from the IA Infinity folder
export async function listQuotes(): Promise<DriveFile[]> {
  const drive = await getUncachableGoogleDriveClient();
  
  try {
    const folderId = await getOrCreateQuotesFolder();
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 50
    });

    return (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined
    }));
  } catch (error) {
    console.error('Error listing quotes:', error);
    return [];
  }
}

// Get download URL for a file
export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webContentLink'
  });

  if (!file.data.webContentLink) {
    throw new Error('Download link not available');
  }

  return file.data.webContentLink;
}

// Download file content as Buffer
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = await getUncachableGoogleDriveClient();
  
  const response = await drive.files.get({
    fileId: fileId,
    alt: 'media'
  }, {
    responseType: 'arraybuffer'
  });

  return Buffer.from(response.data as ArrayBuffer);
}

// Alias for downloadFile (used by contracts)
export const downloadFileFromDrive = downloadFile;

// Delete a file from Drive
export async function deleteFile(fileId: string): Promise<void> {
  const drive = await getUncachableGoogleDriveClient();
  await drive.files.delete({ fileId });
}

// Get Drive connection status (alias for testDriveConnection)
export async function getDriveStatus(): Promise<{ connected: boolean; email?: string; error?: string }> {
  return testDriveConnection();
}

// Get or create a generic folder
export async function getOrCreateFolder(folderName: string, parentFolderName?: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();

  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

// Upload any file to Drive (generic version)
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  folderName: string = 'IA Infinity - Devis'
): Promise<DriveFile> {
  const drive = await getUncachableGoogleDriveClient();
  const folderId = await getOrCreateFolder(folderName);

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const fileMetadata = {
    name: filename,
    parents: [folderId],
    description: `Généré par IA Infinity`
  };

  const media = {
    mimeType: mimeType,
    body: stream
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime'
  });

  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  const updatedFile = await drive.files.get({
    fileId: file.data.id!,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime'
  });

  return {
    id: updatedFile.data.id!,
    name: updatedFile.data.name!,
    mimeType: updatedFile.data.mimeType!,
    webViewLink: updatedFile.data.webViewLink || undefined,
    webContentLink: updatedFile.data.webContentLink || undefined,
    createdTime: updatedFile.data.createdTime || undefined,
    modifiedTime: updatedFile.data.modifiedTime || undefined
  };
}

// Convert PDF to Google Doc for editing
export async function convertToGoogleDoc(fileId: string): Promise<DriveFile> {
  const drive = await getUncachableGoogleDriveClient();
  
  // Get original file info
  const originalFile = await drive.files.get({
    fileId: fileId,
    fields: 'name'
  });

  // Copy and convert to Google Doc
  const copiedFile = await drive.files.copy({
    fileId: fileId,
    requestBody: {
      name: `${originalFile.data.name} (éditable)`,
      mimeType: 'application/vnd.google-apps.document'
    },
    fields: 'id, name, mimeType, webViewLink, createdTime, modifiedTime'
  });

  return {
    id: copiedFile.data.id!,
    name: copiedFile.data.name!,
    mimeType: copiedFile.data.mimeType!,
    webViewLink: copiedFile.data.webViewLink || undefined,
    createdTime: copiedFile.data.createdTime || undefined,
    modifiedTime: copiedFile.data.modifiedTime || undefined
  };
}
