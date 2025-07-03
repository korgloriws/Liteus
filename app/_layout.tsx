import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../services/ThemeContext';

function TabLayoutContent() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDarkMode ? '#0A84FF' : '#007AFF',
        tabBarInactiveTintColor: isDarkMode ? '#8E8E93' : '#8E8E93',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
          borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
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
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-box" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Configurações',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
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
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <TabLayoutContent />
    </ThemeProvider>
  );
} 