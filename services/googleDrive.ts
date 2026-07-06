import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

let cachedDriveToken: string | null = null;

export const getCachedDriveToken = (): string | null => {
  return cachedDriveToken;
};

export const clearCachedDriveToken = (): void => {
  cachedDriveToken = null;
};

export const requestDriveToken = async (): Promise<string | null> => {
  try {
    const provider = new GoogleAuthProvider();
    // Scope configuration for Workspace APIs
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/drive');
    
    provider.setCustomParameters({
      prompt: 'consent'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible de récupérer le jeton d'accès Google Drive.");
    }
    cachedDriveToken = credential.accessToken;
    return cachedDriveToken;
  } catch (error) {
    console.error("Erreur lors de l'authentification Drive:", error);
    throw error;
  }
};

export const base64ToBlob = (base64: string): Blob => {
  try {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (error) {
    console.error("Error converting base64 to blob:", error);
    // fallback empty blob
    return new Blob([], { type: 'application/octet-stream' });
  }
};

const searchFolder = async (token: string, name: string, parentId?: string): Promise<string | null> => {
  let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!response.ok) {
      if (response.status === 401) clearCachedDriveToken();
      throw new Error(`Failed to search folder: ${await response.text()}`);
    }
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  } catch (error) {
    console.error("Error in searchFolder:", error);
    throw error;
  }
};

const createFolder = async (token: string, name: string, parentId?: string): Promise<string> => {
  const existingId = await searchFolder(token, name, parentId);
  if (existingId) return existingId;

  const metadata: Record<string, any> = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );
    if (!response.ok) {
      if (response.status === 401) clearCachedDriveToken();
      throw new Error(`Failed to create folder: ${await response.text()}`);
    }
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error in createFolder:", error);
    throw error;
  }
};

const uploadFile = async (
  token: string,
  fileName: string,
  mimeType: string,
  fileBody: Blob,
  parentId?: string
): Promise<{ id: string; webViewLink: string }> => {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: parentId ? [parentId] : []
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBody);

  try {
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      }
    );

    if (!response.ok) {
      if (response.status === 401) clearCachedDriveToken();
      throw new Error(`Failed to upload file: ${await response.text()}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error in uploadFile:", error);
    throw error;
  }
};

export const syncInvoiceToDrive = async (
  token: string,
  invoice: any,
  pdfBlobOrBase64: Blob | string,
  type: 'sale' | 'purchase'
): Promise<{ fileUrl: string; folderUrl: string }> => {
  // 1. Create or Find App Root Folder: "HiveFive_ERP_Documents"
  const rootFolderId = await createFolder(token, "HiveFive_ERP_Documents");

  // 2. Create or Find Subfolder: "Ventes" or "Achats"
  const typeFolderId = await createFolder(token, type === 'sale' ? "Ventes" : "Achats", rootFolderId);

  // 3. Create or Find Date Folder: e.g. "2026-05"
  const dateStr = invoice.date ? invoice.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const dateFolderId = await createFolder(token, dateStr, typeFolderId);

  // 4. Determine file metadata and prepare file body
  let fileName = "";
  let mimeType = "";
  let fileBody: Blob;

  if (type === 'sale') {
    fileName = `${invoice.documentType === 'devis' ? 'Devis' : invoice.documentType === 'recu' ? 'Recu' : 'Facture'}_${invoice.number || invoice.id}.pdf`;
    mimeType = 'application/pdf';
    fileBody = pdfBlobOrBase64 as Blob;
  } else {
    // Scanned purchases
    const vendorNameClean = (invoice.vendor || 'Fournisseur').replace(/[^a-zA-Z0-9]/g, '_');
    fileName = `Scan_Achat_${vendorNameClean}_${invoice.ref || invoice.id}.jpeg`;
    
    if (typeof pdfBlobOrBase64 === 'string' && pdfBlobOrBase64.startsWith('data:')) {
      mimeType = pdfBlobOrBase64.split(';base64,')[0].split(':')[1];
      fileBody = base64ToBlob(pdfBlobOrBase64);
      
      if (mimeType.includes('pdf')) {
        fileName = `Scan_Achat_${vendorNameClean}_${invoice.ref || invoice.id}.pdf`;
      } else if (mimeType.includes('png')) {
        fileName = `Scan_Achat_${vendorNameClean}_${invoice.ref || invoice.id}.png`;
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        fileName = `Scan_Achat_${vendorNameClean}_${invoice.ref || invoice.id}.jpg`;
      }
    } else {
      mimeType = 'image/jpeg';
      fileBody = pdfBlobOrBase64 as Blob;
    }
  }

  // 5. Upload File
  const fileData = await uploadFile(token, fileName, mimeType, fileBody, dateFolderId);

  // Retrieve folder view link
  const folderLink = `https://drive.google.com/drive/folders/${dateFolderId}`;

  return {
    fileUrl: fileData.webViewLink,
    folderUrl: folderLink
  };
};
