import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import AuthPromptModal from '../components/AuthPromptModal';
const COLORS = {
  bg: '#F4F7FB',
  card: '#FFFFFF',
  title: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  accent: '#2563EB',
  accentSoft: '#DBEAFE',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  border: '#E2E8F0',
  violet: '#7C3AED',
  slate: '#64748B',
};
const { width } = Dimensions.get('window');
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function pct(part, total) {
  if (!total) return 0;
  return (part / total) * 100;
}
function monthKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  if (!key) return '';
  const [year, month] = key.split('-').map((v) => Number(v));
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'short' });
}
function buildMonthlyTrend(appointments = []) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: monthLabel(key), value: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  appointments.forEach((item) => {
    const key = monthKey(item?.createdAt || item?.updatedAt || item?.date);
    if (!key || !byKey.has(key)) return;
    byKey.get(key).value += 1;
  });
  return months;
}
function summarizeAppointments(appointments = []) {
  const statuses = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
  };
  appointments.forEach((item) => {
    const status = String(item?.status || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(statuses, status)) {
      statuses[status] += 1;
    }
  });
  const total = appointments.length;
  const acceptedOrCompleted = statuses.accepted + statuses.completed;
  return {
    total,
    ...statuses,
    acceptanceRate: pct(acceptedOrCompleted, total),
    completionRate: pct(statuses.completed, total),
    rejectionRate: pct(statuses.rejected, total),
  };
}
function buildStatusBreakdown(summary) {
  if (!summary?.total) return [];
  const total = summary.total;
  const items = [
    { key: 'pending', label: 'Pending', value: summary.pending, color: '#F59E0B' },
    { key: 'accepted', label: 'Accepted', value: summary.accepted, color: '#10B981' },
    { key: 'completed', label: 'Completed', value: summary.completed, color: '#2563EB' },
    { key: 'rejected', label: 'Rejected', value: summary.rejected, color: '#EF4444' },
    { key: 'cancelled', label: 'Cancelled', value: summary.cancelled, color: '#64748B' },
  ];
  return items
    .map((item) => ({
      ...item,
      pct: pct(item.value, total),
    }))
    .filter((item) => item.value > 0);
}
function buildCurvePath(points = []) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}
function TrendCurveChart({ data = [] }) {
  const chartWidth = width - 72;
  const chartHeight = 180;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 24;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const values = data.map((item) => toNumber(item?.value));
  const maxValue = Math.max(...values, 1);
  const minValue = 0;
  const points = data.map((item, index) => {
    const x = paddingX + (innerWidth * index) / Math.max(data.length - 1, 1);
    const ratio = (toNumber(item?.value) - minValue) / Math.max(maxValue - minValue, 1);
    const y = paddingTop + innerHeight - ratio * innerHeight;
    return { x, y, value: toNumber(item?.value), label: item?.label || '' };
  });
  const linePath = buildCurvePath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
    : '';
  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const value = Math.round((maxValue / gridSteps) * (gridSteps - i));
    const y = paddingTop + (innerHeight * i) / gridSteps;
    return { value, y };
  });
  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {gridValues.map((g, idx) => (
          <Path
            key={`grid-${idx}`}
            d={`M ${paddingX} ${g.y} L ${chartWidth - paddingX} ${g.y}`}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        ))}
        {areaPath ? <Path d={areaPath} fill="url(#trendAreaGradient)" /> : null}
        {linePath ? <Path d={linePath} stroke="#7C3AED" strokeWidth="3" fill="none" /> : null}
        {points.map((point, idx) => (
          <Circle key={`pt-${idx}`} cx={point.x} cy={point.y} r="4" fill="#7C3AED" />
        ))}
      </Svg>
      <View style={styles.trendBottomLegendRow}>
        {points.map((point, idx) => (
          <View key={`legend-${idx}`} style={styles.trendBottomLegendItem}>
            <Text style={styles.trendLegendValue}>{point.value}</Text>
            <Text style={styles.trendBottomLabel}>{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
export default function AnalyticsDashboardScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { isGuest } = useUser();
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  useEffect(() => {
    if (isGuest) setShowAuthPrompt(true);
  }, [isGuest]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [summary, setSummary] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const selectedCompany = useMemo(
    () => companies.find((c) => String(c._id) === String(selectedCompanyId)) || null,
    [companies, selectedCompanyId]
  );
  const loadAnalytics = useCallback(async (companyId) => {
    try {
      setError('');
      if (!companyId) {
        setSummary(null);
        setEngagement(null);
        setMonthlyTrend([]);
        setError(t('analyticsNoCompany'));
        return;
      }
      const [appointmentsRes, companyRes] = await Promise.all([
        api.get(`/appointments/mine/company/${companyId}`),
        api.get(`/companies/${companyId}`),
      ]);
      const appointments = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [];
      const appointmentSummary = summarizeAppointments(appointments);
      const trend = buildMonthlyTrend(appointments);
      const appreciationSummary = companyRes?.data?.appreciationSummary || {};
      const likes = toNumber(appreciationSummary.likes);
      const dislikes = toNumber(appreciationSummary.dislikes);
      const totalFeedback = toNumber(appreciationSummary.total);
      const averageRating = appreciationSummary.averageRating ?? null;
      const positivity = pct(likes, likes + dislikes);
      const engagementIndex = (
        (appointmentSummary.acceptanceRate * 0.45)
        + (appointmentSummary.completionRate * 0.35)
        + (positivity * 0.20)
      );
      setSummary(appointmentSummary);
      setMonthlyTrend(trend);
      setEngagement({
        totalFeedback,
        likes,
        dislikes,
        averageRating,
        positivity,
        engagementIndex,
      });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Analytics unavailable');
      setSummary(null);
      setEngagement(null);
      setMonthlyTrend([]);
    }
  }, [t]);
  const loadCompanies = useCallback(async () => {
    const res = await api.get('/companies');
    const list = Array.isArray(res?.data?.data) ? res.data.data : [];
    setCompanies(list);
    return list;
  }, []);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await loadCompanies();
        if (!list.length) {
          setSelectedCompanyId('');
          setSummary(null);
          setEngagement(null);
          setMonthlyTrend([]);
          setError(t('analyticsNoCompanyList'));
          return;
        }
        const firstCompanyId = String(list[0]._id);
        setSelectedCompanyId(firstCompanyId);
        await loadAnalytics(firstCompanyId);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Analytics unavailable');
      }
      setLoading(false);
    })();
  }, [loadAnalytics, loadCompanies, t]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await loadCompanies();
      const activeId = selectedCompanyId || String(list?.[0]?._id || '');
      if (activeId) {
        if (!selectedCompanyId) setSelectedCompanyId(activeId);
        await loadAnalytics(activeId);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadAnalytics, loadCompanies, selectedCompanyId]);
  const onSelectCompany = useCallback(
    async (companyId) => {
      const id = String(companyId || '');
      if (!id || id === selectedCompanyId) return;
      setSelectedCompanyId(id);
      await loadAnalytics(id);
    },
    [loadAnalytics, selectedCompanyId]
  );
  const topKpis = useMemo(() => {
    if (!summary || !engagement) return [];
    return [
      {
        key: 'total',
        label: t('analyticsAppointmentsTotal'),
        value: summary.total,
        tone: COLORS.accent,
      },
      {
        key: 'acceptance',
        label: t('analyticsAcceptanceRate'),
        value: `${summary.acceptanceRate.toFixed(1)}%`,
        tone: COLORS.success,
      },
      {
        key: 'completion',
        label: t('analyticsCompletionRate'),
        value: `${summary.completionRate.toFixed(1)}%`,
        tone: COLORS.warning,
      },
      {
        key: 'engagement',
        label: t('analyticsEngagementIndex'),
        value: `${engagement.engagementIndex.toFixed(1)}%`,
        tone: '#7C3AED',
      },
    ];
  }, [summary, engagement, t]);
  const statusBreakdown = useMemo(() => buildStatusBreakdown(summary), [summary]);
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>{t('analyticsLoading')}</Text>
      </SafeAreaView>
    );
  }
  return (
    <>
      <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('analyticsTitle')}</Text>
            <Text style={styles.subtitle}>{t('analyticsSubtitle')}</Text>
            {selectedCompany ? (
              <Text style={styles.companyName}>{selectedCompany.name}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
            <Text style={styles.refreshText}>{t('analyticsRefresh')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('analyticsByCompany')}</Text>
          <FlatList
            horizontal
            data={companies}
            keyExtractor={(item) => String(item._id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.companyList}
            renderItem={({ item }) => {
              const active = String(item._id) === String(selectedCompanyId);
              return (
                <TouchableOpacity
                  style={[styles.companyChip, active && styles.companyChipActive]}
                  activeOpacity={0.8}
                  onPress={() => onSelectCompany(item._id)}
                >
                  <Text style={[styles.companyChipText, active && styles.companyChipTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('analyticsNoCompanyList')}</Text>}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!summary ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>{t('analyticsNoData')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {topKpis.map((kpi) => (
                <View key={kpi.key} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={[styles.kpiValue, { color: kpi.tone }]}>{kpi.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('analyticsAppointmentsPerformance')}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.metricLabel}>{t('pending')}</Text>
                <Text style={styles.metricValue}>{summary.pending}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metricLabel}>{t('accepted')}</Text>
                <Text style={styles.metricValue}>{summary.accepted}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metricLabel}>{t('completed')}</Text>
                <Text style={styles.metricValue}>{summary.completed}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metricLabel}>{t('rejected')}</Text>
                <Text style={styles.metricValue}>{summary.rejected}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metricLabel}>{t('cancelled')}</Text>
                <Text style={styles.metricValue}>{summary.cancelled}</Text>
              </View>
              {statusBreakdown.length ? (
                <View style={styles.statusChartWrap}>
                  {statusBreakdown.map((item) => (
                    <View key={item.key} style={styles.statusRow}>
                      <View style={styles.statusRowHead}>
                        <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                        <Text style={styles.statusLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.statusMeta}>{item.value} ({item.pct.toFixed(0)}%)</Text>
                      <View style={styles.statusTrack}>
                        <View
                          style={[
                            styles.statusFill,
                            {
                              width: `${Math.max(item.pct, 3)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('analyticsTrend')}</Text>
              <TrendCurveChart data={monthlyTrend} />
            </View>
            {engagement ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('analyticsEngagementReport')}</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{t('analyticsClientFeedback')}</Text>
                  <Text style={styles.metricValue}>{engagement.totalFeedback}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{t('analyticsAverageRating')}</Text>
                  <Text style={styles.metricValue}>
                    {engagement.averageRating !== null ? `${engagement.averageRating}/5` : '--'}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{t('analyticsPositivity')}</Text>
                  <Text style={styles.metricValue}>{engagement.positivity.toFixed(1)}%</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{t('analyticsLikes')}</Text>
                  <Text style={styles.metricValue}>{engagement.likes}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>{t('analyticsDislikes')}</Text>
                  <Text style={styles.metricValue}>{engagement.dislikes}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
          navigation.replace('Home');
        }}
        onSignIn={() => {
          setShowAuthPrompt(false);
          navigation.replace('Login');
        }}
        onSignUp={() => {
          setShowAuthPrompt(false);
          navigation.replace('Register');
        }}
        featureName="accessDashboard"
      />
    </>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.muted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },
  companyName: {
    marginTop: 8,
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  refreshText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  companyList: {
    paddingTop: 4,
    paddingBottom: 2,
    gap: 8,
  },
  companyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  companyChipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: '#93C5FD',
  },
  companyChipText: {
    color: COLORS.body,
    fontWeight: '600',
  },
  companyChipTextActive: {
    color: COLORS.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  kpiCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  kpiLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  kpiValue: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionTitle: {
    color: COLORS.title,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metricLabel: {
    color: COLORS.body,
    fontSize: 14,
  },
  metricValue: {
    color: COLORS.title,
    fontSize: 14,
    fontWeight: '700',
  },
  statusChartWrap: {
    marginTop: 12,
    gap: 10,
  },
  statusRow: {
    gap: 6,
  },
  statusRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statusLabel: {
    color: COLORS.body,
    fontSize: 13,
    fontWeight: '600',
  },
  statusMeta: {
    color: COLORS.slate,
    fontSize: 12,
  },
  statusTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  statusFill: {
    height: 8,
    borderRadius: 999,
  },
  trendBottomLegendRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  trendBottomLegendItem: {
    minWidth: 38,
    alignItems: 'center',
    flex: 1,
  },
  trendLegendValue: {
    color: COLORS.title,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  trendBottomLabel: {
    color: COLORS.body,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
