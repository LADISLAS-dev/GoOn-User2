import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Heart, House, MapPin, Plus, Search, SlidersHorizontal, Star, UserRound } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../env';
import { resolveAvatarUri } from '../utils/profileUtils';

      const ACCENT = '#F47732';
      const INK = '#211D1B';
const MUTED = '#857D78';
const BACKGROUND = '#F7F1EC';

function companyImage(company) {
  return company?.carouselImages?.[0]
    || company?.backgroundImage
    || company?.services?.find((service) => service?.image)?.image
    || '';
}

function lowestServicePrice(company) {
  const prices = (company?.services || [])
    .map((service) => Number(service?.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}

export default function BeautyFashionDiscovery({
  companies = [], user, searchQuery, onSearchChange, onBack, onSelectCompany, onOpenProfile, onOpenNotifications,
}) {
  const { activeLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const isFrench = activeLanguage === 'fr';
  const searchRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('hair');
  const [activeTab, setActiveTab] = useState('home');
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [savedKeyLoaded, setSavedKeyLoaded] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const savedKey = `goon.beauty.saved.${user?._id || user?.firebaseUid || 'guest'}`;
  const cardWidth = Math.max(92, Math.floor((width - 47) / 2));

  const copy = isFrench
    ? {
        greeting: 'Bonjour', search: 'Rechercher un salon, une prestation', headline: 'Votre prochain rendez-vous beauté',
        headlineDetail: 'Coiffure, coloration et soins près de chez vous.', bookNow: 'Réserver', category: 'Catégorie',
        hair: 'Coiffure', color: 'Coloration', care: 'Soins', nails: 'Ongles', makeup: 'Maquillage', all: 'Tout',
        hairTitle: 'Coiffure', providers: 'Professionnels', seeAll: 'Voir tout', startingAt: 'À partir de',
        home: 'Accueil', searchTab: 'Recherche', saved: 'Favoris', profile: 'Profil', noProviders: 'Aucun professionnel ne correspond à cette recherche.',
      }
    : {
        greeting: 'Good morning', search: 'Search salon, service', headline: 'Find your next hair appointment',
        headlineDetail: 'Hair, color and care from professionals near you.', bookNow: 'Book now', category: 'Category',
        hair: 'Hairdressing', color: 'Hair color', care: 'Oil Treatment', nails: 'Nails', makeup: 'Makeup', all: 'All',
        hairTitle: 'Hairdressing', providers: 'Professionals', seeAll: 'See All', startingAt: 'From',
        home: 'Home', searchTab: 'Search', saved: 'Saved', profile: 'Profile', noProviders: 'No professionals match this search.',
      };

  const categories = [
    { key: 'hair', label: copy.hair, terms: ['hair', 'coiff', 'coupe', 'brushing', 'barber', 'salon'] },
    { key: 'color', label: copy.color, terms: ['color', 'balayage', 'm[eè]che', 'highlight'] },
    { key: 'care', label: copy.care, terms: ['soin', 'care', 'facial', 'visage', 'massage'] },
    { key: 'nails', label: copy.nails, terms: ['ongle', 'nail', 'manucure', 'pedicure', 'pédicure'] },
    { key: 'makeup', label: copy.makeup, terms: ['maquillage', 'makeup', 'make-up'] },
    { key: 'all', label: copy.all, terms: [] },
  ];

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(savedKey)
      .then((stored) => {
        if (!active) return;
        const parsed = JSON.parse(stored || '[]');
        setSavedCompanies(Array.isArray(parsed) ? parsed.map(String) : []);
      })
      .catch(() => { if (active) setSavedCompanies([]); })
      .finally(() => { if (active) setSavedKeyLoaded(savedKey); });
    return () => { active = false; };
  }, [savedKey]);

  useEffect(() => {
    if (savedKeyLoaded === savedKey) AsyncStorage.setItem(savedKey, JSON.stringify(savedCompanies)).catch(() => {});
  }, [savedCompanies, savedKey, savedKeyLoaded]);

  const visibleCompanies = useMemo(() => {
    const filter = categories.find((category) => category.key === selectedCategory);
    let rows = companies.filter((company) => {
      const serviceText = (company?.services || []).map((service) => `${service?.name || ''} ${service?.description || ''}`).join(' ');
      const haystack = `${company?.name || ''} ${company?.description || ''} ${serviceText}`.toLocaleLowerCase();
      const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.trim().toLocaleLowerCase());
      const matchesCategory = !filter?.terms.length || filter.terms.some((term) => new RegExp(term, 'i').test(haystack));
      return matchesSearch && matchesCategory;
    });
    if (activeTab === 'saved') rows = rows.filter((company) => savedCompanies.includes(String(company._id)));
    if (sortBy === 'price') rows.sort((a, b) => (lowestServicePrice(a) ?? Number.MAX_SAFE_INTEGER) - (lowestServicePrice(b) ?? Number.MAX_SAFE_INTEGER));
    else rows.sort((a, b) => (a.distance == null ? Number.MAX_SAFE_INTEGER : Number(a.distance)) - (b.distance == null ? Number.MAX_SAFE_INTEGER : Number(b.distance)));
    return rows;
  }, [companies, searchQuery, selectedCategory, activeTab, savedCompanies, sortBy]);

  const featuredCompany = activeTab === 'home' ? companies.find((company) => companyImage(company)) || companies[0] : null;
  const firstName = String(user?.name || user?.displayName || '').trim().split(/\s+/)[0];
  const avatarUri = user?.avatar ? resolveAvatarUri(user.avatar, API_URL) : null;
  const toggleSaved = (companyId) => setSavedCompanies((current) => (
    current.includes(companyId) ? current.filter((entry) => entry !== companyId) : [...current, companyId]
  ));
  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') { setSelectedCategory('hair'); setSortBy('distance'); onSearchChange(''); }
    if (tab === 'search') requestAnimationFrame(() => searchRef.current?.focus?.());
    if (tab === 'profile') onOpenProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.userAvatar} /> : <View style={styles.userAvatarFallback}><UserRound size={16} color={MUTED} /></View>}
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingLabel}>{copy.greeting}!</Text>
            <Text style={styles.greetingName} numberOfLines={1}>{firstName || (isFrench ? 'Bienvenue' : 'Jacob Thomas')}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenNotifications} accessibilityRole="button" accessibilityLabel={isFrench ? 'Notifications' : 'Notifications'}>
            <Bell size={17} color={INK} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={15} color={MUTED} />
            <TextInput ref={searchRef} value={searchQuery} onChangeText={onSearchChange} placeholder={copy.search} placeholderTextColor={MUTED} style={styles.searchInput} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setSortBy((current) => current === 'distance' ? 'price' : 'distance')} accessibilityRole="button" accessibilityLabel={sortBy === 'distance' ? (isFrench ? 'Trier par prix' : 'Sort by price') : (isFrench ? 'Trier par proximité' : 'Sort by distance')}>
            <SlidersHorizontal size={17} color={INK} />
          </TouchableOpacity>
        </View>

        {featuredCompany ? (
          <TouchableOpacity style={styles.hero} activeOpacity={0.92} onPress={() => onSelectCompany(featuredCompany)}>
            {companyImage(featuredCompany) ? (
              <ImageBackground source={{ uri: resolveAvatarUri(companyImage(featuredCompany), API_URL) }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
                <View style={styles.heroShade} />
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>{copy.headline}</Text>
                  <Text style={styles.heroSubtitle} numberOfLines={2}>{copy.headlineDetail}</Text>
                  <View style={styles.heroCta}><Text style={styles.heroCtaText}>{copy.bookNow}</Text></View>
                </View>
              </ImageBackground>
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroTitle}>{copy.headline}</Text>
                <Text style={styles.heroSubtitle}>{copy.headlineDetail}</Text>
                <View style={styles.heroCta}><Text style={styles.heroCtaText}>{copy.bookNow}</Text></View>
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.category}</Text>
          <Text style={styles.sortHint}>{sortBy === 'distance' ? (isFrench ? 'À proximité' : 'Nearby') : (isFrench ? 'Prix' : 'Price')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {categories.map((category) => (
            <TouchableOpacity key={category.key} style={[styles.filterChip, selectedCategory === category.key && styles.filterChipActive]} onPress={() => setSelectedCategory(category.key)}>
              <Text style={[styles.filterChipText, selectedCategory === category.key && styles.filterChipTextActive]}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{selectedCategory === 'hair' ? copy.hair : copy.providers}</Text>
          <TouchableOpacity onPress={() => { setSelectedCategory('all'); setActiveTab('search'); }}><Text style={styles.seeAll}>{copy.seeAll}</Text></TouchableOpacity>
        </View>
        {visibleCompanies.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>
            {visibleCompanies.map((company) => {
              const companyId = String(company._id || company.id || company.companyId || '');
              const serviceImage = company?.services?.find((service) => service?.image)?.image;
              const image = serviceImage || companyImage(company);
              const service = company?.services?.find((item) => Number(item?.price) > 0) || company?.services?.[0];
              const rating = Number(company?.appreciationSummary?.averageRating);
              const distance = company.distance == null ? null : Number(company.distance);
              const distanceText = distance !== null && Number.isFinite(distance) ? `${isFrench ? (distance * 1.60934).toFixed(1) : distance.toFixed(1)} ${isFrench ? 'km' : 'mi'}` : '';
              const saved = savedCompanies.includes(companyId);
              return (
                <View key={companyId || company.name} style={[styles.providerCard, { width: cardWidth }]}>
                  <TouchableOpacity style={styles.providerImageWrap} onPress={() => onSelectCompany(company)} activeOpacity={0.9}>
                    {image ? <Image source={{ uri: resolveAvatarUri(image, API_URL) }} style={styles.providerImage} /> : <View style={styles.providerImageFallback}><Text style={styles.providerImageInitial}>{String(company.name || 'B').slice(0, 1).toUpperCase()}</Text></View>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heartButton} onPress={() => toggleSaved(companyId)} accessibilityRole="button" accessibilityLabel={saved ? (isFrench ? 'Retirer des favoris' : 'Remove saved') : (isFrench ? 'Ajouter aux favoris' : 'Save provider')}>
                    <Heart size={14} color={saved ? ACCENT : INK} fill={saved ? ACCENT : 'transparent'} />
                  </TouchableOpacity>
                  <View style={styles.providerBottomRow}>
                    <TouchableOpacity style={styles.providerInfo} onPress={() => onSelectCompany(company)} activeOpacity={0.85}>
                      <Text style={styles.providerName} numberOfLines={1}>{company.name}</Text>
                      <View style={styles.providerMeta}>
                        {Number.isFinite(rating) && rating > 0 ? <View style={styles.rating}><Star size={11} color={ACCENT} fill={ACCENT} /><Text style={styles.ratingText}>{rating.toFixed(1)}</Text></View> : null}
                        {distanceText ? <View style={styles.distance}><MapPin size={10} color={MUTED} /><Text style={styles.distanceText}>{distanceText}</Text></View> : null}
                      </View>
                      {service ? <Text style={styles.price} numberOfLines={1}>{formatMoney(Number(service.price) || 0)} · {service.name}</Text> : null}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileButton} onPress={() => onSelectCompany(company)} accessibilityRole="button" accessibilityLabel={`${copy.bookNow} ${company.name}`}>
                      <Plus size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyText}>{copy.noProviders}</Text></View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {[
          ['home', House, copy.home], ['search', Search, copy.searchTab], ['saved', Heart, copy.saved], ['profile', UserRound, copy.profile],
        ].map(([tab, Icon, label]) => (
          <TouchableOpacity key={tab} style={[styles.bottomItem, activeTab === tab && styles.bottomItemActive]} onPress={() => handleTab(tab)} accessibilityRole="button" accessibilityLabel={label}>
            <Icon size={16} color={activeTab === tab ? '#FFFFFF' : '#B9B0AA'} fill={tab === 'saved' && activeTab === tab ? '#FFFFFF' : 'transparent'} />
            {activeTab === tab ? <Text style={styles.bottomLabelActive}>{label}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function formatMoney(price) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(price); }
  catch (_) { return `$${Number(price).toFixed(2)}`; }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  content: { paddingHorizontal: 15, paddingTop: 1, paddingBottom: 68 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  userAvatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#F3D9CB' },
  userAvatarFallback: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  greetingWrap: { flex: 1 },
  greetingLabel: { color: MUTED, fontSize: 8 },
  greetingName: { color: INK, fontSize: 11, fontWeight: '800', marginTop: 1 },
  iconButton: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  searchBox: { flex: 1, minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 18, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, color: INK, fontSize: 9, paddingVertical: 5 },
  filterButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  hero: { width: '100%', aspectRatio: 1.85, marginTop: 8, borderRadius: 13, overflow: 'hidden', backgroundColor: '#503D35' },
  heroImage: { flex: 1, justifyContent: 'flex-end' },
  heroImageStyle: { resizeMode: 'cover' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25,17,14,0.42)' },
  heroCopy: { padding: 9, alignItems: 'flex-start' },
  heroFallback: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', padding: 9, backgroundColor: '#704B3A' },
  heroTitle: { color: '#FFFFFF', fontSize: 13, lineHeight: 15, fontWeight: '800', maxWidth: '75%' },
  heroSubtitle: { color: '#FFF5EF', fontSize: 7, marginTop: 2, maxWidth: '80%' },
  heroCta: { minHeight: 21, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 14, backgroundColor: ACCENT, marginTop: 4 },
  heroCtaText: { color: '#FFFFFF', fontSize: 7, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  sectionTitle: { color: INK, fontSize: 10, fontWeight: '800' },
  sortHint: { color: MUTED, fontSize: 7 },
  seeAll: { color: MUTED, fontSize: 7 },
  filterRow: { gap: 5, paddingBottom: 1 },
  filterChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 13, backgroundColor: '#FFFFFF' },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { color: MUTED, fontSize: 7, fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  providerRow: { gap: 6, paddingRight: 1, paddingBottom: 2 },
  providerCard: { position: 'relative', overflow: 'hidden', padding: 4, marginTop: 1, borderRadius: 8, backgroundColor: '#FFFFFF' },
  providerImageWrap: { width: '100%', aspectRatio: 1.25, borderRadius: 6, overflow: 'hidden' },
  providerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  providerImageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3D9CB' },
  providerImageInitial: { color: ACCENT, fontSize: 19, fontWeight: '800' },
  heartButton: { position: 'absolute', top: 8, right: 8, zIndex: 2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  providerBottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 4 },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { color: INK, fontSize: 7, fontWeight: '800' },
  providerMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3, marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { color: INK, fontSize: 7, fontWeight: '700' },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  distanceText: { color: MUTED, fontSize: 6 },
  price: { color: INK, fontSize: 7, fontWeight: '800', marginTop: 2 },
  profileButton: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: ACCENT, marginBottom: 1 },
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: MUTED, fontSize: 9, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 8, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 23, backgroundColor: '#111111', shadowColor: '#000000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 9, elevation: 7 },
  bottomItem: { flex: 1, minHeight: 29, alignItems: 'center', justifyContent: 'center' },
  bottomItemActive: { flex: 1.35, flexDirection: 'row', gap: 4, borderRadius: 16, backgroundColor: ACCENT },
  bottomLabelActive: { color: '#FFFFFF', fontSize: 7, fontWeight: '800' },
});