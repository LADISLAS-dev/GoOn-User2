import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  AppState,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  Image,
  ImageBackground,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Dimensions,
  Modal,
  Pressable,
  Linking,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { API_URL } from '../env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createBanner,
  deleteBanner,
  deleteNotificationApi,
  getAllCompanies,
  getBanners,
  uploadBannerMedia,
  updateBanner,
} from '../services/api';
import { resolveAvatarUri } from '../utils/profileUtils';
import { getLocalizedNotificationCopy, getNotificationTagKey } from '../utils/notificationI18n';
import { isCompanyPubliclyVisible } from '../utils/companyVisibility';
import { useBusinessTypes } from '../hooks/useBusinessTypes';



const { width } = Dimensions.get('window');
const BANNER_CARD_WIDTH = width - 48;
const BANNER_GAP = 12;
const BANNER_SNAP_INTERVAL = BANNER_CARD_WIDTH + BANNER_GAP;
const BANNER_AUTO_SCROLL_MS = 3800;

// ─── Palette (reprend les couleurs de l'app) ──────────────────────────────────
const C = {
  purple:      '#8B2FC9',
  purpleDark:  '#6A1FA0',
  purpleLight: '#F3E8FF',
  blue:        '#5B8DEF',
  blueLight:   '#EBF2FF',
  pink:        '#E040A0',
  white:       '#FFFFFF',
  bg:          '#F8F0FF',
  textPrimary: '#1A1A2E',
  textSecondary:'#6B6B8A',
  textLight:   '#FFFFFF',
};

// ─── Données ──────────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: '1',
    title: "Communication visuelle",
    subtitle: "Stickers prédécoupés • 100 pièces",
    price: "17 000 FCFA",
    bg: ['#2D1B69', '#7B2FBE'],
  },
  {
    id: '2',
    title: "Impression offset",
    subtitle: "Flyers & brochures pro",
    price: "8 500 FCFA",
    bg: ['#1A3A5C', '#2E86C1'],
  },
  {
    id: '3',
    title: "Packages visuels entreprise",
    subtitle: "Proposez une image pro a votre entreprise",
    price: "Sur devis",
    bg: ['#0F5132', '#2E8B57'],
  },
];

const DEFAULT_BANNERS_BY_LANGUAGE = {
  fr: [
    {
      id: '1',
      title: 'Communication visuelle',
      subtitle: 'Stickers predecoupes • 100 pieces',
      price: '17 000 FCFA',
      bg: ['#2D1B69', '#7B2FBE'],
    },
    {
      id: '2',
      title: 'Impression offset',
      subtitle: 'Flyers et brochures pro',
      price: '8 500 FCFA',
      bg: ['#1A3A5C', '#2E86C1'],
    },
    {
      id: '3',
      title: 'Packages visuels entreprise',
      subtitle: 'Proposez une image pro a votre entreprise',
      price: 'Sur devis',
      bg: ['#0F5132', '#2E8B57'],
    },
  ],
  en: [
    {
      id: '1',
      title: 'Visual communication',
      subtitle: 'Die-cut stickers • 100 pieces',
      price: '17,000 FCFA',
      bg: ['#2D1B69', '#7B2FBE'],
    },
    {
      id: '2',
      title: 'Offset printing',
      subtitle: 'Professional flyers and brochures',
      price: '8,500 FCFA',
      bg: ['#1A3A5C', '#2E86C1'],
    },
    {
      id: '3',
      title: 'Business visual packages',
      subtitle: 'Give your company a professional image',
      price: 'On request',
      bg: ['#0F5132', '#2E8B57'],
    },
  ],
  es: [
    {
      id: '1',
      title: 'Comunicacion visual',
      subtitle: 'Stickers troquelados • 100 piezas',
      price: '17 000 FCFA',
      bg: ['#2D1B69', '#7B2FBE'],
    },
    {
      id: '2',
      title: 'Impresion offset',
      subtitle: 'Flyers y folletos profesionales',
      price: '8 500 FCFA',
      bg: ['#1A3A5C', '#2E86C1'],
    },
    {
      id: '3',
      title: 'Paquetes visuales para empresas',
      subtitle: 'Dale una imagen profesional a tu empresa',
      price: 'A consultar',
      bg: ['#0F5132', '#2E8B57'],
    },
  ],
  pt: [
    {
      id: '1',
      title: 'Comunicacao visual',
      subtitle: 'Adesivos recortados • 100 pecas',
      price: '17 000 FCFA',
      bg: ['#2D1B69', '#7B2FBE'],
    },
    {
      id: '2',
      title: 'Impressao offset',
      subtitle: 'Flyers e brochuras profissionais',
      price: '8 500 FCFA',
      bg: ['#1A3A5C', '#2E86C1'],
    },
    {
      id: '3',
      title: 'Pacotes visuais empresariais',
      subtitle: 'Destaque uma imagem profissional para sua empresa',
      price: 'Sob consulta',
      bg: ['#0F5132', '#2E8B57'],
    },
  ],
};

const normalizeBannerTextKey = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const DEFAULT_BANNER_ID_BY_TITLE = {
  [normalizeBannerTextKey('Communication visuelle')]: '1',
  [normalizeBannerTextKey('Visual communication')]: '1',
  [normalizeBannerTextKey('Comunicacion visual')]: '1',
  [normalizeBannerTextKey('Comunicacao visual')]: '1',
  [normalizeBannerTextKey('Impression offset')]: '2',
  [normalizeBannerTextKey('Offset printing')]: '2',
  [normalizeBannerTextKey('Impresion offset')]: '2',
  [normalizeBannerTextKey('Impressao offset')]: '2',
  [normalizeBannerTextKey('Packages visuels entreprise')]: '3',
  [normalizeBannerTextKey('Business visual packages')]: '3',
  [normalizeBannerTextKey('Paquetes visuales para empresas')]: '3',
  [normalizeBannerTextKey('Pacotes visuais empresariais')]: '3',
};

const getDefaultBannerForLanguage = (bannerId, language) => {
  if (!bannerId) return null;
  const source = DEFAULT_BANNERS_BY_LANGUAGE?.[language] || DEFAULT_BANNERS_BY_LANGUAGE?.en || [];
  return source.find((banner) => String(banner?.id || '') === String(bannerId)) || null;
};

const resolveDefaultBannerId = (banner) => {
  const rawId = String(banner?.id || '').trim();
  if (rawId === '1' || rawId === '2' || rawId === '3') return rawId;

  const byTitle = DEFAULT_BANNER_ID_BY_TITLE[normalizeBannerTextKey(banner?.title)];
  if (byTitle) return byTitle;

  return '';
};

const getLocalizedBannerField = (banner, field, language) => {
  const translationObject = banner?.translations?.[language] || banner?.i18n?.[language] || null;
  if (translationObject?.[field] !== undefined && translationObject?.[field] !== null) {
    return translationObject[field];
  }

  const suffixKey = `${field}_${language}`;
  if (banner?.[suffixKey] !== undefined && banner?.[suffixKey] !== null) {
    return banner[suffixKey];
  }

  const nestedValue = banner?.[field];
  if (
    nestedValue
    && typeof nestedValue === 'object'
    && !Array.isArray(nestedValue)
    && nestedValue?.[language] !== undefined
    && nestedValue?.[language] !== null
  ) {
    return nestedValue[language];
  }

  return banner?.[field];
};

const localizeBannerForLanguage = (banner, language) => {
  const fallbackId = resolveDefaultBannerId(banner);
  const fallbackBanner = getDefaultBannerForLanguage(fallbackId, language);

  const title = String(getLocalizedBannerField(banner, 'title', language) || fallbackBanner?.title || '').trim();
  const subtitle = String(getLocalizedBannerField(banner, 'subtitle', language) || fallbackBanner?.subtitle || '').trim();
  const price = String(getLocalizedBannerField(banner, 'price', language) || fallbackBanner?.price || '').trim();
  const description = String(getLocalizedBannerField(banner, 'description', language) || '').trim();
  const ctaLabel = String(getLocalizedBannerField(banner, 'ctaLabel', language) || '').trim();

  return {
    ...banner,
    title,
    subtitle,
    price,
    description,
    ...(ctaLabel ? { ctaLabel } : {}),
  };
};

const HOME_STATIC_TEXT = {
  fr: {
    pushWarningTitle: 'Notifications non pretes',
    pushPermissionDenied: 'Activez les notifications dans les reglages du telephone.',
    pushMissingServerToken: 'Token push manquant: synchronisez votre appareil avant de continuer.',
    pushExpoGoRuntime: 'Vous etes sur Expo Go. Pour la production, utilisez une vraie build.',
    pushConfigIncomplete: 'Configuration push incomplete. Ouvrez Notification Labs.',
    openNotificationLabs: 'Ouvrir Notification Labs',
    invalidCompanyTitle: 'Erreur',
    invalidCompanyBody: 'Entreprise invalide, impossible d\'ouvrir le detail.',
    defaultAdTitle: 'Publicite',
  },
  en: {
    pushWarningTitle: 'Notifications not ready',
    pushPermissionDenied: 'Enable notifications in your phone settings.',
    pushMissingServerToken: 'Missing push token: sync your device before continuing.',
    pushExpoGoRuntime: 'You are using Expo Go. Use a production build for release.',
    pushConfigIncomplete: 'Push setup is incomplete. Open Notification Labs.',
    openNotificationLabs: 'Open Notification Labs',
    invalidCompanyTitle: 'Error',
    invalidCompanyBody: 'Invalid company, unable to open details.',
    defaultAdTitle: 'Ad',
  },
  es: {
    pushWarningTitle: 'Notificaciones no listas',
    pushPermissionDenied: 'Activa las notificaciones en los ajustes del telefono.',
    pushMissingServerToken: 'Falta el token push: sincroniza tu dispositivo antes de continuar.',
    pushExpoGoRuntime: 'Estas en Expo Go. Para produccion, usa una build real.',
    pushConfigIncomplete: 'La configuracion push esta incompleta. Abre Notification Labs.',
    openNotificationLabs: 'Abrir Notification Labs',
    invalidCompanyTitle: 'Error',
    invalidCompanyBody: 'Empresa invalida, no se puede abrir el detalle.',
    defaultAdTitle: 'Publicidad',
  },
  pt: {
    pushWarningTitle: 'Notificacoes nao prontas',
    pushPermissionDenied: 'Ative as notificacoes nas configuracoes do telefone.',
    pushMissingServerToken: 'Token push ausente: sincronize seu dispositivo antes de continuar.',
    pushExpoGoRuntime: 'Voce esta no Expo Go. Para producao, use uma build real.',
    pushConfigIncomplete: 'Configuracao push incompleta. Abra o Notification Labs.',
    openNotificationLabs: 'Abrir Notification Labs',
    invalidCompanyTitle: 'Erro',
    invalidCompanyBody: 'Empresa invalida, nao foi possivel abrir os detalhes.',
    defaultAdTitle: 'Publicidade',
  },

  zh: {
    pushWarningTitle: "通知未就绪",
    pushPermissionDenied: "请在手机设置中启用通知。",
    pushMissingServerToken: "缺少推送令牌：请先同步您的设备再继续。",
    pushExpoGoRuntime: "您正在使用 Expo Go。正式发布请使用生产构建版本。",
    pushConfigIncomplete: "推送配置不完整。请打开通知实验室。",
    openNotificationLabs: "打开通知实验室",
    invalidCompanyTitle: "错误",
    invalidCompanyBody: "公司无效，无法打开详情。",
    defaultAdTitle: "广告"
  },
  hi: {
    pushWarningTitle: "सूचनाएँ तैयार नहीं हैं",
    pushPermissionDenied: "फोन सेटिंग्स में सूचनाएँ सक्षम करें।",
    pushMissingServerToken: "पुश टोकन अनुपलब्ध: जारी रखने से पहले अपना डिवाइस सिंक करें।",
    pushExpoGoRuntime: "आप Expo Go का उपयोग कर रहे हैं। रिलीज़ के लिए प्रोडक्शन बिल्ड का उपयोग करें।",
    pushConfigIncomplete: "पुश सेटअप अधूरा है। नोटिफिकेशन लैब्स खोलें।",
    openNotificationLabs: "नोटिफिकेशन लैब्स खोलें",
    invalidCompanyTitle: "त्रुटि",
    invalidCompanyBody: "अमान्य कंपनी, विवरण नहीं खोला जा सका।",
    defaultAdTitle: "विज्ञापन"
  },
  ar: {
    pushWarningTitle: "الإشعارات غير جاهزة",
    pushPermissionDenied: "فعّل الإشعارات في إعدادات الهاتف.",
    pushMissingServerToken: "رمز الدفع مفقود: قم بمزامنة جهازك قبل المتابعة.",
    pushExpoGoRuntime: "أنت تستخدم Expo Go. للإصدار، استخدم بناء إنتاجي.",
    pushConfigIncomplete: "إعداد الدفع غير مكتمل. افتح مختبر الإشعارات.",
    openNotificationLabs: "فتح مختبر الإشعارات",
    invalidCompanyTitle: "خطأ",
    invalidCompanyBody: "شركة غير صالحة، لا يمكن فتح التفاصيل.",
    defaultAdTitle: "إعلان"
  },
  bn: {
    pushWarningTitle: "বিজ্ঞপ্তি প্রস্তুত নয়",
    pushPermissionDenied: "ফোন সেটিংসে বিজ্ঞপ্তি সক্রিয় করুন।",
    pushMissingServerToken: "পুশ টোকেন অনুপস্থিত: চালিয়ে যাওয়ার আগে আপনার ডিভাইস সিঙ্ক করুন।",
    pushExpoGoRuntime: "আপনি Expo Go ব্যবহার করছেন। প্রকাশের জন্য একটি প্রোডাকশন বিল্ড ব্যবহার করুন।",
    pushConfigIncomplete: "পুশ সেটআপ অসম্পূর্ণ। নোটিফিকেশন ল্যাবস খুলুন।",
    openNotificationLabs: "নোটিফিকেশন ল্যাবস খুলুন",
    invalidCompanyTitle: "ত্রুটি",
    invalidCompanyBody: "অবৈধ কোম্পানি, বিবরণ খোলা যায়নি।",
    defaultAdTitle: "বিজ্ঞাপন"
  },
  ru: {
    pushWarningTitle: "Уведомления не готовы",
    pushPermissionDenied: "Включите уведомления в настройках телефона.",
    pushMissingServerToken: "Отсутствует push-токен: синхронизируйте устройство перед продолжением.",
    pushExpoGoRuntime: "Вы используете Expo Go. Для релиза используйте производственную сборку.",
    pushConfigIncomplete: "Настройка push не завершена. Откройте Notification Labs.",
    openNotificationLabs: "Открыть Notification Labs",
    invalidCompanyTitle: "Ошибка",
    invalidCompanyBody: "Неверная компания, не удалось открыть детали.",
    defaultAdTitle: "Объявление"
  },
  ja: {
    pushWarningTitle: "通知の準備ができていません",
    pushPermissionDenied: "電話の設定で通知を有効にしてください。",
    pushMissingServerToken: "プッシュトークンがありません：続行する前にデバイスを同期してください。",
    pushExpoGoRuntime: "Expo Goを使用しています。リリースには本番ビルドを使用してください。",
    pushConfigIncomplete: "プッシュ設定が不完全です。Notification Labsを開いてください。",
    openNotificationLabs: "Notification Labsを開く",
    invalidCompanyTitle: "エラー",
    invalidCompanyBody: "無効な会社です。詳細を開けませんでした。",
    defaultAdTitle: "広告"
  },
  de: {
    pushWarningTitle: "Benachrichtigungen nicht bereit",
    pushPermissionDenied: "Aktivieren Sie Benachrichtigungen in den Telefoneinstellungen.",
    pushMissingServerToken: "Push-Token fehlt: Synchronisieren Sie Ihr Gerät, bevor Sie fortfahren.",
    pushExpoGoRuntime: "Sie verwenden Expo Go. Verwenden Sie für die Veröffentlichung einen Produktions-Build.",
    pushConfigIncomplete: "Push-Einrichtung ist unvollständig. Öffnen Sie Notification Labs.",
    openNotificationLabs: "Notification Labs öffnen",
    invalidCompanyTitle: "Fehler",
    invalidCompanyBody: "Ungültiges Unternehmen, Details konnten nicht geöffnet werden.",
    defaultAdTitle: "Anzeige"
  },
  id: {
    pushWarningTitle: "Notifikasi belum siap",
    pushPermissionDenied: "Aktifkan notifikasi di pengaturan ponsel Anda.",
    pushMissingServerToken: "Token push tidak ada: sinkronkan perangkat Anda sebelum melanjutkan.",
    pushExpoGoRuntime: "Anda menggunakan Expo Go. Untuk rilis, gunakan build produksi.",
    pushConfigIncomplete: "Pengaturan push tidak lengkap. Buka Notification Labs.",
    openNotificationLabs: "Buka Notification Labs",
    invalidCompanyTitle: "Kesalahan",
    invalidCompanyBody: "Perusahaan tidak valid, tidak dapat membuka detail.",
    defaultAdTitle: "Iklan"
  },
  ur: {
    pushWarningTitle: "نوٹیفکیشن تیار نہیں ہیں",
    pushPermissionDenied: "فون کی ترتیبات میں نوٹیفکیشن کو فعال کریں۔",
    pushMissingServerToken: "پش ٹوکن غائب: جاری رکھنے سے پہلے اپنے ڈیوائس کو ہم آہنگ کریں۔",
    pushExpoGoRuntime: "آپ Expo Go استعمال کر رہے ہیں۔ ریلیز کے لیے پروڈکشن بلڈ استعمال کریں۔",
    pushConfigIncomplete: "پش سیٹ اپ نامکمل ہے۔ نوٹیفکیشن لیبز کھولیں۔",
    openNotificationLabs: "نوٹیفکیشن لیبز کھولیں",
    invalidCompanyTitle: "خرابی",
    invalidCompanyBody: "غلط کمپنی، تفصیلات نہیں کھولی جا سکیں۔",
    defaultAdTitle: "اشتہار"
  }

};

const CATEGORIES = [
  { id: '1', label: 'Technology & IT', icon: '💻', color: C.blue,   bg: C.blueLight },
  { id: '2', label: 'Food & Restaurant', icon: '🍽️', color: '#E67E22', bg: '#FEF0E7' },
  { id: '3', label: 'Beauty & Fashion', icon: '💄', color: C.pink, bg: '#FCE4F3' },
  { id: '4', label: 'Health & Medical', icon: '🏥', color: '#27AE60', bg: '#E8F8F0' },
  { id: '5', label: 'Education', icon: '📚', color: '#8E44AD', bg: '#F4ECF7' },
  { id: '6', label: 'Finance & Banking', icon: '💰', color: '#F39C12', bg: '#FEFAE0' },
  { id: '7', label: 'Real Estate', icon: '🏠', color: '#2980B9', bg: '#EBF5FB' },
  { id: '8', label: 'Transport & Logistics', icon: '🚗', color: '#E74C3C', bg: '#FDEDEC' },
  { id: '9', label: 'Hospitality & Hotels', icon: '🏨', color: '#16A34A', bg: '#F0FDF4' },
  { id: '10', label: 'Arts & Entertainment', icon: '🎭', color: '#DC2626', bg: '#FEF2F2' },
  { id: '11', label: 'Sports & Fitness', icon: '⚽', color: '#0891B2', bg: '#F0F9FA' },
  { id: '12', label: 'Manufacturing', icon: '🏭', color: '#6366F1', bg: '#EEF2FF' },
  { id: '13', label: 'Agriculture', icon: '🌾', color: '#84CC16', bg: '#FEFCE8' },
  { id: '14', label: 'Construction', icon: '🔨', color: '#EA580C', bg: '#FEF3C7' },
  { id: '15', label: 'Retail & Shopping', icon: '🛍️', color: '#D946EF', bg: '#FDF4FF' },
  { id: '16', label: 'Legal Services', icon: '⚖️', color: '#6B21A8', bg: '#FAF5FF' },
  { id: '17', label: 'Consulting', icon: '💼', color: '#1F2937', bg: '#F3F4F6' },
  { id: '18', label: 'Marketing & Advertising', icon: '📢', color: '#DC2626', bg: '#FEE2E2' },
  { id: '19', label: 'Logistics & Warehouse', icon: '📦', color: '#B45309', bg: '#FFFBEB' },
  { id: '20', label: 'Energy & Utilities', icon: '⚡', color: '#7C3AED', bg: '#F5F3FF' },
  { id: '21', label: 'Telecommunications', icon: '📡', color: '#0369A1', bg: '#F0F9FF' },
  { id: '22', label: 'Media & Publishing', icon: '📰', color: '#EF4444', bg: '#FEE2E2' },
  { id: '23', label: 'Human Resources', icon: '👥', color: '#8B5CF6', bg: '#FAF5FF' },
  { id: '24', label: 'Environmental Services', icon: '♻️', color: '#059669', bg: '#F0FDF4' },
  { id: '25', label: 'Arts & Crafts', icon: '🎨', color: '#F59E0B', bg: '#FEFCE8' },
  { id: '26', label: 'Pet Services', icon: '🐾', color: '#EF4444', bg: '#FEE2E2' },
  { id: '27', label: 'Automotive', icon: '🚙', color: '#6366F1', bg: '#EEF2FF' },
  { id: '28', label: 'Photography', icon: '📷', color: '#1E40AF', bg: '#EFF6FF' },
  { id: '29', label: 'Tourism & Travel', icon: '✈️', color: '#EC4899', bg: '#FCE7F3' },
  { id: '30', label: 'Event Management', icon: '🎉', color: '#D946EF', bg: '#FDF4FF' },
  { id: '31', label: 'Security Services', icon: '🛡️', color: '#1F2937', bg: '#F3F4F6' },
  { id: '32', label: 'Plumbing & HVAC', icon: '🔧', color: '#0891B2', bg: '#F0F9FA' },
  { id: '33', label: 'Electrical Services', icon: '⚙️', color: '#DC2626', bg: '#FEE2E2' },
  { id: '34', label: 'Cleaning Services', icon: '🧹', color: '#10B981', bg: '#F0FDF4' },
  { id: '35', label: 'Landscaping', icon: '🌿', color: '#16A34A', bg: '#F0FDF4' },
  { id: '36', label: 'Printing & Design', icon: '🖨️', color: '#7C3AED', bg: '#F5F3FF' },
  { id: '37', label: 'Software Development', icon: '💾', color: '#0369A1', bg: '#F0F9FF' },
  { id: '38', label: 'Graphic Design', icon: '🎯', color: '#D946EF', bg: '#FDF4FF' },
  { id: '39', label: 'Web Development', icon: '🌐', color: '#0891B2', bg: '#F0F9FA' },
  { id: '40', label: 'Content Creation', icon: '📝', color: '#F59E0B', bg: '#FEFCE8' },
];

const CATEGORY_LABELS = {
  fr: {
    '1': 'Technologie et IT',
    '2': 'Restauration',
    '3': 'Beaute et mode',
    '4': 'Sante et medical',
    '5': 'Education',
    '6': 'Finance et banque',
    '7': 'Immobilier',
    '8': 'Transport et logistique',
    '9': 'Hotellerie',
    '10': 'Arts et divertissement',
    '11': 'Sports et fitness',
    '12': 'Manufacture',
    '13': 'Agriculture',
    '14': 'Construction',
    '15': 'Commerce et shopping',
    '16': 'Services juridiques',
    '17': 'Conseil',
    '18': 'Marketing et publicite',
    '19': 'Logistique et entrepot',
    '20': 'Energie et services publics',
    '21': 'Telecommunications',
    '22': 'Media et edition',
    '23': 'Ressources humaines',
    '24': 'Services environnementaux',
    '25': 'Arts et artisanat',
    '26': 'Services animaliers',
    '27': 'Automobile',
    '28': 'Photographie',
    '29': 'Tourisme et voyage',
    '30': 'Evenementiel',
    '31': 'Services de securite',
    '32': 'Plomberie et CVC',
    '33': 'Services electriques',
    '34': 'Services de nettoyage',
    '35': 'Paysagisme',
    '36': 'Impression et design',
    '37': 'Developpement logiciel',
    '38': 'Design graphique',
    '39': 'Developpement web',
    '40': 'Creation de contenu',
  },
  en: {},
  es: {
    '1': 'Tecnologia e IT',
    '2': 'Comida y restaurantes',
    '3': 'Belleza y moda',
    '4': 'Salud y medicina',
    '5': 'Educacion',
    '6': 'Finanzas y banca',
    '7': 'Bienes raices',
    '8': 'Transporte y logistica',
    '9': 'Hoteleria',
    '10': 'Arte y entretenimiento',
    '11': 'Deporte y fitness',
    '12': 'Manufactura',
    '13': 'Agricultura',
    '14': 'Construccion',
    '15': 'Comercio y compras',
    '16': 'Servicios legales',
    '17': 'Consultoria',
    '18': 'Marketing y publicidad',
    '19': 'Logistica y almacen',
    '20': 'Energia y servicios',
    '21': 'Telecomunicaciones',
    '22': 'Medios y publicacion',
    '23': 'Recursos humanos',
    '24': 'Servicios ambientales',
    '25': 'Artes y manualidades',
    '26': 'Servicios para mascotas',
    '27': 'Automotriz',
    '28': 'Fotografia',
    '29': 'Turismo y viajes',
    '30': 'Gestion de eventos',
    '31': 'Servicios de seguridad',
    '32': 'Plomeria y HVAC',
    '33': 'Servicios electricos',
    '34': 'Servicios de limpieza',
    '35': 'Paisajismo',
    '36': 'Impresion y diseno',
    '37': 'Desarrollo de software',
    '38': 'Diseno grafico',
    '39': 'Desarrollo web',
    '40': 'Creacion de contenido',
  },
  pt: {
    '1': 'Tecnologia e TI',
    '2': 'Comida e restaurantes',
    '3': 'Beleza e moda',
    '4': 'Saude e medicina',
    '5': 'Educacao',
    '6': 'Financas e bancos',
    '7': 'Imoveis',
    '8': 'Transporte e logistica',
    '9': 'Hotelaria',
    '10': 'Artes e entretenimento',
    '11': 'Esportes e fitness',
    '12': 'Manufatura',
    '13': 'Agricultura',
    '14': 'Construcao',
    '15': 'Varejo e compras',
    '16': 'Servicos juridicos',
    '17': 'Consultoria',
    '18': 'Marketing e publicidade',
    '19': 'Logistica e armazem',
    '20': 'Energia e utilidades',
    '21': 'Telecomunicacoes',
    '22': 'Midia e publicacao',
    '23': 'Recursos humanos',
    '24': 'Servicos ambientais',
    '25': 'Artes e artesanato',
    '26': 'Servicos para pets',
    '27': 'Automotivo',
    '28': 'Fotografia',
    '29': 'Turismo e viagens',
    '30': 'Gestao de eventos',
    '31': 'Servicos de seguranca',
    '32': 'Encanamento e HVAC',
    '33': 'Servicos eletricos',
    '34': 'Servicos de limpeza',
    '35': 'Paisagismo',
    '36': 'Impressao e design',
    '37': 'Desenvolvimento de software',
    '38': 'Design grafico',
    '39': 'Desenvolvimento web',
    '40': 'Criacao de conteudo',
  },
  zh: {
    "1": "技术与信息技术",
    "2": "餐饮业",
    "3": "美容与时尚",
    "4": "健康与医疗",
    "5": "教育",
    "6": "金融与银行",
    "7": "房地产",
    "8": "运输与物流",
    "9": "酒店业",
    "10": "艺术与娱乐",
    "11": "体育与健身",
    "12": "制造业",
    "13": "农业",
    "14": "建筑业",
    "15": "商业与购物",
    "16": "法律服务",
    "17": "咨询",
    "18": "营销与广告",
    "19": "物流与仓储",
    "20": "能源与公用事业",
    "21": "电信",
    "22": "媒体与出版",
    "23": "人力资源",
    "24": "环境服务",
    "25": "手工艺",
    "26": "宠物服务",
    "27": "汽车业",
    "28": "摄影",
    "29": "旅游与旅行",
    "30": "活动策划",
    "31": "安保服务",
    "32": "管道与暖通空调",
    "33": "电气服务",
    "34": "清洁服务",
    "35": "园林绿化",
    "36": "印刷与设计",
    "37": "软件开发",
    "38": "平面设计",
    "39": "网页开发",
    "40": "内容创作"
  },
  hi: {
    "1": "प्रौद्योगिकी और आईटी",
    "2": "खाद्य और रेस्तरां",
    "3": "सौंदर्य और फैशन",
    "4": "स्वास्थ्य और चिकित्सा",
    "5": "शिक्षा",
    "6": "वित्त और बैंकिंग",
    "7": "रियल एस्टेट",
    "8": "परिवहन और रसद",
    "9": "आतिथ्य",
    "10": "कला और मनोरंजन",
    "11": "खेल और फिटनेस",
    "12": "विनिर्माण",
    "13": "कृषि",
    "14": "निर्माण",
    "15": "व्यापार और खरीदारी",
    "16": "कानूनी सेवाएँ",
    "17": "परामर्श",
    "18": "विपणन और विज्ञापन",
    "19": "रसद और गोदाम",
    "20": "ऊर्जा और उपयोगिताएँ",
    "21": "दूरसंचार",
    "22": "मीडिया और प्रकाशन",
    "23": "मानव संसाधन",
    "24": "पर्यावरणीय सेवाएँ",
    "25": "कला और शिल्प",
    "26": "पालतू सेवाएँ",
    "27": "ऑटोमोटिव",
    "28": "फोटोग्राफी",
    "29": "पर्यटन और यात्रा",
    "30": "इवेंट प्रबंधन",
    "31": "सुरक्षा सेवाएँ",
    "32": "पाइपलाइन और HVAC",
    "33": "विद्युत सेवाएँ",
    "34": "सफाई सेवाएँ",
    "35": "भू-दृश्यांकन",
    "36": "मुद्रण और डिज़ाइन",
    "37": "सॉफ्टवेयर विकास",
    "38": "ग्राफिक डिज़ाइन",
    "39": "वेब विकास",
    "40": "सामग्री निर्माण"
  },
  ar: {
    "1": "التكنولوجيا وتكنولوجيا المعلومات",
    "2": "الطعام والمطاعم",
    "3": "الجمال والأزياء",
    "4": "الصحة والطب",
    "5": "التعليم",
    "6": "المال والبنوك",
    "7": "العقارات",
    "8": "النقل والخدمات اللوجستية",
    "9": "الضيافة",
    "10": "الفنون والترفيه",
    "11": "الرياضة واللياقة البدنية",
    "12": "التصنيع",
    "13": "الزراعة",
    "14": "البناء والتشييد",
    "15": "التجارة والتسوق",
    "16": "الخدمات القانونية",
    "17": "الاستشارات",
    "18": "التسويق والإعلان",
    "19": "الخدمات اللوجستية والمستودعات",
    "20": "الطاقة والمرافق",
    "21": "الاتصالات",
    "22": "الإعلام والنشر",
    "23": "الموارد البشرية",
    "24": "الخدمات البيئية",
    "25": "الفنون والحرف اليدوية",
    "26": "خدمات الحيوانات الأليفة",
    "27": "السيارات",
    "28": "التصوير الفوتوغرافي",
    "29": "السياحة والسفر",
    "30": "إدارة الفعاليات",
    "31": "خدمات الأمن",
    "32": "السباكة والتدفئة والتهوية وتكييف الهواء",
    "33": "الخدمات الكهربائية",
    "34": "خدمات التنظيف",
    "35": "تنسيق الحدائق",
    "36": "الطباعة والتصميم",
    "37": "تطوير البرمجيات",
    "38": "التصميم الجرافيكي",
    "39": "تطوير الويب",
    "40": "إنشاء المحتوى"
  },
  bn: {
    "1": "প্রযুক্তি এবং আইটি",
    "2": "খাদ্য এবং রেস্তোরাঁ",
    "3": "সৌন্দর্য এবং ফ্যাশন",
    "4": "স্বাস্থ্য এবং চিকিৎসা",
    "5": "শিক্ষা",
    "6": "অর্থ এবং ব্যাংকিং",
    "7": "রিয়েল এস্টেট",
    "8": "পরিবহন এবং রসদ",
    "9": "আতিথেয়তা",
    "10": "শিল্প এবং বিনোদন",
    "11": "খেলাধুলা এবং ফিটনেস",
    "12": "উত্পাদন",
    "13": "কৃষি",
    "14": "নির্মাণ",
    "15": "বাণিজ্য এবং কেনাকাটা",
    "16": "আইনি সেবা",
    "17": "পরামর্শ",
    "18": "মার্কেটিং এবং বিজ্ঞাপন",
    "19": "রসদ এবং গুদাম",
    "20": "শক্তি এবং ইউটিলিটি",
    "21": "টেলিযোগাযোগ",
    "22": "মিডিয়া এবং প্রকাশনা",
    "23": "মানব সম্পদ",
    "24": "পরিবেশগত সেবা",
    "25": "শিল্প ও কারুশিল্প",
    "26": "পোষা প্রাণী সেবা",
    "27": "স্বয়ংচালিত",
    "28": "ফটোগ্রাফি",
    "29": "পর্যটন এবং ভ্রমণ",
    "30": "ইভেন্ট ব্যবস্থাপনা",
    "31": "নিরাপত্তা সেবা",
    "32": "নদীর গভীরতানির্ণয় এবং HVAC",
    "33": "বৈদ্যুতিক সেবা",
    "34": "পরিষ্কার সেবা",
    "35": "ভূদৃশ্যায়ন",
    "36": "মুদ্রণ এবং নকশা",
    "37": "সফটওয়্যার উন্নয়ন",
    "38": "গ্রাফিক ডিজাইন",
    "39": "ওয়েব উন্নয়ন",
    "40": "বিষয়বস্তু তৈরি"
  },
  ru: {
    "1": "Технологии и ИТ",
    "2": "Еда и рестораны",
    "3": "Красота и мода",
    "4": "Здравоохранение и медицина",
    "5": "Образование",
    "6": "Финансы и банковское дело",
    "7": "Недвижимость",
    "8": "Транспорт и логистика",
    "9": "Гостиничный бизнес",
    "10": "Искусство и развлечения",
    "11": "Спорт и фитнес",
    "12": "Производство",
    "13": "Сельское хозяйство",
    "14": "Строительство",
    "15": "Торговля и покупки",
    "16": "Юридические услуги",
    "17": "Консалтинг",
    "18": "Маркетинг и реклама",
    "19": "Логистика и склад",
    "20": "Энергетика и коммунальные услуги",
    "21": "Телекоммуникации",
    "22": "СМИ и издательство",
    "23": "Кадровые ресурсы",
    "24": "Экологические услуги",
    "25": "Ремесла",
    "26": "Услуги для домашних животных",
    "27": "Автомобильная промышленность",
    "28": "Фотография",
    "29": "Туризм и путешествия",
    "30": "Управление мероприятиями",
    "31": "Охранные услуги",
    "32": "Сантехника и HVAC",
    "33": "Электротехнические услуги",
    "34": "Услуги по уборке",
    "35": "Ландшафтный дизайн",
    "36": "Печать и дизайн",
    "37": "Разработка программного обеспечения",
    "38": "Графический дизайн",
    "39": "Веб-разработка",
    "40": "Создание контента"
  },
  ja: {
    "1": "テクノロジーとIT",
    "2": "フードとレストラン",
    "3": "ビューティーとファッション",
    "4": "ヘルスケアと医療",
    "5": "教育",
    "6": "金融と銀行",
    "7": "不動産",
    "8": "運輸と物流",
    "9": "ホスピタリティ",
    "10": "アートとエンターテイメント",
    "11": "スポーツとフィットネス",
    "12": "製造業",
    "13": "農業",
    "14": "建設",
    "15": "商業とショッピング",
    "16": "法務サービス",
    "17": "コンサルティング",
    "18": "マーケティングと広告",
    "19": "物流と倉庫",
    "20": "エネルギーと公共事業",
    "21": "電気通信",
    "22": "メディアと出版",
    "23": "人事",
    "24": "環境サービス",
    "25": "アートとクラフト",
    "26": "ペットサービス",
    "27": "自動車",
    "28": "写真",
    "29": "観光と旅行",
    "30": "イベント管理",
    "31": "警備サービス",
    "32": "配管とHVAC",
    "33": "電気サービス",
    "34": "清掃サービス",
    "35": "造園",
    "36": "印刷とデザイン",
    "37": "ソフトウェア開発",
    "38": "グラフィックデザイン",
    "39": "ウェブ開発",
    "40": "コンテンツ制作"
  },
  de: {
    "1": "Technologie und IT",
    "2": "Gastronomie",
    "3": "Schönheit und Mode",
    "4": "Gesundheit und Medizin",
    "5": "Bildung",
    "6": "Finanzen und Banken",
    "7": "Immobilien",
    "8": "Transport und Logistik",
    "9": "Gastgewerbe",
    "10": "Kunst und Unterhaltung",
    "11": "Sport und Fitness",
    "12": "Fertigung",
    "13": "Landwirtschaft",
    "14": "Bauwesen",
    "15": "Handel und Einkaufen",
    "16": "Rechtsdienstleistungen",
    "17": "Beratung",
    "18": "Marketing und Werbung",
    "19": "Logistik und Lager",
    "20": "Energie und Versorgung",
    "21": "Telekommunikation",
    "22": "Medien und Verlagswesen",
    "23": "Personalwesen",
    "24": "Umweltdienstleistungen",
    "25": "Kunst und Handwerk",
    "26": "Tierdienstleistungen",
    "27": "Automobil",
    "28": "Fotografie",
    "29": "Tourismus und Reisen",
    "30": "Eventmanagement",
    "31": "Sicherheitsdienste",
    "32": "Sanitär und Heizung/Lüftung/Klima",
    "33": "Elektroinstallation",
    "34": "Reinigungsdienste",
    "35": "Landschaftsbau",
    "36": "Druck und Design",
    "37": "Softwareentwicklung",
    "38": "Grafikdesign",
    "39": "Webentwicklung",
    "40": "Content-Erstellung"
  },
  id: {
    "1": "Teknologi dan TI",
    "2": "Makanan dan Restoran",
    "3": "Kecantikan dan Mode",
    "4": "Kesehatan dan Medis",
    "5": "Pendidikan",
    "6": "Keuangan dan Perbankan",
    "7": "Properti dan Real Estat",
    "8": "Transportasi dan Logistik",
    "9": "Perhotelan",
    "10": "Seni dan Hiburan",
    "11": "Olahraga dan Kebugaran",
    "12": "Manufaktur",
    "13": "Pertanian",
    "14": "Konstruksi",
    "15": "Perdagangan dan Belanja",
    "16": "Layanan Hukum",
    "17": "Konsultasi",
    "18": "Pemasaran dan Periklanan",
    "19": "Logistik dan Pergudangan",
    "20": "Energi dan Utilitas",
    "21": "Telekomunikasi",
    "22": "Media dan Penerbitan",
    "23": "Sumber Daya Manusia",
    "24": "Layanan Lingkungan",
    "25": "Seni dan Kerajinan",
    "26": "Layanan Hewan Peliharaan",
    "27": "Otomotif",
    "28": "Fotografi",
    "29": "Pariwisata dan Perjalanan",
    "30": "Manajemen Acara",
    "31": "Layanan Keamanan",
    "32": "Perpipaan dan HVAC",
    "33": "Layanan Kelistrikan",
    "34": "Layanan Pembersihan",
    "35": "Pertamanan",
    "36": "Percetakan dan Desain",
    "37": "Pengembangan Perangkat Lunak",
    "38": "Desain Grafis",
    "39": "Pengembangan Web",
    "40": "Pembuatan Konten"
  },
  ur: {
    "1": "ٹیکنالوجی اور آئی ٹی",
    "2": "کھانا اور ریستوران",
    "3": "بیوٹی اور فیشن",
    "4": "صحت اور طب",
    "5": "تعلیم",
    "6": "مالیات اور بینکنگ",
    "7": "ریل اسٹیٹ",
    "8": "نقل و حمل اور لاجسٹکس",
    "9": "مہمان نوازی",
    "10": "آرٹ اور تفریح",
    "11": "کھیل اور فٹنس",
    "12": "مینوفیکچرنگ",
    "13": "زراعت",
    "14": "تعمیرات",
    "15": "تجارت اور خریداری",
    "16": "قانونی خدمات",
    "17": "مشاورت",
    "18": "مارکیٹنگ اور اشتہارات",
    "19": "لاجسٹکس اور گودام",
    "20": "توانائی اور افادیت",
    "21": "ٹیلی کمیونیکیشن",
    "22": "میڈیا اور اشاعت",
    "23": "انسانی وسائل",
    "24": "ماحولیاتی خدمات",
    "25": "آرٹ اور دستکاری",
    "26": "پالتو جانوروں کی خدمات",
    "27": "آٹوموٹو",
    "28": "فوٹوگرافی",
    "29": "سیاحت اور سفر",
    "30": "ایونٹ مینجمنٹ",
    "31": "سیکورٹی خدمات",
    "32": "پلمبنگ اور HVAC",
    "33": "برقی خدمات",
    "34": "صفائی کی خدمات",
    "35": "زمین کی تزئین",
    "36": "پرنٹنگ اور ڈیزائن",
    "37": "سافٹ ویئر ڈویلپمنٹ",
    "38": "گرافک ڈیزائن",
    "39": "ویب ڈویلپمنٹ",
    "40": "مواد کی تخلیق"
  }

};

const FEATURED_COLORS = ['#E8402A', C.purple, '#2ECC71', C.blue, '#F39C12', '#14B8A6', '#E11D48'];
const FEATURED_COMPANIES_CACHE_KEY = '@goon:featured-companies-cache';
const APP_MODE_STORAGE_KEY = '@goon:app-mode';
const MODE_SWITCH_GIF_DURATION_MS = 4400;
const INLINE_BANNER_VIDEO_ENABLED = true;
const APP_STORE_URL = 'https://apps.apple.com/app/id6783525610';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.notificationapp.test';

const isSafeHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /^https?:\/\//i.test(raw);
};

const resolveCompanyLogo = (src) => resolveAvatarUri(src, API_URL);

const getCompanyPrimaryId = (company) =>
  String(company?._id || company?.id || company?.companyId || '').trim();

const getCompanyDisplayName = (company) => {
  const value = String(
    company?.name || company?.companyName || company?.title || ''
  ).trim();
  return value;
};

const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getCompanyAppreciationStats = (company) => {
  const summary = company?.appreciationSummary || {};

  const likes = toFiniteNumber(
    summary?.likes ?? company?.likesCount ?? company?.likes,
    0
  );
  const averageRating = toFiniteNumber(
    summary?.averageRating ?? company?.averageRating ?? company?.rating ?? company?.stars,
    0
  );
  const totalReviews = toFiniteNumber(
    summary?.total ?? company?.reviewsCount ?? company?.ratingsCount,
    0
  );

  return { likes, averageRating, totalReviews };
};

const compareFeaturedCompanies = (left, right) => {
  const a = getCompanyAppreciationStats(left);
  const b = getCompanyAppreciationStats(right);

  if (b.likes !== a.likes) return b.likes - a.likes;
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  if (b.totalReviews !== a.totalReviews) return b.totalReviews - a.totalReviews;

  return new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0);
};

const normalizeFeaturedCompanies = (companies = []) => {
  return [...companies]
    .filter((company) => getCompanyPrimaryId(company))
    .sort(compareFeaturedCompanies)
    .map((company, index) => ({
      id: getCompanyPrimaryId(company),
      name: getCompanyDisplayName(company) || 'Entreprise',
      color: FEATURED_COLORS[index % FEATURED_COLORS.length],
      logo: resolveCompanyLogo(company.logo),
    }));
};

function BannerVideo({
  uri,
  style,
  contentFit = 'cover',
  muted = true,
  looping = true,
  autoPlay = true,
  startAtBeginning = false,
  isActive = true,
  nativeControls = false,
  pointerEvents,
}) {
  const source = useMemo(() => (uri ? { uri } : null), [uri]);

  const safePlayerCall = useCallback((operation) => {
    try {
      operation?.();
    } catch (_) {
      // Player native object can be disposed during modal close/unmount.
    }
  }, []);

  const player = useVideoPlayer(source, (instance) => {
    safePlayerCall(() => {
      instance.loop = looping;
      instance.muted = muted;
    });
  });

  useEffect(() => {
    if (!uri) return;
    safePlayerCall(() => {
      player.loop = looping;
      player.muted = muted;
    });

    if (autoPlay && isActive) {
      if (startAtBeginning) {
        safePlayerCall(() => {
          player.currentTime = 0;
        });
      }
      safePlayerCall(() => player.play());
    } else {
      safePlayerCall(() => player.pause());
    }
  }, [player, uri, looping, muted, autoPlay, startAtBeginning, isActive, safePlayerCall]);

  useEffect(() => {
    return () => {
      safePlayerCall(() => player.pause());
    };
  }, [player, safePlayerCall]);

  if (!uri) return null;

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={nativeControls}
      pointerEvents={pointerEvents}
    />
  );
}

// ─── Composant banner ──────────────────────────────────────────────────────────
function BannerCard({
  item,
  index,
  scrollX,
  onPressView,
  onPressEdit,
  onPressDelete,
  canManage,
  videosEnabled = true,
  editLabel = 'Modifier',
  deleteLabel = 'Supprimer',
  ctaLabel = 'Decouvrir',
}) {
  const shimmerX = useRef(new Animated.Value(-BANNER_CARD_WIDTH)).current;
  const inputRange = [
    (index - 1) * BANNER_SNAP_INTERVAL,
    index * BANNER_SNAP_INTERVAL,
    (index + 1) * BANNER_SNAP_INTERVAL,
  ];

  const cardScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });

  const cardTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [8, 0, 8],
    extrapolate: 'clamp',
  });

  const cardOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.86, 1, 0.86],
    extrapolate: 'clamp',
  });

  const contentParallax = scrollX.interpolate({
    inputRange,
    outputRange: [14, 0, -14],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerX, {
        toValue: BANNER_CARD_WIDTH,
        duration: 3200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerX]);

  const bannerBgColor = String(item?.bg?.[0] || '#2D1B69');
  const bannerAccentColor = String(item?.bg?.[1] || '#7B2FBE');
  const mediaUrl = String(item?.mediaUrl || '').trim();
  const hasSafeMediaUrl = isSafeHttpUrl(mediaUrl);
  const showImage = item?.mediaType === 'image' && hasSafeMediaUrl;
  const showVideo =
    INLINE_BANNER_VIDEO_ENABLED &&
    videosEnabled &&
    item?.mediaType === 'video' &&
    hasSafeMediaUrl;

  return (
    <Animated.View
      style={{
        transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
        opacity: cardOpacity,
      }}
    >
      <View style={[styles.banner, { backgroundColor: bannerBgColor }]}> 
      <View style={[styles.bannerAccentOrbA, { backgroundColor: `${bannerAccentColor}66` }]} />
      <View style={[styles.bannerAccentOrbB, { backgroundColor: `${bannerAccentColor}33` }]} />
      {showImage ? (
        <ImageBackground source={{ uri: mediaUrl }} style={styles.bannerMediaBg} imageStyle={styles.bannerMediaImage}>
          <View style={styles.bannerMediaOverlay} />
        </ImageBackground>
      ) : showVideo ? (
        <View style={styles.bannerMediaVideoWrap}>
          <BannerVideo
            uri={mediaUrl}
            style={styles.bannerMediaVideoBg}
            contentFit="cover"
            looping
            autoPlay
            muted
            isActive={showVideo}
            nativeControls={false}
          />
          <View style={styles.bannerMediaOverlay} />
        </View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bannerShimmer,
          {
            transform: [
              { translateX: shimmerX },
              { rotate: '-18deg' },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bannerContent,
          { transform: [{ translateX: contentParallax }] },
        ]}
      >
        {canManage ? (
          <View style={styles.bannerTopRow}>
            {/* <View style={styles.bannerOwnerActions}>
              <TouchableOpacity style={styles.bannerOwnerBtn} onPress={onPressEdit} activeOpacity={0.86}>
                <Text style={styles.bannerOwnerBtnText}>{editLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bannerOwnerBtn, styles.bannerOwnerBtnDanger]}
                onPress={onPressDelete}
                activeOpacity={0.86}
              >
                <Text style={[styles.bannerOwnerBtnText, styles.bannerOwnerBtnTextDanger]}>{deleteLabel}</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        ) : null}
        <View style={styles.bannerTextBlock}>
          <Text style={styles.bannerTitle} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
          {!!String(item?.subtitle || '').trim() && (
            <Text style={styles.bannerSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {item.subtitle}
            </Text>
          )}
        </View>
        {!!String(item?.price || '').trim() && (
          <View style={styles.bannerPriceBadge}>
            <Text style={styles.bannerPrice}>{item.price}</Text>
          </View>
        )}
        <View style={styles.bannerBottomRow}>
          <TouchableOpacity style={styles.bannerViewBtn} onPress={onPressView} activeOpacity={0.86}>
            <Text style={styles.bannerViewBtnText}>{ctaLabel}  →</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Composant catégorie ──────────────────────────────────────────────────────
function CategoryCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={styles.categoryLabel}>{item.label}</Text>
    </TouchableOpacity>
  );
}

// ─── Composant entreprise featured ────────────────────────────────────────────
function FeaturedItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.featuredItem} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.featuredAvatar, { borderColor: item.color }]}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.featuredLogo} />
        ) : (
          <Text style={styles.featuredInitial}>
            {item.name.slice(0, 1)}
          </Text>
        )}
      </View>
      <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );
}

function timeAgo(t, dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('justNow', 'À l\'instant');
  if (diffMin < 60) return t('minutesAgo', '{count} min').replace('{count}', String(diffMin));
  if (diffHr < 24) return t('hoursAgo', '{count} h').replace('{count}', String(diffHr));
  if (diffDay < 7) return t('daysAgo', '{count} j').replace('{count}', String(diffDay));
  return date.toLocaleDateString();
}

function getNotificationMeta(notification) {
  const type = String(notification?.type || '').toLowerCase();
  const status = String(notification?.status || '').toLowerCase();

  if (type === 'message') {
    return { icon: '💬', tone: C.blue, key: 'message' };
  }

  if (status === 'accepted') {
    return { icon: '✅', tone: '#10B981', key: 'accepted' };
  }

  if (status === 'rejected') {
    return { icon: '❌', tone: '#EF4444', key: 'rejected' };
  }

  return { icon: '📅', tone: '#F59E0B', key: 'booking' };
}

function isReminderLikeStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return (
    normalized.startsWith('reminder_') ||
    normalized === 'appointment_now' ||
    normalized === 'appointment_missed'
  );
}

function dedupeReminderNotifications(list = []) {
  const seenReminderByAppointment = new Set();

  return list.filter((notification) => {
    const type = String(notification?.type || '').toLowerCase();
    const status = String(notification?.status || '').toLowerCase();

    if (type !== 'appointment' || !isReminderLikeStatus(status)) {
      return true;
    }

    const appointmentId = String(notification?.appointmentId || '');
    if (!appointmentId) return true;

    if (seenReminderByAppointment.has(appointmentId)) {
      return false;
    }

    seenReminderByAppointment.add(appointmentId);
    return true;
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isGuest, logout, deleteAccount, refreshUserProfile, pushReadiness } = useUser();
  const { t, language } = useLanguage();
  const {
    notifications = [],
    fetchNotifications,
    markOneAsRead,
  } = useNotifications();
  const tr = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const isProMode = String(route?.params?.appMode || 'user').toLowerCase() === 'pro';

  const activeLanguage = useMemo(() => language, [language]);

  const homeText = useCallback((key, fallback) => {
    return HOME_STATIC_TEXT?.[activeLanguage]?.[key]
      || HOME_STATIC_TEXT?.en?.[key]
      || fallback;
  }, [activeLanguage]);

  const bannerCtaLabel = tr('bannerCtaLabel', 'Decouvrir');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountDeletionPending, setAccountDeletionPending] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');
  const [notifOnlyUnread, setNotifOnlyUnread] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);
  const [featuredCompanies, setFeaturedCompanies] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [refreshingHome, setRefreshingHome] = useState(false);
  const [bannerDetails, setBannerDetails] = useState(null);
  const [bannerMediaViewer, setBannerMediaViewer] = useState(null);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [bannerEditId, setBannerEditId] = useState(null);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    price: '',
    description: '',
    ctaUrl: '',
    mediaUrl: '',
    mediaType: 'none',
    bg1: '#2D1B69',
    bg2: '#7B2FBE',
  });
  const bannerListRef = useRef(null);
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const bannerAutoDriver = useRef(new Animated.Value(0)).current;
  const bannerAutoListenerIdRef = useRef(null);
  const bannerCurrentOffsetRef = useRef(0);
  const bannerIsDraggingRef = useRef(false);
  const bannerIsAnimatingRef = useRef(false);
  const bannerAutoAnimRef = useRef(null);
  const modeSwitchTimeoutRef = useRef(null);
  const homeRefreshInFlightRef = useRef(false);
  const lastHomeRefreshAtRef = useRef(0);

  const defaultBanners = useMemo(() => {
    return DEFAULT_BANNERS_BY_LANGUAGE?.[activeLanguage] || DEFAULT_BANNERS_BY_LANGUAGE.en || BANNERS;
  }, [activeLanguage]);
  const businessTypes = useBusinessTypes(CATEGORIES, activeLanguage);

  const localizedCategories = useMemo(() => {
    return businessTypes.map((cat) => ({
      ...cat,
      label: cat.label || t(`category_${cat.id}`, cat.label),
    }));
  }, [businessTypes, t]);

  const activeBanners = useMemo(() => {
    if (Array.isArray(bannerAds) && bannerAds.length > 0) {
      return bannerAds.map((banner) => localizeBannerForLanguage(banner, activeLanguage));
    }
    return defaultBanners;
  }, [bannerAds, defaultBanners, activeLanguage]);

  const bannerMediaViewerUrl = useMemo(() => String(bannerMediaViewer?.url || '').trim(), [bannerMediaViewer?.url]);

  const closeBannerMediaViewer = useCallback(() => {
    setBannerMediaViewer(null);
  }, []);

  const closeBannerDetails = useCallback(() => {
    setBannerMediaViewer(null);
    setBannerDetails(null);
  }, []);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useFocusEffect(
    useCallback(() => {
      refreshUserProfile?.();
    }, [refreshUserProfile])
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      console.warn('Logout error:', err.message);
    }
  };

  const confirmDeleteAccount = useCallback(async () => {
    if (accountDeletionPending) return;

    setAccountDeletionPending(true);
    try {
      setDrawerOpen(false);
      await deleteAccount();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      Alert.alert(
        tr('accountDeletedTitle', 'Compte supprimé'),
        tr('accountDeletedBody', 'Votre compte a été supprimé définitivement.')
      );
    } catch (error) {
      Alert.alert(
        tr('deleteAccountErrorTitle', 'Suppression impossible'),
        error?.message || tr('deleteAccountErrorBody', 'Impossible de supprimer votre compte pour le moment.')
      );
    } finally {
      setAccountDeletionPending(false);
    }
  }, [accountDeletionPending, deleteAccount, navigation, tr]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      tr('deleteAccountTitle', 'Supprimer le compte'),
      tr(
        'deleteAccountWarningBody',
        'Cette action est irréversible. Toutes vos données, entreprises, rendez-vous, messages et notifications seront supprimés définitivement.'
      ),
      [
        { text: t('cancel', 'Annuler'), style: 'cancel' },
        {
          text: tr('continueAction', 'Continuer'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              tr('deleteAccountFinalTitle', 'Confirmation finale'),
              tr(
                'deleteAccountFinalBody',
                'Confirmez-vous la suppression définitive de votre compte ? Cette action ne peut pas être annulée.'
              ),
              [
                { text: t('cancel', 'Annuler'), style: 'cancel' },
                {
                  text: tr('deleteForever', 'Supprimer définitivement'),
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  }, [confirmDeleteAccount, t, tr]);

  const normalizedNotifications = useMemo(
    () => dedupeReminderNotifications(notifications || []),
    [notifications]
  );

  const effectiveUnreadCount = useMemo(
    () => normalizedNotifications.filter((n) => !n?.read).length,
    [normalizedNotifications]
  );

  const notifStats = useMemo(() => {
    return normalizedNotifications.reduce(
      (acc, n) => {
        const type = String(n?.type || '').toLowerCase();
        const status = String(n?.status || '').toLowerCase();

        acc.total += 1;
        if (!n?.read) acc.unread += 1;
        if (type === 'message') acc.messages += 1;
        if (type === 'appointment' || type === 'booking') acc.bookings += 1;
        if (status === 'accepted') acc.accepted += 1;
        if (status === 'rejected') acc.rejected += 1;
        return acc;
      },
      { total: 0, unread: 0, messages: 0, bookings: 0, accepted: 0, rejected: 0 }
    );
  }, [normalizedNotifications]);

  const notificationFilters = useMemo(
    () => [
      { key: 'all', label: t('all'), count: notifStats.total },
      { key: 'message', label: t('messages'), count: notifStats.messages },
      { key: 'booking', label: t('bookings'), count: notifStats.bookings },
      { key: 'accepted', label: t('accepted'), count: notifStats.accepted },
      { key: 'rejected', label: t('rejected'), count: notifStats.rejected },
    ],
    [t, notifStats]
  );

  const filteredNotifications = useMemo(() => {
    return normalizedNotifications.filter((n) => {
      if (notifOnlyUnread && n?.read) return false;

      const type = String(n?.type || '').toLowerCase();
      const status = String(n?.status || '').toLowerCase();

      if (notifFilter === 'message') return type === 'message';
      if (notifFilter === 'booking') return type === 'appointment' || type === 'booking';
      if (notifFilter === 'accepted') return status === 'accepted';
      if (notifFilter === 'rejected') return status === 'rejected';
      return true;
    });
  }, [normalizedNotifications, notifOnlyUnread, notifFilter]);

  const openNotificationCenter = () => {
    fetchNotifications?.();
    setNotifOpen(true);
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = (notifications || []).filter((n) => !n?.read);
      await Promise.all(unread.map((n) => markOneAsRead?.(n._id)));
      await fetchNotifications?.();
    } catch (e) {
      console.warn('mark all read failed:', e?.message || e);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification) return;
    if (!notification.read) {
      const appointmentId = String(notification?.appointmentId || '').trim();
      const notificationStatus = String(notification?.status || '').toLowerCase();
      const isReminder = isReminderLikeStatus(notificationStatus);

      if (appointmentId && isReminder) {
        const relatedUnread = (notifications || []).filter((n) => {
          if (n?.read) return false;
          const type = String(n?.type || '').toLowerCase();
          if (type !== 'appointment') return false;
          const status = String(n?.status || '').toLowerCase();
          if (!isReminderLikeStatus(status)) return false;
          return String(n?.appointmentId || '').trim() === appointmentId;
        });

        if (relatedUnread.length) {
          await Promise.all(relatedUnread.map((n) => markOneAsRead?.(n._id)));
        } else {
          await markOneAsRead?.(notification._id);
        }
      } else {
        await markOneAsRead?.(notification._id);
      }
    }

    const type = String(notification?.type || '').toLowerCase();
    setNotifOpen(false);

    if (type === 'appointment' && notification?.appointmentId) {
      navigation.navigate('MainTabs', {
        screen: 'CompanyHome',
        params: {
          screen: 'AppointmentDetails',
          params: {
            id: String(notification.appointmentId),
            appointmentId: String(notification.appointmentId),
          },
        },
      });
      return;
    }

    if (type === 'message') {
      const companyId = String(
        notification?.companyId?._id || notification?.companyId || ''
      ).trim();
      const selectedUserId = String(
        notification?.senderId?._id || notification?.senderId || ''
      ).trim();
      const selectedUserName =
        String(notification?.senderId?.name || '').trim() || undefined;

      navigation.navigate('MainTabs', {
        screen: 'Messages',
        params: {
          ...(companyId ? { companyId } : {}),
          ...(selectedUserId ? { selectedUserId } : {}),
          ...(selectedUserName ? { selectedUserName } : {}),
        },
      });
      return;
    }

    navigation.navigate('MainTabs', { screen: 'Booking' });
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!notificationId) return;
    try {
      await deleteNotificationApi(notificationId);
      await fetchNotifications?.();
    } catch (e) {
      console.warn('delete notification failed:', e?.message || e);
    }
  };

  const openScreenFromDrawer = (name, params) => {
    setDrawerOpen(false);
    navigation.navigate(name, params);
  };

  const loadFeaturedCompanies = useCallback(async () => {
    try {
      const companies = await getAllCompanies();
      const visibleCompanies = Array.isArray(companies)
        ? companies.filter(isCompanyPubliclyVisible)
        : [];
      const normalized = normalizeFeaturedCompanies(visibleCompanies);
      setFeaturedCompanies(normalized);

      try {
        await AsyncStorage.setItem(
          FEATURED_COMPANIES_CACHE_KEY,
          JSON.stringify(normalized)
        );
      } catch (_) {
        // Cache is best-effort only.
      }
    } catch (err) {
      console.warn('load featured companies error:', err?.message || err);
    }
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      const data = await getBanners();
      const nextBanners = Array.isArray(data)
        ? data
        : Array.isArray(data?.banners)
          ? data.banners
          : [];
      setBannerAds(nextBanners);
    } catch (err) {
      console.warn('load banners error:', err?.message || err);
    }
  }, []);

  const refreshHomeData = useCallback(async ({ manual = false } = {}) => {
    if (homeRefreshInFlightRef.current) return;

    const now = Date.now();
    const minAutoRefreshGapMs = 30 * 1000;
    if (!manual && now - lastHomeRefreshAtRef.current < minAutoRefreshGapMs) {
      return;
    }

    homeRefreshInFlightRef.current = true;
    if (manual) setRefreshingHome(true);

    try {
      await Promise.all([
        loadFeaturedCompanies(),
        loadBanners(),
        fetchNotifications?.(),
      ]);
      lastHomeRefreshAtRef.current = Date.now();
    } finally {
      homeRefreshInFlightRef.current = false;
      if (manual) setRefreshingHome(false);
    }
  }, [loadFeaturedCompanies, loadBanners, fetchNotifications]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCachedCompanies = async () => {
      try {
        const cached = await AsyncStorage.getItem(FEATURED_COMPANIES_CACHE_KEY);
        if (!isMounted || !cached) return;

        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFeaturedCompanies(parsed);
        }
      } catch (_) {
        // Ignore cache parse errors and fall back to network refresh.
      }
    };

    hydrateCachedCompanies();
    refreshHomeData();

    const focusUnsub = navigation.addListener('focus', () => {
      refreshHomeData();
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshHomeData();
      }
    });

    const autoRefreshInterval = setInterval(() => {
      refreshHomeData();
    }, 60 * 1000);

    return () => {
      isMounted = false;
      focusUnsub?.();
      appStateSub.remove();
      clearInterval(autoRefreshInterval);
    };
  }, [navigation, refreshHomeData]);

  useEffect(() => {
    return () => {
      if (modeSwitchTimeoutRef.current) {
        clearTimeout(modeSwitchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    bannerAutoListenerIdRef.current = bannerAutoDriver.addListener(({ value }) => {
      bannerCurrentOffsetRef.current = value;
      bannerListRef.current?.scrollToOffset?.({ offset: value, animated: false });
    });

    return () => {
      if (bannerAutoListenerIdRef.current) {
        bannerAutoDriver.removeListener(bannerAutoListenerIdRef.current);
      }
      bannerAutoAnimRef.current?.stop?.();
    };
  }, [bannerAutoDriver]);

  const animateBannerToIndex = useCallback((nextIndex) => {
    if (bannerIsAnimatingRef.current) return;

    const boundedIndex = Math.max(0, Math.min(nextIndex, activeBanners.length - 1));
    const targetOffset = boundedIndex * BANNER_SNAP_INTERVAL;
    const startOffset = bannerCurrentOffsetRef.current;

    if (Math.abs(targetOffset - startOffset) < 1) {
      setBannerIndex(boundedIndex);
      return;
    }

    bannerAutoAnimRef.current?.stop?.();
    bannerIsAnimatingRef.current = true;
    bannerAutoDriver.stopAnimation();
    bannerAutoDriver.setValue(startOffset);

    const midOffset = startOffset + (targetOffset - startOffset) * 0.72;

    bannerAutoAnimRef.current = Animated.sequence([
      Animated.timing(bannerAutoDriver, {
        toValue: midOffset,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(bannerAutoDriver, {
        toValue: targetOffset,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    bannerAutoAnimRef.current.start(({ finished }) => {
      bannerIsAnimatingRef.current = false;
      if (!finished) return;
      bannerCurrentOffsetRef.current = targetOffset;
      setBannerIndex(boundedIndex);
    });
  }, [bannerAutoDriver, activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      if (bannerIsDraggingRef.current || bannerIsAnimatingRef.current) return;
      const currentIndex = Math.round(bannerCurrentOffsetRef.current / BANNER_SNAP_INTERVAL);
      const nextIndex = (currentIndex + 1) % activeBanners.length;
      animateBannerToIndex(nextIndex);
    }, BANNER_AUTO_SCROLL_MS);

    return () => clearInterval(intervalId);
  }, [animateBannerToIndex, activeBanners.length]);

  const openCreateBanner = () => {
    setBannerEditId(null);
    setBannerForm({
      title: '',
      subtitle: '',
      price: '',
      description: '',
      ctaUrl: '',
      mediaUrl: '',
      mediaType: 'none',
      bg1: '#2D1B69',
      bg2: '#7B2FBE',
    });
    setBannerEditorOpen(true);
  };

  const openEditBanner = (item) => {
    setBannerEditId(String(item?._id || item?.id || ''));
    setBannerForm({
      title: String(item?.title || ''),
      subtitle: String(item?.subtitle || ''),
      price: String(item?.price || ''),
      description: String(item?.description || ''),
      ctaUrl: String(item?.ctaUrl || ''),
      mediaUrl: String(item?.mediaUrl || ''),
      mediaType: String(item?.mediaType || 'none'),
      bg1: String(item?.bg?.[0] || '#2D1B69'),
      bg2: String(item?.bg?.[1] || '#7B2FBE'),
    });
    setBannerEditorOpen(true);
  };

  const saveBanner = async () => {
    const title = String(bannerForm.title || '').trim();
    if (!title) {
      Alert.alert(tr('requiredFieldTitle', 'Champ requis'), tr('bannerTitleRequired', 'Le titre de la publicité est obligatoire.'));
      return;
    }

    const payload = {
      title,
      subtitle: String(bannerForm.subtitle || '').trim(),
      price: String(bannerForm.price || '').trim(),
      description: String(bannerForm.description || '').trim(),
      ctaLabel: bannerCtaLabel,
      ctaUrl: String(bannerForm.ctaUrl || '').trim(),
      mediaUrl: String(bannerForm.mediaUrl || '').trim(),
      mediaType: String(bannerForm.mediaType || 'none').trim() || 'none',
      bg: [
        String(bannerForm.bg1 || '#2D1B69').trim() || '#2D1B69',
        String(bannerForm.bg2 || '#7B2FBE').trim() || '#7B2FBE',
      ],
    };

    try {
      const savedBanner = bannerEditId
        ? await updateBanner(bannerEditId, payload)
        : await createBanner(payload);

      if (savedBanner?._id) {
        setBannerAds((prev) => {
          const bannerId = String(savedBanner._id);
          const nextBanner = savedBanner;
          const existingIndex = prev.findIndex((banner) => String(banner?._id || banner?.id || '') === bannerId);

          if (existingIndex === -1) {
            return [nextBanner, ...prev];
          }

          const next = [...prev];
          next[existingIndex] = nextBanner;
          return next;
        });
      }

      if (bannerEditId) {
        setBannerDetails((current) => {
          if (!current) return current;
          return String(current?._id || '') === String(savedBanner?._id || '') ? savedBanner : current;
        });
      }

      setBannerEditorOpen(false);
    } catch (err) {
      Alert.alert(tr('error', 'Erreur'), err?.response?.data?.error || err?.message || tr('bannerSaveError', 'Impossible de sauvegarder la publicité.'));
    }
  };

  const pickBannerMedia = async (mode = 'image') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(tr('permissionRequired', 'Permission requise'), tr('bannerMediaPermission', 'Autorise l\'accès à la galerie pour ajouter une image ou une vidéo.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mode === 'video' ? ['videos'] : ['images'],
        allowsEditing: mode === 'image',
        // Let users move/zoom with fingers without forcing a fixed crop ratio.
        aspect: undefined,
        selectionLimit: 1,
        quality: 0.9,
      });

      if (result?.canceled || !result?.assets?.length) return;

      const asset = result.assets[0];
      const isVideo = String(asset?.type || '').toLowerCase() === 'video';
      const fileName = asset?.fileName || `${Date.now()}-${isVideo ? 'video' : 'image'}`;
      const mimeType = asset?.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

      const uploadRes = await uploadBannerMedia({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      const mediaType = uploadRes?.mediaType || (isVideo ? 'video' : 'image');

      setBannerForm((prev) => ({
        ...prev,
        mediaUrl: String(uploadRes?.url || ''),
        mediaType,
      }));
    } catch (err) {
      Alert.alert(tr('error', 'Erreur'), err?.response?.data?.error || err?.message || tr('bannerMediaUploadError', 'Upload média impossible'));
    }
  };

  const removeBanner = async (item) => {
    const bannerId = String(item?._id || item?.id || '');
    if (!bannerId) return;

    Alert.alert(tr('delete', 'Supprimer'), tr('bannerDeleteConfirm', 'Supprimer cette publicité ?'), [
      { text: tr('cancel', 'Annuler'), style: 'cancel' },
      {
        text: tr('delete', 'Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBanner(bannerId);
            await loadBanners();
          } catch (err) {
            Alert.alert(tr('error', 'Erreur'), err?.response?.data?.error || err?.message || tr('bannerDeleteError', 'Suppression impossible.'));
          }
        },
      },
    ]);
  };

  const defaultCompanyIdFromContext = useMemo(() => {
    const fromNotifications = (notifications || []).find((n) => {
      const type = String(n?.type || '').toLowerCase();
      const companyId = String(n?.companyId?._id || n?.companyId || '').trim();
      return companyId && (type === 'message' || type === 'appointment' || type === 'booking');
    });

    const notifCompanyId = String(
      fromNotifications?.companyId?._id || fromNotifications?.companyId || ''
    ).trim();
    if (notifCompanyId) return notifCompanyId;

    const featuredCompanyId = String(featuredCompanies?.[0]?.id || '').trim();
    return featuredCompanyId;
  }, [notifications, featuredCompanies]);

  const latestMessageNotification = useMemo(
    () =>
      (notifications || []).find((n) => {
        const type = String(n?.type || '').toLowerCase();
        const companyId = String(n?.companyId?._id || n?.companyId || '').trim();
        return type === 'message' && companyId;
      }) || null,
    [notifications]
  );

  const openDrawerMessages = () => {
    const companyId = defaultCompanyIdFromContext;
    if (!companyId) {
      Alert.alert(tr('messagesUnavailable', 'Messages indisponibles'), tr('noConversationAvailable', 'Aucune conversation disponible pour le moment.'));
      return;
    }

    const selectedUserId = String(
      latestMessageNotification?.senderId?._id || latestMessageNotification?.senderId || ''
    ).trim();
    const selectedUserName =
      String(latestMessageNotification?.senderId?.name || '').trim() || undefined;

    openScreenFromDrawer('MainTabs', {
      companyId,
      screen: 'Messages',
      params: {
        companyId,
        ...(selectedUserId ? { selectedUserId } : {}),
        ...(selectedUserName ? { selectedUserName } : {}),
      },
    });
  };

  const openDrawerBookings = () => {
    const companyId = defaultCompanyIdFromContext;
    if (!companyId) {
      Alert.alert(tr('bookingsUnavailable', 'Rendez-vous indisponibles'), tr('noCompanyForBookings', 'Aucune entreprise disponible pour afficher les rendez-vous.'));
      return;
    }

    openScreenFromDrawer('MainTabs', {
      companyId,
      screen: 'Booking',
      params: { companyId },
    });
  };

  const handleShareApp = useCallback(async () => {
    const inviteTitle = tr('shareAppTitle', 'Partager GoOn');
    const inviteMessage = tr(
      'shareAppMessage',
      `Decouvre GoOn et telecharge l'app ici:\n\n📱 iPhone (App Store): ${APP_STORE_URL}\n🤖 Android (Play Store): ${PLAY_STORE_URL}`
    );

    try {
      await Share.share({
        title: inviteTitle,
        message: inviteMessage,
        url: APP_STORE_URL,
      });
    } catch (error) {
      Alert.alert(
        tr('error', 'Erreur'),
        tr('shareAppError', 'Impossible de partager l\'application pour le moment.')
      );
    }
  }, [tr]);

  const handleSwitchToProSpace = useCallback(() => {
    if (isGuest) {
      setDrawerOpen(false);
      navigation.navigate('Login');
      return;
    }

    if (isSwitchingMode) return;

    const nextRoute = isProMode ? 'UserHome' : 'ProHome';
    const nextMode = isProMode ? 'user' : 'pro';
    setDrawerOpen(false);
    setIsSwitchingMode(true);
    AsyncStorage.setItem(APP_MODE_STORAGE_KEY, nextMode).catch(() => {});

    modeSwitchTimeoutRef.current = setTimeout(() => {
      setIsSwitchingMode(false);
      navigation.navigate(nextRoute);
    }, MODE_SWITCH_GIF_DURATION_MS);
  }, [isGuest, navigation, isProMode, isSwitchingMode]);

  const drawerMainItems = [
    { key: 'home', icon: '🏠', label: t('drawerHome'), active: true, onPress: () => openScreenFromDrawer(isProMode ? 'ProHome' : 'UserHome') },
    { key: 'dashboard', icon: '📊', label: t('drawerDashboard'), onPress: () => openScreenFromDrawer('AnalyticsDashboard') },
    { key: 'profile', icon: '👤', label: t('drawerProfile'), onPress: () => openScreenFromDrawer('Profile') },
    { key: 'messages', icon: '💬', label: t('tabMessages'), onPress: openDrawerMessages },
    {
      key: 'bookings',
      icon: '🗓️',
      label: t('bookings'),
      onPress: openDrawerBookings,
    },
    {
      key: 'notification-labs',
      icon: '🔔',
      label: tr('drawerNotificationLabs', 'Notification Labs'),
      onPress: () => openScreenFromDrawer('NotificationLabs'),
    },
    { key: 'settings', icon: '⚙️', label: t('drawerSettings'), onPress: () => openScreenFromDrawer('Settings') },
  ];


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.purple} />

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)}>
          <Pressable style={styles.drawerPanel} onPress={() => {}}>
            <View style={styles.drawerHero}>
              <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.drawerCloseBtn}>
                <Text style={styles.drawerCloseText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.drawerAvatarLarge}>
                {user?.avatar ? (
                  <Image
                    key={resolveAvatarUri(user.avatar, API_URL)}
                    source={{ uri: resolveAvatarUri(user.avatar, API_URL) }}
                    style={styles.drawerAvatarLargeImage}
                  />
                ) : (
                  <Text style={styles.drawerAvatarLargeText}>{initials}</Text>
                )}
              </View>

              <Text style={styles.drawerHeroName}>{user?.name || t('userDefault')}</Text>
              <Text style={styles.drawerHeroSub}>{user?.email || ''}</Text>

              <View style={styles.drawerHeroGlowA} />
              <View style={styles.drawerHeroGlowB} />
            </View>

            <View style={styles.drawerMenuSection}>
              {drawerMainItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.drawerMenuItem, item.active && styles.drawerMenuItemActive]}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.drawerMenuIcon}>{item.icon}</Text>
                  <Text style={[styles.drawerMenuText, item.active && styles.drawerMenuTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.drawerBottomSection}>
              <TouchableOpacity
                style={styles.drawerBottomItem}
                onPress={() =>
                  openScreenFromDrawer('AllCompanies', {
                    categoryId: "",
                    categoryName: tr('allCategories', 'All Categories'),
                    categoryIcon: '🌐',
                    categoryColor: C.purple,
                  })
                }
              >
                <Text style={styles.drawerBottomText}>🌐 {t('drawerCategories')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerBottomItem, styles.drawerBottomItemPrimary]}
                onPress={handleSwitchToProSpace}
                activeOpacity={0.85}
              >
                <Text style={[styles.drawerBottomText, styles.drawerBottomTextPrimary]}>
                  {isProMode
                    ? `👤 ${tr('switchToUserMode', 'Passer en mode User')}`
                    : `🏢 ${tr('switchToProMode', 'Passer en mode Pro')}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerBottomItem} onPress={handleLogout}>
                <Text style={styles.drawerBottomText}>⎋ {t('logout')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerBottomItem, styles.drawerBottomItemDanger, accountDeletionPending && styles.drawerBottomItemDisabled]}
                onPress={handleDeleteAccount}
                disabled={accountDeletionPending}
              >
                <Text style={[styles.drawerBottomText, styles.drawerBottomTextDanger]}>
                  🗑 {accountDeletionPending
                    ? tr('deletingAccount', 'Suppression du compte...')
                    : tr('deleteAccountCta', 'Supprimer mon compte')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <Pressable style={styles.notifBackdrop} onPress={() => setNotifOpen(false)}>
          <Pressable style={styles.notifPanel} onPress={() => {}}>
            <View style={styles.notifHeaderRow}>
              <View>
                <Text style={styles.notifTitle}>{t('notificationCenter')}</Text>
                <Text style={styles.notifSubTitle}>
                  {notifStats.total} {t('total')} · {notifStats.unread} {t('pending')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.notifActionBtn, effectiveUnreadCount === 0 && { opacity: 0.45 }]}
                disabled={effectiveUnreadCount === 0}
                onPress={handleMarkAllRead}
              >
                <Text style={styles.notifActionText}>{t('markAllRead')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notifStatsRow}>
              <View style={styles.notifStatChip}><Text style={styles.notifStatText}>💬 {notifStats.messages}</Text></View>
              <View style={styles.notifStatChip}><Text style={styles.notifStatText}>📅 {notifStats.bookings}</Text></View>
              <View style={styles.notifStatChip}><Text style={styles.notifStatText}>✅ {notifStats.accepted}</Text></View>
              <View style={styles.notifStatChip}><Text style={styles.notifStatText}>❌ {notifStats.rejected}</Text></View>
            </View>

            <View style={styles.notifSwitches}>
              <TouchableOpacity
                style={[styles.notifSwitch, notifOnlyUnread && styles.notifSwitchActive]}
                onPress={() => setNotifOnlyUnread((v) => !v)}
                activeOpacity={0.85}
              >
                <Text style={[styles.notifSwitchText, notifOnlyUnread && styles.notifSwitchTextActive]}>
                  {t('unreadOnly')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notifSwitch, notifPreview && styles.notifSwitchActive]}
                onPress={() => setNotifPreview((v) => !v)}
                activeOpacity={0.85}
              >
                <Text style={[styles.notifSwitchText, notifPreview && styles.notifSwitchTextActive]}>
                  {t('showPreview')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.notifFiltersRow}
            >
              {notificationFilters.map((f) => {
                const active = notifFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.notifFilterChip, active && styles.notifFilterChipActive]}
                    onPress={() => setNotifFilter(f.key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.notifFilterText, active && styles.notifFilterTextActive]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {f.label} ({f.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FlatList
              data={filteredNotifications}
              keyExtractor={(item, index) => String(item?._id || item?.id || `notif-${index}`)}
              contentContainerStyle={styles.notifList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const meta = getNotificationMeta(item);
                const senderName = String(item?.senderId?.name || tr('unknownSender', 'Unknown sender')).trim();
                const { title: displayTitle, message: displayMessage } = getLocalizedNotificationCopy(item, activeLanguage, {
                  senderName,
                  fallbackTitle: item?.title || t('notificationCenter'),
                  fallbackMessage: item?.message || '',
                });
                const tagLabel = t(getNotificationTagKey(item), meta.key);
                return (
                  <Swipeable
                    overshootRight={false}
                    rightThreshold={34}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={styles.notifDeleteAction}
                        onPress={() => handleDeleteNotification(item?._id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.notifDeleteActionText}>{tr('delete', 'Supprimer')}</Text>
                      </TouchableOpacity>
                    )}
                  >
                    <TouchableOpacity
                      style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.86}
                    >
                      <View style={[styles.notifIconWrap, { backgroundColor: `${meta.tone}22` }]}>
                        <Text style={styles.notifIcon}>{meta.icon}</Text>
                      </View>

                      <View style={styles.notifCardBody}>
                        <View style={styles.notifCardTopRow}>
                          <Text style={styles.notifCardTitle} numberOfLines={1}>
                            {displayTitle}
                          </Text>
                          <Text style={styles.notifCardTime}>{timeAgo(t, item?.createdAt)}</Text>
                        </View>

                        {notifPreview ? (
                          <Text style={styles.notifCardMessage} numberOfLines={2}>
                            {displayMessage}
                          </Text>
                        ) : null}

                        <View style={styles.notifCardFooter}>
                          <Text style={[styles.notifCardType, { color: meta.tone }]}>#{tagLabel}</Text>
                          <Text style={styles.notifCardAction}>{t('goTo')}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.notifEmpty}>
                  <Text style={styles.notifEmptyIcon}>🔕</Text>
                  <Text style={styles.notifEmptyTitle}>{t('noNotifications')}</Text>
                  <Text style={styles.notifEmptySub}>{t('noNotificationsSub')}</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isSwitchingMode} transparent animationType="fade">
        <View style={styles.modeSwitchOverlay}>
          <Image
            source={require('../assets/LogoAnimeGoOn.gif')}
            style={styles.modeSwitchGif}
            resizeMode="contain"
          />
        </View>
      </Modal>

      <Modal
        visible={bannerEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBannerEditorOpen(false)}
      >
        <Pressable style={styles.notifBackdrop} onPress={() => setBannerEditorOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bannerEditorKeyboardAvoiding}
          >
            <Pressable style={styles.bannerEditorPanel} onPress={() => {}}>
              <Text style={styles.bannerEditorTitle}>{bannerEditId ? tr('editBanner', 'Modifier la publicité') : tr('addBanner', 'Ajouter une publicité')}</Text>
              <ScrollView
                style={styles.bannerEditorScroll}
                contentContainerStyle={styles.bannerEditorScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput style={styles.bannerInput} placeholder={tr('titleLabel', 'Titre')} value={bannerForm.title} onChangeText={(v) => setBannerForm((p) => ({ ...p, title: v }))} />
                <TextInput style={styles.bannerInput} placeholder={tr('subtitleLabel', 'Sous-titre')} value={bannerForm.subtitle} onChangeText={(v) => setBannerForm((p) => ({ ...p, subtitle: v }))} />
                <TextInput style={styles.bannerInput} placeholder={tr('pricePlaceholder', 'Prix (ex: 17 000 FCFA ou Sur devis)')} value={bannerForm.price} onChangeText={(v) => setBannerForm((p) => ({ ...p, price: v }))} />
                <Text style={styles.bannerFieldHint}>{tr('priceHint', 'Vous pouvez saisir un montant ou indiquer "Sur devis".')}</Text>
                <Text style={styles.bannerFieldHint}>{tr('ctaAutoHint', 'Libelle bouton applique automatiquement')}: {bannerCtaLabel}</Text>
                <TextInput style={styles.bannerInput} placeholder={tr('linkOptional', 'Lien (optionnel)')} value={bannerForm.ctaUrl} onChangeText={(v) => setBannerForm((p) => ({ ...p, ctaUrl: v }))} />
                <TouchableOpacity
                  style={styles.bannerMediaPreviewBox}
                  onPress={() => pickBannerMedia('image')}
                  activeOpacity={0.9}
                >
                  {!!bannerForm.mediaUrl && bannerForm.mediaType === 'image' ? (
                    <>
                      <Image
                        source={{ uri: bannerForm.mediaUrl }}
                        style={styles.bannerMediaPreviewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.bannerMediaFrameHint}>
                        <Text style={styles.bannerMediaFrameHintText}>{tr('tapToCrop', 'Touchez pour recadrer')}</Text>
                      </View>
                    </>
                  ) : !!bannerForm.mediaUrl && bannerForm.mediaType === 'video' ? (
                    <View style={styles.bannerMediaPreviewVideo}>
                      <Text style={styles.bannerMediaPreviewVideoIcon}>🎬</Text>
                      <Text style={styles.bannerMediaPreviewVideoText}>{tr('currentVideo', 'Vidéo actuelle')}</Text>
                      <Text style={styles.bannerMediaPreviewVideoUrl} numberOfLines={1}>
                        {bannerForm.mediaUrl}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.bannerMediaPreviewEmpty}>{tr('tapToAddImage', 'Touchez le cadre pour ajouter une image')}</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.bannerMediaPickRow}>
                  <TouchableOpacity style={styles.bannerMediaPickBtn} onPress={() => pickBannerMedia('image')}>
                    <Text style={styles.bannerMediaPickText}>
                      🖼 {bannerForm.mediaType === 'image' && bannerForm.mediaUrl ? tr('replaceImage', 'Remplacer image') : tr('addImage', 'Ajouter image')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bannerMediaPickBtn} onPress={() => pickBannerMedia('video')}>
                    <Text style={styles.bannerMediaPickText}>
                      🎬 {bannerForm.mediaType === 'video' && bannerForm.mediaUrl ? tr('replaceVideo', 'Remplacer vidéo') : tr('addVideo', 'Ajouter vidéo')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!!bannerForm.mediaUrl && (
                  <TouchableOpacity
                    style={styles.bannerMediaRemoveBtn}
                    onPress={() => setBannerForm((prev) => ({ ...prev, mediaUrl: '', mediaType: 'none' }))}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.bannerMediaRemoveText}>{tr('removeMedia', 'Supprimer le média')}</Text>
                  </TouchableOpacity>
                )}
                {!!bannerForm.mediaUrl && (
                  <Text style={styles.bannerMediaHint} numberOfLines={1}>
                    {tr('mediaAddedPrefix', 'Média')}: {bannerForm.mediaType === 'video' ? tr('videoLabel', 'vidéo') : tr('imageLabel', 'image')} {tr('addedLabel', 'ajouté')}
                  </Text>
                )}
                <TextInput style={styles.bannerInput} placeholder={tr('bgColor1', 'Couleur fond 1 (hex)')} value={bannerForm.bg1} onChangeText={(v) => setBannerForm((p) => ({ ...p, bg1: v }))} />
                <TextInput style={styles.bannerInput} placeholder={tr('bgColor2', 'Couleur fond 2 (hex)')} value={bannerForm.bg2} onChangeText={(v) => setBannerForm((p) => ({ ...p, bg2: v }))} />
                <TextInput
                  style={[styles.bannerInput, styles.bannerInputMultiline]}
                  placeholder={tr('fullDescription', 'Description complète')}
                  value={bannerForm.description}
                  onChangeText={(v) => setBannerForm((p) => ({ ...p, description: v }))}
                  maxLength={3000}
                  multiline
                />
              </ScrollView>
              <View style={styles.bannerEditorActions}>
                <TouchableOpacity style={styles.bannerCancelBtn} onPress={() => setBannerEditorOpen(false)}>
                  <Text style={styles.bannerCancelBtnText}>{tr('cancel', 'Annuler')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bannerSaveBtn} onPress={saveBanner}>
                  <Text style={styles.bannerSaveBtnText}>{tr('save', 'Enregistrer')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={!!bannerDetails}
        transparent
        animationType="slide"
        onRequestClose={closeBannerDetails}
      >
        <View style={styles.bannerDetailsOverlay}>
          <Pressable style={styles.bannerDetailsBackdrop} onPress={closeBannerDetails} />
          <SafeAreaView style={styles.bannerDetailsScreen}>
            <View style={styles.bannerDetailsHeader}>
              <Text style={styles.bannerEditorTitle}>{tr('viewAd', 'Voir la publicite')}</Text>
              <TouchableOpacity style={styles.bannerDetailsCloseBtn} onPress={closeBannerDetails}>
                <Text style={styles.bannerDetailsCloseBtnText}>{tr('close', 'Fermer')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.bannerDetailsScroll}
              contentContainerStyle={styles.bannerDetailsScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.bannerDetailsTitle}>{bannerDetails?.title || homeText('defaultAdTitle', 'Publicite')}</Text>
              {!!bannerDetails?.subtitle && <Text style={styles.bannerDetailsSubtitle}>{bannerDetails.subtitle}</Text>}
              {!!bannerDetails?.ownerId?.name && (
                <Text style={styles.bannerDetailsOwner}>{tr('publishedBy', 'Publie par')}: {bannerDetails.ownerId.name}</Text>
              )}
              {!!String(bannerDetails?.price || '').trim() && (
                <Text style={styles.bannerDetailsPrice}>{bannerDetails.price}</Text>
              )}
              {!!bannerDetails?.mediaUrl && bannerDetails?.mediaType === 'image' && (
                <Pressable
                  style={styles.bannerDetailsImageWrap}
                  onPress={() => setBannerMediaViewer({ type: 'image', url: String(bannerDetails.mediaUrl) })}
                >
                  <Image
                    source={{ uri: String(bannerDetails.mediaUrl) }}
                    style={styles.bannerDetailsImage}
                    resizeMode="contain"
                  />
                </Pressable>
              )}
              {!!bannerDetails?.mediaUrl && bannerDetails?.mediaType === 'video' && (
                <View style={styles.bannerDetailsVideoWrap}>
                  <BannerVideo
                    uri={isSafeHttpUrl(bannerDetails?.mediaUrl) ? String(bannerDetails.mediaUrl) : ''}
                    style={styles.bannerDetailsVideo}
                    contentFit="contain"
                    looping
                    autoPlay
                    muted={false}
                    startAtBeginning
                    isActive={!!bannerDetails && !bannerMediaViewer}
                    nativeControls={false}
                    pointerEvents="none"
                  />
                </View>
              )}
              {!!String(bannerDetails?.mediaType || '').trim() && bannerDetails?.mediaType !== 'none' && (
                <Text style={styles.bannerDetailsMeta}>{tr('mediaType', 'Type de media')}: {String(bannerDetails.mediaType)}</Text>
              )}
              {!!bannerDetails?.description && (
                <>
                  <Text style={styles.bannerDetailsSectionTitle}>{tr('description', 'Description')}</Text>
                  <Text style={styles.bannerDetailsDescription} selectable>
                    {bannerDetails.description}
                  </Text>
                </>
              )}
              
              {!!String(bannerDetails?.ctaUrl || '').trim() && (
                <>
                  <Text style={styles.bannerDetailsSectionTitle}>{tr('link', 'Lien')}</Text>
                  <TouchableOpacity style={styles.bannerDetailsLinkWrap} onPress={() => Linking.openURL(String(bannerDetails.ctaUrl))}>
                    <Text style={styles.bannerDetailsLink} selectable>
                      {String(bannerDetails.ctaUrl)}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {!!bannerDetails?.createdAt && (
                <Text style={styles.bannerDetailsDate}>{tr('date', 'Date')}: {new Date(bannerDetails.createdAt).toLocaleString()}</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={!!bannerMediaViewer}
        animationType="fade"
        onRequestClose={closeBannerMediaViewer}
      >
        <SafeAreaView style={styles.bannerMediaViewerFullscreen}>
          <View style={styles.bannerMediaViewerHeader}>
            <Text style={styles.bannerMediaViewerTitle}>{tr('mediaPreview', 'Apercu media')}</Text>
            <TouchableOpacity style={styles.bannerDetailsCloseBtn} onPress={closeBannerMediaViewer}>
              <Text style={styles.bannerDetailsCloseBtnText}>{tr('close', 'Fermer')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerMediaViewerBody}>
            {bannerMediaViewer?.type === 'video' && !!bannerMediaViewerUrl ? (
              <BannerVideo
                uri={isSafeHttpUrl(bannerMediaViewerUrl) ? bannerMediaViewerUrl : ''}
                style={styles.bannerMediaViewerVideo}
                contentFit="contain"
                autoPlay
                looping
                muted={false}
                startAtBeginning
                isActive={!!bannerMediaViewer}
                nativeControls
              />
            ) : bannerMediaViewer?.type === 'image' && !!bannerMediaViewerUrl ? (
              <Image
                source={{ uri: bannerMediaViewerUrl }}
                style={styles.bannerMediaViewerImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.bannerMediaViewerEmptyText}>{tr('noMediaAvailable', 'Aucun media disponible')}</Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.avatarSmall}
              onPress={() => setDrawerOpen(true)}
              activeOpacity={0.85}
            >
              {user?.avatar ? (
                <Image
                  key={resolveAvatarUri(user.avatar, API_URL)}
                  source={{ uri: resolveAvatarUri(user.avatar, API_URL) }}
                  style={styles.avatarSmallImage}
                />
              ) : (
                <Text style={styles.avatarSmallText}>{initials}</Text>
              )}
            </TouchableOpacity>
            <View>
              <Text style={styles.headerHello}>{t('hello')}</Text>
              <Text style={styles.headerName}>{user?.name || t('userDefault')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={openNotificationCenter} activeOpacity={0.85}>
            <Text style={styles.notifBtnIcon}>🔔</Text>
            {effectiveUnreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshingHome}
            onRefresh={() => refreshHomeData({ manual: true })}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        }
      >
        {!isGuest && pushReadiness?.requiresAttention ? (
          <View style={styles.pushWarningCard}>
            <Text style={styles.pushWarningTitle}>⚠️ {homeText('pushWarningTitle', 'Notifications non pretes')}</Text>
            <Text style={styles.pushWarningText}>
              {pushReadiness?.reason === 'permission-denied'
                ? homeText('pushPermissionDenied', 'Activez les notifications dans les reglages du telephone.')
                : pushReadiness?.reason === 'missing-server-token'
                  ? homeText('pushMissingServerToken', 'Token push manquant: synchronisez votre appareil avant de continuer.')
                  : pushReadiness?.reason === 'expo-go-runtime'
                    ? homeText('pushExpoGoRuntime', 'Vous etes sur Expo Go. Pour la production, utilisez une vraie build.')
                    : homeText('pushConfigIncomplete', 'Configuration push incomplete. Ouvrez Notification Labs.')}
            </Text>
            <TouchableOpacity
              style={styles.pushWarningBtn}
              onPress={() => navigation.navigate('NotificationLabs')}
              activeOpacity={0.85}
            >
              <Text style={styles.pushWarningBtnText}>{homeText('openNotificationLabs', 'Ouvrir Notification Labs')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Bannières ── */}
        {/* <View style={styles.bannerHeaderRow}>
          <Text style={styles.sectionTitle}>{tr('adsSection', 'Publicités')}</Text>
          <TouchableOpacity style={styles.bannerAddBtn} onPress={openCreateBanner} activeOpacity={0.85}>
            <Text style={styles.bannerAddBtnText}>+ {tr('add', 'Ajouter')}</Text>
          </TouchableOpacity>
        </View> */}
        <Animated.FlatList
          ref={bannerListRef}
          data={activeBanners}
          horizontal
          snapToInterval={BANNER_SNAP_INTERVAL}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          keyExtractor={(item, i) => String(item?._id || item?.id || i)}
          renderItem={({ item, index }) => (
            <BannerCard
              item={item}
              index={index}
              scrollX={bannerScrollX}
              onPressView={() => setBannerDetails(item)}
              canManage={String(item?.ownerId?._id || item?.ownerId || '') === String(user?._id || '')}
              onPressEdit={() => openEditBanner(item)}
              onPressDelete={() => removeBanner(item)}
              videosEnabled={!bannerDetails && !bannerMediaViewer}
              editLabel={tr('edit', 'Modifier')}
              deleteLabel={tr('delete', 'Supprimer')}
              ctaLabel={bannerCtaLabel}
            />
          )}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
            {
              useNativeDriver: true,
              listener: (e) => {
                bannerCurrentOffsetRef.current = e.nativeEvent.contentOffset.x;
              },
            }
          )}
          onScrollBeginDrag={() => {
            bannerIsDraggingRef.current = true;
            bannerIsAnimatingRef.current = false;
            bannerAutoAnimRef.current?.stop?.();
          }}
          onScrollEndDrag={() => {
            bannerIsDraggingRef.current = false;
          }}
          onMomentumScrollEnd={e => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / BANNER_SNAP_INTERVAL);
            const clampedIndex = Math.max(0, Math.min(nextIndex, activeBanners.length - 1));
            bannerCurrentOffsetRef.current = clampedIndex * BANNER_SNAP_INTERVAL;
            setBannerIndex(clampedIndex);
          }}
          style={styles.bannerList}
          contentContainerStyle={{ paddingHorizontal: 16, gap: BANNER_GAP }}
        />
        {/* Indicateurs */}
        <View style={styles.dots}>
          {activeBanners.map((_, i) => (
            <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
          ))}
        </View>

        {/* ── Entreprises en avant ── */}
        <FlatList
          data={featuredCompanies}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => String(item?.id || `company-${index}`)}
          renderItem={({ item }) => (
            <FeaturedItem
              item={item}
              onPress={() => {
                const companyId = String(item?.id || '').trim();
                if (!companyId) {
                  Alert.alert(
                    homeText('invalidCompanyTitle', 'Erreur'),
                    homeText('invalidCompanyBody', 'Entreprise invalide, impossible d\'ouvrir le detail.')
                  );
                  return;
                }

                navigation.navigate('MainTabs', {
                  screen: 'CompanyHome',
                  params: {
                    companyId,
                    currentUserId: user?._id,
                  },
                });
              }}
            />
          )}
          style={styles.featuredList}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          ListEmptyComponent={
            <Text style={styles.featuredEmptyText}>{tr('noCompaniesYet', 'Aucune entreprise créée pour le moment.')}</Text>
          }
        />

        {/* ── Catégories ── */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('categories')}</Text>
          <View style={styles.sectionTitleLine} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('AllCompanies', {
                showAll: true,
                categoryName: tr('allCompanies', 'All Companies'),
                categoryIcon: '🏢',
                categoryColor: C.purple,
              })
            }
          >
            <Text style={[styles.sectionTitle, { color: C.purple }]}>{tr('seeAll', 'Tout voir')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categoryGrid}>
          {localizedCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              item={cat}
              onPress={() =>
                navigation.navigate('CategoryCompanies', {
                  categoryId: cat.id,
                  categoryName: cat.label,
                  categoryIcon: cat.icon,
                  categoryColor: cat.color,
                })
              }
            />
          ))}
        </View>
            

            
          
    

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bouton flottant Partager application ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleShareApp}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>📤</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  scroll:{ flex: 1 },
  scrollContent: { paddingBottom: 20 },
  pushWarningCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  pushWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 4,
  },
  pushWarningText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 10,
  },
  pushWarningBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  pushWarningBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitchOverlay: {
    flex: 1,
    backgroundColor: '#9320B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchGif: {
    width: '90%',
    height: '90%',
  },

  // Header
  header:      { backgroundColor: C.purple },
  headerInner: { flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    // paddingVertical: 14 
  },
    
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnIcon: { fontSize: 18 },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.white,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarSmall: { 
    width: 50, 
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bebebe',
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  avatarSmallImage: {
    width: 45,
    height: 45,
    borderRadius: 25,
  },
  avatarSmallText: { fontSize: 18, color: C.white, fontWeight: '600' },
  headerHello: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  headerName:  { fontSize: 18, fontWeight: '700', color: C.white },

  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'flex-start',
  },
  drawerPanel: {
    width: '82%',
    height: '100%',
    backgroundColor: '#fff',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  drawerHero: {
    backgroundColor: C.purple,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCloseText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  drawerAvatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  drawerAvatarLargeText: {
    color: C.purple,
    fontSize: 24,
    fontWeight: '800',
  },
  drawerAvatarLargeImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  drawerHeroName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  drawerHeroSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  drawerHeroGlowA: {
    position: 'absolute',
    right: -22,
    top: 24,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  drawerHeroGlowB: {
    position: 'absolute',
    right: 46,
    top: -28,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  drawerMenuSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 6,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  drawerMenuItemActive: {
    backgroundColor: C.purple,
  },
  drawerMenuIcon: {
    fontSize: 17,
  },
  drawerMenuText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  drawerMenuTextActive: {
    color: '#fff',
  },
  drawerBottomSection: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  drawerBottomItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  drawerBottomItemPrimary: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#C7D7FE',
  },
  drawerBottomItemDanger: {
    backgroundColor: '#FFF1F2',
  },
  drawerBottomItemDisabled: {
    opacity: 0.6,
  },
  drawerBottomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  drawerBottomTextPrimary: {
    color: '#1D4ED8',
  },
  drawerBottomTextDanger: {
    color: '#B42318',
  },

  notifBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 30, 0.48)',
    justifyContent: 'flex-end',
  },
  notifPanel: {
    height: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
  },
  notifSubTitle: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },
  notifActionBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  notifActionText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '700',
  },
  notifStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  notifStatChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  notifStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  notifSwitches: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  notifSwitch: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  notifSwitchActive: {
    backgroundColor: '#EDE9FE',
  },
  notifSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    
  },
  notifSwitchTextActive: {
    color: C.purpleDark,
  },
  notifFiltersRow: {
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  notifFilterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',

  },
  notifFilterChipActive: {
    backgroundColor: C.purple,
  },
  notifFilterText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 8,
    paddingTop: 8,
    marginBottom: 2,
  },
  notifFilterTextActive: {
    color: '#fff',
  },
  notifList: {
    paddingBottom: 24,
  },
  notifCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  notifCardUnread: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: {
    fontSize: 18,
  },
  notifCardBody: {
    flex: 1,
  },
  notifCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  notifCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  notifCardTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  notifCardMessage: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 6,
  },
  notifCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifCardType: {
    fontSize: 11,
    fontWeight: '800',
  },
  notifCardAction: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
  },
  notifDeleteAction: {
    width: 96,
    marginBottom: 10,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  notifDeleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  notifEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  notifEmptyIcon: { fontSize: 36, marginBottom: 10 },
  notifEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 4 },
  notifEmptySub: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  // Banners
  bannerHeaderRow: {
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerAddBtn: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerAddBtnText: {
    color: C.purpleDark,
    fontSize: 12,
    fontWeight: '800',
  },
  bannerList: { marginTop: 16 },
  banner: {
    width: BANNER_CARD_WIDTH,
    height: 188,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#140b2a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  bannerAccentOrbA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    right: -42,
    top: -68,
    zIndex: 0,
  },
  bannerAccentOrbB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    left: -36,
    bottom: -50,
    zIndex: 0,
  },
  bannerMediaBg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,

  },
  bannerMediaImage: {
    borderRadius: 18,

  },
  bannerMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 20, 0.46)',
    zIndex: 1,
  },
  bannerMediaVideoWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  bannerMediaVideoBg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  bannerShimmer: {
    position: 'absolute',
    left: 130,
    top: -70,
    width: 74,
    height: 340,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 2,
    elevation: 2,
  },
  bannerContent:  { zIndex: 3, elevation: 3 },
  bannerTextBlock: {
    maxWidth: '86%',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: C.white,
    lineHeight: 25,
    textShadowColor: 'rgba(0,0,0,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
  },
  bannerPriceBadge:{
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: -36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  bannerPrice:    { fontSize: 13, fontWeight: '800', color: '#111827' },
  bannerTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  bannerBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  bannerViewBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerViewBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  bannerOwnerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  bannerOwnerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bannerOwnerBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.22)',
  },
  bannerOwnerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerOwnerBtnTextDanger: {
    color: '#FECACA',
  },
  bannerEditorPanel: {
    marginTop: '20%',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    maxHeight: '78%',
  },
  bannerEditorKeyboardAvoiding: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerEditorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  bannerEditorScroll: {
    flexGrow: 0,
  },
  bannerEditorScrollContent: {
    paddingBottom: 4,
  },
  bannerInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  bannerInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  bannerFieldHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: -2,
  },
  bannerMediaPickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  bannerMediaPickBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  bannerMediaPickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  bannerMediaPreviewBox: {
    width: '100%',
    height: 170,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bannerMediaPreviewEmpty: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerMediaPreviewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },
  bannerMediaPreviewVideo: {
    width: '100%',
    height: '100%',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111827',
  },
  bannerMediaPreviewVideoIcon: {
    fontSize: 26,
  },
  bannerMediaPreviewVideoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  bannerMediaPreviewVideoUrl: {
    fontSize: 11,
    color: '#6B7280',
  },
  bannerMediaFrameHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bannerMediaFrameHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerMediaRemoveBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerMediaRemoveText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  bannerMediaHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  bannerEditorActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bannerCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerCancelBtnText: {
    color: '#4B5563',
    fontWeight: '700',
  },
  bannerSaveBtn: {
    backgroundColor: C.purple,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  bannerSaveBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  bannerDetailsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bannerDetailsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 8, 30, 0.48)',
  },
  bannerDetailsScreen: {
    maxHeight: '84%',
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  bannerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bannerDetailsCloseBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerDetailsCloseBtnText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12,
  },
  bannerDetailsScroll: {
    flex: 1,
  },
  bannerDetailsScrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  bannerDetailsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  bannerDetailsSubtitle: {
    fontSize: 14,
    color: '#374151',
  },
  bannerDetailsPrice: {
    fontSize: 16,
    color: C.purpleDark,
    fontWeight: '800',
  },
  bannerDetailsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  bannerDetailsDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bannerDetailsImageWrap: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDetailsImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  bannerDetailsVideoWrap: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerDetailsVideo: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  bannerDetailsMeta: {
    fontSize: 13,
    color: '#374151',
  },
  bannerDetailsLinkWrap: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerDetailsLink: {
    fontSize: 13,
    color: C.purpleDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
    lineHeight: 20,
  },
  bannerDetailsOwner: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  bannerDetailsDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    paddingBottom: 8,
  },
  bannerMediaViewerFullscreen: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  bannerMediaViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.16)',
  },
  bannerMediaViewerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bannerMediaViewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  bannerMediaViewerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1020',
  },
  bannerMediaViewerVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1020',
  },
  bannerMediaViewerEmptyText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 12 },
  dot:  {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(139,47,201,0.26)',
  },
  dotActive: {
    width: 20,
    height: 7,
    borderRadius: 999,
    backgroundColor: C.purple,
  },

  // Featured
  featuredList: { marginTop: 16 },
  featuredItem: { alignItems: 'center', width: 60 },
  featuredAvatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5,
    backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  featuredInitial: { fontSize: 20, fontWeight: '700', color: C.purple },
  featuredLogo: { width: 50, height: 50, borderRadius: 25 },
  featuredName:    { fontSize: 11, color: C.textSecondary, textAlign: 'center' },
  featuredEmptyText: { color: C.textSecondary, fontSize: 12, paddingVertical: 16 },

  // Categories
  sectionTitleRow: {
    marginTop: 24,
    marginBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  sectionTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(107,107,138,0.35)',
    marginTop: 2,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', 
    paddingHorizontal: 16, gap: 8, justifyContent: 'space-between' },
  categoryCard: {
    width: (width - 40) / 2,
    borderRadius: 18,
    padding: 20,
    paddingBottom: 22,
    minHeight: 110,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  categoryIcon:  { fontSize: 28, marginBottom: 10},
  categoryLabel: { fontSize: 14, fontWeight: '700', color: C.white, lineHeight: 19 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 98,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 13,
    elevation: 10,
  },
  fabIcon: { fontSize: 18, position: 'absolute' },
  fabPlus: { fontSize: 18, color: C.white, fontWeight: '300', marginTop: -4 },
});
