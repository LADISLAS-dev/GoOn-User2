import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenModal, { PrimaryButton } from './ScreenModal';
import RangeSlider from './RangeSlider';
import { ALLERGEN_ICONS, SORT_KEYS, TAG_ICONS } from './theme';
import { useTheme } from '../../context/ThemeContext';

const DISH_TYPES = ['popular', 'new', 'discounted'];
const NEGATIVE_KEYS = ['meat', 'fish', 'dairy', 'nuts', 'gluten', 'eggs', 'shellfish', 'soy', 'sesame'];
const POSITIVE_TAGS = ['vegetarian', 'vegan', 'spicy', 'sweet'];

function RangeBlock({ title, bounds, range, onChange, unit, copy, styles }) {
  const low = range?.[0] ?? bounds[0];
  const high = range?.[1] ?? bounds[1];
  const set = (nextLow, nextHigh) => onChange(nextLow <= bounds[0] && nextHigh >= bounds[1] ? null : [nextLow, nextHigh]);
  const parse = (text, fallback) => {
    const value = Number(String(text).replace(',', '.'));
    return Number.isFinite(value) ? Math.min(Math.max(value, bounds[0]), bounds[1]) : fallback;
  };
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <RangeSlider min={bounds[0]} max={bounds[1]} low={low} high={high} onChange={set} />
      <View style={styles.fromTo}>
        {[[copy.from, low, (text) => set(Math.min(parse(text, low), high), high)], [copy.to, high, (text) => set(low, Math.max(parse(text, high), low))]].map(([label, value, onEnd]) => (
          <View key={label} style={styles.fromToCol}>
            <Text style={styles.fromToLabel}>{label}</Text>
            <View style={styles.numberBox}>
              <TextInput style={styles.numberInput} defaultValue={String(value)} key={`${label}-${value}`} keyboardType="decimal-pad" onEndEditing={(event) => onEnd(event.nativeEvent.text)} />
              <Text style={styles.unit}>{unit}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FiltersScreen({
  visible, onClose, onReset, copy, labels,
  dishType, setDishType,
  priceBounds, priceRange, setPriceRange, priceUnit,
  calBounds, calRange, setCalRange,
  excluded, toggleExcluded, requiredTags, toggleTag,
  sortKey, setSortKey, currencyLabel, onOpenCurrency,
}) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <ScreenModal
      visible={visible}
      onClose={onClose}
      title={copy.filters}
      right={<TouchableOpacity onPress={onReset} accessibilityRole="button" accessibilityLabel={copy.reset}><Text style={styles.reset}>🗑</Text></TouchableOpacity>}
      footer={<PrimaryButton label={copy.apply} onPress={onClose} />}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.blockTitle}>{copy.dishType}</Text>
        <View style={styles.chips}>
          {DISH_TYPES.map((type) => (
            <TouchableOpacity key={type} accessibilityRole="button" accessibilityState={{ selected: dishType === type }} style={[styles.chip, dishType === type && styles.chipActive]} onPress={() => setDishType(dishType === type ? '' : type)}>
              <Text style={[styles.chipText, dishType === type && styles.chipTextActive]}>{copy.dishTypes[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {priceBounds[1] > priceBounds[0] ? (
          <RangeBlock title={copy.price} bounds={priceBounds} range={priceRange} onChange={setPriceRange} unit={priceUnit} copy={copy} styles={styles} />
        ) : null}
        {calBounds[1] > calBounds[0] ? (
          <RangeBlock title={copy.calories} bounds={calBounds} range={calRange} onChange={setCalRange} unit="kcal" copy={copy} styles={styles} />
        ) : null}

        <Text style={styles.blockTitle}>{copy.otherPreferences}</Text>
        <View style={styles.switchList}>
          {NEGATIVE_KEYS.map((key) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchIcon}>{ALLERGEN_ICONS[key] || TAG_ICONS[key]}</Text>
              <Text style={styles.switchLabel}>{copy.no} {labels[key]}</Text>
              <Switch value={excluded.includes(key)} onValueChange={() => toggleExcluded(key)} trackColor={{ true: COLORS.pink, false: COLORS.surfaceRaised }} thumbColor="#FFFFFF" />
            </View>
          ))}
          {POSITIVE_TAGS.map((key) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchIcon}>{TAG_ICONS[key]}</Text>
              <Text style={styles.switchLabel}>{labels[key]} · {copy.only}</Text>
              <Switch value={requiredTags.includes(key)} onValueChange={() => toggleTag(key)} trackColor={{ true: COLORS.pink, false: COLORS.surfaceRaised }} thumbColor="#FFFFFF" />
            </View>
          ))}
        </View>

        <Text style={styles.blockTitle}>{copy.sortTitle}</Text>
        <View style={styles.chips}>
          {SORT_KEYS.map((key) => (
            <TouchableOpacity key={key} accessibilityRole="button" style={[styles.chip, sortKey === key && styles.chipActive]} onPress={() => setSortKey(key)}>
              <Text style={[styles.chipText, sortKey === key && styles.chipTextActive]}>{labels[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.blockTitle}>{copy.currencyTitle}</Text>
        <TouchableOpacity style={styles.currencyButton} onPress={onOpenCurrency} accessibilityRole="button">
          <Text style={styles.chipText}>{currencyLabel} ▾</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenModal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  reset: { color: COLORS.pink, fontSize: 18 },
  block: { marginTop: 6 },
  blockTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.surfaceRaised },
  chipActive: { backgroundColor: COLORS.pink },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  fromTo: { flexDirection: 'row', gap: 12, marginTop: 8 },
  fromToCol: { flex: 1 },
  fromToLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  numberBox: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.surfaceRaised },
  numberInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  unit: { color: COLORS.muted, fontSize: 12, marginLeft: 6 },
  switchList: { borderRadius: 14, backgroundColor: COLORS.surface, paddingHorizontal: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  switchIcon: { fontSize: 18 },
  switchLabel: { flex: 1, color: COLORS.text, fontSize: 14 },
  currencyButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.pink, backgroundColor: COLORS.surfaceRaised },
});
