import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, RefreshCw, Wallet } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { createPayPalConnectLink, createStripeConnectLink, getCompanyPaymentAccounts } from '../services/api';

const COLORS = {
  background: '#0D0B12',
  surface: '#17141E',
  surfaceRaised: '#211B2B',
  border: '#30283B',
  text: '#F6F2FA',
  muted: '#A9A1B3',
  violet: '#8B5CF6',
  violetLight: '#C4B5FD',
  green: '#53D69A',
  red: '#F87171',
};

export default function ProPaymentSettingsScreen({ navigation, route }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const companyId = route?.params?.companyId;
  const [accounts, setAccounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState('');
  const [error, setError] = useState('');

  const copy = isFrench
    ? {
        title: 'Paiements', subtitle: 'Comptes de versement de l’entreprise', stripe: 'Stripe', paypal: 'PayPal',
        stripeDetail: 'Recevez les acomptes et paiements par carte.', paypalDetail: 'Recevez les paiements via PayPal.',
        connected: 'Connecté', pending: 'Configuration en cours', unavailable: 'Non connecté',
        connectStripe: 'Configurer Stripe', connectPaypal: 'Configurer PayPal', finish: 'Terminer la configuration',
        connectedLabel: 'Compte prêt à recevoir les paiements', error: 'Impossible de charger les comptes de paiement.',
        connectError: 'Impossible d’ouvrir la page de connexion.', back: 'Retour',
        consentTitle: 'Autoriser PayPal', consentBody: 'PayPal demande votre accord pour partager les informations nécessaires à la réception des paiements par GoOn.',
        cancel: 'Annuler', continue: 'Continuer',
      }
    : {
        title: 'Payments', subtitle: 'Company payout accounts', stripe: 'Stripe', paypal: 'PayPal',
        stripeDetail: 'Receive deposits and card payments.', paypalDetail: 'Receive payments through PayPal.',
        connected: 'Connected', pending: 'Setup in progress', unavailable: 'Not connected',
        connectStripe: 'Set up Stripe', connectPaypal: 'Set up PayPal', finish: 'Finish setup',
        connectedLabel: 'Account is ready to receive payments', error: 'Unable to load payment accounts.',
        connectError: 'Unable to open the connection page.', back: 'Back',
        consentTitle: 'Authorize PayPal', consentBody: 'PayPal needs your consent to share the information GoOn requires to receive payments.',
        cancel: 'Cancel', continue: 'Continue',
      };

  const loadAccounts = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setError(copy.error);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setAccounts(await getCompanyPaymentAccounts(companyId));
    } catch (loadError) {
      setError(loadError?.response?.data?.error || copy.error);
    } finally {
      setLoading(false);
    }
  }, [companyId, copy.error]);

  useFocusEffect(useCallback(() => {
    loadAccounts();
  }, [loadAccounts]));

  const connectProvider = async (provider, consentGranted = false) => {
    if (connectingProvider) return;
    if (provider === 'paypal' && !consentGranted) {
      Alert.alert(copy.consentTitle, copy.consentBody, [
        { text: copy.cancel, style: 'cancel' },
        { text: copy.continue, onPress: () => connectProvider('paypal', true) },
      ]);
      return;
    }
    setConnectingProvider(provider);
    setError('');
    try {
      const result = provider === 'stripe'
        ? await createStripeConnectLink(companyId)
        : await createPayPalConnectLink(companyId, { shareDataConsent: consentGranted });
      if (!result?.url) throw new Error(copy.connectError);
      await Linking.openURL(result.url);
    } catch (connectError) {
      setError(connectError?.response?.data?.error || connectError?.message || copy.connectError);
    } finally {
      setConnectingProvider('');
    }
  };

  const stripeReady = Boolean(accounts?.stripe?.chargesEnabled && accounts?.stripe?.payoutsEnabled);
  const paypalReady = Boolean(accounts?.paypal?.connected);
  const providers = [
    {
      key: 'stripe',
      title: copy.stripe,
      detail: copy.stripeDetail,
      ready: stripeReady,
      status: stripeReady ? copy.connected : accounts?.stripe?.connected ? copy.pending : copy.unavailable,
      action: stripeReady ? copy.connected : accounts?.stripe?.connected ? copy.finish : copy.connectStripe,
      Icon: CreditCard,
    },
    {
      key: 'paypal',
      title: copy.paypal,
      detail: copy.paypalDetail,
      ready: paypalReady,
      status: paypalReady ? copy.connected : accounts?.paypal?.pending ? copy.pending : copy.unavailable,
      action: paypalReady ? copy.connected : accounts?.paypal?.pending ? copy.finish : copy.connectPaypal,
      Icon: Wallet,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={copy.back}>
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAccounts} accessibilityRole="button" accessibilityLabel={isFrench ? 'Actualiser' : 'Refresh'}>
          <RefreshCw size={17} color={COLORS.violetLight} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={COLORS.violetLight} style={styles.loader} /> : null}
        {providers.map(({ key, title, detail, ready, status, action, Icon }) => (
          <View key={key} style={styles.providerCard}>
            <View style={styles.providerTop}>
              <View style={styles.providerIcon}><Icon size={20} color={COLORS.violetLight} /></View>
              <View style={styles.providerCopy}>
                <Text style={styles.providerName}>{title}</Text>
                <Text style={styles.providerDetail}>{detail}</Text>
              </View>
              <View style={[styles.statusDot, ready && styles.statusDotReady]} />
            </View>
            <View style={styles.providerFooter}>
              <View style={styles.statusLabel}>
                {ready ? <CheckCircle2 size={15} color={COLORS.green} /> : null}
                <Text style={[styles.statusText, ready && styles.statusTextReady]}>{status}</Text>
              </View>
              <TouchableOpacity
                style={[styles.connectButton, ready && styles.connectButtonReady]}
                onPress={() => connectProvider(key)}
                disabled={loading || Boolean(connectingProvider) || ready}
                accessibilityRole="button"
              >
                {connectingProvider === key ? <ActivityIndicator size="small" color={COLORS.text} /> : <>
                  <Text style={styles.connectButtonText}>{action}</Text>
                  {!ready ? <ExternalLink size={14} color={COLORS.text} /> : null}
                </>}
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  refreshButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  content: { padding: 18, gap: 12 },
  loader: { marginVertical: 28 },
  providerCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  providerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  providerCopy: { flex: 1 },
  providerName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  providerDetail: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.muted },
  statusDotReady: { backgroundColor: COLORS.green },
  providerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  statusTextReady: { color: COLORS.green },
  connectButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.violet },
  connectButtonReady: { backgroundColor: COLORS.surfaceRaised },
  connectButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  errorText: { color: COLORS.red, fontSize: 13, lineHeight: 18, padding: 12, borderRadius: 10, backgroundColor: '#2A171D' },
});