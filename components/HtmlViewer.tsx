import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../services/ThemeContext';

interface HtmlViewerProps {
  html?: string;
  style?: any;
  /** Altura máxima em px. Se não informado, o conteúdo é exibido por completo (quebra de linha). */
  maxHeight?: number;
}

export default function HtmlViewer({ html = '', style, maxHeight }: HtmlViewerProps) {
  const { isDarkMode, colors } = useTheme();
  const hasMaxHeight = maxHeight != null && maxHeight > 0;

  const htmlContent = useMemo(() => {
    const content = html || '<p></p>';
    const contentMaxHeightCss = hasMaxHeight ? `max-height: ${maxHeight}px; overflow: hidden;` : '';
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: ${colors.text};
        overflow: hidden;
      }
      #content {
        padding: 0;
        line-height: 1.4;
        word-wrap: break-word;
        font-size: 16px;
        font-weight: 600;
        ${contentMaxHeightCss}
      }
      #content p {
        margin: 0;
        padding: 0;
        color: ${colors.text};
        display: inline;
        font-weight: 600;
      }
      #content p:not([style*="color"]) {
        color: ${colors.text};
      }
      #content span:not([style*="color"]):not([class*="ql-"]) {
        color: ${colors.text};
      }
      #content h1, #content h2, #content h3 {
        margin: 0;
        padding: 0;
        font-weight: bold;
        display: inline;
      }
      #content h1:not([style*="color"]),
      #content h2:not([style*="color"]),
      #content h3:not([style*="color"]) {
        color: ${colors.text};
      }
      #content ul, #content ol {
        margin: 0;
        padding-left: 20px;
        display: inline-block;
      }
      #content li:not([style*="color"]) {
        color: ${colors.text};
      }
      #content strong {
        font-weight: bold;
      }
      #content em {
        font-style: italic;
      }
      #content u {
        text-decoration: underline;
      }
      #content s {
        text-decoration: line-through;
      }
    </style>
  </head>
  <body>
    <div id="content">${content}</div>
  </body>
</html>
    `;
  }, [html, colors.text, maxHeight, hasMaxHeight]);

  if (!html || html.trim() === '' || html === '<p></p>') {
    return null;
  }

  const webViewHeight = hasMaxHeight ? maxHeight! : 500;

  return (
    <View style={[styles.container, style, hasMaxHeight && { maxHeight }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={[styles.webview, { backgroundColor: 'transparent', minHeight: hasMaxHeight ? undefined : 24, height: webViewHeight }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flex: 1,
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
