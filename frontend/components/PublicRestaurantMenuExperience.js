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
import { useNavigation } from '@react-navigation/native';
import { navigateToMyOrders } from '../navigation/navigationRef';
import { createPublicRestaurantOrder, getMyDishLikes, getMyPaymentMethods, toggleDishLike } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

import { unitPrice } from '../utils/dishPricing';
import { convertMinor, getStoredDisplayCurrency, loadRates, storeDisplayCurrency } from '../utils/currency';
import CurrencyPickerModal from './CurrencyPickerModal';
import CartScreen from './menu/CartScreen';
import CategoriesSheet from './menu/CategoriesSheet';
import CheckoutScreen from './menu/CheckoutScreen';
import DishDetailsScreen from './menu/DishDetailsScreen';
import FiltersScreen from './menu/FiltersScreen';
import { TAG_ICONS } from './menu/theme';
import { useTheme } from '../context/ThemeContext';

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

const LABELS = {
  fr: {
    gluten: 'Gluten', dairy: 'Lait', nuts: 'Fruits à coque', eggs: 'Œufs', shellfish: 'Crustacés', fish: 'Poisson', soy: 'Soja', sesame: 'Sésame',
    spicy: 'Épicé', vegetarian: 'Végétarien', vegan: 'Vegan', meat: 'Viande', sweet: 'Sucré',
    popular: 'Populaires', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant', prep: 'Plus rapide',
  },
  en: {
    gluten: 'Gluten', dairy: 'Dairy', nuts: 'Nuts', eggs: 'Eggs', shellfish: 'Shellfish', fish: 'Fish', soy: 'Soy', sesame: 'Sesame',
    spicy: 'Spicy', vegetarian: 'Vegetarian', vegan: 'Vegan', meat: 'Meat', sweet: 'Sweet',
    popular: 'Popular', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low', prep: 'Fastest',
  },
};

function MenuButton({ label, onPress, disabled = false, secondary = false, compact = false }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

export default function PublicRestaurantMenuExperience({ companyId, items = [], paymentOptions = {}, isLoading = false, error = '', locationLabel = '' }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { activeLanguage } = useLanguage();
  const { isGuest, user } = useUser();
  const navigation = useNavigation();
  const [likedIds, setLikedIds] = useState([]);
  const [displayCurrency, setDisplayCurrency] = useState('');
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [rates, setRates] = useState(null);
  const [likeCounts, setLikeCounts] = useState({});
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
  const [fulfillmentType, setFulfillmentType] = useState('dine_in');
  const [filterVisible, setFilterVisible] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [excludedAllergens, setExcludedAllergens] = useState([]);
  const [requiredTags, setRequiredTags] = useState([]);
  const [sortKey, setSortKey] = useState('popular');
  const [dishType, setDishType] = useState('');
  const [priceRange, setPriceRange] = useState(null);
  const [calRange, setCalRange] = useState(null);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const [tipRateBps, setTipRateBps] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pay_at_venue');
  const [savedCards, setSavedCards] = useState([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmationPaymentMethod, setConfirmationPaymentMethod] = useState('pay_at_venue');
  const copy = isFrench
    ? {
        title: 'À la carte', search: 'Rechercher un plat', all: 'Tout',
        eatIn: 'Sur place', takeAway: 'À emporter', specialOffer: 'Offre spéciale', badgeNew: 'Nouveau', badgeLimited: 'Offre limitée', minutes: 'min', kcal: 'kcal',
        forYou: 'Pour toi', featured: 'Coup de cœur', badgeOffer: 'Offre', allergensLabel: 'Allergènes', prepLabel: 'Préparation',
        currencyTitle: "Devise d'affichage", currencySearch: 'Rechercher une devise', originalCurrency: 'Originale', billedIn: 'Facturé en :',
        dishType: 'Type de plat', dishTypes: { popular: 'Populaire', new: 'Nouveau', discounted: 'En promo' }, price: 'Prix', calories: 'Calories', from: 'De', to: 'À',
        otherPreferences: 'Autres préférences', no: 'Sans', only: 'uniquement', categoriesTitle: 'Catégories', totalAmount: 'Montant total', ingredients: 'Ingrédients :',
        customize: 'Personnaliser', customizePlaceholder: 'Ex. sans yaourt, sauce à part', aboutProduct: 'À propos du plat :', waitingTime: 'Temps d’attente estimé',
        discount: 'Remise', clear: 'Effacer', clearCartTitle: 'Vider le panier ?', cancel: 'Annuler', change: 'Modifier', noChanges: 'Ingrédients inchangés.',
        pay: 'Payer', newCard: 'Nouvelle carte', trackOrder: 'Suivre ma commande', myOrders: 'Mes commandes', details: 'Détails', itemsCount: (count) => `${count} article${count > 1 ? 's' : ''}`, tipAmount: 'Pourboire',
        likeLoginTitle: 'Connexion requise', likeLoginBody: 'Connecte-toi pour aimer un plat.', likeError: "Impossible d'enregistrer ton j'aime.", openProfile: 'Mon profil', openMap: 'Voir sur la carte', filters: 'Filtres', allergensTitle: 'Exclure les allergènes', tagsTitle: 'Régimes et goûts', sortTitle: 'Trier par', apply: 'Appliquer', reset: 'Réinitialiser',
        allergyTip: 'Nouveau : trie les plats par allergies dans les filtres.', bulkOff: (percent, qty) => `${percent}% pour ${qty}`, noLocation: 'Adresse non renseignée',
        contactRequiredTakeaway: 'Indique ton nom ou ton téléphone.',
        detail: 'Détail du plat', add: 'Ajouter au panier', unavailable: 'Indisponible',
        cart: 'Mon panier', emptyCart: 'Ton panier est vide.', checkout: 'Passer la commande',
        checkoutTitle: 'Finaliser', backToCart: 'Retour au panier', tableHeading: 'Table', contactHeading: 'Contact', table: 'Numéro de table (facultatif)',
        name: 'Ton nom', phone: 'Téléphone', tip: 'Pourboire', payOnSite: 'Paiement au restaurant',
        paymentMethod: 'Mode de paiement', payAtVenue: 'Sur place', payWithStripe: 'Visa · Stripe', payWithPaypal: 'PayPal',
        payInApp: "Payer dans l'app", payAtRestaurant: 'Payer au restaurant', onlineUnavailable: "Le paiement dans l'app n'est pas encore activé par ce restaurant.", onlineUsdOnly: "Le paiement dans l'app est disponible en USD uniquement, avec des plats dans une seule devise.",
        savedCard: 'Carte enregistrée', enterNewCard: 'Utiliser une nouvelle carte',
        secureCheckout: 'Le paiement s’ouvre sur la page sécurisée du prestataire.',
        placeOrder: 'Confirmer la commande', submitting: 'Envoi…',
        contactRequired: 'Indique ton nom, ton téléphone ou ton numéro de table.',
        orderSuccess: 'Commande envoyée au restaurant', orderNumber: 'Numéro', dismiss: 'Continuer',
        onlinePaymentStarted: 'Termine le paiement sécurisé. Le montant sera capturé après acceptation du restaurant.',
        subtotal: 'Sous-total', total: 'Total estimé', noResults: 'Aucun plat dans cette section.',
        emptyMenu: 'La carte sera bientôt disponible.', loadError: 'La carte est momentanément indisponible.',
        currencyMismatch: 'Conversion de devise indisponible pour le moment. Réessaie dans un instant.',
      }
    : {
        title: 'Menu', search: 'Search dishes', all: 'All',
        eatIn: 'Eat in', takeAway: 'Take away', specialOffer: 'Special offer', badgeNew: 'New', badgeLimited: 'Limited offer', minutes: 'min', kcal: 'kcal',
        forYou: 'For you', featured: "Chef's pick", badgeOffer: 'Offer', allergensLabel: 'Allergens', prepLabel: 'Preparation',
        currencyTitle: 'Display currency', currencySearch: 'Search currency', originalCurrency: 'Original', billedIn: 'Billed in:',
        dishType: 'Dish type', dishTypes: { popular: 'Popular', new: 'New', discounted: 'Discounted' }, price: 'Price', calories: 'Calories', from: 'From', to: 'To',
        otherPreferences: 'Other preferences', no: 'No', only: 'only', categoriesTitle: 'Categories', totalAmount: 'Total amount', ingredients: 'Ingredients:',
        customize: 'Customize', customizePlaceholder: 'E.g. no yogurt, sauce on the side', aboutProduct: 'About product:', waitingTime: 'Estimated waiting time',
        discount: 'Discount', clear: 'Clear', clearCartTitle: 'Clear the cart?', cancel: 'Cancel', change: 'Change', noChanges: 'Ingredients have not been changed.',
        pay: 'Pay', newCard: 'New card', trackOrder: 'Track my order', myOrders: 'My orders', details: 'Details', itemsCount: (count) => `${count} item${count > 1 ? 's' : ''}`, tipAmount: 'Tip amount',
        likeLoginTitle: 'Sign in required', likeLoginBody: 'Sign in to like a dish.', likeError: 'Unable to save your like.', openProfile: 'My profile', openMap: 'View on map', filters: 'Filters', allergensTitle: 'Exclude allergens', tagsTitle: 'Diets and tastes', sortTitle: 'Sort by', apply: 'Apply', reset: 'Reset',
        allergyTip: 'New: sort dishes by allergies in the filters.', bulkOff: (percent, qty) => `${percent}% off for ${qty}`, noLocation: 'Address not provided',
        contactRequiredTakeaway: 'Enter your name or phone number.',
        detail: 'Dish details', add: 'Add to cart', unavailable: 'Unavailable',
        cart: 'Your cart', emptyCart: 'Your cart is empty.', checkout: 'Proceed to checkout',
        checkoutTitle: 'Checkout', backToCart: 'Back to cart', tableHeading: 'Table', contactHeading: 'Contact', table: 'Table number (optional)',
        name: 'Your name', phone: 'Phone', tip: 'Tip', payOnSite: 'Pay at the restaurant',
        paymentMethod: 'Payment method', payAtVenue: 'At the restaurant', payWithStripe: 'Visa · Stripe', payWithPaypal: 'PayPal',
        payInApp: 'Pay in the app', payAtRestaurant: 'Pay at the restaurant', onlineUnavailable: 'This restaurant has not enabled in-app payment yet.', onlineUsdOnly: 'In-app payment is available in USD only, with dishes in a single currency.',
        savedCard: 'Saved card', enterNewCard: 'Use a new card',
        secureCheckout: 'Payment opens on the provider’s secure checkout page.',
        placeOrder: 'Place order', submitting: 'Submitting…',
        contactRequired: 'Enter your name, phone number or table number.',
        orderSuccess: 'Order sent to the restaurant', orderNumber: 'Order', dismiss: 'Continue',
        onlinePaymentStarted: 'Complete secure checkout. Your payment will be captured after the restaurant accepts.',
        subtotal: 'Subtotal', total: 'Estimated total', noResults: 'No dishes in this section.',
        emptyMenu: 'The menu will be available soon.', loadError: 'The menu is temporarily unavailable.',
        currencyMismatch: 'Currency conversion is unavailable right now. Try again in a moment.',
      };

  useEffect(() => {
    let active = true;
    if (isGuest || !paymentOptions.stripe) {
      setSavedCards([]);
      setSelectedSavedCardId('');
      return () => { active = false; };
    }
    setSavedCardsLoading(true);
    getMyPaymentMethods()
      .then((cards) => { if (active) setSavedCards(cards || []); })
      .catch(() => { if (active) setSavedCards([]); })
      .finally(() => { if (active) setSavedCardsLoading(false); });
    return () => { active = false; };
  }, [isGuest, paymentOptions.stripe]);

  useEffect(() => {
    if (isGuest || !companyId) {
      setLikedIds([]);
      return undefined;
    }
    let active = true;
    getMyDishLikes(companyId)
      .then((ids) => { if (active) setLikedIds(ids); })
      .catch(() => {});
    return () => { active = false; };
  }, [isGuest, companyId]);

  useEffect(() => {
    let active = true;
    getStoredDisplayCurrency().then((stored) => { if (active && stored) setDisplayCurrency(stored); });
    loadRates().then((loaded) => { if (active) setRates(loaded); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isGuest && user?.name) setCustomerName((current) => current || user.name);
  }, [isGuest, user?.name]);

  const chooseDisplayCurrency = (next) => {
    setDisplayCurrency(next);
    setPriceRange(null);
    storeDisplayCurrency(next);
  };

  const money = (minor, from) => {
    const converted = displayCurrency && displayCurrency !== from ? convertMinor(minor, from, displayCurrency, rates) : null;
    return converted === null ? formatMoney(minor, from, locale) : `≈ ${formatMoney(converted, displayCurrency, locale)}`;
  };

  const handleLike = async (item) => {
    if (isGuest) {
      Alert.alert(copy.likeLoginTitle, copy.likeLoginBody);
      return;
    }
    const dishId = String(item._id);
    try {
      const result = await toggleDishLike(companyId, dishId);
      setLikedIds((ids) => (result.liked ? [...new Set([...ids, dishId])] : ids.filter((id) => id !== dishId)));
      setLikeCounts((counts) => ({ ...counts, [dishId]: result.likesCount }));
    } catch (_) {
      Alert.alert(copy.likeError);
    }
  };

  const openLocation = () => {
    if (!locationLabel) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`).catch(() => {});
  };

  const categories = useMemo(() => [...new Set(items.map((item) => String(item.category || '').trim()).filter(Boolean))], [items]);
  const filterCurrency = displayCurrency || items[0]?.currency || 'USD';
  const itemMajor = (item) => {
    const base = unitPrice(item);
    const minor = item.currency === filterCurrency ? base : (convertMinor(base, item.currency, filterCurrency, rates) ?? base);
    return minor / currencyScale(filterCurrency);
  };
  const priceBounds = useMemo(() => {
    const values = items.map(itemMajor);
    return values.length
      ? [Math.floor(Math.min(...values)), Math.max(50000, Math.ceil(Math.max(...values)))]
      : [0, 0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterCurrency, rates]);
  const calBounds = useMemo(() => {
    const values = items.map((item) => item.calories || 0).filter(Boolean);
    return values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];
  }, [items]);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const list = items.filter((item) => {
      const categoryMatches = !selectedCategory || String(item.category || '').trim() === selectedCategory;
      const textMatches = !needle || `${item.name || ''} ${item.description || ''} ${item.category || ''}`.toLocaleLowerCase(locale).includes(needle);
      const allergenSafe = !excludedAllergens.some((key) => (item.allergens || []).includes(key) || (item.tags || []).includes(key));
      const tagsMatch = requiredTags.every((tag) => (item.tags || []).includes(tag));
      const typeMatches = !dishType || (dishType === 'popular' ? (item.likesCount || 0) > 0 : dishType === 'new' ? item.badge === 'new' : (item.discountPercent > 0 || item.badge === 'offer' || item.bulkDiscountPercent > 0));
      const major = itemMajor(item);
      const priceMatches = !priceRange || (major >= priceRange[0] && major <= priceRange[1]);
      const calMatches = !calRange || !item.calories || (item.calories >= calRange[0] && item.calories <= calRange[1]);
      return categoryMatches && textMatches && allergenSafe && tagsMatch && typeMatches && priceMatches && calMatches;
    });
    const sorters = {
      popular: (a, b) => (b.likesCount || 0) - (a.likesCount || 0),
      priceAsc: (a, b) => unitPrice(a) - unitPrice(b),
      priceDesc: (a, b) => unitPrice(b) - unitPrice(a),
      prep: (a, b) => (a.prepTimeMinutes || 9999) - (b.prepTimeMinutes || 9999),
    };
    return [...list].sort(sorters[sortKey]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, selectedCategory, locale, excludedAllergens, requiredTags, sortKey, dishType, priceRange, calRange, filterCurrency, rates]);
  const labels = LABELS[isFrench ? 'fr' : 'en'];
  const activeFilterCount = excludedAllergens.length + requiredTags.length + (sortKey !== 'popular' ? 1 : 0) + (dishType ? 1 : 0) + (priceRange ? 1 : 0) + (calRange ? 1 : 0);
  const toggleInList = (setter, value) => setter((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const currency = cart[0]?.item.currency || 'XOF';
  const hasMixedCurrencies = cart.some((line) => line.item.currency !== currency);
  const subtotalMinor = cart.reduce((sum, line) => {
    const lineMinor = unitPrice(line.item, line.quantity) * line.quantity;
    return sum + (line.item.currency === currency ? lineMinor : (convertMinor(lineMinor, line.item.currency, currency, rates) ?? 0));
  }, 0);
  const tipMinor = Math.round((subtotalMinor * tipRateBps) / 10000);
  const totalMinor = subtotalMinor + tipMinor;

  const addToCart = (item, note = '') => {
    if (item.isAvailable === false) return;
    if (cart.length && cart[0].item.currency !== item.currency && !rates) {
      setCheckoutError(copy.currencyMismatch);
      setCartVisible(true);
      return;
    }
    setCheckoutError('');
    setCart((current) => {
      const existing = current.find((line) => String(line.item._id) === String(item._id));
      if (existing) return current.map((line) => String(line.item._id) === String(item._id) ? { ...line, quantity: line.quantity + 1, note: note || line.note } : line);
      return [...current, { item, quantity: 1, note }];
    });
    setSelectedItem(null);
  };

  const changeQuantity = (itemId, delta) => {
    setCart((current) => current
      .map((line) => String(line.item._id) === String(itemId) ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  };

  const setLineNote = (itemId, note) => {
    setCart((current) => current.map((line) => (String(line.item._id) === String(itemId) ? { ...line, note } : line)));
  };

  const toMinorInCartCurrency = (minor, from) => (from === currency ? minor : (convertMinor(minor, from, currency, rates) ?? 0));
  const waitingMinutes = cart.reduce((max, line) => Math.max(max, line.item.prepTimeMinutes || 0), 0);
  const discountMinor = cart.reduce((sum, line) => sum + toMinorInCartCurrency(
    (line.item.priceMinor * line.quantity) - (unitPrice(line.item, line.quantity) * line.quantity),
    line.item.currency,
  ), 0);

  const clearCart = () => {
    setCart([]);
    setCartVisible(false);
    setCheckoutStep(false);
  };

  const clearCheckoutForm = () => {
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setTipRateBps(0);
    setCheckoutError('');
  };

  const submitOrder = async () => {
    if (isSubmitting || !cart.length) return;
    if (!customerName.trim() && !customerPhone.trim() && (fulfillmentType === 'takeaway' || !tableNumber.trim())) {
      setCheckoutError(fulfillmentType === 'takeaway' ? copy.contactRequiredTakeaway : copy.contactRequired);
      return;
    }
    setIsSubmitting(true);
    setCheckoutError('');
    try {
      const order = await createPublicRestaurantOrder(companyId, {
        currency,
        customer: { name: customerName, phone: customerPhone },
        tableNumber: fulfillmentType === 'dine_in' ? tableNumber : '',
        fulfillmentType,
        tipRateBps,
        paymentMethod,
        ...(paymentMethod === 'stripe' && selectedSavedCardId ? { savedPaymentMethodId: selectedSavedCardId } : {}),
        lines: cart.map(({ item, quantity, note }) => ({ productId: item._id, quantity, note: note || '' })),
      });
      if (paymentMethod !== 'pay_at_venue') {
        if (order?.checkoutUrl) {
          await Linking.openURL(order.checkoutUrl);
        } else if (paymentMethod !== 'stripe' || !selectedSavedCardId || order?.paymentStatus !== 'authorized') {
          throw new Error(copy.loadError);
        }
      }
      setConfirmationPaymentMethod(paymentMethod);
      setConfirmation(order?.orderNumber || '');
      setCart([]);
      setCheckoutStep(false);
      setCartVisible(false);
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

  const onlineMethods = [
    ...(paymentOptions.stripe ? [['stripe', copy.payWithStripe]] : []),
    ...(paymentOptions.paypal ? [['paypal', copy.payWithPaypal]] : []),
  ];
  const onlineAvailable = onlineMethods.length > 0 && currency === 'USD' && !hasMixedCurrencies;

  useEffect(() => {
    if (!onlineAvailable && paymentMethod !== 'pay_at_venue') {
      setPaymentMethod('pay_at_venue');
      setSelectedSavedCardId('');
    }
  }, [onlineAvailable, paymentMethod]);

  const renderPrice = (item, style) => (
    <View style={styles.priceStack}>
      <Text style={style}>{money(unitPrice(item), item.currency)}</Text>
      {item.discountPercent > 0 ? <Text style={styles.oldPrice}>{money(item.priceMinor, item.currency)}</Text> : null}
    </View>
  );

  const badgeLabel = (item) => (item.badge === 'new' ? copy.badgeNew : item.badge === 'limited' ? copy.badgeLimited : item.badge === 'offer' || item.discountPercent > 0 ? (item.discountPercent > 0 ? `-${item.discountPercent}%` : copy.badgeOffer) : '');
  const promoItem = items.find((item) => item.isAvailable !== false && (item.badge === 'offer' || item.discountPercent > 0));
  const featuredItem = items.find((item) => item.isAvailable !== false && item.isFeatured);
  const offerItem = featuredItem || promoItem || [...items].filter((item) => item.isAvailable !== false).sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))[0];

  const renderItem = (item) => (
    <TouchableOpacity
      key={String(item._id)}
      style={[styles.dishCard, item.isAvailable === false && styles.dishUnavailable]}
      onPress={() => item.isAvailable !== false && setSelectedItem(item)}
      activeOpacity={item.isAvailable === false ? 1 : 0.88}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${money(unitPrice(item), item.currency)}`}
    >
      <View style={styles.dishImageWrap}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.dishImage} /> : <Text style={styles.dishPlaceholder}>🍽️</Text>}
        {(item.tags || []).length ? (
          <View style={styles.tagRow}>
            {item.tags.filter((tag) => TAG_ICONS[tag]).slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagChip}><Text style={styles.tagChipText}>{TAG_ICONS[tag]}</Text></View>
            ))}
          </View>
        ) : null}
        {badgeLabel(item) || (item.bulkMinQuantity > 0 && item.bulkDiscountPercent > 0) ? (
          <View style={[styles.dishBadge, item.badge === 'new' && styles.dishBadgeNew, item.badge === 'limited' && styles.dishBadgeLimited, !badgeLabel(item) && styles.dishBadgeBulk]}>
            <Text style={[styles.dishBadgeText, item.badge === 'limited' && styles.dishBadgeTextLimited]}>{badgeLabel(item) || copy.bulkOff(item.bulkDiscountPercent, item.bulkMinQuantity)}</Text>
          </View>
        ) : null}
        {item.isAvailable === false ? <View style={styles.unavailableScrim}><Text style={styles.unavailableLabel}>{copy.unavailable}</Text></View> : null}
      </View>
      <View style={styles.dishCopy}>
        <Text style={styles.dishName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.dishMetaRow}>
          <Text style={styles.dishMeta} numberOfLines={1}>
            {item.prepTimeMinutes ? `⏱ ${item.prepTimeMinutes} ${copy.minutes}` : ''}{item.prepTimeMinutes && item.calories ? ' · ' : ''}{item.calories ? `${item.calories} ${copy.kcal}` : ''}
          </Text>
          <TouchableOpacity style={styles.likeButton} onPress={() => handleLike(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityState={{ selected: likedIds.includes(String(item._id)) }}>
            <Text style={styles.likeIcon}>{likedIds.includes(String(item._id)) ? '❤️' : '🤍'}</Text>
            <Text style={styles.likeCount}>{likeCounts[String(item._id)] ?? item.likesCount ?? 0}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dishFooter}>
          {renderPrice(item, styles.dishPrice)}
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
        <TouchableOpacity style={styles.locationRow} onPress={openLocation} disabled={!locationLabel} accessibilityRole="button" accessibilityLabel={copy.openMap}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel || copy.noLocation}</Text>
          <Text style={styles.locationChevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartPill} onPress={() => { setCartVisible(true); setCheckoutStep(false); }} accessibilityRole="button" accessibilityLabel={copy.cart}>
          <Text style={styles.cartPillCount}>{itemCount}</Text>
          <Text style={styles.cartIcon}>🛒</Text>
        </TouchableOpacity>
        {!isGuest ? (
          <TouchableOpacity style={styles.ordersButton} onPress={navigateToMyOrders} accessibilityRole="button" accessibilityLabel={copy.myOrders}>
            <Text style={styles.cartIcon}>🧾</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel={copy.openProfile}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}><Text style={styles.headerAvatarText}>{String(user?.name || 'G').charAt(0).toUpperCase()}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.fulfillmentRow}>
        {[['dine_in', copy.eatIn], ['takeaway', copy.takeAway]].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: fulfillmentType === value }}
            style={[styles.fulfillmentOption, fulfillmentType === value && styles.fulfillmentOptionActive]}
            onPress={() => setFulfillmentType(value)}
          >
            <Text style={[styles.fulfillmentText, fulfillmentType === value && styles.fulfillmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {offerItem ? (
        <TouchableOpacity style={styles.offerBanner} activeOpacity={0.9} onPress={() => setSelectedItem(offerItem)}>
          {offerItem.imageUrl ? <Image source={{ uri: offerItem.imageUrl }} style={styles.offerImage} /> : <Text style={styles.offerPlaceholder}>🍽️</Text>}
          <View style={styles.offerScrim} />
          <View style={styles.offerBadge}><Text style={styles.dishBadgeText}>{offerItem === promoItem && !featuredItem ? copy.specialOffer : copy.featured}</Text></View>
          <Text style={styles.offerTitle} numberOfLines={2}>{offerItem.name}</Text>
          {offerItem.discountPercent > 0 ? <View style={styles.offerDiscount}><Text style={styles.dishBadgeText}>{offerItem.discountPercent}% off</Text></View> : null}
        </TouchableOpacity>
      ) : null}

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIconText}>⌕</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor={COLORS.muted} style={styles.searchInput} />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)} accessibilityRole="button" accessibilityLabel={copy.filters}>
          <Text style={styles.filterButtonText}>⚙</Text>
          {activeFilterCount > 0 ? <View style={styles.filterDot}><Text style={styles.filterDotText}>{activeFilterCount}</Text></View> : null}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        <TouchableOpacity style={styles.categoryIconChip} onPress={() => setCategoriesVisible(true)} accessibilityRole="button" accessibilityLabel={copy.categoriesTitle}>
          <Text style={styles.categoryChipText}>☰</Text>
        </TouchableOpacity>
        {['', ...categories].map((category) => {
          const selected = selectedCategory === category;
          return (
            <TouchableOpacity key={category || 'all'} style={[styles.categoryChip, selected && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category || copy.forYou}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!tipDismissed ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <TouchableOpacity style={styles.infoTextWrap} onPress={() => setFilterVisible(true)}>
            <Text style={styles.infoText}>{copy.allergyTip}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTipDismissed(true)} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.infoClose}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
          <Text style={styles.cartBarTotal}>{money(subtotalMinor, currency)}</Text>
        </TouchableOpacity>
      ) : null}

      <FiltersScreen
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onReset={() => { setExcludedAllergens([]); setRequiredTags([]); setSortKey('popular'); setDishType(''); setPriceRange(null); setCalRange(null); }}
        copy={copy}
        labels={labels}
        dishType={dishType}
        setDishType={setDishType}
        priceBounds={priceBounds}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        priceUnit={filterCurrency}
        calBounds={calBounds}
        calRange={calRange}
        setCalRange={setCalRange}
        excluded={excludedAllergens}
        toggleExcluded={(key) => toggleInList(setExcludedAllergens, key)}
        requiredTags={requiredTags}
        toggleTag={(key) => toggleInList(setRequiredTags, key)}
        sortKey={sortKey}
        setSortKey={setSortKey}
        currencyLabel={displayCurrency || copy.originalCurrency}
        onOpenCurrency={() => setCurrencyPickerVisible(true)}
      />
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        onClose={() => setCurrencyPickerVisible(false)}
        onSelect={chooseDisplayCurrency}
        selected={displayCurrency}
        locale={isFrench ? 'fr' : 'en'}
        title={copy.currencyTitle}
        searchPlaceholder={copy.currencySearch}
        originalLabel={copy.originalCurrency}
      />
      <CategoriesSheet
        visible={categoriesVisible}
        onClose={() => setCategoriesVisible(false)}
        title={copy.categoriesTitle}
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        forYouLabel={copy.forYou}
      />
      <DishDetailsScreen
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={addToCart}
        priceLabel={selectedItem ? money(unitPrice(selectedItem), selectedItem.currency) : ''}
        copy={copy}
        labels={labels}
      />
      <CartScreen
        visible={cartVisible && !checkoutStep}
        onClose={() => { setCartVisible(false); setCheckoutStep(false); }}
        onClear={clearCart}
        cart={cart}
        linePrice={(item, quantity) => money(unitPrice(item, quantity) * quantity, item.currency)}
        onQuantity={changeQuantity}
        onNote={setLineNote}
        waitingLabel={waitingMinutes ? `${waitingMinutes} ${copy.minutes}` : ''}
        discountLabel={money(discountMinor, currency)}
        subtotalLabel={money(subtotalMinor, currency)}
        onCheckout={() => { setCheckoutStep(true); setCheckoutError(''); }}
        copy={copy}
      />
      <CheckoutScreen
        visible={cartVisible && checkoutStep}
        onClose={() => setCheckoutStep(false)}
        onClear={clearCheckoutForm}
        copy={copy}
        fulfillmentType={fulfillmentType}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        tipRateBps={tipRateBps}
        setTipRateBps={setTipRateBps}
        paymentMethod={paymentMethod}
        onPickMode={(mode) => {
          setSelectedSavedCardId('');
          setPaymentMethod(mode === 'venue' ? 'pay_at_venue' : onlineMethods[0][0]);
        }}
        onlineAvailable={onlineAvailable}
        onlineMethods={onlineMethods}
        onPickMethod={(method) => {
          setPaymentMethod(method);
          if (method !== 'stripe') setSelectedSavedCardId('');
        }}
        onlineNote={!onlineAvailable ? (onlineMethods.length ? copy.onlineUsdOnly : copy.onlineUnavailable) : ''}
        isGuest={isGuest}
        savedCards={savedCards}
        savedCardsLoading={savedCardsLoading}
        selectedSavedCardId={selectedSavedCardId}
        setSelectedSavedCardId={setSelectedSavedCardId}
        itemCount={itemCount}
        tipLabel={money(tipMinor, currency)}
        waitingLabel={waitingMinutes ? `${waitingMinutes} ${copy.minutes}` : ''}
        totalLabel={money(totalMinor, currency)}
        billedNote={displayCurrency && displayCurrency !== currency ? `${copy.billedIn} ${formatMoney(totalMinor, currency, locale)}` : ''}
        error={checkoutError}
        isSubmitting={isSubmitting}
        onSubmit={submitOrder}
      />

      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationMark}>✓</Text>
            <Text style={styles.sheetTitle}>
              {confirmationPaymentMethod === 'pay_at_venue' ? copy.orderSuccess : copy.onlinePaymentStarted}
            </Text>
            <Text style={styles.confirmationNumber}>{copy.orderNumber}: {confirmation}</Text>
            {!isGuest ? <MenuButton label={copy.trackOrder} secondary onPress={() => { setConfirmation(''); setTimeout(navigateToMyOrders, 400); }} /> : null}
            <MenuButton label={copy.dismiss} onPress={() => setConfirmation('')} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  root: { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 10, marginBottom: 28 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.pinkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  cartIconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, position: 'relative' },
  cartIcon: { fontSize: 18 },
  cartCount: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.pink, color: '#FFFFFF', textAlign: 'center', fontSize: 10, fontWeight: '800', overflow: 'hidden' },
  searchRow: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.pink, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 0 },
  searchIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  searchIconText: { color: COLORS.pink, fontSize: 20, lineHeight: 22 },
  categoryRow: { gap: 8, paddingVertical: 12, alignItems: 'center' },
  categoryChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 17 },
  categoryChipActive: { backgroundColor: COLORS.pink },
  categoryChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  categoryChipTextActive: { color: '#FFFFFF' },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  dishCard: { width: '48.5%', overflow: 'hidden', borderRadius: 20, backgroundColor: COLORS.surface },
  dishUnavailable: { opacity: 0.78 },
  dishImageWrap: { height: 130, margin: 6, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, position: 'relative' },
  dishImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  dishPlaceholder: { fontSize: 31 },
  unavailableScrim: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.42)' },
  unavailableLabel: { color: '#FFF0D0', backgroundColor: '#4A351D', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', fontSize: 9, fontWeight: '800' },
  dishCopy: { padding: 9 },
  dishName: { color: COLORS.text, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  dishDescription: { minHeight: 28, color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  dishFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  dishPrice: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  priceStack: { flexShrink: 1 },
  oldPrice: { color: COLORS.muted, fontSize: 10, textDecorationLine: 'line-through' },
  dishMeta: { flex: 1, color: COLORS.muted, fontSize: 11 },
  currencySelectButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, marginBottom: 8, borderRadius: 10, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.pink },
  currencySelectText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  chargeNote: { color: COLORS.muted, fontSize: 11, textAlign: 'right', marginBottom: 8 },
  dishMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, minHeight: 20 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likeIcon: { fontSize: 14 },
  likeCount: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  dishBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: COLORS.pink },
  dishBadgeNew: { backgroundColor: '#2F9E6B' },
  dishBadgeLimited: { backgroundColor: COLORS.tint, borderWidth: 1, borderColor: COLORS.pink },
  dishBadgeBulk: { backgroundColor: '#6C4BD1' },
  dishBadgeTextLimited: { color: COLORS.pinkSoft },
  offerBadge: { position: 'absolute', top: 14, left: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: COLORS.pink },
  tagRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  tagChip: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: `${COLORS.pink}59` },
  tagChipText: { fontSize: 12 },
  locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationPin: { fontSize: 16 },
  locationText: { flexShrink: 1, color: COLORS.text, fontSize: 13, fontWeight: '700' },
  locationChevron: { color: COLORS.muted, fontSize: 18 },
  cartPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.pink, marginRight: 8 },
  cartPillCount: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
  ordersButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  headerAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised },
  headerAvatarText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.pink },
  filterButtonText: { color: COLORS.pink, fontSize: 18 },
  filterDot: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pink },
  filterDotText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  categoryIconChip: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: `${COLORS.pink}80` },
  infoIcon: { color: COLORS.pinkSoft, fontSize: 14 },
  infoTextWrap: { flex: 1 },
  infoText: { color: COLORS.muted, fontSize: 11 },
  infoClose: { color: COLORS.pink, fontSize: 14, paddingHorizontal: 4 },
  dishBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  fulfillmentRow: { flexDirection: 'row', padding: 3, marginBottom: 12, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  fulfillmentOption: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  fulfillmentOptionActive: { backgroundColor: COLORS.surfaceRaised },
  fulfillmentText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  fulfillmentTextActive: { color: COLORS.text },
  offerBanner: { height: 200, marginBottom: 14, borderRadius: 24, overflow: 'hidden', backgroundColor: COLORS.surfaceRaised, justifyContent: 'flex-end' },
  offerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  offerPlaceholder: { position: 'absolute', right: 28, alignSelf: 'center', fontSize: 72 },
  offerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  offerCopy: { padding: 14, gap: 28 },
  offerTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 32, fontWeight: '800', maxWidth: '85%', padding: 18, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  offerDiscount: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: COLORS.pink },
  addDishButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pink },
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
  detailInfo: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
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
  tipChipActive: { borderColor: COLORS.pink, backgroundColor: COLORS.tint },
  tipText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  tipTextActive: { color: COLORS.tintText },
  paymentMethodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 8 },
  paymentMethodChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  paymentMethodChipActive: { borderColor: COLORS.pink, backgroundColor: COLORS.tint },
  paymentMethodText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  paymentMethodTextActive: { color: COLORS.tintText },
  savedCardsBlock: { gap: 6, marginBottom: 8 },
  savedCardOption: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  savedCardOptionActive: { borderColor: COLORS.pink },
  savedCardMark: { color: COLORS.pinkSoft, fontSize: 12 },
  savedCardLabel: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: COLORS.surfaceRaised },
  paymentIcon: { color: COLORS.green, fontSize: 10 },
  paymentInfoText: { color: COLORS.muted, fontSize: 10 },
  checkoutError: { color: '#FF9AAA', fontSize: 11, lineHeight: 16, marginVertical: 7 },
  checkoutActions: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  confirmationCard: { margin: 22, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'center', gap: 12 },
  confirmationMark: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: '#07120C', backgroundColor: COLORS.green, fontSize: 27, fontWeight: '800' },
  confirmationNumber: { color: COLORS.muted, fontSize: 11, marginBottom: 4 },
});