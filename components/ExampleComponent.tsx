import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../services/ThemeContext';

export default function ExampleComponent() {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Título principal usando Righteous */}
      <Text style={[styles.title, { color: colors.text }, typography.titleLarge]}>
        Título Principal
      </Text>
      
      {/* Subtítulo usando Noto Sans */}
      <Text style={[styles.subtitle, { color: colors.textSecondary }, typography.subtitle]}>
        Este é um subtítulo usando Noto Sans
      </Text>
      
      {/* Texto do corpo */}
      <Text style={[styles.bodyText, { color: colors.text }, typography.body]}>
        Este é um exemplo de texto do corpo usando Noto Sans Regular.
      </Text>
      
      {/* Texto em negrito */}
      <Text style={[styles.boldText, { color: colors.text }, typography.bodyBold]}>
        Este texto está em negrito usando Noto Sans Bold.
      </Text>
      
      {/* Botão primário */}
      <TouchableOpacity 
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={() => console.log('Botão primário pressionado')}
      >
        <Text style={[styles.buttonText, { color: colors.white }, typography.button]}>
          Botão Primário
        </Text>
      </TouchableOpacity>
      
      {/* Botão secundário */}
      <TouchableOpacity 
        style={[styles.secondaryButton, { backgroundColor: colors.accent }]}
        onPress={() => console.log('Botão secundário pressionado')}
      >
        <Text style={[styles.buttonText, { color: colors.text }, typography.button]}>
          Botão Secundário
        </Text>
      </TouchableOpacity>
      
      {/* Card de exemplo */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }, typography.titleMedium]}>
          Card de Exemplo
        </Text>
        <Text style={[styles.cardText, { color: colors.textSecondary }, typography.body]}>
          Este é um exemplo de card usando as novas cores e tipografias do sistema.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  bodyText: {
    marginBottom: 12,
  },
  boldText: {
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardText: {
    lineHeight: 20,
  },
}); 