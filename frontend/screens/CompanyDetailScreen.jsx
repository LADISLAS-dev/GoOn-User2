import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { getCompanyById, getPublicRestaurantMenu, getMyDishLikes, toggleDishLike } from "../services/api";
import { useUser } from "../context/UserContext";
import AuthPromptModal from "../components/AuthPromptModal";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { auth } from '../services/firebase';
import { API_URL } from '../env';
import { isLocalAssetUri, resolveAvatarUri } from "../utils/profileUtils";
import { isCompanyPubliclyVisible } from '../utils/companyVisibility';
import { useBusinessTypes } from '../hooks/useBusinessTypes';
import { getProductCatalogCategoryId, getServiceRequestCategoryId } from '../utils/businessTypes';
import { CompanyCategoryCover, CompanyCategoryPhotoBadge, getCompanyCategoryVisual } from '../components/CompanyCategoryVisual';
import PublicRestaurantMenuExperience from '../components/PublicRestaurantMenuExperience';
import PublicRetailStorefront from '../components/PublicRetailStorefront';
import BeautyFashionProfileExperience from '../components/BeautyFashionProfileExperience';
import { LayoutAnimation, UIManager } from "react-native";
import { Animated } from "react-native";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';


if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

const PURPLE = "#8B2FC9"; 
const PURPLE_LIGHT = "#EDE9FE";
const PURPLE_MID = "#C4B5FD";
const RED = "#EF4444";

const CATEGORIES = [
  { id: "1", label: "Technology & IT", icon: "💻" },
  { id: "2", label: "Food & Restaurant", icon: "🍽️" },
  { id: "3", label: "Beauty & Fashion", icon: "💄" },
  { id: "4", label: "Health & Medical", icon: "🏥" },
  { id: "5", label: "Education", icon: "📚" },
  { id: "6", label: "Finance & Banking", icon: "💰" },
  { id: "7", label: "Real Estate", icon: "🏠" },
  { id: "8", label: "Transport & Logistics", icon: "🚗" },
  { id: "9", label: "Hospitality & Hotels", icon: "🏨" },
  { id: "10", label: "Arts & Entertainment", icon: "🎭" },
  { id: "11", label: "Sports & Fitness", icon: "⚽" },
  { id: "12", label: "Manufacturing", icon: "🏭" },
  { id: "13", label: "Agriculture", icon: "🌾" },
  { id: "14", label: "Construction", icon: "🔨" },
  { id: "15", label: "Retail & Shopping", icon: "🛍️" },
  { id: "16", label: "Legal Services", icon: "⚖️" },
  { id: "17", label: "Consulting", icon: "💼" },
  { id: "18", label: "Marketing & Advertising", icon: "📢" },
  { id: "19", label: "Logistics & Warehouse", icon: "📦" },
  { id: "20", label: "Energy & Utilities", icon: "⚡" },
  { id: "21", label: "Telecommunications", icon: "📡" },
  { id: "22", label: "Media & Publishing", icon: "📰" },
  { id: "23", label: "Human Resources", icon: "👥" },
  { id: "24", label: "Environmental Services", icon: "♻️" },
  { id: "25", label: "Arts & Crafts", icon: "🎨" },
  { id: "26", label: "Pet Services", icon: "🐾" },
  { id: "27", label: "Automotive", icon: "🚙" },
  { id: "28", label: "Photography", icon: "📷" },
  { id: "29", label: "Tourism & Travel", icon: "✈️" },
  { id: "30", label: "Event Management", icon: "🎉" },
  { id: "31", label: "Security Services", icon: "🛡️" },
  { id: "32", label: "Plumbing & HVAC", icon: "🔧" },
  { id: "33", label: "Electrical Services", icon: "⚙️" },
  { id: "34", label: "Cleaning Services", icon: "🧹" },
  { id: "35", label: "Landscaping", icon: "🌿" },
  { id: "36", label: "Printing & Design", icon: "🖨️" },
  { id: "37", label: "Software Development", icon: "💾" },
  { id: "38", label: "Graphic Design", icon: "🎯" },
  { id: "39", label: "Web Development", icon: "🌐" },
  { id: "40", label: "Content Creation", icon: "📝" },
];

const normalizeCompanyCategories = (company) => {
  const fromArray = Array.isArray(company?.categoryIds)
    ? company.categoryIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const fallback = String(company?.categoryId || "").trim();
  const merged = [...new Set([...(fallback ? [fallback] : []), ...fromArray])];
  return merged;
};

// ─── persistence helpers ──────────────────────────────────────────────────────
const storageKey = (id, userId) => `company_cache_${id}_${userId || "anon"}`;

const saveLocal = async (id, userId, data) => {
  try {
    const key = storageKey(id, userId);
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
};

const loadLocal = async (id, userId) => {
  try {
    const key = storageKey(id, userId);
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

// ─── API ───────────────────────────────────────────────────────────────────
const patchCompany = (id, body) =>
  api.patch(`/companies/${id}`, body).then((r) => r.data);

const createService = (cId, body) =>
  api.post(`/companies/${cId}/services`, body).then((r) => r.data);

const patchService = (cId, sId, body) =>
  api.patch(`/companies/${cId}/services/${sId}`, body).then((r) => r.data);

const removeService = (cId, sId) =>
  api.delete(`/companies/${cId}/services/${sId}`);

/**
 * Upload une image locale (file://) vers POST /companies/:id/upload-image
 * Le serveur reçoit un multipart/form-data et renvoie { url: "/uploads/xxx.jpg" }
 */
const uploadImage = async (companyId, localUri) => {
  const filename = localUri.split("/").pop() || "photo.jpg";
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const form = new FormData();
  form.append("image", {
    uri: localUri,
    name: filename,
    type: mime,
    size: null,
  });

  console.log('UPLOAD DEBUG [CompanyDetail]: auth.currentUser?', !!auth.currentUser);
  let token = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (e) {
    console.warn('UPLOAD DEBUG [CompanyDetail]: token error', e.message);
  }
  console.log('UPLOAD DEBUG [CompanyDetail]: token?', !!token);

  const headers = {
    'Content-Type': 'multipart/form-data',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await api.post(`/companies/${companyId}/upload-image`, form, { headers });
  return res.data.url; // ex: "/uploads/abc.jpg"
};

const uploadMedia = async (companyId, localUri, { mediaKind = 'image' } = {}) => {
  const filename = localUri.split('/').pop() || (mediaKind === 'video' ? 'video.mp4' : 'photo.jpg');
  const ext = (filename.split('.').pop() || '').toLowerCase();

  let mime = mediaKind === 'video' ? 'video/mp4' : 'image/jpeg';
  if (mediaKind === 'image') {
    if (ext === 'png') mime = 'image/png';
    if (ext === 'webp') mime = 'image/webp';
  } else {
    if (ext === 'mov') mime = 'video/quicktime';
    if (ext === 'm4v') mime = 'video/x-m4v';
    if (ext === 'webm') mime = 'video/webm';
  }

  const form = new FormData();
  form.append('media', {
    uri: localUri,
    name: filename,
    type: mime,
    size: null,
  });

  let token = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (e) {
    console.warn('UPLOAD MEDIA [CompanyDetail]: token error', e.message);
  }

  const headers = {
    'Content-Type': 'multipart/form-data',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await api.post(`/companies/${companyId}/upload-media`, form, { headers });
  return res?.data?.url || '';
};

// ─── image picker ─────────────────────────────────────────────────────────────
const pickImage = async (t) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === "denied") {
    Alert.alert(
      t('permissionRequired', 'Permission requise'),
      t('openPhotosSettings', "Va dans Réglages → [App] → Photos et autorise l'accès."),
    );
    return null;
  }
  if (status !== "granted") return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch (err) {
    console.warn("ImagePicker error:", err);
    Alert.alert(t('error', 'Erreur'), t('openGalleryError', "Impossible d'ouvrir la galerie."));
    return null;
  }
};

const pickVideo = async (t) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === "denied") {
    Alert.alert(
      t('permissionRequired', 'Permission requise'),
      t('openPhotosSettings', "Va dans Réglages → [App] → Photos et autorise l'accès."),
    );
    return null;
  }
  if (status !== "granted") return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch (err) {
    console.warn("VideoPicker error:", err);
    Alert.alert(t('error', 'Erreur'), t('openVideoGalleryError', "Impossible d'ouvrir la galerie vidéo."));
    return null;
  }
};

// ─── helper URL ───────────────────────────────────────────────────────────────
const imgUrl = (src) => {
  return resolveAvatarUri(src, API_URL) || null;
};

const normalizeVideoValue = (value = "") => String(value || "").trim();

// ─── calculate distance ───────────────────────────────────────────────────────
const calculateDistance = (userLat, userLon, companyLat, companyLon) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(companyLat - userLat);
  const dLon = toRad(companyLon - userLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
      Math.cos(toRad(companyLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const getYouTubeEmbedUrl = (rawUrl = "") => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}` : "";
    }

    if (host.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) {
        return `https://www.youtube.com/embed/${fromQuery}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${fromQuery}`;
      }

      const parts = url.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        const id = parts[shortsIndex + 1];
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}`;
      }
    }
  } catch (_) {
    return "";
  }

  return "";
};

const getVimeoEmbedUrl = (rawUrl = "") => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.includes("vimeo.com")) return "";

    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&autopause=0` : "";
  } catch (_) {
    return "";
  }
};

const isDirectVideoUrl = (url = "") => {
  const lower = String(url || "").toLowerCase();
  return (
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".m4v") ||
    lower.includes(".webm") ||
    lower.includes(".m3u8")
  );
};

const isVideoMedia = (value = "") => {
  const media = String(value || "").trim();
  if (!media) return false;
  if (isLocalAssetUri(media)) return true;
  return !!getYouTubeEmbedUrl(media) || !!getVimeoEmbedUrl(media) || isDirectVideoUrl(media);
};

const buildCarouselMediaSource = (rawValue = "") => {
  const media = resolveAvatarUri(rawValue, API_URL) || "";
  const youtube = getYouTubeEmbedUrl(media);
  const vimeo = getVimeoEmbedUrl(media);

  if (youtube || vimeo) {
    return {
      uri: youtube || vimeo,
    };
  }

  return {
    html: `
      <html>
        <body style="margin:0;background:#000;overflow:hidden;">
          <video autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;" src="${media}"></video>
        </body>
      </html>
    `,
  };
};

// ─── main component ───────────────────────────────────────────────────────────
export default function CompanyDetailScreen({ route, navigation }) {
  const { user, isGuest } = useUser();
  const { colors: themeColors } = useTheme();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { t, activeLanguage } = useLanguage();
  const businessTypes = useBusinessTypes(CATEGORIES, activeLanguage);
  const rawCompanyId =
    route?.params?.companyId ??
    route?.params?.id ??
    route?.params?.company?.id ??
    route?.params?.company?._id ??
    route?.params?.company?.companyId;
  const companyId = String(rawCompanyId || '').trim();
  const currentUserId = route?.params?.currentUserId ?? user?._id;

  const [company, setCompany] = useState(null);
  const [publicMenu, setPublicMenu] = useState([]);
  const [likedDishIds, setLikedDishIds] = useState([]);
  const [dishCategory, setDishCategory] = useState('all');
  const [dishQuery, setDishQuery] = useState('');
  const [dishLikeCounts, setDishLikeCounts] = useState({});
  const [publicPaymentOptions, setPublicPaymentOptions] = useState({ stripe: false, paypal: false });
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("services");
  const [uploading, setUploading] = useState(false);
  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState(0);
  const [carouselVideoLinkModalVisible, setCarouselVideoLinkModalVisible] = useState(false);
  const [carouselVideoLinkInput, setCarouselVideoLinkInput] = useState("");
  const [sectorModalVisible, setSectorModalVisible] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [distance, setDistance] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [editInfoModalVisible, setEditInfoModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState("add");
  const [selectedService, setSelectedService] = useState(null);
  const [svcName, setSvcName] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcImage, setSvcImage] = useState("");
  const [svcVideo, setSvcVideo] = useState("");
  const [svcDescription, setSvcDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const priceRef = useRef(null);
  const descriptionRef = useRef(null);
  const flatListRef = useRef(null);
  const galleryViewerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const carouselImages = company?.carouselImages || [];
  const dishImages = publicMenu.map((dish) => dish?.imageUrl).filter(Boolean);
  const galleryImages = [...new Set([...(company?.galleryImages || []), ...dishImages])];
  const services = company?.services || [];
  const selectedCategoryLabels = selectedCategoryIds
    .map((id) => {
      const category = businessTypes.find((cat) => cat.id === id);
      if (!category) return null;
      return category.label;
    })
    .filter(Boolean);
  const primaryCategoryId = normalizeCompanyCategories(company)[0] || '';
  const isRestaurantBusiness = normalizeCompanyCategories(company).includes('2');
  const isTechnologyBusiness = normalizeCompanyCategories(company).includes('1');
  const isBeautyBusiness = normalizeCompanyCategories(company).includes('3')
    || normalizeCompanyCategories(route?.params?.company).includes('3');
  const isHealthBusiness = normalizeCompanyCategories(company).includes('4');
  const productCatalogCategoryId = getProductCatalogCategoryId(normalizeCompanyCategories(company));
  const isProductCatalogBusiness = !!productCatalogCategoryId;
  const serviceRequestCategoryId = getServiceRequestCategoryId(normalizeCompanyCategories(company));
  const isServiceRequestBusiness = !isRestaurantBusiness && !isTechnologyBusiness && !isBeautyBusiness && !isHealthBusiness && !!serviceRequestCategoryId;
  const categoryVisual = getCompanyCategoryVisual(primaryCategoryId, businessTypes, t('categories', 'Business'));

  const serviceCategoryVisual = getCompanyCategoryVisual(
    isTechnologyBusiness ? '1' : isBeautyBusiness ? '3' : isHealthBusiness ? '4' : isProductCatalogBusiness ? productCatalogCategoryId : isServiceRequestBusiness ? serviceRequestCategoryId : primaryCategoryId,
    businessTypes,
    t('categories', 'Business'),
  );
  useEffect(() => {
    let isCurrent = true;
    if (!isRestaurantBusiness || !companyId) {
      setPublicMenu([]);
      setPublicPaymentOptions({ stripe: false, paypal: false });
      setMenuError('');
      setMenuLoading(false);
      return () => { isCurrent = false; };
    }

    setMenuLoading(true);
    setMenuError('');
    getPublicRestaurantMenu(companyId, { page: 1, limit: 100 })
      .then((response) => {
        if (isCurrent) {
          setPublicMenu(response?.data || []);
          setPublicPaymentOptions(response?.paymentOptions || { stripe: false, paypal: false });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setPublicMenu([]);
          setPublicPaymentOptions({ stripe: false, paypal: false });
          setMenuError(activeLanguage === 'fr' ? 'Menu temporairement indisponible.' : 'Menu temporarily unavailable.');
        }
      })
      .finally(() => {
        if (isCurrent) setMenuLoading(false);
      });
    return () => { isCurrent = false; };
  }, [companyId, isRestaurantBusiness, activeLanguage]);

  useEffect(() => {
    if (!isRestaurantBusiness || !companyId || isGuest) {
      setLikedDishIds([]);
      return;
    }
    let isCurrent = true;
    getMyDishLikes(companyId)
      .then((ids) => { if (isCurrent) setLikedDishIds(ids); })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, [companyId, isRestaurantBusiness, isGuest]);

  const handleToggleDishLike = async (dishId) => {
    if (isGuest) {
      setShowAuthPrompt(true);
      return;
    }
    try {
      const result = await toggleDishLike(companyId, dishId);
      setLikedDishIds((ids) => (
        result.liked ? [...new Set([...ids, dishId])] : ids.filter((id) => id !== dishId)
      ));
      setDishLikeCounts((counts) => ({ ...counts, [dishId]: result.likesCount }));
    } catch (_) {
      Alert.alert(t('error', 'Erreur'), t('likeError', "Impossible d'enregistrer votre j'aime."));
    }
  };

  useEffect(() => {
    setActiveTab((currentTab) => (
      isRestaurantBusiness ? 'menu' : currentTab === 'menu' ? 'services' : currentTab
    ));
  }, [isRestaurantBusiness]);
  const ownerId =
    typeof company?.ownerId === "object"
      ? company?.ownerId?._id
      : company?.ownerId;
  const isOwner =
    !!company &&
    !!currentUserId &&
    String(ownerId || "") === String(currentUserId);
  const canViewCompany = isOwner || isCompanyPubliclyVisible(company);
  const canEdit = false;
  const appreciationSummary = company?.appreciationSummary || {};
  const appreciationLikes = Number(appreciationSummary.likes || 0);
  const appreciationTotal = Number(appreciationSummary.total || 0);
  const appreciationAvg =
    typeof appreciationSummary.averageRating === "number"
      ? appreciationSummary.averageRating
      : null;

  // ── load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!carouselImages.length) 
      
      return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % carouselImages.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
            viewPosition: 0.5,
          });
        } catch (error) {
          console.warn('scrollToIndex failed:', error);
        }
        return next;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  useEffect(() => {
    if (!companyId || String(companyId) === "undefined" || String(companyId) === "null") {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      let cachedData = null;

      cachedData = await loadLocal(companyId, currentUserId);
      if (cachedData && cachedData._userId === currentUserId) {
        if (isMounted) {
          setCompany(cachedData);
          setLoading(false);
        }
      }

      try {
        const data = await getCompanyById(companyId);
        if (isMounted) {
          const dataWithUser = { ...data, _userId: currentUserId };
          setCompany(dataWithUser);
          saveLocal(companyId, currentUserId, dataWithUser);
        }
      } catch (e) {
        if (!cachedData && isMounted) {
          Alert.alert(t('error', 'Error'), t('myCompanyLoadError', 'Unable to load your company.'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [companyId, currentUserId]);

  // Company detail is read-only here; no location prompt or distance computation.
  useEffect(() => {}, []);

  useEffect(() => {
    if (!company) return;
    setSelectedCategoryIds(normalizeCompanyCategories(company));
  }, [company]);

  // ── optimistic update ─────────────────────────────────────────────────────────
  const applyUpdate = useCallback(
    (updater) => {
      setCompany((prev) => {
        const next = updater(prev);
        saveLocal(companyId, currentUserId, next);
        return next;
      });
    },
    [companyId, currentUserId],
  );

  const onShare = async () => {
    try {
      await Share.share({
        message: t('shareCompanyMessage', `Discover ${company?.name} on our app`),
        title: company?.name,
      });
    } catch (_) {}
  };

  const toggleSector = (id) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id)
        ? prev.filter((currentId) => currentId !== id)
        : [...prev, id]
    ));
  };

  const saveSectors = async () => {
    return;
    if (!selectedCategoryIds.length) {
      Alert.alert(t('requiredFieldTitle', 'Required field'), t('selectAtLeastOneSector', 'Select at least one sector.'));
      return;
    }

    const normalized = [...new Set(selectedCategoryIds.map((id) => String(id).trim()).filter(Boolean))];
    const primaryCategoryId = normalized[0];
    const previousCategoryId = company?.categoryId;
    const previousCategoryIds = company?.categoryIds;

    setSavingCategories(true);
    applyUpdate((p) => ({
      ...p,
      categoryId: primaryCategoryId,
      categoryIds: normalized,
    }));

    try {
      await patchCompany(companyId, {
        categoryId: primaryCategoryId,
        categoryIds: normalized,
      });
      setSectorModalVisible(false);
    } catch (error) {
      applyUpdate((p) => ({
        ...p,
        categoryId: previousCategoryId,
        categoryIds: previousCategoryIds,
      }));
      Alert.alert(t('error', 'Error'), t('updateSectorError', 'Unable to update sectors.'));
    } finally {
      setSavingCategories(false);
    }
  };

  // ─── EDIT INFO ────────────────────────────────────────────────────────────────
  const openEditInfoModal = () => {
    return;
    setEditPhone(company?.phone || "");
    setEditEmail(company?.email || "");
    setEditLocation(company?.location || "");
    setEditWebsite(company?.website || "");
    setEditInfoModalVisible(true);
  };

  const saveInfoChanges = async () => {
    return;
    setEditingSaving(true);
    const previousCompany = { ...company };

    applyUpdate((p) => ({
      ...p,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      location: editLocation.trim(),
      website: editWebsite.trim(),
    }));

    try {
      await patchCompany(companyId, {
        phone: editPhone.trim(),
        email: editEmail.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
      });
      setEditInfoModalVisible(false);
      Alert.alert(t('success', 'Success'), t('companyUpdated', 'Company updated!'));
    } catch (error) {
      applyUpdate(() => previousCompany);
      Alert.alert(t('error', 'Error'), t('saveFailed', 'Unable to save'));
    } finally {
      setEditingSaving(false);
    }
  };

  // ─── CAROUSEL SYNC ────────────────────────────────────────────────────────────────
  const syncCarousel = async (newImages) => {
    applyUpdate((p) => ({ ...p, carouselImages: newImages }));
    try {
      await patchCompany(companyId, {
        carouselImages: newImages,
      });
    } catch (_) {
      Alert.alert(t('error', 'Error'), t('uploadFailed', 'Upload failed'));
    }
  };

  // ─── ADD CAROUSEL ────────────────────────────────────────────────────────
  const addCarouselImage = async () => {
    return;
    const localUri = await pickImage(t);
    if (!localUri) return;

    const current = company.carouselImages || [];
    if (current.length >= 6)
       {
      Alert.alert(t('limitReachedTitle', 'Limit reached'), t('carouselLimitImages', 'Carousel is limited to 6 images.'));
      return;
    }

    setUploading(true);
    try {
      const serverUrl = await uploadImage(companyId, localUri);
      const newImages = [...current, serverUrl];

      await syncCarousel(newImages);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setCarouselIndex(newImages.length - 1);
      }, 200);
    } catch (err) {
      console.warn("Upload error:", err);
      Alert.alert(t('error', 'Error'), t('uploadFailed', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const addCarouselVideoFromDevice = async () => {
    return;
    const localUri = await pickVideo(t);
    if (!localUri) return;

    const current = company.carouselImages || [];
    if (current.length >= 6) {
      Alert.alert(t('limitReachedTitle', 'Limit reached'), t('carouselLimitMedia', 'Carousel is limited to 6 media files.'));
      return;
    }

    setUploading(true);
    try {
      const serverUrl = await uploadMedia(companyId, localUri, { mediaKind: 'video' });
      const newMedia = [...current, serverUrl];
      await syncCarousel(newMedia);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setCarouselIndex(newMedia.length - 1);
      }, 200);
    } catch (err) {
      console.warn("Video upload error:", err);
      Alert.alert(t('error', 'Error'), t('videoUploadError', 'Unable to upload video.'));
    } finally {
      setUploading(false);
    }
  };

  const openCarouselVideoLinkModal = () => {
    return;
    setCarouselVideoLinkInput("");
    setCarouselVideoLinkModalVisible(true);
  };

  const addCarouselVideoFromLink = async () => {
    return;
    const current = company.carouselImages || [];
    if (current.length >= 6) {
      Alert.alert(t('limitReachedTitle', 'Limit reached'), t('carouselLimitMedia', 'Carousel is limited to 6 media files.'));
      return;
    }

    const normalized = normalizeVideoValue(carouselVideoLinkInput);
    if (!normalized) {
      Alert.alert(t('requiredFieldTitle', 'Required field'), t('validVideoLinkRequired', 'Add a valid video link.'));
      return;
    }

    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      Alert.alert(t('invalidUrl', 'Invalid URL'), t('videoLinkMustStartHttp', 'The link must start with http:// or https://'));
      return;
    }

    if (!isVideoMedia(normalized)) {
      Alert.alert(t('invalidUrl', 'Invalid URL'), t('videoLinkInvalidFormat', 'Use a YouTube, Vimeo or direct video file link.'));
      return;
    }

    try {
      const newMedia = [...current, normalized];
      await syncCarousel(newMedia);
      setCarouselVideoLinkModalVisible(false);
      setCarouselVideoLinkInput("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setCarouselIndex(newMedia.length - 1);
      }, 200);
    } catch (err) {
      console.warn("Video link save error:", err);
      Alert.alert(t('error', 'Error'), t('videoLinkAddError', 'Unable to add the video link.'));
    }
  };

  const addCarouselMedia = () => {
    return;
  };

  const replaceCarouselImage = async (idx) => {
    return;
    const localUri = await pickImage(t);
    if (!localUri) return;
    setUploading(true);
    try {
      const serverUrl = await uploadImage(companyId, localUri);
      const newImages = (company.carouselImages || []).map((img, i) =>
        i === idx ? serverUrl : img,
      );
      await syncCarousel(newImages);
    } catch (_) {
      Alert.alert(t('error', 'Error'), t('uploadFailed', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const deleteCarouselImage = (idx) => {
    return;
  };

  const editCarouselImage = (idx) => {
    return;
  };

  // ─── GALLERY SYNC ────────────────────────────────────────────────────────
  const syncGallery = async (newImages) => {
    return;
    const previous = company?.galleryImages || [];
    applyUpdate((p) => ({ ...p, galleryImages: newImages }));
    try {
      await patchCompany(companyId, { galleryImages: newImages });
    } catch (error) {
      applyUpdate((p) => ({ ...p, galleryImages: previous }));
      Alert.alert(t('error', 'Error'), t('galleryUpdateError', 'Unable to update gallery.'));
      throw error;
    }
  };

  // ─── ADD GALLERY ─────────────────────────────────────────────────────────
  const addGalleryImage = async () => {
    return;
    const uri = await pickImage(t);
    if (!uri) return;

    setUploading(true);
    try {
      const url = await uploadImage(companyId, uri);
      const current = company?.galleryImages || [];
      await syncGallery([...current, url]);
    } finally {
      setUploading(false);
    }
  };

  // ─── DELETE GALLERY ───────────────────────────────────────────────────
  const deleteGallery = (i) => {
    return;
  };

  // ─── REPLACE GALLERY ───────────────────────────────────────────────────
  const replaceGalleryImage = async (idx) => {
    return;
    const uri = await pickImage(t);
    if (!uri) return;

    setUploading(true);

    try {
      const url = await uploadImage(companyId, uri);
      const current = company?.galleryImages || [];
      const newGallery = current.map((img, i) => (i === idx ? url : img));
      await syncGallery(newGallery);
    } catch (e) {
      Alert.alert(t('error', 'Error'), t('replaceImageError', 'Unable to replace image'));
    } finally {
      setUploading(false);
    }
  };

  const editGalleryImage = (idx) => {
    return;
  };

  const openGalleryViewer = (index) => {
    if (!galleryImages.length) return;
    const safeIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
    setGalleryViewerIndex(safeIndex);
    setGalleryViewerVisible(true);
  };

  // ─── SERVICES ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditMode("add");
    setSelectedService(null);
    setSvcName("");
    setSvcPrice("");
    setSvcImage("");
    setSvcVideo("");
    setSvcDescription("");
    setModalVisible(true);
  };

  const openEdit = (svc) => {
    setEditMode("edit");
    setSelectedService(svc);
    setSvcName(svc.name);
    setSvcPrice(String(svc.price));
    setSvcImage(svc.image || "");
    setSvcVideo(svc.video || "");
    setSvcDescription(svc.description || "");
    setModalVisible(true);
  };

  const pickServiceImage = async () => {
    const uri = await pickImage(t);
    if (uri) {
      setSvcImage(uri);
    }
  };

  const pickServiceVideo = async () => {
    const uri = await pickVideo(t);
    if (uri) {
      setSvcVideo(uri);
    }
  };

  const saveService = async () => {
    Keyboard.dismiss();
    if (!svcName.trim())
      return Alert.alert(t('requiredFieldTitle', 'Required field'), t('serviceNameRequired', 'Service name is required.'));

    const priceValue = parseFloat(svcPrice);
    if (!svcPrice.trim() || Number.isNaN(priceValue) || priceValue <= 0) {
      return Alert.alert(t('error', 'Error'), t('servicePriceInvalid', 'Please enter a valid positive price.'));
    }

    setSaving(true);
    try {
      let finalImage = svcImage;
      let finalVideo = normalizeVideoValue(svcVideo);
      if (svcImage && isLocalAssetUri(svcImage)) {
        finalImage = await uploadMedia(companyId, svcImage, { mediaKind: 'image' });
      }

      if (finalVideo && isLocalAssetUri(finalVideo)) {
        finalVideo = await uploadMedia(companyId, finalVideo, { mediaKind: 'video' });
      }

      if (editMode === "add") {
        const data = await createService(companyId, {
          name: svcName,
          price: priceValue,
          image: finalImage,
          video: finalVideo,
          description: svcDescription,
        });
        applyUpdate((p) => ({ ...p, services: [...(p.services || []), data] }));
      } else {
        const data = await patchService(companyId, selectedService._id, {
          name: svcName,
          price: priceValue,
          image: finalImage,
          video: finalVideo,
          description: svcDescription,
        });
        applyUpdate((p) => ({
          ...p,
          services: p.services.map((s) => (s._id === data._id ? data : s)),
        }));
      }
      setModalVisible(false);
    } catch (err) {
      console.warn("saveService error:", err);
      Alert.alert(t('error', 'Error'), t('serviceSaveError', 'Unable to save service.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteService = (id) => {
    Alert.alert(t('delete', 'Delete'), t('deleteServiceConfirm', 'Delete this service?'), [
      { text: t('cancel', 'Cancel'), style: "cancel" },
      {
        text: t('delete', 'Delete'),
        style: "destructive",
        onPress: async () => {
          const previousServices = company?.services || [];
          applyUpdate((p) => ({
            ...p,
            services: p.services.filter((s) => s._id !== id),
          }));
          try {
            await removeService(companyId, id);
          } catch (err) {
            applyUpdate((p) => ({ ...p, services: previousServices }));
            Alert.alert(t('error', 'Error'), t('deleteServiceError', 'Unable to delete service.'));
          }
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading && !company) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }
  if (!company) {
    return (
      <View style={styles.center}>
        <Text>{t('companyNotFound', 'Company not found')}</Text>
      </View>
    );
  }

  if (!canViewCompany) {
    return (
      <View style={styles.center}>
        <Text>{t('companyNotFound', 'Company not found')}</Text>
      </View>
    );
  }

  if (isBeautyBusiness) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#7026B9" />
        <SafeAreaView style={[styles.header, styles.restaurantHeader]} edges={["top"]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (navigation?.canGoBack?.()) navigation.goBack();
                else navigation.navigate('UserHome');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('back', 'Back')}
            >
              <ChevronLeft size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>{company?.name}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={onShare} accessibilityRole="button" accessibilityLabel={t('share', 'Share')}>
              <Text style={styles.iconText}>⤴</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1 }}>
          <BeautyFashionProfileExperience
            company={company}
            services={services}
            isFrench={activeLanguage === 'fr'}
            user={user}
            onOpenNotifications={() => navigation.navigate('NotificationLabs')}
            onBookService={(service) => {
              if (isGuest) {
                setShowAuthPrompt(true);
                return;
              }
              navigation.navigate('CreateAppointment', {
                companyId,
                service,
                serviceId: service?._id,
                selectedServiceImage: service?.selectedImage || service?.image || '',
                companyName: company?.name,
                beautyFashionBooking: true,
                appointmentTitlePrefix: t('beautyBookingPrefix', 'Rendez-vous'),
                defaultAppointmentType: 'in_person',
                appointmentLocation: company?.location || company?.address || company?.city || '',
              });
            }}
          />
          <AuthPromptModal
            visible={showAuthPrompt}
            onClose={() => setShowAuthPrompt(false)}
            onSignIn={() => { setShowAuthPrompt(false); navigation.replace('Login'); }}
            onSignUp={() => { setShowAuthPrompt(false); navigation.replace('Register'); }}
            featureName="manageBookings"
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.root, isRestaurantBusiness && styles.restaurantRoot, isRestaurantBusiness && { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isBeautyBusiness ? 'transparent' : PURPLE} />

      {/* HEADER */}
      <SafeAreaView style={[styles.header, isRestaurantBusiness && styles.restaurantHeader, isRestaurantBusiness && { backgroundColor: themeColors.pink }, isBeautyBusiness && styles.beautyHeaderOverlay]} edges={["top"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.iconBtn, isBeautyBusiness && styles.beautyHeaderIconBtn]}
            onPress={() => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
              }

              navigation.navigate('UserHome');
            }}
          >
            {isBeautyBusiness ? <ChevronLeft size={21} color="#FFFFFF" /> : <Text style={styles.iconText}>‹</Text>}
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {!isBeautyBusiness ? <Text style={styles.headerTitle} numberOfLines={1}>{company?.name}</Text> : null}
          </View>
          <TouchableOpacity style={[styles.iconBtn, isBeautyBusiness && styles.beautyHeaderIconBtn]} onPress={onShare}>
            {isBeautyBusiness ? <MoreHorizontal size={19} color="#FFFFFF" /> : <Text style={styles.iconText}>⤴</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Spinner upload global */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadText}>{t('uploadInProgress', 'Uploading image...')}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, isRestaurantBusiness && styles.restaurantScrollContent]}
      >
        {/* CAROUSEL */}
        {!isRestaurantBusiness && !isBeautyBusiness && (
        <View>
          <View style={styles.carouselLabel}>
            {/* <Text style={styles.carouselLabelText}>{t('photos', 'Photos')}</Text> */}
            {/* {carouselImages.length > 0 && (
              <Text style={styles.carouselCounter}>
                {carouselIndex + 1} / {carouselImages.length}
              </Text>
            )} */}
          </View>

          {carouselImages.length > 0 ? (
            <View>
              <FlatList
                ref={flatListRef}
                data={carouselImages}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / width,
                  );
                  setCarouselIndex(index);
                }}
                getItemLayout={(_, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item, index: i }) => (
                  <View style={{ width, height: 230 }}>
                    {isVideoMedia(item) ? (
                      <View style={styles.carouselMediaVideoWrap}>
                        <WebView
                          source={buildCarouselMediaSource(item)}
                          style={styles.carouselMediaVideo}
                          allowsInlineMediaPlayback
                          allowsFullscreenVideo
                          mediaPlaybackRequiresUserAction={false}
                          javaScriptEnabled
                          scrollEnabled={false}
                          originWhitelist={["*"]}
                        />
                        <View style={styles.carouselVideoPill}>
                        </View>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: imgUrl(item) }}
                        style={styles.carouselImg}
                      />
                    )}
                    <CompanyCategoryPhotoBadge visual={categoryVisual} />
                    {/* <TouchableOpacity
                      style={styles.editImgBtn}
                      onPress={() => editCarouselImage(i)}
                    >
                      <Text style={styles.editImgIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteImgBtn}
                      onPress={() => deleteCarouselImage(i)}
                    >
                      <Text style={styles.deleteImgIcon}>🗑</Text>
                    </TouchableOpacity> */}


                            <View style={styles.appreciationFloatingBadge} pointerEvents="none">
        {/* <Text style={styles.appreciationFloatingTitle}>Appreciation</Text> */}
        <View style={styles.appreciationFloatingRow}>
          <Text style={styles.appreciationFloatingValue}>👍 {appreciationLikes}</Text>
          <Text style={styles.appreciationFloatingDivider}>•</Text>
          {/* <Text style={styles.appreciationFloatingValue}>{appreciationTotal} avis</Text> */}
          {appreciationAvg !== null ? (
            <>
              <Text style={styles.appreciationFloatingValue}>⭐ {appreciationAvg}</Text>
              {/* <Text style={styles.appreciationFloatingDivider}>•</Text> */}
            </>
          ) : null}
        </View>
      </View>
                  </View>
                )}
              />
              <View style={styles.dots}>
                {carouselImages.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === carouselIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <CompanyCategoryCover
              companyName={company?.name}
              description={company?.description}
              visual={categoryVisual}
              fallbackDescription={t('companyCategoryIntro', 'Discover what this business has to offer.')}
            />
          )}

          {/* {!!selectedCategoryLabels.length && (
            <View style={styles.sectorBadgeWrap}>
              {selectedCategoryLabels.slice(0, 6).map((label) => (
                <View key={label} style={styles.sectorBadge}>
                  <Text style={styles.sectorBadgeText} numberOfLines={1}>{label}</Text>
                </View>
              ))}
              {selectedCategoryLabels.length > 6 && (
                <View style={styles.sectorBadge}>
                  <Text style={styles.sectorBadgeText}>+{selectedCategoryLabels.length - 6}</Text>
                </View>
              )}
            </View>
          )} */}
        </View>
        )}

        {/* TABS */}
        {!isRestaurantBusiness && !isBeautyBusiness && (
        <View style={[styles.tabRow, isRestaurantBusiness && styles.restaurantTabRow]}>
          {(isRestaurantBusiness ? ['menu', 'gallery'] : ['services', 'gallery']).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                isRestaurantBusiness && styles.restaurantTab,
                activeTab === tab &&
                  (isRestaurantBusiness
                    ? styles.restaurantTabActive
                    : tab === "services"
                      ? styles.tabActive
                      : styles.tabActiveOutline),
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  isRestaurantBusiness && styles.restaurantTabText,
                  activeTab === tab &&
                    (isRestaurantBusiness
                      ? styles.restaurantTabTextActive
                      : tab === "services"
                        ? styles.tabTextActive
                        : styles.tabTextOutline),
                ]}
              >
                {tab === 'menu'
                  ? t('restaurantMenu', 'Menu')
                  : tab === 'services'
                    ? t('services', 'Services')
                    : `${t('tabGallery', t('gallery', t('Gallery', 'Gallery')))} 🖼`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}

        {activeTab === 'menu' && isRestaurantBusiness && (
          <PublicRestaurantMenuExperience
            locationLabel={company?.location || company?.address || company?.city || ''}
            companyId={companyId}
            items={publicMenu}
            paymentOptions={publicPaymentOptions}
            isLoading={menuLoading}
            error={menuError}
          />
        )}

        {/* SERVICES */}
        {activeTab === 'services' && isProductCatalogBusiness ? (
          <PublicRetailStorefront companyId={companyId} categoryVisual={serviceCategoryVisual} />
        ) : null}

        {activeTab === "services" && !isProductCatalogBusiness && !isBeautyBusiness && (
          <View>
            <View style={[styles.sectionHeader, isRestaurantBusiness && styles.restaurantSectionHeader]}>
              <Text style={[styles.sectionTitle, isRestaurantBusiness && styles.restaurantSectionTitle]}>
                {isTechnologyBusiness
                  ? t('technologyServicesTitle', 'Technology & IT services')
                  : isBeautyBusiness
                    ? t('beautyServicesTitle', 'Beauty & Fashion services')
                    : isHealthBusiness
                      ? t('healthServicesTitle', 'Health & Medical services')
                      : isServiceRequestBusiness ? serviceCategoryVisual.label : null}
              </Text>
            </View>
            <View style={[styles.grid, isRestaurantBusiness && styles.restaurantGrid]}>
              {services.map((s, i) => (
                <View key={s._id || i} style={[styles.card, isRestaurantBusiness && styles.restaurantServiceCard]}>
                  {s.image ? (
                    <Image
                      source={{ uri: imgUrl(s.image) }}
                      style={styles.cardImg}
                    />
                  ) : (
                    <View style={[styles.cardImg, styles.noImg, isRestaurantBusiness && styles.restaurantNoImage, (isTechnologyBusiness || isBeautyBusiness || isHealthBusiness || isServiceRequestBusiness) && { backgroundColor: serviceCategoryVisual.background }]}>
                      <Text style={styles.noImgIcon}>{s.video ? "🎬" : isTechnologyBusiness || isBeautyBusiness || isHealthBusiness || isServiceRequestBusiness ? serviceCategoryVisual.icon : "🛠"}</Text>
                    </View>
                  )}
                  {!!s.video && (
                    <View style={styles.videoBadge}>
                      <Text style={styles.videoBadgeText}>VIDEO</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                      if (isGuest) {
                        setShowAuthPrompt(true);
                      } else {
                        navigation.navigate("ServiceDetail", {
                          service: s,
                          companyId: company._id,
                          businessCategoryId: isTechnologyBusiness ? '1' : isBeautyBusiness ? '3' : isHealthBusiness ? '4' : isServiceRequestBusiness ? serviceRequestCategoryId : primaryCategoryId,
                          appointmentLocation: company?.location || company?.address || company?.city || '',
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  />
                  <BlurView intensity={10} tint="dark" style={styles.overlay} pointerEvents="none">
                    <Text style={styles.serviceName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={styles.servicePrice}>
                      {(isTechnologyBusiness || isBeautyBusiness || isHealthBusiness || isServiceRequestBusiness) && Number(s.price || 0) <= 0
                        ? isTechnologyBusiness
                          ? t('technologyQuoteLabel', 'On request')
                          : isBeautyBusiness
                            ? t('beautyQuoteLabel', 'Price on request')
                            : isHealthBusiness ? t('healthPriceLabel', 'Price to confirm') : t('serviceRequestPriceLabel', 'On request')
                        : `$${Number(s.price).toFixed(2)}`}
                    </Text>
                  </BlurView>
                </View>
              ))}
              {services.length === 0 && (
                <View style={[styles.emptyState, isRestaurantBusiness && styles.restaurantEmptyState]}>
                  <Text style={styles.emptyIcon}>{isTechnologyBusiness || isBeautyBusiness || isHealthBusiness || isServiceRequestBusiness ? serviceCategoryVisual.icon : '🛠'}</Text>
                  <Text style={[styles.emptyText, isRestaurantBusiness && styles.restaurantEmptyText]}>
                    {isTechnologyBusiness
                      ? t('technologyNoServices', 'IT services will appear here once they are added.')
                      : isBeautyBusiness
                        ? t('beautyNoServices', 'Beauty and fashion services will appear here once they are added.')
                        : isHealthBusiness
                          ? t('healthNoServices', 'Health services will appear here once they are added.')
                          : isServiceRequestBusiness
                            ? t('serviceRequestNoServices', 'Services in this category will appear here once they are added.')
                            : t('noServiceAddHint', 'No service available.')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* GALLERY */}
        {activeTab === "gallery" && !isBeautyBusiness && (
          <View>
            {!isRestaurantBusiness && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {galleryImages.length} {galleryImages.length === 1
                  ? t('photo', 'Photo')
                  : t('photos', 'Photos')}
              </Text>
            </View>
            )}
            {!isRestaurantBusiness && (
            <View style={styles.galleryGrid}>
              {galleryImages.map((uri, i) => (
                <View key={i} style={styles.galleryItemWrapper}>
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openGalleryViewer(i)}>
                    <Image
                      source={{ uri: imgUrl(uri) }}
                      style={styles.galleryImg}
                    />
                  </TouchableOpacity>
                </View>
              ))}
              {galleryImages.length === 0 && (
                <View style={[styles.emptyState, isRestaurantBusiness && styles.restaurantEmptyState]}>
                  <Text style={styles.emptyIcon}>🖼</Text>
                  <Text style={[styles.emptyText, isRestaurantBusiness && styles.restaurantEmptyText]}>
                    {t('noImageAddHint', 'No image. Tap + Add.')}
                  </Text>
                </View>
              )}
            </View>
            )}
            {isRestaurantBusiness && !menuLoading && publicMenu.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={[styles.emptyText, styles.restaurantEmptyText]}>
                  {t('noDishAvailable', 'Aucun plat disponible.')}
                </Text>
              </View>
            )}
            {isRestaurantBusiness && publicMenu.length > 0 && (
              <View style={styles.dishList}>
                <TextInput
                  value={dishQuery}
                  onChangeText={setDishQuery}
                  placeholder={t('searchDish', 'Rechercher un plat')}
                  placeholderTextColor="#8e8e93"
                  style={styles.dishSearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dishFilterRow}>
                  {['all', ...new Set(publicMenu.map((d) => d.category).filter(Boolean))].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.dishFilterChip, dishCategory === cat && styles.dishFilterChipActive]}
                      onPress={() => setDishCategory(cat)}
                    >
                      <Text style={styles.dishFilterText}>{cat === 'all' ? t('all', 'Tout') : cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.dishGrid}>
                {publicMenu.filter((d) => (
                  (dishCategory === 'all' || d.category === dishCategory)
                  && (!dishQuery.trim() || `${d.name || ''} ${d.description || ''}`.toLowerCase().includes(dishQuery.trim().toLowerCase()))
                )).map((dish) => {
                  const dishId = String(dish._id);
                  const liked = likedDishIds.includes(dishId);
                  const likes = dishLikeCounts[dishId] ?? dish.likesCount ?? 0;
                  const imageIndex = dish.imageUrl ? galleryImages.indexOf(dish.imageUrl) : -1;
                  return (
                    <View key={dishId} style={styles.dishCard}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        disabled={imageIndex < 0}
                        onPress={() => openGalleryViewer(imageIndex)}
                      >
                        {dish.imageUrl ? (
                          <Image source={{ uri: imgUrl(dish.imageUrl) }} style={styles.dishCardImg} />
                        ) : (
                          <View style={[styles.dishCardImg, styles.noImg]}>
                            <Text style={styles.noImgIcon}>🍽️</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={styles.dishCardBody}>
                        <Text style={styles.dishCardName} numberOfLines={2}>{dish.name}</Text>
                        {!!dish.category && <Text style={styles.dishCardCategory}>{dish.category}</Text>}
                        {!!dish.description && (
                          <Text style={styles.dishCardDesc} numberOfLines={3}>{dish.description}</Text>
                        )}
                        <View style={styles.dishCardFooter}>
                          <Text style={styles.dishCardPrice}>
                            {(Math.round(Number(dish.priceMinor || 0) * (100 - (dish.discountPercent || 0)) / 100) / 100).toFixed(2)} {dish.currency || ''}
                          </Text>
                          <TouchableOpacity
                            style={styles.dishLikeBtn}
                            onPress={() => handleToggleDishLike(dishId)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.dishLikeIcon}>{liked ? '❤️' : '🤍'}</Text>
                            <Text style={styles.dishLikeCount}>{likes}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: isRestaurantBusiness ? 185 : 40 }} />
      </ScrollView>

      {/* EDIT INFO MODAL */}
      <Modal
        visible={false}
        animationType="slide"
        transparent
        onRequestClose={() => setEditInfoModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalSheet}>
                  <View style={styles.handle} />
                  <Text style={styles.modalTitle}>{t('editInfoTitle', 'Edit information')}</Text>

                  <TextInput
                    placeholder={t('phone', 'Phone')}
                    placeholderTextColor="#aaa"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={styles.input}
                    keyboardType="phone-pad"
                  />

                  <TextInput
                    placeholder={t('email', 'Email')}
                    placeholderTextColor="#aaa"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TextInput
                    placeholder={t('locationAddressPlaceholder', 'Location/Address')}
                    placeholderTextColor="#aaa"
                    value={editLocation}
                    onChangeText={setEditLocation}
                    style={styles.input}
                  />

                  <TextInput
                    placeholder={t('website', 'Website')}
                    placeholderTextColor="#aaa"
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    style={[styles.saveBtn, editingSaving && { opacity: 0.6 }]}
                    onPress={saveInfoChanges}
                    disabled={editingSaving}
                  >
                    {editingSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>{t('save', 'Save')}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditInfoModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={galleryViewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setGalleryViewerVisible(false)}
      >
        <View style={styles.galleryViewerRoot}>
          <SafeAreaView style={styles.galleryViewerHeader} edges={["top"]}>
            <TouchableOpacity
              style={styles.galleryViewerCloseBtn}
              onPress={() => setGalleryViewerVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.galleryViewerCloseText}>{t('close', 'Close')}</Text>
            </TouchableOpacity>
            <Text style={styles.galleryViewerCounter}>
              {galleryImages.length ? `${galleryViewerIndex + 1} / ${galleryImages.length}` : "0 / 0"}
            </Text>
          </SafeAreaView>

          <FlatList
            ref={galleryViewerRef}
            data={galleryImages}
            keyExtractor={(_, idx) => `viewer-${idx}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={galleryViewerIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const fallbackOffset = Math.max(0, info?.index || 0) * width;
              requestAnimationFrame(() => {
                galleryViewerRef.current?.scrollToOffset({ offset: fallbackOffset, animated: false });
              });
            }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setGalleryViewerIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.galleryViewerSlide}>
                <Image source={{ uri: imgUrl(item) }} style={styles.galleryViewerImage} />
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={false}
        animationType="slide"
        transparent
        onRequestClose={() => setCarouselVideoLinkModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalSheet}>
                  <View style={styles.handle} />
                  <Text style={styles.modalTitle}>{t('addVideoLinkTitle', 'Add a video link')}</Text>
                  <TextInput
                    placeholder="https://youtube.com/..."
                    placeholderTextColor="#9CA3AF"
                    value={carouselVideoLinkInput}
                    onChangeText={setCarouselVideoLinkInput}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={addCarouselVideoFromLink}>
                    <Text style={styles.saveBtnText}>{t('addToCarousel', 'Add to carousel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCarouselVideoLinkModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={false}
        animationType="slide"
        transparent
        onRequestClose={() => setSectorModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalSheet}>
                  <View style={styles.handle} />
                  <Text style={styles.modalTitle}>{t('editSectorsTitle', 'Edit sectors')}</Text>
                  <Text style={styles.sectorHint}>{t('selectMultipleSectorsHint', 'You can select multiple sectors.')}</Text>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.sectorList}>
                    <View style={styles.sectorGrid}>
                      {businessTypes.map((cat) => {
                        const selected = selectedCategoryIds.includes(cat.id);
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.sectorChip, selected && styles.sectorChipSelected]}
                            onPress={() => toggleSector(cat.id)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.sectorChipIcon}>{cat.icon}</Text>
                            <Text style={[styles.sectorChipText, selected && styles.sectorChipTextSelected]} numberOfLines={2}>
                              {cat.label}
                            </Text>
                            {selected && <Text style={styles.sectorChipCheck}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.saveBtn, savingCategories && { opacity: 0.6 }]}
                    onPress={saveSectors}
                    disabled={savingCategories}
                  >
                    {savingCategories ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>{t('saveSectors', 'Save sectors')}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setSectorModalVisible(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      







      {/* MODAL SERVICE AVEC DESCRIPTION */}
      <Modal visible={false} animationType="slide" transparent>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={styles.modalOverlay}
    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>
                  {editMode === "add"
                    ? t('newServiceTitle', 'New service')
                    : t('editServiceTitle', 'Edit service')}
                </Text>
                {editMode === "edit" && selectedService && (
                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(
                        () => deleteService(selectedService._id),
                        300,
                      );
                    }}
                  >
                    <Text style={styles.modalDeleteText}>🗑 {t('delete', 'Delete')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {svcImage ? (
                <TouchableOpacity
                  onPress={pickServiceImage}
                  style={styles.previewWrapper}
                >
                  <Image
                    source={{ uri: imgUrl(svcImage) }}
                    style={styles.preview}
                  />
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewOverlayText}>
                      {t('replaceImage', 'Replace image')} 📷
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeImgBadge}
                    onPress={() => setSvcImage("")}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.pickBtn}
                  onPress={pickServiceImage}
                >
                  <Text style={styles.pickBtnText}>📷 {t('chooseImage', 'Choose an image')}</Text>
                </TouchableOpacity>
              )}

              {svcVideo ? (
                <View style={styles.videoPreviewCard}>
                  <Text style={styles.videoPreviewTitle}>🎬 {t('selectedVideo', 'Selected video')}</Text>
                  <Text style={styles.videoPreviewSubtitle} numberOfLines={1}>
                    {isLocalAssetUri(svcVideo)
                      ? (svcVideo.split('/').pop() || 'video.mp4')
                      : svcVideo}
                  </Text>
                  <View style={styles.videoPreviewActions}>
                    <TouchableOpacity style={styles.secondaryPickBtn} onPress={pickServiceVideo}>
                      <Text style={styles.secondaryPickBtnText}>{t('edit', 'Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryPickBtnDanger} onPress={() => setSvcVideo("")}>
                      <Text style={styles.secondaryPickBtnText}>{t('removeMedia', 'Remove media')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickBtnSecondary}
                  onPress={pickServiceVideo}
                >
                  <Text style={styles.pickBtnSecondaryText}>🎬 {t('addVideo', 'Add video')}</Text>
                </TouchableOpacity>
              )}

              <TextInput
                placeholder={t('videoLinkPlaceholder', 'Video link (YouTube, Vimeo, mp4...)')}
                placeholderTextColor="#aaa"
                value={svcVideo}
                onChangeText={setSvcVideo}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                placeholder={t('serviceNamePlaceholder', 'Service name')}
                placeholderTextColor="#aaa"
                value={svcName}
                onChangeText={setSvcName}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => priceRef.current?.focus()}
                blurOnSubmit={false}
              />
              
              <TextInput
                ref={priceRef}
                placeholder={t('pricePlaceholderSimple', 'Price (e.g. 12.00)')}
                placeholderTextColor="#aaa"
                value={svcPrice}
                onChangeText={setSvcPrice}
                keyboardType="decimal-pad"
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => descriptionRef.current?.focus()}
                blurOnSubmit={false}
              />

              <TextInput
                ref={descriptionRef}
                placeholder={t('serviceDescriptionOptional', 'Service description (optional)')}
                placeholderTextColor="#aaa"
                value={svcDescription}
                onChangeText={setSvcDescription}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={saveService}
                blurOnSubmit={true}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveService}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('save', 'Save')}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
</Modal>
    </View>

      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => { setShowAuthPrompt(false); navigation.replace('Login'); }}
        onSignUp={() => { setShowAuthPrompt(false); navigation.replace('Register'); }}
        featureName="manageBookings"
      />
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F6F9" },
  scrollContent: { paddingBottom: 140 },
  restaurantRoot: { backgroundColor: '#100D13' },
  restaurantHeader: { backgroundColor: '#7026B9', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  beautyHeaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, backgroundColor: 'transparent', paddingBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowOpacity: 0, elevation: 0 },
  beautyHeaderIconBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  restaurantScrollContent: { paddingBottom: 210 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: { color: "#fff", marginTop: 12, fontWeight: "600", fontSize: 15 },

  header: {
    backgroundColor: PURPLE,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    maxWidth: 200,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Info Section
  infoSection: {
    backgroundColor: "rgba(139, 47, 201, 0.08)",
    borderLeftWidth: 4,
    borderLeftColor: PURPLE,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 18,
    width: 24,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },

  infoSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: PURPLE,
  },
  editInfoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(139, 47, 201, 0.1)",
    borderWidth: 1,
    borderColor: PURPLE,
  },
  editInfoBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: PURPLE,
  },

  carouselLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  carouselLabelText: { fontSize: 14, color: "#555", fontWeight: "600" },
  carouselCounter: { fontSize: 13, color: PURPLE, fontWeight: "700" },
  carouselImg: {
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 16,
    width,
    height: 230,
    resizeMode: "cover",
  },
  carouselMediaVideoWrap: {
    width,
    height: 230,
    paddingLeft: 16,
    paddingRight: 16,
  },
  carouselMediaVideo: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  carouselVideoPill: {
    position: "absolute",
    bottom: 12,
    left: 24,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselVideoPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  editImgBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  editImgIcon: { fontSize: 16 },
  deleteImgBtn: {
    position: "absolute",
    top: 10,
    right: 56,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteImgIcon: { fontSize: 16 },

  dots: { flexDirection: "row", justifyContent: "center", marginVertical: 10 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE_MID,
    marginHorizontal: 3,
  },
  dotActive: { width: 20, backgroundColor: PURPLE, borderRadius: 3 },

  addImgBtn: {
    backgroundColor: PURPLE,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  addImgText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: "#F3EEFF",
    borderWidth: 1,
    borderColor: "#D8CCFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
   
  },
  quickActionText: {
    color: PURPLE,
    fontWeight: "700",
    fontSize: 12,
  },
  sectorBadgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectorBadge: {
    backgroundColor: "#F3EEFF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "60%",
  },
  sectorBadgeText: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "700",
  },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    // marginBottom: 4,
    gap: 10,
  },
  restaurantTabRow: { marginTop: 4, marginBottom: 10 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  restaurantTab: { backgroundColor: '#19151D', borderColor: '#302B35', borderRadius: 10 },
  restaurantTabActive: { backgroundColor: '#EF476F', borderColor: '#EF476F' },
  restaurantTabText: { color: '#A8A1AA' },
  restaurantTabTextActive: { color: '#FFFFFF' },
  tabActive: { backgroundColor: PURPLE },
  tabActiveOutline: { borderColor: PURPLE, backgroundColor: "#fff" },
  tabText: { fontWeight: "700", fontSize: 14, color: "#888" },
  tabTextActive: { color: "#fff" },
  tabTextOutline: { color: PURPLE },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: -30,
  },
  restaurantSectionHeader: { marginBottom: 0 },
  restaurantSectionTitle: { color: '#F6F2FA' },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  restaurantGrid: { paddingBottom: 30 },
  restaurantServiceCard: { backgroundColor: '#19151D', borderWidth: 1, borderColor: '#302B35' },
  restaurantNoImage: { backgroundColor: '#242029' },
  restaurantGalleryGrid: { paddingBottom: 32 },
  restaurantEmptyState: { backgroundColor: '#19151D', borderRadius: 12, marginHorizontal: 12 },
  restaurantEmptyText: { color: '#A8A1AA' },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 36,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    borderRadius: 16,
    backgroundColor: '#111016',
    borderWidth: 1,
    borderColor: '#2D2637',
  },
  menuIntro: { marginBottom: 14 },
  menuEyebrow: { color: '#C4B5FD', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  menuTitle: { color: '#F6F2FA', fontSize: 22, fontWeight: '800', marginTop: 6 },
  menuLoading: { marginVertical: 26 },
  menuEmpty: { color: '#A9A1B3', fontSize: 13, lineHeight: 19, paddingVertical: 18 },
  menuGroup: { marginTop: 13 },
  menuSectionTitle: { color: '#C4B5FD', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  menuItem: { minHeight: 66, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2D2637' },
  menuItemImage: { width: 62, height: 62, borderRadius: 10, backgroundColor: '#211B2B' },
  menuItemCopy: { flex: 1 },
  menuItemName: { color: '#F6F2FA', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  menuItemDescription: { color: '#A9A1B3', fontSize: 11, lineHeight: 16, marginTop: 4 },
  menuItemUnavailable: { color: '#F5BD62', fontSize: 10, fontWeight: '700', marginTop: 5 },
  menuItemPrice: { color: '#D5C6FF', fontSize: 12, fontWeight: '800', paddingTop: 2 },
  menuItemPriceUnavailable: { color: '#81798C' },
  addSvcBtn: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addSvcText: { color: PURPLE, fontWeight: "700", fontSize: 13 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 50,
  },
  card: {
    width: "48%",
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  cardImg: { width: "100%", height: "100%", resizeMode: "cover" },
  noImg: {
    backgroundColor: PURPLE_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  noImgIcon: { fontSize: 32 },
  videoBadge: {
    position: "absolute",
    bottom: 44,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  editBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  deleteBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  serviceName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  servicePrice: { color: PURPLE_MID, fontSize: 13, marginTop: 2 },

  emptyState: { width: "100%", alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: "#aaa", textAlign: "center", fontSize: 14 },

  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 4,
    gap: 6,
  },
  galleryItemWrapper: { position: "relative" },
  dishList: { paddingHorizontal: 12, marginTop: 14, gap: 12 },
  dishFilterRow: { gap: 8 },
  dishFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#1c1c1e",
  },
  dishFilterChipActive: { backgroundColor: "#ff3b5c" },
  dishFilterText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  dishCard: {
    width: "48.5%",
    backgroundColor: "#1c1c1e",
    borderRadius: 18,
    overflow: "hidden",
  },
  dishCardImg: { width: "100%", height: 130, resizeMode: "cover" },
  dishCardBody: { padding: 10, gap: 4 },
  dishSearch: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#1c1c1e",
    color: "#fff",
    fontSize: 14,
  },
  dishGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  dishCardName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dishCardCategory: { color: "#aaa", fontSize: 11, marginTop: 2 },
  dishCardDesc: { color: "#ccc", fontSize: 12, marginTop: 4 },
  dishCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  dishCardPrice: { color: "#ff3b5c", fontSize: 15, fontWeight: "800" },
  dishLikeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  dishLikeIcon: { fontSize: 18 },
  dishLikeCount: { color: "#fff", fontSize: 13, fontWeight: "600" },
  galleryImg: {
    width: (width - 36) / 3,
    height: (width - 36) / 3,
    borderRadius: 10,
    resizeMode: "cover",
  },
  galleryEditBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryDeleteBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 6,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryViewerRoot: {
    flex: 1,
    backgroundColor: "#05070B",
  },
  galleryViewerHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 36,
  },
  galleryViewerCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 16,
  },
  galleryViewerCloseText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  galleryViewerCounter: {
    color: "#E5E7EB",
    fontWeight: "700",
    fontSize: 13,
  },
  galleryViewerSlide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  galleryViewerImage: {
    width: "100%",
    height: "86%",
    resizeMode: "contain",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#222" },
  sectorHint: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 10,
  },
  sectorList: {
    maxHeight: 370,
    marginBottom: 6,
  },
  sectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  sectorChip: {
    width: "48.5%",
    minHeight: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sectorChipSelected: {
    borderColor: PURPLE,
    backgroundColor: "#F3EEFF",
  },
  sectorChipIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectorChipText: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  sectorChipTextSelected: {
    color: PURPLE,
  },
  sectorChipCheck: {
    position: "absolute",
    top: 6,
    right: 8,
    color: PURPLE,
    fontWeight: "800",
  },
  modalDeleteBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modalDeleteText: { color: RED, fontWeight: "700", fontSize: 13 },

  pickBtn: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  pickBtnText: { color: PURPLE, fontWeight: "700", fontSize: 14 },
  pickBtnSecondary: {
    borderWidth: 1,
    borderColor: PURPLE_MID,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#F8F6FF",
  },
  pickBtnSecondaryText: { color: PURPLE, fontWeight: "700", fontSize: 13 },
  previewWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    height: 160,
  },
  preview: { width: "100%", height: "100%", resizeMode: "cover" },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 8,
    alignItems: "center",
  },
  previewOverlayText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  removeImgBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 14,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 12,
    marginBottom: 14,
  },
  videoPreviewTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },
  videoPreviewSubtitle: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
  },
  videoPreviewActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  secondaryPickBtn: {
    flex: 1,
    backgroundColor: "#EDE9FE",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryPickBtnDanger: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryPickBtnText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cancelBtn: { marginTop: 14, alignItems: "center" },
  cancelText: { color: "#888", fontSize: 14 },

  appreciationFloatingBadge: {
    position: "absolute",
    zIndex: 60,
    left: 20,
    top: 189,
    backgroundColor: "rgba(20,20,24,0.88)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...Platform.select({
      ios: {
        // shadowColor: "#000",
        // shadowOpacity: 0.25,
        // shadowOffset: { width: 0, height: 4 },
        // shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  appreciationFloatingTitle: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  appreciationFloatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appreciationFloatingValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  appreciationFloatingDivider: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
  },
});