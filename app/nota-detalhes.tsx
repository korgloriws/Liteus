import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Nota, FormatoTexto } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import QuillInlineEditor from '../components/QuillInlineEditor';
 

export default function NotaDetalhesScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nota, setNota] = useState<Nota | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [html, setHtml] = useState<string | undefined>(undefined);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Resetar estados para evitar herança de conteúdo entre notas
    hasLoadedRef.current = false;
    setTitulo('');
    setConteudo('');
    setHtml('');
    carregarNota();
    hasLoadedRef.current = true;
  }, [id]);

  // Voltar para a aba de notas apenas quando esta tela estiver focada (Android back)
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        try {
          router.replace('/notas');
        } catch {}
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [])
  );
  const carregarNota = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const n = await StorageService.buscarNota(id);
      setNota(n);
      if (n) {
        setTitulo(n.titulo);
        setConteudo(n.conteudo || '');
        setHtml(n.html);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a nota');
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  };

  const saveNow = async () => {
    try {
      if (!id || !hasLoadedRef.current) return;
      await StorageService.atualizarNota(id, {
        titulo: (titulo || '').trim() || 'Sem título',
        conteudo,
        html,
      });
    } catch {}
  };

  const scheduleAutoSave = () => {
    if (!hasLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNow();
    }, 600);
  };

  useEffect(() => {
    if (loading) return;
    scheduleAutoSave();
    
  }, [titulo, html]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // tentativa final de salvar alterações pendentes
      saveNow();
    };
  }, []);



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface }]}> 
        <TouchableOpacity style={styles.headerButton} onPress={() => router.replace('/notas')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTools} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput
          style={[styles.titleInput, { color: colors.text }]}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Título"
          placeholderTextColor={getPlaceholderColor(isDarkMode)}
        />

        <QuillInlineEditor
          key={id as any}
          initialHtml={html}
          placeholder="Escreva sua nota..."
          onChange={(text, htmlContent) => {
            setHtml(htmlContent);
            const plain = text.replace(/\s+/g, ' ').trim();
            setConteudo(plain);
          }}
          minHeight={300}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    padding: 8,
  },
  headerTools: {
    flexDirection: 'column',
    flex: 1,
    marginHorizontal: 8,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
});


