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

  return (
    <Text style={[style, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
      {textoFormatado.map((formato, index) => {
        const textStyle: TextStyle = {
          ...style,
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

        if (formato.tamanho) {
          textStyle.fontSize = formato.tamanho;
        }

        return (
          <Text key={index} style={textStyle}>
            {formato.texto}
          </Text>
        );
      })}
    </Text>
  );
}; 