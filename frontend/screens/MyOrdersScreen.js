import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { getMyOrderReceipt, getMyOrders } from '../services/api';
import { shareReceipt } from '../utils/receipt';

const STEPS = ['draft', 'confirmed', 'ready', 'fulfilled'];
const POLL_MS = 15000;

function formatMoney(minor, currency, locale) {
  const code = currency || 'USD';
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format((minor || 0) / (10 ** digits));
  } catch (_) {
    return `${((minor || 0) / 100).toFixed(2)} ${code}`;
  }
}

export default function MyOrdersScreen() {
  const { colors: theme } = useTheme();
  const COLORS = useMemo(() => ({
    background: theme.background, surface: theme.surface, border: theme.border, text: theme.text, muted: theme.muted,
    accent: theme.pink, soft: theme.surfaceRaised, success: theme.green, successSoft: `${theme.green}2E`, danger: '#E0556B',
  }), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const navigation = useNavigation();
  const { isGuest } = useUser();
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [invoiceBusyId, setInvoiceBusyId] = useState('');
  const timer = useRef(null);

  const copy = isFrench
    ? {
        title: 'Mes commandes', empty: 'Aucune commande pour le moment.', signIn: 'Connecte-toi pour suivre tes commandes.',
        error: 'Impossible de charger tes commandes.', back: 'Retour',
        draft: 'Reçue', confirmed: 'Acceptée', ready: 'Prête', fulfilled: 'Servie', cancelled: 'Annulée',
        readyBanner: 'Ta commande est prête !', readyTakeaway: 'Tu peux venir la récupérer.', readyDineIn: 'Elle arrive à ta table.',
        eta: 'Temps estimé', minutes: 'min', table: 'Table', takeaway: 'À emporter', dineIn: 'Sur place',
        pickup: 'Retrait', delivery: 'Livraison', deliveryAddress: 'Adresse', deliveryFee: 'Frais de livraison',
        readyPickup: 'Ta commande est prête au retrait.', readyDelivery: 'Ta commande est en cours de livraison.',
        retailReadyStatus: 'En livraison', retailPickupStatus: 'Prête au retrait', retailFulfilled: 'Remise',
        total: 'Total', payment: 'Paiement', paid: 'Payée', unpaid: 'À payer au restaurant', authorized: 'Autorisée',
        retailUnpaid: 'Paiement en attente',
        invoice: 'Voir ma facture', invoiceError: 'Impossible de générer la facture.',
        invoiceServerOutdated: 'Facture indisponible : le serveur doit être redémarré avec la dernière version.',
      }
    : {
        title: 'My orders', empty: 'No orders yet.', signIn: 'Sign in to track your orders.',
        error: 'Unable to load your orders.', back: 'Back',
        draft: 'Received', confirmed: 'Accepted', ready: 'Ready', fulfilled: 'Served', cancelled: 'Cancelled',
        readyBanner: 'Your order is ready!', readyTakeaway: 'You can come and pick it up.', readyDineIn: 'It is coming to your table.',
        eta: 'Estimated time', minutes: 'min', table: 'Table', takeaway: 'Take away', dineIn: 'Eat in',
        pickup: 'Pickup', delivery: 'Delivery', deliveryAddress: 'Address', deliveryFee: 'Delivery fee',
        readyPickup: 'Your order is ready for pickup.', readyDelivery: 'Your order is out for delivery.',
        retailReadyStatus: 'Out for delivery', retailPickupStatus: 'Ready for pickup', retailFulfilled: 'Handed over',
        total: 'Total', payment: 'Payment', paid: 'Paid', unpaid: 'Pay at the restaurant', authorized: 'Authorized',
        retailUnpaid: 'Payment pending',
        invoice: 'View my invoice', invoiceError: 'Unable to generate the invoice.',
        invoiceServerOutdated: 'Invoice unavailable: the server must be restarted with the latest version.',
      };

  const load = useCallback(async ({ silent = false } = {}) => {
    if (isGuest) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      setOrders(await getMyOrders());
      setError('');
    } catch (_) {
      setError(copy.error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, isFrench]);

  useFocusEffect(useCallback(() => {
    load();
    timer.current = setInterval(() => load({ silent: true }), POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]));

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const openInvoice = async (order) => {
    if (invoiceBusyId) return;
    setInvoiceBusyId(String(order._id));
    setError('');
    try {
      await shareReceipt(await getMyOrderReceipt(order._id), activeLanguage);
    } catch (invoiceError) {
      const status = invoiceError?.response?.status;
      console.warn('Invoice generation failed:', status, invoiceError?.message);
      setError(
        invoiceError?.response?.data?.error
          || (status === 404 ? copy.invoiceServerOutdated : `${copy.invoiceError} (${invoiceError?.message || status || '?'})`),
      );
    } finally {
      setInvoiceBusyId('');
    }
  };

  const renderOrder = ({ item }) => {
    const cancelled = item.status === 'cancelled';
    const stepIndex = STEPS.indexOf(item.status);
    const isReady = item.status === 'ready';
    const retailOrder = item.channel === 'retail_app';
    const paymentLabel = item.paymentStatus === 'paid' ? copy.paid : item.paymentStatus === 'authorized' ? copy.authorized : retailOrder ? copy.retailUnpaid : copy.unpaid;
    const statusText = retailOrder && item.status === 'fulfilled'
      ? copy.retailFulfilled
      : retailOrder && item.status === 'ready'
        ? item.fulfillmentType === 'delivery' ? copy.retailReadyStatus : copy.retailPickupStatus
        : copy[item.status] || item.status;
    const fulfillmentLabel = retailOrder
      ? item.fulfillmentType === 'delivery' ? copy.delivery : copy.pickup
      : item.fulfillmentType === 'takeaway' ? copy.takeaway : copy.dineIn;
    return (
      <View style={[styles.card, isReady && styles.cardReady]}>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text style={styles.company} numberOfLines={1}>{item.companyName || 'GoOn'}</Text>
            <Text style={styles.number}>{item.orderNumber} · {fulfillmentLabel}{item.tableNumber ? ` · ${copy.table} ${item.tableNumber}` : ''}</Text>
          </View>
          <Text style={[styles.badge, cancelled && styles.badgeCancelled, isReady && styles.badgeReady]}>{statusText}</Text>
        </View>

        {isReady ? (
          <View style={styles.readyBox}>
            <Text style={styles.readyTitle}>{retailOrder ? item.fulfillmentType === 'delivery' ? copy.delivery : copy.pickup : copy.readyBanner}</Text>
            <Text style={styles.readyText}>
              {retailOrder
                ? item.fulfillmentType === 'delivery' ? copy.readyDelivery : copy.readyPickup
                : item.fulfillmentType === 'takeaway' ? copy.readyTakeaway : copy.readyDineIn}
            </Text>
          </View>
        ) : null}

        {retailOrder && item.fulfillmentType === 'delivery' ? (
          <View style={styles.deliveryDetails}>
            <Text style={styles.deliveryDetailText}>{copy.deliveryAddress}: {item.deliveryAddress}</Text>
            <Text style={styles.deliveryDetailText}>{copy.deliveryFee}: {formatMoney(item.deliveryFeeMinor || 0, item.currency, locale)}</Text>
          </View>
        ) : null}

        {!cancelled ? (
          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.dot, index <= stepIndex && styles.dotDone]} />
                <Text style={[styles.stepLabel, index <= stepIndex && styles.stepLabelDone]} numberOfLines={1}>{retailOrder && step === 'fulfilled' ? copy.retailFulfilled : retailOrder && step === 'ready' ? item.fulfillmentType === 'delivery' ? copy.retailReadyStatus : copy.retailPickupStatus : copy[step]}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.lines}>
          {(item.lines || []).map((line) => (
            <View key={String(line._id || line.productId)}>
              <View style={styles.line}>
                <Text style={styles.lineName} numberOfLines={1}>{line.quantity} × {line.productName}</Text>
                <Text style={styles.lineTotal}>{formatMoney(line.lineTotalMinor, item.currency, locale)}</Text>
              </View>
              {line.note ? <Text style={styles.note} numberOfLines={2}>{line.note}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.muted}>{copy.payment}: {paymentLabel}</Text>
          <Text style={styles.total}>{copy.total} {formatMoney(item.totalMinor, item.currency, locale)}</Text>
        </View>
        {item.estimatedMinutes > 0 && ['draft', 'confirmed'].includes(item.status) ? (
          <Text style={styles.muted}>{copy.eta}: {item.estimatedMinutes} {copy.minutes}</Text>
        ) : null}
        {(retailOrder ? ['confirmed', 'fulfilled'] : ['confirmed', 'ready', 'fulfilled']).includes(item.status) ? (
          <TouchableOpacity style={styles.invoiceButton} onPress={() => openInvoice(item)} disabled={!!invoiceBusyId} accessibilityRole="button">
            {invoiceBusyId === String(item._id) ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.invoiceText}>🧾 {copy.invoice}</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={copy.back}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>{copy.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isGuest ? <Text style={styles.empty}>{copy.signIn}</Text> : null}
      {!isGuest && isLoading ? <ActivityIndicator color={COLORS.accent} style={styles.loading} /> : null}
      {!isGuest && !isLoading ? (
        <FlatList
          data={orders}
          keyExtractor={(order) => String(order._id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load({ silent: true }); }} tintColor={COLORS.accent} />}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={!error ? <Text style={styles.empty}>{copy.empty}</Text> : null}
        />
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 32, color: COLORS.accent, fontSize: 30, lineHeight: 30 },
  headerSpacer: { width: 32 },
  title: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 20, fontWeight: '800' },
  list: { padding: 16, gap: 12 },
  loading: { marginTop: 40 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  error: { color: COLORS.danger, marginBottom: 8, fontSize: 13 },
  card: { padding: 16, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  cardReady: { borderColor: COLORS.success, borderWidth: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  company: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  number: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  badge: { overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, color: COLORS.accent, backgroundColor: COLORS.soft, fontSize: 12, fontWeight: '800' },
  badgeReady: { color: COLORS.success, backgroundColor: COLORS.successSoft },
  badgeCancelled: { color: COLORS.danger, backgroundColor: `${COLORS.danger}26` },
  readyBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: COLORS.successSoft },
  readyTitle: { color: COLORS.success, fontSize: 15, fontWeight: '800' },
  readyText: { color: COLORS.success, fontSize: 12, marginTop: 2 },
  deliveryDetails: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.soft },
  deliveryDetailText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  steps: { flexDirection: 'row', marginTop: 14 },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border },
  dotDone: { backgroundColor: COLORS.accent },
  stepLabel: { color: COLORS.muted, fontSize: 10 },
  stepLabelDone: { color: COLORS.text, fontWeight: '700' },
  lines: { marginTop: 14, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineName: { flex: 1, color: COLORS.text, fontSize: 13 },
  lineTotal: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  note: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 },
  muted: { flexShrink: 1, color: COLORS.muted, fontSize: 12, marginTop: 4 },
  total: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  invoiceButton: { marginTop: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.accent },
  invoiceText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
