import React from 'react';
import { Text, TextStyle } from 'react-native';
import { FormatoTexto } from '../types';

interface FormattedTextProps {
  texto: string;
  textoFormatado?: FormatoTexto[];
  style?: TextStyle;
  isDarkMode?: boolean;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  texto,
  textoFormatado,
  style,
  isDarkMode = false,
}) => {
  if (!textoFormatado || textoFormatado.length === 0) {
    return (
      <Text style={[style, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
        {texto}
      </Text>
    );
  }

  // Criar um array de partes do texto com formatação
  const partesFormatadas: Array<{ texto: string; formato?: FormatoTexto }> = [];
  let posicaoAtual = 0;

  // Ordenar formatações por posição no texto
  const formatosOrdenados = [...textoFormatado].sort((a, b) => {
    const posA = texto.indexOf(a.texto);
    const posB = texto.indexOf(b.texto);
    return posA - posB;
  });

  formatosOrdenados.forEach((formato) => {
    const posicaoFormato = texto.indexOf(formato.texto, posicaoAtual);
    
    // Adicionar texto antes da formatação
    if (posicaoFormato > posicaoAtual) {
      const textoAntes = texto.substring(posicaoAtual, posicaoFormato);
      partesFormatadas.push({ texto: textoAntes });
    }

    // Adicionar texto formatado
    partesFormatadas.push({ texto: formato.texto, formato });

    posicaoAtual = posicaoFormato + formato.texto.length;
  });

  // Adicionar texto restante
  if (posicaoAtual < texto.length) {
    const textoRestante = texto.substring(posicaoAtual);
    partesFormatadas.push({ texto: textoRestante });
  }

  return (
    <Text style={[style, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
      {partesFormatadas.map((parte, index) => {
        const textStyle: TextStyle = {
          ...style,
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
          if (parte.formato.tamanho) {
            textStyle.fontSize = parte.formato.tamanho;
          }
        }

        return (
          <Text key={index} style={textStyle}>
            {parte.texto}
          </Text>
        );
      })}
    </Text>
  );
}; 