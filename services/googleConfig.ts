import Constants from 'expo-constants';

type Extra = {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
  googleIosClientId?: string;
};

function readExtra(): Extra {
  return (Constants.expoConfig?.extra || {}) as Extra;
}

/**
 * Client IDs do Google Cloud Console.
 * Prefira EXPO_PUBLIC_* no build; fallback para app.json extra.
 *
 * Produção multi-usuário: cada pessoa loga com a própria conta.
 * Em desenvolvimento (OAuth Testing), adicione e-mails de teste no Console.
 */
export const GoogleConfig = {
  get webClientId(): string {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      readExtra().googleWebClientId ||
      ''
    ).trim();
  },
  get androidClientId(): string {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      readExtra().googleAndroidClientId ||
      ''
    ).trim();
  },
  get iosClientId(): string {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      readExtra().googleIosClientId ||
      ''
    ).trim();
  },
  driveFolderName: 'Liteus',
  driveFileName: 'liteus_sync.json',
  driveScope: 'https://www.googleapis.com/auth/drive.file',
  isConfigured(): boolean {
    // No Android nativo o androidClientId é o principal;
    // webClientId ajuda na troca do code por token.
    return Boolean(this.androidClientId || this.webClientId);
  },
};
