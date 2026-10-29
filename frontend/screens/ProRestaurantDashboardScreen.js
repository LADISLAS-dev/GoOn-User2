import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  createPayPalConnectLink,
  createStripeConnectLink,
  getAppointmentsByCompany,
  getCompanyById,
  getProducts,
  getRestaurantPaymentAccounts,
  getSalesOrders,
} from '../services/api';

const COLORS = {
  background: '#0D0B12', surface: '#17141E', surfaceRaised: '#211B2B', border: '#30283B',
  text: '#F6F2FA', muted: '#A9A1B3', violet: '#8B5CF6', violetLight: '#C4B5FD',
  green: '#53D69A', amber: '#F5BD62',
};

const MODULES = [
  { key: 'inventory', route: 'Inventory', icon: '🍽️', en: 'Menu & stock', fr: 'Menu et stock' },
  { key: 'sales_orders', route: 'SalesOrders', icon: '🧾', en: 'Orders', fr: 'Commandes' },
  { key: 'appointments', route: 'Booking', icon: '📅', en: 'Reservations', fr: 'Réservations' },
  { key: 'customers', route: 'Customers', icon: '👥', en: 'Guests', fr: 'Clients' },
  { key: 'invoices', route: 'Invoices', icon: '📄', en: 'Invoices', fr: 'Factures' },
  { key: 'analytics', route: 'Analytics', icon: '📈', en: 'Performance', fr: 'Performance' },
];

function Metric({ label, value, detail, accent = COLORS.violetLight }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function formatTime(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function ProRestaurantDashboardScreen({ companyId, onboardingFlow = false, moduleConfigs = [], navigation }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [company, setCompany] = useState(null);
  const [orders, setOrders] = useState([]);
  const [openOrderCount, setOpenOrderCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [paymentAccounts, setPaymentAccounts] = useState(null);
  const [connectingProvider, setConnectingProvider] = useState('');
  const [paymentConnectionError, setPaymentConnectionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const copy = isFrench
    ? {
        eyebrow: 'ESPACE RESTAURANT', greeting: 'Votre service, en un coup d’œil.', today: 'AUJOURD’HUI',
        orders: 'Commandes actives', ordersDetail: 'À confirmer ou préparer',
        bookings: 'Réservations du jour', bookingsDetail: 'Rendez-vous prévus aujourd’hui',
        menu: 'Articles au menu', menuDetail: 'Produits disponibles', operations: 'Opérations',
        recent: 'Commandes récentes', noOrders: 'Aucune commande récente.', open: 'Ouvrir',
        setup: 'Terminez la vitrine de votre restaurant',
        setupDetail: 'Ajoutez vos photos, horaires et spécialités pour accueillir vos clients.',
        editProfile: 'Configurer ma vitrine', loading: 'Actualisation…',
        payments: 'Encaissements', paymentAccountsDetail: 'Connectez votre compte Stripe existant. Gérez la banque ou la carte de versement dans Stripe. Commission GoOn : 3 % + 0,30 $ par commande Stripe.',
        stripe: 'Compte Stripe', paypal: 'PayPal', connect: 'Connecter', connectStripe: 'Connecter Stripe', finishSetup: 'Terminer',
        debitCard: 'Carte de débit', bankAccount: 'Compte bancaire',
        continue: 'Continuer', cancel: 'Annuler', paypalConsentTitle: 'Autoriser PayPal',
        paypalConsentBody: 'PayPal demande votre accord pour partager les informations nécessaires à la réception des paiements par GoOn.',
        connected: 'Connecté', pending: 'Configuration en cours', notConnected: 'Non connecté',
        paymentConnectionError: 'Impossible d’ouvrir la page de connexion.',
        description: 'Le bon service commence ici.',
      }
    : {
        eyebrow: 'RESTAURANT WORKSPACE', greeting: 'Your service, at a glance.', today: 'TODAY',
        orders: 'Open orders', ordersDetail: 'To confirm or prepare',
        bookings: 'Today’s reservations', bookingsDetail: 'Bookings scheduled today',
        menu: 'Menu items', menuDetail: 'Available products', operations: 'Operations',
        recent: 'Recent orders', noOrders: 'No recent orders.', open: 'Open',
        setup: 'Finish your restaurant storefront',
        setupDetail: 'Add photos, opening hours and specialties to welcome customers.',
        editProfile: 'Set up storefront', loading: 'Refreshing…',
        payments: 'Payments', paymentAccountsDetail: 'Connect your existing Stripe account. Manage your payout bank or card in Stripe. GoOn fee: 3% + $0.30 per Stripe order.',
        stripe: 'Stripe account', paypal: 'PayPal', connect: 'Connect', connectStripe: 'Connect Stripe', finishSetup: 'Finish setup',
        debitCard: 'Debit card', bankAccount: 'Bank account',
        continue: 'Continue', cancel: 'Cancel', paypalConsentTitle: 'Authorize PayPal',
        paypalConsentBody: 'PayPal needs your consent to share the information GoOn requires to receive payments.',
        connected: 'Connected', pending: 'Setup in progress', notConnected: 'Not connected',
        paymentConnectionError: 'Unable to open the connection page.',
        description: 'Great service starts here.',
      };

  const loadDashboard = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [companyResult, recentResult, draftResult, confirmedResult, bookingResult, productResult, paymentsResult] = await Promise.allSettled([
      getCompanyById(companyId),
      getSalesOrders(companyId, { page: 1, limit: 4 }),
      getSalesOrders(companyId, { page: 1, limit: 1, status: 'draft' }),
      getSalesOrders(companyId, { page: 1, limit: 1, status: 'confirmed' }),
      getAppointmentsByCompany(companyId),
      getProducts(companyId, { page: 1, limit: 1, status: 'active' }),
      getRestaurantPaymentAccounts(companyId),
    ]);
    setCompany(companyResult.status === 'fulfilled' ? companyResult.value : null);
    setOrders(recentResult.status === 'fulfilled' ? recentResult.value?.data || [] : []);
    const drafts = draftResult.status === 'fulfilled' ? draftResult.value?.pagination?.total || 0 : 0;
    const confirmed = confirmedResult.status === 'fulfilled' ? confirmedResult.value?.pagination?.total || 0 : 0;
    setOpenOrderCount(drafts + confirmed);
    if (bookingResult.status === 'fulfilled' && Array.isArray(bookingResult.value)) {
      const now = new Date();
      setBookingCount(bookingResult.value.filter((booking) => {
        if (!booking.date || ['cancelled', 'rejected'].includes(booking.status)) return false;
        const date = new Date(booking.date);
        return date.getFullYear() === now.getFullYear()
          && date.getMonth() === now.getMonth()
          && date.getDate() === now.getDate();
      }).length);
    } else {
      setBookingCount(0);
    }
    setProductCount(productResult.status === 'fulfilled' ? productResult.value?.pagination?.total || 0 : 0);
    setPaymentAccounts(paymentsResult.status === 'fulfilled' ? paymentsResult.value : null);
    setIsLoading(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => {
    loadDashboard();
  }, [loadDashboard]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && navigation.isFocused()) {
        loadDashboard();
      }
    });
    return () => subscription.remove();
  }, [loadDashboard, navigation]);
  const enabledModules = new Set(
    (Array.isArray(moduleConfigs) ? moduleConfigs : [])
      .filter((module) => module.enabled !== false)
      .map((module) => module.key)
  );
  const openModule = (route) => navigation.getParent()?.navigate(route);
  const connectPaymentProvider = async (provider, consentGranted = false) => {
    if (connectingProvider) return;
    if (provider === 'paypal' && !consentGranted) {
      Alert.alert(copy.paypalConsentTitle, copy.paypalConsentBody, [
        { text: copy.cancel, style: 'cancel' },
        { text: copy.continue, onPress: () => connectPaymentProvider('paypal', true) },
      ]);
      return;
    }
    setConnectingProvider(provider);
    setPaymentConnectionError('');
    try {
      const result = provider === 'stripe'
        ? await createStripeConnectLink(companyId)
        : await createPayPalConnectLink(companyId, { shareDataConsent: consentGranted });
      if (!result?.url) throw new Error('Missing provider onboarding URL');
      await Linking.openURL(result.url);
    } catch (error) {
      setPaymentConnectionError(error?.response?.data?.error || copy.paymentConnectionError);
    } finally {
      setConnectingProvider('');
    }
  };
  const payoutDestination = paymentAccounts?.stripe?.payoutDestination;
  const requiresPayoutDestinationMetadata = paymentAccounts?.stripe?.accountType === 'custom';
  const stripeConnected = Boolean(
    paymentAccounts?.stripe?.chargesEnabled
    && paymentAccounts?.stripe?.payoutsEnabled
    && (!requiresPayoutDestinationMetadata || payoutDestination?.last4)
  );
  const stripeLabel = stripeConnected
    ? copy.connected
    : paymentAccounts?.stripe?.connected ? copy.finishSetup : copy.notConnected;
  const paypalLabel = paymentAccounts?.paypal?.connected
    ? copy.connected
    : paymentAccounts?.paypal?.pending ? copy.pending : copy.notConnected;
  const payoutDestinationLabel = payoutDestination
    ? `${payoutDestination.type === 'card' ? copy.debitCard : copy.bankAccount}${payoutDestination.brand ? ` · ${payoutDestination.brand}` : ''} ····${payoutDestination.last4}`
    : '';
  const openStorefrontSettings = () => navigation.navigate('CompanyOverview', {
    companyId,
    onboardingFlow: Boolean(onboardingFlow || !company?.profileValidatedAt),
    justCreatedCompany: onboardingFlow,
  });
  const statusLabel = (status) => {
    const labels = isFrench
      ? { draft: 'Brouillon', confirmed: 'Confirmée', fulfilled: 'Servie', cancelled: 'Annulée' }
      : { draft: 'Draft', confirmed: 'Confirmed', fulfilled: 'Served', cancelled: 'Cancelled' };
    return labels[status] || status;
  };
  const todayLabel = new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl refreshing={isLoading} onRefresh={loadDashboard} tintColor={COLORS.violetLight} colors={[COLORS.violet]} />
        )}
      >
        <View style={styles.topline}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>G</Text></View>
          <View style={styles.toplineCopy}>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.companyName} numberOfLines={1}>{company?.name || 'Restaurant'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={openStorefrontSettings} accessibilityRole="button" accessibilityLabel={copy.editProfile}>
            <Text style={styles.profileButtonText}>↗</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <View style={styles.heroContent}>
            <Text style={styles.today}>{copy.today} · {todayLabel}</Text>
            <Text style={styles.heroTitle}>{copy.greeting}</Text>
            <Text style={styles.heroDescription}>{company?.description || copy.description}</Text>
            <TouchableOpacity style={styles.heroButton} onPress={openStorefrontSettings} accessibilityRole="button">
              <Text style={styles.heroButtonText}>{isFrench ? 'Voir ma vitrine' : 'View storefront'}</Text>
              <Text style={styles.heroButtonArrow}>↗</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroFoodTile}><Text style={styles.heroFoodIcon}>🍽️</Text></View>
          <Text style={styles.heroWatermark}>SERVICE</Text>
        </View>

        {!company?.profileValidatedAt ? (
          <TouchableOpacity style={styles.setupBanner} onPress={openStorefrontSettings} accessibilityRole="button">
            <View style={styles.setupIcon}><Text style={styles.setupIconText}>✦</Text></View>
            <View style={styles.setupCopy}>
              <Text style={styles.setupTitle}>{copy.setup}</Text>
              <Text style={styles.setupDetail}>{copy.setupDetail}</Text>
            </View>
            <Text style={styles.setupArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{isFrench ? 'Le service' : 'Service overview'}</Text>
          {isLoading ? <ActivityIndicator size="small" color={COLORS.violetLight} /> : null}
        </View>
        <View style={styles.metricsRow}>
          <Metric label={copy.orders} value={openOrderCount} detail={copy.ordersDetail} accent={COLORS.violetLight} />
          <Metric label={copy.bookings} value={bookingCount} detail={copy.bookingsDetail} accent={COLORS.green} />
          <Metric label={copy.menu} value={productCount} detail={copy.menuDetail} accent={COLORS.amber} />
        </View>

        {paymentAccounts ? (
          <>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{copy.payments}</Text></View>
            <View style={styles.paymentPanel}>
              <Text style={styles.paymentPanelDetail}>{copy.paymentAccountsDetail}</Text>
              {[
                { key: 'stripe', label: copy.stripe, status: stripeLabel, detail: payoutDestinationLabel },
                { key: 'paypal', label: copy.paypal, status: paypalLabel },
              ].map((provider) => (
                <TouchableOpacity
                  key={provider.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${provider.label}: ${provider.status}`}
                  activeOpacity={0.75}
                  disabled={Boolean(connectingProvider) || provider.status === copy.connected}
                  onPress={() => connectPaymentProvider(provider.key)}
                  style={styles.paymentProviderRow}
                >
                  <View style={styles.paymentProviderCopy}>
                    <Text style={styles.paymentProviderName}>{provider.label}</Text>
                    <Text style={styles.paymentProviderStatus}>{provider.status}</Text>
                    {provider.detail ? <Text style={styles.paymentProviderDetail}>{provider.detail}</Text> : null}
                  </View>
                  <View style={[styles.paymentConnectButton, (Boolean(connectingProvider) || provider.status === copy.connected) && styles.paymentConnectButtonDisabled]}>
                    <Text style={styles.paymentConnectText}>
                      {connectingProvider === provider.key
                        ? '…'
                        : provider.status === copy.connected
                          ? copy.connected
                            : provider.key === 'stripe'
                              ? copy.connectStripe
                              : provider.status === copy.notConnected ? copy.connect : copy.finishSetup}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {paymentConnectionError ? <Text accessibilityRole="alert" style={styles.paymentConnectionError}>{paymentConnectionError}</Text> : null}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{copy.operations}</Text></View>
        <View style={styles.operationsGrid}>
          {MODULES.filter((module) => enabledModules.has(module.key)).map((module) => (
            <TouchableOpacity
              key={module.key}
              style={styles.operation}
              onPress={() => openModule(module.route)}
              accessibilityRole="button"
              accessibilityLabel={isFrench ? module.fr : module.en}
            >
              <View style={styles.operationIcon}><Text style={styles.operationEmoji}>{module.icon}</Text></View>
              <Text style={styles.operationLabel}>{isFrench ? module.fr : module.en}</Text>
              <Text style={styles.operationArrow}>↗</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.recent}</Text>
          {enabledModules.has('sales_orders') ? (
            <TouchableOpacity onPress={() => openModule('SalesOrders')} accessibilityRole="button">
              <Text style={styles.textLink}>{copy.open} ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.orderPanel}>
          {!orders.length ? <Text style={styles.emptyText}>{copy.noOrders}</Text> : orders.map((order, index) => (
            <TouchableOpacity
              key={String(order._id)}
              style={[styles.orderRow, index === orders.length - 1 && styles.orderRowLast]}
              onPress={() => openModule('SalesOrders')}
              accessibilityRole="button"
            >
              <View style={styles.orderIndicator} />
              <View style={styles.orderCopy}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.orderCustomer} numberOfLines={1}>{order.customer?.name || (isFrench ? 'Client' : 'Guest')}</Text>
              </View>
              <View style={styles.orderMeta}>
                <Text style={styles.orderStatus}>{statusLabel(order.status)}</Text>
                <Text style={styles.orderTime}>{formatTime(order.createdAt, locale)}</Text>
              </View>
              <Text style={styles.orderChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footer}>{isFrench ? 'PROPULSÉ PAR GOON' : 'POWERED BY GOON'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 116 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  brandMark: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.violet },
  brandMarkText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  toplineCopy: { flex: 1 },
  eyebrow: { color: COLORS.violetLight, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  companyName: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  profileButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  profileButtonText: { color: COLORS.text, fontSize: 18 },
  hero: { minHeight: 224, backgroundColor: '#1C1428', borderWidth: 1, borderColor: '#38264D', borderRadius: 20, padding: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  heroAccent: { position: 'absolute', top: -50, right: -26, width: 190, height: 330, backgroundColor: '#3A1D5A', opacity: 0.62, transform: [{ rotate: '29deg' }] },
  heroContent: { flex: 1, zIndex: 2 },
  today: { color: COLORS.violetLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { maxWidth: 250, color: COLORS.text, fontSize: 26, lineHeight: 31, fontWeight: '800', marginTop: 12 },
  heroDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 8, maxWidth: 245 },
  heroButton: { alignSelf: 'flex-start', minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15, paddingHorizontal: 13, borderRadius: 7, backgroundColor: COLORS.violet },
  heroButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroButtonArrow: { color: '#FFFFFF', fontSize: 14 },
  heroFoodTile: { width: 58, height: 68, borderRadius: 18, backgroundColor: '#302141', borderWidth: 1, borderColor: '#59436F', alignItems: 'center', justifyContent: 'center', marginLeft: 7, zIndex: 2 },
  heroFoodIcon: { fontSize: 30 },
  heroWatermark: { position: 'absolute', right: 12, bottom: 8, color: 'rgba(255,255,255,0.045)', fontSize: 30, fontWeight: '900' },
  setupBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, marginTop: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  setupIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#332347', alignItems: 'center', justifyContent: 'center' },
  setupIconText: { color: COLORS.violetLight, fontSize: 18 },
  setupCopy: { flex: 1 },
  setupTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  setupDetail: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  setupArrow: { color: COLORS.violetLight, fontSize: 24 },
  sectionHeading: { minHeight: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minHeight: 108, padding: 11, backgroundColor: COLORS.surface, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border },
  metricLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700', minHeight: 25 },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: '800', marginTop: 2 },
  metricDetail: { color: '#827A8B', fontSize: 9, lineHeight: 12, marginTop: 4 },
  paymentPanel: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: COLORS.surface, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border },
  paymentPanelDetail: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginBottom: 4 },
  paymentProviderRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  paymentProviderCopy: { flex: 1 },
  paymentProviderName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  paymentProviderStatus: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
    paymentProviderDetail: { color: COLORS.green, fontSize: 10, marginTop: 3 },
  paymentConnectButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, backgroundColor: COLORS.violet, borderRadius: 7 },
  paymentConnectButtonDisabled: { opacity: 0.6 },
  paymentConnectText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  paymentConnectionError: { color: '#FF8A97', fontSize: 10, paddingVertical: 6 },
  operationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  operation: { width: '48%', minHeight: 64, flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  operationIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  operationEmoji: { fontSize: 16 },
  operationLabel: { flex: 1, color: COLORS.text, fontSize: 11, fontWeight: '600' },
  operationArrow: { color: COLORS.violetLight, fontSize: 13 },
  textLink: { color: COLORS.violetLight, fontSize: 11, fontWeight: '700' },
  orderPanel: { paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.muted, fontSize: 12, paddingVertical: 18, textAlign: 'center' },
  orderRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderRowLast: { borderBottomWidth: 0 },
  orderIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.violet },
  orderCopy: { flex: 1 },
  orderNumber: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  orderCustomer: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  orderMeta: { alignItems: 'flex-end' },
  orderStatus: { color: COLORS.violetLight, fontSize: 10, fontWeight: '700' },
  orderTime: { color: '#827A8B', fontSize: 9, marginTop: 3 },
  orderChevron: { color: COLORS.muted, fontSize: 20, marginLeft: 3 },
  footer: { color: '#5D5667', fontSize: 9, letterSpacing: 1.4, textAlign: 'center', marginTop: 24 },
});