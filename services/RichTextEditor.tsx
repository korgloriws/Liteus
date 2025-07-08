import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FormatoTexto } from '../types';
import { useTheme } from './ThemeContext';

interface RichTextEditorProps {
  value: string;
  textoFormatado?: FormatoTexto[];
  onChange: (texto: string, formato?: FormatoTexto[]) => void;
  placeholder?: string;
  multiline?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  textoFormatado,
  onChange,
  placeholder = 'Digite o texto...',
  multiline = false,
}) => {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoTexto, setEditandoTexto] = useState(value);
  const [editandoFormato, setEditandoFormato] = useState<FormatoTexto[]>(textoFormatado || []);
  const [selecao, setSelecao] = useState({ start: 0, end: 0 });

  const cores = [
    '#FF3B30', '#FF9500', '#FFCC02', '#34C759', 
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D92',
    '#000000', '#8E8E93', '#C7C7CC', '#FFFFFF'
  ];

  const aplicarFormato = (tipo: 'negrito' | 'italico' | 'cor', valor?: string) => {
    const textoSelecionado = editandoTexto.substring(selecao.start, selecao.end);
    if (!textoSelecionado) {
      Alert.alert('Aviso', 'Selecione um texto para aplicar formatação');
      return;
    }

    // Verificar se já existe uma formatação para este texto
    const formatoExistenteIndex = editandoFormato.findIndex(
      formato => formato.texto === textoSelecionado
    );

    if (formatoExistenteIndex >= 0) {
      // Atualizar formatação existente
      const formatoExistente = editandoFormato[formatoExistenteIndex];
      const novoFormato: FormatoTexto = {
        ...formatoExistente,
        negrito: tipo === 'negrito' ? !formatoExistente.negrito : formatoExistente.negrito,
        italico: tipo === 'italico' ? !formatoExistente.italico : formatoExistente.italico,
        cor: tipo === 'cor' ? valor : formatoExistente.cor,
      };

      const novosFormatos = [...editandoFormato];
      novosFormatos[formatoExistenteIndex] = novoFormato;
      setEditandoFormato(novosFormatos);
    } else {
      // Criar nova formatação
      const novoFormato: FormatoTexto = {
        texto: textoSelecionado,
        negrito: tipo === 'negrito' ? true : undefined,
        italico: tipo === 'italico' ? true : undefined,
        cor: tipo === 'cor' ? valor : undefined,
      };

      setEditandoFormato([...editandoFormato, novoFormato]);
    }
  };

  const removerFormato = (index: number) => {
    const novoFormato = editandoFormato.filter((_, i) => i !== index);
    setEditandoFormato(novoFormato);
  };

  const salvarEdicao = () => {
    onChange(editandoTexto, editandoFormato);
    setModalVisible(false);
  };

  const cancelarEdicao = () => {
    setEditandoTexto(value);
    setEditandoFormato(textoFormatado || []);
    setModalVisible(false);
  };

  const isFormatoAtivo = (tipo: 'negrito' | 'italico' | 'cor', valor?: string) => {
    const textoSelecionado = editandoTexto.substring(selecao.start, selecao.end);
    if (!textoSelecionado) {
      return false;
    }

    const formatoExistente = editandoFormato.find(
      formato => formato.texto === textoSelecionado
    );

    if (formatoExistente) {
      if (tipo === 'negrito') {
        return formatoExistente.negrito === true;
      }
      if (tipo === 'italico') {
        return formatoExistente.italico === true;
      }
      if (tipo === 'cor') {
        return formatoExistente.cor === valor;
      }
    }

    return false;
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.editorContainer, { 
          backgroundColor: isDarkMode ? '#38383A' : '#fff',
          borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
        }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.editorText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
          {value || placeholder}
        </Text>
        <MaterialIcons name="edit" size={16} color="#007AFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelarEdicao}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
              Editar Texto
            </Text>

            <Text style={[styles.instructionText, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
              Selecione um texto e use os botões abaixo para aplicar formatação
            </Text>

            <TextInput
              style={[styles.textInput, { 
                backgroundColor: isDarkMode ? '#38383A' : '#fff',
                color: isDarkMode ? '#fff' : '#1c1c1e',
                borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
              }]}
              value={editandoTexto}
              onChangeText={setEditandoTexto}
              placeholder={placeholder}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              onSelectionChange={(event) => {
                const { selection } = event.nativeEvent;
                setSelecao({ start: selection.start, end: selection.end });
              }}
            />

            {/* Prévia do texto formatado */}
            {editandoFormato.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Prévia:
                </Text>
                <View style={[styles.previewText, { 
                  backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7',
                  borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
                }]}>
                  {editandoFormato.map((formato, index) => {
                    const textStyle: any = {
                      color: isDarkMode ? '#fff' : '#1c1c1e',
                    };

                    if (formato.negrito) {
                      textStyle.fontWeight = 'bold';
                    }

                    if (formato.italico) {
                      textStyle.fontStyle = 'italic';
                    }

                    if (formato.cor) {
                      textStyle.color = formato.cor;
                    }

                    return (
                      <Text key={index} style={textStyle}>
                        {formato.texto}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Barra de Ferramentas */}
            <View style={styles.toolbar}>
              <TouchableOpacity
                style={[
                  styles.toolButton, 
                  { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                  isFormatoAtivo('negrito') && styles.toolButtonActive
                ]}
                onPress={() => aplicarFormato('negrito')}
              >
                <MaterialIcons 
                  name="format-bold" 
                  size={20} 
                  color={isFormatoAtivo('negrito') ? '#fff' : '#007AFF'} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toolButton, 
                  { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                  isFormatoAtivo('italico') && styles.toolButtonActive
                ]}
                onPress={() => aplicarFormato('italico')}
              >
                <MaterialIcons 
                  name="format-italic" 
                  size={20} 
                  color={isFormatoAtivo('italico') ? '#fff' : '#007AFF'} 
                />
              </TouchableOpacity>

              <View style={styles.colorPicker}>
                {cores.map((cor) => (
                  <TouchableOpacity
                    key={cor}
                    style={[
                      styles.colorButton, 
                      { backgroundColor: cor },
                      isFormatoAtivo('cor', cor) && styles.colorButtonActive
                    ]}
                    onPress={() => aplicarFormato('cor', cor)}
                  />
                ))}
              </View>
            </View>

            {/* Formatações Aplicadas */}
            {editandoFormato.length > 0 && (
              <View style={styles.formatosContainer}>
                <Text style={[styles.formatosTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Formatações Aplicadas:
                </Text>
                {editandoFormato.map((formato, index) => (
                  <View key={index} style={styles.formatoItem}>
                    <View style={styles.formatoInfo}>
                      <Text style={[styles.formatoText, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                        "{formato.texto}"
                      </Text>
                      <View style={styles.formatoTags}>
                        {formato.negrito && (
                          <View style={[styles.formatoTag, { backgroundColor: '#007AFF' }]}>
                            <Text style={styles.formatoTagText}>Negrito</Text>
                          </View>
                        )}
                        {formato.italico && (
                          <View style={[styles.formatoTag, { backgroundColor: '#34C759' }]}>
                            <Text style={styles.formatoTagText}>Itálico</Text>
                          </View>
                        )}
                        {formato.cor && (
                          <View style={[styles.formatoTag, { backgroundColor: formato.cor }]}>
                            <Text style={styles.formatoTagText}>Cor</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removerFormato(index)}>
                      <MaterialIcons name="close" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Botões */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={cancelarEdicao}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={salvarEdicao}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  },
  editorText: {
    flex: 1,
    fontSize: 16,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 44,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#007AFF',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  colorButtonActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  formatosContainer: {
    marginBottom: 16,
  },
  formatosTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formatoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  formatoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formatoText: {
    fontSize: 12,
    flex: 1,
  },
  formatoTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formatoTag: {
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 4,
  },
  formatoTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
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
  btnSalvar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  btnSalvarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewText: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
}); 