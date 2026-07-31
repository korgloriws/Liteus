import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleConfig } from '../services/googleConfig';
import {
  googleAuthService,
  GoogleSession,
} from '../services/googleAuthService';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configured = GoogleConfig.isConfigured();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GoogleConfig.androidClientId || undefined,
    iosClientId: GoogleConfig.iosClientId || undefined,
    webClientId: GoogleConfig.webClientId || undefined,
    scopes: [
      'openid',
      'profile',
      'email',
      GoogleConfig.driveScope,
    ],
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

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

  useEffect(() => {
    const handleResponse = async () => {
      if (!response) return;

      if (response.type === 'error') {
        setError(response.error?.message || 'Falha no login Google');
        setConnecting(false);
        return;
      }

      if (response.type === 'dismiss' || response.type === 'cancel') {
        setConnecting(false);
        return;
      }

      if (response.type === 'success') {
        try {
          const auth = response.authentication;
          const saved = await googleAuthService.persistAuthResult({
            accessToken: auth?.accessToken,
            refreshToken: auth?.refreshToken,
            expiresIn: auth?.expiresIn,
            idToken: auth?.idToken,
          });
          setSession(saved);
          setError(null);
        } catch (e: any) {
          setError(e?.message || 'Não foi possível salvar a sessão Google');
        } finally {
          setConnecting(false);
        }
      }
    };

    handleResponse();
  }, [response]);

  const connect = useCallback(async () => {
    setError(null);

    if (!configured) {
      setError(
        'Client IDs do Google não configurados. Defina EXPO_PUBLIC_GOOGLE_* ou app.json extra.'
      );
      return;
    }

    if (!request) {
      setError('Login Google ainda não está pronto. Tente novamente.');
      return;
    }

    try {
      setConnecting(true);
      await promptAsync();
    } catch (e: any) {
      setConnecting(false);
      setError(e?.message || 'Falha ao abrir login Google');
    }
  }, [configured, promptAsync, request]);

  const disconnect = useCallback(async () => {
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
    ready: Boolean(request),
    platform: Platform.OS,
    connect,
    disconnect,
    setAutoSyncEnabled,
    refreshLocalState,
  };
}
