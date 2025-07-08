import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

export default function ConfiguracoesScreen() {
  const { isDarkMode, setDarkMode } = useTheme();
  const [versao] = useState('1.0.2');
  const [listas, setListas] = useState<Lista[]>([]);

  useEffect(() => {
    carregarListas();
  }, []);

  const carregarListas = async () => {
    try {
      const listasCarregadas = await StorageService.carregarListas();
      setListas(listasCarregadas);
    } catch (error) {
      console.log('Erro ao carregar listas:', error);
    }
  };

  const handleModoEscuroChange = async (novoModoEscuro: boolean) => {
    await setDarkMode(novoModoEscuro);
  };

  const exportarTodasListas = async () => {
    if (listas.length === 0) {
      Alert.alert('Aviso', 'Não há listas para exportar');
      return;
    }

    try {
      const dados = {
        listas,
        exportadoEm: new Date().toISOString(),
        versao: '1.0',
      };

      const jsonString = JSON.stringify(dados, null, 2);
      Alert.alert(
        'Dados para Exportação',
        'Copie os dados abaixo e salve em um arquivo .json:',
        [
          { text: 'OK' }
        ]
      );
      console.log('Dados para exportação:', jsonString);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar as listas');
    }
  };

  const limparDados = async () => {
    Alert.alert(
      'Limpar Dados',
      'Tem certeza que deseja limpar todos os dados do app? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setListas([]);
              Alert.alert('Sucesso', 'Todos os dados foram limpos');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível limpar os dados');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Cabeçalho Customizado */}
      <View style={[styles.customHeader, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header do App */}
          <View style={styles.header}>
            <MaterialIcons name="casino" size={48} color="#007AFF" />
            <Text style={[styles.appName, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Liteus</Text>
            <Text style={[styles.appSlogan, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>Listas Inteligentes</Text>
          </View>

        {/* Seção de Aparência */}
        <View style={[styles.section, { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
        }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Aparência</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="dark-mode" size={24} color="#007AFF" />
              <Text style={[styles.optionText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleModoEscuroChange}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={isDarkMode ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* Seção de Dados */}
        <View style={[styles.section, { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
        }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Dados</Text>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/estatisticas')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="analytics" size={24} color="#007AFF" />
              <Text style={[styles.optionText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Estatísticas</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionItem} onPress={exportarTodasListas}>
            
          </TouchableOpacity>
        </View>

        {/* Seção de Informações */}
        <View style={[styles.section, { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
        }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Informações</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="info" size={24} color="#007AFF" />
              <Text style={[styles.optionText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Versão</Text>
            </View>
            <Text style={[styles.optionValue, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>{versao}</Text>
          </View>

          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="code" size={24} color="#007AFF" />
              <Text style={[styles.optionText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Desenvolvedor</Text>
            </View>
            <Text style={[styles.optionValue, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>Mateus Rodrigues</Text>
          </View>
        </View>

        {/* Seção de Recursos */}
        <View style={[styles.section, { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
        }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Recursos</Text>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="list" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Criação de listas personalizadas</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="casino" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Seleção aleatória com animações</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="cloud-download" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Exportação e importação de dados</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="palette" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Temas e cores personalizáveis</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
            © 2025 Liteus - Listas Inteligentes
          </Text>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
  appSlogan: {
    fontSize: 16,
    marginTop: 5,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  optionValue: {
    fontSize: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },

  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
}); 