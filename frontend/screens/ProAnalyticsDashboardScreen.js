import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createSmoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const after = points[i + 2] || next;

    const smoothing = 0.18;
    const cp1x = current.x + (next.x - prev.x) * smoothing;
    const cp1y = current.y + (next.y - prev.y) * smoothing;
    const cp2x = next.x - (after.x - current.x) * smoothing;
    const cp2y = next.y - (after.y - current.y) * smoothing;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return d;
}

export default function AnalyticsDashboardScreen() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
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

      const companyRes = await api.get(`/companies/${companyId}`);

      let appointments = [];
      try {
        // Owner analytics: include all appointments tied to the company.
        const appointmentsRes = await api.get(`/appointments/company/${companyId}`);
        appointments = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [];
      } catch (ownerScopeError) {
        const status = ownerScopeError?.response?.status;
        if (status === 403 || status === 404) {
          // Fallback for older data/auth edge cases.
          try {
            const mineRes = await api.get(`/appointments/mine/company/${companyId}`);
            appointments = Array.isArray(mineRes?.data) ? mineRes.data : [];
          } catch (_) {
            appointments = [];
          }
        } else {
          throw ownerScopeError;
        }
      }

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
    const res = await api.get('/companies', { params: { compact: '1' } });
    const list = Array.isArray(res?.data?.data) ? res.data.data : [];

    if (list.length > 0) {
      setCompanies(list);
      return list;
    }

    try {
      const mineRes = await api.get('/companies/me');
      const mine = mineRes?.data;
      if (mine && mine._id) {
        const one = [mine];
        setCompanies(one);
        return one;
      }
    } catch (_) {
      // Keep empty list if fallback fails.
    }

    setCompanies([]);
    return [];
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
          setError('');
          return;
        }

        const firstCompanyId = String(list[0]._id);
        setSelectedCompanyId(firstCompanyId);
        await loadAnalytics(firstCompanyId);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Analytics unavailable');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAnalytics, loadCompanies, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await loadCompanies();
      if (!list.length) {
        setSelectedCompanyId('');
        setSummary(null);
        setEngagement(null);
        setMonthlyTrend([]);
        setError('');
        return;
      }

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
  const trendMax = useMemo(
    () => Math.max(...monthlyTrend.map((x) => x.value), 1),
    [monthlyTrend]
  );
  const trendChart = useMemo(() => {
    if (!monthlyTrend.length) return null;

    const width = 320;
    const height = 180;
    const paddingLeft = 20;
    const paddingRight = 16;
    const paddingTop = 20;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const maxValue = Math.max(trendMax, 1);

    const stepX = monthlyTrend.length > 1 ? plotWidth / (monthlyTrend.length - 1) : plotWidth;

    const points = monthlyTrend.map((item, index) => {
      const valueRatio = clamp(item.value / maxValue, 0, 1);
      return {
        ...item,
        x: paddingLeft + index * stepX,
        y: paddingTop + (1 - valueRatio) * plotHeight,
      };
    });

    const linePath = createSmoothPath(points);
    const areaPath = points.length
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : '';

    return {
      width,
      height,
      paddingLeft,
      paddingBottom,
      linePath,
      areaPath,
      points,
      maxValue,
    };
  }, [monthlyTrend, trendMax]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>{t('analyticsLoading')}</Text>
      </SafeAreaView>
    );
  }

  return (
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
              {trendChart ? (
                <View style={styles.curveChartCard}>
                  <Svg width="100%" height={trendChart.height} viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}>
                    <Line
                      x1={trendChart.paddingLeft}
                      y1={trendChart.height - trendChart.paddingBottom}
                      x2={trendChart.width - 10}
                      y2={trendChart.height - trendChart.paddingBottom}
                      stroke="#D7E0EC"
                      strokeWidth={1}
                    />
                    <Path d={trendChart.areaPath} fill="rgba(124, 58, 237, 0.12)" />
                    <Path d={trendChart.linePath} fill="none" stroke={COLORS.violet} strokeWidth={3} />

                    {trendChart.points.map((point) => (
                      <Circle
                        key={`dot-${point.key}`}
                        cx={point.x}
                        cy={point.y}
                        r={3.5}
                        fill="#FFFFFF"
                        stroke={COLORS.violet}
                        strokeWidth={2}
                      />
                    ))}

                    {trendChart.points.map((point) => (
                      <SvgText
                        key={`label-${point.key}`}
                        x={point.x}
                        y={trendChart.height - 10}
                        fontSize="11"
                        fill="#64748B"
                        textAnchor="middle"
                      >
                        {point.label}
                      </SvgText>
                    ))}

                    {trendChart.points.map((point) => (
                      <SvgText
                        key={`value-${point.key}`}
                        x={point.x}
                        y={point.y - 8}
                        fontSize="10"
                        fill="#334155"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {point.value}
                      </SvgText>
                    ))}
                  </Svg>
                </View>
              ) : (
                <Text style={styles.emptyText}>{t('analyticsNoData')}</Text>
              )}
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
  curveChartCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
    paddingVertical: 8,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
});
