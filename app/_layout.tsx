import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../services/ThemeContext';
import AuthGate from '../components/AuthGate';
import { useFonts } from 'expo-font';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import { View } from 'react-native';

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
          title: 'Lista',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="criar-lista"
        options={{
          title: 'Criar Lista',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-box" size={size} color={color} />
          ),
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

  if (!fontsLoaded) {
    return <View />;
  }

  return (
    <ThemeProvider>
      <TabLayoutContent />
    </ThemeProvider>
  );
} 