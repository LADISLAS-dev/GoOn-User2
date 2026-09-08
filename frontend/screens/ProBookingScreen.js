// screens/BookingScreen.js
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { getCompanyById } from "../services/api";
import { Image } from "react-native";
import { API_URL } from "../env";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";
import { resolveAvatarUri } from "../utils/profileUtils";

const BRAND = "#8B2FC9";
const BRAND_DARK = "#6A1FA0";
const BRAND_SOFT = "#F3E8FF";
const RED = "#EF4444";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const BG = "#F8F0FF";

const LOCALE_BY_LANG = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  pt: "pt-PT",
};

const imgUrl = (src) => resolveAvatarUri(src, API_URL) || null;

// ─── API helpers ────────────────────────────────────────────────────────────
const getAppointmentsByCompany = (companyId) =>
  api.get(`/appointments/company/${companyId}`).then((r) => r.data);

const getMyAppointmentsByCompany = (companyId) =>
  api.get(`/appointments/mine/company/${companyId}`).then((r) => r.data);

const cancelAppointment = (appointmentId) =>
  api.patch(`/appointments/${appointmentId}`, { status: "cancelled" });

const deleteAppointment = (appointmentId) =>
  api.delete(`/appointments/${appointmentId}`);

// ─── Helpers d'affichage ─────────────────────────────────────────────────────
const formatDate = (iso, locale = "fr-FR") => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
};
const formatTime = (iso, locale = "fr-FR") => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
};

const getStatusStyles = (t) => ({
  confirmed: { bg: "#DCFCE7", color: GREEN, label: t('statusAccepted', 'Accepte') },
  accepted: { bg: "#DCFCE7", color: GREEN, label: t('statusAccepted', 'Accepte') },
  pending: { bg: "#FEF3C7", color: AMBER, label: t('statusPending', 'En attente') },
  cancelled: { bg: "#FFE4E6", color: RED, label: t('statusCancelled', 'Annule') },
  rejected: { bg: "#FFE4E6", color: RED, label: t('statusRejected', 'Refuse') },
  completed: { bg: BRAND_SOFT, color: BRAND_DARK, label: t('statusCompleted', 'Finalise') },
});

const isUpcoming = (appointmentDate) => {
  if (!appointmentDate) return false;
  return new Date(appointmentDate).getTime() >= Date.now();
};

const formatDay = (iso, locale = "fr-FR") => {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "2-digit" });
};

const formatMonth = (iso, locale = "fr-FR") => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: "short" }).replace(".", "").toUpperCase();
};

// ─── Carte rendez-vous ────────────────────────────────────────────────────────
function AppointmentCard({ item, currentUserId, onPress, onCancel, onDelete, locale, t }) {
  const statusStyles = getStatusStyles(t);
  const status = statusStyles[item.status] || statusStyles.pending;
  const senderId = String(item?.senderId?._id || item?.senderId || "");
  const receiverId = String(item?.receiverId?._id || item?.receiverId || "");
  const isSender = senderId && currentUserId && senderId === currentUserId;

  const counterpartName = isSender
    ? item?.receiverId?.name || t('recipientLabel', 'Destinataire')
    : item?.senderId?.name || t('senderLabel', 'Expediteur');

  const directionLabel = isSender ? t('sentToLabel', 'Envoye a') : t('receivedFromLabel', 'Recu de');
  const detailsText = item.notes || item.note || item.message || "";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardAccent} />
      <View style={styles.cardMain}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardDateBox}>
            <Text style={styles.cardDateDay}>{formatDay(item.date, locale)}</Text>
            <Text style={styles.cardDateMonth}>{formatMonth(item.date, locale)}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardService} numberOfLines={1}>
              {item.serviceName || item.service?.name || t('appointmentsTitle', 'Rendez-vous')}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>{directionLabel}: {counterpartName}</Text>
            <Text style={styles.cardTime}>{formatDate(item.date, locale)} - {formatTime(item.date, locale)}</Text>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}> 
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {detailsText ? (
          <Text style={styles.cardNotes} numberOfLines={2}>{detailsText}</Text>
        ) : null}

        <View style={styles.cardBottomRow}>
          <Text style={styles.cardOpenText}>{t('viewDetail', 'View details')}</Text>
          <View style={styles.cardActionsInline}>
            {item.status !== "cancelled" && item.status !== "completed" && item.status !== "rejected" && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelIcon}>{t('cancelLabel', 'Annuler')}</Text>
              </TouchableOpacity>
            )}
            {(item.status === "cancelled" || item.status === "completed" || item.status === "rejected") && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Text style={styles.deleteIcon}>{t('delete', 'Supprimer')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BookingScreen(props) {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useUser();
  const { t, language, activeLanguage } = useLanguage();
  const locale = LOCALE_BY_LANG[activeLanguage] || "fr-FR";

  // companyId peut venir des params du Tab (passé depuis MainTabs) ou des props directes
  const companyId = props?.companyId ?? route?.params?.companyId;
  const currentUserId = String(user?._id || props?.currentUserId || route?.params?.currentUserId || "");

  const [company, setCompany]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const filters = useMemo(
    () => [
      { key: "all", label: t('total') },
      { key: "upcoming", label: t('upcoming') },
      { key: "pending", label: t('pending') },
      { key: "cancelled", label: t('cancelled') },
    ],
    [t]
  );

  const loadData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const companyData = await getCompanyById(companyId).catch(() => null);
      setCompany(companyData);

      const ownerId = String(companyData?.ownerId?._id || companyData?.ownerId || "");
      const isOwner = !!currentUserId && ownerId === currentUserId;
      const apptData = await (isOwner
        ? getAppointmentsByCompany(companyId).catch(() => [])
        : getMyAppointmentsByCompany(companyId).catch(() => []));

      // Filtrer uniquement les rendez-vous impliquant le propriétaire de l'entreprise
      const ownerFiltered = ownerId
        ? (apptData || []).filter((a) => {
            const sId = String(a.senderId?._id || a.senderId || "");
            const rId = String(a.receiverId?._id || a.receiverId || "");
            return sId === ownerId || rId === ownerId;
          })
        : (apptData || []);

      // tri par date croissante, les plus proches en premier
      const sorted = [...ownerFiltered].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setAppointments(sorted);
    } catch (e) {
      console.warn("BookingScreen load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCancel = (appointment) => {
    Alert.alert(
      t('cancelAppointmentTitle'),
      t('cancelAppointmentBody'),
      [
        { text: t('no'), style: "cancel" },
        {
          text: t('yesCancel'),
          style: "destructive",
          onPress: async () => {
            const prev = appointments;
            setAppointments((list) =>
              list.map((a) => (a._id === appointment._id ? { ...a, status: "cancelled" } : a))
            );
            try {
              await cancelAppointment(appointment._id);
            } catch (e) {
              setAppointments(prev);
              Alert.alert(t('error'), t('bookingCancelFailed'));
            }
          },
        },
      ]
    );
  };

  const handleDelete = (appointment) => {
    if (!appointment?._id) return;

    Alert.alert(
      t('delete', 'Supprimer'),
      t('deleteAppointmentConfirm', 'Supprimer ce rendez-vous de la liste ?'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('delete', 'Supprimer'),
          style: 'destructive',
          onPress: async () => {
            const prev = appointments;
            setAppointments((list) => list.filter((a) => a._id !== appointment._id));
            try {
              await deleteAppointment(appointment._id);
            } catch (e) {
              setAppointments(prev);
              Alert.alert(t('error'), t('deleteFailed', 'Suppression impossible.'));
            }
          },
        },
      ]
    );
  };

  const stats = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter((a) => isUpcoming(a.date) && a.status !== "cancelled" && a.status !== "rejected").length;
    const pending = appointments.filter((a) => a.status === "pending").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "rejected").length;

    return { total, upcoming, pending, cancelled };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    switch (activeFilter) {
      case "upcoming":
        return appointments.filter((a) => isUpcoming(a.date) && a.status !== "cancelled" && a.status !== "rejected");
      case "pending":
        return appointments.filter((a) => a.status === "pending");
      case "cancelled":
        return appointments.filter((a) => a.status === "cancelled" || a.status === "rejected");
      default:
        return appointments;
    }
  }, [appointments, activeFilter]);

  const goToCreate = (service) => {
    if (!companyId) return;
    navigation.navigate("CreateAppointment", {
      companyId,
      serviceId: service?._id,
      serviceName: service?.name,
    });
  };

  // ── Pas de companyId → état vide générique ──────────────────────────────────
  if (!companyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>{t('noCompanySelected')}</Text>
          <Text style={styles.emptySub}>
            {t('openCompanyToView')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.headerHero}>
        <View style={styles.heroCircleOne} />
        <View style={styles.heroCircleTwo} />
        <View style={styles.headerRow}>
          <View style={styles.headerIdentityWrap}>
            {company?.logo ? (
              <Image source={{ uri: imgUrl(company.logo) }} style={styles.headerLogo} />
            ) : (
              <View style={styles.headerLogoPlaceholder}>
                <Text style={styles.headerLogoText}>
                  {(company?.name || "?")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>{t('appointmentsTitle', 'Rendez-vous')}</Text>
              <Text style={styles.headerTitle}>{t('bookingTitle')}</Text>
              {company?.name && <Text style={styles.headerSub}>{company.name}</Text>}
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerBookingBtn}
            onPress={() => goToCreate()}
            activeOpacity={0.85}
          >
            <Text style={styles.headerBookingBtnText}>+ {t('reserveService')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('total')}</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('upcoming')}</Text>
            <Text style={[styles.statValue, { color: GREEN }]}>{stats.upcoming}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('pending')}</Text>
            <Text style={[styles.statValue, { color: AMBER }]}>{stats.pending}</Text>
          </View>
        </View>
      </View>

      {company?.services?.length > 0 && (
        <View style={styles.servicesPicker}>
          <Text style={styles.servicesPickerLabel}>{t('servicesToBook', 'Services a reserver')}</Text>
          <FlatList
            data={company.services}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.serviceChip}
                onPress={() => goToCreate(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.serviceChipName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.serviceChipPrice}>${Number(item.price).toFixed(2)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <FlatList
              data={filters}
              horizontal
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const selected = item.key === activeFilter;
                return (
                  <TouchableOpacity
                    style={[styles.filterChip, selected && styles.filterChipActive]}
                    onPress={() => setActiveFilter(item.key)}
                  >
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} />
        }
        renderItem={({ item }) => (
          <AppointmentCard
            item={item}
            currentUserId={currentUserId}
            locale={locale}
            t={t}
            onPress={() =>
              navigation.navigate("AppointmentDetails", { id: item._id, appointmentId: item._id })
            }
            onCancel={() => handleCancel(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>{t('noBookings', 'No appointments')}</Text>
            <Text style={styles.emptySub}>
              {activeFilter === "all"
                ? t('noBookingsYet', 'No appointments yet.')
                : t('noBookingsInFilter', 'No appointments in this filter.')}
            </Text>
          </View>
        }
      />

      {/* <TouchableOpacity style={styles.fab} onPress={() => goToCreate()} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ {t('bookBtn', 'Réserver')}</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  headerHero: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: BRAND,
    overflow: "hidden",
  },
  heroCircleOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -40,
    top: -60,
  },
  heroCircleTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.10)",
    left: -20,
    bottom: -50,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerIdentityWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff" },
  headerLogoPlaceholder: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
  },
  headerLogoText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  headerEyebrow: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginTop: 1 },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 1 },
  headerBookingBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBookingBtnText: { color: BRAND_DARK, fontWeight: "800", fontSize: 11 },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 11, color: "#6B6B8A", fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1F1F2D", marginTop: 2 },

  servicesPicker: { marginBottom: 8, marginTop: 8 },
  servicesPickerLabel: {
    fontSize: 12, fontWeight: "700", color: "#6B6B8A",
    textTransform: "uppercase", letterSpacing: 0.4,
    paddingHorizontal: 16, marginBottom: 8,
  },
  serviceChip: {
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    minWidth: 120,
    borderWidth: 1.5, borderColor: BRAND_SOFT,
  },
  serviceChipName:  { fontSize: 13, fontWeight: "700", color: "#222", marginBottom: 4 },
  serviceChipPrice: { fontSize: 13, fontWeight: "800", color: BRAND_DARK },

  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 110 },

  filtersWrap: { marginBottom: 12 },
  filterChip: {
    backgroundColor: "#EFE5F8",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: BRAND,
  },
  filterChipText: {
    color: "#6E5A86",
    fontWeight: "700",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#fff",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE0F7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 6,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: BRAND,
  },
  cardMain: {
    flex: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardDateBox: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: BRAND_SOFT,
    alignItems: "center", justifyContent: "center",
  },
  cardDateDay:   { fontSize: 18, fontWeight: "800", color: BRAND_DARK },
  cardDateMonth: { fontSize: 11, color: BRAND_DARK, fontWeight: "700", textTransform: "uppercase" },

  cardBody: { flex: 1 },
  cardService: { fontSize: 15, fontWeight: "700", color: "#222" },
  cardMeta:    { fontSize: 12, color: "#6B6B8A", marginTop: 2, fontWeight: "600" },
  cardTime:    { fontSize: 12, color: "#8A85A4", marginTop: 3 },
  cardNotes:   { fontSize: 12, color: "#5A5474", marginTop: 10, lineHeight: 18 },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardOpenText: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND,
  },
  cardActionsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:  { fontSize: 11, fontWeight: "700" },
  cancelBtn: {
    borderRadius: 999,
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center", justifyContent: "center",
  },
  cancelIcon: { color: RED, fontSize: 11, fontWeight: "800" },
  deleteBtn: {
    borderRadius: 999,
    backgroundColor: BRAND_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center", justifyContent: "center",
  },
  deleteIcon: { color: BRAND_DARK, fontSize: 11, fontWeight: "800" },

  emptyIcon:  { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#333", marginBottom: 6, textAlign: "center" },
  emptySub:   { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 19 },

  fab: {
    position: "absolute", bottom: 24, left: 20, right: 20,
    backgroundColor: BRAND,
    borderRadius: 16, paddingVertical: 15,
    alignItems: "center",
    shadowColor: BRAND, shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
