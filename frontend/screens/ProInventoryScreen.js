import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../context/LanguageContext';
import {
  archiveProduct,
  createInventoryMovement,
  createProduct,
  getInventoryMovements,
  getProducts,
  uploadProductImage,
  updateProduct,
} from '../services/api';

const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
  warning: '#9A5B00',
  success: '#18794E',
};

const EMPTY_PRODUCT = {
  name: '', sku: '', description: '', category: '', price: '', currency: 'XOF', reorderPoint: '0', imageUrl: '', isAvailable: true,
};
const MOVEMENT_REASONS = ['restock', 'sale', 'return', 'damage', 'adjustment'];

function currencyScale(currency) {
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
    return 10 ** digits;
  } catch (_) {
    return 100;
  }
}

function formatPrice(priceMinor, currency, locale) {
  const scale = currencyScale(currency || 'XOF');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'XOF' }).format((priceMinor || 0) / scale);
  } catch (_) {
    return `${((priceMinor || 0) / scale).toFixed(2)} ${currency || 'XOF'}`;
  }
}

function generateMenuSku() {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  return `MENU-${suffix}`.slice(0, 64);
}

export default function ProInventoryScreen({ companyId, restaurantMode = false }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [products, setProducts] = useState([]);
  const [capabilities, setCapabilities] = useState({ canCreate: false, canUpdate: false, canArchive: false, canManageStock: false });
  const [query, setQuery] = useState('');
  const queryRef = useRef('');
  const lowStockRef = useRef(false);
  const searchEffectMounted = useRef(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [localMenuImage, setLocalMenuImage] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState('restock');
  const [stockNote, setStockNote] = useState('');
  const [historyProduct, setHistoryProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [availabilitySavingId, setAvailabilitySavingId] = useState('');

  const inventoryCopy = isFrench
    ? {
        title: 'Produits et stock', subtitle: 'Catalogue et mouvements de stock de cette entreprise.',
        search: 'Rechercher nom, SKU ou code-barres', add: 'Nouveau produit',
        empty: 'Aucun produit dans le catalogue.', retry: 'Réessayer',
        lowStock: 'Stock bas', all: 'Tous', stock: 'Stock', reorder: 'Seuil',
        createTitle: 'Créer un produit', editTitle: 'Modifier le produit',
        name: 'Nom du produit *', sku: 'SKU *', category: 'Catégorie', description: 'Description',
        price: 'Prix', currency: 'Devise (ISO)', reorderPoint: 'Seuil de réapprovisionnement',
        save: 'Enregistrer', cancel: 'Annuler', edit: 'Modifier', archive: 'Archiver',
        adjust: 'Ajuster le stock', history: 'Historique', delta: 'Variation (+/-)', note: 'Note',
        apply: 'Appliquer', restock: 'Réapprovisionnement', sale: 'Vente', return: 'Retour',
        damage: 'Perte', adjustment: 'Ajustement', low: 'À réapprovisionner',
        loadingError: 'Impossible de charger le catalogue.', saveError: 'Impossible d’enregistrer le produit.',
        movementError: 'Impossible d’enregistrer le mouvement.', archiveConfirm: 'Archiver ce produit ?',
        archived: 'Produit archivé.', saved: 'Produit enregistré.', movementSaved: 'Stock mis à jour.',
        historyEmpty: 'Aucun mouvement enregistré.',
      }
    : {
        title: 'Products & stock', subtitle: 'Product catalog and stock movements for this business.',
        search: 'Search name, SKU or barcode', add: 'New product',
        empty: 'No products in this catalog.', retry: 'Retry',
        lowStock: 'Low stock', all: 'All', stock: 'Stock', reorder: 'Reorder at',
        createTitle: 'Create product', editTitle: 'Edit product',
        name: 'Product name *', sku: 'SKU *', category: 'Category', description: 'Description',
        price: 'Price', currency: 'Currency (ISO)', reorderPoint: 'Reorder threshold',
        save: 'Save', cancel: 'Cancel', edit: 'Edit', archive: 'Archive',
        adjust: 'Adjust stock', history: 'History', delta: 'Change (+/-)', note: 'Note',
        apply: 'Apply', restock: 'Restock', sale: 'Sale', return: 'Return',
        damage: 'Loss', adjustment: 'Adjustment', low: 'Reorder needed',
        loadingError: 'Unable to load catalog.', saveError: 'Unable to save product.',
        movementError: 'Unable to save stock movement.', archiveConfirm: 'Archive this product?',
        archived: 'Product archived.', saved: 'Product saved.', movementSaved: 'Stock updated.',
        historyEmpty: 'No stock movements recorded.',
      };

  const copy = restaurantMode
    ? {
        ...inventoryCopy,
        title: isFrench ? 'Menu du restaurant' : 'Restaurant menu',
        subtitle: isFrench ? 'Plats, boissons et disponibilités.' : 'Dishes, drinks and availability.',
        search: isFrench ? 'Rechercher un plat ou une section' : 'Search dishes or menu sections',
        add: isFrench ? 'Nouveau plat' : 'New menu item',
        empty: isFrench ? 'Aucun article au menu.' : 'No menu items yet.',
        stock: isFrench ? 'Disponible' : 'Available',
        reorder: isFrench ? 'Seuil' : 'Low at',
        createTitle: isFrench ? 'Ajouter au menu' : 'Add to menu',
        editTitle: isFrench ? 'Modifier le plat' : 'Edit menu item',
        name: isFrench ? 'Nom du plat *' : 'Dish name *',
        sku: isFrench ? 'Code article (facultatif)' : 'Item code (optional)',
        category: isFrench ? 'Section du menu' : 'Menu section',
        description: isFrench ? 'Description et ingrédients' : 'Description and ingredients',
        price: isFrench ? 'Prix à la carte' : 'Menu price',
        reorderPoint: isFrench ? 'Seuil de préparation' : 'Preparation threshold',
        saved: isFrench ? 'Article du menu enregistré.' : 'Menu item saved.',
        archived: isFrench ? 'Article retiré du menu.' : 'Menu item removed.',
        low: isFrench ? 'À préparer' : 'Prepare more',
        archiveConfirm: isFrench ? 'Retirer cet article du menu ?' : 'Remove this item from the menu?',
        selectPhoto: isFrench ? 'Ajouter une photo' : 'Add a photo',
        removePhoto: isFrench ? 'Retirer la photo' : 'Remove photo',
        available: isFrench ? 'Disponible' : 'Available',
        unavailable: isFrench ? 'Indisponible' : 'Unavailable',
        markAvailable: isFrench ? 'Rendre disponible' : 'Mark available',
        markUnavailable: isFrench ? 'Marquer indisponible' : 'Mark unavailable',
        noCreatePermission: isFrench ? 'Demande au propriétaire l’accès à la création de produits.' : 'Ask the owner for product creation access.',
        noUpdatePermission: isFrench ? 'Modification réservée aux membres autorisés.' : 'Editing is limited to authorized members.',
      }
    : inventoryCopy;

  const loadProducts = useCallback(async (page = 1, append = false) => {
    if (!companyId) {
      setError(copy.loadingError);
      setIsLoading(false);
      return;
    }
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError('');
    try {
      const params = { page, limit: 25, q: queryRef.current };
      if (lowStockRef.current) params.lowStock = 'true';
      const result = await getProducts(companyId, params);
      setProducts((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setCapabilities(result.capabilities || capabilities);
      setPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadingError);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [companyId, copy.loadingError]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    lowStockRef.current = lowStockOnly;
  }, [lowStockOnly]);

  useFocusEffect(useCallback(() => {
    loadProducts(1);
  }, [loadProducts]));

  useEffect(() => {
    if (!searchEffectMounted.current) {
      searchEffectMounted.current = true;
      return undefined;
    }
    const timer = setTimeout(() => loadProducts(1), 300);
    return () => clearTimeout(timer);
  }, [query, lowStockOnly, loadProducts]);

  const openNewProduct = () => {
    setEditingProductId(null);
    setForm(EMPTY_PRODUCT);
    setLocalMenuImage(null);
    setProductModalVisible(true);
  };

  const openEditProduct = (product) => {
    setEditingProductId(product._id);
    const scale = currencyScale(product.currency);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      category: product.category || '',
      price: String((product.priceMinor || 0) / scale),
      currency: product.currency || 'XOF',
      reorderPoint: String(product.reorderPoint || 0),
      imageUrl: product.imageUrl || '',
      isAvailable: product.isAvailable !== false,
    });
    setLocalMenuImage(null);
    setProductModalVisible(true);
  };

  const pickMenuImage = async () => {
    if (!restaurantMode) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError(isFrench ? 'Autorise l’accès aux photos pour ajouter une image.' : 'Allow photo access to add an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLocalMenuImage(result.assets[0]);
      setForm((current) => ({ ...current, imageUrl: '' }));
      setError('');
    }
  };

  const toggleProductAvailability = async (product) => {
    if (!capabilities.canUpdate || isSaving || availabilitySavingId) return;
    const isAvailable = product.isAvailable === false;
    setAvailabilitySavingId(String(product._id));
    setProducts((current) => current.map((item) => (
      item._id === product._id ? { ...item, isAvailable } : item
    )));
    try {
      await updateProduct(product._id, { isAvailable });
      setNotice(isAvailable ? copy.available : copy.unavailable);
    } catch (availabilityError) {
      setProducts((current) => current.map((item) => (
        item._id === product._id ? { ...item, isAvailable: product.isAvailable !== false } : item
      )));
      setError(availabilityError?.response?.data?.error || availabilityError?.message || copy.saveError);
    } finally {
      setAvailabilitySavingId('');
    }
  };

  const saveProduct = async () => {
    if (isSaving) return;
    const amount = Number(String(form.price).replace(',', '.'));
    const scale = currencyScale(form.currency.trim().toUpperCase());
    if (!Number.isFinite(amount) || amount < 0) {
      setError(copy.saveError);
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || (restaurantMode ? generateMenuSku() : ''),
      description: form.description.trim(),
      category: form.category.trim(),
      imageUrl: form.imageUrl || '',
      isAvailable: Boolean(form.isAvailable),
      priceMinor: Math.round(amount * scale),
      currency: form.currency.trim().toUpperCase(),
      reorderPoint: Number(form.reorderPoint || 0),
    };

    try {
      if (localMenuImage) payload.imageUrl = await uploadProductImage(companyId, localMenuImage);
      if (editingProductId) await updateProduct(editingProductId, payload);
      else await createProduct(companyId, payload);
      setProductModalVisible(false);
      setLocalMenuImage(null);
      setNotice(copy.saved);
      await loadProducts(1);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const archive = (product) => {
    Alert.alert(copy.archiveConfirm, product.name, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.archive,
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveProduct(product._id);
            setNotice(copy.archived);
            await loadProducts(1);
          } catch (archiveError) {
            setError(archiveError?.response?.data?.error || archiveError?.message || copy.saveError);
          }
        },
      },
    ]);
  };

  const applyStockMovement = async () => {
    const delta = Number(stockDelta);
    if (!stockProduct || !Number.isSafeInteger(delta) || delta === 0 || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await createInventoryMovement(stockProduct._id, { delta, reason: stockReason, note: stockNote });
      setStockProduct(null);
      setStockDelta('');
      setStockNote('');
      setNotice(copy.movementSaved);
      await loadProducts(1);
    } catch (movementError) {
      setError(movementError?.response?.data?.error || movementError?.message || copy.movementError);
    } finally {
      setIsSaving(false);
    }
  };

  const openHistory = async (product) => {
    setHistoryProduct(product);
    setMovements([]);
    setIsLoadingMovements(true);
    try {
      const result = await getInventoryMovements(product._id, { page: 1, limit: 50 });
      setMovements(result.data || []);
    } catch (historyError) {
      setError(historyError?.response?.data?.error || historyError?.message || copy.loadingError);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  const movementLabel = (reason) => copy[reason] || reason;

  const renderProduct = ({ item }) => {
    const isLow = item.stockOnHand <= item.reorderPoint;
    const isAvailable = item.isAvailable !== false;
    return (
      <View style={[styles.productRow, restaurantMode && restaurantStyles.productRow]}>
        {restaurantMode && item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={restaurantStyles.productPhoto} />
        ) : (
          <View style={[styles.productIcon, restaurantMode && restaurantStyles.productIcon]}>
            <Text style={styles.productIconText}>{restaurantMode ? '🍲' : '📦'}</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, restaurantMode && restaurantStyles.productName]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.productMeta, restaurantMode && restaurantStyles.productMeta]} numberOfLines={1}>
            {restaurantMode ? (item.category || (isFrench ? 'Autres' : 'Other')) : `${item.sku}${item.category ? ` · ${item.category}` : ''}`}
          </Text>
          {restaurantMode && item.description ? (
            <Text style={restaurantStyles.productDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <Text style={[styles.priceText, restaurantMode && restaurantStyles.priceText]}>{formatPrice(item.priceMinor, item.currency, locale)}</Text>
          <Text style={[styles.stockText, restaurantMode && restaurantStyles.stockText, isLow && styles.stockLow]}>
            {copy.stock}: {item.stockOnHand} · {copy.reorder}: {item.reorderPoint}{isLow ? ` · ${copy.low}` : ''}
          </Text>
          {restaurantMode ? (
            <View style={restaurantStyles.availabilityRow}>
              <Text style={[restaurantStyles.availabilityBadge, !isAvailable && restaurantStyles.unavailableBadge]}>
                {isAvailable ? copy.available : copy.unavailable}
              </Text>
              {capabilities.canUpdate ? (
                <Switch
                  value={isAvailable}
                  onValueChange={() => toggleProductAvailability(item)}
                  disabled={Boolean(availabilitySavingId) || isSaving}
                  trackColor={{ false: '#45341D', true: '#3A2455' }}
                  thumbColor={isAvailable ? '#C4B5FD' : '#F5BD62'}
                  accessibilityLabel={isAvailable ? copy.markUnavailable : copy.markAvailable}
                />
              ) : null}
            </View>
          ) : null}
          <View style={styles.productActions}>
            {capabilities.canManageStock && (
              <TouchableOpacity style={[styles.secondaryButton, restaurantMode && restaurantStyles.secondaryButton]} onPress={() => { setStockProduct(item); setStockDelta(''); setStockReason('restock'); }}>
                <Text style={[styles.secondaryButtonText, restaurantMode && restaurantStyles.secondaryButtonText]}>{copy.adjust}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.secondaryButton, restaurantMode && restaurantStyles.secondaryButton]} onPress={() => openHistory(item)}>
              <Text style={[styles.secondaryButtonText, restaurantMode && restaurantStyles.secondaryButtonText]}>{copy.history}</Text>
            </TouchableOpacity>
            {capabilities.canUpdate && (
              <TouchableOpacity style={[styles.secondaryButton, restaurantMode && restaurantStyles.secondaryButton]} onPress={() => openEditProduct(item)}>
                <Text style={[styles.secondaryButtonText, restaurantMode && restaurantStyles.secondaryButtonText]}>{copy.edit}</Text>
              </TouchableOpacity>
            )}
            {capabilities.canArchive && (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => archive(item)}>
                <Text style={styles.archiveText}>{copy.archive}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, restaurantMode && restaurantStyles.root]}>
      <View style={[styles.header, restaurantMode && restaurantStyles.header]}>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, restaurantMode && restaurantStyles.eyebrow]}>{restaurantMode ? (isFrench ? 'CARTE ET CUISINE' : 'MENU & KITCHEN') : (isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE')}</Text>
          <Text style={[styles.title, restaurantMode && restaurantStyles.title]}>{copy.title}</Text>
          <Text style={[styles.subtitle, restaurantMode && restaurantStyles.subtitle]}>{copy.subtitle}</Text>
        </View>
        {(capabilities.canCreate || restaurantMode) ? (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!capabilities.canCreate}
            style={[styles.addButton, restaurantMode && restaurantStyles.addButton, restaurantMode && restaurantStyles.addButtonWide, restaurantMode && !capabilities.canCreate && styles.buttonDisabled]}
            onPress={openNewProduct}
          >
            <Text style={[styles.addButtonText, restaurantMode && restaurantStyles.addButtonText]}>{restaurantMode ? `＋ ${copy.add}` : '＋'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={copy.search}
        placeholderTextColor={restaurantMode ? '#81798C' : '#8F8980'}
        style={[styles.searchInput, restaurantMode && restaurantStyles.searchInput]}
        accessibilityLabel={copy.search}
      />
      <TouchableOpacity style={[styles.lowStockFilter, restaurantMode && restaurantStyles.lowStockFilter]} onPress={() => setLowStockOnly((current) => !current)}>
        <View style={[styles.filterCheck, lowStockOnly && styles.filterCheckActive]} />
        <Text style={[styles.filterLabel, restaurantMode && restaurantStyles.filterLabel]}>{lowStockOnly ? copy.lowStock : copy.all}</Text>
        <Text style={[styles.resultCount, restaurantMode && restaurantStyles.resultCount]}>{pagination.total}</Text>
      </TouchableOpacity>

      {!!notice && <Text style={styles.noticeText}>{notice}</Text>}
      {!!error && (
        <View style={[styles.errorRow, restaurantMode && restaurantStyles.errorRow]}>
          <Text accessibilityRole="alert" style={[styles.errorText, restaurantMode && restaurantStyles.errorText]}>{error}</Text>
          <TouchableOpacity onPress={() => loadProducts(1)}><Text style={[styles.retryText, restaurantMode && restaurantStyles.retryText]}>{copy.retry}</Text></TouchableOpacity>
        </View>
      )}
      {restaurantMode && !capabilities.canCreate ? <Text style={restaurantStyles.permissionHint}>{copy.noCreatePermission}</Text> : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={restaurantMode ? '#C4B5FD' : COLORS.accent} style={styles.loader} />
      ) : products.length ? (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderProduct}
          contentContainerStyle={[styles.listContent, restaurantMode && restaurantStyles.listContent]}
          ItemSeparatorComponent={() => <View style={[styles.separator, restaurantMode && restaurantStyles.separator]} />}
          onEndReached={() => {
            if (!isLoadingMore && pagination.page < pagination.pages) loadProducts(pagination.page + 1, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={COLORS.accent} style={styles.footerLoader} /> : null}
        />
      ) : (
        <View style={[styles.emptyState, restaurantMode && restaurantStyles.emptyState]}><Text style={styles.emptyIcon}>{restaurantMode ? '🍽️' : '📦'}</Text><Text style={[styles.emptyText, restaurantMode && restaurantStyles.emptyText]}>{copy.empty}</Text></View>
      )}

      <Modal visible={productModalVisible} transparent animationType="slide" onRequestClose={() => setProductModalVisible(false)}>
        <View style={[styles.modalBackdrop, restaurantMode && restaurantStyles.modalBackdrop]}>
          <View style={[styles.modalSheet, restaurantMode && restaurantStyles.modalSheet]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, restaurantMode && restaurantStyles.modalTitle]}>{editingProductId ? copy.editTitle : copy.createTitle}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setProductModalVisible(false)}><Text style={[styles.closeText, restaurantMode && restaurantStyles.closeText]}>×</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {restaurantMode ? (
                <View style={restaurantStyles.photoField}>
                  {localMenuImage?.uri || form.imageUrl ? (
                    <Image source={{ uri: localMenuImage?.uri || form.imageUrl }} style={restaurantStyles.photoPreview} />
                  ) : (
                    <View style={restaurantStyles.photoPlaceholder}>
                      <Text style={restaurantStyles.photoPlaceholderIcon}>🍽️</Text>
                    </View>
                  )}
                  <View style={restaurantStyles.photoActions}>
                    <TouchableOpacity style={restaurantStyles.photoButton} onPress={pickMenuImage}>
                      <Text style={restaurantStyles.photoButtonText}>{copy.selectPhoto}</Text>
                    </TouchableOpacity>
                    {localMenuImage?.uri || form.imageUrl ? (
                      <TouchableOpacity onPress={() => { setLocalMenuImage(null); setForm((current) => ({ ...current, imageUrl: '' })); }}>
                        <Text style={restaurantStyles.removePhotoText}>{copy.removePhoto}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.name} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} maxLength={120} />
              <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.sku} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.sku} onChangeText={(sku) => setForm((current) => ({ ...current, sku }))} autoCapitalize="characters" maxLength={64} />
              <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.category} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.category} onChangeText={(category) => setForm((current) => ({ ...current, category }))} maxLength={80} />
              <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.price} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.price} onChangeText={(price) => setForm((current) => ({ ...current, price }))} keyboardType="decimal-pad" />
              <View style={styles.inlineInputs}>
                <TextInput style={[styles.input, restaurantMode && restaurantStyles.input, styles.currencyInput]} placeholder={copy.currency} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.currency} onChangeText={(currency) => setForm((current) => ({ ...current, currency }))} autoCapitalize="characters" maxLength={3} />
                <TextInput style={[styles.input, restaurantMode && restaurantStyles.input, styles.thresholdInput]} placeholder={copy.reorderPoint} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.reorderPoint} onChangeText={(reorderPoint) => setForm((current) => ({ ...current, reorderPoint }))} keyboardType="number-pad" />
              </View>
              <TextInput style={[styles.input, restaurantMode && restaurantStyles.input, styles.descriptionInput]} placeholder={copy.description} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={form.description} onChangeText={(description) => setForm((current) => ({ ...current, description }))} multiline maxLength={2000} textAlignVertical="top" />
              <TouchableOpacity style={[styles.saveButton, restaurantMode && restaurantStyles.saveButton, isSaving && styles.buttonDisabled]} onPress={saveProduct} disabled={isSaving}>
                <Text style={styles.saveButtonText}>{isSaving ? '…' : copy.save}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!stockProduct} transparent animationType="slide" onRequestClose={() => setStockProduct(null)}>
        <View style={[styles.modalBackdrop, restaurantMode && restaurantStyles.modalBackdrop]}>
          <View style={[styles.modalSheet, restaurantMode && restaurantStyles.modalSheet]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, restaurantMode && restaurantStyles.modalTitle]}>{copy.adjust}: {stockProduct?.name}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setStockProduct(null)}><Text style={[styles.closeText, restaurantMode && restaurantStyles.closeText]}>×</Text></TouchableOpacity>
            </View>
            <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.delta} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={stockDelta} onChangeText={setStockDelta} keyboardType="numbers-and-punctuation" />
            <View style={styles.reasonOptions}>
              {MOVEMENT_REASONS.map((reason) => (
                <TouchableOpacity key={reason} style={[styles.reasonOption, restaurantMode && restaurantStyles.reasonOption, stockReason === reason && styles.reasonOptionActive, stockReason === reason && restaurantMode && restaurantStyles.reasonOptionActive]} onPress={() => setStockReason(reason)}>
                  <Text style={[styles.reasonText, restaurantMode && restaurantStyles.reasonText, stockReason === reason && styles.reasonTextActive, stockReason === reason && restaurantMode && restaurantStyles.reasonTextActive]}>{copy[reason]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, restaurantMode && restaurantStyles.input]} placeholder={copy.note} placeholderTextColor={restaurantMode ? '#81798C' : undefined} value={stockNote} onChangeText={setStockNote} maxLength={300} />
            <TouchableOpacity style={[styles.saveButton, restaurantMode && restaurantStyles.saveButton, isSaving && styles.buttonDisabled]} onPress={applyStockMovement} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? '…' : copy.apply}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!historyProduct} transparent animationType="slide" onRequestClose={() => setHistoryProduct(null)}>
        <View style={[styles.modalBackdrop, restaurantMode && restaurantStyles.modalBackdrop]}>
          <View style={[styles.modalSheet, restaurantMode && restaurantStyles.modalSheet]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, restaurantMode && restaurantStyles.modalTitle]}>{copy.history}: {historyProduct?.name}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setHistoryProduct(null)}><Text style={[styles.closeText, restaurantMode && restaurantStyles.closeText]}>×</Text></TouchableOpacity>
            </View>
            {isLoadingMovements ? <ActivityIndicator color={restaurantMode ? '#C4B5FD' : COLORS.accent} /> : movements.length ? (
              <FlatList
                data={movements}
                keyExtractor={(item) => String(item._id)}
                renderItem={({ item }) => (
                  <View style={styles.movementRow}>
                    <Text style={[styles.movementDelta, item.delta < 0 && styles.stockLow]}>{item.delta > 0 ? '+' : ''}{item.delta}</Text>
                    <View style={styles.movementCopy}>
                      <Text style={[styles.movementReason, restaurantMode && restaurantStyles.movementReason]}>{copy[item.reason] || item.reason}</Text>
                      <Text style={[styles.productMeta, restaurantMode && restaurantStyles.productMeta]}>{item.actorId?.name || ''}{item.note ? ` · ${item.note}` : ''}</Text>
                    </View>
                    <Text style={[styles.productMeta, restaurantMode && restaurantStyles.productMeta]}>{item.balanceAfter}</Text>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : <Text style={[styles.emptyText, restaurantMode && restaurantStyles.emptyText]}>{copy.historyEmpty}</Text>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  headerText: { flex: 1, paddingRight: 10 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 12, marginTop: 4 },
  addButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.accent },
  addButtonText: { color: '#FFFFFF', fontSize: 25, lineHeight: 28 },
  searchInput: { height: 43, marginHorizontal: 18, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, backgroundColor: COLORS.surface, color: COLORS.text },
  lowStockFilter: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18 },
  filterCheck: { width: 15, height: 15, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  filterCheckActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterLabel: { color: COLORS.textSoft, fontSize: 12, fontWeight: '700' },
  resultCount: { marginLeft: 'auto', color: COLORS.textSoft, fontSize: 11 },
  noticeText: { color: COLORS.success, fontSize: 12, marginHorizontal: 18, marginBottom: 6 },
  errorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginHorizontal: 18, marginBottom: 6 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 12 },
  retryText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 42 },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13 },
  productIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EEE7FA', marginRight: 11 },
  productIconText: { fontSize: 20 },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  productMeta: { color: COLORS.textSoft, fontSize: 11, marginTop: 3 },
  priceText: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 5 },
  stockText: { color: COLORS.success, fontSize: 11, marginTop: 4 },
  stockLow: { color: COLORS.warning },
  productActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  secondaryButton: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  secondaryButtonText: { color: COLORS.textSoft, fontSize: 10, fontWeight: '700' },
  archiveText: { color: COLORS.danger, fontSize: 10, fontWeight: '700' },
  separator: { height: 1, backgroundColor: COLORS.border },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 30, marginBottom: 8 },
  emptyText: { color: COLORS.textSoft, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  footerLoader: { marginVertical: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { maxHeight: '90%', backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  modalTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '900', paddingRight: 8 },
  closeText: { color: COLORS.textSoft, fontSize: 27 },
  input: { minHeight: 44, paddingHorizontal: 11, marginBottom: 9, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 13 },
  inlineInputs: { flexDirection: 'row', gap: 8 },
  currencyInput: { width: 92 },
  thresholdInput: { flex: 1 },
  descriptionInput: { minHeight: 76, paddingTop: 11 },
  saveButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 9, backgroundColor: COLORS.accent },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  reasonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 9 },
  reasonOption: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  reasonOptionActive: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  reasonText: { color: COLORS.textSoft, fontSize: 10, fontWeight: '700' },
  reasonTextActive: { color: COLORS.accent },
  movementRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9 },
  movementDelta: { width: 40, color: COLORS.success, fontSize: 13, fontWeight: '900' },
  movementCopy: { flex: 1 },
});

const restaurantStyles = StyleSheet.create({
  root: { backgroundColor: '#0D0B12' },
  header: { paddingTop: 18, paddingBottom: 16 },
  eyebrow: { color: '#C4B5FD', letterSpacing: 1.1 },
  title: { color: '#F6F2FA', fontSize: 26, letterSpacing: 0 },
  subtitle: { color: '#A9A1B3', lineHeight: 17 },
  addButton: { backgroundColor: '#8B5CF6', borderRadius: 14 },
  addButtonWide: { width: 'auto', paddingHorizontal: 12, minWidth: 42 },
  addButtonText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  permissionHint: { color: '#F5BD62', fontSize: 11, lineHeight: 15, marginHorizontal: 18, marginTop: 6 },
  searchInput: { backgroundColor: '#17141E', borderColor: '#30283B', color: '#F6F2FA', borderRadius: 12, height: 46 },
  lowStockFilter: { minHeight: 44 },
  filterLabel: { color: '#D8D1E2' },
  resultCount: { color: '#A9A1B3' },
  errorRow: { padding: 10, borderRadius: 8, backgroundColor: '#27161E' },
  errorText: { color: '#F08D9C' },
  retryText: { color: '#C4B5FD' },
  listContent: { paddingTop: 8, paddingBottom: 120 },
  productRow: { marginBottom: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#30283B', backgroundColor: '#17141E' },
  productIcon: { width: 48, height: 48, borderRadius: 14, marginRight: 12, backgroundColor: '#30223F' },
  productPhoto: { width: 58, height: 70, borderRadius: 12, marginRight: 12, backgroundColor: '#30223F' },
  productName: { color: '#F6F2FA', fontSize: 15, fontWeight: '700' },
  productMeta: { color: '#C4B5FD', fontSize: 11, marginTop: 4 },
  productDescription: { color: '#A9A1B3', fontSize: 11, lineHeight: 16, marginTop: 6 },
  priceText: { color: '#F6F2FA', fontSize: 14, marginTop: 8 },
  stockText: { color: '#79D9A7', fontSize: 10, marginTop: 5 },
  availabilityBadge: { alignSelf: 'flex-start', color: '#79D9A7', backgroundColor: '#153629', fontSize: 10, fontWeight: '800', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  availabilityRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5, marginRight: 4 },
  unavailableBadge: { color: '#F5BD62', backgroundColor: '#45341D' },
  secondaryButton: { backgroundColor: '#211B2B', borderColor: '#3A3047' },
  secondaryButtonText: { color: '#D8D1E2' },
  separator: { height: 0 },
  emptyState: { flex: 1 },
  emptyText: { color: '#A9A1B3' },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.72)' },
  modalSheet: { backgroundColor: '#17141E', borderColor: '#30283B', borderWidth: 1 },
  modalTitle: { color: '#F6F2FA' },
  closeText: { color: '#C4B5FD' },
  input: { backgroundColor: '#211B2B', borderColor: '#3A3047', color: '#F6F2FA' },
  saveButton: { backgroundColor: '#8B5CF6' },
  reasonOption: { backgroundColor: '#211B2B', borderColor: '#3A3047' },
  reasonOptionActive: { backgroundColor: '#38264D', borderColor: '#8B5CF6' },
  reasonText: { color: '#D8D1E2' },
  reasonTextActive: { color: '#E9DDFF' },
  movementReason: { color: '#F6F2FA' },
  photoField: { marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#3A3047', borderRadius: 10, backgroundColor: '#17141E' },
  photoPreview: { width: '100%', height: 150, borderRadius: 8, backgroundColor: '#211B2B' },
  photoPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#211B2B' },
  photoPlaceholderIcon: { fontSize: 32 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  photoButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#38264D' },
  photoButtonText: { color: '#E9DDFF', fontSize: 11, fontWeight: '700' },
  removePhotoText: { color: '#F08D9C', fontSize: 11, fontWeight: '700' },
});