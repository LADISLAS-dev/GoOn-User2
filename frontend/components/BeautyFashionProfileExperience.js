import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, CalendarDays, Clock3, CreditCard, Heart, ImagePlus, MapPin, Pencil, Phone, Plus, Search, SlidersHorizontal, Sparkles, Star, Tags, Trash2, UserRound, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../env';
import { resolveAvatarUri } from '../utils/profileUtils';

const ACCENT = '#F47732';
const INK = '#211D1B';
const MUTED = '#857D78';
const LINE = '#EFE5DE';

function displayPrice(service, isFrench) {
  const price = Number(service?.price);
  if (!Number.isFinite(price) || price <= 0) return isFrench ? 'Sur demande' : 'Price on request';
  return isFrench ? `${price.toLocaleString('fr-FR')} $` : `$${price.toFixed(2)}`;
}

function getServiceImages(service) {
  const images = Array.isArray(service?.images) ? service.images : [];
  return [...new Set([...images, service?.image].map((image) => String(image || '').trim()).filter(Boolean))];
}

function serviceKey(service, index = 0) {
  return String(service?._id || service?.id || service?.name || `service-${index}`);
}

export const DEFAULT_BEAUTY_SERVICE_CATEGORIES = [
  { id: 'hair', fr: 'Coiffure', en: 'Hairdressing', terms: ['hair', 'coiff', 'coupe', 'barber', 'brushing', 'salon'] },
  { id: 'color', fr: 'Coloration', en: 'Hair Color', terms: ['color', 'balayage', 'm[eè]che', 'highlight'] },
  { id: 'care', fr: 'Soins', en: 'Oil Treatment', terms: ['soin', 'care', 'facial', 'visage', 'massage'] },
  { id: 'nails', fr: 'Ongles', en: 'Nails', terms: ['ongle', 'nail', 'manucure', 'pedicure', 'pédicure'] },
  { id: 'makeup', fr: 'Maquillage', en: 'Makeup', terms: ['maquillage', 'makeup', 'make-up'] },
];

function getBeautyServiceCategories(company) {
  const stored = Array.isArray(company?.beautyServiceCategories) && company.beautyServiceCategories.length
    ? company.beautyServiceCategories
    : DEFAULT_BEAUTY_SERVICE_CATEGORIES;
  return stored.map((category) => {
    const defaults = DEFAULT_BEAUTY_SERVICE_CATEGORIES.find((item) => item.id === category.id);
    return { ...defaults, ...category, terms: defaults?.terms || [] };
  });
}

function BeautyFashionUserHome({ company, services, isFrench, user, onBookService, onOpenNotifications }) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('hair');
  const [sortByPrice, setSortByPrice] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceImageIndex, setSelectedServiceImageIndex] = useState(0);
  const [savedIds, setSavedIds] = useState([]);
  const [loadedSavedKey, setLoadedSavedKey] = useState('');
  const savedKey = `goon.beauty.services.saved.${company?._id || company?.id || 'company'}.${user?._id || user?.firebaseUid || 'guest'}`;
  const cardWidth = Math.max(92, Math.floor((width - 47) / 2));
  const categories = useMemo(() => [
    ...getBeautyServiceCategories(company).map((category) => ({
      ...category,
      label: isFrench ? (category.fr || category.en) : (category.en || category.fr),
    })),
    { id: 'all', fr: 'Tout', en: 'All', label: isFrench ? 'Tout' : 'All', terms: [] },
  ], [company?.beautyServiceCategories, isFrench]);
  const copy = isFrench
    ? {
        greeting: 'Bonjour !', search: 'Rechercher une prestation', welcome: 'Bienvenue chez', book: 'Réserver',
        category: 'Catégorie', services: 'Prestations', seeAll: 'Voir tout',
        saved: 'Favoris', nearby: 'À la une', noServices: 'Aucune prestation disponible pour le moment.',
      }
    : {
        greeting: 'Good morning!', search: 'Search service, specialist', welcome: 'Welcome to', book: 'Book Now',
        category: 'Category', services: 'Services', seeAll: 'See All',
        saved: 'Saved', nearby: 'Featured', noServices: 'No services available yet.',
      };
  const cover = company?.carouselImages?.[0] || company?.backgroundImage || services.find((service) => service?.image)?.image || '';
  const avatar = user?.avatar ? resolveAvatarUri(user.avatar, API_URL) : company?.logo ? resolveAvatarUri(company.logo, API_URL) : '';
  const userName = String(user?.name || user?.displayName || '').trim().split(/\s+/)[0] || company?.name || (isFrench ? 'Bienvenue' : 'Welcome');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(savedKey)
      .then((stored) => {
        if (!active) return;
        const parsed = JSON.parse(stored || '[]');
        setSavedIds(Array.isArray(parsed) ? parsed.map(String) : []);
      })
      .catch(() => { if (active) setSavedIds([]); })
      .finally(() => { if (active) setLoadedSavedKey(savedKey); });
    return () => { active = false; };
  }, [savedKey]);

  useEffect(() => {
    if (loadedSavedKey === savedKey) AsyncStorage.setItem(savedKey, JSON.stringify(savedIds)).catch(() => {});
  }, [savedIds, savedKey, loadedSavedKey]);

  const matchingServices = useMemo(() => {
    const filter = categories.find((item) => item.id === selectedCategory);
    const hasExplicitCategories = services.some((service) => String(service?.categoryId || '').trim());
    let rows = services.filter((service) => {
      const text = `${service?.name || ''} ${service?.description || ''} ${service?.category || ''} ${service?.type || ''}`.toLocaleLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLocaleLowerCase());
      const serviceCategoryId = String(service?.categoryId || '').trim();
      const matchesCategory = selectedCategory === 'all'
        || (serviceCategoryId
          ? serviceCategoryId === selectedCategory
          : !filter?.terms.length || filter.terms.some((term) => new RegExp(term, 'i').test(text)));
      return matchesQuery && matchesCategory;
    });
    if (showSavedOnly) rows = rows.filter((service, index) => savedIds.includes(serviceKey(service, index)));
    if (sortByPrice) rows = [...rows].sort((a, b) => (Number(a?.price) || Number.MAX_SAFE_INTEGER) - (Number(b?.price) || Number.MAX_SAFE_INTEGER));
    if (selectedCategory !== 'all' && rows.length === 0 && !query.trim() && !showSavedOnly && !hasExplicitCategories) {
      rows = services;
    }
    return rows;
  }, [services, categories, selectedCategory, query, showSavedOnly, savedIds, sortByPrice]);

  const selectedCategoryLabel = categories.find((filter) => filter.id === selectedCategory)?.label || copy.services;
  const selectedServiceImages = getServiceImages(selectedService);
  const selectedServiceImage = selectedServiceImages[selectedServiceImageIndex] || selectedServiceImages[0] || '';

  const openServiceDetails = (service) => {
    setSelectedService(service);
    setSelectedServiceImageIndex(0);
  };

  const requestSelectedService = () => {
    if (!selectedService) return;
    const request = {
      ...selectedService,
      selectedImage: selectedServiceImage,
      selectedImageIndex: selectedServiceImageIndex,
    };
    setSelectedService(null);
    onBookService?.(request);
  };

  const toggleSaved = (service, index) => {
    const id = serviceKey(service, index);
    setSavedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };
  return (
    <SafeAreaView style={homeStyles.safeArea} edges={['bottom']}>
      <ScrollView style={homeStyles.mainContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={homeStyles.content}>
        <View style={homeStyles.topBar}>
          {avatar ? <Image source={{ uri: avatar }} style={homeStyles.avatar} /> : <View style={homeStyles.avatarFallback}><UserRound size={16} color="#857D78" /></View>}
          <View style={homeStyles.greetingWrap}>
            <Text style={homeStyles.greetingLabel}>{copy.greeting}</Text>
            <Text style={homeStyles.greetingName} numberOfLines={1}>{userName}</Text>
          </View>
          <TouchableOpacity style={homeStyles.iconButton} onPress={onOpenNotifications} accessibilityRole="button" accessibilityLabel={isFrench ? 'Notifications' : 'Notifications'}>
            <Bell size={17} color="#211D1B" />
          </TouchableOpacity>
        </View>

        <View style={homeStyles.searchRow}>
          <View style={homeStyles.searchBox}>
            <Search size={15} color="#857D78" />
            <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor="#857D78" style={homeStyles.searchInput} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
          </View>
          <TouchableOpacity style={homeStyles.filterButton} onPress={() => setSortByPrice((current) => !current)} accessibilityRole="button" accessibilityLabel={sortByPrice ? (isFrench ? 'Trier par pertinence' : 'Sort by relevance') : (isFrench ? 'Trier par prix' : 'Sort by price')}>
            <SlidersHorizontal size={17} color="#211D1B" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={homeStyles.hero} activeOpacity={0.92} disabled={!services.length} onPress={() => services[0] && onBookService?.(services[0])}>
            {cover ? <ImageBackground source={{ uri: resolveAvatarUri(cover, API_URL) }} style={homeStyles.heroImage} imageStyle={homeStyles.heroImageStyle}>
              <View style={homeStyles.heroShade} />
              <View style={homeStyles.heroCopy}>
                <Text style={homeStyles.heroTitle}>{copy.welcome} {company?.name || (isFrench ? 'votre salon' : 'your salon')}</Text>
                <Text style={homeStyles.heroSubtitle}>{services.length} {isFrench ? 'prestations disponibles' : 'services available'}</Text>
                <View style={homeStyles.heroCta}><Text style={homeStyles.heroCtaText}>{copy.book}</Text></View>
              </View>
            </ImageBackground> : (
              <View style={homeStyles.heroFallback}>
                <Text style={homeStyles.heroTitle}>{copy.welcome} {company?.name || (isFrench ? 'votre salon' : 'your salon')}</Text>
                <Text style={homeStyles.heroSubtitle}>{services.length} {isFrench ? 'prestations disponibles' : 'services available'}</Text>
                <View style={homeStyles.heroCta}><Text style={homeStyles.heroCtaText}>{copy.book}</Text></View>
              </View>
            )}
        </TouchableOpacity>

        <View style={homeStyles.sectionHeading}>
          <Text style={homeStyles.sectionTitle}>{copy.category}</Text>
          <Text style={homeStyles.sortHint}>{sortByPrice ? (isFrench ? 'Prix' : 'Price') : copy.nearby}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeStyles.filterRow}>
          {categories.map((filter) => (
            <TouchableOpacity key={filter.id} style={[homeStyles.filterChip, selectedCategory === filter.id && homeStyles.filterChipActive]} onPress={() => setSelectedCategory(filter.id)}>
              <Text style={[homeStyles.filterChipText, selectedCategory === filter.id && homeStyles.filterChipTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={homeStyles.sectionHeading}>
          <Text style={homeStyles.sectionTitle}>{showSavedOnly ? copy.saved : selectedCategoryLabel}</Text>
          <View style={homeStyles.sectionActions}>
            <TouchableOpacity onPress={() => { setShowSavedOnly(false); setSelectedCategory('all'); setQuery(''); }}><Text style={homeStyles.seeAll}>{copy.seeAll}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSavedOnly((current) => !current)} accessibilityRole="button" accessibilityLabel={showSavedOnly ? (isFrench ? 'Afficher toutes les prestations' : 'Show all services') : (isFrench ? 'Afficher les favoris' : 'Show favorites')}>
              <Heart size={15} color={showSavedOnly ? ACCENT : MUTED} fill={showSavedOnly ? ACCENT : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
        {matchingServices.length ? (
          <View style={homeStyles.providerRow}>
            {matchingServices.map((service, index) => {
              const serviceId = serviceKey(service, index);
              const saved = savedIds.includes(serviceId);
              const image = getServiceImages(service)[0] || cover;
              return (
                <View key={serviceId} style={[homeStyles.providerCard, { width: cardWidth }]}>
                  <TouchableOpacity style={homeStyles.providerImageWrap} onPress={() => openServiceDetails(service)} activeOpacity={0.9}>
                    {image ? <Image source={{ uri: resolveAvatarUri(image, API_URL) }} style={homeStyles.providerImage} /> : <View style={homeStyles.providerImageFallback}><Sparkles size={22} color="#F47732" /></View>}
                  </TouchableOpacity>
                  <TouchableOpacity style={homeStyles.heartButton} onPress={() => toggleSaved(service, index)} accessibilityRole="button" accessibilityLabel={saved ? (isFrench ? 'Retirer des favoris' : 'Remove saved') : (isFrench ? 'Ajouter aux favoris' : 'Save service')}>
                    <Heart size={13} color={saved ? '#F47732' : '#211D1B'} fill={saved ? '#F47732' : 'transparent'} />
                  </TouchableOpacity>
                  <View style={homeStyles.providerBottomRow}>
                    <TouchableOpacity style={homeStyles.providerInfo} onPress={() => openServiceDetails(service)} activeOpacity={0.85}>
                      <Text style={homeStyles.providerName} numberOfLines={1}>{service?.name}</Text>
                      <Text style={homeStyles.price} numberOfLines={1}>{displayPrice(service, isFrench)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={homeStyles.bookButton} onPress={() => openServiceDetails(service)} accessibilityRole="button" accessibilityLabel={`${copy.book} ${service?.name}`}>
                      <Plus size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={homeStyles.emptyState}><Text style={homeStyles.emptyText}>{copy.noServices}</Text></View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      <Modal visible={Boolean(selectedService)} animationType="slide" transparent onRequestClose={() => setSelectedService(null)}>
        <View style={homeStyles.serviceModalOverlay}>
          <View style={homeStyles.serviceModalSheet}>
            <View style={homeStyles.serviceModalHeader}>
              <View style={homeStyles.serviceModalHeading}>
                <Text style={homeStyles.serviceModalEyebrow}>{isFrench ? 'PRESTATION' : 'SERVICE'}</Text>
                <Text style={homeStyles.serviceModalName} numberOfLines={2}>{selectedService?.name}</Text>
              </View>
              <TouchableOpacity style={homeStyles.serviceModalClose} onPress={() => setSelectedService(null)} accessibilityRole="button" accessibilityLabel={isFrench ? 'Fermer' : 'Close'}>
                <X size={20} color={INK} />
              </TouchableOpacity>
            </View>
            {selectedServiceImage ? <Image source={{ uri: resolveAvatarUri(selectedServiceImage, API_URL) }} style={homeStyles.serviceModalImage} /> : <View style={[homeStyles.serviceModalImage, homeStyles.providerImageFallback]}><Sparkles size={32} color={ACCENT} /></View>}
            {selectedServiceImages.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeStyles.serviceModalThumbs}>
                {selectedServiceImages.map((image, index) => (
                  <TouchableOpacity key={`${image}-${index}`} style={[homeStyles.serviceModalThumb, selectedServiceImageIndex === index && homeStyles.serviceModalThumbSelected]} onPress={() => setSelectedServiceImageIndex(index)} accessibilityRole="button" accessibilityLabel={`${isFrench ? 'Photo' : 'Photo'} ${index + 1}`} accessibilityState={{ selected: selectedServiceImageIndex === index }}>
                    <Image source={{ uri: resolveAvatarUri(image, API_URL) }} style={homeStyles.serviceModalThumbImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            {selectedService?.description ? <Text style={homeStyles.serviceModalDescription}>{selectedService.description}</Text> : null}
            <View style={homeStyles.serviceModalFooter}>
              <Text style={homeStyles.serviceModalPrice}>{displayPrice(selectedService, isFrench)}</Text>
              <TouchableOpacity style={homeStyles.serviceRequestButton} onPress={requestSelectedService} accessibilityRole="button">
                <Text style={homeStyles.serviceRequestText}>{isFrench ? 'Demander cette prestation' : 'Request this service'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

export default function BeautyFashionProfileExperience({
  company,
  services = [],
  onBookService,
  user,
  onOpenNotifications,
  onBack,
  onShare,
  isFrench = true,
  mode = 'user',
  canManage = false,
  onAddService,
  onEditService,
  onDeleteService,
  onEditCover,
  onManagePayments,
  onSaveCategories,
  onAddGalleryImage,
  onEditGalleryImage,
}) {
  const isPro = mode === 'pro';
  const [section, setSection] = useState('booking');
  const [categoryManagerVisible, setCategoryManagerVisible] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const beautyCategories = useMemo(() => getBeautyServiceCategories(company), [company?.beautyServiceCategories]);
  const summary = company?.appreciationSummary;
  const rating = Number(summary?.averageRating);
  const photos = useMemo(() => isPro
    ? [...(Array.isArray(company?.galleryImages) ? company.galleryImages : [])]
    : [...new Set([
        ...(Array.isArray(company?.galleryImages) ? company.galleryImages : []),
        ...(Array.isArray(company?.carouselImages) ? company.carouselImages : []),
        ...services.map((service) => service?.image).filter(Boolean),
      ].filter(Boolean))], [isPro, company?.galleryImages, company?.carouselImages, services]);
  const coverImage = company?.carouselImages?.[0] || company?.backgroundImage || photos[0] || '';

  const openCategoryManager = () => {
    setCategoryDraft(beautyCategories.map(({ id, fr, en }) => ({ id, fr: fr || '', en: en || '' })));
    setCategoryManagerVisible(true);
  };

  const updateCategoryDraft = (id, field, value) => {
    setCategoryDraft((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  };

  const saveCategoryDraft = async () => {
    if (!onSaveCategories || savingCategories) return;
    const normalized = categoryDraft.map((category) => {
      const defaults = DEFAULT_BEAUTY_SERVICE_CATEGORIES.find((item) => item.id === category.id);
      return {
        id: category.id,
        fr: String(category.fr || '').trim() || defaults?.fr || category.id,
        en: String(category.en || '').trim() || defaults?.en || category.id,
      };
    });
    setSavingCategories(true);
    try {
      const saved = await onSaveCategories(normalized);
      if (saved !== false) setCategoryManagerVisible(false);
    } catch (error) {
      Alert.alert(isFrench ? 'Erreur' : 'Error', error?.message || (isFrench ? 'Impossible d’enregistrer les catégories.' : 'Unable to save categories.'));
    } finally {
      setSavingCategories(false);
    }
  };

  const copy = isFrench
    ? {
        booking: 'Prestations', about: 'À propos', reviews: 'Avis', book: 'Réserver',
        services: 'Prestations beauté', emptyServices: 'Aucune prestation disponible pour le moment.',
        description: 'À propos', location: 'Adresse', contact: 'Contact', gallery: 'Galerie photos',
        noDescription: 'Les informations de ce professionnel seront bientôt disponibles.',
        rating: 'Note moyenne', noReviews: 'Aucun avis noté pour le moment.',
        inPerson: 'Rendez-vous en personne', from: 'À partir de',
        addService: 'Ajouter une prestation', edit: 'Modifier', delete: 'Supprimer', managePhotos: 'Ajouter une photo',
      }
    : {
        booking: 'Services', about: 'About', reviews: 'Reviews', book: 'Book',
        services: 'Beauty services', emptyServices: 'No services available yet.',
        description: 'About', location: 'Address', contact: 'Contact', gallery: 'Photo gallery',
        noDescription: 'This professional’s information will be available soon.',
        rating: 'Average rating', noReviews: 'No rated reviews yet.',
        inPerson: 'In-person appointment', from: 'From',
        addService: 'Add service', edit: 'Edit', delete: 'Delete', managePhotos: 'Add photo',
      };

  if (!isPro) {
    return (
      <BeautyFashionUserHome
        company={company}
        services={services}
        isFrench={isFrench}
        user={user}
        onBookService={onBookService}
        onOpenNotifications={onOpenNotifications}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.cover}>
        {coverImage ? (
          <ImageBackground source={{ uri: resolveAvatarUri(coverImage, API_URL) }} style={styles.coverImage} imageStyle={styles.coverImageStyle}>
            <View style={styles.coverShade} />
          </ImageBackground>
        ) : (
          <View style={styles.coverFallback}><Sparkles size={32} color="#FFFFFF" /></View>
        )}
        {isPro && canManage ? (
          <TouchableOpacity style={styles.coverEditButton} onPress={onEditCover} accessibilityRole="button" accessibilityLabel={isFrench ? 'Modifier la couverture' : 'Edit cover image'}>
            <ImagePlus size={16} color="#FFFFFF" />
            <Text style={styles.coverEditText}>{isFrench ? 'Modifier la couverture' : 'Edit cover'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {company?.logo ? (
            <Image source={{ uri: resolveAvatarUri(company.logo, API_URL) }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}><Sparkles size={24} color={ACCENT} /></View>
          )}
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.companyName} numberOfLines={2}>{company?.name}</Text>
          <Text style={styles.categoryLabel}>{isFrench ? 'BEAUTÉ & MODE' : 'BEAUTY & FASHION'}</Text>
          {Number.isFinite(rating) && rating > 0 ? (
            <View style={styles.ratingRow}>
              <Star size={14} color={ACCENT} fill={ACCENT} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>{copy.rating}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          ['booking', copy.booking],
          ['about', copy.about],
          ['reviews', copy.reviews],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, section === key && styles.tabActive]} onPress={() => setSection(key)} accessibilityRole="button" accessibilityState={{ selected: section === key }}>
            <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isPro && canManage ? (
        <TouchableOpacity style={styles.paymentSettingsButton} onPress={onManagePayments} accessibilityRole="button">
          <CreditCard size={18} color="#FFFFFF" />
          <Text style={styles.paymentSettingsText}>{isFrench ? 'Paramétrer les paiements' : 'Set up payments'}</Text>
        </TouchableOpacity>
      ) : null}

      {section === 'booking' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.services}</Text>
            {isPro && canManage ? (
              <View style={styles.proServiceActions}>
                <TouchableOpacity style={styles.categoryManageAction} onPress={openCategoryManager} accessibilityRole="button" accessibilityLabel={isFrench ? 'Gérer les catégories' : 'Manage categories'}>
                  <Tags size={15} color={ACCENT} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageAction} onPress={onAddService} accessibilityRole="button">
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.manageActionText}>{copy.addService}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {services.length ? services.map((service, index) => (
            <View key={String(service?._id || `${service?.name || 'service'}-${index}`)} style={styles.serviceCard}>
              {service?.image ? (
                <Image source={{ uri: resolveAvatarUri(service.image, API_URL) }} style={styles.serviceImage} />
              ) : (
                <View style={styles.serviceImageFallback}><Sparkles size={22} color={ACCENT} /></View>
              )}
              <View style={styles.serviceCopy}>
                <Text style={styles.serviceName} numberOfLines={2}>{service?.name}</Text>
                {isPro && service?.categoryId ? (
                  <Text style={styles.serviceCategoryBadge} numberOfLines={1}>
                    {(beautyCategories.find((category) => category.id === service.categoryId)?.[isFrench ? 'fr' : 'en']) || service.categoryId}
                  </Text>
                ) : null}
                {service?.description ? <Text style={styles.serviceDescription} numberOfLines={2}>{service.description}</Text> : null}
                <Text style={styles.servicePrice}>{copy.from} {displayPrice(service, isFrench)}</Text>
                <View style={styles.appointmentType}><Clock3 size={12} color={MUTED} /><Text style={styles.appointmentTypeText}>{copy.inPerson}</Text></View>
              </View>
              {isPro && canManage ? (
                <View style={styles.serviceManageActions}>
                  <TouchableOpacity style={styles.manageIconButton} onPress={() => onEditService(service)} accessibilityRole="button" accessibilityLabel={copy.edit}>
                    <Pencil size={14} color={INK} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manageIconButton} onPress={() => onDeleteService(service._id)} accessibilityRole="button" accessibilityLabel={copy.delete}>
                    <Trash2 size={14} color={ACCENT} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.bookButton} onPress={() => onBookService(service)} accessibilityRole="button">
                  <CalendarDays size={15} color="#FFFFFF" />
                  <Text style={styles.bookButtonText}>{copy.book}</Text>
                </TouchableOpacity>
              )}
            </View>
          )) : (
            <View style={styles.emptyState}><Text style={styles.emptyText}>{copy.emptyServices}</Text></View>
          )}
        </View>
      ) : null}

      {section === 'about' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.description}</Text>
          <Text style={styles.aboutText}>{company?.description || copy.noDescription}</Text>
          {company?.location || company?.address || company?.city ? (
            <View style={styles.infoRow}><MapPin size={16} color={ACCENT} /><Text style={styles.infoText}>{company.location || company.address || company.city}</Text></View>
          ) : null}
          {company?.phone || company?.email ? (
            <>
              <Text style={styles.sectionTitle}>{copy.contact}</Text>
              {company?.phone ? <View style={styles.infoRow}><Phone size={16} color={ACCENT} /><Text style={styles.infoText}>{company.phone}</Text></View> : null}
              {company?.email ? <Text style={styles.infoText}>{company.email}</Text> : null}
            </>
          ) : null}
          {photos.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{copy.gallery}</Text>
                {isPro && canManage ? (
                  <TouchableOpacity style={styles.manageAction} onPress={onAddGalleryImage} accessibilityRole="button">
                    <ImagePlus size={14} color="#FFFFFF" />
                    <Text style={styles.manageActionText}>{copy.managePhotos}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.gallery}>
                {photos.slice(0, 6).map((photo, index) => (
                  <TouchableOpacity key={`${photo}-${index}`} disabled={!isPro || !canManage} onPress={() => onEditGalleryImage(index)}>
                    <Image source={{ uri: resolveAvatarUri(photo, API_URL) }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
          {isPro && canManage && !photos.length ? (
            <TouchableOpacity style={styles.manageAction} onPress={onAddGalleryImage} accessibilityRole="button">
              <ImagePlus size={14} color="#FFFFFF" />
              <Text style={styles.manageActionText}>{copy.managePhotos}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {section === 'reviews' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.reviews}</Text>
          {Number.isFinite(rating) && rating > 0 ? (
            <View style={styles.reviewSummary}>
              <Star size={22} color={ACCENT} fill={ACCENT} />
              <Text style={styles.reviewScore}>{rating.toFixed(1)}</Text>
              <Text style={styles.aboutText}>{copy.rating}</Text>
            </View>
          ) : <Text style={styles.aboutText}>{copy.noReviews}</Text>}
        </View>
      ) : null}

      <Modal visible={categoryManagerVisible} animationType="slide" transparent onRequestClose={() => setCategoryManagerVisible(false)}>
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModalSheet}>
            <Text style={styles.categoryModalTitle}>{isFrench ? 'Gérer les catégories' : 'Manage categories'}</Text>
            <Text style={styles.categoryModalHint}>{isFrench ? 'Renomme les catégories qui servent à classer tes prestations.' : 'Rename the categories used to organize your services.'}</Text>
            <ScrollView style={styles.categoryEditorList} keyboardShouldPersistTaps="handled">
              {categoryDraft.map((category) => (
                <View key={category.id} style={styles.categoryEditorRow}>
                  <Text style={styles.categoryEditorKey}>{beautyCategories.find((item) => item.id === category.id)?.[isFrench ? 'fr' : 'en'] || category.id}</Text>
                  <View style={styles.categoryEditorInputs}>
                    <TextInput value={category.fr} onChangeText={(value) => updateCategoryDraft(category.id, 'fr', value)} placeholder="Français" placeholderTextColor="#8A817C" style={styles.categoryEditorInput} maxLength={36} />
                    <TextInput value={category.en} onChangeText={(value) => updateCategoryDraft(category.id, 'en', value)} placeholder="English" placeholderTextColor="#8A817C" style={styles.categoryEditorInput} maxLength={36} />
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.categorySaveButton, savingCategories && { opacity: 0.6 }]} onPress={saveCategoryDraft} disabled={savingCategories} accessibilityRole="button">
              <Text style={styles.categorySaveText}>{savingCategories ? '…' : (isFrench ? 'Enregistrer' : 'Save categories')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryCancelButton} onPress={() => setCategoryManagerVisible(false)} accessibilityRole="button">
              <Text style={styles.categoryCancelText}>{isFrench ? 'Annuler' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  cover: { height: 190, marginHorizontal: -16, marginTop: -16, overflow: 'hidden', backgroundColor: '#B97B5C' },
  coverImage: { flex: 1, justifyContent: 'flex-end' },
  coverImageStyle: { resizeMode: 'cover' },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25,17,14,0.12)' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B97B5C' },
  coverEditButton: { position: 'absolute', right: 12, bottom: 12, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(24,18,16,0.78)' },
  coverEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 10, marginTop: -26, borderRadius: 16, backgroundColor: '#FFFFFF', zIndex: 1 },
  avatarWrap: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E6' },
  profileCopy: { flex: 1 },
  companyName: { color: INK, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  categoryLabel: { color: ACCENT, fontSize: 9, fontWeight: '800', marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingValue: { color: INK, fontSize: 12, fontWeight: '800' },
  ratingLabel: { color: MUTED, fontSize: 10 },
  tabs: { flexDirection: 'row', marginTop: 15, padding: 4, borderRadius: 12, backgroundColor: '#EFE8E3' },
  paymentSettingsButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#7C3AED' },
  paymentSettingsText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: MUTED, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: ACCENT },
  section: { paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  proServiceActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryManageAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF0E6' },
  sectionTitle: { color: INK, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  manageAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: ACCENT },
  manageActionText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 9, borderRadius: 13, backgroundColor: '#FFFFFF' },
  serviceImage: { width: 72, height: 84, borderRadius: 10, backgroundColor: '#F6E5DA' },
  serviceImageFallback: { width: 72, height: 84, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF0E6' },
  serviceCopy: { flex: 1 },
  serviceName: { color: INK, fontSize: 12, fontWeight: '800' },
  serviceCategoryBadge: { color: ACCENT, fontSize: 10, fontWeight: '800', marginTop: 3 },
  serviceDescription: { color: MUTED, fontSize: 10, lineHeight: 14, marginTop: 3 },
  servicePrice: { color: ACCENT, fontSize: 11, fontWeight: '800', marginTop: 5 },
  appointmentType: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  appointmentTypeText: { color: MUTED, fontSize: 9 },
  bookButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 18, backgroundColor: ACCENT },
  bookButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  serviceManageActions: { gap: 6 },
  manageIconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFF0E6' },
  emptyState: { padding: 18, borderRadius: 12, backgroundColor: '#FFFFFF' },
  emptyText: { color: MUTED, fontSize: 12, textAlign: 'center' },
  aboutText: { color: MUTED, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  infoText: { color: INK, fontSize: 12, flexShrink: 1 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryImage: { width: '31.5%', aspectRatio: 1, borderRadius: 9, backgroundColor: '#F6E5DA' },
  reviewSummary: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF' },
  reviewScore: { color: INK, fontSize: 24, fontWeight: '800' },
  categoryModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  categoryModalSheet: { maxHeight: '85%', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFF9F4' },
  categoryModalTitle: { color: INK, fontSize: 20, fontWeight: '800' },
  categoryModalHint: { color: MUTED, fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  categoryEditorList: { flexGrow: 0 },
  categoryEditorRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: LINE },
  categoryEditorKey: { color: INK, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  categoryEditorInputs: { flexDirection: 'row', gap: 8 },
  categoryEditorInput: { flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#FFFFFF', color: INK, fontSize: 13 },
  categorySaveButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, borderRadius: 12, backgroundColor: ACCENT },
  categorySaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  categoryCancelButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  categoryCancelText: { color: MUTED, fontSize: 13, fontWeight: '700' },
});

const homeStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F1EC' },
  mainContent: { flex: 1, backgroundColor: '#F7F1EC' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3D9CB' },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  greetingWrap: { flex: 1 },
  greetingLabel: { color: MUTED, fontSize: 12 },
  greetingName: { color: INK, fontSize: 16, fontWeight: '800', marginTop: 2 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  searchBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 24, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, color: INK, fontSize: 14, paddingVertical: 8 },
  filterButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  hero: { width: '100%', aspectRatio: 1.85, marginTop: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: '#503D35' },
  heroImage: { flex: 1, justifyContent: 'flex-end' },
  heroImageStyle: { resizeMode: 'cover' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25,17,14,0.42)' },
  heroCopy: { flex: 1, justifyContent: 'space-between', padding: 16, alignItems: 'flex-start' },
  heroFallback: { flex: 1, justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, backgroundColor: '#704B3A' },
  heroTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 28, fontWeight: '800', maxWidth: '80%' },
  heroSubtitle: { color: '#FFF5EF', fontSize: 13, marginTop: 4, maxWidth: '80%' },
  heroCta: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 20, backgroundColor: ACCENT, marginTop: 8 },
  heroCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { color: INK, fontSize: 18, fontWeight: '800' },
  sortHint: { color: MUTED, fontSize: 12 },
  seeAll: { color: MUTED, fontSize: 12 },
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FFFFFF' },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  providerRow: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingBottom: 4 },
  providerCard: { position: 'relative', overflow: 'hidden', padding: 6, marginTop: 2, borderRadius: 10, backgroundColor: '#FFFFFF' },
  providerImageWrap: { width: '100%', aspectRatio: 1.25, borderRadius: 8, overflow: 'hidden' },
  providerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  providerImageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3D9CB' },
  heartButton: { position: 'absolute', top: 10, right: 10, zIndex: 2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  providerBottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { color: INK, fontSize: 14, fontWeight: '800' },
  price: { color: INK, fontSize: 14, fontWeight: '800', marginTop: 4 },
  bookButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: ACCENT, marginBottom: 2 },
  emptyState: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center' },
  serviceModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  serviceModalSheet: { maxHeight: '90%', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFF9F4' },
  serviceModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  serviceModalHeading: { flex: 1 },
  serviceModalEyebrow: { color: ACCENT, fontSize: 11, fontWeight: '800' },
  serviceModalName: { color: INK, fontSize: 20, fontWeight: '800', marginTop: 3 },
  serviceModalClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#EFE8E3' },
  serviceModalImage: { width: '100%', aspectRatio: 1.2, borderRadius: 14, backgroundColor: '#F3D9CB', resizeMode: 'cover' },
  serviceModalThumbs: { gap: 8, paddingVertical: 10 },
  serviceModalThumb: { width: 64, height: 64, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', borderRadius: 10 },
  serviceModalThumbSelected: { borderColor: ACCENT },
  serviceModalThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  serviceModalDescription: { color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 8 },
  serviceModalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16 },
  serviceModalPrice: { color: INK, fontSize: 17, fontWeight: '800' },
  serviceRequestButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: ACCENT },
  serviceRequestText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});