import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getCompanyById } from '../services/api';
import { API_URL } from '../env';
import { useLanguage } from '../context/LanguageContext';
import { resolveAvatarUri } from '../utils/profileUtils';
import { getCategoryLabel } from '../utils/categoryLabels';
import ReportModal from '../components/ReportModal';

const COLORS = {
  background: '#F6F8FF',
  card: '#FFFFFF',
  text: '#121827',
  textSoft: '#5D6473',
  textMuted: '#8E96A6',
  line: '#E7EAF2',
  brand: '#8B2FC9',
  brandSoft: '#F4EAFE',
  brandDark: '#5B1D85',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  topTint: '#1A1230',
};

const safeOpenURL = async (url) => {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch (_) {}
};

const companyImage = (src) => resolveAvatarUri(src, API_URL) || null;

const renderStars = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A';
  const rounded = Math.round(value);
  return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
};

const SectionTitle = ({ title, subtitle }) => (
  <View style={styles.sectionTitleWrap}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.sectionSubTitle}>{subtitle}</Text>}
  </View>
);

const ActionButton = ({ icon, label, onPress }) => {
  if (!onPress) return null;
  return (
    <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const InfoItem = ({ icon, title, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

export default function AboutScreen(props) {
  const route = useRoute();
  const companyId = props?.companyId ?? route?.params?.companyId ?? null;
  const { t, language, activeLanguage } = useLanguage();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getCompanyById(companyId);
      setCompany(data || null);
    } catch (e) {
      console.warn('AboutScreen load error:', e);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!companyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>i</Text>
          <Text style={styles.emptyTitle}>{t('noCompanySelected')}</Text>
          <Text style={styles.emptySub}>{t('openCompanyToView')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.emptyTitle}>{t('companyNotFound', 'Entreprise introuvable')}</Text>
      </SafeAreaView>
    );
  }

  const initials = String(company?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const categoryIds = [...new Set([
    ...(Array.isArray(company?.categoryIds)
      ? company.categoryIds.map((id) => String(id || '').trim()).filter(Boolean)
      : []),
    String(company?.categoryId || '').trim(),
  ])].filter(Boolean);

  const categoryLabels = categoryIds.map((id) => getCategoryLabel(id, activeLanguage));
  const summary = company?.appreciationSummary || {};

  const reviews = Number(summary.total || 0);
  const likes = Number(summary.likes || 0);
  const avgRating = typeof summary.averageRating === 'number' ? Number(summary.averageRating.toFixed(1)) : null;
  const comments = Array.isArray(company?.appreciations)
    ? company.appreciations.filter((item) => String(item?.comment || '').trim())
    : [];

  const bannerSource = companyImage(company?.backgroundImage || company?.carouselImages?.[0] || company?.logo);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <ImageBackground
            source={bannerSource ? { uri: bannerSource } : null}
            style={styles.heroBackground}
            imageStyle={styles.heroBackgroundImage}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroTopDecor} />
            <View style={styles.logoFrame}>
              {company?.logo ? (
                <Image source={{ uri: companyImage(company.logo) }} style={styles.logo} />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoFallbackText}>{initials}</Text>
                </View>
              )}

              
            </View>

           

            <View style={styles.heroTextWrap}>
              <View style={styles.nameRow}>
                <Text style={styles.companyName}>{company?.name || t('companyFallbackLabel', 'Entreprise')}</Text>
                {company?.isVerified ? (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedPillText}>{t('verifiedBadgeUpper', 'VERIFIEE')}</Text>
                  </View>
                ) : null}
              </View>

              {company?.description ? (
                <Text style={styles.heroDescription} numberOfLines={2}>{company.description}</Text>
              ) : null}

              {categoryLabels.length > 0 ? (
                <View style={styles.categoriesWrap}>
                  {categoryLabels.slice(0, 4).map((label) => (
                    <View key={label} style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </ImageBackground>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{avgRating !== null ? avgRating : '-'}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsAverageRating', 'Note')}</Text>
            <Text style={styles.kpiMeta}>{renderStars(avgRating)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{reviews}</Text>
            <Text style={styles.kpiLabel}>{t('reviewsLabel', 'Avis')}</Text>
            <Text style={styles.kpiMeta}>{t('clientsLabel', 'Clients')}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{likes}</Text>
            <Text style={styles.kpiLabel}>{t('analyticsLikes', 'Likes')}</Text>
            <Text style={styles.kpiMeta}>{t('positiveLabel', 'Positifs')}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle title={t('quickContact', 'Quick contact')} subtitle={t('directActions', 'Direct actions')} />
          <View style={styles.actionsRow}>
            <ActionButton
              icon="📞"
              label={t('callLabel', 'Appeler')}
              onPress={company?.phone ? () => safeOpenURL(`tel:${company.phone}`) : null}
            />
            <ActionButton
              icon="✉️"
              label="Email"
              onPress={company?.email ? () => safeOpenURL(`mailto:${company.email}`) : null}
            />
            <ActionButton
              icon="🌐"
              label={t('website', 'Site web')}
              onPress={company?.website
                ? () => {
                    const url = String(company.website).startsWith('http')
                      ? company.website
                      : `https://${company.website}`;
                    safeOpenURL(url);
                  }
                : null}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle title={t('contact')} subtitle={t('coordinatesLabel', 'Coordinates')} />
          <InfoItem icon="📍" title={t('location')} value={company?.location} />
          <InfoItem icon="📞" title={t('phone')} value={company?.phone} />
          <InfoItem icon="✉️" title={t('email')} value={company?.email} />
          <InfoItem icon="🌐" title={t('website')} value={company?.website} />
        </View>

        {company?.description ? (
          <View style={styles.sectionCard}>
            <SectionTitle title={t('aboutSection')} subtitle={t('presentationSubtitle', 'Presentation')} />
            <Text style={styles.bodyText}>{company.description}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionTitle title={t('customerFeedback', 'Customer feedback')} subtitle={t('latestReviews', 'Latest reviews')} />
          {comments.length > 0 ? (
            comments.slice(0, 6).map((item, index) => (
              <View
                key={item?._id || index}
                style={[
                  styles.commentCard,
                  index === comments.length - 1 ? styles.commentCardLast : null,
                ]}
              >
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor} numberOfLines={1}>
                    {item?.reviewer?.name || t('userDefault', 'Utilisateur')}
                  </Text>
                  <View style={item?.liked ? styles.commentPositivePill : styles.commentNegativePill}>
                    <Text style={item?.liked ? styles.commentPositiveText : styles.commentNegativeText}>
                      {item?.liked ? t('positiveReview', 'Positif') : t('negativeReview', 'Negatif')}
                    </Text>
                  </View>
                </View>
                {typeof item?.rating === 'number' ? (
                  <Text style={styles.commentRating}>⭐ {item.rating}/5</Text>
                ) : null}
                <Text style={styles.commentBody}>{item.comment}</Text>
                <Text style={styles.commentDate}>
                  {item?.createdAt ? new Date(item.createdAt).toLocaleDateString(activeLanguage === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : language === 'pt' ? 'pt-PT' : 'fr-FR') : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>{t('noReviewsYet', 'Aucun avis pour le moment.')}</Text>
          )}
        </View>

        {Array.isArray(company?.services) && company.services.length > 0 ? (
          <View style={styles.sectionCard}>
            <SectionTitle title={t('offeredServices')} subtitle={t('catalogLabel', 'Catalog')} />
            {company.services.map((service, index) => (
              <View
                key={service?._id || index}
                style={[
                  styles.serviceRow,
                  index === company.services.length - 1 ? styles.serviceRowLast : null,
                ]}
              >
                <Text style={styles.serviceName} numberOfLines={1}>{service?.name || t('serviceLabel', 'Service')}</Text>
                <Text style={styles.servicePrice}>${Number(service?.price || 0).toFixed(2)}</Text>
              </View>
            ))}



       

          </View>

          
        ) : null}


           {/* ── Bouton Signaler ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setReportVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.reportButtonText}>🚩 {t('report', 'Signaler')}</Text>
      </TouchableOpacity>



        <View style={{ height: 120 }} />


  

      </ScrollView>

      
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="company"
        targetId={companyId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reportButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  reportButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroCard: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#131A2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
    backgroundColor: COLORS.card,
  },
  heroBackground: {
    minHeight: 300,
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'flex-end',
  },
  heroBackgroundImage: {
    opacity: 0.9,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.topTint,
    opacity: 0.55,
  },
  heroTopDecor: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    opacity: 0.28,
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandSoft,
  },
  logoFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.brand,
  },
  heroTextWrap: {
    zIndex: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: '#fff',
    flexShrink: 1,
  },
  verifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.success,
  },
  verifiedPillText: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.4,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.92)',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  categoryPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.brand,
  },
  kpiLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSoft,
  },
  kpiMeta: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sectionCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionTitleWrap: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubTitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#FAFBFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    fontSize: 17,
    marginBottom: 3,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 10,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.brandSoft,
  },
  infoIcon: {
    fontSize: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSoft,
  },
  commentCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 10,
  },
  commentCardLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthor: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  commentPositivePill: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  commentNegativePill: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  commentPositiveText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
  },
  commentNegativeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  commentRating: {
    marginTop: 4,
    color: '#9A5A00',
    fontWeight: '700',
    fontSize: 12,
  },
  commentBody: {
    marginTop: 5,
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  commentDate: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  emptyInlineText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 10,
    gap: 10,
  },
  serviceRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  servicePrice: {
    fontSize: 14,
    color: COLORS.brand,
    fontWeight: '800',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 26,
    color: COLORS.brand,
    backgroundColor: COLORS.brandSoft,
    overflow: 'hidden',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
