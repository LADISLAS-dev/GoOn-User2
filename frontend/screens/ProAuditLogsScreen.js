import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getCompanyAuditLogs } from '../services/api';

const COLORS = {
  background: '#F7F5F1',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
};

const FILTERS = ['all', 'customer', 'employee', 'role', 'business_module', 'appointment'];

export default function ProAuditLogsScreen({ companyId }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const copy = isFrench
    ? {
        title: 'Journal d’activité', subtitle: 'Historique des changements de cette entreprise.',
        all: 'Tout', customer: 'Clients', employee: 'Équipe', role: 'Rôles',
        business_module: 'Modules', appointment: 'Rendez-vous',
        empty: 'Aucune activité enregistrée.', loadingError: 'Impossible de charger l’historique.',
        retry: 'Réessayer', loadMore: 'Charger plus', fields: 'Champs modifiés',
        actions: {
          'customer.create': 'Client créé', 'customer.update': 'Client modifié', 'customer.delete': 'Client supprimé',
          'employee.add': 'Membre ajouté', 'employee.update': 'Membre modifié',
          'role.create': 'Rôle créé', 'role.update': 'Rôle modifié',
          'module.update': 'Modules modifiés', 'appointment.update': 'Rendez-vous modifié',
          'appointment.delete': 'Rendez-vous supprimé',
        },
      }
    : {
        title: 'Activity history', subtitle: 'Changes recorded for this business.',
        all: 'All', customer: 'Customers', employee: 'Team', role: 'Roles',
        business_module: 'Modules', appointment: 'Bookings',
        empty: 'No activity recorded.', loadingError: 'Unable to load activity history.',
        retry: 'Retry', loadMore: 'Load more', fields: 'Changed fields',
        actions: {
          'customer.create': 'Customer created', 'customer.update': 'Customer updated', 'customer.delete': 'Customer deleted',
          'employee.add': 'Member added', 'employee.update': 'Member updated',
          'role.create': 'Role created', 'role.update': 'Role updated',
          'module.update': 'Modules updated', 'appointment.update': 'Booking updated',
          'appointment.delete': 'Booking deleted',
        },
      };

  const loadPage = useCallback(async (page = 1, append = false) => {
    if (!companyId) {
      setError(copy.loadingError);
      setIsLoading(false);
      return;
    }

    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError('');
    try {
      const params = { page, limit: 25 };
      if (filter !== 'all') params.entityType = filter;
      const result = await getCompanyAuditLogs(companyId, params);
      setLogs((current) => append ? [...current, ...result.data] : result.data);
      setPagination(result.pagination || { page: 1, pages: 1, total: result.data?.length || 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.loadingError);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [companyId, copy.loadingError, filter]);

  useFocusEffect(useCallback(() => {
    loadPage(1);
  }, [loadPage]));

  const renderLog = ({ item }) => {
    const date = item.createdAt ? new Date(item.createdAt) : null;
    const dateText = date && !Number.isNaN(date.getTime())
      ? date.toLocaleString(isFrench ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
    const actionLabel = copy.actions[item.action] || item.action;
    const actorName = item.actorId?.name || item.actorId?.email || (isFrench ? 'Utilisateur' : 'User');

    return (
      <View style={styles.logRow}>
        <View style={styles.timelineColumn}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.logContent}>
          <View style={styles.logHeading}>
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Text style={styles.dateText}>{dateText}</Text>
          </View>
          <Text style={styles.actorText}>{actorName}</Text>
          {!!item.changedFields?.length && (
            <Text style={styles.fieldText}>
              {copy.fields}: {item.changedFields.join(', ')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.filterButton, filter === item && styles.filterButtonActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{copy[item]}</Text>
          </TouchableOpacity>
        )}
      />

      {!!error && (
        <View style={styles.errorRow}>
          <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPage(1)}><Text style={styles.retryText}>{copy.retry}</Text></TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : logs.length ? (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderLog}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadPage(1); }} />}
          onEndReached={() => {
            if (!isLoadingMore && pagination.page < pagination.pages) loadPage(pagination.page + 1, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={COLORS.accent} style={styles.footerLoader} /> : null}
        />
      ) : (
        <View style={styles.emptyState}><Text style={styles.emptyText}>{copy.empty}</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 13, marginTop: 5 },
  filters: { paddingHorizontal: 18, paddingVertical: 10, gap: 7 },
  filterButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  filterButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: { color: COLORS.textSoft, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginHorizontal: 18, marginBottom: 8 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 12 },
  retryText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 48 },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  logRow: { flexDirection: 'row', minHeight: 82 },
  timelineColumn: { width: 18, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, marginTop: 16, borderRadius: 5, backgroundColor: COLORS.accent },
  timelineLine: { flex: 1, width: 1, marginTop: 4, backgroundColor: COLORS.border },
  logContent: { flex: 1, minWidth: 0, paddingVertical: 12, paddingLeft: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  actionText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '800' },
  dateText: { color: COLORS.textSoft, fontSize: 10, textAlign: 'right' },
  actorText: { color: COLORS.textSoft, fontSize: 12, marginTop: 5 },
  fieldText: { color: COLORS.accent, fontSize: 11, marginTop: 5 },
  footerLoader: { marginVertical: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { color: COLORS.textSoft, fontSize: 14 },
});