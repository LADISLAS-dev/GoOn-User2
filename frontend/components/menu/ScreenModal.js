import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function ScreenModal({ visible, onClose, title, right = null, children, footer = null }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.side} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={[styles.side, styles.sideRight]}>{right}</View>
          </View>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[styles.primary, disabled && styles.disabled]}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  side: { width: 64 },
  sideRight: { alignItems: 'flex-end' },
  close: { color: COLORS.pink, fontSize: 20, fontWeight: '700' },
  title: { flex: 1, color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  body: { flex: 1 },
  footer: { padding: 16, backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: COLORS.pink },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
