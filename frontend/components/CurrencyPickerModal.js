import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DISPLAY_CURRENCIES, loadRates } from '../utils/currency';
import { useTheme } from '../context/ThemeContext';

function currencyName(code, locale) {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) || '';
  } catch (_) {
    return '';
  }
}

export default function CurrencyPickerModal({ visible, onClose, onSelect, selected = '', locale = 'en', title, searchPlaceholder, originalLabel = '' }) {
  const [codes, setCodes] = useState(DISPLAY_CURRENCIES);
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    loadRates().then((rates) => {
      if (active && rates) setCodes(Object.keys(rates).sort());
    });
    return () => { active = false; };
  }, [visible]);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = codes.map((code) => ({ code, name: currencyName(code, locale) }));
    const filtered = needle ? all.filter((entry) => `${entry.code} ${entry.name}`.toLowerCase().includes(needle)) : all;
    return originalLabel && !needle ? [{ code: '', name: originalLabel }, ...filtered] : filtered;
  }, [codes, query, locale, originalLabel]);

  const choose = (code) => {
    onSelect(code);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topline}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"><Text style={styles.close}>×</Text></TouchableOpacity>
          </View>
          <TextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder} placeholderTextColor={colors.muted} style={styles.search} autoCapitalize="none" autoCorrect={false} />
          <FlatList
            data={options}
            keyExtractor={(entry) => entry.code || 'original'}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.row, selected === item.code && styles.rowActive]} onPress={() => choose(item.code)} accessibilityRole="button">
                <Text style={styles.code}>{item.code || '—'}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {selected === item.code ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (C) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { maxHeight: '85%', minHeight: '55%', padding: 17, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { flex: 1, color: C.text, fontSize: 17, fontWeight: '800' },
  close: { color: C.muted, fontSize: 25, paddingHorizontal: 5 },
  search: { height: 42, paddingHorizontal: 12, marginBottom: 8, borderRadius: 12, backgroundColor: C.surfaceRaised, color: C.text, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  rowActive: { backgroundColor: C.tint },
  code: { width: 48, color: C.text, fontSize: 14, fontWeight: '800' },
  name: { flex: 1, color: C.muted, fontSize: 13 },
  check: { color: C.pinkSoft, fontSize: 16, fontWeight: '800' },
});
