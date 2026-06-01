/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Request the Google Drive Scope that the user authorized
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initGoogleOAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in popup to acquire access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được mã Access Token từ xác thực Google!');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// =======================================================
// GOOGLE DRIVE API INTEGRATIONS REST CLIENT
// =======================================================

// 1. UPLOAD BACKUP TO GOOGLE DRIVE
export const uploadBackupToDrive = async (
  accessToken: string,
  backupData: any,
  filename: string = `mrkien_erp_backup_${new Date().toISOString().split('T')[0]}.json`
): Promise<any> => {
  const boundary = 'foo_bar_baz_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: 'Bản sao lưu dữ liệu quản lý kho Mr Kiên ERP chính thức'
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Upload Error: ${response.statusText} (${errText})`);
  }

  return response.json();
};

// 2. LIST ALL BACKUP FILES FROM GOOGLE DRIVE
export const listBackupsFromDrive = async (accessToken: string): Promise<any[]> => {
  // Search for JSON files that contain 'mrkien_erp_backup' in the name
  const query = "mimeType = 'application/json' and name contains 'mrkien_erp_backup' and trashed = false";
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,mimeType,size,createdTime)&pageSize=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google List Error: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  return data.files || [];
};

// 3. DOWNLOAD BACKUP FILE CONTENT FROM GOOGLE DRIVE
export const downloadBackupFromDrive = async (accessToken: string, fileId: string): Promise<any> => {
  // By default Google Drive files are downloaded via GET /files/{fileId}?alt=media
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Download Error: ${response.statusText} (${errText})`);
  }

  return response.json();
};

// 4. DELETE A FILE FROM GOOGLE DRIVE
export const deleteFileFromDrive = async (accessToken: string, fileId: string): Promise<void> => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Delete Error: ${response.statusText} (${errText})`);
  }
};
