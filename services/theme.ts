import AsyncStorage from '@react-native-async-storage/async-storage';


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
  }
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
  }
};


export const getThemeColors = (isDarkMode: boolean) => {
  return isDarkMode ? colors.dark : colors.light;
};

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


export const isDarkModeActive = (modoEscuro: boolean) => {
  return modoEscuro;
}; 

export function getPlaceholderColor(isDarkMode: boolean) {
  return isDarkMode ? '#E5E5EA' : '#8E8E93';
} 