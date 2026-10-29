import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import {
  getAppointmentById,
  updateAppointmentStatus,
  getAppointmentAppreciations,
  submitAppointmentAppreciation,
  getCompanyById,
  sendMessageApi,
} from '../services/api';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  separator: '#C6C6C8',
  label: '#6D6D72',
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  success: '#34C759',
  successLight: '#E9F8EE',
  danger: '#FF3B30',
  dangerLight: '#FFEEED',
  warning: '#FF9500',
  warningLight: '#FFF4E5',
  purple: '#5856D6',
  purpleLight: '#EEEEFF',
  gray: '#8E8E93',
  grayLight: '#F2F2F7',
  textPrimary: '#000000',
  textSecondary: '#6D6D72',
  textTertiary: '#AEAEB2',
};

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { labelKey: 'statusPending',   color: C.warning, bg: C.warningLight, icon: '🕐' },
  accepted:  { labelKey: 'statusAccepted',  color: C.success, bg: C.successLight, icon: '✅' },
  rejected:  { labelKey: 'statusRejected',  color: C.danger,  bg: C.dangerLight,  icon: '❌' },
  completed: { labelKey: 'statusCompleted', color: C.purple,  bg: C.purpleLight,  icon: '🎉' },
  cancelled: { labelKey: 'statusCancelled', color: C.gray,    bg: C.grayLight,    icon: '🚫' },
};

const TYPE_CONFIG = {
  video:     { labelKey: 'typeVideo',     icon: '📹' },
  in_person: { labelKey: 'typeInPerson',  icon: '🏢' },
  phone:     { labelKey: 'typePhone',     icon: '📞' },
  message:   { labelKey: 'typeMessage',   icon: '💬' },
  appointment: { labelKey: 'appointmentsTitle', icon: '📅' },
  booking:   { labelKey: 'appointmentsTitle', icon: '📅' },
};

const PRIORITY_CONFIG = {
  low:    { labelKey: 'priorityLow',    color: C.success },
  normal: { labelKey: 'priorityNormal', color: C.warning },
  high:   { labelKey: 'priorityHigh',   color: C.danger  },
};

const DATE_LOCALE_BY_LANGUAGE = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ar: 'ar-SA',
  bn: 'bn-BD',
  ru: 'ru-RU',
  ja: 'ja-JP',
  de: 'de-DE',
  id: 'id-ID',
  ur: 'ur-PK',
};

const formatDisplayDate = (value, language) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(DATE_LOCALE_BY_LANGUAGE[language] || 'en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatDisplayTime = (dateValue, timeValue, language) => {
  if (timeValue) return String(timeValue);
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString(DATE_LOCALE_BY_LANGUAGE[language] || 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

function extractFirstHttpUrl(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text) continue;
    const direct = text.match(/^https?:\/\/\S+$/i);
    if (direct) return direct[0];
    const embedded = text.match(URL_REGEX);
    if (embedded) return embedded[0];
  }
  return '';
}

function buildDefaultVideoUrl(appointmentId) {
  const safeId = String(appointmentId || 'room')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return `https://talky.io/room/goone6-${safeId || 'room'}`;
}

function convertMeetingUrlToTalky(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const normalized = /^https?:\/\//i.test(text)
      ? text
      : text.replace(/^org\.jitsi\.meet:\/\//i, 'https://meet.jit.si/');

    const parsed = new URL(normalized);
    const host = String(parsed.hostname || '').toLowerCase();

    if (host === 'talky.io' && parsed.pathname.startsWith('/room/')) {
      return parsed.toString();
    }

    if (host === 'meet.jit.si' || host.endsWith('.jit.si')) {
      const segments = String(parsed.pathname || '').split('/').filter(Boolean);
      const room = String(segments[segments.length - 1] || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 90);

      if (!room) return '';
      return `https://talky.io/room/${room}`;
    }

    return parsed.toString();
  } catch (_) {
    return text;
  }
}

function normalizePhone(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const cleaned = text.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\+/g, '')}`;
  }
  return cleaned;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>;
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value || '—'}</Text>
    </View>
  );
}

function CompletedBanner({ senderName }) {
  const { t } = useLanguage();
  return (
    <View style={styles.completedBanner}>
      <Text style={styles.completedEmoji}>🎉</Text>
      <Text style={styles.completedTitle}>{t('appointmentFinalizedTitle', 'Rendez-vous finalisé')}</Text>
      <Text style={styles.completedSub}>{t('appointmentFinalizedTitle', 'Rendez-vous finalisé')} · {senderName}</Text>
    </View>
  );
}

// ─── Cancel Sheet ─────────────────────────────────────────────────────────────
// Modale inline (slide-up) pour saisir la raison d'annulation
function CancelSheet({ visible, onConfirm, onDismiss, updating }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [reason, setReason] = useState('');
  const { t, activeLanguage } = useLanguage();

  useEffect(() => {
    if (visible) {
      setReason('');
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const QUICK_REASONS = useMemo(() => ([
    t('quickReason1'),
    t('quickReason2'),
    t('quickReason3'),
    t('quickReason4'),
  ]), [t, activeLanguage]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="auto"
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>{t('cancelAppointmentSheet')}</Text>
        <Text style={styles.sheetSub}>
          {t('cancelSheetSub')}
        </Text>

        {/* Quick reasons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScroll}
          contentContainerStyle={styles.quickScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_REASONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.quickChip, reason === r && styles.quickChipSelected]}
              onPress={() => setReason(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickChipText, reason === r && styles.quickChipTextSelected]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Free text */}
        <View style={styles.reasonInputWrap}>
          <TextInput
            style={styles.reasonInput}
            placeholder={t('cancelOtherReason', 'Autre raison…')}
            placeholderTextColor={C.textTertiary}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={280}
          />
          {reason.length > 0 && (
            <Text style={styles.charCount}>{reason.length}/280</Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={styles.sheetBtnCancel}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetBtnCancelText}>{t('back', 'Retour')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetBtnConfirm, updating && styles.actionDisabled]}
            onPress={() => { Keyboard.dismiss(); onConfirm(reason.trim()); }}
            disabled={updating}
            activeOpacity={0.75}
          >
            {updating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sheetBtnConfirmText}>{t('confirmCancel', "Confirmer l'annulation")}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AppointmentDetailsScreen({ route, navigation }) {
  const id = route?.params?.id || route?.params?.appointmentId;
  const { user, ensurePushReadyOrAlert } = useUser();
  const { t, language, activeLanguage } = useLanguage();

  const tr = (key, fallbackByLanguage) => {
    const translated = t(key);
    const normalizedLang = String(language || 'en').toLowerCase();
    const englishFallback = fallbackByLanguage?.en;

    if (translated !== key) {
      // If a non-English locale still returns the English UI copy,
      // prefer explicit localized fallback for this screen.
      if (
        normalizedLang !== 'en' &&
        englishFallback &&
        String(translated).trim() === String(englishFallback).trim()
      ) {
        return fallbackByLanguage?.[normalizedLang] || translated;
      }
      return translated;
    }

    return fallbackByLanguage?.[normalizedLang] || fallbackByLanguage?.en || key;
  };

  const pickLocalized = (fallbackByLanguage) => {
    const normalizedLang = String(language || 'en').toLowerCase();
    return fallbackByLanguage?.[normalizedLang] || fallbackByLanguage?.en || '';
  };

  const [data, setData]           = useState(null);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [appreciationLoading, setAppreciationLoading] = useState(false);
  const [appreciationSubmitting, setAppreciationSubmitting] = useState(false);
  const [myAppreciation, setMyAppreciation] = useState(null);
  const [otherAppreciation, setOtherAppreciation] = useState(null);
  const [appreciationSummary, setAppreciationSummary] = useState({ total: 0, likes: 0, dislikes: 0, averageRating: null });
  const [likedSelection, setLikedSelection] = useState(null);
  const [ratingSelection, setRatingSelection] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [companyContactPhone, setCompanyContactPhone] = useState('');

  useEffect(() => { loadAppointment(); }, []);

  const loadAppreciations = async (appointmentId = id) => {
    try {
      setAppreciationLoading(true);
      const res = await getAppointmentAppreciations(appointmentId);
      const mine = res?.mine || null;
      const fromOther = res?.fromOther || null;

      setMyAppreciation(mine);
      setOtherAppreciation(fromOther);
      setAppreciationSummary(res?.summary || { total: 0, likes: 0, dislikes: 0, averageRating: null });
      setLikedSelection(typeof mine?.liked === 'boolean' ? mine.liked : null);
      setRatingSelection(typeof mine?.rating === 'number' ? mine.rating : 0);
      setCommentInput(String(mine?.comment || ''));
    } catch (e) {
      console.log('❌ APPRECIATION FETCH ERROR:', e.response?.data || e.message);
    } finally {
      setAppreciationLoading(false);
    }
  };

  const loadAppointment = async () => {
    try {
      const appointment = await getAppointmentById(id);
      setData(appointment);

      const companyId = appointment?.companyId?._id || appointment?.companyId;
      if (companyId) {
        try {
          const company = await getCompanyById(companyId);
          setCompanyContactPhone(company?.phone || '');
        } catch (companyErr) {
          console.log('⚠️ COMPANY FETCH WARNING:', companyErr?.response?.data || companyErr?.message);
        }
      }

      if (appointment.senderId?.name) {
        setSenderName(appointment.senderId.name);
        setSenderEmail(appointment.senderId.email || '');
      } else if (appointment.senderName) {
        setSenderName(appointment.senderName);
      } else {
        setSenderName(t('unknownSender', 'Unknown sender'));
      }

      if (String(appointment?.status || '').toLowerCase() === 'completed') {
        await loadAppreciations(appointment._id || id);
      }
    } catch (e) {
      console.log('❌ FETCH ERROR:', e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAppreciation = async () => {
    if (typeof likedSelection !== 'boolean') {
      Alert.alert(t('info', 'Info'), t('chooseAppreciation', 'Choose first whether you liked it or not.'));
      return;
    }

    try {
      setAppreciationSubmitting(true);
      const res = await submitAppointmentAppreciation(id, {
        liked: likedSelection,
        rating: ratingSelection > 0 ? ratingSelection : undefined,
        comment: commentInput.trim(),
      });

      setMyAppreciation(res?.mine || null);
      setOtherAppreciation(res?.fromOther || null);
      setAppreciationSummary(res?.summary || { total: 0, likes: 0, dislikes: 0, averageRating: null });
      Alert.alert(
        t('appreciationThanks', 'Merci'),
        t('appreciationSaved', 'Votre appréciation a bien été enregistrée.'),
        [
          {
            text: t('back', 'Retour'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      console.log('❌ APPRECIATION SUBMIT ERROR:', e.response?.data || e.message);
      Alert.alert(t('error', 'Erreur'), t('appreciationSaveError', "Impossible d'enregistrer votre appréciation."));
    } finally {
      setAppreciationSubmitting(false);
    }
  };

  // Mise à jour de statut simple (accept, reject, complete)
  const updateStatus = async (status) => {
    const config = {
      accepted:  { title: t('acceptQuestion', 'Accepter ce rendez-vous ?'), btn: t('validateBtn', 'Accepter'),  style: 'default'     },
      rejected:  { title: t('rejectQuestion', 'Refuser ce rendez-vous ?'),  btn: t('rejectBtn', 'Refuser'),     style: 'destructive'  },
      completed: { title: t('finalizeQuestion', 'Marquer comme finalisé ?'),btn: t('finalizeBtn', 'Finaliser'), style: 'default'      },
    }[status];

    Alert.alert(config.title, t('updateStatusBody', 'Cette action mettra à jour le statut du rendez-vous.'), [
      { text: t('cancel', 'Annuler'), style: 'cancel' },
      {
        text: config.btn,
        style: config.style,
        onPress: async () => {
          const canSend = await ensurePushReadyOrAlert({ source: `appointment-status-${status}` });
          if (!canSend) {
            navigation.navigate('NotificationLabs');
            return;
          }

          setUpdating(true);
          try {
            await updateAppointmentStatus(id, status);
            setData(prev => ({ ...prev, status }));
                if (status === 'completed') {
                  await loadAppreciations(id);
                }
          } catch (e) {
            console.log('❌ UPDATE ERROR:', e.response?.data || e.message);
            Alert.alert(t('error', 'Erreur'), t('statusUpdateError', 'Impossible de mettre à jour le statut.'));
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  // Annulation avec raison
  const handleCancelConfirm = async (reason) => {
    const canSend = await ensurePushReadyOrAlert({ source: 'appointment-cancel' });
    if (!canSend) {
      navigation.navigate('NotificationLabs');
      return;
    }

    setUpdating(true);
    try {
      await updateAppointmentStatus(id, 'cancelled', { cancellationReason: reason });
      setData(prev => ({ ...prev, status: 'cancelled', cancellationReason: reason }));
      setShowCancelSheet(false);
    } catch (e) {
      console.log('❌ CANCEL ERROR:', e.response?.data || e.message);
      Alert.alert(t('error', 'Erreur'), t('cancelError', "Impossible d'annuler le rendez-vous."));
    } finally {
      setUpdating(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>{t('loadingText', 'Loading…')}</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>📭</Text>
        <Text style={styles.errorTitle}>{t('notFound', 'Introuvable')}</Text>
        <Text style={styles.errorSub}>{t('appointmentNotFound', "Ce rendez-vous n'existe pas ou a été supprimé.")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('back', 'Retour')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg   = { ...STATUS_CONFIG[data.status] || STATUS_CONFIG.pending, label: t((STATUS_CONFIG[data.status] || STATUS_CONFIG.pending).labelKey) };
  const typeCfgRaw  = TYPE_CONFIG[data.type] || { labelKey: null, icon: '📅' };
  const typeCfg     = { ...typeCfgRaw, label: typeCfgRaw.labelKey ? t(typeCfgRaw.labelKey) : (data.type || '—') };
  const priorityCfgRaw = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.normal;
  const priorityCfg = { ...priorityCfgRaw, label: t(priorityCfgRaw.labelKey) };
  const displayDate = formatDisplayDate(data.date, activeLanguage);
  const displayTime = formatDisplayTime(data.date, data.time, activeLanguage);

  const isPending   = data.status === 'pending';
  const isAccepted  = data.status === 'accepted';
  const isRejected  = data.status === 'rejected';
  const isCompleted = data.status === 'completed';
  const isCancelled = data.status === 'cancelled';

  // Bouton annuler visible si pending ou accepted (pas encore terminé)
  const canCancel = isPending || isAccepted;

  const senderIdValue = String(data.senderId?._id || data.senderId || '');
  const receiverIdValue = String(data.receiverId?._id || data.receiverId || '');
  const companyIdValue = String(data.companyId?._id || data.companyId || route?.params?.companyId || '');
  const currentUserId = String(user?._id || '');
  const isCurrentUserSender = currentUserId === senderIdValue;
  const otherParticipantId = isCurrentUserSender ? receiverIdValue : senderIdValue;
  const otherParticipantName = isCurrentUserSender
    ? (data.receiverId?.name || tr('otherParticipant', { fr: 'Autre participant', en: 'Other participant', es: 'Otro participante', pt: 'Outro participante', zh: '对方', hi: 'दूसरा प्रतिभागी', ar: 'المشارك الآخر', bn: 'অন্য অংশগ্রহণকারী', ru: 'Другой участник', ja: '相手', de: 'Anderer Teilnehmer', id: 'Peserta lain', ur: 'دوسرا شریک' }))
    : (data.senderId?.name || senderName || tr('otherParticipant', { fr: 'Autre participant', en: 'Other participant', es: 'Otro participante', pt: 'Outro participante', zh: '对方', hi: 'दूसरा प्रतिभागी', ar: 'المشارك الآخر', bn: 'অন্য অংশগ্রহণকারী', ru: 'Другой участник', ja: '相手', de: 'Anderer Teilnehmer', id: 'Peserta lain', ur: 'دوسرا شریک' }));
  const mySavedAt = myAppreciation?.updatedAt || myAppreciation?.createdAt;

  const initials = senderName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const detectedVideoUrl = extractFirstHttpUrl(data.location, data.note, data.message);
  const detectedUniversalUrl = convertMeetingUrlToTalky(detectedVideoUrl);
  const videoMeetingUrl = data.type === 'video'
    ? (detectedUniversalUrl || buildDefaultVideoUrl(id))
    : detectedUniversalUrl;
  const companyPhone = normalizePhone(companyContactPhone || data.location);

  const notifyParticipantWithMeetLink = async () => {
    if (!videoMeetingUrl || !companyIdValue || !otherParticipantId) return;
    if (!currentUserId || otherParticipantId === currentUserId) return;

    try {
      const inviterName = String(user?.name || tr('aParticipant', { fr: 'Un participant', en: 'A participant', es: 'Un participante', pt: 'Um participante', zh: '一位参与者', hi: 'एक प्रतिभागी', ar: 'أحد المشاركين', bn: 'একজন অংশগ্রহণকারী', ru: 'Участник', ja: '参加者', de: 'Ein Teilnehmer', id: 'Seorang peserta', ur: 'ایک شریک' }));
      const inviteText = `🎥 ${inviterName} vous invite a rejoindre la visioconference: ${videoMeetingUrl}`;

      await sendMessageApi({
        companyId: companyIdValue,
        receiverId: otherParticipantId,
        text: inviteText,
      });
    } catch (err) {
      // The call should still open even if invite message fails.
      console.log('⚠️ VIDEO INVITE MESSAGE ERROR:', err?.response?.data || err?.message);
    }
  };

  const openVideoCallInApp = async () => {
    if (!videoMeetingUrl) {
      Alert.alert(t('videoLinkUnavailable', 'Link unavailable'), t('noVideoLink', 'No video link found for this appointment.'));
      return;
    }

    await notifyParticipantWithMeetLink();

    const roomLabel = data?.title
      ? String(data.title)
      : tr('videoAppointmentLabel', { fr: 'Rendez-vous video', en: 'Video appointment', es: 'Cita en video', pt: 'Consulta em video', zh: '视频预约', hi: 'वीडियो अपॉइंटमेंट', ar: 'موعد فيديو', bn: 'ভিডিও অ্যাপয়েন্টমেন্ট', ru: 'Видео-встреча', ja: 'ビデオ予約', de: 'Video-Termin', id: 'Janji video', ur: 'ویڈیو اپائنٹمنٹ' });
    const parentNav = navigation.getParent?.();
    const rootNav = parentNav?.getParent?.() || parentNav || navigation;

    if (!rootNav?.navigate) {
      Alert.alert(t('navigationUnavailable', 'Navigation unavailable'), t('openVideoCallUnavailable', 'Unable to open the video call in the app.'));
      return;
    }

    rootNav.navigate('VideoCall', {
      meetingUrl: videoMeetingUrl,
      roomLabel,
    });
  };

  const quickActions = [
    {
      key: 'video',
      visible: data.type === 'video' || Boolean(videoMeetingUrl),
      icon: '📹',
      label: t('joinVideoCall', 'Join video call'),
      sublabel: videoMeetingUrl ? t('openVideoCallInApp', 'Open the video conference in the app') : t('videoLinkUnavailable', 'Link unavailable'),
      tone: 'primary',
      disabled: !videoMeetingUrl,
      onPress: openVideoCallInApp,
    },
    {
      key: 'phone',
      visible: data.type === 'phone' || Boolean(companyPhone),
      icon: '📞',
      label: t('callLabel', 'Call'),
      sublabel: companyPhone ? `${t('phoneLabel', 'Number')}: ${companyPhone}` : t('phoneUnavailable', 'Number unavailable'),
      tone: 'success',
      disabled: !companyPhone,
      onPress: async () => {
        if (!companyPhone) {
          Alert.alert(t('phoneUnavailable', 'Number unavailable'), t('phoneUnavailableBody', 'No phone number is associated with this company.'));
          return;
        }
        const phoneUrl = `tel:${companyPhone}`;
        try {
          const canOpen = await Linking.canOpenURL(phoneUrl);
          if (!canOpen) throw new Error('cannot-open-phone-url');
          await Linking.openURL(phoneUrl);
        } catch (err) {
          Alert.alert(t('callFailedTitle', 'Unable to start the call'), t('callFailedBody', 'Check that your device allows phone calls.'));
        }
      },
    },
    {
      key: 'message',
      visible: data.type === 'message' || Boolean(otherParticipantId),
      icon: '💬',
      label: tr('openConversation', { fr: 'Ouvrir la conversation', en: 'Open conversation', es: 'Abrir conversacion', pt: 'Abrir conversa', zh: '打开对话', hi: 'बातचीत खोलें', ar: 'افتح المحادثة', bn: 'কথোপকথন খুলুন', ru: 'Открыть диалог', ja: '会話を開く', de: 'Konversation offnen', id: 'Buka percakapan', ur: 'گفتگو کھولیں' }),
      sublabel: `${tr('chatWith', { fr: 'Discuter avec', en: 'Chat with', es: 'Chatear con', pt: 'Conversar com', zh: '与其聊天', hi: 'इनसे चैट करें', ar: 'الدردشة مع', bn: 'এর সাথে চ্যাট করুন', ru: 'Чат с', ja: '次の相手とチャット', de: 'Chatten mit', id: 'Mengobrol dengan', ur: 'کے ساتھ چیٹ کریں' })} ${otherParticipantName}`,
      tone: 'neutral',
      disabled: !otherParticipantId,
      onPress: () => {
        if (!otherParticipantId) {
          Alert.alert(t('conversationUnavailable', 'Conversation unavailable'), t('conversationRecipientUnavailable', 'Unable to identify the recipient for this appointment.'));
          return;
        }

        const params = {
          selectedUserId: String(otherParticipantId),
          selectedUserName: otherParticipantName,
          companyId: companyIdValue || undefined,
        };

        const parent = navigation.getParent?.();
        if (parent?.navigate) {
          parent.navigate('Messages', params);
          return;
        }

        navigation.navigate('MainTabs', {
          companyId: companyIdValue || undefined,
          currentUserId,
          screen: 'Messages',
          params,
        });
      },
    },
  ].filter((action) => action.visible);

  const canJoinVideoCall = data.type === 'video' && !isCancelled && !isRejected;
  const handleJoinVideoCall = () => {
    openVideoCallInApp();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />

        {/* Nav Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.navBack}>{t('navBack', '‹ Retour')}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t('appointmentsTitle', 'Rendez-vous')}</Text>
          {/* Bouton annuler dans la nav si possible */}
          {canCancel ? (
            <TouchableOpacity
              onPress={() => setShowCancelSheet(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.navCancel}>{t('cancelLabel', 'Annuler')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero ── */}
          <View style={styles.heroCard}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.icon}{'  '}{statusCfg.label}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{data.title || tr('appointmentsTitle', { fr: 'Rendez-vous', en: 'Appointments', ja: '予約' })}</Text>
            <Text style={styles.heroMetaText}>{typeCfg.icon}{'  '}{typeCfg.label}</Text>
          </View>

          {data.serviceSelection?.name ? (
            <>
              <SectionLabel text={t('requestedService', 'Prestation demandée')} />
              <Card>
                <View style={styles.serviceSelectionRow}>
                  {data.serviceSelection.selectedImage ? <Image source={{ uri: data.serviceSelection.selectedImage }} style={styles.serviceSelectionImage} /> : null}
                  <View style={styles.serviceSelectionCopy}>
                    <Text style={styles.serviceSelectionName}>{data.serviceSelection.name}</Text>
                    {data.serviceSelection.categoryId ? <Text style={styles.serviceSelectionMeta}>{data.serviceSelection.categoryId}</Text> : null}
                    {Number(data.serviceSelection.price) > 0 ? <Text style={styles.serviceSelectionPrice}>${Number(data.serviceSelection.price).toFixed(2)}</Text> : null}
                    {data.serviceSelection.selectedImage ? <Text style={styles.serviceSelectionMeta}>{t('selectedServicePhoto', 'Photo choisie par le client')}</Text> : null}
                  </View>
                </View>
              </Card>
            </>
          ) : null}

          {/* ── Banners de statut final ── */}
          {isCompleted && <CompletedBanner senderName={senderName} />}

          {isCompleted && (
            <>
              <SectionLabel text={tr('bilateralAppreciation', { fr: 'Appreciation bilaterale', en: 'Bilateral appreciation', es: 'Apreciacion bilateral', pt: 'Apreciacao bilateral', zh: '双向评价', hi: 'द्विपक्षीय सराहना', ar: 'تقييم متبادل', bn: 'দ্বিপাক্ষিক মূল্যায়ন', ru: 'Взаимная оценка', ja: '相互評価', de: 'Beidseitige Bewertung', id: 'Apresiasi dua arah', ur: 'دو طرفہ تعریف' })} />
              <Card>
                <View style={styles.messageBlock}>
                  <Text style={styles.messageBlockLabel}>{t('feedbackSection', 'Votre retour')}</Text>
                  <Text style={styles.messageText}>{t('appreciationInfo', "Donnez votre appréciation sur l'expérience.")} {otherParticipantName}</Text>
                </View>

                <RowSeparator />

                <View style={styles.appreciationLikeRow}>
                  <TouchableOpacity
                    style={[
                      styles.appreciationChoice,
                      likedSelection === true && styles.appreciationChoiceActiveGood,
                    ]}
                    onPress={() => setLikedSelection(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.appreciationChoiceText, likedSelection === true && styles.appreciationChoiceTextActiveGood]}>👍 {t('likedYes', "J'ai aimé")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.appreciationChoice,
                      likedSelection === false && styles.appreciationChoiceActiveBad,
                    ]}
                    onPress={() => setLikedSelection(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.appreciationChoiceText, likedSelection === false && styles.appreciationChoiceTextActiveBad]}>👎 {t('likedNo', 'Pas satisfait')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.appreciationRatingRow}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= ratingSelection;
                    return (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRatingSelection(star)}
                        style={styles.starBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.starText, active && styles.starTextActive]}>★</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {ratingSelection > 0 ? (
                    <TouchableOpacity onPress={() => setRatingSelection(0)}>
                      <Text style={styles.clearRatingText}>{t('clearRatingBtn', 'Effacer')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.appreciationCommentWrap}>
                  <TextInput
                    style={styles.appreciationCommentInput}
                    value={commentInput}
                    onChangeText={setCommentInput}
                    placeholder={t('commentPlaceholder', 'Commentaire (optionnel, 300 max)')}
                    placeholderTextColor={C.textTertiary}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{commentInput.length}/300</Text>
                </View>

                <TouchableOpacity
                  style={[styles.appreciationSubmitBtn, appreciationSubmitting && styles.actionDisabled]}
                  onPress={submitAppreciation}
                  disabled={appreciationSubmitting}
                  activeOpacity={0.85}
                >
                  {appreciationSubmitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.appreciationSubmitBtnText}>{myAppreciation ? t('updateAppreciation', 'Mettre à jour mon appréciation') : t('sendAppreciation', 'Envoyer mon appréciation')}</Text>
                  }
                </TouchableOpacity>

                {mySavedAt ? (
                  <Text style={styles.appreciationMetaText}>{tr('lastSentLabel', { fr: 'Dernier envoi :', en: 'Your last send:', es: 'Ultimo envio:', pt: 'Ultimo envio:', zh: '最近发送：', hi: 'अंतिम भेजा गया:', ar: 'آخر إرسال:', bn: 'সর্বশেষ পাঠানো:', ru: 'Последняя отправка:', ja: '最終送信:', de: 'Letzte Sendung:', id: 'Pengiriman terakhir:', ur: 'آخری ارسال:' })} {new Date(mySavedAt).toLocaleString(DATE_LOCALE_BY_LANGUAGE[activeLanguage] || 'en-US')}</Text>
                ) : null}
              </Card>

              <SectionLabel text={pickLocalized({ fr: 'Retour recu', en: 'Received feedback', es: 'Comentarios recibidos', pt: 'Feedback recebido', zh: '收到的反馈', hi: 'प्राप्त प्रतिक्रिया', ar: 'الملاحظات المستلمة', bn: 'প্রাপ্ত প্রতিক্রিয়া', ru: 'Полученный отзыв', ja: '受け取った評価', de: 'Erhaltenes Feedback', id: 'Umpan balik diterima', ur: 'موصولہ رائے' })} />
              <Card>
                {appreciationLoading ? (
                  <View style={{ padding: 16 }}>
                    <ActivityIndicator color={C.primary} />
                  </View>
                ) : otherAppreciation ? (
                  <View style={styles.receivedAppreciationWrap}>
                    <Text style={styles.receivedAppreciationTitle}>
                      {(otherAppreciation?.reviewerId?.name || tr('otherParticipant', { fr: 'Autre participant', en: 'Other participant', es: 'Otro participante', pt: 'Outro participante', zh: '对方', hi: 'दूसरा प्रतिभागी', ar: 'المشارك الآخر', bn: 'অন্য অংশগ্রহণকারী', ru: 'Другой участник', ja: '相手', de: 'Anderer Teilnehmer', id: 'Peserta lain', ur: 'دوسرا شریک' }))} {tr('leftAReviewSuffix', { fr: 'a laisse un avis', en: 'left a review', es: 'dejo una opinion', pt: 'deixou uma avaliacao', zh: '留下了评价', hi: 'ने समीक्षा छोड़ी', ar: 'ترك تقييماً', bn: 'একটি রিভিউ দিয়েছেন', ru: 'оставил отзыв', ja: 'がレビューを投稿しました', de: 'hat eine Bewertung hinterlassen', id: 'memberikan ulasan', ur: 'نے جائزہ دیا' })}
                    </Text>
                    <Text style={styles.receivedAppreciationBadge}>
                      {otherAppreciation.liked ? `👍 ${t('positiveReview', 'Positive review')}` : `👎 ${t('negativeReview', 'Negative review')}`}
                    </Text>
                    {typeof otherAppreciation?.rating === 'number' ? (
                      <Text style={styles.receivedAppreciationRating}>{t('ratingLabel', 'Rating')}: {otherAppreciation.rating}/5</Text>
                    ) : null}
                    {otherAppreciation?.comment ? (
                      <Text style={styles.receivedAppreciationComment}>{otherAppreciation.comment}</Text>
                    ) : (
                      <Text style={styles.receivedAppreciationEmpty}>{t('noCommentAdded', 'Aucun commentaire ajouté.')}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.receivedAppreciationWrap}>
                    <Text style={styles.receivedAppreciationEmpty}>{t('otherPartyPending', "L'autre partie n'a pas encore envoyé son appréciation.")}</Text>
                  </View>
                )}

                <RowSeparator />

                <View style={styles.appreciationSummaryRow}>
                  <Text style={styles.appreciationSummaryText}>👍 {appreciationSummary.likes}</Text>
                  <Text style={styles.appreciationSummaryText}>👎 {appreciationSummary.dislikes}</Text>
                  <Text style={styles.appreciationSummaryText}>
                    ⭐ {appreciationSummary.averageRating !== null ? appreciationSummary.averageRating : '—'}
                  </Text>
                </View>
              </Card>
            </>
          )}

          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledTitle}>🚫  {t('cancelledTitle', 'Appointment cancelled')}</Text>
              {data.cancellationReason ? (
                <View style={styles.cancelledReasonBox}>
                  <Text style={styles.cancelledReasonLabel}>{t('cancellationReason', 'Cancellation reason')}</Text>
                  <Text style={styles.cancelledReasonText}>{data.cancellationReason}</Text>
                </View>
              ) : (
                  <Text style={styles.cancelledNoReason}>{t('noReasonGiven', 'No reason provided.')}</Text>
              )}
            </View>
          )}

          {/* ── Expéditeur ── */}
          <SectionLabel text={t('fromSection', 'From')} />
          <Card>
            <View style={styles.senderRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.senderName}>{senderName}</Text>
                {senderEmail ? <Text style={styles.senderSub}>{senderEmail}</Text> : null}
              </View>
            </View>
          </Card>

          {/* ── Détails ── */}
          <SectionLabel text={t('detailsSection', 'Details')} />
          <Card>
            <InfoRow icon="🧾" label={t('infoSubject', 'Objet')}    value={data.title || t('appointmentsTitle', 'Rendez-vous')} />
            <RowSeparator />
            <InfoRow icon="📅" label={t('infoDate', 'Date')}         value={displayDate} />
            <RowSeparator />
            <InfoRow icon="🕐" label={t('infoTime', 'Heure')}        value={displayTime} />
            <RowSeparator />
            <InfoRow icon="⏱"  label={t('infoDuration', 'Durée')}   value={data.duration || '—'} />
            <RowSeparator />
            <InfoRow icon="📍" label={t('infoLocation', 'Lieu')}     value={data.location || t('locationNotSpecified', 'Non précisé')} />
            <RowSeparator />
            <InfoRow icon="🧩" label={t('infoType', 'Type')}         value={`${typeCfg.icon} ${typeCfg.label}`} />
            <RowSeparator />
            <InfoRow
              icon="🚩"
              label={t('infoPriority', 'Priorité')}
              value={priorityCfg.label}
              valueColor={priorityCfg.color}
            />
          </Card>

          {quickActions.length > 0 && (
            <>
              <SectionLabel text={t('quickAccessSection', 'Quick access')} />
              <Card>
                {quickActions.map((action, index) => (
                  <React.Fragment key={action.key}>
                    {index > 0 && <RowSeparator />}
                    <TouchableOpacity
                      style={[
                        styles.quickActionRow,
                        action.disabled && styles.actionDisabled,
                      ]}
                      onPress={action.onPress}
                      disabled={action.disabled || updating}
                      activeOpacity={0.75}
                    >
                      <View style={[
                        styles.quickActionIconWrap,
                        action.tone === 'primary' && styles.quickActionIconPrimary,
                        action.tone === 'success' && styles.quickActionIconSuccess,
                        action.tone === 'neutral' && styles.quickActionIconNeutral,
                      ]}>
                        <Text style={styles.quickActionIcon}>{action.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quickActionLabel}>{action.label}</Text>
                        <Text style={styles.quickActionSubLabel}>{action.sublabel}</Text>
                      </View>
                      <Text style={styles.quickActionChevron}>›</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </Card>
            </>
          )}

          {/* ── Message ── */}
          <SectionLabel text={t('messageSection', 'Message')} />
          <Card>
            <View style={styles.messageBlock}>
              <Text style={styles.messageBlockLabel}>{t('requestLabel', 'Demande')}</Text>
              <Text style={styles.messageText}>{data.message || t('noMessageSent', 'Aucun message envoyé.')}</Text>
            </View>

            <RowSeparator />

            <View style={styles.messageBlock}>
              <Text style={styles.messageBlockLabel}>{t('additionalInfo', 'Informations complémentaires')}</Text>
              <Text style={styles.messageText}>{data.note || t('noAdditionalNote', 'Aucune note complémentaire.')}</Text>
            </View>
          </Card>

          {/* ── Actions : en attente → Accepter / Refuser ── */}
          {isPending && (
            <>
              <SectionLabel text={t('replySection', 'Reply')} />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionAccept, updating && styles.actionDisabled]}
                  onPress={() => updateStatus('accepted')}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  {updating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.actionBtnText}>✓{'  '}{t('validateBtn', 'Valider')}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionRefuse, updating && styles.actionDisabled]}
                  onPress={() => updateStatus('rejected')}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  {updating
                    ? <ActivityIndicator color={C.danger} size="small" />
                    : <Text style={[styles.actionBtnText, { color: C.danger }]}>✕{'  '}{t('rejectBtn', 'Refuser')}</Text>
                  }
                </TouchableOpacity>
              </View>

              {canJoinVideoCall && (
                <TouchableOpacity
                  style={[styles.actionBtnFull, styles.actionVideo, updating && styles.actionDisabled]}
                  onPress={handleJoinVideoCall}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  <Text style={styles.actionBtnText}>📹{'  '}{tr('joinVideoCall', { fr: 'Passer en appel video', en: 'Join video call', ja: 'ビデオ通話に参加' })}</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Action : accepté → Finaliser ── */}
          {isAccepted && (
            <>
              <SectionLabel text={tr('followUpSection', { fr: 'Suivi', en: 'Follow-up', ja: 'フォローアップ' })} />
              {canJoinVideoCall && (
                <TouchableOpacity
                  style={[styles.actionBtnFull, styles.actionVideo, updating && styles.actionDisabled]}
                  onPress={handleJoinVideoCall}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  <Text style={styles.actionBtnText}>📹{'  '}{tr('joinVideoCall', { fr: 'Passer en appel video', en: 'Join video call', ja: 'ビデオ通話に参加' })}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtnFull, styles.actionComplete, updating && styles.actionDisabled]}
                onPress={() => updateStatus('completed')}
                disabled={updating}
                activeOpacity={0.75}
              >
                {updating
                  ? <ActivityIndicator color={C.purple} size="small" />
                  : <Text style={[styles.actionBtnText, { color: C.purple }]}>🎉{'  '}{tr('markAsCompleted', { fr: 'Marquer comme finalise', en: 'Mark as completed', ja: '完了としてマーク' })}</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* ── Refusé ── */}
          {isRejected && (
            <View style={[styles.answeredBanner, { backgroundColor: C.dangerLight }]}>
              <Text style={[styles.answeredText, { color: C.danger }]}>
                ❌{'  '}{tr('youRejectedAppointment', { fr: 'Vous avez refuse ce rendez-vous.', en: 'You have rejected this appointment.', ja: 'この予約を拒否しました。' })}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Cancel Sheet (slide-up inline) ── */}
        <CancelSheet
          visible={showCancelSheet}
          onConfirm={handleCancelConfirm}
          onDismiss={() => setShowCancelSheet(false)}
          updating={updating}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  centered: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },

  // Nav
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  navBack:   { fontSize: 17, color: C.primary },
  navTitle:  { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  navCancel: { fontSize: 17, color: C.danger },

  // Hero
  heroCard: {
    backgroundColor: C.card, marginHorizontal: 16, marginTop: 20,
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 10,
  },
  statusBadge:  { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  statusText:   { fontSize: 13, fontWeight: '600' },
  heroTitle:    { fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  heroMetaText: { fontSize: 14, color: C.textSecondary },
  serviceSelectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceSelectionImage: { width: 82, height: 82, borderRadius: 10, backgroundColor: C.grayLight },
  serviceSelectionCopy: { flex: 1, gap: 4 },
  serviceSelectionName: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  serviceSelectionMeta: { color: C.textSecondary, fontSize: 12 },
  serviceSelectionPrice: { color: C.primary, fontSize: 13, fontWeight: '700' },

  // Completed banner
  completedBanner: {
    backgroundColor: C.purpleLight, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 6,
  },
  completedEmoji: { fontSize: 36 },
  completedTitle: { fontSize: 17, fontWeight: '700', color: C.purple },
  completedSub:   { fontSize: 14, color: C.purple, textAlign: 'center', opacity: 0.8 },

  // Cancelled banner
  cancelledBanner: {
    backgroundColor: C.grayLight, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 18, gap: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator,
  },
  cancelledTitle:      { fontSize: 16, fontWeight: '600', color: C.gray },
  cancelledReasonBox:  { backgroundColor: C.card, borderRadius: 10, padding: 12, gap: 4 },
  cancelledReasonLabel:{ fontSize: 11, fontWeight: '500', color: C.textTertiary, letterSpacing: 0.4 },
  cancelledReasonText: { fontSize: 15, color: C.textPrimary, lineHeight: 21 },
  cancelledNoReason:   { fontSize: 14, color: C.textTertiary, fontStyle: 'italic' },

  // Sender
  senderRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 14, fontWeight: '600', color: C.primary },
  senderName:  { fontSize: 16, fontWeight: '500', color: C.textPrimary },
  senderSub:   { fontSize: 13, color: C.textSecondary, marginTop: 1 },

  // Section
  sectionLabel: {
    fontSize: 12, fontWeight: '500', color: C.label,
    letterSpacing: 0.5, marginTop: 24, marginBottom: 8, marginHorizontal: 20,
  },

  // Card
  card: { backgroundColor: C.card, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginLeft: 52 },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  infoIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  infoLabel: { flex: 1, fontSize: 15, color: C.textPrimary },
  infoValue: { fontSize: 15, color: C.textSecondary, maxWidth: 160, textAlign: 'right' },

  // Quick actions
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconPrimary: { backgroundColor: C.primaryLight },
  quickActionIconSuccess: { backgroundColor: C.successLight },
  quickActionIconNeutral: { backgroundColor: C.grayLight },
  quickActionIcon: { fontSize: 17 },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  quickActionSubLabel: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  quickActionChevron: {
    fontSize: 20,
    color: C.textTertiary,
    lineHeight: 20,
  },

  // Message / note
  messageBox:  { padding: 16 },
  messageBlock: { padding: 16, gap: 6 },
  messageBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  messageText: { fontSize: 15, color: C.textPrimary, lineHeight: 22 },

  // Appreciation
  appreciationLikeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  appreciationChoice: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.separator,
    backgroundColor: C.bg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  appreciationChoiceActiveGood: {
    backgroundColor: C.successLight,
    borderColor: C.success,
  },
  appreciationChoiceActiveBad: {
    backgroundColor: C.dangerLight,
    borderColor: C.danger,
  },
  appreciationChoiceText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  appreciationChoiceTextActiveGood: {
    color: C.success,
  },
  appreciationChoiceTextActiveBad: {
    color: C.danger,
  },
  appreciationRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  starBtn: {
    paddingHorizontal: 2,
  },
  starText: {
    fontSize: 24,
    color: '#D1D5DB',
  },
  starTextActive: {
    color: '#F59E0B',
  },
  clearRatingText: {
    marginLeft: 8,
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  appreciationCommentWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
    backgroundColor: C.bg,
    padding: 10,
  },
  appreciationCommentInput: {
    minHeight: 80,
    fontSize: 14,
    color: C.textPrimary,
  },
  appreciationSubmitBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  appreciationSubmitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  appreciationMetaText: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    color: C.textTertiary,
    fontSize: 12,
  },
  receivedAppreciationWrap: {
    padding: 16,
    gap: 8,
  },
  receivedAppreciationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
  },
  receivedAppreciationBadge: {
    fontSize: 14,
    color: C.textSecondary,
  },
  receivedAppreciationRating: {
    fontSize: 14,
    color: '#B45309',
    fontWeight: '600',
  },
  receivedAppreciationComment: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 20,
  },
  receivedAppreciationEmpty: {
    fontSize: 14,
    color: C.textSecondary,
  },
  appreciationSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appreciationSummaryText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '600',
  },

  // Actions
  actionsRow:    { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  actionBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  actionBtnFull: { marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  actionAccept:  { backgroundColor: C.success },
  actionRefuse:  { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.danger },
  actionVideo:   { backgroundColor: C.primary },
  actionComplete:{ backgroundColor: C.purpleLight, borderWidth: 1.5, borderColor: C.purple },
  actionDisabled:{ opacity: 0.5 },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  answeredBanner: { marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  answeredText:   { fontSize: 15, fontWeight: '500' },

  // ── Cancel sheet ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 14,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.separator,
    alignSelf: 'center', marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  sheetSub:   { fontSize: 14, color: C.textSecondary, lineHeight: 20 },

  // Quick reason chips
  quickScroll:        { flexGrow: 0 },
  quickScrollContent: { gap: 8, paddingBottom: 2 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator,
    backgroundColor: C.bg,
  },
  quickChipSelected:     { backgroundColor: '#FFF0F0', borderColor: C.danger },
  quickChipText:         { fontSize: 13, color: C.textSecondary },
  quickChipTextSelected: { color: C.danger, fontWeight: '500' },

  // Reason input
  reasonInputWrap: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },
  reasonInput: {
    fontSize: 15, color: C.textPrimary,
    minHeight: 60, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: C.textTertiary, textAlign: 'right', marginTop: 4 },

  // Sheet buttons
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetBtnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator,
  },
  sheetBtnCancelText: { fontSize: 16, fontWeight: '500', color: C.textSecondary },
  sheetBtnConfirm: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.danger,
  },
  sheetBtnConfirmText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // Loading / error
  loadingText: { fontSize: 14, color: C.textSecondary, marginTop: 12 },
  errorIcon:   { fontSize: 48, marginBottom: 12 },
  errorTitle:  { fontSize: 20, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  errorSub:    { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  backBtn:     { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: C.primary, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});