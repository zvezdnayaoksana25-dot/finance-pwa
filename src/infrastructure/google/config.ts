export const GOOGLE_SHEETS_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';

export function googleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('Google OAuth не настроен: задайте VITE_GOOGLE_CLIENT_ID');
  return clientId;
}
