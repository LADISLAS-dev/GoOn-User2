import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCompanyModuleSettings, updateCompanyModules } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const MODULE_ROUTES = {
  appointments: 'Booking',
  messages: 'Messages',
  analytics: 'Analytics',
  customers: 'Customers',
  team: 'Team',
  audit_logs: 'AuditLogs',
  inventory: 'Inventory',
  procurement: 'Procurement',
  invoices: 'Invoices',
  sales_orders: 'SalesOrders',
  business_info: 'About',
};

const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
};

const getModuleSelectionKey = (items) => JSON.stringify(
  (items || [])
    .map(({ key, enabled }) => ({ key, enabled: Boolean(enabled) }))
    .sort((left, right) => left.key.localeCompare(right.key))
);

export default function ProBusinessModulesScreen({ route, navigation }) {
  const companyId = String(route?.params?.companyId || '').trim();
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const copy = isFrench
    ? {
        noChanges: 'Aucun changement à enregistrer',
        noPermission: 'Modification non autorisée',
        save: 'Enregistrer les modules',
        saving: 'Enregistrement…',
        saved: 'Modules enregistrés.',
        subtitle: 'Choisissez les outils à afficher et voyez où les retrouver.',
        locations: {
          company: 'Accueil de l’entreprise',
          appointments: 'Onglet Réservations',
          messages: 'Onglet Messages',
          business_info: 'Onglet À propos et fiche publique',
          analytics: 'Onglet Statistiques',
          customers: 'Onglet Clients',
          team: 'Onglet Équipe',
          audit_logs: 'Onglet Historique',
          inventory: 'Onglet Menu et stock ; carte publique pour les restaurants',
          procurement: 'Onglet Fournisseurs et achats',
          invoices: 'Onglet Factures',
          sales_orders: 'Onglet Commandes de vente',
        },
      }
    : {
        noChanges: 'No changes to save',
        noPermission: 'Changes not allowed',
        save: 'Save modules',
        saving: 'Saving…',
        saved: 'Modules saved.',
        subtitle: 'Choose which tools to show and see where to find them.',
        locations: {
          company: 'Company home',
          appointments: 'Bookings tab',
          messages: 'Messages tab',
          business_info: 'About tab and public profile',
          analytics: 'Analytics tab',
          customers: 'Customers tab',
          team: 'Team tab',
          audit_logs: 'Activity history tab',
          inventory: 'Menu & stock tab; public menu for restaurants',
          procurement: 'Suppliers & purchasing tab',
          invoices: 'Invoices tab',
          sales_orders: 'Sales orders tab',
        },
      };
  const [modules, setModules] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const savedSelectionRef = useRef('');
  const saveLockRef = useRef(false);

  useEffect(() => {
    let isCurrent = true;

    if (!companyId) {
      setError(isFrench ? 'Entreprise introuvable.' : 'Company not found.');
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    getCompanyModuleSettings(companyId)
      .then((result) => {
        if (isCurrent) {
          setModules(result.modules);
          setCanManage(result.canManage);
          savedSelectionRef.current = getModuleSelectionKey(result.modules);
          setError('');
        }
      })
      .catch((loadError) => {
        if (isCurrent) {
          setError(loadError?.response?.data?.error || loadError?.message || 'Unable to load modules.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [companyId, isFrench]);

  const toggleModule = (key, enabled) => {
    setModules((current) => current.map((module) => (
      module.key === key ? { ...module, enabled } : module
    )));
  };

  const saveModules = async () => {
    if (saveLockRef.current || !canManage || !hasChanges) return;
    saveLockRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      const savedModules = await updateCompanyModules(
        companyId,
        modules.map(({ key, enabled }) => ({ key, enabled }))
      );
      setModules(savedModules);
      savedSelectionRef.current = getModuleSelectionKey(savedModules);
      navigation.goBack();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || 'Unable to save modules.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const hasChanges = getModuleSelectionKey(modules) !== savedSelectionRef.current;
  const canSave = canManage && hasChanges && !isSaving && !isLoading;
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'CompanyHome', params: { companyId } });
  };

  const openModule = (moduleKey) => {
    const screen = MODULE_ROUTES[moduleKey];
    if (!screen || !companyId) return;
    navigation.navigate('MainTabs', {
      screen,
      params: { companyId },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{isFrench ? '‹ Retour' : '‹ Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
          <Text style={styles.title}>{isFrench ? 'Modules métier' : 'Business modules'}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} size="large" style={styles.loader} />
        ) : (
          <View style={styles.moduleList}>
            {modules.map((module) => (
              <View key={module.key} style={styles.moduleRow}>
                <View style={styles.moduleIcon}>
                  <Text style={styles.moduleIconText}>{module.icon}</Text>
                </View>
                <View style={styles.moduleCopy}>
                  <Text style={styles.moduleTitle}>
                    {module.labels?.[activeLanguage] || module.labels?.en || module.key}
                  </Text>
                  <Text style={styles.moduleHint}>
                    {module.mandatory ? `${isFrench ? 'Toujours activé' : 'Always enabled'} · ` : ''}
                    {copy.locations[module.key] || (isFrench ? 'Onglet de l’espace Pro' : 'Pro workspace tab')}
                  </Text>
                </View>
                {module.enabled && MODULE_ROUTES[module.key] ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => openModule(module.key)}
                    style={styles.manageModuleButton}
                  >
                    <Text style={styles.manageModuleText}>{isFrench ? 'Gérer' : 'Manage'} ↗</Text>
                  </TouchableOpacity>
                ) : null}
                <Switch
                  value={module.enabled}
                  onValueChange={(enabled) => toggleModule(module.key, enabled)}
                  disabled={!canManage || module.mandatory || isSaving}
                  trackColor={{ false: '#D6D1CA', true: '#BFA0F3' }}
                  thumbColor={module.enabled ? COLORS.accent : '#FFFFFF'}
                  accessibilityLabel={module.labels?.[activeLanguage] || module.key}
                />
              </View>
            ))}
          </View>
        )}

      </ScrollView>
      <View style={styles.footer}>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={saveModules}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {isSaving
              ? copy.saving
              : !canManage
                ? copy.noPermission
                : hasChanges
                  ? copy.save
                  : copy.noChanges}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 28 },
  header: { paddingVertical: 8, marginBottom: 18 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12, marginBottom: 12 },
  backButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: COLORS.textSoft, fontSize: 11, fontWeight: '800', marginBottom: 8 },
  title: { color: COLORS.text, fontSize: 26, lineHeight: 32, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, marginTop: 6 },
  loader: { marginTop: 60 },
  moduleList: { gap: 10 },
  moduleRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleIconText: { fontSize: 19 },
  moduleCopy: { flex: 1, paddingRight: 8 },
  moduleTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  moduleHint: { color: COLORS.textSoft, fontSize: 12, marginTop: 3 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  manageModuleButton: { alignSelf: 'flex-start', marginTop: 7, paddingVertical: 3, paddingRight: 10 },
  manageModuleText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
});