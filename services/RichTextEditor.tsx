import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
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
    if (!textoSelecionado) return;

    const novoFormato: FormatoTexto = {
      texto: textoSelecionado,
      negrito: tipo === 'negrito' ? true : undefined,
      italico: tipo === 'italico' ? true : undefined,
      cor: tipo === 'cor' ? valor : undefined,
    };

    setEditandoFormato([...editandoFormato, novoFormato]);
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

            {/* Barra de Ferramentas */}
            <View style={styles.toolbar}>
              <TouchableOpacity
                style={[styles.toolButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={() => aplicarFormato('negrito')}
              >
                <MaterialIcons name="format-bold" size={20} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={() => aplicarFormato('italico')}
              >
                <MaterialIcons name="format-italic" size={20} color="#007AFF" />
              </TouchableOpacity>

              <View style={styles.colorPicker}>
                {cores.map((cor) => (
                  <TouchableOpacity
                    key={cor}
                    style={[styles.colorButton, { backgroundColor: cor }]}
                    onPress={() => aplicarFormato('cor', cor)}
                  />
                ))}
              </View>
            </View>

            {/* Formatações Aplicadas */}
            {editandoFormato.length > 0 && (
              <View style={styles.formatosContainer}>
                <Text style={[styles.formatosTitle, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Formatações:
                </Text>
                {editandoFormato.map((formato, index) => (
                  <View key={index} style={styles.formatoItem}>
                    <Text style={[styles.formatoText, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                      "{formato.texto}" - 
                      {formato.negrito && ' Negrito'}
                      {formato.italico && ' Itálico'}
                      {formato.cor && ` Cor: ${formato.cor}`}
                    </Text>
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
  formatoText: {
    fontSize: 12,
    flex: 1,
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
}); 