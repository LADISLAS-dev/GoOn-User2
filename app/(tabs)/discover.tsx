/**
 * Discover Screen - Main browsing page (available to guests)
 * Shows premium establishments with search, filters, and categories
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Establishment {
  id: string;
  name: string;
  category: 'restaurant' | 'hotel' | 'activity' | 'wellness' | 'travel' | 'event';
  rating: number;
  reviews: number;
  price: string;
  distance: string;
  image: string;
  isPremium: boolean;
  description: string;
}

const categories = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
  { key: 'hotel', label: 'Hotels', icon: 'bed' },
  { key: 'activity', label: 'Activities', icon: 'bicycle' },
  { key: 'wellness', label: 'Wellness', icon: 'leaf' },
  { key: 'travel', label: 'Travel', icon: 'airplane' },
  { key: 'event', label: 'Events', icon: 'calendar' },
] as const;

const establishments: Establishment[] = [
  {
    id: '1',
    name: 'Le Jardin Secret',
    category: 'restaurant',
    rating: 4.8,
    reviews: 234,
    price: '€€€',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    isPremium: true,
    description: 'Michelin-starred French gastronomy in an intimate garden setting',
  },
  {
    id: '2',
    name: 'The Grand Palace',
    category: 'hotel',
    rating: 4.9,
    reviews: 512,
    price: '€€€€',
    distance: '3.5 km',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    isPremium: true,
    description: 'Historic luxury hotel with panoramic city views',
  },
  {
    id: '3',
    name: 'Ocean Explorer',
    category: 'activity',
    rating: 4.7,
    reviews: 189,
    price: '€€',
    distance: '5.0 km',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    isPremium: false,
    description: 'Private yacht tours along the stunning coastline',
  },
  {
    id: '4',
    name: 'Spa Céleste',
    category: 'wellness',
    rating: 4.6,
    reviews: 156,
    price: '€€€',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
    isPremium: true,
    description: 'Holistic wellness retreat with thermal baths',
  },
  {
    id: '5',
    name: 'Alpine Adventure',
    category: 'travel',
    rating: 4.5,
    reviews: 98,
    price: '€€€',
    distance: '15 km',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400',
    isPremium: false,
    description: 'Guided mountain expeditions for all skill levels',
  },
  {
    id: '6',
    name: 'Opera Night',
    category: 'event',
    rating: 4.9,
    reviews: 423,
    price: '€€€€',
    distance: '2.1 km',
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400',
    isPremium: true,
    description: 'Exclusive evening performances at the Royal Opera House',
  },
];

const categoryColors: Record<string, string> = {
  restaurant: '#DC2626',
  hotel: '#7C3AED',
  activity: '#059669',
  wellness: '#D97706',
  travel: '#2563EB',
  event: '#DB2777',
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const filteredEstablishments = establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B8860B" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {isGuest ? 'Discover GoOn' : 'Good evening'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isGuest ? 'Browse premium experiences' : 'Explore curated experiences'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#111827" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants, hotels, activities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={isSelected ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {selectedCategory === 'all' ? 'Popular Now' : categories.find(c => c.key === selectedCategory)?.label}
            </Text>
            <Text style={styles.resultsCount}>
              {filteredEstablishments.length} places
            </Text>
          </View>

          {filteredEstablishments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredEstablishments.map((establishment) => (
                <TouchableOpacity
                  key={establishment.id}
                  style={styles.card}
                  onPress={() => router.push(`/discover/${establishment.id}`)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: establishment.image }}
                    style={styles.cardImage}
                  />
                  {establishment.isPremium && (
                    <LinearGradient
                      colors={['#B8860B', '#D4A843']}
                      style={styles.premiumBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="diamond" size={10} color="#FFFFFF" />
                      <Text style={styles.premiumText}>PREMIUM</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {establishment.name}
                    </Text>
                    <View style={styles.cardInfo}>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>{establishment.rating}</Text>
                        <Text style={styles.reviewCount}>({establishment.reviews})</Text>
                      </View>
                      <Text style={styles.priceText}>{establishment.price}</Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.categoryTag}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: categoryColors[establishment.category] },
                          ]}
                        />
                        <Text style={styles.categoryName}>{establishment.category}</Text>
                      </View>
                      <View style={styles.distanceRow}>
                        <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                        <Text style={styles.distanceText}>{establishment.distance}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Guest indicator */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="globe-outline" size={14} color="#FFFFFF" />
          <Text style={styles.guestBannerText}>
            Browsing as guest —{' '}
            <Text
              style={styles.guestBannerLink}
              onPress={() => router.push('/(auth)/login')}
            >
              Sign in for full access
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryItemSelected: {
    backgroundColor: '#B8860B',
    borderColor: '#B8860B',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  resultsCount: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardContent: {
    padding: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  guestBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  guestBannerText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  guestBannerLink: {
    fontWeight: '700',
    color: '#D4A843',
    textDecorationLine: 'underline',
  },
});
