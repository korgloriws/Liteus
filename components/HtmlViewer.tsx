import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../services/ThemeContext';

interface HtmlViewerProps {
  html?: string;
  style?: any;
  /** Altura máxima em px. Se não informado e autoHeight=true, a altura segue o conteúdo (card proporcional). */
  maxHeight?: number;
  /** Quando true e sem maxHeight, o WebView usa a altura do conteúdo (card formatado, texto inteiro). */
  autoHeight?: boolean;
}

export default function HtmlViewer({ html = '', style, maxHeight, autoHeight = false }: HtmlViewerProps) {
  const { isDarkMode, colors } = useTheme();
  const hasMaxHeight = maxHeight != null && maxHeight > 0;
  const useAutoHeight = !hasMaxHeight && autoHeight;
  const INITIAL_AUTO_HEIGHT = 120;
  const [contentHeight, setContentHeight] = useState(useAutoHeight ? INITIAL_AUTO_HEIGHT : 24);

  useEffect(() => {
    if (!useAutoHeight) return;
    setContentHeight(INITIAL_AUTO_HEIGHT);
  }, [html, useAutoHeight]);

  const htmlContent = useMemo(() => {
    const content = html || '<p></p>';
    const contentMaxHeightCss = hasMaxHeight ? `max-height: ${maxHeight}px; overflow: hidden;` : '';
    const reportHeightScript = useAutoHeight
      ? `
    (function reportHeight() {
      var el = document.getElementById('content');
      if (!el || !window.ReactNativeWebView) return;
      var h = Math.ceil(el.scrollHeight);
      if (h < 1) h = 24;
      h = Math.min(Math.max(h, 24), 1200);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
    })();
    if (document.readyState === 'complete') reportHeight();
    else window.addEventListener('load', reportHeight);
    setTimeout(reportHeight, 0);
    setTimeout(reportHeight, 80);
    setTimeout(reportHeight, 250);
    `
      : '';
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
        word-break: break-word;
        font-size: 16px;
        font-weight: 600;
        width: 100%;
        box-sizing: border-box;
        ${contentMaxHeightCss}
      }
      #content p {
        margin: 0 0 4px 0;
        padding: 0;
        color: ${colors.text};
        display: block;
        font-weight: 600;
      }
      #content p:last-child {
        margin-bottom: 0;
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
    <script>${reportHeightScript}</script>
  </body>
</html>
    `;
  }, [html, colors.text, maxHeight, hasMaxHeight, useAutoHeight]);

  if (!html || html.trim() === '' || html === '<p></p>') {
    return null;
  }

  const webViewHeight = hasMaxHeight ? maxHeight! : (useAutoHeight ? contentHeight : 80);

  const handleMessage = (event: { nativeEvent: { data?: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data || '{}');
      if (data.type === 'height' && typeof data.value === 'number' && useAutoHeight) {
        setContentHeight(Math.max(24, Math.min(data.value, 2000)));
      }
    } catch {}
  };

  return (
    <View style={[styles.container, style, hasMaxHeight && { maxHeight }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={[styles.webview, { backgroundColor: 'transparent', minHeight: useAutoHeight ? 24 : undefined, height: webViewHeight }]}
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
