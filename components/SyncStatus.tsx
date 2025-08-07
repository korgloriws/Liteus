import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { localSyncService } from '../services/localSyncService';
import { useTheme } from '../services/ThemeContext';

interface SyncStatusProps {
  onPress?: () => void;
}

export default function SyncStatus({ onPress }: SyncStatusProps) {
  const { colors, typography } = useTheme();
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); 
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const syncStatus = await localSyncService.getSyncStatus();
      setStatus(syncStatus);
      
      // Mostrar apenas se há mudanças pendentes ou se está offline
      setIsVisible(Boolean(syncStatus.pendingChanges) || !syncStatus.isOnline);
    } catch (error) {
      console.log('Erro ao verificar status de sync:', error);
    }
  };

  if (!isVisible || !status) return null;

  const getIcon = () => {
    if (status.pendingChanges) {
      return { name: 'sync', color: '#FF9500' };
    }
    if (!status.isOnline) {
      return { name: 'wifi-off', color: '#FF3B30' };
    }
    return { name: 'check-circle', color: '#34C759' };
  };

  const getMessage = () => {
    if (status.pendingChanges) {
      return 'Mudanças pendentes';
    }
    if (!status.isOnline) {
      return 'Offline';
    }
    return 'Sincronizado';
  };

  const icon = getIcon();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon.name as any} size={16} color={icon.color} />
      <Text style={[styles.text, { color: colors.textSecondary }, typography.caption]}>
        {getMessage()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 12,
    marginLeft: 4,
  },
}); 