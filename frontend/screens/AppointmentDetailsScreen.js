import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
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
  appointment: { labelKey: 'appointment', icon: '📅' },
  video:     { labelKey: 'typeVideo',     icon: '📹' },
  in_person: { labelKey: 'typeInPerson',  icon: '🏢' },
  phone:     { labelKey: 'typePhone',     icon: '📞' },
  message:   { labelKey: 'typeMessage',   icon: '💬' },
};

const PRIORITY_CONFIG = {
  low:    { labelKey: 'priorityLow',    color: C.success },
  normal: { labelKey: 'priorityNormal', color: C.warning },
  high:   { labelKey: 'priorityHigh',   color: C.danger  },
};

const formatDisplayDate = (value, locale) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(locale || undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatDisplayTime = (dateValue, timeValue, locale) => {
  if (timeValue) return String(timeValue);
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString(locale || undefined, {
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
      <Text style={styles.completedTitle}>{t('appointmentFinalizedTitle')}</Text>
      <Text style={styles.completedSub}>{t('appointmentFinalizedTitle')} · {senderName}</Text>
    </View>
  );
}

// ─── Cancel Sheet ─────────────────────────────────────────────────────────────
// Modale inline (slide-up) pour saisir la raison d'annulation
function CancelSheet({ visible, onConfirm, onDismiss, updating }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [reason, setReason] = useState('');
  const { t } = useLanguage();

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

  if (!visible) return null;

  const QUICK_REASONS = [
    t('quickReason1'),
    t('quickReason2'),
    t('quickReason3'),
    t('quickReason4'),
  ];

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
            placeholder={t('cancelOtherReason')}
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
            <Text style={styles.sheetBtnCancelText}>{t('back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetBtnConfirm, updating && styles.actionDisabled]}
            onPress={() => { Keyboard.dismiss(); onConfirm(reason.trim()); }}
            disabled={updating}
            activeOpacity={0.75}
          >
            {updating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sheetBtnConfirmText}>{t('confirmCancel')}</Text>
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
  const { t, language } = useLanguage();

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
        setSenderName(t('unknownSender', 'Expéditeur inconnu'));
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
      Alert.alert(t('info'), t('chooseAppreciation'));
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
        t('appreciationThanks'),
        t('appreciationSaved'),
        [
          {
            text: t('back'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      console.log('❌ APPRECIATION SUBMIT ERROR:', e.response?.data || e.message);
      Alert.alert(t('error'), t('appreciationSaveError'));
    } finally {
      setAppreciationSubmitting(false);
    }
  };

  // Mise à jour de statut simple (accept, reject, complete)
  const updateStatus = async (status) => {
    const config = {
      accepted:  { title: t('acceptQuestion'), btn: t('validateBtn'),  style: 'default'     },
      rejected:  { title: t('rejectQuestion'),  btn: t('rejectBtn'),     style: 'destructive'  },
      completed: { title: t('finalizeQuestion'),btn: t('finalizeBtn'), style: 'default'      },
    }[status];

    Alert.alert(config.title, t('updateStatusBody'), [
      { text: t('cancel'), style: 'cancel' },
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
            Alert.alert(t('error'), t('statusUpdateError'));
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
      Alert.alert(t('error'), t('cancelError'));
    } finally {
      setUpdating(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>{t('loadingText', 'Chargement…')}</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>📭</Text>
        <Text style={styles.errorTitle}>{t('notFound')}</Text>
        <Text style={styles.errorSub}>{t('appointmentNotFound')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg   = { ...STATUS_CONFIG[data.status] || STATUS_CONFIG.pending, label: t((STATUS_CONFIG[data.status] || STATUS_CONFIG.pending).labelKey) };
  const typeCfgRaw  = TYPE_CONFIG[data.type] || { labelKey: null, icon: '📅' };
  const typeCfg     = { ...typeCfgRaw, label: typeCfgRaw.labelKey ? t(typeCfgRaw.labelKey) : (data.type || '—') };
  const priorityCfgRaw = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.normal;
  const priorityCfg = { ...priorityCfgRaw, label: t(priorityCfgRaw.labelKey) };
  const displayDate = formatDisplayDate(data.date, language === 'fr' ? 'fr-FR' : undefined);
  const displayTime = formatDisplayTime(data.date, data.time, language === 'fr' ? 'fr-FR' : undefined);

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
    ? (data.receiverId?.name || t('otherParticipant'))
    : (data.senderId?.name || senderName || t('otherParticipant'));
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
      const inviterName = String(user?.name || t('aParticipant'));
      const inviteText = t(
      'videoInviteText',
      '🎥 {user} vous invite à rejoindre la visioconférence : {url}'
    )
      .replace('{user}', inviterName)
      .replace('{url}', videoMeetingUrl);

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
      Alert.alert(t('videoLinkUnavailableTitle'), t('videoLinkUnavailableBody'));
      return;
    }

    await notifyParticipantWithMeetLink();

    const roomLabel = data?.title ? String(data.title) : t('videoRoomLabel');
    const parentNav = navigation.getParent?.();
    const rootNav = parentNav?.getParent?.() || parentNav || navigation;

    if (!rootNav?.navigate) {
      Alert.alert(t('videoOpenImpossibleTitle'), t('videoOpenImpossibleBody'));
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
      label: t('joinVideoLabel'),
      sublabel: videoMeetingUrl ? t('openInApp') : t('videoLinkUnavailableShort'),
      tone: 'primary',
      disabled: !videoMeetingUrl,
      onPress: openVideoCallInApp,
    },
    {
      key: 'phone',
      visible: data.type === 'phone' || Boolean(companyPhone),
      icon: '📞',
      label: t('callLabel'),
      sublabel: companyPhone ? `${t('numberLabel')}: ${companyPhone}` : t('phoneUnavailableShort'),
      tone: 'success',
      disabled: !companyPhone,
      onPress: async () => {
        if (!companyPhone) {
          Alert.alert(t('phoneUnavailableTitle'), t('phoneUnavailableBody'));
          return;
        }
        const phoneUrl = `tel:${companyPhone}`;
        try {
          const canOpen = await Linking.canOpenURL(phoneUrl);
          if (!canOpen) throw new Error('cannot-open-phone-url');
          await Linking.openURL(phoneUrl);
        } catch (err) {
          Alert.alert(t('callFailedTitle'), t('callFailedBody'));
        }
      },
    },
    {
      key: 'message',
      visible: data.type === 'message' || Boolean(otherParticipantId),
      icon: '💬',
      label: t('openConversation'),
      sublabel: `${t('talkWith')} ${otherParticipantName}`,
      tone: 'neutral',
      disabled: !otherParticipantId,
      onPress: () => {
        if (!otherParticipantId) {
          Alert.alert(t('conversationUnavailableTitle'), t('conversationUnavailableBody'));
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
            <Text style={styles.navBack}>{t('navBack')}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t('appointmentsTitle')}</Text>
          {/* Bouton annuler dans la nav si possible */}
          {canCancel ? (
            <TouchableOpacity
              onPress={() => setShowCancelSheet(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.navCancel}>{t('cancelLabel')}</Text>
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
            <Text style={styles.heroTitle}>{data.title || t('appointmentsTitle')}</Text>
            <Text style={styles.heroMetaText}>{typeCfg.icon}{'  '}{typeCfg.label}</Text>
          </View>

          {/* ── Banners de statut final ── */}
          {isCompleted && <CompletedBanner senderName={senderName} />}

          {isCompleted && (
            <>
              <SectionLabel text={t('mutualAppreciationSection')} />
              <Card>
                <View style={styles.messageBlock}>
                  <Text style={styles.messageBlockLabel}>{t('feedbackSection')}</Text>
                  <Text style={styles.messageText}>{t('appreciationInfo')} {otherParticipantName}</Text>
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
                    <Text style={[styles.appreciationChoiceText, likedSelection === true && styles.appreciationChoiceTextActiveGood]}>👍 {t('likedYes')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.appreciationChoice,
                      likedSelection === false && styles.appreciationChoiceActiveBad,
                    ]}
                    onPress={() => setLikedSelection(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.appreciationChoiceText, likedSelection === false && styles.appreciationChoiceTextActiveBad]}>👎 {t('likedNo')}</Text>
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
                      <Text style={styles.clearRatingText}>{t('clearRatingBtn')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.appreciationCommentWrap}>
                  <TextInput
                    style={styles.appreciationCommentInput}
                    value={commentInput}
                    onChangeText={setCommentInput}
                    placeholder={t('commentPlaceholder')}
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
                    : <Text style={styles.appreciationSubmitBtnText}>{myAppreciation ? t('updateAppreciation') : t('sendAppreciation')}</Text>
                  }
                </TouchableOpacity>

                {mySavedAt ? (
                  <Text style={styles.appreciationMetaText}>
                    {t('appreciationLastSent')} {new Date(mySavedAt).toLocaleString(language || undefined)}
                  </Text>
                ) : null}
              </Card>

              <SectionLabel text={t('receivedFeedbackSection')} />
              <Card>
                {appreciationLoading ? (
                  <View style={{ padding: 16 }}>
                    <ActivityIndicator color={C.primary} />
                  </View>
                ) : otherAppreciation ? (
                  <View style={styles.receivedAppreciationWrap}>
                    <Text style={styles.receivedAppreciationTitle}>
                      {`${otherAppreciation?.reviewerId?.name || t('otherParticipant')} ${t('leftAReviewSuffix')}`}
                    </Text>
                    <Text style={styles.receivedAppreciationBadge}>
                      {otherAppreciation.liked ? `👍 ${t('positiveReview')}` : `👎 ${t('negativeReview')}`}
                    </Text>
                    {typeof otherAppreciation?.rating === 'number' ? (
                      <Text style={styles.receivedAppreciationRating}>{t('ratingLabel')}: {otherAppreciation.rating}/5</Text>
                    ) : null}
                    {otherAppreciation?.comment ? (
                      <Text style={styles.receivedAppreciationComment}>{otherAppreciation.comment}</Text>
                    ) : (
                      <Text style={styles.receivedAppreciationEmpty}>{t('noCommentAdded')}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.receivedAppreciationWrap}>
                    <Text style={styles.receivedAppreciationEmpty}>{t('otherPartyPending')}</Text>
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
              <Text style={styles.cancelledTitle}>🚫  {t('cancelledTitle')}</Text>
              {data.cancellationReason ? (
                <View style={styles.cancelledReasonBox}>
                  <Text style={styles.cancelledReasonLabel}>{t('cancellationReason')}</Text>
                  <Text style={styles.cancelledReasonText}>{data.cancellationReason}</Text>
                </View>
              ) : (
                <Text style={styles.cancelledNoReason}>{t('noReasonGiven')}</Text>
              )}
            </View>
          )}

          {/* ── Expéditeur ── */}
          <SectionLabel text={t('fromLabel')} />
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
          <SectionLabel text={t('details')} />
          <Card>
            <InfoRow icon="🧾" label={t('infoSubject')}    value={data.title || t('appointmentsTitle')} />
            <RowSeparator />
            <InfoRow icon="📅" label={t('infoDate')}         value={displayDate} />
            <RowSeparator />
            <InfoRow icon="🕐" label={t('infoTime')}        value={displayTime} />
            <RowSeparator />
            <InfoRow icon="⏱"  label={t('infoDuration')}   value={data.duration || '—'} />
            <RowSeparator />
            <InfoRow icon="📍" label={t('infoLocation')}     value={data.location || t('locationNotSpecified')} />
            <RowSeparator />
            <InfoRow icon="🧩" label={t('infoType')}         value={`${typeCfg.icon} ${typeCfg.label}`} />
            <RowSeparator />
            <InfoRow
              icon="🚩"
              label={t('infoPriority')}
              value={priorityCfg.label}
              valueColor={priorityCfg.color}
            />
          </Card>

          {quickActions.length > 0 && (
            <>
              <SectionLabel text={t('quickAccess')} />
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
          <SectionLabel text={t('message')} />
          <Card>
            <View style={styles.messageBlock}>
              <Text style={styles.messageBlockLabel}>{t('requestLabel')}</Text>
              <Text style={styles.messageText}>{data.message || t('noMessageSent')}</Text>
            </View>

            <RowSeparator />

            <View style={styles.messageBlock}>
              <Text style={styles.messageBlockLabel}>{t('additionalInfo')}</Text>
              <Text style={styles.messageText}>{data.note || t('noAdditionalNote')}</Text>
            </View>
          </Card>

          {/* ── Actions : en attente → Accepter / Refuser ── */}
          {isPending && (
            <>
              <SectionLabel text={t('respond')} />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionAccept, updating && styles.actionDisabled]}
                  onPress={() => updateStatus('accepted')}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  {updating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.actionBtnText}>✓{'  '}{t('validateBtn')}</Text>
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
                    : <Text style={[styles.actionBtnText, { color: C.danger }]}>✕{'  '}{t('rejectBtn')}</Text>
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
                  <Text style={styles.actionBtnText}>📹{'  '}{t('joinVideoBtn', "Passer en appel vidéo")}</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Action : accepté → Finaliser ── */}
          {isAccepted && (
            <>
              <SectionLabel text={t('followup')} />
              {canJoinVideoCall && (
                <TouchableOpacity
                  style={[styles.actionBtnFull, styles.actionVideo, updating && styles.actionDisabled]}
                  onPress={handleJoinVideoCall}
                  disabled={updating}
                  activeOpacity={0.75}
                >
                  <Text style={styles.actionBtnText}>📹{'  '}{t('joinVideoBtn', "Passer en appel vidéo")}</Text>
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
                  : <Text style={[styles.actionBtnText, { color: C.purple }]}>🎉{'  '}{t('finalizeAppointment')}</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* ── Refusé ── */}
          {isRejected && (
            <View style={[styles.answeredBanner, { backgroundColor: C.dangerLight }]}>
              <Text style={[styles.answeredText, { color: C.danger }]}>❌{'  '}{t('youRejectedAppointment', "Vous avez refusé ce rendez-vous.")}</Text>
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