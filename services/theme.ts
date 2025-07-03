import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const carregarConfiguracoes = async () => {
  try {
    const config = await AsyncStorage.getItem('configuracoes');
    if (config) {
      const { modoEscuro } = JSON.parse(config);
      return modoEscuro || false;
    }
    return false;
  } catch (error) {
    console.log('Erro ao carregar configurações:', error);
    return false;
  }
};

export const salvarConfiguracoes = async (modoEscuro: boolean) => {
  try {
    await AsyncStorage.setItem('configuracoes', JSON.stringify({
      modoEscuro,
    }));
  } catch (error) {
    console.log('Erro ao salvar configurações:', error);
  }
};

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  
  const isDarkMode = (modoEscuro: boolean) => {
    return modoEscuro || systemColorScheme === 'dark';
  };

  return {
    isDarkMode,
    systemColorScheme,
  };
}; 