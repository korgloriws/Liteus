import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../services/ThemeContext';
import AuthGate from '../components/AuthGate';
import SplashScreen from '../components/SplashScreen';
import { useFonts } from 'expo-font';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import { View } from 'react-native';
import { useState } from 'react';

function TabLayoutContent() {
  const { isDarkMode, colors } = useTheme();

  return (
    <AuthGate>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Listas',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notas"
        options={{
          title: 'Notas',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="description" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="criar-lista"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Configurações',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="seguranca"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lista-detalhes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="selecao-aleatoria"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="estatisticas"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="nota-detalhes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lixeira"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </AuthGate>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    Righteous_400Regular,
    NotoSans_400Regular,
    NotoSans_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  if (!fontsLoaded) {
    return <View />;
  }

  if (showSplash) {
    return (
      <SplashScreen onFinish={() => setShowSplash(false)} />
    );
  }

  return (
    <ThemeProvider>
      <TabLayoutContent />
    </ThemeProvider>
  );
} 