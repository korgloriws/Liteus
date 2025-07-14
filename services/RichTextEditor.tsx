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
  const [formatoAtual, setFormatoAtual] = useState<Partial<FormatoTexto>>({});

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

    // Atualizar formato atual
    const novoFormatoAtual = { ...formatoAtual };
    if (tipo === 'negrito') {
      novoFormatoAtual.negrito = !novoFormatoAtual.negrito;
    } else if (tipo === 'italico') {
      novoFormatoAtual.italico = !novoFormatoAtual.italico;
    } else if (tipo === 'cor') {
      novoFormatoAtual.cor = valor;
    }
    setFormatoAtual(novoFormatoAtual);

    // Aplicar formatação ao texto selecionado
    const novoFormato: FormatoTexto = {
      texto: textoSelecionado,
      negrito: novoFormatoAtual.negrito,
      italico: novoFormatoAtual.italico,
      cor: novoFormatoAtual.cor,
    };

    // Verificar se já existe uma formatação para este texto
    const formatoExistenteIndex = editandoFormato.findIndex(
      formato => formato.texto === textoSelecionado
    );

    if (formatoExistenteIndex >= 0) {
      // Atualizar formatação existente
      const novosFormatos = [...editandoFormato];
      novosFormatos[formatoExistenteIndex] = novoFormato;
      setEditandoFormato(novosFormatos);
    } else {
      // Adicionar nova formatação
      setEditandoFormato([...editandoFormato, novoFormato]);
    }
  };

  const aplicarFormatoCompleto = () => {
    const textoSelecionado = editandoTexto.substring(selecao.start, selecao.end);
    if (!textoSelecionado) {
      Alert.alert('Aviso', 'Selecione um texto para aplicar formatação');
      return;
    }

      const novoFormato: FormatoTexto = {
        texto: textoSelecionado,
      ...formatoAtual,
    };

    // Verificar se já existe uma formatação para este texto
    const formatoExistenteIndex = editandoFormato.findIndex(
      formato => formato.texto === textoSelecionado
    );

    if (formatoExistenteIndex >= 0) {
      // Atualizar formatação existente
      const novosFormatos = [...editandoFormato];
      novosFormatos[formatoExistenteIndex] = novoFormato;
      setEditandoFormato(novosFormatos);
    } else {
      // Adicionar nova formatação
      setEditandoFormato([...editandoFormato, novoFormato]);
    }

    // Limpar formato atual
    setFormatoAtual({});
  };

  const removerFormato = (index: number) => {
    const novoFormato = editandoFormato.filter((_, i) => i !== index);
    setEditandoFormato(novoFormato);
  };

  const limparFormatoAtual = () => {
    setFormatoAtual({});
  };

  const salvarEdicao = () => {
    onChange(editandoTexto, editandoFormato);
    setModalVisible(false);
  };

  const cancelarEdicao = () => {
    setEditandoTexto(value);
    setEditandoFormato(textoFormatado || []);
    setFormatoAtual({});
    setModalVisible(false);
  };

  const isFormatoAtivo = (tipo: 'negrito' | 'italico' | 'cor', valor?: string) => {
      if (tipo === 'negrito') {
      return formatoAtual.negrito === true;
      }
      if (tipo === 'italico') {
      return formatoAtual.italico === true;
      }
      if (tipo === 'cor') {
      return formatoAtual.cor === valor;
    }
    return false;
  };

  const renderizarTextoFormatado = () => {
    if (editandoFormato.length === 0) {
      return (
        <Text style={[styles.previewText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
          {editandoTexto || 'Digite o texto...'}
        </Text>
      );
    }

    // Criar um array de partes do texto com formatação
    const partesFormatadas: Array<{ texto: string; formato?: FormatoTexto }> = [];
    let posicaoAtual = 0;

    // Ordenar formatações por posição no texto
    const formatosOrdenados = [...editandoFormato].sort((a, b) => {
      const posA = editandoTexto.indexOf(a.texto);
      const posB = editandoTexto.indexOf(b.texto);
      return posA - posB;
    });

    formatosOrdenados.forEach((formato) => {
      const posicaoFormato = editandoTexto.indexOf(formato.texto, posicaoAtual);
      
      // Adicionar texto antes da formatação
      if (posicaoFormato > posicaoAtual) {
        const textoAntes = editandoTexto.substring(posicaoAtual, posicaoFormato);
        partesFormatadas.push({ texto: textoAntes });
      }

      // Adicionar texto formatado
      partesFormatadas.push({ texto: formato.texto, formato });

      posicaoAtual = posicaoFormato + formato.texto.length;
    });

    // Adicionar texto restante
    if (posicaoAtual < editandoTexto.length) {
      const textoRestante = editandoTexto.substring(posicaoAtual);
      partesFormatadas.push({ texto: textoRestante });
    }

    return (
      <View style={[styles.previewText, { 
        backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7',
        borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
      }]}>
        {partesFormatadas.map((parte, index) => {
          const textStyle: any = {
            color: isDarkMode ? '#fff' : '#1c1c1e',
          };

          if (parte.formato) {
            if (parte.formato.negrito) {
              textStyle.fontWeight = 'bold';
            }
            if (parte.formato.italico) {
              textStyle.fontStyle = 'italic';
            }
            if (parte.formato.cor) {
              textStyle.color = parte.formato.cor;
            }
          }

          return (
            <Text key={index} style={textStyle}>
              {parte.texto}
            </Text>
          );
        })}
      </View>
    );
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
              <View style={styles.previewContainer}>
                <Text style={[styles.previewTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Prévia:
                </Text>
              {renderizarTextoFormatado()}
            </View>

            {/* Formatação Atual */}
            {(formatoAtual.negrito || formatoAtual.italico || formatoAtual.cor) && (
              <View style={styles.formatoAtualContainer}>
                <Text style={[styles.formatoAtualTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Formatação Atual:
                      </Text>
                <View style={styles.formatoAtualTags}>
                  {formatoAtual.negrito && (
                    <View style={[styles.formatoTag, { backgroundColor: '#007AFF' }]}>
                      <Text style={styles.formatoTagText}>Negrito</Text>
                    </View>
                  )}
                  {formatoAtual.italico && (
                    <View style={[styles.formatoTag, { backgroundColor: '#34C759' }]}>
                      <Text style={styles.formatoTagText}>Itálico</Text>
                    </View>
                  )}
                  {formatoAtual.cor && (
                    <View style={[styles.formatoTag, { backgroundColor: formatoAtual.cor }]}>
                      <Text style={styles.formatoTagText}>Cor</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={limparFormatoAtual} style={styles.btnLimparFormato}>
                  <Text style={styles.btnLimparFormatoText}>Limpar</Text>
                </TouchableOpacity>
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

            {/* Botão Aplicar Formatação */}
            <TouchableOpacity
              style={[styles.btnAplicarFormato, { backgroundColor: '#007AFF' }]}
              onPress={aplicarFormatoCompleto}
            >
              <Text style={styles.btnAplicarFormatoText}>Aplicar Formatação</Text>
            </TouchableOpacity>

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
    maxHeight: '80%',
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
  formatoAtualContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  formatoAtualTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formatoAtualTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  btnLimparFormato: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  btnLimparFormatoText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  btnAplicarFormato: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnAplicarFormatoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flex: 1,
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