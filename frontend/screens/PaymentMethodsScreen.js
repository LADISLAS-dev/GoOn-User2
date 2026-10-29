import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import {
  createMyCardSetupLink,
  getMyPaymentMethods,
  removeMyPaymentMethod,
  setMyDefaultPaymentMethod,
} from '../services/api';

const COLORS = {
  background: '#F8F0FF', surface: '#FFFFFF', border: '#E5D7F2', text: '#1A1A2E',
  muted: '#6B6472', accent: '#8B2FC9', danger: '#A83232', success: '#157347',
};

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const { isGuest } = useUser();
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  const copy = isFrench
    ? {
        title: 'Mes cartes', subtitle: 'Gérez les cartes enregistrées pour vos achats.',
        privacy: 'GoOn ne conserve pas les données de carte. Stripe peut garder les éléments requis par la loi.',
        empty: 'Aucune carte enregistrée.', refresh: 'Actualiser', add: 'Ajouter une carte',
        consent: 'J’autorise GoOn à réutiliser cette carte pour mes futures commandes. Chaque commande sera confirmée avant capture.',
        default: 'Par défaut', setDefault: 'Choisir par défaut', remove: 'Supprimer',
        expiry: 'Expire', loading: 'Chargement…', busy: 'Ouverture…', error: 'Impossible de gérer cette carte.',
        removeTitle: 'Supprimer cette carte ?', removeBody: 'Elle ne sera plus disponible pour les prochains achats.',
        cancel: 'Annuler', confirm: 'Supprimer', signIn: 'Connectez-vous pour gérer vos cartes.',
      }
    : {
        title: 'My cards', subtitle: 'Manage cards saved for your purchases.',
        privacy: 'GoOn does not store card details. Stripe may retain records required by law.',
        empty: 'No saved cards.', refresh: 'Refresh', add: 'Add a card',
        consent: 'I authorize GoOn to reuse this card for future orders. Each order will be confirmed before capture.',
        default: 'Default', setDefault: 'Set as default', remove: 'Remove',
        expiry: 'Expires', loading: 'Loading…', busy: 'Opening…', error: 'Unable to manage this card.',
        removeTitle: 'Remove this card?', removeBody: 'It will no longer be available for future purchases.',
        cancel: 'Cancel', confirm: 'Remove', signIn: 'Sign in to manage your cards.',
      };

  const loadCards = useCallback(async () => {
    if (isGuest) {
      setCards([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setCards(await getMyPaymentMethods());
      setError('');
    } catch (loadError) {
      setError(loadError?.response?.data?.error || copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [copy.error, isGuest]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && navigation.isFocused()) {
        loadCards();
      }
    });

    return () => subscription.remove();
  }, [loadCards, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  const addCard = async () => {
    if (!consent || isWorking) return;
    setIsWorking(true);
    setError('');
    try {
      const result = await createMyCardSetupLink({ consent: true });
      if (!result?.url) throw new Error('Stripe setup URL missing');
      await Linking.openURL(result.url);
    } catch (setupError) {
      setError(setupError?.response?.data?.error || copy.error);
    } finally {
      setIsWorking(false);
    }
  };

  const chooseDefault = async (paymentMethodId) => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await setMyDefaultPaymentMethod(paymentMethodId);
      await loadCards();
    } catch (updateError) {
      setError(updateError?.response?.data?.error || copy.error);
    } finally {
      setIsWorking(false);
    }
  };

  const confirmRemove = (paymentMethodId) => {
    Alert.alert(copy.removeTitle, copy.removeBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.confirm,
        style: 'destructive',
        onPress: async () => {
          setIsWorking(true);
          try {
            await removeMyPaymentMethod(paymentMethodId);
            await loadCards();
          } catch (removeError) {
            setError(removeError?.response?.data?.error || copy.error);
          } finally {
            setIsWorking(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={isFrench ? 'Retour' : 'Back'} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
          <TouchableOpacity onPress={loadCards} disabled={isLoading || isWorking} accessibilityRole="button">
            <Text style={styles.refresh}>{copy.refresh}</Text>
          </TouchableOpacity>
        </View>

        {isGuest ? <Text style={styles.empty}>{copy.signIn}</Text> : null}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {isLoading ? <ActivityIndicator color={COLORS.accent} style={styles.loader} /> : null}
        {!isGuest && !isLoading && !cards.length ? <Text style={styles.empty}>{copy.empty}</Text> : null}

        {!isGuest ? cards.map((card) => (
          <View key={card.id} style={styles.cardRow}>
            <View style={styles.cardMark}><Text style={styles.cardMarkText}>▰</Text></View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardNumber}>{String(card.brand || 'card').toUpperCase()} ···· {card.last4}</Text>
              <Text style={styles.cardExpiry}>{copy.expiry} {String(card.expMonth).padStart(2, '0')}/{card.expYear}</Text>
            </View>
            {card.isDefault ? (
              <Text style={styles.defaultLabel}>{copy.default}</Text>
            ) : (
              <TouchableOpacity disabled={isWorking} onPress={() => chooseDefault(card.id)} accessibilityRole="button">
                <Text style={styles.action}>{copy.setDefault}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity disabled={isWorking} onPress={() => confirmRemove(card.id)} accessibilityRole="button">
              <Text style={styles.remove}>{copy.remove}</Text>
            </TouchableOpacity>
          </View>
        )) : null}

        {!isGuest ? (
          <View style={styles.addSection}>
            <Text style={styles.privacy}>{copy.privacy}</Text>
            <View style={styles.consentRow}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }} thumbColor={consent ? COLORS.accent : '#FFFFFF'} />
              <Text style={styles.consent}>{copy.consent}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, (!consent || isWorking) && styles.disabled]}
              disabled={!consent || isWorking}
              onPress={addCard}
              accessibilityRole="button"
            >
              {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addText}>{copy.add}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  backText: { color: COLORS.text, fontSize: 24, lineHeight: 26 },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  refresh: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  loader: { marginVertical: 22 },
  empty: { color: COLORS.muted, fontSize: 13, paddingVertical: 18, textAlign: 'center' },
  error: { color: COLORS.danger, fontSize: 12, marginBottom: 10 },
  cardRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F3E8FF' },
  cardMarkText: { color: COLORS.accent, fontSize: 17 },
  cardCopy: { flex: 1 },
  cardNumber: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  cardExpiry: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  defaultLabel: { color: COLORS.success, fontSize: 10, fontWeight: '700' },
  action: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },
  remove: { color: COLORS.danger, fontSize: 10, fontWeight: '700' },
  addSection: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  privacy: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  consent: { flex: 1, color: COLORS.text, fontSize: 11, lineHeight: 15 },
  addButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 8, backgroundColor: COLORS.accent },
  disabled: { opacity: 0.5 },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
