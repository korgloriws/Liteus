import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

export default function CriarListaScreen() {
  const { isDarkMode } = useTheme();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('#007AFF');
  const [permiteSelecaoAleatoria, setPermiteSelecaoAleatoria] = useState(true);
  const [tipoAnimacao, setTipoAnimacao] = useState<'roleta' | 'cubo'>('roleta');
  const [loading, setLoading] = useState(false);

  const cores = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
    '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'
  ];

  const criarLista = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome da lista é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await StorageService.adicionarLista({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        cor,
        permiteSelecaoAleatoria,
        tipoAnimacao: permiteSelecaoAleatoria ? tipoAnimacao : undefined,
        itens: [],
      });

      Alert.alert(
        'Sucesso',
        'Lista criada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a lista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]} showsVerticalScrollIndicator={false}>
      

      <View style={styles.content}>
        <View style={styles.introSection}>
          <MaterialIcons name="create" size={48} color="#007AFF" />
          <Text style={[styles.introTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
            Vamos criar algo incrível!
          </Text>
          <Text style={[styles.introSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
            Configure sua nova lista com as opções abaixo
          </Text>
        </View>

        {/* Nome da Lista */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="edit" size={20} color="#007AFF" />
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Informações Básicas</Text>
          </View>
          <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Nome da Lista *</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
              color: isDarkMode ? '#fff' : '#1C1C1E',
              borderColor: isDarkMode ? '#38383A' : '#E5E5EA'
            }]}
            value={nome}
            onChangeText={setNome}
            placeholder="Digite o nome da lista"
            placeholderTextColor={isDarkMode ? '#8E8E93' : '#8E8E93'}
            maxLength={50}
          />
        </View>

        {/* Descrição */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
              color: isDarkMode ? '#fff' : '#1C1C1E',
              borderColor: isDarkMode ? '#38383A' : '#E5E5EA'
            }]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Digite uma descrição para a lista"
            placeholderTextColor={isDarkMode ? '#8E8E93' : '#8E8E93'}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Cor */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="palette" size={20} color="#007AFF" />
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Personalização</Text>
          </View>
          <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Cor da Lista</Text>
          <View style={styles.coresContainer}>
            {cores.map((corItem) => (
              <TouchableOpacity
                key={corItem}
                style={[
                  styles.corItem,
                  { backgroundColor: corItem },
                  cor === corItem && styles.corSelecionada,
                ]}
                onPress={() => setCor(corItem)}
              >
                {cor === corItem && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Seleção Aleatória */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="casino" size={20} color="#007AFF" />
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Recursos Avançados</Text>
          </View>
          <View style={styles.switchContainer}>
            <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Permitir Seleção Aleatória</Text>
            <Switch
              value={permiteSelecaoAleatoria}
              onValueChange={setPermiteSelecaoAleatoria}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Tipo de Animação */}
        {permiteSelecaoAleatoria && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Tipo de Animação</Text>
            <View style={styles.animacaoContainer}>
              <TouchableOpacity
                style={[
                  styles.animacaoOption,
                  { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff', borderColor: isDarkMode ? '#38383A' : '#E5E5EA' },
                  tipoAnimacao === 'roleta' && styles.animacaoSelecionada,
                ]}
                onPress={() => setTipoAnimacao('roleta')}
              >
                <MaterialIcons
                  name="casino"
                  size={24}
                  color={tipoAnimacao === 'roleta' ? '#007AFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.animacaoText,
                    { color: isDarkMode ? '#fff' : '#1C1C1E' },
                    tipoAnimacao === 'roleta' && styles.animacaoTextSelecionada,
                  ]}
                >
                  Roleta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.animacaoOption,
                  { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff', borderColor: isDarkMode ? '#38383A' : '#E5E5EA' },
                  tipoAnimacao === 'cubo' && styles.animacaoSelecionada,
                ]}
                onPress={() => setTipoAnimacao('cubo')}
              >
                <MaterialIcons
                  name="view-in-ar"
                  size={24}
                  color={tipoAnimacao === 'cubo' ? '#007AFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.animacaoText,
                    { color: isDarkMode ? '#fff' : '#1C1C1E' },
                    tipoAnimacao === 'cubo' && styles.animacaoTextSelecionada,
                  ]}
                >
                  Cubo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botão Criar */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.btnCriar, loading && styles.btnCriarDisabled]}
            onPress={criarLista}
            disabled={loading}
          >
            <MaterialIcons name="add-circle" size={24} color="#fff" />
            <Text style={styles.btnCriarText}>
              {loading ? 'Criando...' : 'Criar Lista'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialIcons name="info" size={16} color={isDarkMode ? '#8E8E93' : '#8E8E93'} />
          <Text style={[styles.footerText, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
            Sua lista será salva automaticamente
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  btnVoltar: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  coresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  corItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corSelecionada: {
    borderColor: '#1C1C1E',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animacaoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  animacaoOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  animacaoSelecionada: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  animacaoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 8,
  },
  animacaoTextSelecionada: {
    color: '#007AFF',
  },
  btnCriar: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  btnCriarDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnCriarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 