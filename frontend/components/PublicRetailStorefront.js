import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import AuthPromptModal from './AuthPromptModal';
import { createRetailCheckout, getPublicRetailProducts } from '../services/api';
import { convertMinor, currencyScale, loadRates } from '../utils/currency';
import { unitPrice } from '../utils/dishPricing';
import { API_URL } from '../env';
import { resolveAvatarUri } from '../utils/profileUtils';

function formatMoney(minor, currency, locale) {
  const code = currency || 'USD';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code })
      .format((minor || 0) / currencyScale(code));
  } catch (_) {
    return `${((minor || 0) / currencyScale(code)).toFixed(2)} ${code}`;
  }
}

function distanceBetweenKm(from, to) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function PublicRetailStorefront({ companyId, categoryVisual }) {
  const { colors: theme } = useTheme();
  const { activeLanguage } = useLanguage();
  const { isGuest } = useUser();
  const navigation = useNavigation();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [products, setProducts] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState({ stripe: false, paypal: false });
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [storeLocation, setStoreLocation] = useState(null);
  const [rates, setRates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState({});
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPosition, setDeliveryPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [authPromptVisible, setAuthPromptVisible] = useState(false);

  const copy = isFrench
    ? {
        title: 'Boutique', search: 'Rechercher un produit', all: 'Tout', add: 'Ajouter', added: 'Ajouté',
        inStock: 'En stock', unavailable: 'Indisponible', empty: 'Aucun produit disponible.',
        cart: 'Panier', items: 'article(s)', checkout: 'Commander', subtotal: 'Sous-total', total: 'Total',
        pickup: 'Retrait', delivery: 'Livraison', address: 'Adresse de livraison', addressPlaceholder: 'Adresse complète',
        locate: 'Utiliser ma position', locating: 'Localisation…', locationRequired: 'Indique une adresse et utilise ta position pour calculer la zone.',
        noZone: 'Cette adresse est en dehors des zones de livraison.', deliveryFee: 'Frais de livraison',
        payment: 'Paiement en ligne', chargedInUsd: 'Le paiement en ligne est débité en USD.', name: 'Nom complet', email: 'E-mail', phone: 'Téléphone',
        signIn: 'Connecte-toi pour commander et suivre la livraison.', noPayments: 'Le paiement en ligne n’est pas encore activé par ce vendeur.',
        placeOrder: 'Payer et commander', placing: 'Ouverture du paiement…', loadError: 'Impossible de charger la boutique.',
        checkoutError: 'Impossible de créer la commande.', emptyCart: 'Ajoute un produit pour continuer.',
      }
    : {
        title: 'Shop', search: 'Search products', all: 'All', add: 'Add', added: 'Added',
        inStock: 'In stock', unavailable: 'Unavailable', empty: 'No products available.',
        cart: 'Cart', items: 'item(s)', checkout: 'Checkout', subtotal: 'Subtotal', total: 'Total',
        pickup: 'Pickup', delivery: 'Delivery', address: 'Delivery address', addressPlaceholder: 'Full address',
        locate: 'Use my location', locating: 'Locating…', locationRequired: 'Enter an address and use your location to calculate the delivery zone.',
        noZone: 'This address is outside the delivery zones.', deliveryFee: 'Delivery fee',
        payment: 'Online payment', chargedInUsd: 'Online payments are charged in USD.', name: 'Full name', email: 'Email', phone: 'Phone',
        signIn: 'Sign in to order and track delivery.', noPayments: 'Online payment is not enabled by this seller yet.',
        placeOrder: 'Pay and place order', placing: 'Opening payment…', loadError: 'Unable to load the shop.',
        checkoutError: 'Unable to create the order.', emptyCart: 'Add a product to continue.',
      };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([getPublicRetailProducts(companyId, { page: 1, limit: 100 }), loadRates()])
      .then(([response, nextRates]) => {
        if (!active) return;
        setProducts(response?.data || []);
        setPaymentOptions(response?.paymentOptions || { stripe: false, paypal: false });
        setDeliveryZones(response?.deliveryZones || []);
        setStoreLocation(response?.storeLocation || null);
        setRates(nextRates);
        setPaymentMethod(response?.paymentOptions?.stripe ? 'stripe' : response?.paymentOptions?.paypal ? 'paypal' : '');
        setError('');
      })
      .catch((loadError) => {
        if (active) setError(loadError?.response?.data?.error || copy.loadError);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [companyId, copy.loadError]);

  const categories = useMemo(() => [...new Set(products.map((product) => String(product.category || '').trim()).filter(Boolean))], [products]);
  const visibleProducts = useMemo(() => products.filter((product) => (
    (!selectedCategory || product.category === selectedCategory)
    && (!search.trim() || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()))
  )), [products, search, selectedCategory]);
  const cartLines = useMemo(() => products
    .filter((product) => Number(cart[product._id] || 0) > 0)
    .map((product) => ({ product, quantity: Number(cart[product._id]) })), [products, cart]);
  const subtotalUsd = cartLines.reduce((sum, line) => {
    if (sum === null) return null;
    const convertedUnit = convertMinor(unitPrice(line.product, line.quantity), line.product.currency, 'USD', rates);
    return convertedUnit === null ? null : sum + (convertedUnit * line.quantity);
  }, 0);
  const distanceKm = deliveryPosition && storeLocation?.latitude != null && storeLocation?.longitude != null
    ? distanceBetweenKm(
        { latitude: Number(storeLocation.latitude), longitude: Number(storeLocation.longitude) },
        deliveryPosition,
      )
    : null;
  const deliveryZone = distanceKm === null
    ? null
    : deliveryZones.find((zone) => distanceKm <= Number(zone.maxDistanceKm)) || null;
  const deliveryFeeUsd = deliveryZone
    ? convertMinor(deliveryZone.feeMinor, deliveryZone.currency, 'USD', rates)
    : fulfillmentType === 'delivery' ? null : 0;
  const totalUsd = subtotalUsd === null || deliveryFeeUsd === null ? null : subtotalUsd + deliveryFeeUsd;

  const addProduct = (product) => {
    if (Number(product.stockOnHand) <= Number(cart[product._id] || 0)) return;
    setCart((current) => ({ ...current, [product._id]: Number(current[product._id] || 0) + 1 }));
  };

  const adjustQuantity = (productId, delta) => {
    setCart((current) => {
      const next = Math.max(0, Math.min(Number(products.find((item) => item._id === productId)?.stockOnHand || 0), Number(current[productId] || 0) + delta));
      const updated = { ...current };
      if (next) updated[productId] = next;
      else delete updated[productId];
      return updated;
    });
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    setCheckoutError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error(copy.locationRequired);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeliveryPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (locationError) {
      setCheckoutError(locationError?.message || copy.locationRequired);
    } finally {
      setIsLocating(false);
    }
  };

  const submitOrder = async () => {
    if (!cartLines.length) return setCheckoutError(copy.emptyCart);
    if (isGuest) {
      setCheckoutVisible(false);
      setAuthPromptVisible(true);
      return;
    }
    if (!paymentOptions[paymentMethod]) return setCheckoutError(copy.noPayments);
    if (fulfillmentType === 'delivery' && (!deliveryAddress.trim() || !deliveryPosition || !deliveryZone)) {
      return setCheckoutError(deliveryZones.length && deliveryPosition ? copy.noZone : copy.locationRequired);
    }
    if (totalUsd === null || totalUsd <= 0) return setCheckoutError(copy.checkoutError);

    setIsSubmitting(true);
    setCheckoutError('');
    try {
      const order = await createRetailCheckout(companyId, {
        currency: 'USD',
        paymentMethod,
        fulfillmentType,
        customer: { name: customerName, email: customerEmail, phone: customerPhone },
        lines: cartLines.map(({ product, quantity }) => ({ productId: product._id, quantity })),
        ...(fulfillmentType === 'delivery' ? {
          deliveryAddress: deliveryAddress.trim(),
          deliveryLatitude: deliveryPosition.latitude,
          deliveryLongitude: deliveryPosition.longitude,
        } : {}),
      });
      if (!order?.checkoutUrl) throw new Error(copy.checkoutError);
      await Linking.openURL(order.checkoutUrl);
      setCheckoutVisible(false);
      setCart({});
      Alert.alert(copy.title, isFrench ? 'Commande créée. Tu peux suivre son statut dans Mes commandes.' : 'Order created. Track its status in My orders.');
    } catch (checkoutError) {
      setCheckoutError(checkoutError?.response?.data?.error || checkoutError?.message || copy.checkoutError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <ActivityIndicator color={theme.pink} style={styles.loader} />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Text style={styles.headerIconText}>{categoryVisual?.icon || '🛍️'}</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{categoryVisual?.label || copy.title}</Text>
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        {cartLines.length ? (
          <TouchableOpacity style={styles.cartButton} onPress={() => { setCheckoutError(''); setCheckoutVisible(true); }} accessibilityRole="button">
            <Text style={styles.cartButtonText}>{copy.cart} · {cartLines.reduce((sum, line) => sum + line.quantity, 0)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder={copy.search} placeholderTextColor={theme.muted} style={styles.search} />
      {categories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {[{ key: '', label: copy.all }, ...categories.map((category) => ({ key: category, label: category }))].map((item) => (
            <TouchableOpacity key={item.key || 'all'} style={[styles.categoryChip, selectedCategory === item.key && styles.categoryChipActive]} onPress={() => setSelectedCategory(item.key)}>
              <Text style={[styles.categoryText, selectedCategory === item.key && styles.categoryTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!products.length && !error ? <Text style={styles.empty}>{copy.empty}</Text> : null}
      <View style={styles.grid}>
        {visibleProducts.map((product) => {
          const quantity = Number(cart[product._id] || 0);
          const canAdd = Number(product.stockOnHand) > quantity && Number(product.priceMinor) > 0;
          const imageUri = resolveAvatarUri(product.imageUrl, API_URL);
          return (
            <View key={String(product._id)} style={styles.product}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.productImage} /> : (
                <View style={[styles.productImage, styles.productPlaceholder]}>
                  <Text style={styles.productPlaceholderIcon}>{categoryVisual?.icon || '🛍️'}</Text>
                </View>
              )}
              {!!product.badge && <Text style={styles.badge}>{product.badge}</Text>}
              <View style={styles.productCopy}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                {product.description ? <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text> : null}
                <Text style={styles.productPrice}>{formatMoney(unitPrice(product), product.currency, locale)}</Text>
                <Text style={styles.stock}>{product.stockOnHand > 0 ? `${copy.inStock} · ${product.stockOnHand}` : copy.unavailable}</Text>
                {quantity ? (
                  <View style={styles.quantityRow}>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => adjustQuantity(product._id, -1)}><Text style={styles.quantityButtonText}>−</Text></TouchableOpacity>
                    <Text style={styles.quantity}>{quantity}</Text>
                    <TouchableOpacity style={styles.quantityButton} disabled={!canAdd} onPress={() => addProduct(product)}><Text style={[styles.quantityButtonText, !canAdd && styles.disabledText]}>+</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.addButton, !canAdd && styles.disabledButton]} disabled={!canAdd} onPress={() => addProduct(product)}>
                    <Text style={styles.addButtonText}>{canAdd ? copy.add : copy.unavailable}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={checkoutVisible} animationType="slide" onRequestClose={() => setCheckoutVisible(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCheckoutVisible(false)}><Text style={styles.modalClose}>‹</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{copy.checkout}</Text>
            <View style={styles.modalSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled">
            {cartLines.map(({ product, quantity }) => (
              <View key={String(product._id)} style={styles.checkoutLine}>
                <View style={styles.checkoutLineInfo}>
                  <Text style={styles.checkoutLineName} numberOfLines={1}>{quantity} × {product.name}</Text>
                  <View style={styles.checkoutQuantity}>
                    <TouchableOpacity onPress={() => adjustQuantity(product._id, -1)}><Text style={styles.checkoutQuantityAction}>−</Text></TouchableOpacity>
                    <Text style={styles.checkoutQuantityValue}>{quantity}</Text>
                    <TouchableOpacity onPress={() => addProduct(product)}><Text style={styles.checkoutQuantityAction}>+</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.checkoutLinePrice}>{formatMoney(unitPrice(product, quantity) * quantity, product.currency, locale)}</Text>
              </View>
            ))}
            <Text style={styles.sectionTitle}>{isFrench ? 'Réception' : 'Fulfillment'}</Text>
            <View style={styles.segmentRow}>
              {['pickup', 'delivery'].map((type) => (
                <TouchableOpacity key={type} style={[styles.segment, fulfillmentType === type && styles.segmentActive]} onPress={() => { setFulfillmentType(type); setCheckoutError(''); }}>
                  <Text style={[styles.segmentText, fulfillmentType === type && styles.segmentTextActive]}>{type === 'pickup' ? copy.pickup : copy.delivery}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {fulfillmentType === 'delivery' ? (
              <>
                <TextInput value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder={copy.addressPlaceholder} placeholderTextColor={theme.muted} style={styles.input} />
                <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={isLocating}>
                  {isLocating ? <ActivityIndicator color={theme.pink} /> : <Text style={styles.locationButtonText}>{copy.locate}</Text>}
                </TouchableOpacity>
                {distanceKm !== null ? <Text style={styles.helper}>{distanceKm.toFixed(1)} km · {deliveryZone ? formatMoney(convertMinor(deliveryZone.feeMinor, deliveryZone.currency, 'USD', rates), 'USD', locale) : copy.noZone}</Text> : null}
              </>
            ) : null}
            <Text style={styles.sectionTitle}>{isFrench ? 'Coordonnées' : 'Contact details'}</Text>
            <TextInput value={customerName} onChangeText={setCustomerName} placeholder={copy.name} placeholderTextColor={theme.muted} style={styles.input} />
            <TextInput value={customerEmail} onChangeText={setCustomerEmail} placeholder={copy.email} placeholderTextColor={theme.muted} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder={copy.phone} placeholderTextColor={theme.muted} keyboardType="phone-pad" style={styles.input} />
            <Text style={styles.sectionTitle}>{copy.payment}</Text>
            <Text style={styles.helper}>{copy.chargedInUsd}</Text>
            <View style={styles.segmentRow}>
              {['stripe', 'paypal'].filter((method) => paymentOptions[method]).map((method) => (
                <TouchableOpacity key={method} style={[styles.segment, paymentMethod === method && styles.segmentActive]} onPress={() => setPaymentMethod(method)}>
                  <Text style={[styles.segmentText, paymentMethod === method && styles.segmentTextActive]}>{method === 'stripe' ? 'Visa · Stripe' : 'PayPal'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!paymentOptions.stripe && !paymentOptions.paypal ? <Text style={styles.helper}>{copy.noPayments}</Text> : null}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>{copy.subtotal}</Text><Text style={styles.totalValue}>{subtotalUsd === null ? '—' : formatMoney(subtotalUsd, 'USD', locale)}</Text></View>
            {fulfillmentType === 'delivery' ? <View style={styles.totalRow}><Text style={styles.totalLabel}>{copy.deliveryFee}</Text><Text style={styles.totalValue}>{deliveryFeeUsd === null ? '—' : formatMoney(deliveryFeeUsd, 'USD', locale)}</Text></View> : null}
            <View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>{copy.total}</Text><Text style={styles.grandTotalValue}>{totalUsd === null ? '—' : formatMoney(totalUsd, 'USD', locale)}</Text></View>
            {checkoutError ? <Text style={styles.error}>{checkoutError}</Text> : null}
            {isGuest ? <Text style={styles.helper}>{copy.signIn}</Text> : null}
            <TouchableOpacity style={[styles.payButton, (isSubmitting || !paymentOptions[paymentMethod]) && styles.disabledButton]} onPress={submitOrder} disabled={isSubmitting || !paymentOptions[paymentMethod]}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payButtonText}>{copy.placeOrder}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      <AuthPromptModal
        visible={authPromptVisible}
        onClose={() => setAuthPromptVisible(false)}
        onSignIn={() => { setAuthPromptVisible(false); navigation.navigate('Login'); }}
        onSignUp={() => { setAuthPromptVisible(false); navigation.navigate('Register'); }}
      />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  root: { paddingHorizontal: 14, paddingBottom: 28 },
  loader: { marginVertical: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceRaised },
  headerIconText: { fontSize: 22 },
  headerCopy: { flex: 1 },
  eyebrow: { color: theme.pinkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  cartButton: { backgroundColor: theme.pink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  cartButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  search: { minHeight: 44, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.surface },
  categoryRow: { gap: 8, paddingVertical: 12 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  categoryChipActive: { backgroundColor: theme.pink, borderColor: theme.pink },
  categoryText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  product: { width: '48%', overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 4 },
  productImage: { width: '100%', aspectRatio: 1.15, backgroundColor: theme.surfaceRaised },
  productPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productPlaceholderIcon: { fontSize: 34 },
  badge: { position: 'absolute', top: 8, left: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.pink, color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  productCopy: { padding: 10 },
  productName: { minHeight: 34, color: theme.text, fontSize: 13, fontWeight: '800' },
  productDescription: { minHeight: 30, color: theme.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  productPrice: { color: theme.pinkSoft, fontSize: 14, fontWeight: '800', marginTop: 6 },
  stock: { color: theme.muted, fontSize: 10, marginTop: 3 },
  addButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: theme.pink, marginTop: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
  disabledText: { opacity: 0.4 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 7 },
  quantityButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: theme.surfaceRaised },
  quantityButtonText: { color: theme.text, fontSize: 18, fontWeight: '700' },
  quantity: { minWidth: 18, textAlign: 'center', color: theme.text, fontWeight: '800' },
  empty: { color: theme.muted, textAlign: 'center', marginVertical: 30 },
  error: { color: '#E0556B', fontSize: 12, marginTop: 8 },
  modalRoot: { flex: 1, backgroundColor: theme.background },
  modalHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  modalClose: { width: 34, color: theme.pinkSoft, fontSize: 30 },
  modalTitle: { flex: 1, textAlign: 'center', color: theme.text, fontSize: 17, fontWeight: '800' },
  modalSpacer: { width: 34 },
  checkoutContent: { padding: 16, paddingBottom: 36 },
  checkoutLine: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderColor: theme.border },
  checkoutLineInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  checkoutLineName: { flex: 1, color: theme.text, fontSize: 12, fontWeight: '700' },
  checkoutLinePrice: { color: theme.text, fontSize: 12, fontWeight: '700' },
  checkoutQuantity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkoutQuantityAction: { color: theme.pinkSoft, fontSize: 20, fontWeight: '700' },
  checkoutQuantityValue: { color: theme.text, fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  segmentActive: { borderColor: theme.pink, backgroundColor: theme.tint },
  segmentText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: theme.tintText },
  input: { minHeight: 44, marginTop: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
  locationButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 8, backgroundColor: theme.surfaceRaised },
  locationButtonText: { color: theme.pinkSoft, fontSize: 12, fontWeight: '800' },
  helper: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  totalLabel: { color: theme.muted, fontSize: 13 },
  totalValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
  grandTotalRow: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderColor: theme.border },
  grandTotalLabel: { color: theme.text, fontSize: 15, fontWeight: '800' },
  grandTotalValue: { color: theme.pinkSoft, fontSize: 16, fontWeight: '800' },
  payButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 10, backgroundColor: theme.pink },
  payButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});