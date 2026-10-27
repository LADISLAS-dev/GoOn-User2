import React, { useCallback, useEffect, useState } from 'react';
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
import { useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '../services/api';

const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
  success: '#18794E',
};

const EMPTY_FORM = { name: '', email: '', phone: '', status: 'active', tags: '', notes: '' };

export default function ProCustomersScreen({ companyId }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryRef = useRef(query);
  const hasMountedSearchEffect = useRef(false);

  const copy = isFrench
    ? {
        title: 'Clients', subtitle: 'Votre base de contacts, propre à cette entreprise.',
        search: 'Rechercher un nom, un e-mail ou un téléphone', add: 'Ajouter un client',
        emptyTitle: 'Aucun client pour le moment', emptyBody: 'Ajoutez un contact pour commencer votre suivi client.',
        retry: 'Réessayer', loadMore: 'Charger plus', edit: 'Modifier', remove: 'Supprimer',
        createTitle: 'Nouveau client', editTitle: 'Modifier le client', name: 'Nom *',
        email: 'E-mail', phone: 'Téléphone', tags: 'Étiquettes, séparées par des virgules',
        notes: 'Notes', save: 'Enregistrer', cancel: 'Annuler',
        statuses: { lead: 'Prospect', active: 'Actif', inactive: 'Inactif' },
        deleteTitle: 'Supprimer ce client ?', deleteBody: 'Cette action est irréversible.',
        saveError: 'Impossible d’enregistrer le client.', loadError: 'Impossible de charger les clients.',
      }
    : {
        title: 'Customers', subtitle: 'A contact list scoped to this business.',
        search: 'Search name, email or phone', add: 'Add customer',
        emptyTitle: 'No customers yet', emptyBody: 'Add a contact to start building your customer list.',
        retry: 'Retry', loadMore: 'Load more', edit: 'Edit', remove: 'Delete',
        createTitle: 'New customer', editTitle: 'Edit customer', name: 'Name *',
        email: 'Email', phone: 'Phone', tags: 'Tags, separated by commas',
        notes: 'Notes', save: 'Save', cancel: 'Cancel',
        statuses: { lead: 'Lead', active: 'Active', inactive: 'Inactive' },
        deleteTitle: 'Delete this customer?', deleteBody: 'This action cannot be undone.',
        saveError: 'Unable to save customer.', loadError: 'Unable to load customers.',
      };

  const loadPage = useCallback(async (page = 1, append = false) => {
    if (!companyId) {
      setError(copy.loadError);
      setIsLoading(false);
      return;
    }

    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError('');

    try {
      const result = await getCustomers(companyId, { page, limit: 25, q: queryRef.current });
      setCustomers((current) => append ? [...current, ...result.data] : result.data);
      setPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadError);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [companyId, copy.loadError]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useFocusEffect(useCallback(() => {
    loadPage(1);
  }, [loadPage]));

  useEffect(() => {
    if (!hasMountedSearchEffect.current) {
      hasMountedSearchEffect.current = true;
      return undefined;
    }

    const timer = setTimeout(() => loadPage(1), 300);
    return () => clearTimeout(timer);
  }, [loadPage]);

  const openCreate = () => {
    setEditingCustomerId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (customer) => {
    setEditingCustomerId(customer._id);
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      status: customer.status || 'active',
      tags: (customer.tags || []).join(', '),
      notes: customer.notes || '',
    });
    setModalVisible(true);
  };

  const saveCustomer = async () => {
    if (!form.name.trim() || isSaving) return;

    setIsSaving(true);
    setError('');
    const payload = {
      ...form,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    };

    try {
      if (editingCustomerId) await updateCustomer(editingCustomerId, payload);
      else await createCustomer(companyId, payload);
      setModalVisible(false);
      setForm(EMPTY_FORM);
      setEditingCustomerId(null);
      await loadPage(1);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (customer) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.remove,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(customer._id);
            await loadPage(1);
          } catch (deleteError) {
            setError(deleteError?.response?.data?.error || deleteError?.message || copy.loadError);
          }
        },
      },
    ]);
  };

  const renderCustomer = ({ item }) => (
    <View style={styles.customerRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{String(item.name || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.customerInfo}>
        <View style={styles.nameLine}>
          <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusPill, item.status === 'active' ? styles.statusActive : styles.statusOther]}>
            <Text style={[styles.statusText, item.status === 'active' ? styles.statusActiveText : styles.statusOtherText]}>
              {copy.statuses[item.status] || copy.statuses.active}
            </Text>
          </View>
        </View>
        {!!item.email && <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>}
        {!!item.phone && <Text style={styles.contactText} numberOfLines={1}>{item.phone}</Text>}
        {!!item.tags?.length && <Text style={styles.tagsText} numberOfLines={1}>{item.tags.join(' · ')}</Text>}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.edit} onPress={() => openEdit(item)} style={styles.smallAction}>
          <Text style={styles.editAction}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.remove} onPress={() => confirmDelete(item)} style={styles.smallAction}>
          <Text style={styles.deleteAction}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setQuery(value.trim());
        }}
        placeholder={copy.search}
        placeholderTextColor="#8F8980"
        style={styles.searchInput}
        returnKeyType="search"
        accessibilityLabel={copy.search}
      />

      {!!error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
          <TouchableOpacity onPress={() => loadPage(1)}><Text style={styles.retryText}>{copy.retry}</Text></TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : customers.length ? (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderCustomer}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => {
            if (!isLoadingMore && pagination.page < pagination.pages) loadPage(pagination.page + 1, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={COLORS.accent} style={styles.footerLoader} /> : null}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{copy.emptyBody}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openCreate}>
            <Text style={styles.emptyButtonText}>{copy.add}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCustomerId ? copy.editTitle : copy.createTitle}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.cancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput style={styles.formInput} placeholder={copy.name} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} maxLength={120} />
              <TextInput style={styles.formInput} placeholder={copy.email} value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
              <TextInput style={styles.formInput} placeholder={copy.phone} value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} keyboardType="phone-pad" maxLength={40} />
              <Text style={styles.formLabel}>{isFrench ? 'STATUT' : 'STATUS'}</Text>
              <View style={styles.statusOptions}>
                {['lead', 'active', 'inactive'].map((status) => (
                  <TouchableOpacity key={status} style={[styles.statusOption, form.status === status && styles.statusOptionSelected]} onPress={() => setForm((current) => ({ ...current, status }))}>
                    <Text style={[styles.statusOptionText, form.status === status && styles.statusOptionTextSelected]}>{copy.statuses[status]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.formInput} placeholder={copy.tags} value={form.tags} onChangeText={(tags) => setForm((current) => ({ ...current, tags }))} maxLength={300} />
              <TextInput style={[styles.formInput, styles.notesInput]} placeholder={copy.notes} value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} multiline maxLength={2000} textAlignVertical="top" />
              <TouchableOpacity style={[styles.saveButton, (!form.name.trim() || isSaving) && styles.saveButtonDisabled]} onPress={saveCustomer} disabled={!form.name.trim() || isSaving}>
                <Text style={styles.saveButtonText}>{isSaving ? '…' : copy.save}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 26, lineHeight: 29, fontWeight: '500' },
  searchInput: { height: 46, marginHorizontal: 18, marginBottom: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 14 },
  errorRow: { marginHorizontal: 18, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 12 },
  retryText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 50 },
  listContent: { paddingHorizontal: 18, paddingBottom: 26 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  separator: { height: 1, backgroundColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EEE7FA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: COLORS.accent, fontWeight: '900', fontSize: 17 },
  customerInfo: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  customerName: { flexShrink: 1, color: COLORS.text, fontSize: 14, fontWeight: '800' },
  statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusActive: { backgroundColor: '#E7F5ED' },
  statusOther: { backgroundColor: '#F0ECE6' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusActiveText: { color: COLORS.success },
  statusOtherText: { color: COLORS.textSoft },
  contactText: { color: COLORS.textSoft, fontSize: 12, marginTop: 3 },
  tagsText: { color: COLORS.accent, fontSize: 11, marginTop: 4 },
  rowActions: { flexDirection: 'row', marginLeft: 6 },
  smallAction: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  editAction: { color: COLORS.accent, fontSize: 20, fontWeight: '700' },
  deleteAction: { color: COLORS.danger, fontSize: 23, fontWeight: '400' },
  emptyState: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  emptyIcon: { fontSize: 30, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyBody: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  emptyButton: { marginTop: 18, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { maxHeight: '90%', backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: COLORS.text, fontSize: 19, fontWeight: '900' },
  closeText: { color: COLORS.textSoft, fontSize: 28, lineHeight: 30, paddingHorizontal: 4 },
  formInput: { minHeight: 46, marginBottom: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 14 },
  formLabel: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900', marginBottom: 7, marginTop: 2 },
  statusOptions: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  statusOption: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, backgroundColor: COLORS.surface, paddingVertical: 9 },
  statusOptionSelected: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  statusOptionText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '700' },
  statusOptionTextSelected: { color: COLORS.accent },
  notesInput: { minHeight: 86, paddingTop: 12 },
  saveButton: { minHeight: 47, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderRadius: 10, marginTop: 5 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});