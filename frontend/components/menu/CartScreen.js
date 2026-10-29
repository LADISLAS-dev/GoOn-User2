import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenModal, { PrimaryButton } from './ScreenModal';
import { useTheme } from '../../context/ThemeContext';

export default function CartScreen({ visible, onClose, onClear, cart, linePrice, onQuantity, onNote, waitingLabel, discountLabel, subtotalLabel, onCheckout, copy }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [editingId, setEditingId] = useState('');

  const confirmClear = () => {
    if (!cart.length) return;
    Alert.alert(copy.clearCartTitle, '', [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.clear, style: 'destructive', onPress: onClear },
    ]);
  };

  return (
    <ScreenModal
      visible={visible}
      onClose={onClose}
      title={copy.cart}
      right={<TouchableOpacity onPress={confirmClear} accessibilityRole="button" accessibilityLabel={copy.clear}><Text style={styles.trash}>🗑</Text></TouchableOpacity>}
      footer={cart.length ? (
        <View>
          {waitingLabel ? <View style={styles.row}><Text style={styles.rowLabel}>{copy.waitingTime}</Text><Text style={styles.rowValueStrong}>{waitingLabel}</Text></View> : null}
          <View style={styles.row}><Text style={styles.rowLabel}>{copy.discount}</Text><Text style={styles.rowValue}>{discountLabel}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>{copy.subtotal}</Text><Text style={styles.rowValue}>{subtotalLabel}</Text></View>
          <View style={styles.cta}><PrimaryButton label={copy.checkout} onPress={onCheckout} /></View>
        </View>
      ) : null}
    >
      {!cart.length ? (
        <Text style={styles.empty}>{copy.emptyCart}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {cart.map(({ item, quantity, note }) => {
            const id = String(item._id);
            return (
              <View key={id} style={styles.line}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.placeholder}>🍽️</Text></View>}
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.note} numberOfLines={2}>{note || copy.noChanges}</Text>
                  <TouchableOpacity onPress={() => setEditingId(editingId === id ? '' : id)} accessibilityRole="button">
                    <Text style={styles.change}>{copy.change}</Text>
                  </TouchableOpacity>
                  {editingId === id ? (
                    <TextInput value={note || ''} onChangeText={(text) => onNote(id, text)} placeholder={copy.customizePlaceholder} placeholderTextColor={COLORS.muted} maxLength={200} style={styles.noteInput} />
                  ) : null}
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => onQuantity(id, -1)} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="−"><Text style={styles.stepText}>−</Text></TouchableOpacity>
                    <Text style={styles.qty}>{quantity}</Text>
                    <TouchableOpacity onPress={() => onQuantity(id, 1)} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="+"><Text style={styles.stepText}>＋</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.price}>{linePrice(item, quantity)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenModal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  trash: { color: COLORS.pink, fontSize: 18 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
  image: { width: 84, height: 84, borderRadius: 42 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  placeholder: { fontSize: 28 },
  copy: { flex: 1 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  note: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  change: { color: COLORS.pink, fontSize: 12, fontWeight: '700', marginTop: 3 },
  noteInput: { marginTop: 6, paddingHorizontal: 10, height: 38, borderRadius: 8, backgroundColor: COLORS.surfaceRaised, color: COLORS.text, fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  stepButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.pink },
  stepText: { color: COLORS.pink, fontSize: 16, lineHeight: 19 },
  qty: { color: COLORS.text, fontSize: 14, fontWeight: '800', minWidth: 14, textAlign: 'center' },
  price: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: COLORS.muted, fontSize: 13 },
  rowValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  rowValueStrong: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  cta: { marginTop: 12 },
});
