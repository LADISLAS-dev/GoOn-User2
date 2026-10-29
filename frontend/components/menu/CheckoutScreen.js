import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenModal, { PrimaryButton } from './ScreenModal';
import { useTheme } from '../../context/ThemeContext';

const TIP_OPTIONS = [0, 500, 1000, 1500];

export default function CheckoutScreen({
  visible, onClose, onClear, copy,
  fulfillmentType, tableNumber, setTableNumber,
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  tipRateBps, setTipRateBps,
  paymentMethod, onPickMode, onlineAvailable, onlineMethods, onPickMethod, onlineNote,
  isGuest, savedCards, savedCardsLoading, selectedSavedCardId, setSelectedSavedCardId,
  itemCount, tipLabel, waitingLabel, totalLabel, billedNote, error, isSubmitting, onSubmit,
}) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const online = paymentMethod !== 'pay_at_venue';
  const missingContact = !!error && !customerName.trim() && !customerPhone.trim() && (fulfillmentType === 'takeaway' || !tableNumber.trim());
  const inputStyle = [styles.input, missingContact && styles.inputInvalid];
  return (
    <ScreenModal
      visible={visible}
      onClose={onClose}
      title={copy.checkoutTitle}
      right={<TouchableOpacity onPress={onClear} accessibilityRole="button"><Text style={styles.clear}>{copy.clear}</Text></TouchableOpacity>}
      footer={(
        <View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{copy.total}</Text>
            <View style={styles.totalCol}>
              <Text style={styles.total}>{totalLabel}</Text>
              {billedNote ? <Text style={styles.billed}>{billedNote}</Text> : null}
            </View>
          </View>
          <PrimaryButton label={isSubmitting ? copy.submitting : (online ? copy.pay : copy.placeOrder)} onPress={onSubmit} disabled={isSubmitting} />
        </View>
      )}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {fulfillmentType === 'dine_in' ? (
          <>
            <Text style={styles.title}>{copy.tableHeading}</Text>
            <TextInput value={tableNumber} onChangeText={setTableNumber} placeholder={copy.table} placeholderTextColor={COLORS.muted} style={inputStyle} />
          </>
        ) : null}

        <Text style={styles.title}>{copy.contactHeading}</Text>
        {missingContact ? <Text style={styles.inlineError}>{error}</Text> : null}
        <TextInput value={customerName} onChangeText={setCustomerName} placeholder={copy.name} placeholderTextColor={COLORS.muted} style={inputStyle} />
        <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder={copy.phone} placeholderTextColor={COLORS.muted} keyboardType="phone-pad" style={inputStyle} />

        <Text style={styles.title}>{copy.tip}</Text>
        <View style={styles.tips}>
          {TIP_OPTIONS.map((rate) => (
            <TouchableOpacity key={rate} accessibilityRole="button" accessibilityState={{ selected: tipRateBps === rate }} style={[styles.tip, tipRateBps === rate && styles.tipActive]} onPress={() => setTipRateBps(rate)}>
              <Text style={[styles.tipText, tipRateBps === rate && styles.tipTextActive]}>{rate / 100} %</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>{copy.paymentMethod}</Text>
        <View style={styles.segment}>
          {[['app', copy.payInApp, !onlineAvailable], ['venue', copy.payAtRestaurant, false]].map(([mode, label, disabled]) => {
            const selected = (mode === 'venue') === !online;
            return (
              <TouchableOpacity key={mode} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected, disabled }} style={[styles.segmentOption, selected && styles.segmentActive, disabled && styles.disabled]} onPress={() => onPickMode(mode)}>
                <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {onlineNote ? <Text style={styles.hint}>{onlineNote}</Text> : null}
        {online && onlineMethods.length > 1 ? (
          <View style={styles.cards}>
            {onlineMethods.map(([method, label]) => (
              <TouchableOpacity key={method} accessibilityRole="button" style={[styles.card, paymentMethod === method && styles.cardActive]} onPress={() => onPickMethod(method)}>
                <Text style={styles.cardText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {paymentMethod === 'stripe' && !isGuest ? (
          <View style={styles.cards}>
            {savedCardsLoading ? <ActivityIndicator color={COLORS.pink} /> : null}
            {savedCards.map((card) => (
              <TouchableOpacity key={card.id} accessibilityRole="button" style={[styles.card, selectedSavedCardId === card.id && styles.cardActive]} onPress={() => setSelectedSavedCardId(card.id)}>
                <Text style={styles.cardText}>💳 *{card.last4}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity accessibilityRole="button" style={[styles.card, !selectedSavedCardId && styles.cardActive]} onPress={() => setSelectedSavedCardId('')}>
              <Text style={styles.cardText}>＋ {copy.newCard}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text style={styles.hint}>{online ? copy.secureCheckout : copy.payOnSite}</Text>

        <Text style={styles.title}>{copy.details}</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>{copy.itemsCount(itemCount)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>{copy.tipAmount}</Text><Text style={styles.detailValue}>{tipLabel}</Text></View>
        {waitingLabel ? <View style={styles.detailRow}><Text style={styles.detailLabel}>{copy.waitingTime}</Text><Text style={styles.detailValue}>{waitingLabel}</Text></View> : null}
      </ScrollView>
    </ScreenModal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  clear: { color: COLORS.pink, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  input: { minHeight: 46, paddingHorizontal: 14, marginBottom: 8, borderRadius: 12, backgroundColor: COLORS.surfaceRaised, color: COLORS.text, fontSize: 14 },
  inputInvalid: { borderWidth: 1, borderColor: '#EF476F' },
  inlineError: { color: '#FF9AAA', fontSize: 12, marginBottom: 8 },
  tips: { flexDirection: 'row', gap: 8 },
  tip: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  tipActive: { borderColor: COLORS.pink },
  tipText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  tipTextActive: { color: COLORS.text },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  segmentOption: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: COLORS.surfaceRaised },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: COLORS.text },
  disabled: { opacity: 0.45 },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  card: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  cardActive: { borderColor: COLORS.pink },
  cardText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { color: COLORS.muted, fontSize: 13 },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  error: { color: '#FF9AAA', fontSize: 12, marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  totalCol: { alignItems: 'flex-end' },
  total: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  billed: { color: COLORS.muted, fontSize: 11 },
});
