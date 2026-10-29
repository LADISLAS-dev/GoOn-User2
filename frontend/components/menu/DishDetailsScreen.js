import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenModal, { PrimaryButton } from './ScreenModal';
import { ALLERGEN_ICONS, TAG_ICONS } from './theme';
import { useTheme } from '../../context/ThemeContext';

export default function DishDetailsScreen({ item, onClose, onAdd, priceLabel, copy, labels }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [customizing, setCustomizing] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setCustomizing(false);
    setNote('');
  }, [item?._id]);

  const badges = item ? [
    ...(item.tags || []).map((tag) => ({ key: `tag-${tag}`, icon: TAG_ICONS[tag], label: labels[tag] || tag })),
    ...(item.allergens || []).map((allergen) => ({ key: `allergen-${allergen}`, icon: ALLERGEN_ICONS[allergen], label: labels[allergen] || allergen })),
  ].filter((badge) => badge.icon) : [];

  return (
    <ScreenModal
      visible={!!item}
      onClose={onClose}
      title={copy.detail}
      footer={item ? (
        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>{copy.totalAmount}</Text>
            <Text style={styles.total}>{priceLabel}</Text>
          </View>
          <View style={styles.addWrap}><PrimaryButton label={copy.add} onPress={() => onAdd(item, note.trim())} /></View>
        </View>
      ) : null}
    >
      {item ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.heroImage} /> : <View style={[styles.heroImage, styles.heroPlaceholder]}><Text style={styles.placeholder}>🍽️</Text></View>}
            <View style={styles.heroCopy}>
              <Text style={styles.category} numberOfLines={1}>{item.category || copy.title}</Text>
              <Text style={styles.name} numberOfLines={4} ellipsizeMode="tail">{item.name}</Text>
              {badges.length ? (
                <View style={styles.badges}>
                  {badges.slice(0, 4).map((badge) => (
                    <View key={badge.key} style={styles.badge}>
                      <View style={styles.badgeCircle}><Text style={styles.badgeIcon}>{badge.icon}</Text></View>
                      <Text style={styles.badgeLabel} numberOfLines={1}>{badge.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            {item.description ? (
              <>
                <Text style={styles.sectionTitle}>{copy.ingredients}</Text>
                <Text style={styles.text}>{item.description}</Text>
              </>
            ) : null}
            <TouchableOpacity onPress={() => setCustomizing((value) => !value)} accessibilityRole="button" style={styles.customize}>
              <Text style={styles.customizeText}>{copy.customize} ›</Text>
            </TouchableOpacity>
            {customizing ? (
              <TextInput value={note} onChangeText={setNote} placeholder={copy.customizePlaceholder} placeholderTextColor={COLORS.muted} maxLength={200} multiline style={styles.noteInput} />
            ) : null}

            <Text style={styles.sectionTitle}>{copy.aboutProduct}</Text>
            <Text style={styles.text}>
              {item.prepTimeMinutes ? `${copy.prepLabel}: ${item.prepTimeMinutes} ${copy.minutes}\n` : ''}
              {item.calories ? `${item.calories} ${copy.kcal}\n` : ''}
              {(item.allergens || []).length ? `${copy.allergensLabel}: ${item.allergens.map((key) => labels[key] || key).join(', ')}\n` : ''}
              {item.bulkMinQuantity > 0 && item.bulkDiscountPercent > 0 ? copy.bulkOff(item.bulkDiscountPercent, item.bulkMinQuantity) : ''}
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </ScreenModal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  content: { paddingBottom: 24 },
  hero: { minHeight: 360, justifyContent: 'center', paddingVertical: 16 },
  heroImage: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%', borderTopLeftRadius: 200, borderBottomLeftRadius: 200, backgroundColor: COLORS.surfaceRaised },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  placeholder: { fontSize: 56 },
  heroCopy: { paddingLeft: 16, paddingRight: 8, width: '38%' },
  category: { color: COLORS.muted, fontSize: 13, marginTop: 60 },
  name: { color: COLORS.text, fontSize: 20, lineHeight: 26, fontWeight: '800', marginTop: 4 },
  badges: { gap: 12, marginTop: 16 },
  badge: { alignItems: 'flex-start', gap: 4 },
  badgeCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border },
  badgeIcon: { fontSize: 20 },
  badgeLabel: { color: COLORS.text, fontSize: 11, maxWidth: 90 },
  section: { paddingHorizontal: 16, marginTop: 70 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  text: { color: COLORS.muted, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  customize: { marginTop: 10, alignSelf: 'flex-start' },
  customizeText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  noteInput: { minHeight: 64, marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: COLORS.surfaceRaised, color: COLORS.text, fontSize: 13, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  totalLabel: { color: COLORS.muted, fontSize: 12 },
  total: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  addWrap: { flex: 1, maxWidth: 190 },
});
