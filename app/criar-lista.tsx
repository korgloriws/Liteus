import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Lista } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import QuillInlineEditor from '../components/QuillInlineEditor';

const CORES = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#D7BDE2', '#FF9F43'
];

export default function CriarListaScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [descricaoHtml, setDescricaoHtml] = useState<string>('');
  const [corSelecionada, setCorSelecionada] = useState(CORES[0]);
  const [permiteSelecaoAleatoria, setPermiteSelecaoAleatoria] = useState(false);
  const [modalCores, setModalCores] = useState(false);

  const handleSalvar = async () => {
    try {
      if (!nome.trim()) {
        Alert.alert('Erro', 'O nome da lista é obrigatório');
        return;
      }

      const novaLista: Omit<Lista, 'id'> = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        descricaoHtml: descricaoHtml || undefined,
        cor: corSelecionada,
        icone: 'list',
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
        itens: [],
        categorias: [],
        permiteSelecaoAleatoria: permiteSelecaoAleatoria,
      };

      await StorageService.adicionarLista(novaLista);

      limparFormulario();
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  // manter função antiga não utilizada para evitar refactors amplos

  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setDescricaoHtml('');
    setCorSelecionada(CORES[0]);
    setPermiteSelecaoAleatoria(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, typography.titleLarge]}>
          Nova Lista
        </Text>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.primary }]}
          onPress={handleSalvar}
        >
          <MaterialIcons name="check" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Informações Básicas
          </Text>

        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }, typography.body]}>
              Nome da Lista *
            </Text>
          <TextInput
            style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }, typography.body]}
            value={nome}
            onChangeText={setNome}
            placeholder="Digite o nome da lista"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
          />
        </View>

        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }, typography.body]}>
              Descrição (opcional)
            </Text>
          <QuillInlineEditor
            initialHtml={descricaoHtml}
            placeholder="Digite uma descrição"
            onChange={(text, html) => {
              setDescricao(text);
              setDescricaoHtml(html);
            }}
            minHeight={160}
          />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Personalização</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }, typography.body]}>Cor</Text>
                  <TouchableOpacity
              style={[styles.colorPicker, { borderColor: colors.border }]}
              onPress={() => setModalCores(true)}
            >
              <View style={[styles.colorPreview, { backgroundColor: corSelecionada }]} />
              <Text style={[styles.colorText, { color: colors.text }, typography.body]}>
                {corSelecionada}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
            </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Funcionalidades
          </Text>
          
          <TouchableOpacity
            style={[styles.optionRow, { borderColor: colors.border }]}
            onPress={() => setPermiteSelecaoAleatoria(!permiteSelecaoAleatoria)}
          >
            <View style={styles.optionInfo}>
                <MaterialIcons
                  name="casino"
                  size={24}
                color={permiteSelecaoAleatoria ? colors.primary : colors.textSecondary} 
                />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }, typography.body]}>
                  Seleção Aleatória
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }, typography.caption]}>
                  Permite selecionar itens aleatoriamente da lista
                </Text>
              </View>
            </View>
            <View style={[
              styles.switch, 
              { backgroundColor: permiteSelecaoAleatoria ? colors.primary : colors.border }
            ]}>
              <View style={[
                styles.switchThumb, 
                { 
                  backgroundColor: '#fff',
                  transform: [{ translateX: permiteSelecaoAleatoria ? 20 : 0 }]
                }
              ]} />
          </View>
          </TouchableOpacity>
      </View>

    </ScrollView>

      {/* Modal de Cores */}
      <Modal
        visible={modalCores}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalCores(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleLarge]}>
              Escolher Cor
            </Text>
            
            <View style={styles.colorsGrid}>
              {CORES.map((cor) => (
                <TouchableOpacity
                  key={cor}
                  style={[
                    styles.colorOption,
                    { backgroundColor: cor },
                    corSelecionada === cor && styles.colorOptionSelecionada
                  ]}
                  onPress={() => {
                    setCorSelecionada(cor);
                    setModalCores(false);
                  }}
                >
                  {corSelecionada === cor && (
                    <MaterialIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

              <TouchableOpacity
                style={styles.btnCancelar}
              onPress={() => setModalCores(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2f4366',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  colorText: {
    flex: 1,
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelecionada: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  btnCancelar: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnCancelarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 