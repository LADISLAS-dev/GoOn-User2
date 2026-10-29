import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEMES, useTheme } from '../context/ThemeContext';

const FIXED = { text: '#1A1A2E', muted: '#6B6472', border: '#E5D7F2', accent: '#8B2FC9', surface: '#FFFFFF', selected: '#F3E8FF' };

export default function ThemePicker({ language = 'en' }) {
  const { themeKey, setThemeKey } = useTheme();
  const isFrench = language === 'fr';
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isFrench ? 'Th\u00e8me' : 'Theme'}</Text>
      <Text style={styles.description}>
        {isFrench
          ? 'Change les couleurs du menu restaurant, du panier, du paiement et de Mes commandes.'
          : 'Changes the colors of the restaurant menu, cart, checkout and My orders.'}
      </Text>
      <View style={styles.grid}>
        {Object.entries(THEMES).map(([key, theme]) => {
          const selected = key === themeKey;
          const c = theme.colors;
          return (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setThemeKey(key)}
              activeOpacity={0.88}
            >
              <View style={[styles.preview, { backgroundColor: c.background, borderColor: c.border }]}>
                <View style={[styles.previewBar, { backgroundColor: c.surface }]} />
                <View style={styles.previewRow}>
                  <View style={[styles.previewDot, { backgroundColor: c.pink }]} />
                  <View style={[styles.previewLine, { backgroundColor: c.muted }]} />
                </View>
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                {selected ? '\u2713 ' : ''}{theme.label[isFrench ? 'fr' : 'en']}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 18, backgroundColor: FIXED.surface, borderWidth: 1, borderColor: FIXED.border, marginBottom: 16 },
  title: { color: FIXED.text, fontSize: 18, fontWeight: '800' },
  description: { color: FIXED.muted, fontSize: 13, marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { width: '31%', padding: 6, borderRadius: 14, borderWidth: 1, borderColor: FIXED.border },
  optionSelected: { borderColor: FIXED.accent, borderWidth: 2, backgroundColor: FIXED.selected },
  preview: { height: 62, borderRadius: 10, borderWidth: 1, padding: 6, justifyContent: 'space-between' },
  previewBar: { height: 12, borderRadius: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewDot: { width: 14, height: 14, borderRadius: 7 },
  previewLine: { flex: 1, height: 5, borderRadius: 3, opacity: 0.6 },
  label: { marginTop: 6, textAlign: 'center', color: FIXED.text, fontSize: 12, fontWeight: '600' },
  labelSelected: { color: FIXED.accent, fontWeight: '800' },
});
