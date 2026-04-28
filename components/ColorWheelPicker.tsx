import React, { useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';

type ColorWheelPickerProps = {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  title?: string;
};

const PRESET_COLORS = [
  '#000000', '#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF',
  '#7F1D1D', '#991B1B', '#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2',
  '#7C2D12', '#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FFEDD5',
  '#78350F', '#92400E', '#B45309', '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7',
  '#365314', '#3F6212', '#4D7C0F', '#65A30D', '#84CC16', '#A3E635', '#BEF264', '#ECFCCB',
  '#14532D', '#166534', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#DCFCE7',
  '#164E63', '#155E75', '#0E7490', '#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#CFFAFE',
  '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE',
  '#312E81', '#4338CA', '#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF',
  '#581C87', '#6B21A8', '#7E22CE', '#9333EA', '#A855F7', '#C084FC', '#D8B4FE', '#F3E8FF',
  '#831843', '#9D174D', '#BE185D', '#DB2777', '#EC4899', '#F472B6', '#F9A8D4', '#FCE7F3',
];

const normalizeHex = (raw: string): string | null => {
  const cleaned = raw.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  return null;
};

export default function ColorWheelPicker({ value, onChange, label = 'Cor', title = 'Selecionar cor' }: ColorWheelPickerProps) {
  const { isDarkMode, colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [hexInput, setHexInput] = useState((value || '#007AFF').replace(/^#/, '').toUpperCase());
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const modalTranslateY = useState(new Animated.Value(0))[0];

  const selectedColor = value || '#007AFF';

  const groupedColors = useMemo(() => PRESET_COLORS, []);

  const applyHex = () => {
    const parsed = normalizeHex(hexInput);
    if (!parsed) return;
    onChange(parsed);
    setHexInput(parsed.replace('#', ''));
    Keyboard.dismiss();
    setVisible(false);
  };

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      Animated.timing(modalTranslateY, {
        toValue: -70,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [modalTranslateY]);

  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.accent }]}
        onPress={() => {
          setHexInput((selectedColor || '#007AFF').replace(/^#/, '').toUpperCase());
          setVisible(true);
        }}
      >
        <View style={[styles.preview, { backgroundColor: selectedColor }]} />
        <Text style={[styles.triggerText, { color: colors.text }]}>{selectedColor.toUpperCase()}</Text>
        <MaterialIcons name="palette" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modal,
              {
                backgroundColor: colors.surface,
                transform: [{ translateY: keyboardVisible ? modalTranslateY : 0 }],
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

            <View style={styles.wheel}>
              {groupedColors.map((color) => {
                const selected = color.toUpperCase() === selectedColor.toUpperCase();
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.swatch,
                      { backgroundColor: color, borderColor: selected ? colors.text : 'transparent' },
                    ]}
                    onPress={() => {
                      onChange(color);
                      setHexInput(color.replace('#', ''));
                      Keyboard.dismiss();
                      setVisible(false);
                    }}
                  >
                    {selected && <MaterialIcons name="check" size={14} color={color === '#FFFFFF' ? '#111827' : '#FFFFFF'} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.hexRow, { borderColor: colors.border, backgroundColor: colors.accent }]}>
              <Text style={[styles.hash, { color: colors.text }]}>#</Text>
              <TextInput
                value={hexInput}
                onFocus={() => {
                  // No-op: handled by keyboard listeners to move modal up responsively
                }}
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
                  setHexInput(cleaned);

                  // Fluxo direto: HEX válido já aplica, fecha modal e retorna para preview
                  if (cleaned.length === 6) {
                    const parsed = normalizeHex(cleaned);
                    if (parsed) {
                      onChange(parsed);
                      Keyboard.dismiss();
                      setVisible(false);
                    }
                  }
                }}
                placeholder="RRGGBB"
                placeholderTextColor={getPlaceholderColor(isDarkMode)}
                style={[styles.hexInput, { color: colors.text }]}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.border }]}
              onPress={() => {
                Keyboard.dismiss();
                setVisible(false);
              }}
            >
              <Text style={{ color: colors.text }}>Fechar</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  preview: { width: 22, height: 22, borderRadius: 11, marginRight: 10 },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '96%', maxHeight: '92%', borderRadius: 14, padding: 14 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  wheel: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexRow: {
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 10,
  },
  hash: { fontSize: 16, fontWeight: '700' },
  hexInput: { flex: 1, fontSize: 16, letterSpacing: 1.2 },
  closeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
});

