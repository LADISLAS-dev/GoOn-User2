import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  createPurchaseOrder,
  createSupplier,
  getProducts,
  getPurchaseOrders,
  getSuppliers,
  receivePurchaseOrder,
} from '../services/api';

const COLORS = {
  background: '#F7F5F1', surface: '#FFFFFF', border: '#E8E1D7', text: '#17161D',
  textSoft: '#6F6A63', accent: '#7C3AED', danger: '#A83232', success: '#18794E', warning: '#9A5B00',
};

const EMPTY_SUPPLIER = { name: '', email: '', phone: '', currency: 'XOF', address: '' };

function currencyScale(currency) {
  try {
    return 10 ** new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch (_) {
    return 100;
  }
}

function formatMoney(minor, currency, locale) {
  const scale = currencyScale(currency || 'XOF');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'XOF' }).format((minor || 0) / scale);
  } catch (_) {
    return `${((minor || 0) / scale).toFixed(2)} ${currency || 'XOF'}`;
  }
}

export default function ProProcurementScreen({ companyId }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [activeTab, setActiveTab] = useState('orders');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [capabilities, setCapabilities] = useState({ canManage: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineCost, setLineCost] = useState('');
  const [orderLines, setOrderLines] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [receivingOrder, setReceivingOrder] = useState(null);
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState({});

  const copy = isFrench
    ? {
        title: 'Fournisseurs et achats', subtitle: 'Commandes fournisseurs et réceptions de stock.',
        orders: 'Commandes', suppliers: 'Fournisseurs', addSupplier: 'Nouveau fournisseur',
        createOrder: 'Nouvelle commande', noSuppliers: 'Aucun fournisseur.', noOrders: 'Aucune commande fournisseur.',
        supplierName: 'Nom fournisseur *', email: 'E-mail', phone: 'Téléphone', currency: 'Devise ISO', address: 'Adresse',
        add: 'Ajouter', save: 'Enregistrer', cancel: 'Annuler', supplier: 'Fournisseur',
        selectSupplier: 'Choisissez un fournisseur', selectProduct: 'Choisissez un produit',
        quantity: 'Quantité', unitCost: 'Coût unitaire', addLine: 'Ajouter la ligne',
        lines: 'Lignes de commande', notes: 'Notes', submitOrder: 'Créer la commande',
        receive: 'Réceptionner', receiveTitle: 'Réception partielle', receiveQuantity: 'À recevoir',
        confirmReceipt: 'Confirmer réception', ordered: 'Commandée', partially_received: 'Partiellement reçue',
        received: 'Reçue', cancelled: 'Annulée', loadingError: 'Impossible de charger les achats.',
        saved: 'Modifications enregistrées.', orderCreated: 'Commande créée.', receiptSaved: 'Réception enregistrée.',
        supplierError: 'Impossible de créer le fournisseur.', orderError: 'Impossible de créer la commande.',
        receiveError: 'Impossible d’enregistrer la réception.', status: 'Statut', expectedAt: 'Prévue',
        emptyProducts: 'Aucun produit actif pour créer une commande.',
      }
    : {
        title: 'Suppliers & purchasing', subtitle: 'Supplier orders and stock receipts.',
        orders: 'Orders', suppliers: 'Suppliers', addSupplier: 'New supplier',
        createOrder: 'New purchase order', noSuppliers: 'No suppliers yet.', noOrders: 'No purchase orders yet.',
        supplierName: 'Supplier name *', email: 'Email', phone: 'Phone', currency: 'ISO currency', address: 'Address',
        add: 'Add', save: 'Save', cancel: 'Cancel', supplier: 'Supplier',
        selectSupplier: 'Choose a supplier', selectProduct: 'Choose a product',
        quantity: 'Quantity', unitCost: 'Unit cost', addLine: 'Add line',
        lines: 'Order lines', notes: 'Notes', submitOrder: 'Create order',
        receive: 'Receive', receiveTitle: 'Partial receipt', receiveQuantity: 'Receive now',
        confirmReceipt: 'Confirm receipt', ordered: 'Ordered', partially_received: 'Partially received',
        received: 'Received', cancelled: 'Cancelled', loadingError: 'Unable to load purchasing data.',
        saved: 'Changes saved.', orderCreated: 'Purchase order created.', receiptSaved: 'Receipt recorded.',
        supplierError: 'Unable to create supplier.', orderError: 'Unable to create order.',
        receiveError: 'Unable to record receipt.', status: 'Status', expectedAt: 'Expected',
        emptyProducts: 'No active products are available for purchase orders.',
      };

  const loadData = useCallback(async () => {
    if (!companyId) {
      setError(copy.loadingError);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [supplierResponse, productResponse, orderResponse] = await Promise.all([
        getSuppliers(companyId, { page: 1, limit: 100 }),
        getProducts(companyId, { page: 1, limit: 100, status: 'active' }),
        getPurchaseOrders(companyId, { page: 1, limit: 50 }),
      ]);
      setSuppliers(supplierResponse.data || []);
      setProducts(productResponse.data || []);
      setOrders(orderResponse.data || []);
      setCapabilities({
        canManage: Boolean(supplierResponse.canManage),
        canCreate: Boolean(orderResponse.canCreate),
        canReceive: Boolean(orderResponse.canReceive),
      });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadingError);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, copy.loadingError]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const saveSupplier = async () => {
    if (!supplierForm.name.trim() || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await createSupplier(companyId, supplierForm);
      setSupplierForm(EMPTY_SUPPLIER);
      setSupplierModalVisible(false);
      setNotice(copy.saved);
      await loadData();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.supplierError);
    } finally {
      setIsSaving(false);
    }
  };

  const addOrderLine = () => {
    const product = products.find((item) => String(item._id) === String(selectedProductId));
    const supplier = suppliers.find((item) => String(item._id) === String(selectedSupplierId));
    const quantity = Number(lineQuantity);
    const unitCost = Number(String(lineCost).replace(',', '.'));
    if (!product || !supplier || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      setError(copy.orderError);
      return;
    }
    const scale = currencyScale(supplier.currency);
    setOrderLines((current) => {
      if (current.some((line) => line.productId === product._id)) {
        setError(isFrench ? 'Ce produit figure déjà dans la commande.' : 'This product is already in the order.');
        return current;
      }
      return [...current, { productId: product._id, name: product.name, quantity, unitCostMinor: Math.round(unitCost * scale) }];
    });
    setSelectedProductId('');
    setLineQuantity('1');
    setLineCost('');
    setError('');
  };

  const submitOrder = async () => {
    const supplier = suppliers.find((item) => String(item._id) === String(selectedSupplierId));
    if (!supplier || !orderLines.length || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await createPurchaseOrder(companyId, {
        supplierId: supplier._id,
        currency: supplier.currency,
        notes: orderNotes,
        lines: orderLines.map(({ productId, quantity, unitCostMinor }) => ({ productId, quantity, unitCostMinor })),
      });
      setOrderModalVisible(false);
      setOrderLines([]);
      setOrderNotes('');
      setNotice(copy.orderCreated);
      await loadData();
    } catch (orderError) {
      setError(orderError?.response?.data?.error || orderError?.message || copy.orderError);
    } finally {
      setIsSaving(false);
    }
  };

  const openReceiveModal = (order) => {
    setReceivingOrder(order);
    setReceiptIdempotencyKey(`receipt_${order._id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
    setReceivedQuantities(Object.fromEntries(
      order.lines
        .filter((line) => line.receivedQuantity < line.quantity)
        .map((line) => [String(line._id), ''])
    ));
  };

  const submitReceipt = async () => {
    if (!receivingOrder || isSaving) return;
    const lines = Object.entries(receivedQuantities)
      .filter(([, quantity]) => String(quantity).trim() !== '')
      .map(([lineId, quantity]) => ({ lineId, quantity: Number(quantity) }));
    if (!lines.length) return setError(copy.receiveError);

    setIsSaving(true);
    setError('');
    try {
      await receivePurchaseOrder(receivingOrder._id, { idempotencyKey: receiptIdempotencyKey, lines });
      setReceivingOrder(null);
      setReceiptIdempotencyKey('');
      setNotice(copy.receiptSaved);
      await loadData();
    } catch (receiptError) {
      setError(receiptError?.response?.data?.error || receiptError?.message || copy.receiveError);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSupplier = ({ item }) => (
    <View style={styles.listRow}>
      <View style={styles.rowIcon}><Text style={styles.rowIconText}>🏭</Text></View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        {!!item.email && <Text style={styles.rowMeta}>{item.email}</Text>}
        {!!item.phone && <Text style={styles.rowMeta}>{item.phone}</Text>}
      </View>
      <Text style={styles.currency}>{item.currency}</Text>
    </View>
  );

  const renderOrder = ({ item }) => (
    <View style={styles.orderRow}>
      <View style={styles.orderTop}>
        <View style={styles.rowIcon}><Text style={styles.rowIconText}>🧾</Text></View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{item.orderNumber}</Text>
          <Text style={styles.rowMeta}>{item.supplierId?.name || copy.supplier}</Text>
        </View>
        <Text style={[styles.orderStatus, item.status === 'received' ? styles.statusDone : styles.statusPending]}>
          {copy[item.status] || item.status}
        </Text>
      </View>
      <View style={styles.orderSummary}>
        <Text style={styles.rowMeta}>{item.lines?.length || 0} {isFrench ? 'lignes' : 'lines'}</Text>
        <Text style={styles.rowMeta}>{formatMoney((item.lines || []).reduce((sum, line) => sum + line.quantity * line.unitCostMinor, 0), item.currency, locale)}</Text>
      </View>
      {capabilities.canReceive && !['received', 'cancelled'].includes(item.status) && (
        <TouchableOpacity style={styles.receiveButton} onPress={() => openReceiveModal(item)}>
          <Text style={styles.receiveButtonText}>{copy.receive}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const data = activeTab === 'suppliers' ? suppliers : orders;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        {capabilities.canManage && activeTab === 'suppliers' && (
          <TouchableOpacity style={styles.addButton} onPress={() => setSupplierModalVisible(true)}><Text style={styles.addButtonText}>＋</Text></TouchableOpacity>
        )}
        {capabilities.canCreate && activeTab === 'orders' && (
          <TouchableOpacity style={styles.addButton} onPress={() => {
            setSelectedSupplierId(''); setSelectedProductId(''); setOrderLines([]); setOrderModalVisible(true);
          }}><Text style={styles.addButtonText}>＋</Text></TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {['orders', 'suppliers'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{copy[tab]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : (
        <FlatList
          key={activeTab}
          data={data}
          keyExtractor={(item) => String(item._id)}
          renderItem={activeTab === 'suppliers' ? renderSupplier : renderOrder}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>{activeTab === 'suppliers' ? copy.noSuppliers : copy.noOrders}</Text>}
        />
      )}

      <Modal visible={supplierModalVisible} transparent animationType="slide" onRequestClose={() => setSupplierModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalSheet}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{copy.addSupplier}</Text><TouchableOpacity onPress={() => setSupplierModalVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <TextInput style={styles.input} placeholder={copy.supplierName} value={supplierForm.name} onChangeText={(name) => setSupplierForm((current) => ({ ...current, name }))} />
          <TextInput style={styles.input} placeholder={copy.email} value={supplierForm.email} onChangeText={(email) => setSupplierForm((current) => ({ ...current, email }))} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder={copy.phone} value={supplierForm.phone} onChangeText={(phone) => setSupplierForm((current) => ({ ...current, phone }))} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder={copy.currency} value={supplierForm.currency} onChangeText={(currency) => setSupplierForm((current) => ({ ...current, currency: currency.toUpperCase() }))} maxLength={3} />
          <TextInput style={styles.input} placeholder={copy.address} value={supplierForm.address} onChangeText={(address) => setSupplierForm((current) => ({ ...current, address }))} />
          <TouchableOpacity style={styles.primaryButton} onPress={saveSupplier} disabled={isSaving}><Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.save}</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={orderModalVisible} transparent animationType="slide" onRequestClose={() => setOrderModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalSheet, styles.largeModal]}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{copy.createOrder}</Text><TouchableOpacity onPress={() => setOrderModalVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>{copy.supplier}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
              {suppliers.map((supplier) => (
                <TouchableOpacity key={supplier._id} style={[styles.choiceChip, selectedSupplierId === supplier._id && styles.choiceChipActive]} onPress={() => { setSelectedSupplierId(supplier._id); setOrderLines([]); }}>
                  <Text style={[styles.choiceText, selectedSupplierId === supplier._id && styles.choiceTextActive]}>{supplier.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!products.length && <Text style={styles.rowMeta}>{copy.emptyProducts}</Text>}
            <Text style={styles.sectionLabel}>{copy.selectProduct}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
              {products.map((product) => (
                <TouchableOpacity key={product._id} style={[styles.choiceChip, selectedProductId === product._id && styles.choiceChipActive]} onPress={() => setSelectedProductId(product._id)}>
                  <Text style={[styles.choiceText, selectedProductId === product._id && styles.choiceTextActive]}>{product.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.inlineInputs}>
              <TextInput style={[styles.input, styles.qtyInput]} placeholder={copy.quantity} value={lineQuantity} onChangeText={setLineQuantity} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.costInput]} placeholder={copy.unitCost} value={lineCost} onChangeText={setLineCost} keyboardType="decimal-pad" />
              <TouchableOpacity style={styles.smallPrimary} onPress={addOrderLine}><Text style={styles.primaryButtonText}>＋</Text></TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>{copy.lines} · {orderLines.length}</Text>
            {orderLines.map((line) => (
              <View key={line.productId} style={styles.orderLine}>
                <Text style={styles.orderLineName} numberOfLines={1}>{line.name}</Text>
                <Text style={styles.rowMeta}>{line.quantity} × {formatMoney(line.unitCostMinor, suppliers.find((supplier) => supplier._id === selectedSupplierId)?.currency, locale)}</Text>
                <TouchableOpacity onPress={() => setOrderLines((current) => current.filter((entry) => entry.productId !== line.productId))}><Text style={styles.removeLine}>×</Text></TouchableOpacity>
              </View>
            ))}
            <TextInput style={[styles.input, styles.notesInput]} placeholder={copy.notes} value={orderNotes} onChangeText={setOrderNotes} multiline maxLength={1000} />
            <TouchableOpacity style={styles.primaryButton} onPress={submitOrder} disabled={isSaving || !selectedSupplierId || !orderLines.length}>
              <Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.submitOrder}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={!!receivingOrder} transparent animationType="slide" onRequestClose={() => setReceivingOrder(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalSheet, styles.largeModal]}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{copy.receive}: {receivingOrder?.orderNumber}</Text><TouchableOpacity onPress={() => setReceivingOrder(null)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {(receivingOrder?.lines || []).filter((line) => line.receivedQuantity < line.quantity).map((line) => (
              <View key={line._id} style={styles.receiveLine}>
                <View style={styles.receiveLineCopy}>
                  <Text style={styles.orderLineName}>{line.productName}</Text>
                  <Text style={styles.rowMeta}>{line.receivedQuantity}/{line.quantity}</Text>
                </View>
                <TextInput
                  style={styles.receiveQty}
                  placeholder={copy.receiveQty}
                  value={receivedQuantities[String(line._id)] || ''}
                  onChangeText={(value) => setReceivedQuantities((current) => ({ ...current, [String(line._id)]: value }))}
                  keyboardType="number-pad"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryButton} onPress={submitReceipt} disabled={isSaving}>
              <Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.confirmReceipt}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerText: { flex: 1, paddingRight: 9 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 12, marginTop: 4 },
  addButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.accent },
  addButtonText: { color: '#FFFFFF', fontSize: 24, lineHeight: 27 },
  tabs: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { minHeight: 39, justifyContent: 'center', paddingHorizontal: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.textSoft, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: COLORS.accent },
  notice: { color: COLORS.success, fontSize: 12, marginHorizontal: 18, marginBottom: 6 },
  error: { color: COLORS.danger, fontSize: 12, marginHorizontal: 18, marginBottom: 6 },
  loader: { marginTop: 40 },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EEE7FA', marginRight: 10 },
  rowIconText: { fontSize: 18 },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  rowMeta: { color: COLORS.textSoft, fontSize: 11, marginTop: 3 },
  currency: { color: COLORS.textSoft, fontSize: 11, fontWeight: '800' },
  orderRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderTop: { flexDirection: 'row', alignItems: 'center' },
  orderStatus: { fontSize: 10, fontWeight: '800' },
  statusDone: { color: COLORS.success },
  statusPending: { color: COLORS.warning },
  orderSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 49, marginTop: 2 },
  receiveButton: { minHeight: 32, alignSelf: 'flex-start', justifyContent: 'center', marginLeft: 49, marginTop: 8, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#EEE7FA' },
  receiveButtonText: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  separator: { height: 1, backgroundColor: COLORS.border },
  empty: { color: COLORS.textSoft, textAlign: 'center', marginTop: 42 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 25 },
  largeModal: { maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  modalTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '900', paddingRight: 8 },
  closeText: { color: COLORS.textSoft, fontSize: 27 },
  input: { minHeight: 43, paddingHorizontal: 11, marginBottom: 9, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 13 },
  sectionLabel: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900', marginTop: 7, marginBottom: 5 },
  choiceRow: { gap: 7, paddingVertical: 4 },
  choiceChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  choiceChipActive: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  choiceText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '700' },
  choiceTextActive: { color: COLORS.accent },
  inlineInputs: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  qtyInput: { width: 90 },
  costInput: { flex: 1 },
  smallPrimary: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 9, borderRadius: 8, backgroundColor: COLORS.accent },
  orderLine: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderLineName: { flex: 1, color: COLORS.text, fontSize: 12, fontWeight: '700' },
  removeLine: { color: COLORS.danger, fontSize: 22, paddingHorizontal: 6 },
  notesInput: { minHeight: 60, paddingTop: 10, marginTop: 10 },
  primaryButton: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 9, backgroundColor: COLORS.accent },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  receiveLine: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  receiveLineCopy: { flex: 1 },
  receiveQty: { width: 100, minHeight: 38, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, backgroundColor: COLORS.surface, color: COLORS.text },
});