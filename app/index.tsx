import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Lista } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

export default function ListasScreen() {
  const { isDarkMode } = useTheme();
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarListas();
  }, []);

  const carregarListas = async () => {
    try {
      setLoading(true);
      const listasCarregadas = await StorageService.carregarListas();
      setListas(listasCarregadas);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as listas');
    } finally {
      setLoading(false);
    }
  };

  const removerLista = async (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerLista(id);
              await carregarListas();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a lista');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Lista }) => (
    <TouchableOpacity
      style={[styles.listaItem, { 
        borderLeftColor: item.cor || '#007AFF',
        backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
      }]}
      onPress={() => router.push({
        pathname: '/lista-detalhes',
        params: { id: item.id }
      })}
    >
      <View style={styles.listaInfo}>
        <Text style={[styles.listaNome, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>{item.nome}</Text>
        {item.descricao && (
          <Text style={[styles.listaDescricao, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>{item.descricao}</Text>
        )}
        <Text style={[styles.listaItens, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
          {item.itens.length} item{item.itens.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.listaAcoes}>
        {item.permiteSelecaoAleatoria && (
          <TouchableOpacity
            style={[styles.btnAleatorio, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
            onPress={() => router.push({
              pathname: '/selecao-aleatoria',
              params: { id: item.id }
            })}
          >
            <MaterialIcons name="casino" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.btnExcluir}
          onPress={() => removerLista(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
        borderBottomColor: isDarkMode ? '#38383A' : '#E5E5EA'
      }]}>
        <View style={styles.headerContent}>
          <MaterialIcons name="casino" size={32} color="#007AFF" />
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Liteus</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>Listas Inteligentes</Text>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        {listas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="list" size={64} color="#C7C7CC" />
            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Nenhuma lista criada</Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
              Crie sua primeira lista para começar
            </Text>
            <TouchableOpacity
              style={styles.btnCriarPrimeira}
              onPress={() => router.push('/criar-lista')}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.btnCriarPrimeiraText}>Criar Primeira Lista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.contentHeader}>
              <Text style={[styles.contentTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                Suas Listas ({listas.length})
              </Text>
              <TouchableOpacity
                style={[styles.btnAdicionar, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={() => router.push('/criar-lista')}
              >
                <MaterialIcons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={listas}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    marginLeft: 44,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  btnAdicionar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listaItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listaInfo: {
    flex: 1,
  },
  listaNome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  listaDescricao: {
    fontSize: 14,
    marginBottom: 4,
  },
  listaItens: {
    fontSize: 12,
  },
  listaAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnAleatorio: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  btnExcluir: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  btnCriarPrimeira: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  btnCriarPrimeiraText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
}); 