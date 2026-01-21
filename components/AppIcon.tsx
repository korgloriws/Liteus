import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface AppIconProps {
  size?: number;
  showBackground?: boolean;
}

export default function AppIcon({ size = 512, showBackground = true }: AppIconProps) {
  const iconSize = size * 0.6; // 60% do tamanho total para padding
  const padding = (size - iconSize) / 2;

  return (
    <View style={[
      styles.container, 
      { 
        width: size, 
        height: size,
        backgroundColor: showBackground ? '#2f4366' : 'transparent',
        borderRadius: size * 0.2, // 20% de border radius para Android
        padding: padding
      }
    ]}>
      <Image
        source={require('../assets/logoCaneca.png')}
        style={[styles.icon, { width: iconSize, height: iconSize }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  icon: {
    tintColor: '#FFFFFF', // Garante que o ícone seja branco
  },
}); 