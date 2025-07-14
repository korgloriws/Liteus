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
  const { isDarkMode, colors, typography } = useTheme();
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }, typography.subtitle]}>
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
          <Text style={[styles.emptyTitle, { color: colors.text }, typography.titleLarge]}>
            Nenhuma estatística disponível
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }, typography.body]}>
            Crie algumas listas para ver estatísticas interessantes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitulo, { color: colors.text }, typography.titleLarge]}>
            Estatísticas
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }, typography.subtitle]}>
            Visão geral das suas listas
          </Text>
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumo Geral */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Resumo Geral
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="list" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.totalListas}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Listas
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="check-circle" size={24} color="#34C759" />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.totalItens}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Itens
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="category" size={24} color="#AF52DE" />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.listasComCategorias}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Com Categorias
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="casino" size={24} color="#FF9500" />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.listasComSelecaoAleatoria}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Com Seleção Aleatória
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
            <MaterialIcons name="analytics" size={24} color="#5856D6" />
            <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
              {estatisticas.mediaItensPorLista}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
              Média de Itens por Lista
            </Text>
          </View>
        </View>

        {/* Estatísticas Detalhadas */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Estatísticas Detalhadas
          </Text>

          {/* Lista Mais Antiga */}
          {estatisticas.listaMaisAntiga && (
            <View style={[styles.detailCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="schedule" size={20} color="#FF3B30" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text }, typography.subtitleBold]}>
                  Lista Mais Antiga
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.listaMaisAntiga.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: colors.textSecondary }, typography.caption]}>
                  Criada em {formatarData(estatisticas.listaMaisAntiga.createdAt)} 
                  ({formatarTempoDecorrido(estatisticas.listaMaisAntiga.createdAt)})
                </Text>
              </View>
            </View>
          )}

          {/* Lista Mais Recente */}
          {estatisticas.listaMaisRecente && (
            <View style={[styles.detailCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="new-releases" size={20} color="#34C759" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text }, typography.subtitleBold]}>
                  Lista Mais Recente
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.listaMaisRecente.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: colors.textSecondary }, typography.caption]}>
                  Criada em {formatarData(estatisticas.listaMaisRecente.createdAt)} 
                  ({formatarTempoDecorrido(estatisticas.listaMaisRecente.createdAt)})
                </Text>
              </View>
            </View>
          )}

          {/* Item Mais Longo */}
          {estatisticas.itemMaisLongo && (
            <View style={[styles.detailCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="text-fields" size={20} color={colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text }, typography.subtitleBold]}>
                  Item Mais Longo
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.itemMaisLongo.texto}
                </Text>
                <Text style={[styles.detailSubtitle, { color: colors.textSecondary }, typography.caption]}>
                  {estatisticas.itemMaisLongo.texto.length} caracteres
                </Text>
              </View>
            </View>
          )}

          {/* Item Mais Curto */}
          {estatisticas.itemMaisCurto && (
            <View style={[styles.detailCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="text-fields" size={20} color="#FF9500" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text }, typography.subtitleBold]}>
                  Item Mais Curto
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.itemMaisCurto.texto}
                </Text>
                <Text style={[styles.detailSubtitle, { color: colors.textSecondary }, typography.caption]}>
                  {estatisticas.itemMaisCurto.texto.length} caracteres
                </Text>
              </View>
            </View>
          )}

          {/* Categoria Mais Usada */}
          {estatisticas.categoriaMaisUsada && (
            <View style={[styles.detailCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="category" size={20} color="#AF52DE" />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text }, typography.subtitleBold]}>
                  Categoria Mais Usada
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.categoriaMaisUsada.nome}
                </Text>
                <Text style={[styles.detailSubtitle, { color: colors.textSecondary }, typography.caption]}>
                  {estatisticas.categoriaMaisUsada.quantidade} itens
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Lista de Todas as Listas */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Todas as Listas
          </Text>
          
          {listas.map((lista) => (
            <TouchableOpacity
              key={lista.id}
              style={[styles.listaCard, { backgroundColor: colors.accent }]}
              onPress={() => router.push({
                pathname: '/lista-detalhes',
                params: { id: lista.id }
              })}
            >
              <View style={styles.listaInfo}>
                <Text style={[styles.listaNome, { color: colors.text }, typography.subtitleBold]}>
                  {lista.nome}
                </Text>
                <Text style={[styles.listaStats, { color: colors.textSecondary }, typography.caption]}>
                  {lista.itens.length} itens • Criada {formatarTempoDecorrido(lista.createdAt)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
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