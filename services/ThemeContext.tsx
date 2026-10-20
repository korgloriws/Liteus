import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, useColorScheme } from 'react-native';
import {
  carregarPreferenciaTema,
  salvarPreferenciaTema,
  getThemeColors,
  typography,
  resolveIsDarkMode,
  type ThemePreference,
} from './theme';

interface ThemeContextType {
  isDarkMode: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  colors: ReturnType<typeof getThemeColors>;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [, setScheduleTick] = useState(0);

  useEffect(() => {
    carregarPreferenciaTema().then(setThemePreferenceState);
  }, []);

  // Reavalia o horário a cada minuto e ao voltar pro app
  useEffect(() => {
    if (themePreference !== 'schedule') return;

    const bump = () => setScheduleTick((n) => n + 1);
    const interval = setInterval(bump, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') bump();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [themePreference]);

  const isDarkMode = resolveIsDarkMode(themePreference, systemScheme);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await salvarPreferenciaTema(preference);
  }, []);

  const setDarkMode = async (enabled: boolean) => {
    await setThemePreference(enabled ? 'dark' : 'light');
  };

  const toggleTheme = async () => {
    await setThemePreference(isDarkMode ? 'light' : 'dark');
  };

  const themeColors = getThemeColors(isDarkMode);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        themePreference,
        setThemePreference,
        toggleTheme,
        setDarkMode,
        colors: themeColors,
        typography,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
