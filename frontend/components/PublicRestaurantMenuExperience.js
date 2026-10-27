import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { createPublicRestaurantOrder } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COLORS = {
  background: '#100D13', surface: '#19151D', surfaceRaised: '#242029', border: '#302B35',
  text: '#F8F5F7', muted: '#A8A1AA', pink: '#EF476F', pinkSoft: '#FF8298', green: '#70D6A4', amber: '#F2BE6E',
};

const TIP_OPTIONS = [0, 500, 1000, 1500];

function currencyScale(currency) {
  try {
    return 10 ** new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch (_) {
    return 100;
  }
}

function formatMoney(minor, currency, locale) {
  const code = currency || 'XOF';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format((minor || 0) / currencyScale(code));
  } catch (_) {
    return `${((minor || 0) / currencyScale(code)).toFixed(2)} ${code}`;
  }
}

function MenuButton({ label, onPress, disabled = false, secondary = false, compact = false }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, secondary && styles.buttonSecondary, compact && styles.buttonCompact, disabled && styles.buttonDisabled]}
      activeOpacity={0.84}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary, compact && styles.buttonTextCompact]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PublicRestaurantMenuExperience({ companyId, items = [], paymentOptions = {}, isLoading = false, error = '' }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : activeLanguage === 'es' ? 'es-ES' : activeLanguage === 'pt' ? 'pt-BR' : 'en-US';
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [tipRateBps, setTipRateBps] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pay_at_venue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmationPaymentMethod, setConfirmationPaymentMethod] = useState('pay_at_venue');
  const copy = isFrench
    ? {
        title: 'À la carte', search: 'Rechercher un plat', all: 'Tout',
        detail: 'Détail du plat', add: 'Ajouter au panier', unavailable: 'Indisponible',
        cart: 'Mon panier', emptyCart: 'Ton panier est vide.', checkout: 'Passer la commande',
        checkoutTitle: 'Finaliser', backToCart: 'Retour au panier', tableHeading: 'Table', contactHeading: 'Contact', table: 'Numéro de table (facultatif)',
        name: 'Ton nom', phone: 'Téléphone', tip: 'Pourboire', payOnSite: 'Paiement au restaurant',
        paymentMethod: 'Mode de paiement', payAtVenue: 'Sur place', payWithStripe: 'Visa · Stripe', payWithPaypal: 'PayPal',
        secureCheckout: 'Le paiement s’ouvre sur la page sécurisée du prestataire.',
        placeOrder: 'Confirmer la commande', submitting: 'Envoi…',
        contactRequired: 'Indique ton nom, ton téléphone ou ton numéro de table.',
        orderSuccess: 'Commande envoyée au restaurant', orderNumber: 'Numéro', dismiss: 'Continuer',
        onlinePaymentStarted: 'Termine le paiement sécurisé. Le montant sera capturé après acceptation du restaurant.',
        subtotal: 'Sous-total', total: 'Total estimé', noResults: 'Aucun plat dans cette section.',
        emptyMenu: 'La carte sera bientôt disponible.', loadError: 'La carte est momentanément indisponible.',
        currencyMismatch: 'Les articles du panier doivent partager la même devise.',
      }
    : {
        title: 'Menu', search: 'Search dishes', all: 'All',
        detail: 'Dish details', add: 'Add to cart', unavailable: 'Unavailable',
        cart: 'Your cart', emptyCart: 'Your cart is empty.', checkout: 'Proceed to checkout',
        checkoutTitle: 'Checkout', backToCart: 'Back to cart', tableHeading: 'Table', contactHeading: 'Contact', table: 'Table number (optional)',
        name: 'Your name', phone: 'Phone', tip: 'Tip', payOnSite: 'Pay at the restaurant',
        paymentMethod: 'Payment method', payAtVenue: 'At the restaurant', payWithStripe: 'Visa · Stripe', payWithPaypal: 'PayPal',
        secureCheckout: 'Payment opens on the provider’s secure checkout page.',
        placeOrder: 'Place order', submitting: 'Submitting…',
        contactRequired: 'Enter your name, phone number or table number.',
        orderSuccess: 'Order sent to the restaurant', orderNumber: 'Order', dismiss: 'Continue',
        onlinePaymentStarted: 'Complete secure checkout. Your payment will be captured after the restaurant accepts.',
        subtotal: 'Subtotal', total: 'Estimated total', noResults: 'No dishes in this section.',
        emptyMenu: 'The menu will be available soon.', loadError: 'The menu is temporarily unavailable.',
        currencyMismatch: 'All cart items must use the same currency.',
      };

  const categories = useMemo(() => [...new Set(items.map((item) => String(item.category || '').trim()).filter(Boolean))], [items]);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items.filter((item) => {
      const categoryMatches = !selectedCategory || String(item.category || '').trim() === selectedCategory;
      const textMatches = !needle || `${item.name || ''} ${item.description || ''} ${item.category || ''}`.toLocaleLowerCase(locale).includes(needle);
      return categoryMatches && textMatches;
    });
  }, [items, query, selectedCategory, locale]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalMinor = cart.reduce((sum, line) => sum + line.item.priceMinor * line.quantity, 0);
  const tipMinor = Math.round((subtotalMinor * tipRateBps) / 10000);
  const totalMinor = subtotalMinor + tipMinor;
  const currency = cart[0]?.item.currency || 'XOF';

  const addToCart = (item) => {
    if (item.isAvailable === false) return;
    if (cart.length && cart[0].item.currency !== item.currency) {
      setCheckoutError(copy.currencyMismatch);
      setCartVisible(true);
      return;
    }
    setCheckoutError('');
    setCart((current) => {
      const existing = current.find((line) => String(line.item._id) === String(item._id));
      if (existing) return current.map((line) => String(line.item._id) === String(item._id) ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { item, quantity: 1 }];
    });
    setSelectedItem(null);
  };

  const changeQuantity = (itemId, delta) => {
    setCart((current) => current
      .map((line) => String(line.item._id) === String(itemId) ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  };

  const submitOrder = async () => {
    if (isSubmitting || !cart.length) return;
    if (!customerName.trim() && !customerPhone.trim() && !tableNumber.trim()) {
      setCheckoutError(copy.contactRequired);
      return;
    }
    setIsSubmitting(true);
    setCheckoutError('');
    try {
      const order = await createPublicRestaurantOrder(companyId, {
        currency,
        customer: { name: customerName, phone: customerPhone },
        tableNumber,
        tipRateBps,
        paymentMethod,
        lines: cart.map(({ item, quantity }) => ({ productId: item._id, quantity })),
      });
      if (paymentMethod !== 'pay_at_venue') {
        if (!order?.checkoutUrl) throw new Error(copy.loadError);
        await Linking.openURL(order.checkoutUrl);
      }
      setConfirmationPaymentMethod(paymentMethod);
      setConfirmation(order?.orderNumber || '');
      setCart([]);
      setCheckoutStep(false);
      setTipRateBps(0);
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
    } catch (submitError) {
      setCheckoutError(submitError?.response?.data?.error || submitError?.message || copy.loadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = (item) => (
    <TouchableOpacity
      key={String(item._id)}
      style={[styles.dishCard, item.isAvailable === false && styles.dishUnavailable]}
      onPress={() => item.isAvailable !== false && setSelectedItem(item)}
      activeOpacity={item.isAvailable === false ? 1 : 0.88}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatMoney(item.priceMinor, item.currency, locale)}`}
    >
      <View style={styles.dishImageWrap}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.dishImage} /> : <Text style={styles.dishPlaceholder}>🍽️</Text>}
        {item.isAvailable === false ? <View style={styles.unavailableScrim}><Text style={styles.unavailableLabel}>{copy.unavailable}</Text></View> : null}
      </View>
      <View style={styles.dishCopy}>
        <Text style={styles.dishName} numberOfLines={2}>{item.name}</Text>
        {item.description ? <Text style={styles.dishDescription} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.dishFooter}>
          <Text style={styles.dishPrice}>{formatMoney(item.priceMinor, item.currency, locale)}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.add}
            onPress={() => addToCart(item)}
            disabled={item.isAvailable === false}
            style={[styles.addDishButton, item.isAvailable === false && styles.buttonDisabled]}
          >
            <Text style={styles.addDishText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.menuHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GOON · RESTAURANT</Text>
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        <TouchableOpacity style={styles.cartIconButton} onPress={() => { setCartVisible(true); setCheckoutStep(false); }} accessibilityRole="button" accessibilityLabel={copy.cart}>
          <Text style={styles.cartIcon}>🛒</Text>
          {itemCount > 0 ? <Text style={styles.cartCount}>{itemCount}</Text> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor={COLORS.muted} style={styles.searchInput} />
        <View style={styles.searchIcon}><Text style={styles.searchIconText}>⌕</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {['', ...categories].map((category) => {
          const selected = selectedCategory === category;
          return (
            <TouchableOpacity key={category || 'all'} style={[styles.categoryChip, selected && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category || copy.all}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error || !isLoading && !items.length ? <Text style={styles.stateText}>{error || copy.emptyMenu}</Text> : null}
      {isLoading ? <ActivityIndicator color={COLORS.pink} style={styles.loading} /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <View style={styles.dishGrid}>
          {filteredItems.map(renderItem)}
          {!filteredItems.length ? <Text style={styles.stateText}>{copy.noResults}</Text> : null}
        </View>
      ) : null}

      {itemCount > 0 ? (
        <TouchableOpacity style={styles.cartBar} onPress={() => { setCartVisible(true); setCheckoutStep(false); }} accessibilityRole="button">
          <View style={styles.cartBarCount}><Text style={styles.cartBarCountText}>{itemCount}</Text></View>
          <Text style={styles.cartBarLabel}>{copy.cart}</Text>
          <Text style={styles.cartBarTotal}>{formatMoney(subtotalMinor, currency, locale)}</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetTopline}>
              <Text style={styles.sheetTitle}>{copy.detail}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)} accessibilityRole="button" accessibilityLabel="Close"><Text style={styles.closeButton}>×</Text></TouchableOpacity>
            </View>
            {selectedItem?.imageUrl ? <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} /> : <View style={styles.detailImagePlaceholder}><Text style={styles.dishPlaceholder}>🍽️</Text></View>}
            <Text style={styles.detailCategory}>{selectedItem?.category || copy.title}</Text>
            <Text style={styles.detailName}>{selectedItem?.name}</Text>
            <Text style={styles.detailDescription}>{selectedItem?.description || ''}</Text>
            <View style={styles.detailFooter}>
              <Text style={styles.detailPrice}>{formatMoney(selectedItem?.priceMinor || 0, selectedItem?.currency, locale)}</Text>
              <MenuButton label={copy.add} onPress={() => selectedItem && addToCart(selectedItem)} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cartVisible} transparent animationType="slide" onRequestClose={() => { setCartVisible(false); setCheckoutStep(false); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.cartSheet}>
            <View style={styles.sheetTopline}>
              <Text style={styles.sheetTitle}>{checkoutStep ? copy.checkoutTitle : copy.cart}</Text>
              <TouchableOpacity onPress={() => { setCartVisible(false); setCheckoutStep(false); }} accessibilityRole="button" accessibilityLabel="Close"><Text style={styles.closeButton}>×</Text></TouchableOpacity>
            </View>
            {!checkoutStep ? (
              !cart.length ? (
                <Text style={styles.emptyCartText}>{copy.emptyCart}</Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  {cart.map(({ item, quantity }) => (
                    <View key={String(item._id)} style={styles.cartLine}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.cartImage} /> : <View style={styles.cartImagePlaceholder}><Text>🍽️</Text></View>}
                      <View style={styles.cartLineCopy}>
                        <Text style={styles.cartLineName}>{item.name}</Text>
                        <Text style={styles.cartLinePrice}>{formatMoney(item.priceMinor * quantity, item.currency, locale)}</Text>
                        <View style={styles.quantityControl}>
                          <TouchableOpacity onPress={() => changeQuantity(item._id, -1)} style={styles.quantityButton}><Text style={styles.quantityButtonText}>−</Text></TouchableOpacity>
                          <Text style={styles.quantityValue}>{quantity}</Text>
                          <TouchableOpacity onPress={() => changeQuantity(item._id, 1)} style={styles.quantityButton}><Text style={styles.quantityButtonText}>＋</Text></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalLine}><Text style={styles.totalLabel}>{'Sous-total'}</Text><Text style={styles.totalValue}>{formatMoney(subtotalMinor, currency, locale)}</Text></View>
                  <MenuButton label={copy.checkout} onPress={() => { setCheckoutStep(true); setCheckoutError(''); }} />
                </ScrollView>
              )
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel}>{copy.tableHeading}</Text>
                <TextInput value={tableNumber} onChangeText={setTableNumber} placeholder={copy.table} placeholderTextColor={COLORS.muted} style={styles.formInput} />
                <Text style={styles.formLabel}>{copy.contactHeading}</Text>
                <TextInput value={customerName} onChangeText={setCustomerName} placeholder={copy.name} placeholderTextColor={COLORS.muted} style={styles.formInput} />
                <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder={copy.phone} placeholderTextColor={COLORS.muted} keyboardType="phone-pad" style={styles.formInput} />
                <Text style={styles.formLabel}>{copy.tip}</Text>
                <View style={styles.tipRow}>
                  {TIP_OPTIONS.map((rate) => (
                    <TouchableOpacity key={rate} style={[styles.tipChip, tipRateBps === rate && styles.tipChipActive]} onPress={() => setTipRateBps(rate)}>
                      <Text style={[styles.tipText, tipRateBps === rate && styles.tipTextActive]}>{rate === 0 ? '0%' : `${rate / 100}%`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.formLabel}>{copy.paymentMethod}</Text>
                <View style={styles.paymentMethodRow}>
                  {[
                    ['pay_at_venue', copy.payAtVenue],
                    ...(paymentOptions.stripe ? [['stripe', copy.payWithStripe]] : []),
                    ...(paymentOptions.paypal ? [['paypal', copy.payWithPaypal]] : []),
                  ].map(([method, label]) => (
                    <TouchableOpacity
                      key={method}
                      accessibilityRole="button"
                      accessibilityState={{ selected: paymentMethod === method }}
                      onPress={() => setPaymentMethod(method)}
                      style={[styles.paymentMethodChip, paymentMethod === method && styles.paymentMethodChipActive]}
                    >
                      <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentIcon}>●</Text>
                  <Text style={styles.paymentInfoText}>{paymentMethod === 'pay_at_venue' ? copy.payOnSite : copy.secureCheckout}</Text>
                </View>
                <View style={styles.totalLine}><Text style={styles.totalLabel}>{copy.total}</Text><Text style={styles.totalValue}>{formatMoney(totalMinor, currency, locale)}</Text></View>
                {checkoutError ? <Text accessibilityRole="alert" style={styles.checkoutError}>{checkoutError}</Text> : null}
                <View style={styles.checkoutActions}>
                  <MenuButton label={copy.backToCart} onPress={() => setCheckoutStep(false)} secondary />
                  <MenuButton label={isSubmitting ? copy.submitting : copy.placeOrder} onPress={submitOrder} disabled={isSubmitting} />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationMark}>✓</Text>
            <Text style={styles.sheetTitle}>
              {confirmationPaymentMethod === 'pay_at_venue' ? copy.orderSuccess : copy.onlinePaymentStarted}
            </Text>
            <Text style={styles.confirmationNumber}>{copy.orderNumber}: {confirmation}</Text>
            <MenuButton label={copy.dismiss} onPress={() => setConfirmation('')} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: COLORS.background, padding: 14, marginHorizontal: 2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 28 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.pinkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  cartIconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, position: 'relative' },
  cartIcon: { fontSize: 18 },
  cartCount: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.pink, color: '#FFFFFF', textAlign: 'center', fontSize: 10, fontWeight: '800', overflow: 'hidden' },
  searchRow: { height: 42, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingLeft: 11, paddingRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 12, paddingVertical: 0 },
  searchIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  searchIconText: { color: COLORS.pinkSoft, fontSize: 19, lineHeight: 21 },
  categoryRow: { gap: 7, paddingVertical: 12 },
  categoryChip: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 7, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  categoryChipText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  categoryChipTextActive: { color: '#FFFFFF' },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9 },
  dishCard: { width: '48%', overflow: 'hidden', borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 3 },
  dishUnavailable: { opacity: 0.78 },
  dishImageWrap: { height: 105, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, position: 'relative' },
  dishImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  dishPlaceholder: { fontSize: 31 },
  unavailableScrim: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.42)' },
  unavailableLabel: { color: '#FFF0D0', backgroundColor: '#4A351D', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', fontSize: 9, fontWeight: '800' },
  dishCopy: { padding: 9 },
  dishName: { minHeight: 32, color: COLORS.text, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  dishDescription: { minHeight: 28, color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  dishFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  dishPrice: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  addDishButton: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pink },
  addDishText: { color: '#FFFFFF', fontSize: 18, lineHeight: 21, fontWeight: '700' },
  stateText: { color: COLORS.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, paddingVertical: 17 },
  emptyCartText: { color: COLORS.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  loading: { marginVertical: 24 },
  cartBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12, paddingHorizontal: 12, borderRadius: 9, backgroundColor: COLORS.pink },
  cartBarCount: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  cartBarCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  cartBarLabel: { flex: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cartBarTotal: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  detailSheet: { maxHeight: '90%', padding: 17, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cartSheet: { maxHeight: '92%', padding: 17, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  sheetTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '800' },
  closeButton: { color: COLORS.muted, fontSize: 25, paddingHorizontal: 5 },
  detailImage: { width: '100%', height: 205, borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  detailImagePlaceholder: { width: '100%', height: 145, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  detailCategory: { color: COLORS.pinkSoft, fontSize: 10, fontWeight: '800', marginTop: 14 },
  detailName: { color: COLORS.text, fontSize: 21, fontWeight: '800', marginTop: 4 },
  detailDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 },
  detailPrice: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  button: { minHeight: 43, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: COLORS.pink },
  buttonSecondary: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  buttonCompact: { flex: 0, minWidth: 76 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  buttonTextSecondary: { color: COLORS.text },
  buttonTextCompact: { fontSize: 10 },
  cartLine: { minHeight: 86, flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartImage: { width: 58, height: 58, borderRadius: 9, backgroundColor: COLORS.surfaceRaised },
  cartImagePlaceholder: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: COLORS.surfaceRaised },
  cartLineCopy: { flex: 1 },
  cartLineName: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  cartLinePrice: { color: COLORS.pinkSoft, fontSize: 10, fontWeight: '700', marginTop: 4 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  quantityButton: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  quantityButtonText: { color: COLORS.text, fontSize: 15, lineHeight: 18 },
  quantityValue: { minWidth: 13, color: COLORS.text, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  totalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8 },
  totalLabel: { color: COLORS.muted, fontSize: 11 },
  totalValue: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  formLabel: { color: COLORS.text, fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 5 },
  formInput: { minHeight: 42, paddingHorizontal: 11, marginBottom: 7, borderRadius: 8, backgroundColor: COLORS.surfaceRaised, color: COLORS.text, fontSize: 12 },
  tipRow: { flexDirection: 'row', gap: 7, marginVertical: 8 },
  tipChip: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  tipChipActive: { borderColor: COLORS.pink, backgroundColor: '#44202B' },
  tipText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  tipTextActive: { color: '#FFD4DE' },
  paymentMethodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 8 },
  paymentMethodChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  paymentMethodChipActive: { borderColor: COLORS.pink, backgroundColor: '#44202B' },
  paymentMethodText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  paymentMethodTextActive: { color: '#FFD4DE' },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: COLORS.surfaceRaised },
  paymentIcon: { color: COLORS.green, fontSize: 10 },
  paymentInfoText: { color: COLORS.muted, fontSize: 10 },
  checkoutError: { color: '#FF9AAA', fontSize: 11, lineHeight: 16, marginVertical: 7 },
  checkoutActions: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  confirmationCard: { margin: 22, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'center', gap: 12 },
  confirmationMark: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: '#07120C', backgroundColor: COLORS.green, fontSize: 27, fontWeight: '800' },
  confirmationNumber: { color: COLORS.muted, fontSize: 11, marginBottom: 4 },
});