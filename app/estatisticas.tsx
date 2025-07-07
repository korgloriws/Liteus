import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Lista, Item } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

interface EstatisticasGerais {
  totalListas: number;
  totalItens: number;
  listasComCategorias: number;
  listasComSelecaoAleatoria: number;
  itemMaisLongo: Item | null;
  itemMaisCurto: Item | null;
  categoriaMaisUsada: { nome: string; quantidade: number } | null;
  listaMaisAntiga: Lista | null;
  listaMaisRecente: Lista | null;
  mediaItensPorLista: number;
}

export default function EstatisticasScreen() {
  const { isDarkMode } = useTheme();
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      carregarEstatisticas();
    }, [])
  );

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);
      const todasListas = await StorageService.buscarTodasListas();
      setListas(todasListas);
      
      // Calcular estatísticas
      const stats = calcularEstatisticas(todasListas);
      setEstatisticas(stats);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (listas: Lista[]): EstatisticasGerais => {
    if (listas.length === 0) {
      return {
        totalListas: 0,
        totalItens: 0,
        listasComCategorias: 0,
        listasComSelecaoAleatoria: 0,
        itemMaisLongo: null,
        itemMaisCurto: null,
        categoriaMaisUsada: null,
        listaMaisAntiga: null,
        listaMaisRecente: null,
        mediaItensPorLista: 0,
      };
    }

    // Calcular totais
    const totalItens = listas.reduce((acc, lista) => acc + lista.itens.length, 0);
    const listasComCategorias = listas.filter(lista => lista.categorias.length > 0).length;
    const listasComSelecaoAleatoria = listas.filter(lista => lista.permiteSelecaoAleatoria).length;

    // Encontrar item mais longo e mais curto
    let itemMaisLongo: Item | null = null;
    let itemMaisCurto: Item | null = null;
    let maxLength = 0;
    let minLength = Infinity;

    listas.forEach(lista => {
      lista.itens.forEach(item => {
        if (item.texto.length > maxLength) {
          maxLength = item.texto.length;
          itemMaisLongo = item;
        }
        if (item.texto.length < minLength) {
          minLength = item.texto.length;
          itemMaisCurto = item;
        }
      });
    });

    // Encontrar categoria mais usada
    const categoriasCount: { [key: string]: number } = {};
    listas.forEach(lista => {
      lista.itens.forEach(item => {
        if (item.categoria) {
          const categoria = lista.categorias.find(cat => cat.id === item.categoria);
          if (categoria) {
            categoriasCount[categoria.nome] = (categoriasCount[categoria.nome] || 0) + 1;
          }
        }
      });
    });

    let categoriaMaisUsada = null;
    let maxCategoriaCount = 0;
    Object.entries(categoriasCount).forEach(([nome, quantidade]) => {
      if (quantidade > maxCategoriaCount) {
        maxCategoriaCount = quantidade;
        categoriaMaisUsada = { nome, quantidade };
      }
    });

    // Encontrar lista mais antiga e mais recente
    const listasOrdenadas = [...listas].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const listaMaisAntiga = listasOrdenadas[0];
    const listaMaisRecente = listasOrdenadas[listasOrdenadas.length - 1];

    return {
      totalListas: listas.length,
      totalItens,
      listasComCategorias,
      listasComSelecaoAleatoria,
      itemMaisLongo,
      itemMaisCurto,
      categoriaMaisUsada,
      listaMaisAntiga,
      listaMaisRecente,
      mediaItensPorLista: Math.round(totalItens / listas.length * 10) / 10,
    };
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatarTempoDecorrido = (data: string) => {
    const agora = new Date();
    const dataCriacao = new Date(data);
    const diffMs = agora.getTime() - dataCriacao.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    if (diffDias < 30) return `${Math.floor(diffDias / 7)} semanas atrás`;
    if (diffDias < 365) return `${Math.floor(diffDias / 30)} meses atrás`;
    return `${Math.floor(diffDias / 365)} anos atrás`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={48} color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
            Carregando estatísticas...
          </Text>
        </View>
      </View>
    );
  }

  if (!estatisticas) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="analytics" size={64} color="#C7C7CC" />
          <Text style={[styles.emptyTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Nenhuma estatística disponível
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
            Crie algumas listas para ver estatísticas interessantes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#1c1c1e'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitulo, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Estatísticas
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
            Visão geral das suas listas
          </Text>
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumo Geral */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Resumo Geral
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="list" size={24} color="#007AFF" />
              <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                {estatisticas.totalListas}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                Listas
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="check-circle" size={24} color="#34C759" />
              <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                {estatisticas.totalItens}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                Itens
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="category" size={24} color="#AF52DE" />
              <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                {estatisticas.listasComCategorias}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                Com Categorias
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="casino" size={24} color="#FF9500" />
              <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                {estatisticas.listasComSelecaoAleatoria}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                Com Seleção Aleatória
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
            <MaterialIcons name="analytics" size={24} color="#5856D6" />
            <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
              {estatisticas.mediaItensPorLista}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
              Média de Itens por Lista
            </Text>
          </View>
        </View>

        {/* Estatísticas Detalhadas */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Estatísticas Detalhadas
          </Text>

          {/* Lista Mais Antiga */}
          {estatisticas.listaMaisAntiga && (
            <View style={[styles.detailCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="schedule" size={20} color="#FF3B30" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Lista Mais Antiga
                </Text>
                <Text style={[styles.detailValue, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {estatisticas.listaMaisAntiga.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
                  Criada em {formatarData(estatisticas.listaMaisAntiga.createdAt)} 
                  ({formatarTempoDecorrido(estatisticas.listaMaisAntiga.createdAt)})
                </Text>
              </View>
            </View>
          )}

          {/* Lista Mais Recente */}
          {estatisticas.listaMaisRecente && (
            <View style={[styles.detailCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="new-releases" size={20} color="#34C759" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Lista Mais Recente
                </Text>
                <Text style={[styles.detailValue, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {estatisticas.listaMaisRecente.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
                  Criada em {formatarData(estatisticas.listaMaisRecente.createdAt)} 
                  ({formatarTempoDecorrido(estatisticas.listaMaisRecente.createdAt)})
                </Text>
              </View>
            </View>
          )}

          {/* Item Mais Longo */}
          {estatisticas.itemMaisLongo && (
            <View style={[styles.detailCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="text-fields" size={20} color="#007AFF" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Item Mais Longo
                </Text>
                <Text style={[styles.detailValue, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {estatisticas.itemMaisLongo.texto}
                </Text>
                <Text style={[styles.detailSubtitle, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
                  {estatisticas.itemMaisLongo.texto.length} caracteres
                </Text>
              </View>
            </View>
          )}

          {/* Item Mais Curto */}
          {estatisticas.itemMaisCurto && (
            <View style={[styles.detailCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="text-fields" size={20} color="#FF9500" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Item Mais Curto
                </Text>
                <Text style={[styles.detailValue, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {estatisticas.itemMaisCurto.texto}
                </Text>
                <Text style={[styles.detailSubtitle, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
                  {estatisticas.itemMaisCurto.texto.length} caracteres
                </Text>
              </View>
            </View>
          )}

          {/* Categoria Mais Usada */}
          {estatisticas.categoriaMaisUsada && (
            <View style={[styles.detailCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}>
              <MaterialIcons name="category" size={20} color="#AF52DE" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Categoria Mais Usada
                </Text>
                <Text style={[styles.detailValue, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {estatisticas.categoriaMaisUsada.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
                  {estatisticas.categoriaMaisUsada.quantidade} itens
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Lista de Todas as Listas */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Todas as Listas
          </Text>
          
          {listas.map((lista) => (
            <TouchableOpacity
              key={lista.id}
              style={[styles.listaCard, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
              onPress={() => router.push({
                pathname: '/lista-detalhes',
                params: { id: lista.id }
              })}
            >
              <View style={styles.listaInfo}>
                <Text style={[styles.listaNome, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  {lista.nome}
                </Text>
                <Text style={[styles.listaStats, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                  {lista.itens.length} itens • Criada {formatarTempoDecorrido(lista.createdAt)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={isDarkMode ? '#8e8e93' : '#8e8e93'} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  btnVoltar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    marginBottom: 2,
  },
  detailSubtitle: {
    fontSize: 12,
  },
  listaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  listaInfo: {
    flex: 1,
  },
  listaNome: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listaStats: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
}); 