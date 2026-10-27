import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useLanguage } from '../context/LanguageContext';
import {
  createAdminBusinessType,
  getAdminBusinesses,
  getAdminAuditLogs,
  getAdminCatalog,
  getAdminOverview,
  getAdminRestaurantPayments,
  updateAdminBusinessModule,
  updateAdminBusinessType,
} from '../services/api';

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

const EMPTY_TYPE = { key: '', en: '', fr: '', icon: '🏢', moduleKeys: [], active: true, sortOrder: 100 };

function formatPaymentAmount(amountMinor, currency, locale) {
  const code = currency || 'XOF';
  try {
    const digits = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format((amountMinor || 0) / (10 ** digits));
  } catch (_) {
    return `${((amountMinor || 0) / 100).toFixed(2)} ${code}`;
  }
}

export default function ProAdminCatalogScreen() {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const [catalog, setCatalog] = useState({ businessTypes: [], businessModules: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [restaurantPayments, setRestaurantPayments] = useState([]);
  const [paymentTotals, setPaymentTotals] = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [overview, setOverview] = useState({ totals: {}, companiesByType: [] });
  const [businesses, setBusinesses] = useState([]);
  const [businessSearch, setBusinessSearch] = useState('');
  const [businessPagination, setBusinessPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [activeSection, setActiveSection] = useState('types');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(EMPTY_TYPE);

  const copy = isFrench
    ? {
        title: 'Administration GoOn', subtitle: 'Domaines métier, modules et historique plateforme.',
        overview: 'Vue globale', businesses: 'Entreprises', types: 'Domaines', modules: 'Modules', audit: 'Historique', payments: 'Paiements restaurant', addType: 'Nouveau domaine',
        companies: 'Entreprises', users: 'Utilisateurs', customers: 'Clients', appointments: 'Rendez-vous',
        edit: 'Modifier', create: 'Créer le domaine', save: 'Enregistrer',
        key: 'Clé stable (ex. clinique)', en: 'Nom en anglais', fr: 'Nom en français',
        icon: 'Icône', defaults: 'Modules par défaut', enabled: 'Actif', inactive: 'Désactivé',
        active: 'Actif', empty: 'Aucun élément.', loading: 'Chargement du catalogue…',
        cancel: 'Annuler', loadError: 'Impossible de charger le catalogue.',
        saved: 'Modifications enregistrées.', moduleError: 'Impossible de modifier ce module.',
        created: 'Domaine créé.', fields: 'Champs modifiés', actor: 'Administrateur',
        searchBusiness: 'Rechercher une entreprise', loadMore: 'Charger plus', owner: 'Propriétaire',
        paymentCount: 'Règlements', paymentOrder: 'Commande', paymentCompany: 'Restaurant', paymentMethod: 'Mode', paymentReference: 'Référence',
        paymentMethodFilter: 'Filtrer par mode', allPaymentMethods: 'Tous', cash: 'Espèces', bank_transfer: 'Virement', mobile_money_manual: 'Mobile money', card_manual: 'Carte (manuel)', other: 'Autre',
        actions: {
          'business_type.create': 'Domaine créé', 'business_type.update': 'Domaine modifié',
          'business_module.update': 'Module modifié',
        },
      }
    : {
        title: 'GoOn administration', subtitle: 'Business types, modules and platform history.',
        overview: 'Overview', businesses: 'Businesses', types: 'Business types', modules: 'Modules', audit: 'History', payments: 'Restaurant payments', addType: 'New business type',
        companies: 'Businesses', users: 'Users', customers: 'Customers', appointments: 'Bookings',
        edit: 'Edit', create: 'Create business type', save: 'Save',
        key: 'Stable key (e.g. clinic)', en: 'English name', fr: 'French name',
        icon: 'Icon', defaults: 'Default modules', enabled: 'Active', inactive: 'Disabled',
        active: 'Active', empty: 'Nothing here yet.', loading: 'Loading catalog…',
        cancel: 'Cancel', loadError: 'Unable to load catalog.',
        saved: 'Changes saved.', moduleError: 'Unable to update module.',
        created: 'Business type created.', fields: 'Changed fields', actor: 'Administrator',
        searchBusiness: 'Search business', loadMore: 'Load more', owner: 'Owner',
        paymentCount: 'Payments', paymentOrder: 'Order', paymentCompany: 'Restaurant', paymentMethod: 'Method', paymentReference: 'Reference',
        paymentMethodFilter: 'Filter by method', allPaymentMethods: 'All', cash: 'Cash', bank_transfer: 'Bank transfer', mobile_money_manual: 'Mobile money', card_manual: 'Card (manual)', other: 'Other',
        actions: {
          'business_type.create': 'Business type created', 'business_type.update': 'Business type updated',
          'business_module.update': 'Module updated',
        },
      };

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [nextCatalog, logs, nextOverview] = await Promise.all([
        getAdminCatalog(),
        getAdminAuditLogs({ page: 1, limit: 30 }),
        getAdminOverview(),
      ]);
      setCatalog(nextCatalog);
      setAuditLogs(logs?.data || []);
      setOverview(nextOverview);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError]);

  const loadBusinesses = useCallback(async (page = 1, append = false) => {
    setIsLoadingBusinesses(true);
    setError('');
    try {
      const result = await getAdminBusinesses({ page, limit: 25, q: businessSearch });
      setBusinesses((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setBusinessPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadError);
    } finally {
      setIsLoadingBusinesses(false);
    }
  }, [businessSearch, copy.loadError]);

  const loadRestaurantPayments = useCallback(async (page = 1, append = false) => {
    setIsLoadingPayments(true);
    setError('');
    try {
      const result = await getAdminRestaurantPayments({
        page,
        limit: 25,
        ...(paymentMethodFilter !== 'all' ? { method: paymentMethodFilter } : {}),
      });
      setRestaurantPayments((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setPaymentTotals(result.totalsByCurrency || []);
      setPaymentPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadError);
    } finally {
      setIsLoadingPayments(false);
    }
  }, [copy.loadError, paymentMethodFilter]);

  useEffect(() => {
    if (activeSection !== 'businesses') return undefined;
    const timer = setTimeout(() => loadBusinesses(1), 300);
    return () => clearTimeout(timer);
  }, [activeSection, loadBusinesses]);

  useEffect(() => {
    if (activeSection !== 'payments') return undefined;
    loadRestaurantPayments(1);
    return undefined;
  }, [activeSection, loadRestaurantPayments]);

  useFocusEffect(useCallback(() => {
    loadCatalog();
  }, [loadCatalog]));

  const openEditor = (businessType = null) => {
    setEditingKey(businessType?.key || null);
    setForm(businessType
      ? {
          key: businessType.key,
          en: businessType.labels?.en || '',
          fr: businessType.labels?.fr || '',
          icon: businessType.icon || '🏢',
          moduleKeys: businessType.moduleKeys || [],
          active: businessType.active !== false,
          sortOrder: businessType.sortOrder || 100,
        }
      : EMPTY_TYPE);
    setEditorVisible(true);
    setError('');
  };

  const saveBusinessType = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    setNotice('');
    const payload = {
      key: form.key.trim().toLowerCase(),
      labels: { en: form.en.trim(), fr: form.fr.trim() },
      icon: form.icon.trim(),
      moduleKeys: form.moduleKeys,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 100,
    };

    try {
      if (editingKey) {
        await updateAdminBusinessType(editingKey, payload);
        setNotice(copy.saved);
      } else {
        await createAdminBusinessType(payload);
        setNotice(copy.created);
      }
      setEditorVisible(false);
      await loadCatalog();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.loadError);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModuleKey = (key, enabled) => {
    setForm((current) => ({
      ...current,
      moduleKeys: enabled
        ? [...new Set([...current.moduleKeys, key])]
        : current.moduleKeys.filter((moduleKey) => moduleKey !== key),
    }));
  };

  const toggleModuleActive = async (module) => {
    try {
      await updateAdminBusinessModule(module.key, !module.active);
      await loadCatalog();
      setNotice(copy.saved);
    } catch (toggleError) {
      setError(toggleError?.response?.data?.error || toggleError?.message || copy.moduleError);
    }
  };

  const renderBusinessType = ({ item }) => (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.85} onPress={() => openEditor(item)}>
      <View style={styles.itemIcon}><Text style={styles.itemIconText}>{item.icon}</Text></View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{item.labels?.[activeLanguage] || item.labels?.en || item.key}</Text>
        <Text style={styles.itemMeta}>{item.key} · {(item.moduleKeys || []).length} {copy.modules.toLowerCase()}</Text>
      </View>
      <Text style={[styles.status, item.active ? styles.statusActive : styles.statusInactive]}>
        {item.active ? copy.active : copy.inactive}
      </Text>
    </TouchableOpacity>
  );

  const renderModule = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemIcon}><Text style={styles.itemIconText}>{item.icon}</Text></View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{item.labels?.[activeLanguage] || item.labels?.en || item.key}</Text>
        <Text style={styles.itemMeta}>{item.key}{item.mandatory ? ' · required' : ''}</Text>
      </View>
      <Switch
        value={item.active}
        onValueChange={() => toggleModuleActive(item)}
        disabled={item.mandatory}
        trackColor={{ false: '#D6D1CA', true: '#BFA0F3' }}
        thumbColor={item.active ? COLORS.accent : '#FFFFFF'}
        accessibilityLabel={item.labels?.[activeLanguage] || item.key}
      />
    </View>
  );

  const renderAuditLog = ({ item }) => {
    const date = item.createdAt ? new Date(item.createdAt) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
      ? date.toLocaleString(isFrench ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
    return (
      <View style={styles.auditRow}>
        <Text style={styles.itemTitle}>{copy.actions[item.action] || item.action}</Text>
        <Text style={styles.itemMeta}>{item.actorId?.name || item.actorId?.email || copy.actor} · {dateLabel}</Text>
        {!!item.changedFields?.length && <Text style={styles.auditFields}>{copy.fields}: {item.changedFields.join(', ')}</Text>}
      </View>
    );
  };

  const renderRestaurantPayment = ({ item }) => {
    const receivedAt = item.receivedAt ? new Date(item.receivedAt) : null;
    const dateLabel = receivedAt && !Number.isNaN(receivedAt.getTime())
      ? receivedAt.toLocaleString(isFrench ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
    const order = item.salesOrderId || {};
    return (
      <View style={styles.paymentRow}>
        <View style={styles.paymentRowTop}>
          <Text style={styles.paymentAmount}>{formatPaymentAmount(item.amountMinor, item.currency, isFrench ? 'fr-FR' : 'en-US')}</Text>
          <Text style={styles.paymentMethod}>{copy[item.method] || item.method}</Text>
        </View>
        <Text style={styles.paymentCompany}>{item.companyId?.name || copy.paymentCompany}</Text>
        <Text style={styles.paymentMeta}>
          {copy.paymentOrder}: {order.orderNumber || '—'}
          {order.tableNumber ? ` · Table ${order.tableNumber}` : ''}
          {order.customer?.name ? ` · ${order.customer.name}` : ''}
        </Text>
        <Text style={styles.paymentMeta}>
          {copy.receivedAt}: {dateLabel}{item.reference ? ` · ${copy.paymentReference}: ${item.reference}` : ''}
        </Text>
        <Text style={styles.paymentActor}>{item.recordedBy?.name || item.recordedBy?.email || copy.actor}</Text>
      </View>
    );
  };

  const renderBusiness = ({ item }) => {
    const typeKey = String(item.businessTypeId || item.categoryId || '');
    const businessType = catalog.businessTypes.find((type) => type.key === typeKey);
    return (
      <View style={styles.itemRow}>
        <View style={styles.itemIcon}><Text style={styles.itemIconText}>{businessType?.icon || '🏢'}</Text></View>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {businessType?.labels?.[activeLanguage] || businessType?.labels?.en || typeKey || (isFrench ? 'Sans domaine' : 'No type')}
            {' · '}{item.ownerId?.name || copy.owner}
          </Text>
        </View>
        <Text style={[styles.status, item.setupStatus === 'ready' ? styles.statusActive : styles.statusInactive]}>
          {item.setupStatus || (item.isVerified ? copy.active : copy.inactive)}
        </Text>
      </View>
    );
  };

  const sectionData = activeSection === 'businesses'
    ? businesses
    : activeSection === 'types'
    ? catalog.businessTypes
    : activeSection === 'modules'
      ? catalog.businessModules
      : activeSection === 'payments'
        ? restaurantPayments
        : auditLogs;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SUPER ADMIN</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.sectionTabs}>
        {['overview', 'businesses', 'types', 'modules', 'payments', 'audit'].map((section) => (
          <TouchableOpacity key={section} style={[styles.sectionTab, activeSection === section && styles.sectionTabActive]} onPress={() => setActiveSection(section)}>
            <Text style={[styles.sectionTabText, activeSection === section && styles.sectionTabTextActive]}>{copy[section]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === 'types' && (
        <TouchableOpacity style={styles.addButton} onPress={() => openEditor()}>
          <Text style={styles.addButtonText}>＋ {copy.addType}</Text>
        </TouchableOpacity>
      )}

      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {activeSection === 'overview' && (
        <ScrollView contentContainerStyle={styles.overviewContent}>
          <View style={styles.statGrid}>
            {[
              ['companies', overview.totals?.companies || 0],
              ['users', overview.totals?.users || 0],
              ['customers', overview.totals?.customers || 0],
              ['appointments', overview.totals?.appointments || 0],
              ['types', overview.totals?.activeBusinessTypes || 0],
              ['modules', overview.totals?.activeModules || 0],
            ].map(([label, value]) => (
              <View key={label} style={styles.statItem}>
                <Text style={styles.statValue}>{Number(value).toLocaleString(isFrench ? 'fr-FR' : 'en-US')}</Text>
                <Text style={styles.statLabel}>{copy[label] || label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.permissionsHeading}>{isFrench ? 'Entreprises par domaine' : 'Businesses by type'}</Text>
          {(overview.companiesByType || []).map((item) => (
            <View key={item.key} style={styles.typeStatRow}>
              <Text style={styles.typeStatIcon}>{item.icon}</Text>
              <Text style={styles.typeStatLabel}>{item.label}</Text>
              <Text style={styles.typeStatValue}>{item.count}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeSection === 'businesses' && (
        <TextInput
          value={businessSearch}
          onChangeText={setBusinessSearch}
          placeholder={copy.searchBusiness}
          placeholderTextColor="#8F8980"
          style={styles.searchInput}
        />
      )}

      {activeSection === 'payments' ? (
        <View>
          <Text style={styles.paymentFilterLabel}>{copy.paymentMethodFilter}</Text>
          <View style={styles.paymentFilters}>
            {['all', 'cash', 'mobile_money_manual', 'bank_transfer', 'card_manual', 'other'].map((method) => (
              <TouchableOpacity
                key={method}
                accessibilityRole="button"
                accessibilityState={{ selected: paymentMethodFilter === method }}
                onPress={() => setPaymentMethodFilter(method)}
                style={[styles.paymentFilter, paymentMethodFilter === method && styles.paymentFilterActive]}
              >
                <Text style={[styles.paymentFilterText, paymentMethodFilter === method && styles.paymentFilterTextActive]}>
                  {method === 'all' ? copy.allPaymentMethods : copy[method]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentSummaryTitle}>{copy.paymentCount}: {paymentPagination.total}</Text>
            <View style={styles.paymentTotalsRow}>
              {paymentTotals.length ? paymentTotals.map((total) => (
                <View key={total.currency} style={styles.paymentTotalChip}>
                  <Text style={styles.paymentTotalAmount}>{formatPaymentAmount(total.amountMinor, total.currency, isFrench ? 'fr-FR' : 'en-US')}</Text>
                  <Text style={styles.paymentTotalCount}>{total.count} {copy.paymentCount.toLowerCase()}</Text>
                </View>
              )) : <Text style={styles.itemMeta}>{copy.empty}</Text>}
            </View>
          </View>
        </View>
      ) : null}

      {isLoading || (activeSection === 'payments' && isLoadingPayments && !restaurantPayments.length) ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : activeSection !== 'overview' && (
        <FlatList
          key={activeSection}
          data={sectionData}
          keyExtractor={(item) => String(item._id || item.key)}
          renderItem={activeSection === 'businesses' ? renderBusiness : activeSection === 'types' ? renderBusinessType : activeSection === 'modules' ? renderModule : activeSection === 'payments' ? renderRestaurantPayment : renderAuditLog}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
          onEndReached={() => {
            if (
              activeSection === 'businesses' &&
              !isLoadingBusinesses &&
              businessPagination.page < businessPagination.pages
            ) {
              loadBusinesses(businessPagination.page + 1, true);
            }
            if (activeSection === 'payments' && !isLoadingPayments && paymentPagination.page < paymentPagination.pages) {
              loadRestaurantPayments(paymentPagination.page + 1, true);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={(
            (activeSection === 'businesses' && isLoadingBusinesses) || (activeSection === 'payments' && isLoadingPayments)
              ? <ActivityIndicator color={COLORS.accent} style={styles.footerLoader} />
              : null
          )}
        />
      )}

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingKey ? copy.edit : copy.create}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setEditorVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput style={styles.input} value={form.key} onChangeText={(key) => setForm((current) => ({ ...current, key }))} placeholder={copy.key} editable={!editingKey} autoCapitalize="none" maxLength={48} />
              <TextInput style={styles.input} value={form.en} onChangeText={(en) => setForm((current) => ({ ...current, en }))} placeholder={copy.en} maxLength={100} />
              <TextInput style={styles.input} value={form.fr} onChangeText={(fr) => setForm((current) => ({ ...current, fr }))} placeholder={copy.fr} maxLength={100} />
              <View style={styles.iconAndActive}>
                <TextInput style={[styles.input, styles.iconInput]} value={form.icon} onChangeText={(icon) => setForm((current) => ({ ...current, icon }))} placeholder={copy.icon} maxLength={12} />
                <View style={styles.activeToggle}>
                  <Text style={styles.itemMeta}>{copy.active}</Text>
                  <Switch value={form.active} onValueChange={(active) => setForm((current) => ({ ...current, active }))} />
                </View>
              </View>
              <Text style={styles.permissionsHeading}>{copy.defaults}</Text>
              {catalog.businessModules.map((module) => (
                <View key={module.key} style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>{module.icon} {module.labels?.[activeLanguage] || module.labels?.en || module.key}</Text>
                  <Switch
                    value={form.moduleKeys.includes(module.key)}
                    onValueChange={(enabled) => toggleModuleKey(module.key, enabled)}
                    disabled={!module.active}
                  />
                </View>
              ))}
              <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabled]} onPress={saveBusinessType} disabled={isSaving}>
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
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 13 },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '900', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 13, marginTop: 4 },
  sectionTabs: { flexDirection: 'row', marginHorizontal: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  sectionTabActive: { borderBottomColor: COLORS.accent },
  sectionTabText: { color: COLORS.textSoft, fontSize: 12, fontWeight: '700' },
  sectionTabTextActive: { color: COLORS.accent },
  addButton: { minHeight: 42, justifyContent: 'center', alignItems: 'center', marginHorizontal: 18, marginVertical: 12, backgroundColor: COLORS.accent, borderRadius: 9 },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  notice: { color: COLORS.success, fontSize: 12, marginHorizontal: 18, marginBottom: 8 },
  error: { color: COLORS.danger, fontSize: 12, marginHorizontal: 18, marginBottom: 8 },
  loader: { marginTop: 48 },
  listContent: { paddingHorizontal: 18, paddingBottom: 26 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EEE7FA', marginRight: 11 },
  itemIconText: { fontSize: 19 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  itemMeta: { color: COLORS.textSoft, fontSize: 11, marginTop: 3 },
  status: { fontSize: 10, fontWeight: '800' },
  statusActive: { color: COLORS.success },
  statusInactive: { color: COLORS.danger },
  separator: { height: 1, backgroundColor: COLORS.border },
  auditRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentFilterLabel: { color: COLORS.textSoft, fontSize: 11, fontWeight: '700', marginHorizontal: 18, marginTop: 8, marginBottom: 6 },
  paymentFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 18 },
  paymentFilter: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  paymentFilterActive: { borderColor: COLORS.accent, backgroundColor: '#F1EAFE' },
  paymentFilterText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '600' },
  paymentFilterTextActive: { color: COLORS.accent },
  paymentSummary: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  paymentSummaryTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  paymentTotalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentTotalChip: { minWidth: 130, padding: 10, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  paymentTotalAmount: { color: COLORS.success, fontSize: 13, fontWeight: '900' },
  paymentTotalCount: { color: COLORS.textSoft, fontSize: 10, marginTop: 3 },
  paymentRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  paymentAmount: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  paymentMethod: { color: COLORS.success, fontSize: 10, fontWeight: '800' },
  paymentCompany: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 5 },
  paymentMeta: { color: COLORS.textSoft, fontSize: 10, marginTop: 3 },
  paymentActor: { color: COLORS.accent, fontSize: 10, fontWeight: '700', marginTop: 4 },
  auditFields: { color: COLORS.accent, fontSize: 11, marginTop: 4 },
  empty: { color: COLORS.textSoft, textAlign: 'center', marginTop: 40 },
  overviewContent: { padding: 18, paddingBottom: 28 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statItem: { width: '48%', minHeight: 82, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  statValue: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: COLORS.textSoft, fontSize: 11, marginTop: 4 },
  typeStatRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  typeStatIcon: { fontSize: 16, width: 30 },
  typeStatLabel: { flex: 1, color: COLORS.text, fontSize: 12 },
  typeStatValue: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  searchInput: { height: 42, marginHorizontal: 18, marginBottom: 8, paddingHorizontal: 11, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, color: COLORS.text },
  footerLoader: { marginVertical: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { maxHeight: '90%', backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  closeText: { color: COLORS.textSoft, fontSize: 26 },
  input: { minHeight: 44, paddingHorizontal: 11, marginBottom: 9, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.surface, color: COLORS.text },
  iconAndActive: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconInput: { width: 85, textAlign: 'center' },
  activeToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8 },
  permissionsHeading: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900', marginTop: 8, marginBottom: 6 },
  permissionRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  permissionLabel: { flex: 1, color: COLORS.text, fontSize: 12, paddingRight: 8 },
  saveButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 16, backgroundColor: COLORS.accent, borderRadius: 9 },
  disabled: { opacity: 0.55 },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});