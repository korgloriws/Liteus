import React, { createContext, useContext, useState, useEffect } from 'react';
import { carregarConfiguracoes, salvarConfiguracoes } from './theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modoEscuro, setModoEscuro] = useState(false);

  useEffect(() => {
    carregarConfiguracoes().then(setModoEscuro);
  }, []);

  // Agora o modo escuro é controlado apenas pelo usuário
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

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setDarkMode }}>
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