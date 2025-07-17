import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Lista } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/syncService';
import { useTheme } from '../services/ThemeContext';

export default function ConfiguracoesScreen() {
  const { isDarkMode, setDarkMode, colors, typography } = useTheme();
  const [versao] = useState('1.0.6');
  const [listas, setListas] = useState<Lista[]>([]);
  const [modalSincronizacao, setModalSincronizacao] = useState(false);
  const [dadosSincronizacao, setDadosSincronizacao] = useState('');
  const [modalImportacaoGoogleDocs, setModalImportacaoGoogleDocs] = useState(false);
  const [modalImportacaoJSON, setModalImportacaoJSON] = useState(false);
  const [conteudoGoogleDocs, setConteudoGoogleDocs] = useState('');
  const [dadosJSON, setDadosJSON] = useState('');
  const [tipoArquivoSelecionado, setTipoArquivoSelecionado] = useState('auto');

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
      const dadosJson = await SyncService.exportarTodasListas();
      setDadosSincronizacao(dadosJson);
      setModalSincronizacao(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar as listas');
    }
  };

  const exportarParaGoogleDocs = async () => {
    if (listas.length === 0) {
      Alert.alert('Aviso', 'Não há listas para exportar');
      return;
    }

    try {
      let templateCompleto = '# Listas Liteus\n\n';
      
      for (const lista of listas) {
        templateCompleto += SyncService.gerarTemplateGoogleDocs(lista);
        templateCompleto += '\n---\n\n';
      }

      // Salvar como arquivo temporário e compartilhar
      const fileName = `listas_liteus_${new Date().toISOString().split('T')[0]}.txt`;
      
      if (await Sharing.isAvailableAsync()) {
        // Criar arquivo temporário
        const fileName = `listas_liteus_${new Date().toISOString().split('T')[0]}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, templateCompleto, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Exportar para Google Docs',
          UTI: 'public.plain-text',
        });
      } else {
        Alert.alert(
          'Dados para Google Docs',
          'Copie o conteúdo abaixo e cole no Google Docs:',
          [{ text: 'OK' }]
        );
        console.log('Template para Google Docs:', templateCompleto);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar para Google Docs');
    }
  };

  const importarDoGoogleDocs = async () => {
    setConteudoGoogleDocs('');
    setModalImportacaoGoogleDocs(true);
  };

  const processarImportacaoGoogleDocs = async () => {
    if (!conteudoGoogleDocs || conteudoGoogleDocs.trim().length === 0) {
      Alert.alert('Erro', 'Conteúdo vazio');
      return;
    }

    try {
      console.log('Processando importação do Google Docs...');
      
      // Tentar detectar e processar automaticamente
      const resultado = await SyncService.processarArquivo(conteudoGoogleDocs, tipoArquivoSelecionado);
      
      if (resultado.nome && resultado.itens.length > 0) {
        console.log('Lista detectada:', resultado.nome, 'com', resultado.itens.length, 'itens');
        

        const novaLista = await StorageService.adicionarLista({
          nome: resultado.nome,
          descricao: resultado.descricao,
          cor: resultado.cor || '#007AFF',
          icone: 'list',
          dataCriacao: Date.now(),
          dataModificacao: Date.now(),
          permiteSelecaoAleatoria: resultado.permiteSelecaoAleatoria,
          tipoAnimacao: resultado.tipoAnimacao,
          itens: [],
          categorias: (resultado.categorias ?? []).map((nome: string, index: number) => ({
            id: `cat_${Date.now()}_${index}`,
            nome,
            cor: '#007AFF',
            createdAt: new Date().toISOString(),
          })),
        });


        for (const item of resultado.itens) {
          if (typeof item === 'string') {

            await StorageService.adicionarItem(novaLista.id, {
              texto: item.trim(),
              descricao: undefined,
              categoria: undefined,
            });
          } else {
            // Item estruturado com descrição e categoria
            await StorageService.adicionarItem(novaLista.id, {
              texto: item.texto.trim(),
              descricao: item.descricao,
              categoria: item.categoria,
              categorias: item.categorias,
              tags: item.tags,
              prioridade: item.prioridade,
              data: item.data,
              concluido: item.concluido,
              textoFormatado: item.textoFormatado,
            });
          }
        }

        await carregarListas();
        setModalImportacaoGoogleDocs(false);
        setConteudoGoogleDocs('');
        Alert.alert('Sucesso', `Lista "${resultado.nome}" importada com ${resultado.itens.length} itens!`);
      } else {
        Alert.alert('Erro', 'Formato inválido. Verifique se o conteúdo está no formato correto.');
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      Alert.alert('Erro', 'Não foi possível importar do Google Docs. Verifique o formato do conteúdo.');
    }
  };

  const importarDadosEstruturados = async () => {
    setDadosJSON('');
    setModalImportacaoJSON(true);
  };

  const processarImportacaoJSON = async () => {
    if (!dadosJSON || dadosJSON.trim().length === 0) {
      Alert.alert('Erro', 'Dados vazios');
      return;
    }

    try {
      const resultado = await SyncService.importarDados(dadosJSON);
      
      await carregarListas();
      
      let mensagem = `Importação concluída!\n`;
      mensagem += `- Listas importadas: ${resultado.listasImportadas}\n`;
      mensagem += `- Itens importados: ${resultado.itensImportados}\n`;
      
      if (resultado.conflitos.length > 0) {
        mensagem += `\nConflitos:\n${resultado.conflitos.join('\n')}`;
      }
      
      setModalImportacaoJSON(false);
      setDadosJSON('');
      Alert.alert('Sucesso', mensagem);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível importar os dados');
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
      <View style={[styles.customHeader, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header do App */}
          <View style={styles.header}>
            <Image
              source={isDarkMode 
                ? require('../assets/logo_vertical_amarelo.png')
                : require('../assets/logo_vertical_azul.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />

          </View>

        {/* Seção de Aparência */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Aparência</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="dark-mode" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleModoEscuroChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Seção de Segurança */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Segurança</Text>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/seguranca')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="security" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Configurações de Segurança</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Seção de Sincronização */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Sincronização</Text>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={exportarParaGoogleDocs}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="cloud-upload" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Exportar para Google Docs</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={importarDoGoogleDocs}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="cloud-download" size={24} color="#34C759" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Importar do Google Docs</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => {
              const exemplo = SyncService.gerarExemploTemplate();
              Alert.alert(
                'Exemplo de Template Google Docs',
                'Copie este conteúdo e cole no Google Docs para testar a importação:',
                [
                  { text: 'Copiar', onPress: () => console.log('Exemplo:', exemplo) },
                  { text: 'OK' }
                ]
              );
              console.log('Exemplo de template:', exemplo);
            }}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="help" size={24} color="#FF9500" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Ver Exemplo de Template</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={exportarTodasListas}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="file-download" size={24} color="#FF9500" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Exportar Dados Estruturados</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={importarDadosEstruturados}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="file-upload" size={24} color="#AF52DE" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Importar Dados Estruturados</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Seção de Dados */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Dados</Text>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/estatisticas')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Estatísticas</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={limparDados}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="delete-forever" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Limpar Todos os Dados</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Seção de Informações */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Informações</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="info" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Versão</Text>
            </View>
            <Text style={[styles.optionValue, { color: colors.textSecondary }, typography.body]}>{versao}</Text>
          </View>

          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="code" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Desenvolvedor</Text>
            </View>
            <Text style={[styles.optionValue, { color: colors.textSecondary }, typography.body]}>Mateus Rodrigues</Text>
          </View>
        </View>

        {/* Seção de Recursos */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Recursos</Text>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="list" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Criação de listas personalizadas</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="casino" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Seleção aleatória com animações</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="cloud-sync" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Sincronização com Google Docs</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="palette" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Temas e cores personalizáveis</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }, typography.caption]}>
            © 2025 Liteus - Listas Inteligentes
          </Text>
        </View>
      </View>
    </ScrollView>

    {/* Modal de Sincronização */}
    <Modal
      visible={modalSincronizacao}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalSincronizacao(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Dados para Sincronização
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Copie os dados abaixo e cole no outro dispositivo:
          </Text>

          <TextInput
            style={[styles.modalTextInput, { 
              backgroundColor: colors.accent,
              color: colors.text,
              borderColor: colors.border
            }, typography.body]}
            value={dadosSincronizacao}
            multiline
            numberOfLines={10}
            editable={false}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalSincronizacao(false)}
            >
              <Text style={styles.btnCancelarText}>Fechar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnCopiar}
              onPress={() => {
                // Implementar cópia para clipboard
                Alert.alert('Sucesso', 'Dados copiados para a área de transferência!');
              }}
            >
              <Text style={styles.btnCopiarText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal de Importação do Google Docs */}
    <Modal
      visible={modalImportacaoGoogleDocs}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalImportacaoGoogleDocs(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Importar do Google Docs
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Cole o conteúdo do Google Docs aqui. Aceita qualquer formato de texto:
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 10 }, typography.caption]}>
            • Listas com bullets (• - *)
            • Listas numeradas (1. 2. 3.)
            • Texto simples
            • Templates estruturados
            • Exportações do Google Docs
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 5 }, typography.caption]}>
            Tipo de arquivo:
          </Text>
          
          <View style={styles.tipoArquivoContainer}>
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'auto' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('auto')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'auto' && styles.tipoArquivoButtonTextSelected
              ]}>Auto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'txt' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('txt')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'txt' && styles.tipoArquivoButtonTextSelected
              ]}>TXT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'docx' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('docx')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'docx' && styles.tipoArquivoButtonTextSelected
              ]}>DOCX</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'pdf' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('pdf')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'pdf' && styles.tipoArquivoButtonTextSelected
              ]}>PDF</Text>
            </TouchableOpacity>
          </View>

                      <TextInput
              style={[styles.modalTextInput, { 
                backgroundColor: colors.accent,
                color: colors.text,
                borderColor: colors.border
              }, typography.body]}
              value={conteudoGoogleDocs}
              onChangeText={setConteudoGoogleDocs}
              multiline
              numberOfLines={15}
              placeholder="Cole o conteúdo aqui..."
              placeholderTextColor={colors.textSecondary}
            />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalImportacaoGoogleDocs(false)}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnCopiar}
              onPress={processarImportacaoGoogleDocs}
            >
              <Text style={styles.btnCopiarText}>Importar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal de Importação JSON */}
    <Modal
      visible={modalImportacaoJSON}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalImportacaoJSON(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Importar Dados Estruturados
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Cole os dados JSON aqui:
          </Text>

          <TextInput
            style={[styles.modalTextInput, { 
              backgroundColor: colors.accent,
              color: colors.text,
              borderColor: colors.border
            }, typography.body]}
            value={dadosJSON}
            onChangeText={setDadosJSON}
            multiline
            numberOfLines={15}
            placeholder="Cole os dados JSON aqui..."
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalImportacaoJSON(false)}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnCopiar}
              onPress={processarImportacaoJSON}
            >
              <Text style={styles.btnCopiarText}>Importar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    marginBottom: 16,
    minHeight: 200,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnCancelar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  btnCancelarText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  btnCopiar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  btnCopiarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipoArquivoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  tipoArquivoButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  tipoArquivoButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tipoArquivoButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tipoArquivoButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
}); 