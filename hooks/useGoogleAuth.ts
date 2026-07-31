import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleConfig } from '../services/googleConfig';
import {
  googleAuthService,
  GoogleSession,
} from '../services/googleAuthService';

/** Expo Go não tem o módulo nativo — a tela de Configurações deve continuar funcionando. */
const isExpoGo = Constants.appOwnership === 'expo';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let nativeModule: GoogleSignInModule | null | undefined;
let nativeConfigured = false;

function loadNativeModule(): GoogleSignInModule | null {
  if (isExpoGo) return null;
  if (nativeModule !== undefined) return nativeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    return nativeModule;
  } catch {
    nativeModule = null;
    return null;
  }
}

function ensureNativeConfigured(mod: GoogleSignInModule) {
  if (nativeConfigured) return;
  if (!GoogleConfig.webClientId) {
    throw new Error('googleWebClientId não configurado');
  }

  mod.GoogleSignin.configure({
    webClientId: GoogleConfig.webClientId,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    scopes: [
      'openid',
      'profile',
      'email',
      GoogleConfig.driveScope,
    ],
  });
  nativeConfigured = true;
}

function mapNativeError(error: unknown, mod: GoogleSignInModule | null): string {
  if (mod && mod.isErrorWithCode(error)) {
    switch (error.code) {
      case mod.statusCodes.SIGN_IN_CANCELLED:
        return 'Login cancelado';
      case mod.statusCodes.IN_PROGRESS:
        return 'Login já em andamento';
      case mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services indisponível neste aparelho';
      case '10':
      case 'DEVELOPER_ERROR':
        return (
          'DEVELOPER_ERROR: SHA-1 do APK diferente do Google Cloud. ' +
          'No Client OAuth Android use package com.liteus.app e SHA-1: ' +
          '6C:BC:28:13:88:20:25:79:DE:76:8C:0F:86:C1:F8:19:10:2E:4E:3A ' +
          '(depois instale o APK novo assinado com o keystore do repositório).'
        );
      default:
        return error.message || `Erro Google (${error.code})`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Falha ao conectar com Google';
}

export function useGoogleAuth() {
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nativeAvailable = !isExpoGo && Boolean(loadNativeModule());
  const configured =
    GoogleConfig.isConfigured() && Boolean(GoogleConfig.webClientId);

  const refreshLocalState = useCallback(async () => {
    const [stored, auto] = await Promise.all([
      googleAuthService.loadSession(),
      googleAuthService.getAutoSyncEnabled(),
    ]);
    setSession(stored);
    setAutoSync(auto);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshLocalState().catch(() => setLoading(false));
  }, [refreshLocalState]);

  const connect = useCallback(async () => {
    setError(null);

    if (isExpoGo) {
      setError(
        'Login Google funciona no APK nativo (GitHub Actions). No Expo Go a tela permanece, mas o login nativo não está disponível.'
      );
      return;
    }

    if (!configured) {
      setError(
        'Client IDs do Google não configurados. Defina googleWebClientId / googleAndroidClientId.'
      );
      return;
    }

    const mod = loadNativeModule();
    if (!mod) {
      setError('Módulo Google Sign-In não disponível neste build.');
      return;
    }

    try {
      setConnecting(true);
      ensureNativeConfigured(mod);

      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await mod.GoogleSignin.signIn();

      if (!mod.isSuccessResponse(response)) {
        setConnecting(false);
        return;
      }

      const tokens = await mod.GoogleSignin.getTokens();
      const user = response.data.user;

      const saved = await googleAuthService.persistAuthResult({
        accessToken: tokens.accessToken,
        refreshToken: null,
        expiresIn: 3500,
        idToken: tokens.idToken || response.data.idToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          picture: user.photo || undefined,
        },
      });

      setSession(saved);
      setError(null);
    } catch (e) {
      setError(mapNativeError(e, mod));
    } finally {
      setConnecting(false);
    }
  }, [configured]);

  const disconnect = useCallback(async () => {
    const mod = loadNativeModule();
    try {
      if (mod) {
        ensureNativeConfigured(mod);
        await mod.GoogleSignin.signOut();
      }
    } catch {
      // ignora falha de signOut nativo
    }
    await googleAuthService.clearSession();
    setSession(null);
  }, []);

  const setAutoSyncEnabled = useCallback(async (enabled: boolean) => {
    await googleAuthService.setAutoSyncEnabled(enabled);
    setAutoSync(enabled);
  }, []);

  return {
    session,
    loading,
    connecting,
    autoSync,
    error,
    configured,
    nativeAvailable,
    isExpoGo,
    ready: configured,
    platform: Platform.OS,
    connect,
    disconnect,
    setAutoSyncEnabled,
    refreshLocalState,
  };
}
