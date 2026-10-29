import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpRight, CalendarDays, CreditCard, ImagePlus, Pencil, Plus, Scissors, Sparkles, Store, Tags, Trash2, X } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { getAppointmentsByCompany, getCompanyById } from '../services/api';
import api from '../services/api';
import { useLazyImagePicker } from '../hooks/useLazyImagePicker';
import { DEFAULT_BEAUTY_SERVICE_CATEGORIES } from '../components/BeautyFashionProfileExperience';

const COLORS = {
  background: '#0D0B12', surface: '#17141E', surfaceRaised: '#211B2B', border: '#30283B',
  text: '#F6F2FA', muted: '#A9A1B3', violet: '#8B5CF6', violetLight: '#C4B5FD',
  accent: '#F47732', green: '#53D69A', amber: '#F5BD62',
  red: '#F87171',
};

function Metric({ label, value, detail, accent = COLORS.violetLight }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function formatBookingDate(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ProBeautyDashboardScreen({ companyId, moduleConfigs = [], navigation }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const [company, setCompany] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managerMode, setManagerMode] = useState('');
  const [saving, setSaving] = useState(false);
  const [companyDraft, setCompanyDraft] = useState({ name: '', description: '', location: '', phone: '', website: '' });
  const [categoryDraft, setCategoryDraft] = useState([]);
  const [serviceDraft, setServiceDraft] = useState({ name: '', price: '', description: '', categoryId: '' });
  const [editingServiceId, setEditingServiceId] = useState('');
  const imagePicker = useLazyImagePicker();

  const copy = isFrench
    ? {
        eyebrow: 'ESPACE BEAUTÉ & MODE', greeting: 'Votre activité, en un coup d’œil.', today: 'AUJOURD’HUI',
        bookings: 'Rendez-vous du jour', bookingsDetail: 'Prestations planifiées aujourd’hui',
        pending: 'Demandes à traiter', pendingDetail: 'En attente de votre réponse',
        services: 'Prestations actives', servicesDetail: 'Dans votre vitrine', operations: 'Opérations',
        recent: 'Rendez-vous récents', none: 'Aucun rendez-vous récent.', open: 'Ouvrir',
        setup: 'Terminez votre vitrine beauté', setupDetail: 'Ajoutez vos photos et vos prestations pour accueillir vos clients.',
        storefront: 'Voir ma vitrine', description: 'Mettez en valeur vos prestations.',
        servicesAction: 'Gérer mes prestations', categoriesAction: 'Gérer les catégories', textAction: 'Modifier les textes',
        coverAction: 'Modifier la couverture', galleryAction: 'Ajouter une photo', agendaAction: 'Demandes et rendez-vous', invoicesAction: 'Factures', ordersAction: 'Commandes de produits', paymentsAction: 'Paramétrer les paiements',
        todayEmpty: 'Pas de rendez-vous aujourd’hui', pendingStatus: 'En attente', confirmedStatus: 'Confirmé',
        close: 'Fermer', add: 'Ajouter', save: 'Enregistrer', cancel: 'Annuler', edit: 'Modifier', delete: 'Supprimer',
        name: 'Nom de la prestation', price: 'Prix (0 si sur devis)', descriptionLabel: 'Description', category: 'Catégorie',
        categoryFr: 'Nom français', categoryEn: 'Nom anglais', companyName: 'Nom de l’entreprise', companyDescription: 'Description de la vitrine',
        location: 'Adresse', phone: 'Téléphone', website: 'Site web', noServices: 'Aucune prestation. Ajoute la première ici.',
      }
    : {
        eyebrow: 'BEAUTY & FASHION WORKSPACE', greeting: 'Your business, at a glance.', today: 'TODAY',
        bookings: 'Today’s appointments', bookingsDetail: 'Services scheduled today',
        pending: 'Requests to review', pendingDetail: 'Waiting for your response',
        services: 'Active services', servicesDetail: 'In your storefront', operations: 'Operations',
        recent: 'Recent appointments', none: 'No recent appointments.', open: 'Open',
        setup: 'Finish your beauty storefront', setupDetail: 'Add photos and services to welcome your clients.',
        storefront: 'View storefront', description: 'Showcase your services.',
        servicesAction: 'Manage services', categoriesAction: 'Manage categories', textAction: 'Edit storefront text',
        coverAction: 'Change cover', galleryAction: 'Add a photo', agendaAction: 'Requests and appointments', invoicesAction: 'Invoices', ordersAction: 'Product orders', paymentsAction: 'Set up payments',
        todayEmpty: 'No appointments today', pendingStatus: 'Pending', confirmedStatus: 'Confirmed',
        close: 'Close', add: 'Add', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
        name: 'Service name', price: 'Price (0 for quote)', descriptionLabel: 'Description', category: 'Category',
        categoryFr: 'French name', categoryEn: 'English name', companyName: 'Company name', companyDescription: 'Storefront description',
        location: 'Address', phone: 'Phone', website: 'Website', noServices: 'No services yet. Add the first one here.',
      };

  const loadDashboard = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [companyResult, appointmentResult] = await Promise.allSettled([
      getCompanyById(companyId),
      getAppointmentsByCompany(companyId),
    ]);
    setCompany(companyResult.status === 'fulfilled' ? companyResult.value : null);
    setAppointments(appointmentResult.status === 'fulfilled' && Array.isArray(appointmentResult.value)
      ? [...appointmentResult.value].sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0))
      : []);
    setIsLoading(false);
  }, [companyId]);

  const openManager = (mode) => {
    setManagerMode(mode);
    if (mode === 'company') {
      setCompanyDraft({
        name: company?.name || '',
        description: company?.description || '',
        location: company?.location || '',
        phone: company?.phone || '',
        website: company?.website || '',
      });
    }
    if (mode === 'categories') {
      const categories = Array.isArray(company?.beautyServiceCategories) && company.beautyServiceCategories.length
        ? company.beautyServiceCategories
        : DEFAULT_BEAUTY_SERVICE_CATEGORIES;
      setCategoryDraft(categories.map(({ id, fr, en }) => ({ id, fr: fr || '', en: en || '' })));
    }
  };

  const saveCompanyDraft = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(companyDraft).map(([key, value]) => [key, String(value || '').trim()]));
      const response = await api.patch(`/companies/${companyId}`, payload);
      setCompany((current) => ({ ...current, ...payload, ...(response.data?.data || {}) }));
      setManagerMode('');
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.response?.data?.error || (isFrench ? 'Impossible d’enregistrer la vitrine.' : 'Unable to save storefront details.'));
    } finally {
      setSaving(false);
    }
  };

  const saveCategoryDraft = async () => {
    const categories = categoryDraft.map((category) => ({
      id: String(category.id || '').trim(),
      fr: String(category.fr || '').trim(),
      en: String(category.en || '').trim(),
    }));
    if (!categories.length || categories.some((category) => !category.id || !category.fr || !category.en)) {
      Alert.alert(isFrench ? 'Catégorie incomplète' : 'Incomplete category', isFrench ? 'Chaque catégorie doit avoir un nom français et anglais.' : 'Each category needs a French and English name.');
      return;
    }
    const removedIds = new Set(companyCategories.map((category) => category.id).filter((id) => !categories.some((category) => category.id === id)));
    const usedRemovedCategory = (company?.services || []).some((service) => removedIds.has(service.categoryId));
    if (usedRemovedCategory) {
      Alert.alert(isFrench ? 'Catégorie utilisée' : 'Category in use', isFrench ? 'Réassigne les prestations avant de supprimer une catégorie.' : 'Reassign services before removing a category.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/companies/${companyId}`, { beautyServiceCategories: categories });
      setCompany((current) => ({ ...current, beautyServiceCategories: categories }));
      setManagerMode('');
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.response?.data?.error || (isFrench ? 'Impossible d’enregistrer les catégories.' : 'Unable to save categories.'));
    } finally {
      setSaving(false);
    }
  };

  const startAddService = () => {
    const categories = Array.isArray(company?.beautyServiceCategories) && company.beautyServiceCategories.length
      ? company.beautyServiceCategories
      : DEFAULT_BEAUTY_SERVICE_CATEGORIES;
    setEditingServiceId('');
    setServiceDraft({ name: '', price: '', description: '', categoryId: categories[0]?.id || '', images: [] });
    setManagerMode('service-form');
  };

  const startEditService = (service) => {
    const categories = Array.isArray(company?.beautyServiceCategories) && company.beautyServiceCategories.length
      ? company.beautyServiceCategories
      : DEFAULT_BEAUTY_SERVICE_CATEGORIES;
    setEditingServiceId(String(service._id));
    setServiceDraft({
      name: service.name || '',
      price: service.price == null ? '' : String(service.price),
      description: service.description || '',
      categoryId: service.categoryId || categories[0]?.id || '',
      images: Array.isArray(service.images) && service.images.length ? service.images : (service.image ? [service.image] : []),
    });
    setManagerMode('service-form');
  };

  const pickServiceImages = async () => {
    try {
      const permission = await imagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(isFrench ? 'Autorisation requise' : 'Permission required', isFrench ? 'Autorise l’accès aux photos pour continuer.' : 'Allow photo access to continue.');
        return;
      }
      const remaining = Math.max(0, 10 - (serviceDraft.images || []).length);
      if (!remaining) {
        Alert.alert(isFrench ? 'Limite atteinte' : 'Limit reached', isFrench ? 'Une prestation peut contenir 10 photos maximum.' : 'A service can contain up to 10 photos.');
        return;
      }
      const result = await imagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
      if (!result.canceled && result.assets?.length) {
        setServiceDraft((current) => ({ ...current, images: [...(current.images || []), ...result.assets].slice(0, 10) }));
      }
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.message || (isFrench ? 'Impossible de choisir les photos.' : 'Unable to select photos.'));
    }
  };

  const removeServiceImage = (index) => {
    setServiceDraft((current) => ({ ...current, images: (current.images || []).filter((_, imageIndex) => imageIndex !== index) }));
  };

  const uploadServiceImages = async (images = []) => Promise.all(images.map(async (asset) => {
    const uri = typeof asset === 'string' ? asset : asset?.uri;
    if (!uri) throw new Error(isFrench ? 'Une photo sélectionnée est invalide.' : 'A selected photo is invalid.');
    if (/^https?:\/\//i.test(uri) || uri.startsWith('/uploads/')) return uri;
    const filename = uri.split('/').pop()?.split('?')[0] || 'service.jpg';
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType = asset?.mimeType || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const blob = asset?.file || await (await fetch(uri)).blob();
      formData.append('image', blob, filename);
    } else {
      formData.append('image', { uri, name: filename, type: mimeType });
    }
    const response = await api.post(`/companies/${companyId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const uploadedUrl = String(response.data?.url || '').trim();
    if (!uploadedUrl) throw new Error(isFrench ? 'Le serveur n’a pas confirmé la sauvegarde de la photo.' : 'The server did not confirm the photo upload.');
    return uploadedUrl;
  }));

  const saveServiceDraft = async () => {
    const name = String(serviceDraft.name || '').trim();
    const price = serviceDraft.price === '' ? 0 : Number(serviceDraft.price);
    if (!name || !Number.isFinite(price) || price < 0 || !serviceDraft.categoryId) {
      Alert.alert(isFrench ? 'Informations invalides' : 'Invalid details', isFrench ? 'Ajoute un nom, un prix valide et une catégorie.' : 'Enter a name, valid price, and category.');
      return;
    }
    setSaving(true);
    try {
      const images = await uploadServiceImages(serviceDraft.images || []);
      const payload = { ...serviceDraft, name, price, description: String(serviceDraft.description || '').trim(), images, image: images[0] || '' };
      if (editingServiceId) {
        const response = await api.patch(`/companies/${companyId}/services/${editingServiceId}`, payload);
        const updatedService = response.data;
        setCompany((current) => ({ ...current, services: (current?.services || []).map((service) => String(service._id) === editingServiceId ? updatedService : service) }));
      } else {
        const response = await api.post(`/companies/${companyId}/services`, payload);
        setCompany((current) => ({ ...current, services: [...(current?.services || []), response.data] }));
      }
      setManagerMode('services');
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.response?.data?.error || (isFrench ? 'Impossible d’enregistrer la prestation.' : 'Unable to save service.'));
    } finally {
      setSaving(false);
    }
  };

  const removeService = (service) => {
    Alert.alert(
      isFrench ? 'Supprimer la prestation ?' : 'Delete service?',
      service.name || '',
      [
        { text: isFrench ? 'Annuler' : 'Cancel', style: 'cancel' },
        { text: isFrench ? 'Supprimer' : 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/companies/${companyId}/services/${service._id}`);
            setCompany((current) => ({ ...current, services: (current?.services || []).filter((item) => String(item._id) !== String(service._id)) }));
          } catch (error) {
            Alert.alert(isFrench ? 'Erreur' : 'Error', error?.response?.data?.error || (isFrench ? 'Impossible de supprimer la prestation.' : 'Unable to delete service.'));
          }
        } },
      ]
    );
  };

  const updateCompanyImage = async (target) => {
    try {
      const permission = await imagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(isFrench ? 'Autorisation requise' : 'Permission required', isFrench ? 'Autorise l’accès aux photos pour continuer.' : 'Allow photo access to continue.');
        return;
      }
      const result = await imagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setSaving(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split('/').pop()?.split('?')[0] || `${target}.jpg`;
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeType = asset.mimeType || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = asset.file || await (await fetch(uri)).blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', { uri, name: filename, type: mimeType });
      }
      const upload = await api.post(`/companies/${companyId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = upload.data?.url;
      if (!imageUrl) throw new Error(isFrench ? 'Image non reçue.' : 'Image upload failed.');
      const field = target === 'cover' ? 'carouselImages' : 'galleryImages';
      const currentImages = Array.isArray(company?.[field]) ? company[field] : [];
      const nextImages = target === 'cover' ? [imageUrl, ...currentImages.slice(1)] : [...currentImages, imageUrl];
      await api.patch(`/companies/${companyId}`, { [field]: nextImages });
      setCompany((current) => ({ ...current, [field]: nextImages }));
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.response?.data?.error || error?.message || (isFrench ? 'Impossible d’enregistrer la photo.' : 'Unable to save image.'));
    } finally {
      setSaving(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadDashboard();
  }, [loadDashboard]));

  const now = new Date();
  const bookingsToday = appointments.filter((appointment) => {
    if (!appointment.date || ['cancelled', 'rejected'].includes(String(appointment.status).toLowerCase())) return false;
    const date = new Date(appointment.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  });
  const pendingCount = appointments.filter((appointment) => String(appointment.status || 'pending').toLowerCase() === 'pending').length;
  const recentAppointments = useMemo(() => [...appointments].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)).slice(0, 4), [appointments]);
  const hasBookingTab = navigation.getParent()?.getState?.()?.routeNames?.includes('Booking');
  const isValidated = Boolean(company?.profileValidatedAt);
  const goToStorefront = () => navigation.navigate('CompanyOverview', { companyId });
  const goToBooking = () => navigation.getParent()?.navigate('Booking', { companyId });
  const goToInvoices = () => navigation.getParent()?.navigate('Invoices', { companyId });
  const goToSalesOrders = () => navigation.getParent()?.navigate('SalesOrders', { companyId });
  const goToPayments = () => navigation.navigate('CompanyPaymentSettings', { companyId });
  const enabledModules = new Set((Array.isArray(moduleConfigs) ? moduleConfigs : []).filter((module) => module.enabled !== false).map((module) => module.key));
  const hasInvoicesModule = enabledModules.has('invoices');
  const hasSalesOrdersModule = enabledModules.has('sales_orders');
  const companyCategories = Array.isArray(company?.beautyServiceCategories) && company.beautyServiceCategories.length
    ? company.beautyServiceCategories
    : DEFAULT_BEAUTY_SERVICE_CATEGORIES;
  const addCategoryDraft = () => {
    setCategoryDraft((current) => [...current, { id: `custom-${Date.now()}`, fr: '', en: '' }]);
  };
  const updateCategoryDraft = (id, field, value) => {
    setCategoryDraft((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  };
  const removeCategoryDraft = (categoryId) => {
    if ((company?.services || []).some((service) => service.categoryId === categoryId)) {
      Alert.alert(isFrench ? 'Catégorie utilisée' : 'Category in use', isFrench ? 'Réassigne les prestations avant de supprimer cette catégorie.' : 'Reassign its services before deleting this category.');
      return;
    }
    setCategoryDraft((current) => current.filter((category) => category.id !== categoryId));
  };
  const statusLabel = (appointment) => String(appointment.status || 'pending').toLowerCase() === 'pending'
    ? copy.pendingStatus
    : copy.confirmedStatus;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadDashboard} tintColor={COLORS.accent} colors={[COLORS.accent]} />}
      >
        <View style={styles.topline}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>G</Text></View>
          <View style={styles.toplineCopy}>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.companyName} numberOfLines={1}>{company?.name || (isFrench ? 'Mon entreprise' : 'My business')}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={goToStorefront} accessibilityRole="button" accessibilityLabel={copy.storefront}>
            <ArrowUpRight size={19} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <View style={styles.heroContent}>
            <Text style={styles.today}>{copy.today} · {now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <Text style={styles.heroTitle}>{copy.greeting}</Text>
            <Text style={styles.heroDescription}>{company?.description || copy.description}</Text>
            <TouchableOpacity style={styles.heroButton} onPress={goToStorefront} accessibilityRole="button">
              <Text style={styles.heroButtonText}>{copy.storefront}</Text>
              <ArrowUpRight size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroTile}><Sparkles size={27} color={COLORS.accent} /></View>
          <Text style={styles.heroWatermark}>BEAUTY</Text>
        </View>

        {!isValidated ? (
          <TouchableOpacity style={styles.setupBanner} onPress={goToStorefront} accessibilityRole="button">
            <View style={styles.setupIcon}><Scissors size={17} color={COLORS.accent} /></View>
            <View style={styles.setupCopy}>
              <Text style={styles.setupTitle}>{copy.setup}</Text>
              <Text style={styles.setupDetail}>{copy.setupDetail}</Text>
            </View>
            <Text style={styles.setupArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{isFrench ? 'Mon activité' : 'Activity'}</Text>
          {isLoading ? <ActivityIndicator size="small" color={COLORS.accent} /> : null}
        </View>
        <View style={styles.metricsRow}>
          <Metric label={copy.bookings} value={bookingsToday.length} detail={copy.bookingsDetail} accent={COLORS.green} />
          <Metric label={copy.pending} value={pendingCount} detail={copy.pendingDetail} accent={COLORS.amber} />
          <Metric label={copy.services} value={company?.services?.length || 0} detail={copy.servicesDetail} accent={COLORS.accent} />
        </View>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{copy.operations}</Text></View>
        <View style={styles.operationsGrid}>
          <TouchableOpacity style={styles.operation} onPress={() => openManager('services')} accessibilityRole="button">
            <View style={styles.operationIcon}><Scissors size={18} color={COLORS.accent} /></View>
            <Text style={styles.operationLabel}>{copy.servicesAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          {hasBookingTab ? (
            <TouchableOpacity style={styles.operation} onPress={goToBooking} accessibilityRole="button">
              <View style={[styles.operationIcon, styles.operationIconGreen]}><CalendarDays size={18} color={COLORS.green} /></View>
              <Text style={styles.operationLabel}>{copy.agendaAction}</Text>
              <ArrowUpRight size={15} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
          {hasInvoicesModule ? (
            <TouchableOpacity style={styles.operation} onPress={goToInvoices} accessibilityRole="button">
              <View style={[styles.operationIcon, styles.operationIconViolet]}><CreditCard size={18} color={COLORS.violetLight} /></View>
              <Text style={styles.operationLabel}>{copy.invoicesAction}</Text>
              <ArrowUpRight size={15} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
          {hasSalesOrdersModule ? (
            <TouchableOpacity style={styles.operation} onPress={goToSalesOrders} accessibilityRole="button">
              <View style={[styles.operationIcon, styles.operationIconAmber]}><Store size={18} color={COLORS.amber} /></View>
              <Text style={styles.operationLabel}>{copy.ordersAction}</Text>
              <ArrowUpRight size={15} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.operation} onPress={goToPayments} accessibilityRole="button">
            <View style={[styles.operationIcon, styles.operationIconViolet]}><CreditCard size={18} color={COLORS.violetLight} /></View>
            <Text style={styles.operationLabel}>{copy.paymentsAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.operation} onPress={() => openManager('categories')} accessibilityRole="button">
            <View style={[styles.operationIcon, styles.operationIconViolet]}><Tags size={18} color={COLORS.violetLight} /></View>
            <Text style={styles.operationLabel}>{copy.categoriesAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.operation} onPress={() => openManager('company')} accessibilityRole="button">
            <View style={[styles.operationIcon, styles.operationIconGreen]}><Pencil size={18} color={COLORS.green} /></View>
            <Text style={styles.operationLabel}>{copy.textAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.operation} onPress={() => updateCompanyImage('cover')} accessibilityRole="button">
            <View style={[styles.operationIcon, styles.operationIconAmber]}><ImagePlus size={18} color={COLORS.amber} /></View>
            <Text style={styles.operationLabel}>{copy.coverAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.operation} onPress={() => updateCompanyImage('gallery')} accessibilityRole="button">
            <View style={styles.operationIcon}><Plus size={18} color={COLORS.accent} /></View>
            <Text style={styles.operationLabel}>{copy.galleryAction}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.operation} onPress={goToStorefront} accessibilityRole="button">
            <View style={[styles.operationIcon, styles.operationIconAmber]}><Store size={18} color={COLORS.amber} /></View>
            <Text style={styles.operationLabel}>{copy.storefront}</Text>
            <ArrowUpRight size={15} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.recent}</Text>
          {hasBookingTab ? <TouchableOpacity onPress={goToBooking} accessibilityRole="button"><Text style={styles.textLink}>{copy.open} ↗</Text></TouchableOpacity> : null}
        </View>
        <View style={styles.appointmentPanel}>
          {!recentAppointments.length ? <Text style={styles.emptyText}>{copy.none}</Text> : recentAppointments.map((appointment, index) => (
            <TouchableOpacity
              key={String(appointment._id || appointment.id || index)}
              style={[styles.appointmentRow, index === recentAppointments.length - 1 && styles.appointmentRowLast]}
              onPress={goToBooking}
              accessibilityRole="button"
              disabled={!hasBookingTab}
            >
              <View style={styles.appointmentIndicator} />
              <View style={styles.appointmentCopy}>
                <Text style={styles.appointmentName} numberOfLines={1}>{appointment.title || appointment.message || (isFrench ? 'Demande de rendez-vous' : 'Appointment request')}</Text>
                <Text style={styles.appointmentDate}>{formatBookingDate(appointment.date || appointment.createdAt, locale)}</Text>
              </View>
              <Text style={styles.appointmentStatus}>{statusLabel(appointment)}</Text>
              {hasBookingTab ? <Text style={styles.appointmentChevron}>›</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footer}>{isFrench ? 'PROPULSÉ PAR GOON' : 'POWERED BY GOON'}</Text>
      </ScrollView>

      <Modal visible={Boolean(managerMode)} animationType="slide" transparent onRequestClose={() => setManagerMode('')}>
        <View style={styles.managerOverlay}>
          <View style={styles.managerSheet}>
            <View style={styles.managerHeader}>
              <View style={styles.managerHeaderCopy}>
                <Text style={styles.managerTitle}>
                  {managerMode === 'services' ? copy.servicesAction
                    : managerMode === 'service-form' ? (editingServiceId ? copy.edit : copy.add)
                      : managerMode === 'categories' ? copy.categoriesAction : copy.textAction}
                </Text>
                <Text style={styles.managerSubtitle}>{company?.name}</Text>
              </View>
              <TouchableOpacity style={styles.managerClose} onPress={() => setManagerMode('')} accessibilityRole="button" accessibilityLabel={copy.close}>
                <X size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.managerScroll} keyboardShouldPersistTaps="handled">
              {managerMode === 'company' ? (
                <View style={styles.managerFields}>
                  <Text style={styles.managerFieldLabel}>{copy.companyName}</Text>
                  <TextInput value={companyDraft.name} onChangeText={(name) => setCompanyDraft((current) => ({ ...current, name }))} style={styles.managerInput} placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.companyDescription}</Text>
                  <TextInput value={companyDraft.description} onChangeText={(description) => setCompanyDraft((current) => ({ ...current, description }))} style={[styles.managerInput, styles.managerTextArea]} multiline textAlignVertical="top" placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.location}</Text>
                  <TextInput value={companyDraft.location} onChangeText={(location) => setCompanyDraft((current) => ({ ...current, location }))} style={styles.managerInput} placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.phone}</Text>
                  <TextInput value={companyDraft.phone} onChangeText={(phone) => setCompanyDraft((current) => ({ ...current, phone }))} style={styles.managerInput} keyboardType="phone-pad" placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.website}</Text>
                  <TextInput value={companyDraft.website} onChangeText={(website) => setCompanyDraft((current) => ({ ...current, website }))} style={styles.managerInput} autoCapitalize="none" keyboardType="url" placeholderTextColor={COLORS.muted} />
                </View>
              ) : null}

              {managerMode === 'categories' ? (
                <View style={styles.managerFields}>
                  {categoryDraft.map((category) => (
                    <View key={category.id} style={styles.categoryEditorCard}>
                      <View style={styles.categoryEditorTitleRow}>
                        <Text style={styles.categoryEditorTitle}>{companyCategories.find((item) => item.id === category.id)?.[isFrench ? 'fr' : 'en'] || category.id}</Text>
                        <TouchableOpacity onPress={() => removeCategoryDraft(category.id)} accessibilityRole="button" accessibilityLabel={copy.delete}>
                          <Trash2 size={16} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                      <TextInput value={category.fr} onChangeText={(value) => updateCategoryDraft(category.id, 'fr', value)} style={styles.managerInput} placeholder={copy.categoryFr} placeholderTextColor={COLORS.muted} maxLength={36} />
                      <TextInput value={category.en} onChangeText={(value) => updateCategoryDraft(category.id, 'en', value)} style={styles.managerInput} placeholder={copy.categoryEn} placeholderTextColor={COLORS.muted} maxLength={36} />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.secondaryButton} onPress={addCategoryDraft} accessibilityRole="button">
                    <Plus size={16} color={COLORS.accent} />
                    <Text style={styles.secondaryButtonText}>{isFrench ? 'Ajouter une catégorie' : 'Add category'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {managerMode === 'services' ? (
                <View style={styles.managerFields}>
                  <TouchableOpacity style={styles.primaryButton} onPress={startAddService} accessibilityRole="button">
                    <Plus size={17} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{isFrench ? 'Ajouter une prestation' : 'Add service'}</Text>
                  </TouchableOpacity>
                  {(company?.services || []).length ? company.services.map((service) => (
                    <View key={String(service._id)} style={styles.serviceEditorCard}>
                      <View style={styles.serviceEditorCopy}>
                        <Text style={styles.serviceEditorName}>{service.name}</Text>
                        <Text style={styles.serviceEditorMeta}>
                          {companyCategories.find((category) => category.id === service.categoryId)?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Sans catégorie' : 'Uncategorized')}
                          {' · '}{Number(service.price) > 0 ? `$${Number(service.price).toFixed(2)}` : (isFrench ? 'Sur devis' : 'On request')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.iconAction} onPress={() => startEditService(service)} accessibilityRole="button" accessibilityLabel={copy.edit}>
                        <Pencil size={15} color={COLORS.violetLight} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconAction} onPress={() => removeService(service)} accessibilityRole="button" accessibilityLabel={copy.delete}>
                        <Trash2 size={15} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  )) : <Text style={styles.managerEmpty}>{copy.noServices}</Text>}
                </View>
              ) : null}

              {managerMode === 'service-form' ? (
                <View style={styles.managerFields}>
                  <Text style={styles.managerFieldLabel}>{copy.name}</Text>
                  <TextInput value={serviceDraft.name} onChangeText={(name) => setServiceDraft((current) => ({ ...current, name }))} style={styles.managerInput} placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.price}</Text>
                  <TextInput value={serviceDraft.price} onChangeText={(price) => setServiceDraft((current) => ({ ...current, price }))} style={styles.managerInput} keyboardType="decimal-pad" placeholderTextColor={COLORS.muted} />
                  <Text style={styles.managerFieldLabel}>{copy.category}</Text>
                  <View style={styles.categoryChoices}>
                    {companyCategories.map((category) => (
                      <TouchableOpacity key={category.id} style={[styles.categoryChip, serviceDraft.categoryId === category.id && styles.categoryChipSelected]} onPress={() => setServiceDraft((current) => ({ ...current, categoryId: category.id }))} accessibilityRole="button" accessibilityState={{ selected: serviceDraft.categoryId === category.id }}>
                        <Text style={[styles.categoryChipText, serviceDraft.categoryId === category.id && styles.categoryChipTextSelected]}>{category[isFrench ? 'fr' : 'en'] || category.id}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.managerFieldLabel}>{isFrench ? 'Photos de la prestation' : 'Service photos'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicePhotoList}>
                    {(serviceDraft.images || []).map((image, index) => {
                      const uri = typeof image === 'string' ? image : image?.uri;
                      return (
                        <View key={`${uri || 'service-image'}-${index}`} style={styles.servicePhotoItem}>
                          {uri ? <Image source={{ uri }} style={styles.servicePhotoPreview} /> : null}
                          <TouchableOpacity style={styles.removeServicePhoto} onPress={() => removeServiceImage(index)} accessibilityRole="button" accessibilityLabel={copy.delete}>
                            <X size={13} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <TouchableOpacity style={styles.addServicePhoto} onPress={pickServiceImages} accessibilityRole="button">
                      <ImagePlus size={20} color={COLORS.accent} />
                      <Text style={styles.addServicePhotoText}>{copy.galleryAction}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <Text style={styles.managerFieldLabel}>{copy.descriptionLabel}</Text>
                  <TextInput value={serviceDraft.description} onChangeText={(description) => setServiceDraft((current) => ({ ...current, description }))} style={[styles.managerInput, styles.managerTextArea]} multiline textAlignVertical="top" placeholderTextColor={COLORS.muted} />
                </View>
              ) : null}
            </ScrollView>

            {['company', 'categories', 'service-form'].includes(managerMode) ? (
              <View style={styles.managerFooter}>
                {managerMode === 'service-form' ? <TouchableOpacity style={styles.secondaryButton} onPress={() => setManagerMode('services')}><Text style={styles.secondaryButtonText}>{copy.cancel}</Text></TouchableOpacity> : null}
                <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={managerMode === 'company' ? saveCompanyDraft : managerMode === 'categories' ? saveCategoryDraft : saveServiceDraft} disabled={saving} accessibilityRole="button">
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{copy.save}</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 32 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  brandMark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: COLORS.accent },
  brandMarkText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  toplineCopy: { flex: 1 },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  companyName: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 3 },
  profileButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  hero: { minHeight: 208, overflow: 'hidden', justifyContent: 'center', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  heroAccent: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, backgroundColor: COLORS.accent },
  heroContent: { zIndex: 1, maxWidth: '78%' },
  today: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { color: COLORS.text, fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 10 },
  heroDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  heroButton: { minHeight: 40, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.accent },
  heroButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  heroTile: { position: 'absolute', right: 18, top: 20, width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: COLORS.surfaceRaised },
  heroWatermark: { position: 'absolute', right: 16, bottom: 4, color: 'rgba(255,255,255,0.035)', fontSize: 34, fontWeight: '900' },
  setupBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(244,119,50,0.35)', backgroundColor: 'rgba(244,119,50,0.09)' },
  setupIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(244,119,50,0.16)' },
  setupCopy: { flex: 1 },
  setupTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  setupDetail: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  setupArrow: { color: COLORS.accent, fontSize: 24 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minHeight: 118, justifyContent: 'space-between', padding: 12, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  metricValue: { fontSize: 24, fontWeight: '900', marginTop: 6 },
  metricDetail: { color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 4 },
  operationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  operation: { width: '48%', minHeight: 112, justifyContent: 'space-between', padding: 12, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  operationIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(244,119,50,0.14)' },
  operationIconGreen: { backgroundColor: 'rgba(83,214,154,0.12)' },
  operationIconViolet: { backgroundColor: 'rgba(196,181,253,0.12)' },
  operationIconAmber: { backgroundColor: 'rgba(245,189,98,0.12)' },
  operationLabel: { color: COLORS.text, flex: 1, fontSize: 12, fontWeight: '700', marginTop: 10 },
  textLink: { color: COLORS.violetLight, fontSize: 12, fontWeight: '700' },
  appointmentPanel: { paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  emptyText: { color: COLORS.muted, fontSize: 13, paddingVertical: 18 },
  appointmentRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  appointmentRowLast: { borderBottomWidth: 0 },
  appointmentIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  appointmentCopy: { flex: 1 },
  appointmentName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  appointmentDate: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  appointmentStatus: { color: COLORS.amber, fontSize: 10, fontWeight: '700' },
  appointmentChevron: { color: COLORS.muted, fontSize: 19 },
  footer: { color: COLORS.muted, fontSize: 9, textAlign: 'center', marginTop: 24, letterSpacing: 0.8 },
  managerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  managerSheet: { maxHeight: '90%', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  managerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  managerHeaderCopy: { flex: 1 },
  managerTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  managerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  managerClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  managerScroll: { flexShrink: 1 },
  managerFields: { gap: 10, paddingBottom: 8 },
  managerFieldLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  managerInput: { minHeight: 46, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 14 },
  managerTextArea: { minHeight: 92, paddingTop: 12 },
  categoryEditorCard: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  categoryEditorTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  categoryEditorTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  serviceEditorCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  serviceEditorCopy: { flex: 1 },
  serviceEditorName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  serviceEditorMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  iconAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.surfaceRaised },
  managerEmpty: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingVertical: 18 },
  categoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  categoryChipSelected: { borderColor: COLORS.accent, backgroundColor: 'rgba(244,119,50,0.16)' },
  categoryChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  categoryChipTextSelected: { color: COLORS.accent },
  servicePhotoList: { gap: 9, paddingVertical: 2 },
  servicePhotoItem: { width: 82, height: 82, position: 'relative', overflow: 'hidden', borderRadius: 11, backgroundColor: COLORS.surfaceRaised },
  servicePhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeServicePhoto: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.72)' },
  addServicePhoto: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.accent, borderRadius: 11, backgroundColor: 'rgba(244,119,50,0.08)' },
  addServicePhotoText: { maxWidth: 68, color: COLORS.accent, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  managerFooter: { flexDirection: 'row', gap: 9, paddingTop: 12 },
  primaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 15, borderRadius: 11, backgroundColor: COLORS.accent },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised },
  secondaryButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
});