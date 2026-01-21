import React, { createContext, useContext, useState, useEffect } from 'react';
import { carregarConfiguracoes, salvarConfiguracoes, getThemeColors, typography } from './theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  colors: ReturnType<typeof getThemeColors>;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modoEscuro, setModoEscuro] = useState(false);

  useEffect(() => {
    carregarConfiguracoes().then(setModoEscuro);
  }, []);


  const isDarkMode = modoEscuro;

  const toggleTheme = async () => {
    const novoModo = !modoEscuro;
    setModoEscuro(novoModo);
    await salvarConfiguracoes(novoModo);
  };

  const setDarkMode = async (enabled: boolean) => {
    setModoEscuro(enabled);
    await salvarConfiguracoes(enabled);
  };

  const themeColors = getThemeColors(isDarkMode);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      setDarkMode, 
      colors: themeColors,
      typography 
    }}>
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