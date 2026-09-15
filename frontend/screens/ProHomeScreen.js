import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Alert,
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
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Dimensions,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import { getCategoryLabel } from '../utils/categoryLabels';
import { localizeNotificationContent, localizeNotificationTag } from '../utils/notificationI18n';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import AuthPromptModal from '../components/AuthPromptModal';



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
const DEFAULT_BANNERS = [
  {
    id: '1',
    titleByLanguage: {
      fr: 'Communication visuelle',
      en: 'Visual communication',
      es: 'Comunicacion visual',
      pt: 'Comunicacao visual',
    },
    subtitleByLanguage: {
      fr: 'Stickers predecoupes - 100 pieces',
      en: 'Pre-cut stickers - 100 pieces',
      es: 'Stickers precortados - 100 piezas',
      pt: 'Adesivos pre-cortados - 100 pecas',
    },
    priceByLanguage: {
      fr: '17 000 FCFA',
      en: '17,000 FCFA',
      es: '17 000 FCFA',
      pt: '17 000 FCFA',
    },
    bg: ['#2D1B69', '#7B2FBE'],
  },
  {
    id: '2',
    titleByLanguage: {
      fr: 'Impression offset',
      en: 'Offset printing',
      es: 'Impresion offset',
      pt: 'Impressao offset',
    },
    subtitleByLanguage: {
      fr: 'Flyers et brochures pro',
      en: 'Professional flyers and brochures',
      es: 'Folletos y brochures profesionales',
      pt: 'Flyers e brochuras profissionais',
    },
    priceByLanguage: {
      fr: '8 500 FCFA',
      en: '8,500 FCFA',
      es: '8 500 FCFA',
      pt: '8 500 FCFA',
    },
    bg: ['#1A3A5C', '#2E86C1'],
  },
  {
    id: '3',
    titleByLanguage: {
      fr: 'Packages visuels entreprise',
      en: 'Business visual packages',
      es: 'Paquetes visuales para empresas',
      pt: 'Pacotes visuais para empresas',
    },
    subtitleByLanguage: {
      fr: 'Proposez une image pro a votre entreprise',
      en: 'Give your company a professional image',
      es: 'Dale una imagen profesional a tu empresa',
      pt: 'Dê uma imagem profissional para sua empresa',
    },
    priceByLanguage: {
      fr: 'Sur devis',
      en: 'On quote',
      es: 'Bajo cotizacion',
      pt: 'Sob orcamento',
    },
    bg: ['#0F5132', '#2E8B57'],
  },
];

const CATEGORIES = [
  { id: '1', icon: '💻', color: C.blue, bg: C.blueLight },
  { id: '2', icon: '🍽️', color: '#E67E22', bg: '#FEF0E7' },
  { id: '3', icon: '💄', color: C.pink, bg: '#FCE4F3' },
  { id: '4', icon: '🏥', color: '#27AE60', bg: '#E8F8F0' },
  { id: '5', icon: '📚', color: '#8E44AD', bg: '#F4ECF7' },
  { id: '6', icon: '💰', color: '#F39C12', bg: '#FEFAE0' },
  { id: '7', icon: '🏠', color: '#2980B9', bg: '#EBF5FB' },
  { id: '8', icon: '🚗', color: '#E74C3C', bg: '#FDEDEC' },
  { id: '9', icon: '🏨', color: '#16A34A', bg: '#F0FDF4' },
  { id: '10', icon: '🎭', color: '#DC2626', bg: '#FEF2F2' },
  { id: '11', icon: '⚽', color: '#0891B2', bg: '#F0F9FA' },
  { id: '12', icon: '🏭', color: '#6366F1', bg: '#EEF2FF' },
  { id: '13', icon: '🌾', color: '#84CC16', bg: '#FEFCE8' },
  { id: '14', icon: '🔨', color: '#EA580C', bg: '#FEF3C7' },
  { id: '15', icon: '🛍️', color: '#D946EF', bg: '#FDF4FF' },
  { id: '16', icon: '⚖️', color: '#6B21A8', bg: '#FAF5FF' },
  { id: '17', icon: '💼', color: '#1F2937', bg: '#F3F4F6' },
  { id: '18', icon: '📢', color: '#DC2626', bg: '#FEE2E2' },
  { id: '19', icon: '📦', color: '#B45309', bg: '#FFFBEB' },
  { id: '20', icon: '⚡', color: '#7C3AED', bg: '#F5F3FF' },
  { id: '21', icon: '📡', color: '#0369A1', bg: '#F0F9FF' },
  { id: '22', icon: '📰', color: '#EF4444', bg: '#FEE2E2' },
  { id: '23', icon: '👥', color: '#8B5CF6', bg: '#FAF5FF' },
  { id: '24', icon: '♻️', color: '#059669', bg: '#F0FDF4' },
  { id: '25', icon: '🎨', color: '#F59E0B', bg: '#FEFCE8' },
  { id: '26', icon: '🐾', color: '#EF4444', bg: '#FEE2E2' },
  { id: '27', icon: '🚙', color: '#6366F1', bg: '#EEF2FF' },
  { id: '28', icon: '📷', color: '#1E40AF', bg: '#EFF6FF' },
  { id: '29', icon: '✈️', color: '#EC4899', bg: '#FCE7F3' },
  { id: '30', icon: '🎉', color: '#D946EF', bg: '#FDF4FF' },
  { id: '31', icon: '🛡️', color: '#1F2937', bg: '#F3F4F6' },
  { id: '32', icon: '🔧', color: '#0891B2', bg: '#F0F9FA' },
  { id: '33', icon: '⚙️', color: '#DC2626', bg: '#FEE2E2' },
  { id: '34', icon: '🧹', color: '#10B981', bg: '#F0FDF4' },
  { id: '35', icon: '🌿', color: '#16A34A', bg: '#F0FDF4' },
  { id: '36', icon: '🖨️', color: '#7C3AED', bg: '#F5F3FF' },
  { id: '37', icon: '💾', color: '#0369A1', bg: '#F0F9FF' },
  { id: '38', icon: '🎯', color: '#D946EF', bg: '#FDF4FF' },
  { id: '39', icon: '🌐', color: '#0891B2', bg: '#F0F9FA' },
  { id: '40', icon: '📝', color: '#F59E0B', bg: '#FEFCE8' },
];

const getLocalizedValue = (valuesByLanguage, language) => {
  if (!valuesByLanguage || typeof valuesByLanguage !== 'object') return '';
  return valuesByLanguage[language] || valuesByLanguage.en || valuesByLanguage.fr || '';
};

const FEATURED_COLORS = ['#E8402A', C.purple, '#2ECC71', C.blue, '#F39C12', '#14B8A6', '#E11D48'];
const FEATURED_COMPANIES_CACHE_KEY = '@goon:featured-companies-cache';
const APP_MODE_STORAGE_KEY = '@goon:app-mode';
const MODE_SWITCH_GIF_DURATION_MS = 1400;
const INLINE_BANNER_VIDEO_ENABLED = true;


const isSafeHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /^https?:\/\//i.test(raw);
};

const resolveCompanyLogo = (src) => resolveAvatarUri(src, API_URL);

const getCompanyOwnerId = (company) => {
  const owner = company?.ownerId;
  if (!owner) return '';
  if (typeof owner === 'object') return String(owner?._id || '').trim();
  return String(owner).trim();
};

const getCompanyId = (company) => {
  if (!company || typeof company !== 'object') return '';
  return String(company?._id || company?.id || '').trim();
};

const getCompanyName = (company) => {
  if (!company || typeof company !== 'object') return '';
  return String(company?.name || '').trim();
};

const isAlreadyFeaturedEntry = (company) => {
  if (!company || typeof company !== 'object') return false;
  return !!getCompanyId(company) && !!getCompanyName(company) && !company?._id;
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getFeaturedRankingSignals = (company) => {
  const summary = company?.appreciationSummary || {};
  const likes = Math.max(0, toFiniteNumber(summary.likes, 0));
  const stars = Math.max(0, Math.min(5, toFiniteNumber(summary.averageRating, 0)));
  const total = Math.max(0, toFiniteNumber(summary.total, 0));
  return { likes, stars, total };
};

const getFeaturedRankingScore = (company) => {
  const { likes, stars, total } = getFeaturedRankingSignals(company);
  // Pro ranking: priorité aux likes, puis note moyenne, puis volume d'avis.
  return likes * 1000 + stars * 100 + Math.min(total, 500);
};

const isCompanyPubliclyVisible = (company) => {
  if (!company || typeof company !== 'object') return false;

  // Une entreprise est publique si elle est validée
  // (aligné sur buildPublicCompanyVisibilityFilter côté backend)
  return company?.setupStatus === 'ready' || Boolean(company?.profileValidatedAt);
};

const normalizeFeaturedCompanies = (companies = []) => {
  return [...companies]
    .filter((company) => getCompanyId(company) && getCompanyName(company) && isCompanyPubliclyVisible(company))
    .sort((a, b) => {
      const scoreDiff = getFeaturedRankingScore(b) - getFeaturedRankingScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const aSignals = getFeaturedRankingSignals(a);
      const bSignals = getFeaturedRankingSignals(b);
      if (bSignals.likes !== aSignals.likes) return bSignals.likes - aSignals.likes;
      if (bSignals.stars !== aSignals.stars) return bSignals.stars - aSignals.stars;
      if (bSignals.total !== aSignals.total) return bSignals.total - aSignals.total;

      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    })
    .map((company, index) => ({
      id: getCompanyId(company),
      name: getCompanyName(company),
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
  const mediaUrl = resolveAvatarUri(String(item?.mediaUrl || '').trim(), API_URL);
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
            <View style={styles.bannerOwnerActions}>
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
            </View>
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
            <Text style={styles.bannerViewBtnText}>{ctaLabel}</Text>
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

const PUSH_WARNING_TEXT = {
  fr: {
    title: 'Notifications indisponibles',
    permissionDenied:
      'Activez les notifications dans les réglages du téléphone.',
    configIncomplete:
      'La configuration des notifications push est incomplète. Ouvrez le laboratoire des notifications.',
    openLabs: 'Ouvrir le laboratoire des notifications',
  },

  en: {
    title: 'Notifications not ready',
    permissionDenied:
      'Enable notifications in your phone settings.',
    configIncomplete:
      'Push notification configuration is incomplete. Open Notification Labs.',
    openLabs: 'Open Notification Labs',
  },

  es: {
    title: 'Notificaciones no disponibles',
    permissionDenied:
      'Activa las notificaciones en los ajustes del teléfono.',
    configIncomplete:
      'La configuración de las notificaciones push está incompleta. Abre el laboratorio de notificaciones.',
    openLabs: 'Abrir el laboratorio de notificaciones',
  },

  pt: {
    title: 'Notificações indisponíveis',
    permissionDenied:
      'Ative as notificações nas configurações do telefone.',
    configIncomplete:
      'A configuração das notificações push está incompleta. Abra o laboratório de notificações.',
    openLabs: 'Abrir o laboratório de notificações',
  },

  zh: {
    title: '通知尚未就绪',
    permissionDenied:
      '请在手机设置中启用通知。',
    configIncomplete:
      '推送通知配置不完整。请打开通知实验室。',
    openLabs: '打开通知实验室',
  },

  hi: {
    title: 'सूचनाएं तैयार नहीं हैं',
    permissionDenied:
      'अपने फ़ोन की सेटिंग में सूचनाएं सक्षम करें।',
    configIncomplete:
      'पुश नोटिफ़िकेशन कॉन्फ़िगरेशन अधूरी है। नोटिफ़िकेशन लैब खोलें।',
    openLabs: 'नोटिफ़िकेशन लैब खोलें',
  },

  ar: {
    title: 'الإشعارات غير جاهزة',
    permissionDenied:
      'قم بتفعيل الإشعارات من إعدادات الهاتف.',
    configIncomplete:
      'إعدادات إشعارات الدفع غير مكتملة. افتح مختبر الإشعارات.',
    openLabs: 'افتح مختبر الإشعارات',
  },

  bn: {
    title: 'বিজ্ঞপ্তি প্রস্তুত নয়',
    permissionDenied:
      'ফোনের সেটিংস থেকে বিজ্ঞপ্তি চালু করুন।',
    configIncomplete:
      'পুশ বিজ্ঞপ্তির কনফিগারেশন অসম্পূর্ণ। বিজ্ঞপ্তি ল্যাব খুলুন।',
    openLabs: 'বিজ্ঞপ্তি ল্যাব খুলুন',
  },

  ru: {
    title: 'Уведомления не готовы',
    permissionDenied:
      'Включите уведомления в настройках телефона.',
    configIncomplete:
      'Настройки push-уведомлений не завершены. Откройте лабораторию уведомлений.',
    openLabs: 'Открыть лабораторию уведомлений',
  },

  ja: {
    title: '通知の準備ができていません',
    permissionDenied:
      'スマートフォンの設定で通知を有効にしてください。',
    configIncomplete:
      'プッシュ通知の設定が完了していません。通知ラボを開いてください。',
    openLabs: '通知ラボを開く',
  },

  de: {
    title: 'Benachrichtigungen nicht verfügbar',
    permissionDenied:
      'Aktivieren Sie Benachrichtigungen in den Einstellungen Ihres Telefons.',
    configIncomplete:
      'Die Konfiguration der Push-Benachrichtigungen ist unvollständig. Öffnen Sie das Benachrichtigungslabor.',
    openLabs: 'Benachrichtigungslabor öffnen',
  },

  id: {
    title: 'Notifikasi belum siap',
    permissionDenied:
      'Aktifkan notifikasi di pengaturan ponsel Anda.',
    configIncomplete:
      'Konfigurasi notifikasi push belum lengkap. Buka Lab Notifikasi.',
    openLabs: 'Buka Lab Notifikasi',
  },

  ur: {
    title: 'نوٹیفکیشنز تیار نہیں ہیں',
    permissionDenied:
      'اپنے فون کی ترتیبات میں نوٹیفکیشنز فعال کریں۔',
    configIncomplete:
      'پش نوٹیفکیشنز کی کنفیگریشن نامکمل ہے۔ نوٹیفکیشن لیب کھولیں۔',
    openLabs: 'نوٹیفکیشن لیب کھولیں',
  },
};

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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
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
  const { user, isGuest, logout, deleteAccount, refreshUserProfile, pushReadiness } = useUser();
  const { t, language, activeLanguage } = useLanguage();
  const pushWarningText = PUSH_WARNING_TEXT[activeLanguage] || PUSH_WARNING_TEXT.en;
  const {
    notifications = [],
    fetchNotifications,
    markOneAsRead,
  } = useNotifications();
  const tr = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const bannerCtaLabel = tr('bannerCtaLabel', 'Decouvrir');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');
  const [notifOnlyUnread, setNotifOnlyUnread] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);
  const [featuredCompanies, setFeaturedCompanies] = useState([]);
  const [bannerAds, setBannerAds] = useState([]);
  const [bannerDetails, setBannerDetails] = useState(null);
  const [bannerMediaViewer, setBannerMediaViewer] = useState(null);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
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
  const featuredInFlightRef = useRef(false);
  const bannersInFlightRef = useRef(false);
  const lastFeaturedLoadAtRef = useRef(0);
  const lastBannersLoadAtRef = useRef(0);

  const activeBanners = useMemo(() => {
    if (Array.isArray(bannerAds) && bannerAds.length > 0) return bannerAds;
    return DEFAULT_BANNERS.map((banner) => ({
      id: banner.id,
      title: getLocalizedValue(banner.titleByLanguage, language),
      subtitle: getLocalizedValue(banner.subtitleByLanguage, language),
      price: getLocalizedValue(banner.priceByLanguage, language),
      bg: banner.bg,
    }));
  }, [bannerAds, language]);

  const localizedCategories = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        label: getCategoryLabel(category.id, activeLanguage),
      })),
    [language]
  );

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
      // AppNavigator switches to unauthenticated stack when auth state is cleared.
    } catch (err) {
      console.warn('Logout error:', err.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('deleteAccountTitle'), t('deleteAccountWarningBody'), [
      { text: t('cancel', 'Annuler'), style: 'cancel' },
      {
        text: t('deleteAccountCta'),
        style: 'destructive',
        onPress: async () => {
          const result = await deleteAccount();
          if (!result?.success) {
            Alert.alert(t('deleteAccountErrorTitle'), result?.error || t('deleteAccountErrorBody'));
            return;
          }

          Alert.alert(t('accountDeletedTitle'), t('accountDeletedBody'), [
            {
              text: t('ok', 'OK'),
              // Auth cleanup already switches navigator to the login flow.
              onPress: () => {},
            },
          ]);
        },
      },
    ]);
  };

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

  const loadFeaturedCompanies = useCallback(async ({ force = false } = {}) => {
    if (featuredInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastFeaturedLoadAtRef.current < 12000) return;

    featuredInFlightRef.current = true;
    try {
      const companies = await getAllCompanies({ scope: 'all' });
      const normalized = normalizeFeaturedCompanies(companies);
      setFeaturedCompanies(normalized);
      lastFeaturedLoadAtRef.current = Date.now();

      try {
        await AsyncStorage.setItem(
          FEATURED_COMPANIES_CACHE_KEY,
          JSON.stringify(companies)
        );
      } catch (_) {
        // Cache is best-effort only.
      }
    } catch (err) {
      console.warn('load featured companies error:', err?.message || err);
    } finally {
      featuredInFlightRef.current = false;
    }
  }, []);

  const loadBanners = useCallback(async ({ force = false } = {}) => {
    if (bannersInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastBannersLoadAtRef.current < 12000) return;

    bannersInFlightRef.current = true;
    try {
      const data = await getBanners();
      const nextBanners = Array.isArray(data)
        ? data
        : Array.isArray(data?.banners)
          ? data.banners
          : [];
      setBannerAds(nextBanners);
      lastBannersLoadAtRef.current = Date.now();
    } catch (err) {
      console.warn('load banners error:', err?.message || err);
    } finally {
      bannersInFlightRef.current = false;
    }
  }, []);

  const refreshHomeData = useCallback(async ({ force = false } = {}) => {
    await Promise.all([
      loadFeaturedCompanies({ force }),
      loadBanners({ force }),
    ]);
  }, [loadFeaturedCompanies, loadBanners]);

  const { runRefresh: runHomeRefresh } = useSmartRefresh({
    refreshFn: refreshHomeData,
    intervalMs: 60000,
    minGapMs: 5000,
    runOnFocus: true,
    runOnAppActive: true,
  });

  const handleHomeRefresh = useCallback(async () => {
    setHomeRefreshing(true);
    try {
      await runHomeRefresh({ force: true });
    } finally {
      setHomeRefreshing(false);
    }
  }, [runHomeRefresh]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCachedCompanies = async () => {
      try {
        const cached = await AsyncStorage.getItem(FEATURED_COMPANIES_CACHE_KEY);
        if (!isMounted || !cached) return;

        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizedFromCache = parsed.every(isAlreadyFeaturedEntry)
            ? []
            : normalizeFeaturedCompanies(parsed);
          setFeaturedCompanies(normalizedFromCache);
        }
      } catch (_) {
        // Ignore cache parse errors and fall back to network refresh.
      }
    };

    hydrateCachedCompanies();
    runHomeRefresh({ force: true });

    return () => {
      isMounted = false;
    };
  }, [runHomeRefresh]);

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
      Alert.alert(tr('error', 'Error'), err?.response?.data?.error || err?.message || tr('bannerSaveError', 'Unable to save the banner.'));
    }
  };

  const pickBannerMedia = async (mode = 'image') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(tr('permissionRequired'), tr('bannerMediaPermission'));
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
      Alert.alert(tr('messagesUnavailable', 'Messages unavailable'), tr('noConversationAvailable', 'No conversation is available right now.'));
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
      Alert.alert(tr('bookingsUnavailable', 'Bookings unavailable'), tr('noCompanyForBookings', 'No company is available to display appointments.'));
      return;
    }

    openScreenFromDrawer('MainTabs', {
      companyId,
      screen: 'Booking',
      params: { companyId },
    });
  };

  const handleSwitchToUserSpace = useCallback(() => {
    if (isSwitchingMode) return;

    setDrawerOpen(false);
    setIsSwitchingMode(true);
    AsyncStorage.setItem(APP_MODE_STORAGE_KEY, 'user').catch(() => {});

    modeSwitchTimeoutRef.current = setTimeout(() => {
      setIsSwitchingMode(false);
      navigation.navigate('UserHome');
    }, MODE_SWITCH_GIF_DURATION_MS);
  }, [navigation, isSwitchingMode]);

  // Guest guard: show AuthPromptModal instead of navigating to protected screens
  const guardGuest = (action) => () => {
    if (isGuest) { setDrawerOpen(false); setShowAuthPrompt(true); return; }
    action();
  };

  const drawerMainItems = [
    { key: 'home', icon: '🏠', label: t('drawerHome'), active: true, onPress: () => openScreenFromDrawer('ProHome') },
    { key: 'dashboard', icon: '📊', label: t('drawerDashboard'), onPress: guardGuest(() => openScreenFromDrawer('AnalyticsDashboard')) },
    { key: 'profile', icon: '👤', label: t('drawerProfile'), onPress: guardGuest(() => openScreenFromDrawer('Profile')) },
    { key: 'messages', icon: '💬', label: t('tabMessages'), onPress: guardGuest(openDrawerMessages) },
    {
      key: 'bookings',
      icon: '🗓️',
      label: t('bookings'),
      onPress: guardGuest(openDrawerBookings),
    },
    {
      key: 'notification-labs',
      icon: '🔔',
      label: tr('drawerNotificationLabs', 'Notification Labs'),
      onPress: () => openScreenFromDrawer('NotificationLabs'),
    },
    { key: 'settings', icon: '⚙️', label: t('drawerSettings'), onPress: guardGuest(() => openScreenFromDrawer('Settings')) },
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
                onPress={handleSwitchToUserSpace}
                activeOpacity={0.85}
              >
                <Text style={[styles.drawerBottomText, styles.drawerBottomTextPrimary]}>
                  👤 {tr('switchToUserMode', 'Passer en mode User')}
                </Text>
              </TouchableOpacity>

              {isGuest ? (
                <TouchableOpacity style={styles.drawerBottomItem} onPress={() => { setDrawerOpen(false); navigation.navigate('Login'); }}>
                  <Text style={styles.drawerBottomText}>🔑 {t('signIn', 'Sign In')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.drawerBottomItem} onPress={handleLogout}>
                    <Text style={styles.drawerBottomText}>⎋ {t('logout')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.drawerBottomItem, styles.drawerBottomItemDanger]}
                    onPress={handleDeleteAccount}
                  >
                    <Text style={[styles.drawerBottomText, styles.drawerBottomTextDanger]}>🗑 {t('deleteAccount')}</Text>
                  </TouchableOpacity>
                </>
              )}
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
                const localizedNotification = localizeNotificationContent(item, language);
                const localizedTag = localizeNotificationTag(meta.key, t);
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
                            {localizedNotification.title || t('notificationCenter')}
                          </Text>
                          <Text style={styles.notifCardTime}>{timeAgo(item?.createdAt)}</Text>
                        </View>

                        {notifPreview ? (
                          <Text style={styles.notifCardMessage} numberOfLines={2}>
                            {localizedNotification.message || ''}
                          </Text>
                        ) : null}

                        <View style={styles.notifCardFooter}>
                          <Text style={[styles.notifCardType, { color: meta.tone }]}>#{localizedTag}</Text>
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
              <Text style={styles.bannerDetailsTitle}>{bannerDetails?.title || 'Publicite'}</Text>
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
                  onPress={() => setBannerMediaViewer({ type: 'image', url: resolveAvatarUri(String(bannerDetails.mediaUrl || ''), API_URL) })}
                >
                  <Image
                    source={{ uri: resolveAvatarUri(String(bannerDetails.mediaUrl || ''), API_URL) }}
                    style={styles.bannerDetailsImage}
                    resizeMode="contain"
                  />
                </Pressable>
              )}
              {!!bannerDetails?.mediaUrl && bannerDetails?.mediaType === 'video' && (
                <View style={styles.bannerDetailsVideoWrap}>
                  <BannerVideo
                    uri={isSafeHttpUrl(resolveAvatarUri(String(bannerDetails?.mediaUrl || ''), API_URL)) ? resolveAvatarUri(String(bannerDetails?.mediaUrl || ''), API_URL) : ''}
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
                uri={isSafeHttpUrl(resolveAvatarUri(bannerMediaViewerUrl, API_URL)) ? resolveAvatarUri(bannerMediaViewerUrl, API_URL) : ''}
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
                source={{ uri: resolveAvatarUri(bannerMediaViewerUrl, API_URL) }}
                style={styles.bannerMediaViewerImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.bannerMediaViewerEmptyText}>{tr('noMediaAvailable', 'No media available')}</Text>
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
            refreshing={homeRefreshing}
            onRefresh={handleHomeRefresh}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        }
      >
        {pushReadiness?.requiresAttention ? (
          <View style={styles.pushWarningCard}>
            <Text style={styles.pushWarningTitle}>⚠️ {pushWarningText.title}</Text>
            <Text style={styles.pushWarningText}>
              {pushReadiness?.reason === 'permission-denied'
                ? pushWarningText.permissionDenied
                : pushReadiness?.reason === 'missing-server-token'
                  ? tr('pushMissingTokenHint', 'Token push manquant: synchronisez votre appareil avant de continuer.')
                  : pushReadiness?.reason === 'expo-go-runtime'
                    ? tr('pushExpoGoHint', 'Vous etes sur Expo Go. Pour la production, utilisez une vraie build.')
                    : pushWarningText.configIncomplete}
            </Text>
            <TouchableOpacity
              style={styles.pushWarningBtn}
              onPress={() => navigation.navigate('NotificationLabs')}
              activeOpacity={0.85}
            >
              <Text style={styles.pushWarningBtnText}>{pushWarningText.openLabs}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Bannières ── */}
        <View style={styles.bannerHeaderRow}>
          <Text style={styles.sectionTitle}>{tr('adsSection', 'Publicités')}</Text>
          <TouchableOpacity style={styles.bannerAddBtn} onPress={() => { if (isGuest) { setShowAuthPrompt(true); return; } openCreateBanner(); }} activeOpacity={0.85}>
            <Text style={styles.bannerAddBtnText}>+ {tr('add', 'Ajouter')}</Text>
          </TouchableOpacity>
        </View>
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
                  Alert.alert(tr('error', 'Erreur'), tr('invalidCompanyDetail', 'Entreprise invalide, impossible d\'ouvrir le detail.'));
                  return;
                }

                navigation.navigate('MainTabs', {
                  screen: 'CompanyHome',
                  params: {
                    screen: 'CompanyOverview',
                    params: {
                      companyId,
                      currentUserId: user?._id || null,
                    },
                    companyId,
                    currentUserId: user?._id || null,
                  },
                });
              }}
            />
          )}
          style={styles.featuredList}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          ListEmptyComponent={
            <Text style={styles.featuredEmptyText}>{tr('noCompaniesYet', 'No companies have been created yet.')}</Text>
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
                refreshFromHomeAt: Date.now(),
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
                  refreshFromHomeAt: Date.now(),
                })
              }
            />
          ))}
        </View>
            

            
          
    

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bouton flottant Créer entreprise ── */}
          <TouchableOpacity
                  style={styles.fab}
                  onPress={() => {
                    if (isGuest) { setShowAuthPrompt(true); return; }
                    navigation.navigate('CreateCompany');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.fabIcon}>🏪</Text>
                  <Text style={styles.fabPlus}>+</Text>
                </TouchableOpacity>
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
  drawerBottomItemDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  drawerBottomItemPrimary: {
    backgroundColor: '#E0E7FF',
  },
  drawerBottomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  drawerBottomTextPrimary: {
    color: '#1E3A8A',
  },
  drawerBottomTextDanger: {
    color: '#B91C1C',
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
