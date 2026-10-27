import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../context/LanguageContext';
import {
  createInvoice,
  getInvoiceSummary,
  getInvoicePayments,
  getInvoices,
  issueInvoice,
  recordInvoicePayment,
  updateInvoice,
} from '../services/api';

const COLORS = {
  background: '#F7F5F1', surface: '#FFFFFF', border: '#E8E1D7', text: '#17161D',
  textSoft: '#6F6A63', accent: '#7C3AED', danger: '#A83232', success: '#18794E',
};

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

function parsePaymentAmountMinor(value, currency) {
  const normalized = String(value || '').trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const amountMinor = Math.round(amount * currencyScale(currency));
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

function makeIdempotencyKey() {
  return `invoicepay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const INITIAL_CUSTOMER = { name: '', email: '', phone: '', address: '' };
const INITIAL_LINE = { description: '', quantity: '1', unitPrice: '', taxRate: '0' };

export default function ProInvoicesScreen({ companyId }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [invoices, setInvoices] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [capabilities, setCapabilities] = useState({ canCreate: false, canUpdate: false, canIssue: false, canRecordPayment: false });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [currency, setCurrency] = useState('XOF');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([INITIAL_LINE]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFeedback, setPaymentFeedback] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState('');
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const copy = isFrench
    ? {
        title: 'Factures', subtitle: 'Brouillons, émissions et règlements manuels.', add: 'Nouvelle facture',
        empty: 'Aucune facture.', customer: 'Client', customerName: 'Nom du client *', email: 'E-mail',
        phone: 'Téléphone', address: 'Adresse', currency: 'Devise ISO', dueAt: 'Échéance ISO (facultatif)',
        notes: 'Notes', lines: 'Lignes', description: 'Description', quantity: 'Qté', price: 'Prix unitaire', tax: 'Taxe %',
        addLine: 'Ajouter une ligne', removeLine: 'Supprimer', saveDraft: 'Enregistrer brouillon', issue: 'Émettre',
        recordPayment: 'Ajouter un règlement', paymentAmount: 'Montant', method: 'Moyen', reference: 'Référence',
        paymentAmountInvalid: 'Saisis un montant positif valide.', paymentExceedsBalance: 'Le montant dépasse le solde restant.',
        remainingBalance: 'Solde restant',
        savePayment: 'Enregistrer règlement', cancel: 'Annuler', draft: 'Brouillon', issued: 'Émise',
        partially_paid: 'Partiellement payée', paid: 'Payée', void: 'Annulée', cash: 'Espèces',
        bank_transfer: 'Virement', card_manual: 'Carte (manuel)', mobile_money_manual: 'Mobile money (manuel)', other: 'Autre',
        subtotal: 'Sous-total', taxTotal: 'Taxes', total: 'Total', paidTotal: 'Réglé', balance: 'Solde',
        payments: 'Règlements', noPayments: 'Aucun règlement.', loadError: 'Impossible de charger les factures.',
        createError: 'Impossible de créer la facture.', paymentError: 'Impossible d’enregistrer le règlement.',
        created: 'Brouillon créé.', issuedNotice: 'Facture émise.', paymentSaved: 'Règlement enregistré.', retry: 'Réessayer',
        editDraft: 'Modifier le brouillon',
        exportPdf: 'Exporter / partager PDF', pdfError: 'Impossible de générer le PDF.',
        billed: 'Facturé', overdue: 'En retard', overdueStatus: 'En retard',
      }
    : {
        title: 'Invoices', subtitle: 'Drafts, issued invoices and manual payments.', add: 'New invoice',
        empty: 'No invoices yet.', customer: 'Customer', customerName: 'Customer name *', email: 'Email',
        phone: 'Phone', address: 'Address', currency: 'ISO currency', dueAt: 'Due date ISO (optional)',
        notes: 'Notes', lines: 'Lines', description: 'Description', quantity: 'Qty', price: 'Unit price', tax: 'Tax %',
        addLine: 'Add line', removeLine: 'Remove', saveDraft: 'Save draft', issue: 'Issue',
        recordPayment: 'Record payment', paymentAmount: 'Amount', method: 'Method', reference: 'Reference',
        paymentAmountInvalid: 'Enter a valid amount greater than zero.', paymentExceedsBalance: 'The amount exceeds the remaining balance.',
        remainingBalance: 'Remaining balance',
        savePayment: 'Save payment', cancel: 'Cancel', draft: 'Draft', issued: 'Issued',
        partially_paid: 'Partially paid', paid: 'Paid', void: 'Void', cash: 'Cash',
        bank_transfer: 'Bank transfer', card_manual: 'Card (manual)', mobile_money_manual: 'Mobile money (manual)', other: 'Other',
        subtotal: 'Subtotal', taxTotal: 'Tax', total: 'Total', paidTotal: 'Paid', balance: 'Balance',
        payments: 'Payments', noPayments: 'No payments recorded.', loadError: 'Unable to load invoices.',
        createError: 'Unable to create invoice.', paymentError: 'Unable to record payment.',
        created: 'Draft created.', issuedNotice: 'Invoice issued.', paymentSaved: 'Payment recorded.', retry: 'Retry',
        editDraft: 'Edit draft',
        exportPdf: 'Export / share PDF', pdfError: 'Unable to generate the PDF.',
        billed: 'Billed', overdue: 'Overdue', overdueStatus: 'Overdue',
      };

  const loadInvoices = useCallback(async (page = 1, append = false) => {
    if (!companyId) {
      setError(copy.loadError);
      setIsLoading(false);
      return;
    }
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError('');
    try {
      const [result, summary] = await Promise.all([
        getInvoices(companyId, { page, limit: 25 }),
        page === 1 ? getInvoiceSummary(companyId) : Promise.resolve(invoiceSummary),
      ]);
      setInvoices((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
      setCapabilities(result.capabilities || capabilities);
      if (summary) setInvoiceSummary(summary);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadError);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [companyId, copy.loadError]);

  useFocusEffect(useCallback(() => {
    loadInvoices(1);
  }, [loadInvoices]));

  const openInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setPayments([]);
    setPaymentAmount('');
    setPaymentFeedback('');
    setPaymentReference('');
    setPaymentIdempotencyKey(makeIdempotencyKey());
    setIsLoadingPayments(true);
    try {
      setPayments(await getInvoicePayments(invoice._id));
    } catch (paymentError) {
      setError(paymentError?.response?.data?.error || paymentError?.message || copy.loadError);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const createDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const scale = currencyScale(currency);
      const payload = {
        customer,
        currency: currency.trim().toUpperCase(),
        dueAt: dueAt.trim() || undefined,
        notes,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unitPriceMinor: Math.round(Number(String(line.unitPrice).replace(',', '.')) * scale),
          taxRateBps: Math.round(Number(String(line.taxRate).replace(',', '.')) * 100),
        })),
      };
      if (editingInvoiceId) await updateInvoice(editingInvoiceId, payload);
      else await createInvoice(companyId, payload);
      setCreateVisible(false);
      setEditingInvoiceId(null);
      setCustomer(INITIAL_CUSTOMER);
      setCurrency('XOF');
      setDueAt('');
      setNotes('');
      setLines([INITIAL_LINE]);
      setNotice(copy.created);
      await loadInvoices(1);
    } catch (createError) {
      setError(createError?.response?.data?.error || createError?.message || copy.createError);
    } finally {
      setIsSaving(false);
    }
  };

  const editDraft = (invoice) => {
    const scale = currencyScale(invoice.currency);
    setEditingInvoiceId(invoice._id);
    setCustomer({
      name: invoice.customer?.name || '',
      email: invoice.customer?.email || '',
      phone: invoice.customer?.phone || '',
      address: invoice.customer?.address || '',
    });
    setCurrency(invoice.currency || 'XOF');
    setDueAt(invoice.dueAt ? String(invoice.dueAt).slice(0, 10) : '');
    setNotes(invoice.notes || '');
    setLines((invoice.lines || []).map((line) => ({
      description: line.description || '',
      quantity: String(line.quantity || 1),
      unitPrice: String((line.unitPriceMinor || 0) / scale),
      taxRate: String((line.taxRateBps || 0) / 100),
    })));
    setSelectedInvoice(null);
    setCreateVisible(true);
  };

  const issueSelectedInvoice = async () => {
    if (!selectedInvoice || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await issueInvoice(selectedInvoice._id);
      setSelectedInvoice(updated);
      setNotice(copy.issuedNotice);
      await loadInvoices(1);
    } catch (issueError) {
      setError(issueError?.response?.data?.error || issueError?.message || copy.loadError);
    } finally {
      setIsSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!selectedInvoice || isSaving) return;
    const amountMinor = parsePaymentAmountMinor(paymentAmount, selectedInvoice.currency);
    if (amountMinor === null) {
      setPaymentFeedback(copy.paymentAmountInvalid);
      return;
    }
    const balanceMinor = Math.max(0, selectedInvoice.totalMinor - selectedInvoice.paidMinor);
    if (amountMinor > balanceMinor) {
      setPaymentFeedback(copy.paymentExceedsBalance);
      return;
    }

    setIsSaving(true);
    setPaymentFeedback('');
    setError('');
    try {
      const result = await recordInvoicePayment(selectedInvoice._id, {
        amountMinor,
        currency: selectedInvoice.currency,
        method: paymentMethod,
        reference: paymentReference,
        idempotencyKey: paymentIdempotencyKey,
      });
      setSelectedInvoice(result.invoice);
      setPayments((current) => [result.payment, ...current]);
      setPaymentIdempotencyKey(makeIdempotencyKey());
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentFeedback(copy.paymentSaved);
      await loadInvoices(1);
    } catch (paymentError) {
      setPaymentFeedback(paymentError?.response?.data?.error || paymentError?.message || copy.paymentError);
    } finally {
      setIsSaving(false);
    }
  };

  const exportInvoicePdf = async (invoice) => {
    if (!invoice || isExportingPdf) return;
    setIsExportingPdf(true);
    setError('');

    const lineRows = (invoice.lines || []).map((line) => `
      <tr>
        <td>${escapeHtml(line.description)}</td>
        <td class="number">${escapeHtml(line.quantity)}</td>
        <td class="number">${escapeHtml(formatMoney(line.unitPriceMinor, invoice.currency, locale))}</td>
        <td class="number">${escapeHtml(formatMoney(line.lineTotalMinor, invoice.currency, locale))}</td>
      </tr>
    `).join('');
    const html = `<!doctype html><html lang="${isFrench ? 'fr' : 'en'}"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(invoice.invoiceNumber || copy.draft)}</title>
      <style>
        *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17161d;margin:0;padding:38px;background:#fff}
        .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #7c3aed;padding-bottom:22px;margin-bottom:26px}
        .brand{font-size:12px;letter-spacing:2px;color:#7c3aed;font-weight:800}.title{font-size:30px;font-weight:800;margin:8px 0 0}.meta{text-align:right;color:#6f6a63;font-size:12px;line-height:1.7}
        .customer{padding:18px;background:#f7f5f1;border-radius:10px;margin-bottom:24px}.label{font-size:10px;text-transform:uppercase;color:#6f6a63;font-weight:800}.name{font-size:16px;font-weight:700;margin-top:5px}.contact{font-size:12px;color:#6f6a63;margin-top:3px}
        table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:#6f6a63;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e8e1d7;padding:10px 6px}td{padding:12px 6px;border-bottom:1px solid #eee}.number{text-align:right;white-space:nowrap}
        .totals{width:280px;margin:20px 0 0 auto}.total-row{display:flex;justify-content:space-between;padding:6px 0;color:#6f6a63;font-size:12px}.grand{border-top:1px solid #e8e1d7;margin-top:7px;padding-top:12px;color:#17161d;font-size:16px;font-weight:800}
        .notes{margin-top:32px;padding-top:12px;border-top:1px solid #e8e1d7;color:#6f6a63;font-size:11px;white-space:pre-wrap}
      </style></head><body>
      <div class="top"><div><div class="brand">GOON BUSINESS</div><div class="title">${escapeHtml(copy.title)}</div></div>
      <div class="meta"><strong>${escapeHtml(invoice.invoiceNumber || copy.draft)}</strong><br/>${escapeHtml(copy[invoice.status] || invoice.status)}<br/>${invoice.issuedAt ? escapeHtml(new Date(invoice.issuedAt).toLocaleDateString(locale)) : ''}</div></div>
      <div class="customer"><div class="label">${escapeHtml(copy.customer)}</div><div class="name">${escapeHtml(invoice.customer?.name)}</div>
      ${invoice.customer?.email ? `<div class="contact">${escapeHtml(invoice.customer.email)}</div>` : ''}
      ${invoice.customer?.phone ? `<div class="contact">${escapeHtml(invoice.customer.phone)}</div>` : ''}
      ${invoice.customer?.address ? `<div class="contact">${escapeHtml(invoice.customer.address)}</div>` : ''}</div>
      <table><thead><tr><th>${escapeHtml(copy.description)}</th><th class="number">${escapeHtml(copy.quantity)}</th><th class="number">${escapeHtml(copy.price)}</th><th class="number">${escapeHtml(copy.total)}</th></tr></thead><tbody>${lineRows}</tbody></table>
      <div class="totals"><div class="total-row"><span>${escapeHtml(copy.subtotal)}</span><span>${escapeHtml(formatMoney(invoice.subtotalMinor, invoice.currency, locale))}</span></div>
      <div class="total-row"><span>${escapeHtml(copy.taxTotal)}</span><span>${escapeHtml(formatMoney(invoice.taxMinor, invoice.currency, locale))}</span></div>
      <div class="total-row grand"><span>${escapeHtml(copy.total)}</span><span>${escapeHtml(formatMoney(invoice.totalMinor, invoice.currency, locale))}</span></div>
      <div class="total-row"><span>${escapeHtml(copy.paidTotal)}</span><span>${escapeHtml(formatMoney(invoice.paidMinor, invoice.currency, locale))}</span></div>
      <div class="total-row"><span>${escapeHtml(copy.balance)}</span><span>${escapeHtml(formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency, locale))}</span></div></div>
      ${invoice.notes ? `<div class="notes">${escapeHtml(invoice.notes)}</div>` : ''}
      </body></html>`;

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const file = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: invoice.invoiceNumber || copy.title,
          });
        }
      }
    } catch (exportError) {
      setError(exportError?.message || copy.pdfError);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderInvoice = ({ item }) => (
    <TouchableOpacity style={styles.invoiceRow} onPress={() => openInvoice(item)} activeOpacity={0.85}>
      <View style={styles.invoiceGlyph}><Text style={styles.invoiceGlyphText}>📄</Text></View>
      <View style={styles.invoiceBody}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber || copy.draft}</Text>
        <Text style={styles.invoiceMeta} numberOfLines={1}>{item.customer?.name}</Text>
        <Text style={styles.invoiceMeta}>
          {formatMoney(item.totalMinor, item.currency, locale)} · {
            item.dueAt && new Date(item.dueAt).getTime() < Date.now() && item.paidMinor < item.totalMinor && !['draft', 'void'].includes(item.status)
              ? copy.overdueStatus
              : copy[item.status] || item.status
          }
        </Text>
      </View>
      <Text style={styles.invoiceOpen}>›</Text>
    </TouchableOpacity>
  );

  const updateLine = (index, key, value) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line));
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        {capabilities.canCreate && <TouchableOpacity style={styles.addButton} onPress={() => { setEditingInvoiceId(null); setCreateVisible(true); }}><Text style={styles.addButtonText}>＋</Text></TouchableOpacity>}
      </View>

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><TouchableOpacity onPress={() => loadInvoices(1)}><Text style={styles.retry}>{copy.retry}</Text></TouchableOpacity></View>}

      {!!invoiceSummary?.currencies?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryList}>
          {invoiceSummary.currencies.map((summary) => (
            <View key={summary.currency} style={styles.summaryRow}>
              <Text style={styles.summaryCurrency}>{summary.currency}</Text>
              <Text style={styles.summaryValue}>{copy.billed}: {summary.invoiceCount || 0}</Text>
              <Text style={styles.summaryLabel}>{copy.paidTotal}: {formatMoney(summary.paidMinor, summary.currency, locale)}</Text>
              <Text style={[styles.summaryLabel, summary.overdueCount > 0 && styles.overdueValue]}>
                {copy.balance}: {formatMoney(summary.outstandingMinor, summary.currency, locale)} · {copy.overdue}: {summary.overdueCount || 0}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {isLoading ? <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} /> : invoices.length ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => {
            if (!isLoadingMore && pagination.page < pagination.pages) loadInvoices(pagination.page + 1, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={COLORS.accent} style={styles.footerLoader} /> : null}
        />
      ) : <View style={styles.emptyState}><Text style={styles.emptyText}>{copy.empty}</Text></View>}

      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalSheet, styles.largeModal]}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingInvoiceId ? copy.editDraft : copy.add}</Text><TouchableOpacity onPress={() => { setCreateVisible(false); setEditingInvoiceId(null); }}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>{copy.customer}</Text>
            {[
              ['name', copy.customerName], ['email', copy.email], ['phone', copy.phone], ['address', copy.address],
            ].map(([key, placeholder]) => (
              <TextInput key={key} style={styles.input} placeholder={placeholder} value={customer[key]} onChangeText={(value) => setCustomer((current) => ({ ...current, [key]: value }))} autoCapitalize={key === 'email' ? 'none' : 'sentences'} />
            ))}
            <View style={styles.inlineInputs}>
              <TextInput style={[styles.input, styles.currencyInput]} value={currency} onChangeText={(value) => setCurrency(value.toUpperCase())} placeholder={copy.currency} maxLength={3} />
              <TextInput style={[styles.input, styles.dueInput]} value={dueAt} onChangeText={setDueAt} placeholder={copy.dueAt} />
            </View>
            <Text style={styles.sectionLabel}>{copy.lines}</Text>
            {lines.map((line, index) => (
              <View key={`line-${index}`} style={styles.lineCard}>
                <TextInput style={styles.input} placeholder={copy.description} value={line.description} onChangeText={(value) => updateLine(index, 'description', value)} maxLength={180} />
                <View style={styles.inlineInputs}>
                  <TextInput style={[styles.input, styles.smallInput]} placeholder={copy.quantity} value={line.quantity} onChangeText={(value) => updateLine(index, 'quantity', value)} keyboardType="number-pad" />
                  <TextInput style={[styles.input, styles.flexInput]} placeholder={copy.price} value={line.unitPrice} onChangeText={(value) => updateLine(index, 'unitPrice', value)} keyboardType="decimal-pad" />
                  <TextInput style={[styles.input, styles.taxInput]} placeholder={copy.tax} value={line.taxRate} onChangeText={(value) => updateLine(index, 'taxRate', value)} keyboardType="decimal-pad" />
                </View>
                {lines.length > 1 && <TouchableOpacity onPress={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Text style={styles.removeLine}>{copy.removeLine}</Text></TouchableOpacity>}
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setLines((current) => [...current, { ...INITIAL_LINE }])}><Text style={styles.secondaryButtonText}>＋ {copy.addLine}</Text></TouchableOpacity>
            <TextInput style={[styles.input, styles.notesInput]} placeholder={copy.notes} value={notes} onChangeText={setNotes} multiline maxLength={1500} />
            <TouchableOpacity style={styles.primaryButton} onPress={createDraft} disabled={isSaving}><Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.saveDraft}</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={!!selectedInvoice} transparent animationType="slide" onRequestClose={() => setSelectedInvoice(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalSheet, styles.largeModal]}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{selectedInvoice?.invoiceNumber || copy.draft}</Text><TouchableOpacity onPress={() => setSelectedInvoice(null)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          {selectedInvoice && <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.customerTitle}>{selectedInvoice.customer?.name}</Text>
            {!!selectedInvoice.customer?.email && <Text style={styles.rowMeta}>{selectedInvoice.customer.email}</Text>}
            {(selectedInvoice.lines || []).map((line) => (
              <View key={line._id} style={styles.detailLine}>
                <Text style={styles.detailDescription}>{line.description} · {line.quantity}</Text>
                <Text style={styles.rowMeta}>{formatMoney(line.lineTotalMinor, selectedInvoice.currency, locale)}</Text>
              </View>
            ))}
            <View style={styles.totalsBox}>
              <Text style={styles.rowMeta}>{copy.subtotal}: {formatMoney(selectedInvoice.subtotalMinor, selectedInvoice.currency, locale)}</Text>
              <Text style={styles.rowMeta}>{copy.taxTotal}: {formatMoney(selectedInvoice.taxMinor, selectedInvoice.currency, locale)}</Text>
              <Text style={styles.totalText}>{copy.total}: {formatMoney(selectedInvoice.totalMinor, selectedInvoice.currency, locale)}</Text>
              <Text style={styles.rowMeta}>{copy.paidTotal}: {formatMoney(selectedInvoice.paidMinor, selectedInvoice.currency, locale)}</Text>
              <Text style={styles.rowMeta}>{copy.balance}: {formatMoney(selectedInvoice.totalMinor - selectedInvoice.paidMinor, selectedInvoice.currency, locale)}</Text>
            </View>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => exportInvoicePdf(selectedInvoice)} disabled={isExportingPdf}>
              <Text style={styles.secondaryButtonText}>{isExportingPdf ? '…' : copy.exportPdf}</Text>
            </TouchableOpacity>

            {capabilities.canIssue && selectedInvoice.status === 'draft' && (
              <View style={styles.invoiceActions}>
                {capabilities.canUpdate && <TouchableOpacity style={styles.secondaryButton} onPress={() => editDraft(selectedInvoice)}><Text style={styles.secondaryButtonText}>{copy.editDraft}</Text></TouchableOpacity>}
                <TouchableOpacity style={[styles.primaryButton, styles.issueButton]} onPress={issueSelectedInvoice} disabled={isSaving}><Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.issue}</Text></TouchableOpacity>
              </View>
            )}

            {capabilities.canRecordPayment && ['issued', 'partially_paid'].includes(selectedInvoice.status) && (
              <View style={styles.paymentBox}>
                <Text style={styles.sectionLabel}>{copy.recordPayment}</Text>
                <Text style={styles.rowMeta}>
                  {copy.remainingBalance}: {formatMoney(Math.max(0, selectedInvoice.totalMinor - selectedInvoice.paidMinor), selectedInvoice.currency, locale)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.paymentAmount}
                  value={paymentAmount}
                  onChangeText={(value) => { setPaymentAmount(value); setPaymentFeedback(''); }}
                  keyboardType="decimal-pad"
                />
                {paymentFeedback ? (
                  <Text
                    accessibilityRole="alert"
                    style={paymentFeedback === copy.paymentSaved ? styles.paymentSuccess : styles.paymentError}
                  >
                    {paymentFeedback}
                  </Text>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodOptions}>
                  {['cash', 'bank_transfer', 'card_manual', 'mobile_money_manual', 'other'].map((method) => (
                    <TouchableOpacity key={method} style={[styles.methodChip, paymentMethod === method && styles.methodChipActive]} onPress={() => setPaymentMethod(method)}><Text style={[styles.methodText, paymentMethod === method && styles.methodTextActive]}>{copy[method]}</Text></TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput style={styles.input} placeholder={copy.reference} value={paymentReference} onChangeText={setPaymentReference} maxLength={100} />
                <TouchableOpacity style={styles.primaryButton} onPress={submitPayment} disabled={isSaving || !paymentAmount.trim()}><Text style={styles.primaryButtonText}>{isSaving ? '…' : copy.savePayment}</Text></TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionLabel}>{copy.payments}</Text>
            {isLoadingPayments ? <ActivityIndicator color={COLORS.accent} /> : payments.length ? payments.map((payment) => (
              <View key={payment._id} style={styles.detailLine}>
                <Text style={styles.detailDescription}>{copy[payment.method] || payment.method}</Text>
                <Text style={styles.rowMeta}>{formatMoney(payment.amountMinor, payment.currency, locale)}</Text>
              </View>
            )) : <Text style={styles.rowMeta}>{copy.noPayments}</Text>}
          </ScrollView>}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 10 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 12, marginTop: 4 },
  addButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.accent },
  addButtonText: { color: '#FFFFFF', fontSize: 25, lineHeight: 28 },
  notice: { color: COLORS.success, fontSize: 12, marginHorizontal: 18, marginBottom: 6 },
  summaryList: { gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  summaryRow: { minWidth: 180, padding: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  summaryCurrency: { color: COLORS.accent, fontSize: 10, fontWeight: '900', marginBottom: 3 },
  summaryValue: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  summaryLabel: { color: COLORS.textSoft, fontSize: 9, marginTop: 3 },
  overdueValue: { color: COLORS.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: 18, marginBottom: 6 },
  error: { flex: 1, color: COLORS.danger, fontSize: 12 },
  retry: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 40 },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  invoiceRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  invoiceGlyph: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderRadius: 10, backgroundColor: '#EEE7FA' },
  invoiceGlyphText: { fontSize: 18 },
  invoiceBody: { flex: 1, minWidth: 0 },
  invoiceNumber: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  invoiceMeta: { color: COLORS.textSoft, fontSize: 11, marginTop: 3 },
  invoiceOpen: { color: COLORS.accent, fontSize: 25, paddingHorizontal: 5 },
  separator: { height: 1, backgroundColor: COLORS.border },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textSoft, fontSize: 13 },
  footerLoader: { marginVertical: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  largeModal: { maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '900', paddingRight: 8 },
  closeText: { color: COLORS.textSoft, fontSize: 27 },
  sectionLabel: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900', marginTop: 8, marginBottom: 6 },
  input: { minHeight: 42, paddingHorizontal: 10, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 12 },
  inlineInputs: { flexDirection: 'row', gap: 7 },
  currencyInput: { width: 90 },
  dueInput: { flex: 1 },
  lineCard: { paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  smallInput: { width: 64 },
  flexInput: { flex: 1 },
  taxInput: { width: 67 },
  removeLine: { color: COLORS.danger, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  notesInput: { minHeight: 60, paddingTop: 9, marginTop: 8 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderRadius: 8, backgroundColor: COLORS.accent },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  secondaryButtonText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '800' },
  invoiceActions: { flexDirection: 'row', gap: 8, marginTop: 9 },
  secondaryButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  secondaryButtonText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '800' },
  issueButton: { flex: 1, marginTop: 0 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  customerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 3 },
  detailLine: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailDescription: { flex: 1, color: COLORS.text, fontSize: 12 },
  rowMeta: { color: COLORS.textSoft, fontSize: 11 },
  totalsBox: { alignItems: 'flex-end', gap: 5, paddingVertical: 12 },
  totalText: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  paymentBox: { paddingTop: 9, marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  paymentError: { color: COLORS.danger, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  paymentSuccess: { color: COLORS.success, fontSize: 12, lineHeight: 17, fontWeight: '700', marginBottom: 8 },
  methodOptions: { gap: 6, paddingBottom: 5 },
  methodChip: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  methodChipActive: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  methodText: { color: COLORS.textSoft, fontSize: 10, fontWeight: '700' },
  methodTextActive: { color: COLORS.accent },
});