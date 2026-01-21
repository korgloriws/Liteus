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

interface ListaComProdutividade extends Lista {
  percentualConclusao: number;
}

interface EstatisticasGerais {
  totalListas: number;
  totalItens: number;
  itensConcluidos: number;
  itensPendentes: number;
  listasComCategorias: number;
  listasComSelecaoAleatoria: number;
  mediaItensPorLista: number;
  percentualConclusao: number;
  listaMaisProdutiva: ListaComProdutividade | null;
  listaMenosProdutiva: ListaComProdutividade | null;
  categoriaMaisUsada: { nome: string; quantidade: number } | null;
  itemMaisLongo: Item | null;
  itemMaisCurto: Item | null;
  tempoMedioUso: string;
  frequenciaCriacao: string;
  conquistas: string[];
  insights: string[];
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
        itensConcluidos: 0,
        itensPendentes: 0,
        listasComCategorias: 0,
        listasComSelecaoAleatoria: 0,
        mediaItensPorLista: 0,
        percentualConclusao: 0,
        listaMaisProdutiva: null,
        listaMenosProdutiva: null,
        categoriaMaisUsada: null,
        itemMaisLongo: null,
        itemMaisCurto: null,
        tempoMedioUso: '0 dias',
        frequenciaCriacao: 'N/A',
        conquistas: [],
        insights: [],
      };
    }


    const totalItens = listas.reduce((acc, lista) => acc + lista.itens.length, 0);
    const itensConcluidos = listas.reduce((acc, lista) => 
      acc + lista.itens.filter(item => item.concluido).length, 0
    );
    const itensPendentes = totalItens - itensConcluidos;
    const percentualConclusao = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0;
    
    const listasComCategorias = listas.filter(lista => lista.categorias.length > 0).length;
    const listasComSelecaoAleatoria = listas.filter(lista => lista.permiteSelecaoAleatoria).length;


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


    const listasComProdutividade = listas.map(lista => ({
      ...lista,
      percentualConclusao: lista.itens.length > 0 
        ? (lista.itens.filter(item => item.concluido).length / lista.itens.length) * 100 
        : 0
    }));

    const listaMaisProdutiva = listasComProdutividade.reduce((max, lista) => 
      lista.percentualConclusao > max.percentualConclusao ? lista : max
    );
    
    const listaMenosProdutiva = listasComProdutividade.reduce((min, lista) => 
      lista.percentualConclusao < min.percentualConclusao ? lista : min
    );


    const datasCriacao = listas.map(lista => lista.dataCriacao);
    const dataMaisAntiga = Math.min(...datasCriacao);
    const dataMaisRecente = Math.max(...datasCriacao);
    const diasUso = Math.ceil((dataMaisRecente - dataMaisAntiga) / (1000 * 60 * 60 * 24));
    const tempoMedioUso = diasUso > 0 ? `${diasUso} dias` : 'Hoje';


    const frequenciaCriacao = listas.length > 1 
      ? `${Math.round(listas.length / Math.max(diasUso, 1) * 10) / 10} listas/dia`
      : 'Primeira lista';


    const mediaItensPorLista = listas.length > 0 ? Math.round(totalItens / listas.length * 10) / 10 : 0;


    const conquistas: string[] = [];
    if (listas.length >= 5) conquistas.push('Criador de Listas');
    if (totalItens >= 50) conquistas.push('Produtor de Conteúdo');
    if (percentualConclusao >= 80) conquistas.push('Concluidor');
    if (listasComCategorias >= 3) conquistas.push('Organizador');
    if (itensConcluidos >= 20) conquistas.push('Produtivo');
    if (listas.length >= 10) conquistas.push('Mestre das Listas');

  
    const insights: string[] = [];
    if (percentualConclusao < 30) insights.push('Considere criar listas menores para aumentar a conclusão');
    if (listasComCategorias < listas.length * 0.5) insights.push('Usar categorias pode ajudar na organização');
    if (mediaItensPorLista > 20) insights.push('Listas menores tendem a ser mais produtivas');
    if (itensConcluidos === 0) insights.push('Comece marcando alguns itens como concluídos');
    if (listas.length === 1) insights.push('Experimente criar diferentes tipos de listas');

    return {
      totalListas: listas.length,
      totalItens,
      itensConcluidos,
      itensPendentes,
      listasComCategorias,
      listasComSelecaoAleatoria,
      mediaItensPorLista,
      percentualConclusao,
      listaMaisProdutiva: listaMaisProdutiva.percentualConclusao > 0 ? listaMaisProdutiva : null,
      listaMenosProdutiva: listaMenosProdutiva.percentualConclusao < 100 ? listaMenosProdutiva : null,
      categoriaMaisUsada,
      itemMaisLongo,
      itemMaisCurto,
      tempoMedioUso,
      frequenciaCriacao,
      conquistas,
      insights,
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
            Sua produtividade em números
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
                {estatisticas.itensConcluidos}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Concluídos
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="pending" size={24} color="#FF9500" />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.itensPendentes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Pendentes
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="trending-up" size={24} color="#5856D6" />
              <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
                {estatisticas.percentualConclusao}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
                Taxa de Conclusão
              </Text>
            </View>
          </View>
        </View>

        {/* Produtividade */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Produtividade
          </Text>

          <View style={styles.produtividadeGrid}>
            <View style={[styles.produtividadeCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="schedule" size={20} color={colors.primary} />
              <View style={styles.produtividadeInfo}>
                <Text style={[styles.produtividadeTitle, { color: colors.text }, typography.subtitleBold]}>
                  Tempo de Uso
                </Text>
                <Text style={[styles.produtividadeValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.tempoMedioUso}
                </Text>
              </View>
            </View>

            <View style={[styles.produtividadeCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="add-circle" size={20} color="#34C759" />
              <View style={styles.produtividadeInfo}>
                <Text style={[styles.produtividadeTitle, { color: colors.text }, typography.subtitleBold]}>
                  Frequência
                </Text>
                <Text style={[styles.produtividadeValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.frequenciaCriacao}
                </Text>
              </View>
            </View>

            <View style={[styles.produtividadeCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="analytics" size={20} color="#AF52DE" />
              <View style={styles.produtividadeInfo}>
                <Text style={[styles.produtividadeTitle, { color: colors.text }, typography.subtitleBold]}>
                  Média por Lista
                </Text>
                <Text style={[styles.produtividadeValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.mediaItensPorLista} itens
                </Text>
              </View>
            </View>

            <View style={[styles.produtividadeCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="category" size={20} color="#FF9500" />
              <View style={styles.produtividadeInfo}>
                <Text style={[styles.produtividadeTitle, { color: colors.text }, typography.subtitleBold]}>
                  Com Categorias
                </Text>
                <Text style={[styles.produtividadeValue, { color: colors.textSecondary }, typography.body]}>
                  {estatisticas.listasComCategorias} listas
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Conquistas */}
        {estatisticas.conquistas.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              🏆 Conquistas
            </Text>
            
            <View style={styles.conquistasGrid}>
              {estatisticas.conquistas.map((conquista, index) => (
                <View key={index} style={[styles.conquistaCard, { backgroundColor: colors.accent }]}>
                  <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
                  <Text style={[styles.conquistaText, { color: colors.text }, typography.body]}>
                    {conquista}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Insights */}
        {estatisticas.insights.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              💡 Insights
            </Text>
            
            {estatisticas.insights.map((insight, index) => (
              <View key={index} style={[styles.insightCard, { backgroundColor: colors.accent }]}>
                <MaterialIcons name="lightbulb" size={16} color="#FF9500" />
                <Text style={[styles.insightText, { color: colors.textSecondary }, typography.body]}>
                  {insight}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Lista Mais Produtiva */}
        {estatisticas.listaMaisProdutiva && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              🎯 Lista Mais Produtiva
            </Text>
            
            <TouchableOpacity
              style={[styles.listaProdutivaCard, { backgroundColor: colors.accent }]}
              onPress={() => router.push({
                pathname: '/lista-detalhes',
                params: { id: estatisticas.listaMaisProdutiva!.id }
              })}
            >
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <View style={styles.listaProdutivaInfo}>
                <Text style={[styles.listaProdutivaTitle, { color: colors.text }, typography.subtitleBold]}>
                  {estatisticas.listaMaisProdutiva.nome}
                </Text>
                <Text style={[styles.listaProdutivaStats, { color: colors.textSecondary }, typography.caption]}>
                  {estatisticas.listaMaisProdutiva.itens.filter(item => item.concluido).length} de {estatisticas.listaMaisProdutiva.itens.length} itens concluídos
                </Text>
                <Text style={[styles.listaProdutivaPercentual, { color: colors.primary }, typography.body]}>
                  {Math.round(estatisticas.listaMaisProdutiva.percentualConclusao)}% de conclusão
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Categoria Mais Usada */}
        {estatisticas.categoriaMaisUsada && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              📊 Categoria Mais Usada
            </Text>
            
            <View style={[styles.categoriaCard, { backgroundColor: colors.accent }]}>
              <MaterialIcons name="category" size={24} color="#AF52DE" />
              <View style={styles.categoriaInfo}>
                <Text style={[styles.categoriaTitle, { color: colors.text }, typography.subtitleBold]}>
                  {estatisticas.categoriaMaisUsada.nome}
                </Text>
                <Text style={[styles.categoriaStats, { color: colors.textSecondary }, typography.caption]}>
                  {estatisticas.categoriaMaisUsada.quantidade} itens utilizados
                </Text>
              </View>
            </View>
          </View>
        )}
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
  produtividadeGrid: {
    gap: 12,
  },
  produtividadeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  produtividadeInfo: {
    flex: 1,
  },
  produtividadeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  produtividadeValue: {
    fontSize: 16,
  },
  conquistasGrid: {
    gap: 8,
  },
  conquistaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  conquistaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightsGrid: {
    gap: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  listaProdutivaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  listaProdutivaInfo: {
    flex: 1,
  },
  listaProdutivaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listaProdutivaStats: {
    fontSize: 14,
    marginBottom: 2,
  },
  listaProdutivaPercentual: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  categoriaInfo: {
    flex: 1,
  },
  categoriaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoriaStats: {
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