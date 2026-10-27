import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CATEGORY_THEME_BY_ID = {
  '1': 'technology', '21': 'technology', '37': 'technology', '39': 'technology',
  '2': 'food',
  '3': 'beauty', '15': 'commerce',
  '4': 'health', '26': 'health', '34': 'health',
  '5': 'education', '16': 'education',
  '6': 'finance',
  '7': 'property', '14': 'property',
  '8': 'transport', '19': 'transport', '27': 'transport',
  '9': 'hospitality', '29': 'hospitality',
  '10': 'culture', '22': 'culture', '25': 'culture', '28': 'culture', '30': 'culture', '36': 'culture', '38': 'culture', '40': 'culture',
  '11': 'sports',
  '12': 'industry', '31': 'industry', '32': 'industry', '33': 'industry',
  '13': 'nature', '24': 'nature', '35': 'nature',
  '17': 'professional', '18': 'professional', '23': 'professional',
  '20': 'utilities',
};

const CATEGORY_THEMES = {
  technology: { accent: '#146C94', background: '#E7F5FB', shape: '#B9E3F0' },
  food: { accent: '#B94E1B', background: '#FFF1E6', shape: '#F7D0B5' },
  beauty: { accent: '#B83280', background: '#FCEAF4', shape: '#F1BED8' },
  health: { accent: '#23895A', background: '#EAF7EF', shape: '#BCE4CB' },
  education: { accent: '#6543A5', background: '#F2ECFA', shape: '#D5C6ED' },
  finance: { accent: '#946A12', background: '#FFF7DF', shape: '#EFDBA2' },
  property: { accent: '#246B85', background: '#EAF5F7', shape: '#B9DDE4' },
  transport: { accent: '#B53B34', background: '#FFF0EE', shape: '#F2C2BC' },
  hospitality: { accent: '#237A5B', background: '#E9F7EF', shape: '#B8E1CA' },
  culture: { accent: '#7A3E8E', background: '#F8ECFB', shape: '#E3C6EC' },
  sports: { accent: '#087E8B', background: '#E8F7F9', shape: '#B7E2E6' },
  industry: { accent: '#4B5563', background: '#F1F3F5', shape: '#D2D7DE' },
  nature: { accent: '#5B7D20', background: '#F2F7E5', shape: '#D4E3AD' },
  commerce: { accent: '#A83287', background: '#F9EDF7', shape: '#E8C2DF' },
  professional: { accent: '#30394D', background: '#EEF1F5', shape: '#C9D0DA' },
  utilities: { accent: '#B55F0B', background: '#FFF3E5', shape: '#F2D1A8' },
  default: { accent: '#5B4B8A', background: '#F1EEF8', shape: '#D5CDE8' },
};

export function getCompanyCategoryVisual(categoryId, categories = [], fallbackLabel = 'Business') {
  const id = String(categoryId || '').trim();
  const category = categories.find((item) => String(item?.id) === id);
  const themeKey = CATEGORY_THEME_BY_ID[id] || 'default';
  return {
    label: category?.label || fallbackLabel,
    icon: category?.icon || '🏢',
    ...CATEGORY_THEMES[themeKey],
  };
}

export function CompanyCategoryPhotoBadge({ visual }) {
  return (
    <View style={[styles.photoBadge, { backgroundColor: visual.accent }]}>
      <Text style={styles.photoBadgeIcon}>{visual.icon}</Text>
      <Text style={styles.photoBadgeLabel} numberOfLines={1}>{visual.label}</Text>
    </View>
  );
}

export function CompanyCategoryCover({ companyName, description, visual, fallbackDescription }) {
  return (
    <View style={[styles.cover, { backgroundColor: visual.background }]}>
      <View style={[styles.coverShape, { backgroundColor: visual.shape }]} />
      <View style={styles.coverContent}>
        <Text style={[styles.coverKicker, { color: visual.accent }]} numberOfLines={1}>
          {visual.label}
        </Text>
        <Text style={styles.coverName} numberOfLines={2}>{companyName}</Text>
        <Text style={styles.coverDescription} numberOfLines={2}>
          {description || fallbackDescription}
        </Text>
      </View>
      <View style={[styles.coverIconTile, { backgroundColor: visual.accent }]}>
        <Text style={styles.coverIcon}>{visual.icon}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 230,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  coverShape: {
    position: 'absolute',
    top: -34,
    right: -54,
    width: 170,
    height: 300,
    opacity: 0.72,
    transform: [{ rotate: '24deg' }],
  },
  coverContent: { flex: 1, zIndex: 1 },
  coverKicker: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  coverName: { color: '#17161D', fontSize: 23, lineHeight: 28, fontWeight: '800', flexShrink: 1 },
  coverDescription: { color: '#4F4B55', fontSize: 12, lineHeight: 17, marginTop: 7 },
  coverIconTile: {
    width: 82,
    height: 92,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    zIndex: 1,
  },
  coverIcon: { fontSize: 42 },
  photoBadge: {
    position: 'absolute',
    top: 14,
    left: 28,
    maxWidth: 300,
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoBadgeIcon: { color: '#FFFFFF', fontSize: 15 },
  photoBadgeLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flexShrink: 1 },
});