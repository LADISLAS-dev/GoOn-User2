import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
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
import api, { getCompanyById } from "../services/api";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";
import AuthPromptModal from '../components/AuthPromptModal';
import { auth } from '../services/firebase';
import { API_URL, APP_DOWNLOAD_URLS } from '../env';
import { isLocalAssetUri, resolveAvatarUri } from "../utils/profileUtils";
import { getCategoryLabel } from "../utils/categoryLabels";
import { LayoutAnimation, UIManager } from "react-native";
import { Animated } from "react-native";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";


if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

const PURPLE = "#8B2FC9"; 
const PURPLE_LIGHT = "#EDE9FE";
const PURPLE_MID = "#C4B5FD";
const RED = "#EF4444";
const GREEN = "#16A34A";

const CATEGORIES = [
  { id: "1", icon: "💻" },
  { id: "2", icon: "🍽️" },
  { id: "3", icon: "💄" },
  { id: "4", icon: "🏥" },
  { id: "5", icon: "📚" },
  { id: "6", icon: "💰" },
  { id: "7", icon: "🏠" },
  { id: "8", icon: "🚗" },
  { id: "9", icon: "🏨" },
  { id: "10", icon: "🎭" },
  { id: "11", icon: "⚽" },
  { id: "12", icon: "🏭" },
  { id: "13", icon: "🌾" },
  { id: "14", icon: "🔨" },
  { id: "15", icon: "🛍️" },
  { id: "16", icon: "⚖️" },
  { id: "17", icon: "💼" },
  { id: "18", icon: "📢" },
  { id: "19", icon: "📦" },
  { id: "20", icon: "⚡" },
  { id: "21", icon: "📡" },
  { id: "22", icon: "📰" },
  { id: "23", icon: "👥" },
  { id: "24", icon: "♻️" },
  { id: "25", icon: "🎨" },
  { id: "26", icon: "🐾" },
  { id: "27", icon: "🚙" },
  { id: "28", icon: "📷" },
  { id: "29", icon: "✈️" },
  { id: "30", icon: "🎉" },
  { id: "31", icon: "🛡️" },
  { id: "32", icon: "🔧" },
  { id: "33", icon: "⚙️" },
  { id: "34", icon: "🧹" },
  { id: "35", icon: "🌿" },
  { id: "36", icon: "🖨️" },
  { id: "37", icon: "💾" },
  { id: "38", icon: "🎯" },
  { id: "39", icon: "🌐" },
  { id: "40", icon: "📝" },
];

const normalizeCompanyCategories = (company) => {
  const fromArray = Array.isArray(company?.categoryIds)
    ? company.categoryIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const fallback = String(company?.categoryId || "").trim();
  const merged = [...new Set([...(fallback ? [fallback] : []), ...fromArray])];
  return merged;
};

const getCompanySetupState = (company) => {
  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  const hasContactInfo = Boolean(
    String(company?.phone || '').trim() ||
    String(company?.email || '').trim() ||
    String(company?.website || '').trim()
  );

  const requiredSteps = [
    {
      key: 'carousel',
      icon: '🖼️',
      current: carouselCount,
      target: 1,
      complete: carouselCount >= 1,
    },
    {
      key: 'services',
      icon: '🛠️',
      current: servicesCount,
      target: 2,
      complete: servicesCount >= 2,
    },
  ];

  const recommendedSteps = [
    {
      key: 'contact',
      icon: '📞',
      complete: hasContactInfo,
    },
  ];

  const completedRequiredCount = requiredSteps.filter((step) => step.complete).length;
  const totalRequiredCount = requiredSteps.length;
  const progress = totalRequiredCount ? completedRequiredCount / totalRequiredCount : 0;
  const isReadyToValidate = completedRequiredCount === totalRequiredCount;
  const isValidated = Boolean(company?.profileValidatedAt) && isReadyToValidate;

  return {
    carouselCount,
    servicesCount,
    hasContactInfo,
    requiredSteps,
    recommendedSteps,
    completedRequiredCount,
    totalRequiredCount,
    progress,
    isReadyToValidate,
    isValidated,
    status: isValidated ? 'validated' : isReadyToValidate ? 'ready' : 'draft',
  };
};

const getOwnerCompanyStatus = (company) => {
  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  const meetsRequiredContent = carouselCount >= 1 && servicesCount >= 2;
  const hasValidatedMarker = Boolean(company?.profileValidatedAt) || company?.setupStatus === 'ready';
  return meetsRequiredContent && hasValidatedMarker ? 'validated' : 'draft';
};

const isCompanyPubliclyVisible = (company) => {
  if (!company || typeof company !== 'object') return false;

  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  const meetsRequiredContent = carouselCount >= 1 && servicesCount >= 2;

  if (!meetsRequiredContent) return false;

  const hasExplicitSetupState =
    typeof company?.setupStatus !== 'undefined' ||
    typeof company?.profileValidatedAt !== 'undefined';

  if (!hasExplicitSetupState) return true;

  return Boolean(company?.profileValidatedAt) || company?.setupStatus === 'ready';
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

const mergePersistedSetupState = (remoteCompany, cachedCompany) => {
  if (!remoteCompany) return remoteCompany;
  if (!cachedCompany) return remoteCompany;

  const remoteHasSetupState =
    typeof remoteCompany.setupStatus !== 'undefined' ||
    typeof remoteCompany.profileValidatedAt !== 'undefined';

  if (remoteHasSetupState) {
    return remoteCompany;
  }

  return {
    ...remoteCompany,
    ...(cachedCompany.setupStatus ? { setupStatus: cachedCompany.setupStatus } : {}),
    ...(cachedCompany.profileValidatedAt ? { profileValidatedAt: cachedCompany.profileValidatedAt } : {}),
  };
};

const isSetupPatchUnsupported = (error) =>
  error?.response?.status === 400 && error?.response?.data?.code === 'NO_MUTABLE_FIELDS';

const getApiErrorMessage = (error, fallback) => {
  const serverMessage = String(
    error?.response?.data?.error || error?.response?.data?.message || ''
  ).trim();
  return serverMessage || fallback;
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
const pickImage = async (tr) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === "denied") {
    Alert.alert(
      tr('permissionRequired', 'Permission requise'),
      tr('openPhotosSettings', 'Go to Settings -> [App] -> Photos and allow access.'),
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
    Alert.alert(tr('error', 'Erreur'), tr('openGalleryFailed', "Impossible d'ouvrir la galerie."));
    return null;
  }
};

const pickVideo = async (tr) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === "denied") {
    Alert.alert(
      tr('permissionRequired', 'Permission requise'),
      tr('openPhotosSettings', 'Go to Settings -> [App] -> Photos and allow access.'),
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
    Alert.alert(tr('error', 'Erreur'), tr('openVideoGalleryFailed', "Impossible d'ouvrir la galerie video."));
    return null;
  }
};

// ─── helper URL ───────────────────────────────────────────────────────────────
const imgUrl = (src) => {
  return resolveAvatarUri(src, API_URL) || null;
};

const normalizeVideoValue = (value = "") => String(value || "").trim();

const SERVICE_MODAL_UI = {
  en: {
    changeImage: 'Change image',
    videoSelected: 'Selected video',
    changeLabel: 'Change',
    removeLabel: 'Remove',
  },
  fr: {
    changeImage: "Changer l'image",
    videoSelected: 'Video selectionnee',
    changeLabel: 'Changer',
    removeLabel: 'Retirer',
  },
  es: {
    changeImage: 'Cambiar imagen',
    videoSelected: 'Video seleccionado',
    changeLabel: 'Cambiar',
    removeLabel: 'Quitar',
  },
  pt: {
    changeImage: 'Alterar imagem',
    videoSelected: 'Video selecionado',
    changeLabel: 'Alterar',
    removeLabel: 'Remover',
  },
  zh: {
    changeImage: '更换图片',
    videoSelected: '已选视频',
    changeLabel: '更换',
    removeLabel: '移除',
  },
  hi: {
    changeImage: 'छवि बदलें',
    videoSelected: 'चयनित वीडियो',
    changeLabel: 'बदलें',
    removeLabel: 'हटाएँ',
  },
  ar: {
    changeImage: 'تغيير الصورة',
    videoSelected: 'الفيديو المحدد',
    changeLabel: 'تغيير',
    removeLabel: 'إزالة',
  },
  bn: {
    changeImage: 'ছবি পরিবর্তন করুন',
    videoSelected: 'নির্বাচিত ভিডিও',
    changeLabel: 'পরিবর্তন',
    removeLabel: 'সরান',
  },
  ru: {
    changeImage: 'Изменить изображение',
    videoSelected: 'Выбранное видео',
    changeLabel: 'Изменить',
    removeLabel: 'Удалить',
  },
  ja: {
    changeImage: '画像を変更',
    videoSelected: '選択済みの動画',
    changeLabel: '変更',
    removeLabel: '削除',
  },
  de: {
    changeImage: 'Bild ändern',
    videoSelected: 'Ausgewähltes Video',
    changeLabel: 'Ändern',
    removeLabel: 'Entfernen',
  },
  id: {
    changeImage: 'Ubah gambar',
    videoSelected: 'Video terpilih',
    changeLabel: 'Ubah',
    removeLabel: 'Hapus',
  },
  ur: {
    changeImage: 'تصویر تبدیل کریں',
    videoSelected: 'منتخب ویڈیو',
    changeLabel: 'تبدیل کریں',
    removeLabel: 'ہٹائیں',
  },
};

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
  const { t, language, activeLanguage } = useLanguage();
  const serviceModalUi = SERVICE_MODAL_UI[language] || SERVICE_MODAL_UI.en;
  const tr = useCallback((key, fallback) => t(key, fallback), [t]);
  const companyId = route?.params?.companyId;
  const currentUserId = route?.params?.currentUserId ?? user?._id;
  const onboardingFlow = route?.params?.onboardingFlow === true;

  const [company, setCompany] = useState(null);
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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

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
  const [validatingProfile, setValidatingProfile] = useState(false);

  const priceRef = useRef(null);
  const descriptionRef = useRef(null);
  const flatListRef = useRef(null);
  const galleryViewerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const carouselImages = company?.carouselImages || [];
  const galleryImages = company?.galleryImages || [];
  const services = company?.services || [];
  const localizedCategories = useMemo(
    () => CATEGORIES.map((cat) => ({ ...cat, label: getCategoryLabel(cat.id, activeLanguage) })),
    [language]
  );
  const selectedCategoryLabels = selectedCategoryIds
    .map((id) => getCategoryLabel(id, activeLanguage))
    .filter(Boolean);
  const ownerId =
    typeof company?.ownerId === "object"
      ? company?.ownerId?._id
      : company?.ownerId;
  const isOwner =
    !!company &&
    !!currentUserId &&
    String(ownerId || "") === String(currentUserId);
  const canEdit = isOwner;
  const setupState = useMemo(() => getCompanySetupState(company), [company]);
  const ownerCompanyStatus = useMemo(() => getOwnerCompanyStatus(company), [company]);
  const canViewCompany = useMemo(() => {
    if (!company) return false;
    return isOwner || isCompanyPubliclyVisible(company);
  }, [company, isOwner]);
  const shouldShowSetupGuide = canEdit && !setupState.isValidated;
  const shouldShowSetupSuccess = canEdit && onboardingFlow && setupState.isValidated;

  const ensureCanEdit = () => {
    if (canEdit) return true;
    Alert.alert(
      tr('accessDeniedTitle', 'Acces refuse'),
      tr('onlyOwnCompanyEdit', 'Vous ne pouvez modifier que vos entreprises.')
    );
    return false;
  };
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
          const mergedData = mergePersistedSetupState(data, cachedData);
          const dataWithUser = { ...mergedData, _userId: currentUserId };
          setCompany(dataWithUser);
          saveLocal(companyId, currentUserId, dataWithUser);
        }
      } catch (e) {
        if (!cachedData && isMounted) {
          Alert.alert(tr('error', 'Erreur'), tr('myCompanyLoadError', 'Impossible de charger les donnees.'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [companyId, currentUserId]);

  // ── get user location and calculate distance ───────────────────────────────────
  useEffect(() => {
    if (!company?.latitude || !company?.longitude) return;

    let isMounted = true;

    (async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === "granted") {
          const userLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          if (isMounted && userLocation?.coords) {
            const dist = calculateDistance(
              userLocation.coords.latitude,
              userLocation.coords.longitude,
              company.latitude,
              company.longitude
            );
            setDistance(parseFloat(dist));
          }
        }
      } catch (err) {
        console.log("Location error:", err);
      } finally {
        if (isMounted) setLocationLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [company?.latitude, company?.longitude]);

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

  useEffect(() => {
    if (!company?.profileValidatedAt || setupState.isReadyToValidate) return;

    applyUpdate((prev) => {
      if (!prev?.profileValidatedAt) return prev;
      return {
        ...prev,
        profileValidatedAt: null,
        setupStatus: 'draft',
      };
    });

    patchCompany(companyId, {
      profileValidatedAt: null,
      setupStatus: 'draft',
    }).catch((error) => {
      if (isSetupPatchUnsupported(error)) {
        return;
      }
    });
  }, [company?.profileValidatedAt, companyId, setupState.isReadyToValidate, applyUpdate]);

  const onShare = async () => {
    try {
      const downloadLines = [APP_DOWNLOAD_URLS.universal, APP_DOWNLOAD_URLS.ios, APP_DOWNLOAD_URLS.android].filter(Boolean);
      const baseMessage = `${tr('shareCompanyMessage', 'Decouvre cette entreprise sur notre app')} : ${company?.name} 🚀`;
      const message = downloadLines.length ? `${baseMessage}\n\n${downloadLines.join('\n')}` : baseMessage;

      await Share.share({
        message,
        title: company?.name,
      });
    } catch (_) {}
  };

  const handleBackPress = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('ProHome');
  }, [navigation]);

  const handleSetupStepPress = (stepKey) => {
    if (stepKey === 'carousel') {
      addCarouselMedia();
      return;
    }

    if (stepKey === 'services') {
      setActiveTab('services');
      openAdd();
      return;
    }

    if (stepKey === 'contact') {
      openEditInfoModal();
    }
  };

  const validateCompanyProfile = async () => {
    if (!ensureCanEdit()) return;

    if (!setupState.isReadyToValidate) {
      Alert.alert(
        tr('companySetupIncompleteTitle', 'Completion required'),
        tr('companySetupFooterHint', 'Complete required elements before validating the company.')
      );
      return;
    }

    const previousProfileValidatedAt = company?.profileValidatedAt || null;
    const normalizedCategoryIds = normalizeCompanyCategories(company);
    const primaryCategoryId = String(company?.categoryId || normalizedCategoryIds[0] || '').trim();

    const localCarouselImages = Array.isArray(company?.carouselImages)
      ? company.carouselImages.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const localGalleryImages = Array.isArray(company?.galleryImages)
      ? company.galleryImages.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    let remoteCarouselImages = [];
    let remoteGalleryImages = [];
    try {
      const latestCompany = await getCompanyById(companyId);
      remoteCarouselImages = Array.isArray(latestCompany?.carouselImages)
        ? latestCompany.carouselImages.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      remoteGalleryImages = Array.isArray(latestCompany?.galleryImages)
        ? latestCompany.galleryImages.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    } catch (_) {
      // Best effort only: continue with local state if refresh fails.
    }

    const normalizedCarouselImages = localCarouselImages.length
      ? localCarouselImages
      : remoteCarouselImages;
    const normalizedGalleryImages = localGalleryImages.length
      ? localGalleryImages
      : remoteGalleryImages;
    const payload = {
      setupStatus: 'ready',
      profileValidatedAt: new Date().toISOString(),
      ...(primaryCategoryId ? { categoryId: primaryCategoryId } : {}),
      ...(normalizedCategoryIds.length ? { categoryIds: normalizedCategoryIds } : {}),
      ...(normalizedCarouselImages.length ? { carouselImages: normalizedCarouselImages } : {}),
      ...(normalizedGalleryImages.length ? { galleryImages: normalizedGalleryImages } : {}),
    };

    setValidatingProfile(true);
    applyUpdate((prev) => ({
      ...prev,
      ...payload,
    }));

    try {
      await patchCompany(companyId, payload);

      // Best effort refresh: the PATCH is the source of truth for save success.
      // Do not fail validation on transient GET errors right after the update.
      try {
        const refreshedCompany = await getCompanyById(companyId);
        if (refreshedCompany) {
          applyUpdate((prev) => ({
            ...prev,
            ...refreshedCompany,
          }));
        }
      } catch (refreshError) {
        console.warn('validateCompanyProfile refresh skipped:', refreshError?.message || refreshError);
      }
    } catch (error) {
      if (!isSetupPatchUnsupported(error)) {
        applyUpdate((prev) => ({
          ...prev,
          setupStatus: previousProfileValidatedAt ? 'ready' : 'draft',
          profileValidatedAt: previousProfileValidatedAt,
        }));
        Alert.alert(
          tr('error', 'Erreur'),
          tr('saveError', 'Impossible de valider la fiche entreprise pour le moment.')
        );
        return;
      }
    } finally {
      setValidatingProfile(false);
    }

    Alert.alert(
      tr('companyReadyTitle', 'Company ready'),
      tr('companyReadyBody', 'The company profile is now complete and ready to be presented professionally.'),
      [
        {
          text: tr('continueAction', 'Continuer'),
          onPress: () => {
            if (!onboardingFlow) return;
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProHome' }],
            });
          },
        },
      ]
    );
  };

  const toggleSector = (id) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id)
        ? prev.filter((currentId) => currentId !== id)
        : [...prev, id]
    ));
  };

  const saveSectors = async () => {
    if (!selectedCategoryIds.length) {
      Alert.alert(tr('requiredFieldTitle', 'Champ requis'), tr('selectAtLeastOneSector', 'Selectionne au moins un secteur.'));
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
      Alert.alert(tr('error', 'Erreur'), tr('updateSectorError', 'Impossible de modifier les secteurs.'));
    } finally {
      setSavingCategories(false);
    }
  };

  // ─── EDIT INFO ────────────────────────────────────────────────────────────────
  const openEditInfoModal = () => {
    if (!ensureCanEdit()) return;
    setEditPhone(company?.phone || "");
    setEditEmail(company?.email || "");
    setEditLocation(company?.location || "");
    setEditWebsite(company?.website || "");
    setEditInfoModalVisible(true);
  };

  const saveInfoChanges = async () => {
    if (!ensureCanEdit()) return;
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
      Alert.alert(tr('success', 'Succes'), tr('profileUpdated', 'Informations mises a jour.'));
    } catch (error) {
      applyUpdate(() => previousCompany);
      Alert.alert(tr('error', 'Erreur'), tr('saveError', 'Impossible de mettre a jour les informations.'));
    } finally {
      setEditingSaving(false);
    }
  };

  // ─── CAROUSEL SYNC ────────────────────────────────────────────────────────────────
  const syncCarousel = async (newImages) => {
    const previous = company?.carouselImages || [];
    applyUpdate((p) => ({ ...p, carouselImages: newImages }));
    try {
      await patchCompany(companyId, {
        carouselImages: newImages,
      });
    } catch (error) {
      applyUpdate((p) => ({ ...p, carouselImages: previous }));
      Alert.alert(
        tr('error', 'Erreur'),
        getApiErrorMessage(error, tr('galleryUpdateError', 'Impossible de mettre a jour les images.'))
      );
    }
  };

  // ─── ADD CAROUSEL ────────────────────────────────────────────────────────
  const addCarouselImage = async () => {
    if (!ensureCanEdit()) return;
    const localUri = await pickImage(tr);
    if (!localUri) return;

    const current = company.carouselImages || [];
    if (current.length >= 6)
       {
      Alert.alert(tr('limitReachedTitle', 'Limite atteinte'), tr('carouselLimitImages', 'Le carousel est limite a 6 images.'));
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
      Alert.alert(tr('error', 'Erreur'), tr('uploadDeviceImageError', "Impossible d'uploader l'image."));
    } finally {
      setUploading(false);
    }
  };

  const addCarouselVideoFromDevice = async () => {
    if (!ensureCanEdit()) return;
    const localUri = await pickVideo(tr);
    if (!localUri) return;

    const current = company.carouselImages || [];
    if (current.length >= 6) {
      Alert.alert(tr('limitReachedTitle', 'Limite atteinte'), tr('carouselLimitMedia', 'Le carousel est limite a 6 medias.'));
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
      Alert.alert(tr('error', 'Erreur'), tr('videoUploadError', "Impossible d'uploader la video."));
    } finally {
      setUploading(false);
    }
  };

  const openCarouselVideoLinkModal = () => {
    if (!ensureCanEdit()) return;
    setCarouselVideoLinkInput("");
    setCarouselVideoLinkModalVisible(true);
  };

  const addCarouselVideoFromLink = async () => {
    if (!ensureCanEdit()) return;
    const current = company.carouselImages || [];
    if (current.length >= 6) {
      Alert.alert(tr('limitReachedTitle', 'Limite atteinte'), tr('carouselLimitMedia', 'Le carousel est limite a 6 medias.'));
      return;
    }

    const normalized = normalizeVideoValue(carouselVideoLinkInput);
    if (!normalized) {
      Alert.alert(tr('requiredFieldTitle', 'Lien requis'), tr('validVideoLinkRequired', 'Ajoute un lien video valide.'));
      return;
    }

    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      Alert.alert(tr('requiredFieldTitle', 'Lien invalide'), tr('videoLinkMustStartHttp', 'Le lien doit commencer par http:// ou https://'));
      return;
    }

    if (!isVideoMedia(normalized)) {
      Alert.alert(tr('requiredFieldTitle', 'Lien video invalide'), tr('videoLinkInvalidFormat', 'Utilise un lien YouTube, Vimeo ou un lien direct vers un fichier video.'));
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
      Alert.alert(tr('error', 'Erreur'), tr('addVideoLinkFailed', "Impossible d'ajouter le lien video."));
    }
  };

  const addCarouselMedia = () => {
    if (!ensureCanEdit()) return;
    Alert.alert(tr('addToCarousel', 'Ajouter au carousel'), tr('chooseMediaType', 'Choisis le type de media'), [
      { text: tr('photo', 'Photo'), onPress: addCarouselImage },
      { text: tr('videoFromGallery', 'Video (galerie)'), onPress: addCarouselVideoFromDevice },
      { text: tr('videoLink', 'Lien video'), onPress: openCarouselVideoLinkModal },
      { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
    ]);
  };

  const replaceCarouselImage = async (idx) => {
    if (!ensureCanEdit()) return;
    const localUri = await pickImage(tr);
    if (!localUri) return;
    setUploading(true);
    try {
      const serverUrl = await uploadImage(companyId, localUri);
      const newImages = (company.carouselImages || []).map((img, i) =>
        i === idx ? serverUrl : img,
      );
      await syncCarousel(newImages);
    } catch (_) {
      Alert.alert(tr('error', 'Erreur'), tr('uploadDeviceImageError', "Impossible d'uploader l'image."));
    } finally {
      setUploading(false);
    }
  };

  const deleteCarouselImage = (idx) => {
    if (!ensureCanEdit()) return;
    Alert.alert(tr('delete', 'Supprimer'), tr('deleteImageConfirm', 'Supprimer cette image ?'), [
      { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
      {
        text: tr('delete', 'Supprimer'),
        style: "destructive",
        onPress: () => {
          syncCarousel(
            (company.carouselImages || []).filter((_, i) => i !== idx),
          );
          setCarouselIndex(Math.max(0, idx - 1));
        },
      },
    ]);
  };

  const editCarouselImage = (idx) => {
    if (!ensureCanEdit()) return;
    Alert.alert(tr('photo', 'Image'), tr('chooseAction', 'Choisissez une action'), [
      { text: tr('replaceLabel', 'Remplacer'), onPress: () => replaceCarouselImage(idx) },
      {
        text: tr('delete', 'Supprimer'),
        style: "destructive",
        onPress: () => deleteCarouselImage(idx),
      },
      { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
    ]);
  };

  // ─── GALLERY SYNC ────────────────────────────────────────────────────────
  const syncGallery = async (newImages) => {
    if (!ensureCanEdit()) return;
    const previous = company?.galleryImages || [];
    applyUpdate((p) => ({ ...p, galleryImages: newImages }));
    try {
      await patchCompany(companyId, { galleryImages: newImages });
    } catch (error) {
      applyUpdate((p) => ({ ...p, galleryImages: previous }));
      Alert.alert(tr('error', 'Erreur'), tr('galleryUpdateError', 'Impossible de mettre a jour la galerie.'));
      throw error;
    }
  };

  // ─── ADD GALLERY ─────────────────────────────────────────────────────────
  const addGalleryImage = async () => {
    if (!ensureCanEdit()) return;
    const uri = await pickImage(tr);
    if (!uri) return;

    setUploading(true);
    try {
      const url = await uploadImage(companyId, uri);
      const current = company?.galleryImages || [];
      await syncGallery([...current, url]);
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === 'MEDIA_PERSISTENCE_NOT_CONFIGURED') {
        Alert.alert(
          tr('error', 'Erreur'),
          tr(
            'uploadFailed',
            'Le stockage persistant des images n\'est pas configure. Contactez l\'administrateur pour activer Cloudinary.'
          )
        );
      } else {
        Alert.alert(tr('error', 'Erreur'), tr('uploadDeviceImageError', "Impossible d'uploader l'image."));
      }
    } finally {
      setUploading(false);
    }
  };

  // ─── DELETE GALLERY ───────────────────────────────────────────────────
  const deleteGallery = (i) => {
    if (!ensureCanEdit()) return;
    const newImages = (company?.galleryImages || []).filter(
      (_, idx) => idx !== i,
    );
    syncGallery(newImages);
  };

  // ─── REPLACE GALLERY ───────────────────────────────────────────────────
  const replaceGalleryImage = async (idx) => {
    if (!ensureCanEdit()) return;
    const uri = await pickImage(tr);
    if (!uri) return;

    setUploading(true);

    try {
      const url = await uploadImage(companyId, uri);
      const current = company?.galleryImages || [];
      const newGallery = current.map((img, i) => (i === idx ? url : img));
      await syncGallery(newGallery);
    } catch (e) {
      Alert.alert(tr('error', 'Erreur'), tr('replaceImageFailed', "Impossible de remplacer l'image"));
    } finally {
      setUploading(false);
    }
  };

  const editGalleryImage = (idx) => {
    if (!ensureCanEdit()) return;
    Alert.alert(tr('photo', 'Image'), tr('chooseAction', 'Choisissez une action'), [
      { text: tr('replaceLabel', 'Remplacer'), onPress: () => replaceGalleryImage(idx) },
      {
        text: tr('delete', 'Supprimer'),
        style: "destructive",
        onPress: () => deleteGallery(idx),
      },
      { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
    ]);
  };

  const openGalleryViewer = (index) => {
    if (!galleryImages.length) return;
    const safeIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
    setGalleryViewerIndex(safeIndex);
    setGalleryViewerVisible(true);
  };

  // ─── SERVICES ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    if (!ensureCanEdit()) return;
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
    if (!ensureCanEdit()) return;
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
    if (!ensureCanEdit()) return;
    const uri = await pickImage(tr);
    if (uri) {
      setSvcImage(uri);
    }
  };

  const pickServiceVideo = async () => {
    if (!ensureCanEdit()) return;
    const uri = await pickVideo(tr);
    if (uri) {
      setSvcVideo(uri);
    }
  };

  const saveService = async () => {
    if (!ensureCanEdit()) return;
    Keyboard.dismiss();
    if (!svcName.trim())
      return Alert.alert(tr('requiredFieldTitle', 'Champ requis'), tr('companyNameRequired', 'Le nom est obligatoire.'));

    const trimmedPrice = String(svcPrice || '').trim();
    const priceValue = trimmedPrice ? parseFloat(trimmedPrice) : 0;
    // Le prix est optionnel. S'il est fourni, il doit être un nombre positif.
    if (trimmedPrice && (Number.isNaN(priceValue) || priceValue < 0)) {
      return Alert.alert(tr('error', 'Erreur'), tr('servicePriceInvalid', 'Le prix doit etre un nombre positif valide.'));
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
          getApiErrorMessage(error, tr('saveError', 'Impossible de valider la fiche entreprise pour le moment.'))
      Alert.alert(tr('error', 'Erreur'), tr('serviceSaveError', 'Impossible de sauvegarder le service.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteService = (id) => {
    if (!ensureCanEdit()) return;
    Alert.alert(tr('delete', 'Supprimer'), tr('deleteServiceConfirm', 'Supprimer ce service ?'), [
      { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
      {
        text: tr('delete', 'Supprimer'),
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
            Alert.alert(tr('error', 'Erreur'), tr('deleteServiceError', 'Impossible de supprimer le service.'));
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
        <Text>{tr('companyNotFound', 'Entreprise introuvable')}</Text>
      </View>
    );
  }

  if (!canViewCompany) {
    return (
      <View style={styles.center}>
        <Text>{tr('companyNotFound', 'Entreprise introuvable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* HEADER */}
      <SafeAreaView style={styles.header} edges={["top"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBackPress}
          >
            <Text style={styles.iconText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {company?.name}
            </Text>
            {canEdit && (
              <View
                style={[
                  styles.headerStatusBadge,
                  ownerCompanyStatus === 'draft' ? styles.headerStatusBadgeDraft : styles.headerStatusBadgeValidated,
                ]}
              >
                <Text
                  style={[
                    styles.headerStatusBadgeText,
                    ownerCompanyStatus === 'draft' ? styles.headerStatusBadgeTextDraft : styles.headerStatusBadgeTextValidated,
                  ]}
                >
                  {ownerCompanyStatus === 'draft'
                    ? tr('companyStatusDraft', 'Brouillon')
                    : tr('companyStatusValidated', 'Validee')}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={onShare}>
            <Text style={styles.iconText}>⤴</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Spinner upload global */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadText}>{tr('uploadingLabel', 'Upload en cours...')}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {shouldShowSetupGuide && (
          <View style={styles.setupCard}>
            <View style={styles.setupHeaderRow}>
              <View style={styles.setupHeaderCopy}>
                <Text style={styles.setupEyebrow}>{tr('companySetupEyebrow', 'PROFILE SETUP')}</Text>
                <Text style={styles.setupTitle}>{tr('companySetupTitle', 'Finalize your company page')}</Text>
                <Text style={styles.setupSubtitle}>
                  {tr(
                    'companySetupSubtitle',
                    'Create a polished first impression by completing the required elements before validation.'
                  )}
                </Text>
              </View>
              <View style={[
                styles.setupStatusBadge,
                setupState.status === 'ready' && styles.setupStatusBadgeReady,
              ]}>
                <Text style={styles.setupStatusValue}>
                  {setupState.completedRequiredCount}/{setupState.totalRequiredCount}
                </Text>
                <Text style={styles.setupStatusLabel}>
                  {setupState.status === 'ready'
                    ? tr('companySetupReady', 'Ready')
                    : tr('companySetupDraft', 'Draft')}
                </Text>
              </View>
            </View>

            <View style={styles.setupProgressTrack}>
              <View style={[styles.setupProgressFill, { width: `${Math.max(8, Math.round(setupState.progress * 100))}%` }]} />
            </View>

            <View style={styles.setupStepsList}>
              {setupState.requiredSteps.map((step) => (
                <TouchableOpacity
                  key={step.key}
                  style={styles.setupStepCard}
                  activeOpacity={0.85}
                  onPress={() => handleSetupStepPress(step.key)}
                >
                  <View style={styles.setupStepIconWrap}>
                    <Text style={styles.setupStepIcon}>{step.icon}</Text>
                  </View>
                  <View style={styles.setupStepCopy}>
                    <View style={styles.setupStepTitleRow}>
                      <Text style={styles.setupStepTitle}>
                        {step.key === 'carousel'
                          ? tr('companySetupCarouselTitle', 'Add carousel media')
                          : tr('companySetupServicesTitle', 'Add services')}
                      </Text>
                      <View style={styles.setupRequiredPill}>
                        <Text style={styles.setupRequiredPillText}>{tr('requiredLabel', 'Required')}</Text>
                      </View>
                    </View>
                    <Text style={styles.setupStepDescription}>
                      {step.key === 'carousel'
                        ? tr('companySetupCarouselBody', 'At least one image or video in the carousel is required.')
                        : tr('companySetupServicesBody', 'Add at least two clear services with pricing to build trust quickly.')}
                    </Text>
                    <Text style={[styles.setupStepMeta, step.complete && styles.setupStepMetaDone]}>
                      {step.complete
                        ? tr('companySetupDone', 'Completed')
                        : `${step.current}/${step.target} ${tr('companySetupAdded', 'added')}`}
                    </Text>
                  </View>
                  <Text style={[styles.setupStepArrow, step.complete && styles.setupStepArrowDone]}>
                    {step.complete ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>
              ))}

              {setupState.recommendedSteps.map((step) => (
                <TouchableOpacity
                  key={step.key}
                  style={styles.setupStepCardSoft}
                  activeOpacity={0.85}
                  onPress={() => handleSetupStepPress(step.key)}
                >
                  <View style={styles.setupStepIconWrapSoft}>
                    <Text style={styles.setupStepIcon}>{step.icon}</Text>
                  </View>
                  <View style={styles.setupStepCopy}>
                    <View style={styles.setupStepTitleRow}>
                      <Text style={styles.setupStepTitle}>{tr('companySetupContactTitle', 'Add contact details')}</Text>
                      <View style={styles.setupRecommendedPill}>
                        <Text style={styles.setupRecommendedPillText}>{tr('recommendedLabel', 'Recommended')}</Text>
                      </View>
                    </View>
                    <Text style={styles.setupStepDescription}>
                      {tr('companySetupContactBody', 'Phone, email or website help customers contact you faster.')}
                    </Text>
                    <Text style={[styles.setupStepMeta, step.complete && styles.setupStepMetaDone]}>
                      {step.complete ? tr('companySetupDone', 'Completed') : tr('companySetupOptionalHint', 'Optional but strongly recommended')}
                    </Text>
                  </View>
                  <Text style={[styles.setupStepArrow, step.complete && styles.setupStepArrowDone]}>
                    {step.complete ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.setupPrimaryBtn,
                (!setupState.isReadyToValidate || validatingProfile) && styles.setupPrimaryBtnDisabled,
              ]}
              onPress={validateCompanyProfile}
              disabled={!setupState.isReadyToValidate || validatingProfile}
              activeOpacity={0.9}
            >
              <Text style={styles.setupPrimaryBtnText}>
                {validatingProfile
                  ? tr('validatingCompanyLabel', 'Validation...')
                  : tr('validateCompanyAction', 'Validate company')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.setupFooterHint}>
              {tr('companySetupFooterHint', 'Validation unlocks a clean, complete profile once the required elements are in place.')}
            </Text>
          </View>
        )}

        {shouldShowSetupSuccess && (
          <View style={styles.setupSuccessBanner}>
            <Text style={styles.setupSuccessIcon}>✓</Text>
            <View style={styles.setupSuccessCopy}>
              <Text style={styles.setupSuccessTitle}>{tr('companyValidatedTitle', 'Company validated')}</Text>
              <Text style={styles.setupSuccessBody}>
                {tr('companyValidatedBody', 'The page now has the minimum content needed for a polished and trustworthy presentation.')}
              </Text>
            </View>
          </View>
        )}

        {/* INFO SECTION
        {(company?.phone || company?.email || company?.website || distance !== null) && (
          <View>
            <View style={styles.infoSectionHeader}>
              <Text style={styles.infoSectionTitle}>{tr('companyInfoTitle', 'Informations')}</Text>
              {canEdit && (
                <TouchableOpacity
                  style={styles.editInfoBtn}
                  onPress={openEditInfoModal}
                >
                  <Text style={styles.editInfoBtnText}>✏️ {tr('edit', 'Modifier')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.infoSection}>
            {company?.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={styles.infoText}>{company.phone}</Text>
              </View>
            )}
            {company?.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📧</Text>
                <Text style={styles.infoText}>{company.email}</Text>
              </View>
            )}
            {distance !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📏</Text>
                <Text style={styles.infoText}>
                  {locationLoading ? tr('calculatingLabel', 'Calcul...') : `${distance} km`}
                </Text>
              </View>
            )}
            {company?.website && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🔗</Text>
                <Text style={styles.infoText} numberOfLines={1}>{company.website}</Text>
              </View>
            )}
            </View>
          </View>
        )} */}

        {/* CAROUSEL */}
        <View>
          {canEdit && (
            <View style={styles.carouselLabel}>
              <Text style={styles.carouselLabelText}>{tr('photos', 'Photos')}</Text>
              {carouselImages.length > 0 && (
                <Text style={styles.carouselCounter}>
                  {carouselIndex + 1} / {carouselImages.length}
                </Text>
              )}
            </View>
          )}

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
                    {canEdit && (
                      <>
                        <TouchableOpacity
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
                        </TouchableOpacity>
                      </>
                    )}


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
            <View style={styles.emptyCarousel}>
              <Text style={styles.emptyCarouselText}>
                {tr('noPhotoAddPrompt', 'No photo yet. Tap + to add one.')}
              </Text>
            </View>
          )}

          {canEdit && (
            <TouchableOpacity
              style={[styles.addImgBtn, uploading && { opacity: 0.5 }]}
              onPress={addCarouselMedia}
              disabled={uploading}
            >
              <Text style={styles.addImgText}>+ {tr('addMedia', 'Ajouter un media')}</Text>
            </TouchableOpacity>
          )}

          {canEdit && (
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={openAdd}
                activeOpacity={0.85}
              >
                <Text style={styles.quickActionText}>+ {tr('services', 'Services')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, uploading && { opacity: 0.5 }]}
                onPress={addCarouselMedia}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <Text style={styles.quickActionText}>+ {tr('coverMedia', 'Cover media')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, uploading && { opacity: 0.5 }]}
                onPress={addGalleryImage}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <Text style={styles.quickActionText}>+ {tr('tabGallery', 'Galerie')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setSectorModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.quickActionText}>
                  {tr('sectorsLabel', 'Sectors')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {canEdit && !!selectedCategoryLabels.length && (
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
          )}
        </View>

        {/* TABS */}
        <View style={styles.tabRow}>
          {["services", "gallery"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab &&
                  (tab === "services"
                    ? styles.tabActive
                    : styles.tabActiveOutline),
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab &&
                    (tab === "services"
                      ? styles.tabTextActive
                      : styles.tabTextOutline),
                ]}
              >
                {tab === "services" ? tr('services', 'Services') : `${tr('tabGallery', 'Gallery')} 🖼`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SERVICES */}
        {activeTab === "services" && (
          <View>
            {canEdit && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {services.length} {tr('serviceCountLabel', 'services')}
                </Text>
                <TouchableOpacity style={styles.addSvcBtn} onPress={openAdd}>
                  <Text style={styles.addSvcText}>+ {tr('add', 'Ajouter')}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.grid}>
              {services.map((s, i) => (
                <Pressable
                  key={s._id || i}
                  style={styles.card}
                  onPress={() => {
                    console.log('[DEBUG] Service tapped - isGuest:', isGuest, 'showAuthPrompt:', showAuthPrompt);
                    if (isGuest) { console.log('[DEBUG] Setting showAuthPrompt=true'); setShowAuthPrompt(true); return; }
                    navigation.navigate("ServiceDetail", {
                      service: s,
                      companyId: company._id,
                    });
                  }}
                >
                  {s.image ? (
                    <Image
                      source={{ uri: imgUrl(s.image) }}
                      style={styles.cardImg}
                    />
                  ) : (
                    <View style={[styles.cardImg, styles.noImg]}>
                      <Text style={styles.noImgIcon}>{s.video ? "🎬" : "🛠"}</Text>
                    </View>
                  )}
                  {!!s.video && (
                    <View style={styles.videoBadge}>
                      <Text style={styles.videoBadgeText}>{tr('videoLabel', 'VIDEO')}</Text>
                    </View>
                  )}
                  {canEdit && (
                    <>
                      <TouchableOpacity
                        style={styles.editBadge}
                        onPress={() => openEdit(s)}
                      >
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBadge}
                        onPress={() => deleteService(s._id)}
                      >
                        <Text style={{ fontSize: 12 }}>🗑</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <BlurView intensity={10} tint="dark" style={styles.overlay} pointerEvents="none">
                    <Text style={styles.serviceName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    {s.description ? (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {s.description}
                      </Text>
                    ) : null}
                    {Number(s.price) > 0 ? (
                      <Text style={styles.servicePrice}>
                        ${Number(s.price).toFixed(2)}
                      </Text>
                    ) : null}
                  </BlurView>
                </Pressable>
              ))}
              {services.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🛠</Text>
                  <Text style={styles.emptyText}>
                    {tr('noServiceAddHint', 'No service. Tap + Add.')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* GALLERY */}
        {activeTab === "gallery" && (
          <View>
            {canEdit && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {galleryImages.length} {tr('photoCountLabel', 'photos')}
                </Text>
                <TouchableOpacity
                  style={[styles.addSvcBtn, uploading && { opacity: 0.5 }]}
                  onPress={addGalleryImage}
                  disabled={uploading}
                >
                  <Text style={styles.addSvcText}>+ {tr('add', 'Ajouter')}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.galleryGrid}>
              {galleryImages.map((uri, i) => (
                <View key={i} style={styles.galleryItemWrapper}>
                  <TouchableOpacity activeOpacity={0.92} onPress={() => openGalleryViewer(i)}>
                    <Image
                      source={{ uri: imgUrl(uri) }}
                      style={styles.galleryImg}
                    />
                  </TouchableOpacity>
                  {canEdit && (
                    <>
                      <TouchableOpacity
                        style={styles.galleryEditBadge}
                        onPress={() => editGalleryImage(i)}
                      >
                        <Text style={{ fontSize: 10 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.galleryDeleteBadge}
                        onPress={() =>
                          Alert.alert(tr('delete', 'Supprimer'), tr('deleteImageConfirm', 'Supprimer cette image ?'), [
                            { text: tr('cancelLabel', 'Annuler'), style: "cancel" },
                            {
                              text: tr('delete', 'Supprimer'),
                              style: "destructive",
                              onPress: () => {
                                const newGallery = galleryImages.filter(
                                  (_, idx) => idx !== i,
                                );
                                syncGallery(newGallery);
                              },
                            },
                          ])
                        }
                      >
                        <Text style={{ fontSize: 10 }}>🗑</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              {galleryImages.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🖼</Text>
                  <Text style={styles.emptyText}>
                    {tr('noImageAddHint', 'No image. Tap + Add.')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* EDIT INFO MODAL */}
      <Modal
        visible={editInfoModalVisible}
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
                  <Text style={styles.modalTitle}>{tr('editInfoTitle', 'Modifier les informations')}</Text>

                  <TextInput
                    placeholder={tr('phone', 'Telephone')}
                    placeholderTextColor="#aaa"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={styles.input}
                    keyboardType="phone-pad"
                  />

                  <TextInput
                    placeholder={tr('email', 'Email')}
                    placeholderTextColor="#aaa"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TextInput
                    placeholder={tr('locationAddressPlaceholder', 'Localisation/Adresse')}
                    placeholderTextColor="#aaa"
                    value={editLocation}
                    onChangeText={setEditLocation}
                    style={styles.input}
                  />

                  <TextInput
                    placeholder={tr('website', 'Site web')}
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
                      <Text style={styles.saveBtnText}>{tr('save', 'Enregistrer')}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditInfoModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>{tr('cancelLabel', 'Annuler')}</Text>
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
              <Text style={styles.galleryViewerCloseText}>{tr('close', 'Fermer')}</Text>
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
        visible={carouselVideoLinkModalVisible}
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
                  <Text style={styles.modalTitle}>{tr('addVideoLinkTitle', 'Ajouter un lien video')}</Text>
                  <TextInput
                    placeholder={tr('videoLinkPlaceholder', 'https://youtube.com/...')}
                    placeholderTextColor="#9CA3AF"
                    value={carouselVideoLinkInput}
                    onChangeText={setCarouselVideoLinkInput}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={addCarouselVideoFromLink}>
                    <Text style={styles.saveBtnText}>{tr('addToCarousel', 'Ajouter au carousel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCarouselVideoLinkModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>{tr('cancelLabel', 'Annuler')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={sectorModalVisible}
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
                  <Text style={styles.modalTitle}>{tr('editSectorsTitle', 'Modifier les secteurs')}</Text>
                  <Text style={styles.sectorHint}>{tr('selectMultipleSectorsHint', 'Tu peux selectionner plusieurs secteurs.')}</Text>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.sectorList}>
                    <View style={styles.sectorGrid}>
                      {localizedCategories.map((cat) => {
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
                      <Text style={styles.saveBtnText}>{tr('saveSectors', 'Enregistrer les secteurs')}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setSectorModalVisible(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>{tr('cancelLabel', 'Annuler')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      







      {/* MODAL SERVICE AVEC DESCRIPTION */}
      <Modal visible={modalVisible} animationType="slide" transparent>
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
                    ? tr('newServiceTitle', 'Nouveau service')
                    : tr('editServiceTitle', 'Modifier le service')}
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
                    <Text style={styles.modalDeleteText}>🗑 {tr('delete', 'Supprimer')}</Text>
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
                      {serviceModalUi.changeImage} 📷
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
                  <Text style={styles.pickBtnText}>📷 {tr('chooseImage', 'Choose an image')}</Text>
                </TouchableOpacity>
              )}

              {svcVideo ? (
                <View style={styles.videoPreviewCard}>
                  <Text style={styles.videoPreviewTitle}>🎬 {serviceModalUi.videoSelected}</Text>
                  <Text style={styles.videoPreviewSubtitle} numberOfLines={1}>
                    {isLocalAssetUri(svcVideo)
                      ? (svcVideo.split('/').pop() || 'video.mp4')
                      : svcVideo}
                  </Text>
                  <View style={styles.videoPreviewActions}>
                    <TouchableOpacity style={styles.secondaryPickBtn} onPress={pickServiceVideo}>
                      <Text style={styles.secondaryPickBtnText}>{serviceModalUi.changeLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryPickBtnDanger} onPress={() => setSvcVideo("")}>
                      <Text style={styles.secondaryPickBtnText}>{serviceModalUi.removeLabel}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickBtnSecondary}
                  onPress={pickServiceVideo}
                >
                  <Text style={styles.pickBtnSecondaryText}>🎬 {tr('addVideo', 'Add video')}</Text>
                </TouchableOpacity>
              )}

              <TextInput
                placeholder={tr('videoLinkPlaceholder', 'Lien video (YouTube, Vimeo, mp4...)')}
                placeholderTextColor="#aaa"
                value={svcVideo}
                onChangeText={setSvcVideo}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                placeholder={tr('serviceNamePlaceholder', 'Nom du service')}
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
                placeholder={tr('pricePlaceholderSimple', 'Price (e.g. 12.00)')}
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
                placeholder={tr('serviceDescriptionOptional', 'Service description (optional)')}
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
                  <Text style={styles.saveBtnText}>{tr('save', 'Enregistrer')}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>{tr('cancelLabel', 'Annuler')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
</Modal>
      {/* ── Auth Prompt Modal ──────────────────────────────────────────── */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => { setShowAuthPrompt(false); navigation.navigate('Login'); }}
        onSignUp={() => { setShowAuthPrompt(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowAuthPrompt(false)}
      />
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F6F9" },
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
  headerStatusBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerStatusBadgeDraft: {
    backgroundColor: 'rgba(254, 243, 199, 0.94)',
    borderColor: 'rgba(217, 119, 6, 0.28)',
  },
  headerStatusBadgeValidated: {
    backgroundColor: 'rgba(220, 252, 231, 0.94)',
    borderColor: 'rgba(34, 197, 94, 0.26)',
  },
  headerStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerStatusBadgeTextDraft: {
    color: '#92400E',
  },
  headerStatusBadgeTextValidated: {
    color: '#166534',
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

  setupCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#FFF9F1',
    borderWidth: 1,
    borderColor: '#F6D9AE',
    shadowColor: '#A16207',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  setupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  setupHeaderCopy: { flex: 1 },
  setupEyebrow: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  setupTitle: {
    color: '#1F2937',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  setupSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
  },
  setupStatusBadge: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFF1D6',
    alignItems: 'center',
  },
  setupStatusBadgeReady: {
    backgroundColor: '#DCFCE7',
  },
  setupStatusValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  setupStatusLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  setupProgressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F3E8D0',
    marginTop: 18,
    overflow: 'hidden',
  },
  setupProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F59E0B',
  },
  setupStepsList: {
    marginTop: 16,
    gap: 12,
  },
  setupStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3E8D0',
    gap: 12,
  },
  setupStepCardSoft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#F4E7CC',
    gap: 12,
  },
  setupStepIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupStepIconWrapSoft: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F9EFD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupStepIcon: { fontSize: 18 },
  setupStepCopy: { flex: 1 },
  setupStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  setupStepTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  setupRequiredPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
  },
  setupRequiredPillText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  setupRecommendedPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  setupRecommendedPillText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '800',
  },
  setupStepDescription: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  setupStepMeta: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  setupStepMetaDone: {
    color: GREEN,
  },
  setupStepArrow: {
    color: '#B45309',
    fontSize: 24,
    fontWeight: '400',
    marginTop: 6,
  },
  setupStepArrowDone: {
    color: GREEN,
    fontWeight: '800',
  },
  setupPrimaryBtn: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupPrimaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  setupPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  setupFooterHint: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
  },
  setupSuccessBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  setupSuccessIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GREEN,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
    fontWeight: '800',
    overflow: 'hidden',
  },
  setupSuccessCopy: { flex: 1 },
  setupSuccessTitle: {
    color: '#065F46',
    fontSize: 15,
    fontWeight: '800',
  },
  setupSuccessBody: {
    color: '#047857',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

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
    paddingTop: 20,
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
  emptyCarousel: {
    width,
    height: 160,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCarouselText: { color: "#888", fontSize: 14 },

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
    marginBottom: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
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
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
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
  serviceDescription: { color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 3, lineHeight: 16 },
  servicePrice: { color: PURPLE_MID, fontSize: 13, marginTop: 4, fontWeight: "600" },

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