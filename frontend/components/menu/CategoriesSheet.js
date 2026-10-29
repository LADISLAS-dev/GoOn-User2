import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function CategoriesSheet({ visible, onClose, title, categories, selected, onSelect, forYouLabel }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const options = [['', forYouLabel], ...categories.map((category) => [category, category])];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.side}><Text style={styles.close}>✕</Text></TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.side} />
          </View>
          <ScrollView>
            <View style={styles.grid}>
              {options.map(([value, label]) => (
                <TouchableOpacity
                  key={value || 'for-you'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected === value }}
                  style={[styles.pill, selected === value && styles.pillActive]}
                  onPress={() => { onSelect(value); onClose(); }}
                >
                  <Text style={[styles.pillText, selected === value && styles.pillTextActive]} numberOfLines={1}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { maxHeight: '75%', padding: 16, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  side: { width: 40 },
  close: { color: COLORS.pink, fontSize: 20, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  pill: { width: '48.5%', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.surfaceRaised },
  pillActive: { backgroundColor: COLORS.pink },
  pillText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '800' },
});
