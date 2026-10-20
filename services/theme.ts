import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system' | 'schedule';

export const THEME_SCHEDULE = {
  /** A partir desta hora (inclusive) → claro */
  lightFromHour: 6,
  /** A partir desta hora (inclusive) → escuro */
  darkFromHour: 18,
} as const;

export const colors = {
  primary: '#8b3b08',
  secondary: '#e59e2c',
  tertiary: '#2f4366',
  background: '#ecddc6',
  accent: '#f3d58d',
  white: '#ffffff',

  dark: {
    primary: '#e59e2c',
    secondary: '#f9f9f9',
    tertiary: '#8b3b08',
    background: '#000000',
    accent: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#f3d58d',
    surface: '#2f4366',
    border: '#f3d58d',
    white: '#ffffff',
  },

  light: {
    primary: '#000',
    secondary: '#2f4366',
    tertiary: '#2f4366',
    background: '#fff',
    accent: '#ffffff',
    text: '#2f4366',
    textSecondary: '#2f4366',
    surface: '#f8f8f8',
    border: '#b1b1b1',
    white: '#ffffff',
  },
};

export const typography = {
  title: {
    fontFamily: 'Righteous_400Regular',
    fontSize: 24,
    fontWeight: '400' as const,
  },
  titleLarge: {
    fontFamily: 'Righteous_400Regular',
    fontSize: 32,
    fontWeight: '400' as const,
  },
  titleMedium: {
    fontFamily: 'Righteous_400Regular',
    fontSize: 20,
    fontWeight: '400' as const,
  },
  subtitle: {
    fontFamily: 'NotoSans_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
  },
  subtitleBold: {
    fontFamily: 'NotoSans_700Bold',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: 'NotoSans_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontFamily: 'NotoSans_700Bold',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  caption: {
    fontFamily: 'NotoSans_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
  },
  button: {
    fontFamily: 'NotoSans_700Bold',
    fontSize: 16,
    fontWeight: '700' as const,
  },
};

export const getThemeColors = (isDarkMode: boolean) => {
  return isDarkMode ? colors.dark : colors.light;
};

/** Claro das 6h às 17h59; escuro das 18h às 5h59 (horário do aparelho). */
export function isDarkBySchedule(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour < THEME_SCHEDULE.lightFromHour || hour >= THEME_SCHEDULE.darkFromHour;
}

export function resolveIsDarkMode(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined
): boolean {
  switch (preference) {
    case 'light':
      return false;
    case 'dark':
      return true;
    case 'schedule':
      return isDarkBySchedule();
    case 'system':
    default:
      return systemScheme === 'dark';
  }
}

function isValidPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' || value === 'schedule';
}

export const carregarPreferenciaTema = async (): Promise<ThemePreference> => {
  try {
    const raw = await AsyncStorage.getItem('configuracoes');
    if (!raw) return 'system';
    const parsed = JSON.parse(raw);
    if (isValidPreference(parsed.themePreference)) {
      return parsed.themePreference;
    }
    // Migração do switch antigo
    if (typeof parsed.modoEscuro === 'boolean') {
      return parsed.modoEscuro ? 'dark' : 'light';
    }
    return 'system';
  } catch (error) {
    console.log('Erro ao carregar preferência de tema:', error);
    return 'system';
  }
};

/** @deprecated use carregarPreferenciaTema */
export const carregarConfiguracoes = async () => {
  const pref = await carregarPreferenciaTema();
  return resolveIsDarkMode(pref, null);
};

export const salvarPreferenciaTema = async (themePreference: ThemePreference) => {
  try {
    const raw = await AsyncStorage.getItem('configuracoes');
    const prev = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(
      'configuracoes',
      JSON.stringify({
        ...prev,
        themePreference,
        // Mantém legacy coerente com modo manual
        modoEscuro: themePreference === 'dark',
      })
    );
  } catch (error) {
    console.log('Erro ao salvar preferência de tema:', error);
  }
};

/** @deprecated use salvarPreferenciaTema */
export const salvarConfiguracoes = async (modoEscuro: boolean) => {
  await salvarPreferenciaTema(modoEscuro ? 'dark' : 'light');
};

export const isDarkModeActive = (modoEscuro: boolean) => {
  return modoEscuro;
};

export function getPlaceholderColor(isDarkMode: boolean) {
  return isDarkMode ? '#E5E5EA' : '#8E8E93';
}
