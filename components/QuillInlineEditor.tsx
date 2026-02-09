import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';

type QuillInlineEditorProps = {
  initialHtml?: string;
  placeholder?: string;
  onChange?: (text: string, html: string) => void;
  minHeight?: number;
};

export default function QuillInlineEditor({
  initialHtml = '',
  placeholder = 'Digite aqui...',
  onChange,
  minHeight = 160,
}: QuillInlineEditorProps) {
  const { isDarkMode, colors } = useTheme();
  const webviewRef = useRef<WebView | null>(null);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const COLOR_PALETTE = [
    '#000000', '#444444', '#666666', '#999999', '#C7C7CC',
    '#FF3B30', '#FF9500', '#FFCC02', '#34C759',
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D92'
  ];

  const html = useMemo(() => {
    const h = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link href="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css" rel="stylesheet" />
    <style>
      :root {
        --textColor: ${colors.text};
        --borderColor: ${colors.border};
        --surfaceColor: ${colors.surface};
        --toolbarColor: ${colors.text};
        --placeholderColor: ${getPlaceholderColor(isDarkMode)};
      }
      html, body, #root { height: 100%; margin: 0; padding: 0; }
      body { margin: 0; padding: 0; background: transparent; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
      #root { display: flex; flex-direction: column; min-height: 100%; position: relative; }
      #toolbar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        border: none;
        border-bottom: 1px solid var(--borderColor);
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
        padding: 4px 6px;
        gap: 8px;
        background: var(--surfaceColor);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        height: 40px;
        flex-shrink: 0;
        margin: 0;
      }
      .ql-toolbar.ql-snow { 
        border: none; 
        padding: 0; 
        background: transparent; 
        position: sticky; 
        top: 0; 
        left: 0; 
        right: 0; 
        z-index: 10000; 
        margin: 0;
        height: 40px;
      }
      .ql-toolbar.ql-snow .ql-formats { display: inline-flex; align-items: center; margin-right: 0 !important; gap: 8px; }
      .ql-toolbar.ql-snow button,
      .ql-toolbar.ql-snow .ql-picker { margin-right: 0 !important; }
      .ql-toolbar.ql-snow button { 
        width: 20px; height: 20px; 
        display: inline-flex; align-items: center; justify-content: center; 
        padding: 0; color: var(--toolbarColor);
      }
      .ql-toolbar.ql-snow .ql-picker { height: 20px; }
      .ql-toolbar.ql-snow .ql-picker-label { 
        height: 20px; line-height: 20px; 
        width: 20px; min-width: 20px; 
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0; 
      }
      .ql-toolbar.ql-snow .ql-picker.ql-color .ql-picker-label,
      .ql-toolbar.ql-snow .ql-picker.ql-background .ql-picker-label,
      .ql-toolbar.ql-snow .ql-picker.ql-align .ql-picker-label { 
        width: 20px; min-width: 20px; 
      }
      .ql-snow .ql-toolbar button svg,
      .ql-snow .ql-toolbar .ql-picker-label svg,
      .ql-snow .ql-toolbar .ql-picker-item svg { width: 20px; height: 20px; }
      .ql-snow .ql-stroke { stroke: currentColor !important; }
      .ql-snow .ql-fill { fill: currentColor !important; }
      .ql-picker { position: relative; z-index: 10001; color: var(--toolbarColor); }
      .ql-picker-options { z-index: 10002 !important; background: var(--surfaceColor); border-color: var(--borderColor); color: var(--textColor); }
      .ql-picker-item { color: var(--textColor); }
      .ql-container.ql-snow { 
        border: none; 
        flex: 1 1 auto; 
        position: relative; 
        z-index: 1; 
        background: transparent; 
        overflow: visible;
        display: flex;
        flex-direction: column;
        margin-top: 0;
        padding-top: 0;
      }
      #editor { 
        width: 100%;
        min-height: 200px;
        padding: 0; 
        position: relative; 
        z-index: 1; 
        color: var(--textColor); 
        caret-color: var(--textColor);
        overflow-y: visible;
        overflow-x: hidden;
        box-sizing: border-box;
        margin-top: 0;
      }
      .ql-snow .ql-editor, .ql-editor { 
        color: var(--textColor); 
        height: auto;
        min-height: 200px;
        overflow-y: visible;
        overflow-x: hidden;
        padding: 8px;
        box-sizing: border-box;
        padding-bottom: 20px;
        margin-top: 0;
      }
      .ql-editor p:not([style*="color"]), 
      .ql-editor ul:not([style*="color"]), 
      .ql-editor ol:not([style*="color"]), 
      .ql-editor li:not([style*="color"]), 
      .ql-editor h1:not([style*="color"]), 
      .ql-editor h2:not([style*="color"]), 
      .ql-editor h3:not([style*="color"]), 
      .ql-editor blockquote:not([style*="color"]) { color: var(--textColor); }
      .ql-editor span:not([style*="color"]):not([class*="ql-"]) { color: var(--textColor); }
      .ql-editor.ql-blank::before { color: var(--placeholderColor) !important; }
      .ql-editor p {
        margin: 0 0 8px 0;
        padding: 0;
        min-height: 1em;
      }
      .ql-editor p:last-child {
        margin-bottom: 0;
      }
      .ql-editor p:empty {
        margin: 0;
        padding: 0;
        height: 1em;
      }
      .ql-editor ul, .ql-editor ol {
        margin: 0 0 8px 0;
        padding-left: 20px;
      }
      .ql-editor ul:last-child, .ql-editor ol:last-child {
        margin-bottom: 0;
      }
      .ql-editor * { 
        max-height: none !important; 
        position: static !important; 
        z-index: auto !important; 
      }
      .ql-editor [style*="max-height"], .ql-editor [style*="position"] { 
        max-height: none !important; 
        position: static !important; 
      }
      .ql-editor [style*="overflow"] {
        overflow: visible !important;
      }
      .ql-more { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
      .ql-editor img { max-width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <div id="root">
      <div id="toolbar">
        <span class="ql-formats">
          <button class="ql-undo" title="Desfazer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="ql-redo" title="Refazer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="ql-clean"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-more" title="Mais">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </span>
      </div>
      <div id="editor"></div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js"></script>
    <script>
      var editor = new Quill('#editor', {
        theme: 'snow',
        placeholder: ${JSON.stringify(placeholder)},
        modules: {
          toolbar: '#toolbar',
          history: { delay: 500, maxStack: 200, userOnly: true }
        }
      });
      document.querySelector('.ql-undo').addEventListener('click', function() { editor.history.undo(); });
      document.querySelector('.ql-redo').addEventListener('click', function() { editor.history.redo(); });
      function postChange() {
        try {
          const payload = { type: 'change', html: editor.root.innerHTML, text: editor.getText() };
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } catch (e) {}
      }
      editor.on('text-change', function() { postChange(); });
      ['div','p','span'].forEach(function(tag){
        editor.clipboard.addMatcher(tag, function(node, delta) {
          try { if (node && node.removeAttribute) node.removeAttribute('style'); } catch(e) {}
          return delta;
        });
      });
      editor.clipboard.addMatcher(Node.ELEMENT_NODE, function(node, delta) {
        try { if (node && node.removeAttribute) node.removeAttribute('style'); } catch(e) {}
        return delta;
      });
      function setHTML(html) {
        try {
          const delta = editor.clipboard.convert(html || '');
          editor.setContents(delta, 'silent');
        } catch(e) {}
      }
      function applyFormat(key, value) {
        try {
          var range = editor.getSelection(true);
          if (range && range.length > 0) {
            editor.formatText(range.index, range.length, key, value === null ? false : value, 'user');
          } else {
            editor.format(key, value === null ? false : value, 'user');
          }
        } catch(e) {}
      }
      function applyList(value) {
        try { editor.format('list', value); } catch(e) {}
      }
      function applyAlign(value) {
        try { editor.format('align', value || false); } catch(e) {}
      }
      function applyHeader(value) {
        try {
          var range = editor.getSelection(true);
          if (range && range.length > 0) {
            editor.formatText(range.index, range.length, 'header', value === null ? false : value, 'user');
          } else {
            editor.format('header', value === null ? false : value, 'user');
          }
        } catch(e) {}
      }
      function applySize(value) {
        try {
          var range = editor.getSelection(true);
          if (range && range.length > 0) {
            editor.formatText(range.index, range.length, 'size', value === null ? false : value, 'user');
          } else {
            editor.format('size', value === null ? false : value, 'user');
          }
        } catch(e) {}
      }
      function doUndo(){ try { editor.history.undo(); } catch(e) {} }
      function doRedo(){ try { editor.history.redo(); } catch(e) {} }
      function doClean(){
        try {
          var range = editor.getSelection();
          if (range) editor.removeFormat(range.index, range.length);
        } catch(e) {}
      }
      function handleRNMessage(data) {
        try {
          const msg = JSON.parse(data || '{}');
          if (msg.type === 'setHTML') { setHTML(msg.html || ''); }
          if (msg.type === 'format') { applyFormat(msg.key, msg.value ?? null); }
          if (msg.type === 'list') { applyList(msg.value); }
          if (msg.type === 'align') { applyAlign(msg.value); }
          if (msg.type === 'header') { applyHeader(msg.value ?? null); }
          if (msg.type === 'size') { applySize(msg.value ?? null); }
          if (msg.type === 'undo') { doUndo(); }
          if (msg.type === 'redo') { doRedo(); }
          if (msg.type === 'clean') { doClean(); }
        } catch (e) {}
      }
      (function() {
        var btn = document.querySelector('.ql-more');
        if (btn) {
          btn.addEventListener('click', function(e){
            e.preventDefault(); e.stopPropagation();
            try {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openMore' }));
            } catch (err) {}
          });
        }
      })();
      document.addEventListener('message', function(e){ handleRNMessage(e.data); });
      window.addEventListener('message', function(e){ handleRNMessage(e.data); });
    </script>
  </body>
</html>
    `;
    return h;
  }, [colors, isDarkMode, placeholder]);

  return (
    <View style={[styles.container, { minHeight }]}>
      <WebView
        ref={(r) => { webviewRef.current = r; }}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => {
          try {
            const payload = JSON.stringify({ type: 'setHTML', html: initialHtml || '' })
              .replace(/\\\\/g, '\\\\\\\\')
              .replace(/\u2028|\u2029/g, '');
            webviewRef.current?.postMessage(payload);
          } catch {}
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data || '{}');
            if (data.type === 'change') {
              onChange?.((data.text || '').replace(/\\s+/g, ' ').trim(), data.html || '');
            } else if (data.type === 'openMore') {
              setShowMoreModal(true);
            }
          } catch {}
        }}
        style={{ backgroundColor: 'transparent', flex: 1, minHeight }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        bounces={true}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
      />
      <Modal
        visible={showMoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Mais Ferramentas</Text>
            <ScrollView>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Cor do texto</Text>
              <View style={styles.colorsRow}>
                {COLOR_PALETTE.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderColor: colors.border }]}
                    onPress={() => {
                      webviewRef.current?.postMessage(JSON.stringify({ type: 'format', key: 'color', value: c }));
                    }}
                  />
                ))}
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Destaque</Text>
              <View style={styles.colorsRow}>
                {COLOR_PALETTE.map(c => (
                  <TouchableOpacity
                    key={'bg-'+c}
                    style={[styles.colorDot, { backgroundColor: c, borderColor: colors.border }]}
                    onPress={() => {
                      webviewRef.current?.postMessage(JSON.stringify({ type: 'format', key: 'background', value: c }));
                    }}
                  />
                ))}
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Títulos</Text>
              <View style={styles.optionRow}>
                {[{label:'Normal', value:null},{label:'H1',value:1},{label:'H2',value:2},{label:'H3',value:3}].map(opt => (
                  <TouchableOpacity
                    key={'hdr-'+String(opt.value)}
                    style={[styles.optionChip, { borderColor: colors.border }]}
                    onPress={() => webviewRef.current?.postMessage(JSON.stringify({ type: 'header', value: opt.value }))}
                  >
                    <Text style={{ color: colors.text }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Tamanho</Text>
              <View style={styles.optionRow}>
                {[{label:'Peq',value:'small'},{label:'Normal',value:null},{label:'Grande',value:'large'},{label:'Huge',value:'huge'}].map(opt => (
                  <TouchableOpacity
                    key={'size-'+String(opt.value)}
                    style={[styles.optionChip, { borderColor: colors.border }]}
                    onPress={() => webviewRef.current?.postMessage(JSON.stringify({ type: 'size', value: opt.value }))}
                  >
                    <Text style={{ color: colors.text }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Listas</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionChip, { borderColor: colors.border }]}
                  onPress={() => webviewRef.current?.postMessage(JSON.stringify({ type: 'list', value: 'bullet' }))}
                >
                  <Text style={{ color: colors.text }}>Marcadores</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionChip, { borderColor: colors.border }]}
                  onPress={() => webviewRef.current?.postMessage(JSON.stringify({ type: 'list', value: 'ordered' }))}
                >
                  <Text style={{ color: colors.text }}>Numerada</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Alinhamento</Text>
              <View style={styles.optionRow}>
                {[{label:'Esq',value:''},{label:'Centro',value:'center'},{label:'Dir',value:'right'},{label:'Just',value:'justify'}].map(opt => (
                  <TouchableOpacity
                    key={'al-'+opt.label}
                    style={[styles.optionChip, { borderColor: colors.border }]}
                    onPress={() => webviewRef.current?.postMessage(JSON.stringify({ type: 'align', value: opt.value }))}
                  >
                    <Text style={{ color: colors.text }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setShowMoreModal(false)}>
                <Text style={{ color: colors.text }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 8,
    flex: 1,
    minHeight: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

