import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { createInvoiceFromSalesOrder, createSalesOrder, getCustomers, getProducts, getSalesOrders, recordSalesOrderPayment, transitionSalesOrder } from '../services/api';

const COLORS = {
  background: '#F7F5F1', surface: '#FFFFFF', border: '#E8E1D7', text: '#17161D',
  textSoft: '#6F6A63', accent: '#7C3AED', danger: '#A83232', success: '#18794E', warning: '#9A5B00',
};

const EMPTY_CUSTOMER = { name: '', email: '', phone: '' };

function makePaymentKey() {
  return `salespay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

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

function ActionButton({ label, onPress, disabled, tone = 'accent' }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[`button_${tone}`], disabled && styles.buttonDisabled]}
      activeOpacity={0.8}
    >
      <Text style={[styles.buttonText, tone === 'quiet' && styles.buttonTextQuiet]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProSalesOrdersScreen({ companyId, invoicesEnabled = false, navigation }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [capabilities, setCapabilities] = useState({ canCreate: false, canManage: false, canInvoice: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workingOrderId, setWorkingOrderId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lines, setLines] = useState([]);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState('');

  const copy = isFrench
    ? {
        title: 'Commandes de vente', subtitle: 'Préparez les commandes et suivez leur exécution.',
        create: 'Nouvelle commande', empty: 'Aucune commande de vente.', loadingError: 'Impossible de charger les commandes.',
        createError: 'Impossible de créer la commande.', saved: 'Commande créée.',
        customer: 'Client', customerName: 'Nom du client', email: 'E-mail', phone: 'Téléphone',
        savedCustomers: 'Clients enregistrés', manualCustomer: 'Saisie manuelle',
        products: 'Produits', chooseProduct: 'Sélectionnez un produit', quantity: 'Quantité', addLine: 'Ajouter',
        lines: 'Articles', noLines: 'Ajoutez au moins un produit.', notes: 'Notes', save: 'Créer le brouillon',
        cancel: 'Annuler', remove: 'Retirer', total: 'Total', confirm: 'Confirmer', fulfill: 'Marquer livrée',
        cancelOrder: 'Annuler la commande', confirmTitle: 'Confirmer cette commande ?',
        confirmBody: 'Le stock sera déduit immédiatement.', cancelTitle: 'Annuler cette commande ?',
        cancelBody: 'Si elle est confirmée, les quantités seront remises en stock.',
        fulfilledTitle: 'Marquer la commande comme livrée ?', status: 'Statut', draft: 'Brouillon',
        confirmed: 'Confirmée', fulfilled: 'Livrée', cancelled: 'Annulée',
        createInvoice: 'Créer la facture',
        paid: 'Réglée', partially_paid: 'Partiellement réglée', unpaid: 'À régler',
        authorized: 'Autorisé · capture à faire', failed: 'Échec', voided: 'Annulé',
        stripe: 'Visa · Stripe', paypal: 'PayPal', retryCapture: 'Réessayer la capture',
        amountPaid: 'Déjà reçu', remaining: 'Reste à recevoir', recordPayment: 'Enregistrer un paiement reçu',
        paymentAmount: 'Montant reçu', paymentMethod: 'Mode de paiement', paymentReference: 'Référence (facultative)',
        paymentSaved: 'Règlement enregistré.', paymentError: 'Impossible d’enregistrer le règlement.',
        paymentStatus: 'Paiement', noPayment: 'Aucun règlement enregistré.',
        cash: 'Espèces', bank_transfer: 'Virement', mobile_money_manual: 'Mobile money', card_manual: 'Carte (manuel)', other: 'Autre',
        actionError: 'Impossible de modifier la commande.', loading: 'Chargement…',
        productCurrencyError: 'Tous les produits doivent utiliser la même devise.',
      }
    : {
        title: 'Sales orders', subtitle: 'Prepare orders and track their fulfillment.',
        create: 'New order', empty: 'No sales orders yet.', loadingError: 'Unable to load sales orders.',
        createError: 'Unable to create the order.', saved: 'Order created.',
        customer: 'Customer', customerName: 'Customer name', email: 'Email', phone: 'Phone',
        savedCustomers: 'Saved customers', manualCustomer: 'Enter manually',
        products: 'Products', chooseProduct: 'Select a product', quantity: 'Quantity', addLine: 'Add',
        lines: 'Items', noLines: 'Add at least one product.', notes: 'Notes', save: 'Create draft',
        cancel: 'Close', remove: 'Remove', total: 'Total', confirm: 'Confirm', fulfill: 'Mark fulfilled',
        cancelOrder: 'Cancel order', confirmTitle: 'Confirm this order?',
        confirmBody: 'Stock will be deducted immediately.', cancelTitle: 'Cancel this order?',
        cancelBody: 'If confirmed, the quantities will be returned to stock.',
        fulfilledTitle: 'Mark this order as fulfilled?', status: 'Status', draft: 'Draft',
        confirmed: 'Confirmed', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
        createInvoice: 'Create invoice',
        paid: 'Paid', partially_paid: 'Partially paid', unpaid: 'Due',
        authorized: 'Authorized · capture pending', failed: 'Failed', voided: 'Voided',
        stripe: 'Visa · Stripe', paypal: 'PayPal', retryCapture: 'Retry capture',
        amountPaid: 'Received', remaining: 'Remaining', recordPayment: 'Record payment received',
        paymentAmount: 'Amount received', paymentMethod: 'Payment method', paymentReference: 'Reference (optional)',
        paymentSaved: 'Payment recorded.', paymentError: 'Unable to record payment.',
        paymentStatus: 'Payment', noPayment: 'No payment recorded.',
        cash: 'Cash', bank_transfer: 'Bank transfer', mobile_money_manual: 'Mobile money', card_manual: 'Card (manual)', other: 'Other',
        actionError: 'Unable to update the order.', loading: 'Loading…',
        productCurrencyError: 'All products must use the same currency.',
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
      const [productResponse, orderResponse] = await Promise.all([
        getProducts(companyId, { page: 1, limit: 100, status: 'active' }),
        getSalesOrders(companyId, { page: 1, limit: 50 }),
      ]);
      setProducts(productResponse.data || []);
      setOrders(orderResponse.data || []);
      setCapabilities(orderResponse.capabilities || { canCreate: false, canManage: false });
      try {
        const customerResponse = await getCustomers(companyId, { page: 1, limit: 100, status: 'active' });
        setCustomers(customerResponse.data || []);
      } catch (_) {
        setCustomers([]);
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadingError);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, copy.loadingError]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const addLine = () => {
    const product = products.find((item) => String(item._id) === String(selectedProductId));
    const parsedQuantity = Number(quantity);
    if (!product || !Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1) return;
    if (lines.some((line) => String(line.productId) === String(product._id))) {
      setError(isFrench ? 'Ce produit est déjà dans la commande.' : 'This product is already in the order.');
      return;
    }
    if (lines.length && lines[0].currency !== product.currency) {
      setError(copy.productCurrencyError);
      return;
    }
    setLines((current) => [...current, {
      productId: product._id,
      name: product.name,
      quantity: parsedQuantity,
      priceMinor: product.priceMinor || 0,
      currency: product.currency || 'XOF',
    }]);
    setSelectedProductId('');
    setQuantity('1');
    setError('');
  };

  const openCreateModal = () => {
    setCustomer(EMPTY_CUSTOMER);
    setSelectedCustomerId('');
    setNotes('');
    setLines([]);
    setSelectedProductId('');
    setQuantity('1');
    setError('');
    setModalVisible(true);
  };

  const submitOrder = async () => {
    if (!lines.length || isSaving) {
      if (!lines.length) setError(copy.noLines);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await createSalesOrder(companyId, {
        customerId: selectedCustomerId || undefined,
        customer,
        notes: notes.trim(),
        currency: lines[0].currency,
        lines: lines.map(({ productId, quantity: lineQuantity }) => ({ productId, quantity: lineQuantity })),
      });
      setModalVisible(false);
      setNotice(copy.saved);
      await loadData();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.createError);
    } finally {
      setIsSaving(false);
    }
  };

  const runTransition = async (order, action) => {
    setWorkingOrderId(String(order._id));
    setError('');
    try {
      await transitionSalesOrder(order._id, action);
      setNotice(isFrench ? 'Statut de la commande mis à jour.' : 'Order status updated.');
      await loadData();
    } catch (actionError) {
      setError(actionError?.response?.data?.error || actionError?.message || copy.actionError);
    } finally {
      setWorkingOrderId('');
    }
  };

  const openPayment = (order) => {
    const balanceMinor = Math.max(0, order.totalMinor - Number(order.paidMinor || 0));
    setPaymentOrder(order);
    setPaymentAmount(String(balanceMinor / currencyScale(order.currency)));
    setPaymentMethod('cash');
    setPaymentReference('');
    setPaymentIdempotencyKey(makePaymentKey());
    setError('');
  };

  const submitPayment = async () => {
    if (!paymentOrder || isSaving) return;
    const amount = Number(String(paymentAmount).trim().replace(',', '.'));
    const amountMinor = Math.round(amount * currencyScale(paymentOrder.currency));
    const balanceMinor = Math.max(0, paymentOrder.totalMinor - Number(paymentOrder.paidMinor || 0));
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > balanceMinor) {
      setError(isFrench ? 'Saisis un montant positif qui ne dépasse pas le solde restant.' : 'Enter a positive amount no greater than the remaining balance.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await recordSalesOrderPayment(paymentOrder._id, {
        amountMinor,
        currency: paymentOrder.currency,
        method: paymentMethod,
        reference: paymentReference.trim(),
        idempotencyKey: paymentIdempotencyKey,
      });
      setPaymentOrder(null);
      setPaymentIdempotencyKey('');
      setNotice(copy.paymentSaved);
      await loadData();
    } catch (paymentError) {
      setError(paymentError?.response?.data?.error || paymentError?.message || copy.paymentError);
    } finally {
      setIsSaving(false);
    }
  };

  const createInvoice = async (order) => {
    setWorkingOrderId(String(order._id));
    setError('');
    try {
      await createInvoiceFromSalesOrder(order._id);
      navigation.navigate('Invoices');
    } catch (invoiceError) {
      setError(invoiceError?.response?.data?.error || invoiceError?.message || copy.actionError);
    } finally {
      setWorkingOrderId('');
    }
  };

  const confirmTransition = (order, action) => {
    const title = action === 'confirm' ? copy.confirmTitle : action === 'fulfill' ? copy.fulfilledTitle : copy.cancelTitle;
    const message = action === 'confirm' ? copy.confirmBody : action === 'cancel' ? copy.cancelBody : '';
    const label = action === 'confirm' ? copy.confirm : action === 'fulfill' ? copy.fulfill : copy.cancelOrder;
    Alert.alert(title, message, [
      { text: copy.cancel, style: 'cancel' },
      { text: label, style: action === 'cancel' ? 'destructive' : 'default', onPress: () => runTransition(order, action) },
    ]);
  };

  const statusLabel = (status) => copy[status] || status;
  const getOrderTotal = (order) => order.totalMinor || 0;

  const renderOrder = ({ item }) => {
    const isWorking = workingOrderId === String(item._id);
    return (
      <View style={styles.orderRow}>
        <View style={styles.orderTop}>
          <View style={styles.orderHeading}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Text style={styles.customerName}>{item.customer?.name || (isFrench ? 'Client sans nom' : 'Unnamed customer')}</Text>
          </View>
          <Text style={[styles.status, styles[`status_${item.status}`]]}>{statusLabel(item.status)}</Text>
        </View>
        {item.customer?.email ? <Text style={styles.secondaryText}>{item.customer.email}</Text> : null}
        {item.customer?.phone ? <Text style={styles.secondaryText}>{item.customer.phone}</Text> : null}
        <View style={styles.orderLines}>
          {(item.lines || []).map((line) => (
            <View key={String(line._id || line.productId)} style={styles.orderLine}>
              <Text style={styles.lineName} numberOfLines={1}>{line.quantity} × {line.productName}</Text>
              <Text style={styles.lineTotal}>{formatMoney(line.lineTotalMinor, item.currency, locale)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.secondaryText}>{copy.total}</Text>
          <Text style={styles.totalValue}>{formatMoney(getOrderTotal(item), item.currency, locale)}</Text>
        </View>
        {item.channel === 'restaurant_app' ? (
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentStatusText}>{copy.paymentStatus}: {statusLabel(item.paymentStatus || 'unpaid')}</Text>
            <Text style={styles.paymentMeta}>{copy.amountPaid}: {formatMoney(item.paidMinor || 0, item.currency, locale)}</Text>
            <Text style={styles.paymentMeta}>{copy.remaining}: {formatMoney(Math.max(0, item.totalMinor - (item.paidMinor || 0)), item.currency, locale)}</Text>
            {(item.payments || []).slice(0, 3).map((payment) => (
              <Text key={String(payment._id)} style={styles.paymentHistoryLine}>
                {formatMoney(payment.amountMinor, payment.currency, locale)} · {copy[payment.method] || payment.method}{payment.reference ? ` · ${payment.reference}` : ''}
              </Text>
            ))}
            {capabilities.canManage && item.paymentMethod === 'pay_at_venue' && (item.paidMinor || 0) < item.totalMinor && ['confirmed', 'fulfilled'].includes(item.status) ? (
              <ActionButton label={copy.recordPayment} onPress={() => openPayment(item)} disabled={isWorking || isSaving} />
            ) : null}
          </View>
        ) : null}
        {item.notes ? <Text style={styles.noteText}>{item.notes}</Text> : null}
        {(capabilities.canManage && item.status !== 'fulfilled' && item.status !== 'cancelled') ||
          (capabilities.canInvoice && invoicesEnabled && ['confirmed', 'fulfilled'].includes(item.status)) ? (
          <View style={styles.actions}>
            {capabilities.canManage && item.status !== 'fulfilled' && item.status !== 'cancelled' ? <>
              {item.status === 'draft' ? (
                <ActionButton label={copy.confirm} disabled={isWorking} onPress={() => confirmTransition(item, 'confirm')} />
              ) : item.paymentStatus === 'authorized' && ['stripe', 'paypal'].includes(item.paymentMethod) ? (
                <ActionButton label={copy.retryCapture} disabled={isWorking} onPress={() => runTransition(item, 'confirm')} />
              ) : (
                <ActionButton label={copy.fulfill} disabled={isWorking} onPress={() => confirmTransition(item, 'fulfill')} />
              )}
              {!(item.paymentStatus === 'authorized' && ['stripe', 'paypal'].includes(item.paymentMethod)) ? (
                <ActionButton label={copy.cancelOrder} tone="quiet" disabled={isWorking} onPress={() => confirmTransition(item, 'cancel')} />
              ) : null}
            </> : null}
            {capabilities.canInvoice && invoicesEnabled && ['confirmed', 'fulfilled'].includes(item.status) ? (
              <ActionButton label={copy.createInvoice} disabled={isWorking} onPress={() => createInvoice(item)} />
            ) : null}
            {isWorking ? <ActivityIndicator color={COLORS.accent} /> : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        {capabilities.canCreate ? <ActionButton label={copy.create} onPress={openCreateModal} /> : null}
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={COLORS.accent} /><Text style={styles.secondaryText}>{copy.loading}</Text></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderOrder}
          contentContainerStyle={orders.length ? styles.list : styles.emptyList}
          ListEmptyComponent={<Text style={styles.emptyText}>{copy.empty}</Text>}
          onRefresh={loadData}
          refreshing={isLoading}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{copy.create}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>{copy.cancel}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>{copy.customer}</Text>
            {customers.length ? (
              <>
                <Text style={styles.secondaryText}>{copy.savedCustomers}</Text>
                <TouchableOpacity
                  onPress={() => { setSelectedCustomerId(''); setCustomer(EMPTY_CUSTOMER); }}
                  style={[styles.customerOption, !selectedCustomerId && styles.productOptionSelected]}
                >
                  <Text style={styles.productName}>{copy.manualCustomer}</Text>
                </TouchableOpacity>
                {customers.map((savedCustomer) => {
                  const selected = String(selectedCustomerId) === String(savedCustomer._id);
                  return (
                    <TouchableOpacity
                      key={String(savedCustomer._id)}
                      onPress={() => {
                        setSelectedCustomerId(String(savedCustomer._id));
                        setCustomer({
                          name: savedCustomer.name || '',
                          email: savedCustomer.email || '',
                          phone: savedCustomer.phone || '',
                        });
                      }}
                      style={[styles.customerOption, selected && styles.productOptionSelected]}
                    >
                      <Text style={styles.productName}>{savedCustomer.name}</Text>
                      <Text style={styles.secondaryText}>{savedCustomer.email || savedCustomer.phone || ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}
            {!selectedCustomerId ? <>
              <TextInput style={styles.input} placeholder={copy.customerName} value={customer.name} onChangeText={(name) => setCustomer((current) => ({ ...current, name }))} />
              <TextInput style={styles.input} placeholder={copy.email} value={customer.email} onChangeText={(email) => setCustomer((current) => ({ ...current, email }))} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder={copy.phone} value={customer.phone} onChangeText={(phone) => setCustomer((current) => ({ ...current, phone }))} keyboardType="phone-pad" />
            </> : null}

            <Text style={styles.sectionTitle}>{copy.products}</Text>
            <Text style={styles.secondaryText}>{copy.chooseProduct}</Text>
            {products.length ? products.map((product) => {
              const incompatibleCurrency = lines.length > 0 && lines[0].currency !== (product.currency || 'XOF');
              const selected = String(selectedProductId) === String(product._id);
              return (
                <TouchableOpacity
                  key={String(product._id)}
                  disabled={incompatibleCurrency}
                  onPress={() => { setSelectedProductId(product._id); setError(''); }}
                  style={[styles.productOption, selected && styles.productOptionSelected, incompatibleCurrency && styles.productOptionDisabled]}
                >
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.secondaryText}>{formatMoney(product.priceMinor, product.currency, locale)} · {isFrench ? 'Stock' : 'Stock'} {product.stockOnHand}</Text>
                </TouchableOpacity>
              );
            }) : <Text style={styles.emptyText}>{isFrench ? 'Aucun produit actif.' : 'No active products.'}</Text>}
            <View style={styles.addLineRow}>
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder={copy.quantity}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
              <ActionButton label={copy.addLine} onPress={addLine} disabled={!selectedProductId} />
            </View>

            <Text style={styles.sectionTitle}>{copy.lines}</Text>
            {lines.length ? lines.map((line) => (
              <View key={String(line.productId)} style={styles.draftLine}>
                <View style={styles.draftLineInfo}>
                  <Text style={styles.productName}>{line.quantity} × {line.name}</Text>
                  <Text style={styles.secondaryText}>{formatMoney(line.priceMinor * line.quantity, line.currency, locale)}</Text>
                </View>
                <TouchableOpacity onPress={() => setLines((current) => current.filter((entry) => entry.productId !== line.productId))}>
                  <Text style={styles.removeText}>{copy.remove}</Text>
                </TouchableOpacity>
              </View>
            )) : <Text style={styles.emptyText}>{copy.noLines}</Text>}
            {lines.length ? (
              <View style={styles.totalRow}>
                <Text style={styles.secondaryText}>{copy.total}</Text>
                <Text style={styles.totalValue}>{formatMoney(lines.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0), lines[0].currency, locale)}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>{copy.notes}</Text>
            <TextInput style={[styles.input, styles.notesInput]} placeholder={copy.notes} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <ActionButton label={isSaving ? copy.loading : copy.save} onPress={submitOrder} disabled={isSaving || !lines.length} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!paymentOrder} transparent animationType="slide" onRequestClose={() => setPaymentOrder(null)}>
        <View style={styles.paymentBackdrop}>
          <View style={styles.paymentSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{copy.recordPayment}</Text>
              <TouchableOpacity onPress={() => setPaymentOrder(null)} accessibilityRole="button">
                <Text style={styles.closeText}>{copy.cancel}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.secondaryText}>{paymentOrder?.orderNumber}</Text>
            <Text style={styles.paymentBalanceText}>
              {copy.remaining}: {formatMoney(Math.max(0, (paymentOrder?.totalMinor || 0) - (paymentOrder?.paidMinor || 0)), paymentOrder?.currency, locale)}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={copy.paymentAmount}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.sectionTitle}>{copy.paymentMethod}</Text>
            <View style={styles.paymentMethods}>
              {['cash', 'mobile_money_manual', 'bank_transfer', 'card_manual', 'other'].map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[styles.paymentMethodChip, paymentMethod === method && styles.paymentMethodChipActive]}
                >
                  <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextActive]}>{copy[method] || method}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder={copy.paymentReference}
              value={paymentReference}
              onChangeText={setPaymentReference}
              maxLength={100}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <ActionButton label={isSaving ? copy.loading : copy.recordPayment} onPress={submitPayment} disabled={isSaving || !paymentAmount.trim()} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  headerText: { flex: 1 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: '700' },
  subtitle: { color: COLORS.textSoft, fontSize: 13, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: COLORS.textSoft, fontSize: 14, paddingVertical: 8 },
  orderRow: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 10 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  orderHeading: { flex: 1 },
  orderNumber: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  customerName: { color: COLORS.text, fontSize: 14, marginTop: 4 },
  status: { overflow: 'hidden', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700' },
  status_draft: { color: COLORS.warning, backgroundColor: '#FFF4D6' },
  status_confirmed: { color: COLORS.accent, backgroundColor: '#F0EAFE' },
  status_fulfilled: { color: COLORS.success, backgroundColor: '#E3F4EA' },
  status_cancelled: { color: COLORS.danger, backgroundColor: '#FBE8E8' },
  secondaryText: { color: COLORS.textSoft, fontSize: 12, marginTop: 3 },
  orderLines: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 8 },
  orderLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  lineName: { flex: 1, color: COLORS.text, fontSize: 13 },
  lineTotal: { color: COLORS.text, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 9 },
  totalValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  noteText: { color: COLORS.textSoft, fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  paymentSummary: { padding: 11, marginTop: 9, borderRadius: 8, backgroundColor: '#F6F2FB', gap: 4 },
  paymentStatusText: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  paymentMeta: { color: COLORS.textSoft, fontSize: 10 },
  paymentHistoryLine: { color: COLORS.textSoft, fontSize: 10, lineHeight: 14 },
  paymentBalanceText: { color: COLORS.accent, fontSize: 13, fontWeight: '800', marginVertical: 8 },
  paymentBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  paymentSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  paymentMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  paymentMethodChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  paymentMethodChipActive: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  paymentMethodText: { color: COLORS.textSoft, fontSize: 10, fontWeight: '700' },
  paymentMethodTextActive: { color: COLORS.accent },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  button: { minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 6 },
  button_accent: { backgroundColor: COLORS.accent },
  button_quiet: { backgroundColor: '#F3F0F7', borderWidth: 1, borderColor: COLORS.border },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  buttonTextQuiet: { color: COLORS.text },
  error: { color: COLORS.danger, paddingHorizontal: 18, paddingVertical: 8, fontSize: 13 },
  notice: { color: COLORS.success, paddingHorizontal: 18, paddingVertical: 6, fontSize: 13 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  closeText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  form: { padding: 16, paddingBottom: 36 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: { minHeight: 44, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, marginBottom: 8, color: COLORS.text },
  productOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 56, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12, marginTop: 6 },
  customerOption: { minHeight: 48, justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 12, marginTop: 6 },
  productOptionSelected: { borderColor: COLORS.accent, borderWidth: 2 },
  productOptionDisabled: { opacity: 0.45 },
  productName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  addLineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  quantityInput: { flex: 1, marginBottom: 0 },
  draftLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  draftLineInfo: { flex: 1 },
  removeText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
});