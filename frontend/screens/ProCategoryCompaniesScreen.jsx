import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  ImageBackground,
  Animated,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import api, { getAllCompanies, getCompaniesByCategory } from '../services/api';
import { auth } from '../services/firebase';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useLazyImagePicker } from '../hooks/useLazyImagePicker';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import { resolveAvatarUri } from '../utils/profileUtils';
import { API_URL } from '../env';

// 🎯 Haptics helper (graceful fallback)
const triggerHaptic = async (type = 'success') => {
  try {
    if (!Haptics) return;
    switch (type) {
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch (e) {
    // Haptics not available on this device/platform - silently fail
  }
};

const { width, height } = Dimensions.get('window');
const CARD_ITEM_HEIGHT = 251;
const CARD_OVERLAP = 20;
const CARD_STACK_STEP = CARD_ITEM_HEIGHT - CARD_OVERLAP;

// 🎨 Couleurs professionnelles
const colors = {
  primary: '#8B2FC9',
  primaryLight: '#F3E8FF',
  primaryDark: '#6A1FA0',
  white: '#FFFFFF',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
  textPrimary: '#1A1F36',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  accent: '#EC4899',
  error: '#EF4444',
  errorLight: '#FEE2E2',
};

// ✅ Validation utilities
const validateEmail = (email) => {
  if (!email.trim()) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

const validatePhone = (phone) => {
  if (!phone.trim()) return true; // Phone is optional
  return phone.trim().replace(/\D/g, '').length >= 6;
};

const validateUrl = (url) => {
  if (!url.trim()) return true; // URL is optional
  try {
    new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
    return true;
  } catch {
    return false;
  }
};

const getValidationError = (field, value, t) => {
  switch (field) {
    case 'email':
      if (value.trim() && !validateEmail(value)) {
        return t('invalidEmail', 'Email invalide');
      }
      break;
    case 'phone':
      if (value.trim() && !validatePhone(value)) {
        return t('invalidPhone', 'Telephone invalide (minimum 6 chiffres)');
      }
      break;
    case 'website':
      if (value.trim() && !validateUrl(value)) {
        return t('invalidUrl', 'URL invalide');
      }
      break;
  }
  return null;
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCompanyCoordinates = (company) => {
  const latFromLocation = toNumberOrNull(company?.location?.latitude);
  const lonFromLocation = toNumberOrNull(company?.location?.longitude);
  if (latFromLocation !== null && lonFromLocation !== null) {
    return { latitude: latFromLocation, longitude: lonFromLocation };
  }

  const latTopLevel = toNumberOrNull(company?.latitude);
  const lonTopLevel = toNumberOrNull(company?.longitude);
  if (latTopLevel !== null && lonTopLevel !== null) {
    return { latitude: latTopLevel, longitude: lonTopLevel };
  }

  const geoJsonCoords = company?.location?.coordinates;
  if (Array.isArray(geoJsonCoords) && geoJsonCoords.length >= 2) {
    const geoLon = toNumberOrNull(geoJsonCoords[0]);
    const geoLat = toNumberOrNull(geoJsonCoords[1]);
    if (geoLat !== null && geoLon !== null) {
      return { latitude: geoLat, longitude: geoLon };
    }
  }

  return null;
};

const getCompanyAddress = (company) => {
  const normalizeAddress = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const normalized = normalizeAddress(entry);
        if (normalized) return normalized;
      }
      return '';
    }

    if (value && typeof value === 'object') {
      return (
        normalizeAddress(value.address) ||
        normalizeAddress(value.label) ||
        normalizeAddress(value.value) ||
        ''
      );
    }

    return '';
  };

  const fromLocation = normalizeAddress(company?.location);
  if (fromLocation) return fromLocation;

  const fromAddressField = normalizeAddress(company?.location?.address);
  if (fromAddressField) return fromAddressField;

  return 'Localisation indisponible';
};

const getCompanyBackgroundUri = (company) => {
  const candidates = [
    company?.backgroundImage,
    company?.carouselImages?.[0],
    company?.galleryImages?.[0],
    company?.logo,
  ];

  const firstValid = candidates.find((value) => typeof value === 'string' && value.trim());
  return firstValid ? resolveAvatarUri(firstValid, API_URL) : null;
};

const getCompanyOwnerId = (company) => {
  const owner = company?.ownerId;
  if (!owner) return '';
  if (typeof owner === 'object') return String(owner._id || '').trim();
  return String(owner).trim();
};

const getOwnerCompanyStatus = (company) => {
  const hasValidatedMarker = Boolean(company?.profileValidatedAt) || company?.setupStatus === 'ready';
  if (hasValidatedMarker) return 'validated';

  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  const meetsRequiredContent = carouselCount >= 1 && servicesCount >= 2;
  return meetsRequiredContent ? 'validated' : 'draft';
};

const formatCompactCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
};

// Fonction pour calculer la distance
const calculateDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  const miles = km * 0.621371;
  return miles.toFixed(1);
};

/**
 * 🎴 Composant Premium Company Card avec background image
 */
const PremiumCompanyCard = React.memo(function PremiumCompanyCard({
  company,
  distance,
  onPress,
  onEdit,
  onDelete,
  index,
  isLast,
  scrollY,
  currentUser,
}) {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // 🎯 État pour le menu long press
  const [showActionMenu, setShowActionMenu] = React.useState(false);

  const inputRange = [
    (index - 1) * CARD_STACK_STEP,
    index * CARD_STACK_STEP,
    (index + 1) * CARD_STACK_STEP,
  ];

  const scrollScale = scrollY.interpolate({
    inputRange,
    outputRange: [0.96, 1, 0.3],
    extrapolate: 'clamp',
  });

  const scrollOpacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  const scrollTranslateY = scrollY.interpolate({
    inputRange,
    outputRange: [2, 0, -2],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400 + index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 🎯 Gestion du long press
  const isOwner = company.ownerId?._id === currentUser?._id || company.ownerId === currentUser?._id;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, friction: 8, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  };

  const handleLongPress = () => {
    triggerHaptic('heavy');
    setShowActionMenu(true);
  };

  const backgroundUri = getCompanyBackgroundUri(company);

  const initials = company.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ratingValue = company?.appreciationSummary?.averageRating;
  const ratingText =
    typeof ratingValue === 'number' && Number.isFinite(ratingValue)
      ? ratingValue.toFixed(1)
      : '--';
  const reviewsCountText = formatCompactCount(company?.appreciationSummary?.total || 0);
  const locationLabel = String(getCompanyAddress(company) || t('locationUnavailable', 'Localisation indisponible'));
  const companyStatus = getOwnerCompanyStatus(company);
  const companyStatusLabel = companyStatus === 'draft'
    ? t('companyStatusDraft', 'Brouillon')
    : t('companyStatusValidated', 'Validee');

  // 🎯 Animation d'opacité pour les boutons
  // (Animations liées au swipe ont été supprimées - utilise maintenant le long press)

  return (
    <Animated.View
      style={[
        {
          opacity: Animated.multiply(opacityAnim, scrollOpacity),
          transform: [
            { scale: Animated.multiply(scaleAnim, scrollScale) },
            { translateY: scrollTranslateY },
          ],
          marginBottom: isLast ? 0 : -CARD_OVERLAP,
          zIndex: index,
          elevation: index,
        },
      ]}
    >
      {/* Action Menu - Visible on long press */}
      {isOwner && showActionMenu && (
        <Modal
          visible={showActionMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionMenu(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowActionMenu(false)}>
            <View style={styles.actionMenuOverlay}>
              <View style={styles.actionMenu}>
                <View style={styles.actionMenuHeader}>
                  <View style={styles.actionMenuHeaderTextWrap}>
                    <Text style={styles.actionMenuTitle} numberOfLines={1}>{company.name}</Text>
                    <Text style={styles.actionMenuHint}>{t('chooseAction', 'Choisissez une action')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowActionMenu(false)}>
                    <Text style={styles.actionMenuClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.actionMenuItem, styles.actionMenuEdit]}
                  onPress={() => {
                    triggerHaptic('medium');
                    setShowActionMenu(false);
                    if (onEdit) onEdit(company);
                  }}
                >
                  <Text style={styles.actionMenuIcon}>✏️</Text>
                  <Text style={styles.actionMenuText}>{t('edit', 'Modifier')}</Text>
                </TouchableOpacity>
                <View style={styles.actionMenuDivider} />
                <TouchableOpacity
                  style={[styles.actionMenuItem, styles.actionMenuDelete]}
                  onPress={() => {
                    triggerHaptic('medium');
                    setShowActionMenu(false);
                    if (onDelete) onDelete(company);
                  }}
                >
                  <Text style={styles.actionMenuIcon}>🗑️</Text>
                  <Text style={[styles.actionMenuText, styles.actionMenuDeleteText]}>{t('delete', 'Supprimer')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Card Content */}
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(scaleAnim, scrollScale) },
            { translateY: scrollTranslateY },
          ],
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            onPress();
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={styles.cardContainer}
        >
        {/* 🖼️ Background Image avec Overlay */}
        <ImageBackground
          source={backgroundUri ? { uri: backgroundUri } : null}
          style={styles.cardBackground}
          imageStyle={styles.backgroundImage}
        >
          {/* Overlay gradient pour la lisibilité */}
          <View style={styles.overlay} />

          {/* Contenu de la carte */}
          <View style={styles.cardContent}>
            {/* Logo et Infos Principales */}
            <View style={styles.headerRow}>
              <View style={styles.logoContainer}>
                {company.logo ? (
                  <Image
                    source={{ uri: resolveAvatarUri(company.logo, API_URL) }}
                    style={styles.logo}
                  />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.logoInitials}>{initials}</Text>
                  </View>
                )}
              </View>

              {/* Nom et Catégorie */}
              <View style={styles.infoColumn}>
                <Text style={styles.companyName} numberOfLines={2}>
                  {company.name}
                </Text>
                <View
                  style={[
                    styles.ownerStatusBadge,
                    companyStatus === 'draft' ? styles.ownerStatusBadgeDraft : styles.ownerStatusBadgeValidated,
                  ]}
                >
                  <Text
                    style={[
                      styles.ownerStatusBadgeText,
                      companyStatus === 'draft' ? styles.ownerStatusBadgeTextDraft : styles.ownerStatusBadgeTextValidated,
                    ]}
                  >
                    {companyStatusLabel}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryLabel}>
                    {company.description ? company.description.slice(0, 20) + '...' : t('companyFallbackLabel', 'Entreprise')}
                  </Text>
                </View>
              </View>

              <View style={styles.topButtonsRow}>
                <TouchableOpacity 
                  style={styles.ctaTopButton}
                  onPress={() => {
                    const isOwner = company.ownerId?._id === company._ownerId || 
                                   (typeof company.ownerId === 'string' && company._ownerId === company.ownerId);
                    if (isOwner) {
                      // Emit edit event or call edit function
                      // We need to pass this to parent
                    }
                  }}
                >
                  <Text style={styles.ctaText}>{t('viewMore', 'View more')} →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pied de carte - CTA */}
            <View style={styles.footerRow}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statText}>{ratingText}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>👥</Text>
                  <Text style={styles.statText}>{reviewsCountText}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statItem, styles.locationBottomItem]}>
                  <Text style={styles.statIcon}>📍</Text>
                  <Text style={styles.statText} numberOfLines={1}>
                    {locationLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.distanceBottomBadge}>
                <Text style={styles.distanceBottomText}>
                  {distance !== null ? `${distance} mi` : '--'}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

/**
 * 📋 Écran Principal - Category Companies
 */
export default function CategoryCompaniesScreen() {
  const { t, language, activeLanguage } = useLanguage();
  const tr = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const partnersTitleByLanguage = {
    fr: 'Nos partenaires',
    en: 'Our partners',
    es: 'Nuestros socios',
    pt: 'Nossos parceiros',
    zh: '我们的合作伙伴',
    hi: 'हमारे साझेदार',
    ar: 'شركاؤنا',
    bn: 'আমাদের অংশীদার',
    ru: 'Наши партнеры',
    ja: '私たちのパートナー',
    de: 'Unsere Partner',
    id: 'Mitra kami',
    ur: 'ہمارے شراکت دار',
  };
  const partnersTitle = partnersTitleByLanguage[language] || partnersTitleByLanguage.en;
  const { user, isGuest } = useUser();
  const navigation = useNavigation();
  const route = useRoute();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermissionPromptVisible, setLocationPermissionPromptVisible] = useState(false);
  const [companiesWithDistance, setCompaniesWithDistance] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCompanyToEdit, setSelectedCompanyToEdit] = useState(null);
  const [editMode, setEditMode] = useState('view'); // 'view' | 'edit' | 'saving'
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);
  const imagePicker = useLazyImagePicker();

  const showAll = Boolean(route.params?.showAll);
  const categoryId = String(route.params?.categoryId || '').trim();
  const categoryName = route.params?.categoryName || (showAll ? t('allCompanies') : t('categories'));
  const refreshFromHomeAt = Number(route.params?.refreshFromHomeAt || 0);

  // 📍 Obtenir la localisation de l'utilisateur
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Demander la permission si pas encore accordée
          const { status: reqStatus } = await Location.requestForegroundPermissionsAsync();
          if (reqStatus !== 'granted') return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.warn('[Location] Permission denied or error:', error.message);
      }
    })();
  }, []);

  const requestUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // silently skip location
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      console.warn('[Location] Permission denied or error:', error.message);
    } finally {
      setLocationPermissionPromptVisible(false);
    }
  }, [tr]);

  // 🔄 Charger les entreprises
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      // Un invité (sans compte) ne voit aucune entreprise.
      if (isGuest) {
        setCompanies([]);
        setCompaniesWithDistance([]);
        return;
      }
      const res = showAll || !categoryId
        ? await getAllCompanies()
        : await getCompaniesByCategory(categoryId);
      const data = Array.isArray(res?.companies)
        ? res.companies
        : Array.isArray(res?.data)
          ? res.data
          : res || [];
      // Un utilisateur connecté ne voit QUE ses propres entreprises.
      const currentUserId = String(user?._id || '').trim();
      const visibleData = currentUserId
        ? data.filter((company) => getCompanyOwnerId(company) === currentUserId)
        : data;
      // Calculer les distances pour les entreprises visibles
      if (userLocation) {
        const withDistance = await Promise.all(visibleData.map(async (company) => {
          let distance = null;
          let coordinates = getCompanyCoordinates(company);

          if (!coordinates) {
            const address = getCompanyAddress(company);
            if (address) {
              try {
                const geocoded = await Location.geocodeAsync(address);
                if (Array.isArray(geocoded) && geocoded.length > 0) {
                  coordinates = {
                    latitude: geocoded[0].latitude,
                    longitude: geocoded[0].longitude,
                  };
                }
              } catch (_) {
                // Ignore geocoding failures and keep distance as null.
              }
            }
          }

          if (coordinates) {
            distance = calculateDistanceMiles(
              userLocation.latitude,
              userLocation.longitude,
              coordinates.latitude,
              coordinates.longitude
            );
          }
          return { ...company, distance };
        }));
        // Trier par distance (les plus proches d'abord)
        withDistance.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return parseFloat(a.distance) - parseFloat(b.distance);
        });
        setCompaniesWithDistance(withDistance);
        setCompanies(withDistance);
      } else {
        setCompaniesWithDistance(visibleData);
        setCompanies(visibleData);
      }
    } catch (error) {
      console.error('[CategoryCompanies] Load error:', error);
      Alert.alert(tr('error', 'Erreur'), tr('loadCompaniesFailed', 'Impossible de charger les entreprises'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, showAll, user?._id, userLocation, isGuest]);

  const { runRefresh: runCompaniesRefresh } = useSmartRefresh({
    refreshFn: loadCompanies,
    intervalMs: 60000,
    minGapMs: 5000,
    runOnFocus: true,
    runOnAppActive: true,
  });

  useFocusEffect(
    useCallback(() => {
      // Ensure card stack animation starts from a stable state on every screen re-entry.
      scrollY.setValue(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      });
    }, [scrollY])
  );

  useEffect(() => {
    if (!refreshFromHomeAt) return;
    setRefreshing(true);
    runCompaniesRefresh({ force: true });
  }, [refreshFromHomeAt, runCompaniesRefresh]);

  const onRefresh = () => {
    setRefreshing(true);
    runCompaniesRefresh({ force: true });
  };

  // 📝 Ouvrir modal d'édition
  const openEditModal = (company) => {
    if (company.ownerId?._id !== user?._id && company.ownerId !== user?._id) {
      Alert.alert(tr('accessDenied', 'Acces refuse'), tr('editOwnCompaniesOnly', 'Vous ne pouvez modifier que vos entreprises.'));
      return;
    }
    setSelectedCompanyToEdit(company);
    setEditPhone(company.phone || '');
    setEditEmail(company.email || '');
    setEditLocation(company.location || '');
    setEditWebsite(company.website || '');
    setEditDescription(company.description || '');
    setEditLogo(company.logo || '');
    setEditImage(company.backgroundImage || '');
    setEditMode('view');
    setHasChanges(false);
    setEditModalVisible(true);
  };

  // 🔍 Vérifier les changements
  const checkChanges = () => {
    if (!selectedCompanyToEdit) return false;
    const changed =
      editPhone !== (selectedCompanyToEdit.phone || '') ||
      editEmail !== (selectedCompanyToEdit.email || '') ||
      editLocation !== (selectedCompanyToEdit.location || '') ||
      editWebsite !== (selectedCompanyToEdit.website || '') ||
      editDescription !== (selectedCompanyToEdit.description || '') ||
      editLogo !== (selectedCompanyToEdit.logo || '') ||
      editImage !== (selectedCompanyToEdit.backgroundImage || '');
    setHasChanges(changed);
    return changed;
  };

  const pickAndUploadImage = async (target) => {
    if (editMode !== 'edit' || editingSaving || mediaUploading) {
      return;
    }

    try {
      const { status } = await imagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(tr('permissionRequired', 'Permission required'), tr('permissionGalleryEdit', 'Allow gallery access to edit images.'));
        return;
      }

      const pickerResult = await imagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'logo' ? [1, 1] : [16, 9],
        quality: 0.85,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      setMediaUploading(true);
      triggerHaptic('light');

      const asset = pickerResult.assets[0];
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: target === 'logo' ? 'company-logo.jpg' : 'company-background.jpg',
        type: asset.mimeType || 'image/jpeg',
      });

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const uploadRes = await fetch(`${API_URL}/companies/upload-temp`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(errorText || tr('uploadFailed', 'Upload echoue'));
      }

      const uploadData = await uploadRes.json();
      if (!uploadData?.url) {
        throw new Error(tr('uploadNoUrl', 'Aucune URL retournee apres upload'));
      }

      if (target === 'logo') {
        handleFieldChange(setEditLogo, uploadData.url);
      } else {
        handleFieldChange(setEditImage, uploadData.url);
      }

      triggerHaptic('success');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert(tr('error', 'Error'), error?.message || tr('imageFromDeviceFailed', 'Unable to load the image from the device.'));
    } finally {
      setMediaUploading(false);
    }
  };

  // 📝 Gérer les changements de champ
  const handleFieldChange = (setter, value) => {
    setter(value);
    setTimeout(() => checkChanges(), 0);
  };

  // ❌ Annuler les modifications
  const cancelEdit = () => {
    if (hasChanges) {
      Alert.alert(
        tr('unsavedChangesTitle', 'Changements non sauvegardes'),
        tr('unsavedChangesBody', 'Are you sure you want to cancel without saving?'),
        [
          { text: tr('continue', 'Continuer'), style: 'destructive', onPress: () => closeEditModal() },
          { text: tr('keepChanges', 'Garder les modifications'), style: 'cancel' },
        ]
      );
    } else {
      closeEditModal();
    }
  };

  const closeEditModal = () => {
    setEditMode('view');
    setHasChanges(false);
    setEditModalVisible(false);
  };

  // 💾 Sauvegarder les modifications
  const saveEditedInfo = async () => {
    if (!selectedCompanyToEdit) return;

    // 🔍 Validation des données
    const emailError = getValidationError('email', editEmail, t);
    const phoneError = getValidationError('phone', editPhone, t);
    const urlError = getValidationError('website', editWebsite, t);

    if (emailError || phoneError || urlError) {
      triggerHaptic('error');
      Alert.alert(tr('validationErrorTitle', 'Validation error'), emailError || phoneError || urlError);
      return;
    }

    setEditMode('saving');
    setEditingSaving(true);
    triggerHaptic('light');

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé')), 10000)
      );

      const updatePromise = api.patch(`/companies/${selectedCompanyToEdit._id}`, {
        phone: editPhone.trim(),
        email: editEmail.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
        description: editDescription.trim(),
        logo: editLogo.trim(),
        backgroundImage: editImage.trim(),
      });

      await Promise.race([updatePromise, timeout]);

      // Mettre à jour la liste locale
      const updatedData = {
        phone: editPhone.trim(),
        email: editEmail.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
        description: editDescription.trim(),
        logo: editLogo.trim(),
        backgroundImage: editImage.trim(),
      };

      setCompanies((prev) =>
        prev.map((c) => (c._id === selectedCompanyToEdit._id ? { ...c, ...updatedData } : c))
      );

      setCompaniesWithDistance((prev) =>
        prev.map((c) => (c._id === selectedCompanyToEdit._id ? { ...c, ...updatedData } : c))
      );

      setHasChanges(false);
      setEditMode('view');
      triggerHaptic('success');
      
      // Fermer après 1 seconde
      setTimeout(() => {
        closeEditModal();
        Alert.alert(tr('success', 'Succes'), tr('companyInfoUpdated', 'Les informations ont ete mises a jour.'));
      }, 500);
    } catch (error) {
      triggerHaptic('error');
      setEditMode('edit');
      const errorMsg =
        error.message === 'Délai dépassé'
            ? tr('updateTimeout', 'The update took too long. Check your connection.')
            : error.response?.data?.error || tr('updateInfoFailed', 'Unable to update the information.');
          Alert.alert(tr('error', 'Error'), errorMsg);
    } finally {
      setEditingSaving(false);
    }
  };

  // 🗑️ Supprimer une entreprise - logique simple et fonctionnelle
  const deleteCompany = (company) => {
    if (company.ownerId?._id !== user?._id && company.ownerId !== user?._id) {
      triggerHaptic('error');
      Alert.alert(tr('accessDenied', 'Access denied'), tr('deleteOwnCompaniesOnly', 'You can only delete your own companies.'));
      return;
    }

    Alert.alert(
      tr('deleteCompanyTitle', 'Delete company'),
      `${tr('deleteCompanyQuestion', 'Are you sure you want to delete')} "${company.name}"?\n\n${tr('irreversibleAction', 'This action is irreversible.')}`,
      [
        {
          text: tr('cancel', 'Annuler'),
          onPress: () => triggerHaptic('light'),
          style: 'cancel',
        },
        {
          text: tr('deletePermanently', 'Delete permanently'),
          onPress: async () => {
            triggerHaptic('heavy');
            try {
              const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Délai dépassé')), 10000)
              );

              const deletePromise = api.delete(`/companies/${company._id}`);
              await Promise.race([deletePromise, timeout]);

              setCompanies((prev) => prev.filter((c) => c._id !== company._id));
              setCompaniesWithDistance((prev) => prev.filter((c) => c._id !== company._id));

              triggerHaptic('success');
              Alert.alert(tr('success', 'Succes'), tr('companyDeletedSuccess', 'L\'entreprise a ete supprimee.'));
            } catch (error) {
              triggerHaptic('error');
              const errorMsg =
                error.message === 'Délai dépassé'
                  ? tr('deleteTimeout', 'La suppression a pris trop de temps. Verifiez votre connexion.')
                  : error.response?.data?.error || tr('deleteCompanyFailed', 'Impossible de supprimer l\'entreprise.');
              Alert.alert(tr('error', 'Erreur'), errorMsg);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('ProHome');
  };

  const handleCompanyPress = (company) => {
    const companyId = String(company?._id || '').trim();
    if (!companyId) {
      Alert.alert(tr('error', 'Erreur'), tr('invalidCompanyDetail', 'Entreprise invalide, impossible d\'ouvrir le detail.'));
      return;
    }

    navigation.navigate('MainTabs', {
      screen: 'CompanyHome',
      params: {
        screen: 'CompanyOverview',
        params: { companyId, company, currentUserId: user?._id },
        companyId,
        currentUserId: user?._id,
      },
    });
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCompanies = normalizedSearch
    ? companiesWithDistance.filter((company) => {
        const searchable = [
          company?.name,
          company?.description,
          getCompanyAddress(company),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(normalizedSearch);
      })
    : companiesWithDistance;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* 🏷️ Entête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.backButton}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.categoryName}>{categoryName}</Text>
        <Text style={styles.headerTitle}>{partnersTitle}</Text>
        {userLocation && <Text style={styles.headerSubtitle}>{t('sortedByDistance', 'Sorted by distance')}</Text>}

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchCompanies')}
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 📱 Liste des Entreprises */}
      {filteredCompanies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>
            {normalizedSearch ? tr('noResults', 'No results') : tr('noCompanies', 'No companies')}
          </Text>
          <Text style={styles.emptyText}>
            {normalizedSearch
              ? tr('tryAnotherSearch', 'Essaie un autre nom ou une autre adresse.')
              : tr('comeBackSoonPartners', 'Revenez bientot pour decouvrir les partenaires')}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={filteredCompanies}
          renderItem={({ item, index }) => (
            <PremiumCompanyCard
              company={item}
              distance={item.distance}
              onPress={() => handleCompanyPress(item)}
              onEdit={openEditModal}
              onDelete={deleteCompany}
              index={index}
              isLast={index === filteredCompanies.length - 1}
              scrollY={scrollY}
              currentUser={user}
            />
          )}
          keyExtractor={(item) => item._id || Math.random().toString()}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={<View style={styles.listFooterSpacer} />}
        />
      )}

      {/* EDIT INFO MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.editModalContainer}>
                  {/* Handle bar */}
                  <View style={styles.modalHandle} />

                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>
                        {editMode === 'view' ? `👁️ ${tr('information', 'Informations')}` : `✏️ ${tr('edit', 'Modifier')}`}
                      </Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedCompanyToEdit?.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => (editMode === 'view' ? closeEditModal() : cancelEdit())}
                      disabled={editingSaving}
                      style={{ padding: 8 }}
                    >
                      <Text style={styles.modalCloseBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status Indicator */}
                  {hasChanges && editMode === 'edit' && (
                    <View style={styles.changesIndicator}>
                      <Text style={styles.changesIndicatorText}>⚠️ {tr('unsavedChanges', 'Changements non sauvegardes')}</Text>
                    </View>
                  )}
                  {editMode === 'saving' && (
                    <View style={styles.savingIndicator}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={styles.savingIndicatorText}>{tr('savingInProgress', 'Sauvegarde en cours...')}</Text>
                    </View>
                  )}
                  {mediaUploading && (
                    <View style={styles.savingIndicator}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={styles.savingIndicatorText}>{tr('imageUploadInProgress', 'Upload image en cours...')}</Text>
                    </View>
                  )}

                  {/* Form Fields */}
                  <ScrollView
                    style={[styles.formContainer, editMode === 'view' && { opacity: 0.7 }]}
                    contentContainerStyle={styles.formContentContainer}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    nestedScrollEnabled
                  >
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>📞 {t('phone')}</Text>
                      <TextInput
                        placeholder={tr('phoneExample', 'Exemple: +33 1 23 45 67 89')}
                        placeholderTextColor={colors.textTertiary}
                        value={editPhone}
                        onChangeText={(val) => handleFieldChange(setEditPhone, val)}
                        style={[
                          styles.textInput,
                          getValidationError('phone', editPhone, t) && styles.inputError,
                        ]}
                        keyboardType="phone-pad"
                        editable={editMode === 'edit' && !editingSaving}
                      />
                      {getValidationError('phone', editPhone, t) && (
                        <Text style={styles.errorText}>
                          {getValidationError('phone', editPhone, t)}
                        </Text>
                      )}
                    </View>

                    {/* Email Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>📧 {t('email')}</Text>
                      <TextInput
                        placeholder={tr('emailExample', 'exemple@entreprise.com')}
                        placeholderTextColor={colors.textTertiary}
                        value={editEmail}
                        onChangeText={(val) => handleFieldChange(setEditEmail, val)}
                        style={[
                          styles.textInput,
                          getValidationError('email', editEmail, t) && styles.inputError,
                        ]}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={editMode === 'edit' && !editingSaving}
                      />
                      {getValidationError('email', editEmail, t) && (
                        <Text style={styles.errorText}>
                          {getValidationError('email', editEmail, t)}
                        </Text>
                      )}
                    </View>

                    {/* Location Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>📍 {t('location')}</Text>
                      <TextInput
                        placeholder={tr('fullAddressPlaceholder', 'Adresse complete')}
                        placeholderTextColor={colors.textTertiary}
                        value={editLocation}
                        onChangeText={(val) => handleFieldChange(setEditLocation, val)}
                        style={styles.textInput}
                        editable={editMode === 'edit' && !editingSaving}
                      />
                    </View>

                    {/* Website Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>🔗 {t('website')}</Text>
                      <TextInput
                        placeholder={tr('websiteExample', 'www.exemple.com ou https://...')}
                        placeholderTextColor={colors.textTertiary}
                        value={editWebsite}
                        onChangeText={(val) => handleFieldChange(setEditWebsite, val)}
                        style={[
                          styles.textInput,
                          getValidationError('website', editWebsite, t) && styles.inputError,
                        ]}
                        autoCapitalize="none"
                        editable={editMode === 'edit' && !editingSaving}
                      />
                      {getValidationError('website', editWebsite, t) && (
                        <Text style={styles.errorText}>
                          {getValidationError('website', editWebsite, t)}
                        </Text>
                      )}
                    </View>

                    {/* Description Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>📝 {t('description')}</Text>
                      <TextInput
                        placeholder={tr('describeCompanyPlaceholder', 'Decrivez votre entreprise...')}
                        placeholderTextColor={colors.textTertiary}
                        value={editDescription}
                        onChangeText={(val) => handleFieldChange(setEditDescription, val)}
                        style={[styles.textInput, styles.textInputMultiline]}
                        multiline
                        numberOfLines={4}
                        editable={editMode === 'edit' && !editingSaving}
                      />
                    </View>

                    {/* Logo Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>🏷️ {tr('logo', 'Logo')}</Text>
                      <TouchableOpacity
                        style={[styles.uploadImageBtn, (editMode !== 'edit' || editingSaving || mediaUploading) && styles.uploadImageBtnDisabled]}
                        onPress={() => pickAndUploadImage('logo')}
                        disabled={editMode !== 'edit' || editingSaving || mediaUploading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.uploadImageBtnText}>{tr('chooseFromDevice', 'Choisir depuis l\'appareil')}</Text>
                      </TouchableOpacity>
                      {!!editLogo && (
                        <View style={styles.logoPreviewContainer}>
                          <Image
                            source={{ uri: resolveAvatarUri(editLogo, API_URL) }}
                            style={styles.logoPreview}
                            onError={() => {}}
                          />
                        </View>
                      )}
                    </View>

                    {/* Background Image URL Field */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>🖼️ {tr('backgroundImage', 'Image d\'arriere-plan')}</Text>
                      <TouchableOpacity
                        style={[styles.uploadImageBtn, (editMode !== 'edit' || editingSaving || mediaUploading) && styles.uploadImageBtnDisabled]}
                        onPress={() => pickAndUploadImage('background')}
                        disabled={editMode !== 'edit' || editingSaving || mediaUploading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.uploadImageBtnText}>{tr('chooseFromDevice', 'Choisir depuis l\'appareil')}</Text>
                      </TouchableOpacity>
                      <TextInput
                        placeholder={tr('imageUrlPlaceholder', 'https://example.com/image.jpg')}
                        placeholderTextColor={colors.textTertiary}
                        value={editImage}
                        onChangeText={(val) => handleFieldChange(setEditImage, val)}
                        style={styles.textInput}
                        autoCapitalize="none"
                        editable={editMode === 'edit' && !editingSaving && !mediaUploading}
                      />
                      {editImage ? (
                        <View style={styles.imagePreviewContainer}>
                          <Image
                            source={{ uri: editImage }}
                            style={styles.imagePreview}
                            onError={() => console.log('Image URL invalid')}
                          />
                        </View>
                      ) : null}
                    </View>
                  </ScrollView>

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    {editMode === 'view' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.btnSecondary]}
                          onPress={closeEditModal}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.btnSecondaryText}>{t('close')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnPrimary]}
                          onPress={() => setEditMode('edit')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.btnPrimaryText}>✏️ {tr('edit', 'Modifier')}</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.btnSecondary, editingSaving && { opacity: 0.5 }]}
                          onPress={cancelEdit}
                          disabled={editingSaving}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.btnPrimary,
                            (editingSaving || mediaUploading) && { opacity: 0.6 },
                            !hasChanges && { opacity: 0.5 },
                          ]}
                          onPress={saveEditedInfo}
                          disabled={editingSaving || mediaUploading || !hasChanges}
                          activeOpacity={0.7}
                        >
                          {editMode === 'saving' ? (
                            <ActivityIndicator color={colors.white} size="small" />
                          ) : (
                            <Text style={styles.btnPrimaryText}>💾 {t('save')}</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}



// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },

  // Entête
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  backButton: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 47, 201, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 47, 201, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8EAF1',
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  // Liste
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: CARD_OVERLAP + 200,
  },
  listFooterSpacer: {
    height: 578,
  },

  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  locationModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  locationModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  locationModalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  locationModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  locationModalButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  locationModalCancelButton: {
    backgroundColor: '#EEF2FF',
  },
  locationModalConfirmButton: {
    backgroundColor: colors.primary,
  },
  locationModalCancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  locationModalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Card Container
  cardContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: 'rgba(15, 23, 42, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
    paddingVertical: 10,

  },

  // Swipe Container
  swipeableCard: {
    flex: 1,
  },


  // Edit Modal Styles
  editModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    maxHeight: '90%',
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    marginHorizontal: 10,
  },
  modalHandle: {
    width: 44,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  modalHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalCloseBtn: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  changesIndicator: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 6,
  },
  changesIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  savingIndicator: {
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderRadius: 6,
    gap: 8,
  },
  savingIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  formContainer: {
    maxHeight: 420,
    marginBottom: 24,
  },
  formContentContainer: {
    paddingBottom: 8,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
    fontWeight: '600',
  },
  textInputMultiline: {
    paddingVertical: 14,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  imagePreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  uploadImageBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadImageBtnDisabled: {
    opacity: 0.55,
  },
  uploadImageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  logoPreviewContainer: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    backgroundColor: colors.white,
  },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  cardBackground: {
    minHeight: 186,
    justifyContent: 'space-between',
    borderRadius: 18,
    color: colors.white,
  },
  backgroundImage: {
    borderRadius: 18,
    // opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 20, 0.34)',
    borderRadius: 18,
  },

  // Contenu
  cardContent: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    justifyContent: 'space-between',
    flex: 1,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  logoContainer: {
    width: 108,
    height: 108,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  // Info Column
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ownerStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
    borderWidth: 1,
  },
  ownerStatusBadgeDraft: {
    backgroundColor: 'rgba(254, 243, 199, 0.92)',
    borderColor: 'rgba(217, 119, 6, 0.32)',
  },
  ownerStatusBadgeValidated: {
    backgroundColor: 'rgba(220, 252, 231, 0.92)',
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  ownerStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ownerStatusBadgeTextDraft: {
    color: '#92400E',
  },
  ownerStatusBadgeTextValidated: {
    color: '#166534',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },

  // Distance Badge
  distanceBottomBadge: {
    minWidth: 66,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBottomText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.1,
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 12,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  locationBottomItem: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    marginRight: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaTopButton: {
    backgroundColor: 'rgba(139, 47, 201, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 40,
  },
  ctaText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Action Menu - Long Press
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionMenu: {
    backgroundColor: colors.white,
    borderRadius: 18,
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionMenuHeaderTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionMenuHint: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionMenuClose: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  actionMenuEdit: {
    backgroundColor: colors.primaryLight,
  },
  actionMenuIcon: {
    fontSize: 20,
  },
  actionMenuText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  actionMenuDelete: {
    backgroundColor: colors.errorLight,
  },
  actionMenuDeleteText: {
    color: colors.error,
    fontWeight: '700',
  },
  actionMenuDivider: {
    height: 0,
  },
});
