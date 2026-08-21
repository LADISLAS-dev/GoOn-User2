import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import AuthPromptModal from '../../components/AuthPromptModal';

const { width } = Dimensions.get('window');

type Ad = {
  id: string;
  title: string;
  description: string;
  image: any;
  category: string;
  rating: number;
  distance: string;
  price: string;
  isAd: boolean;
  adUrl?: string;
  details?: string;
};

// Sample data - in a real app this would come from an API
const ads: Ad[] = [
  {
    id: '1',
    title: 'Mountain Lodge Retreat',
    description: 'Experience the ultimate mountain getaway with breathtaking views and luxury amenities.',
    image: require('../../assets/images/ad1.jpg'),
    category: 'Travel',
    rating: 4.8,
    distance: '2.5 km',
    price: '299€',
    isAd: true,
    adUrl: 'https://example.com/mountain-lodge',
    details: 'Nestled in the heart of the Alps, this stunning lodge offers panoramic mountain views, a private hot tub, and world-class skiing just steps from your door. Perfect for families or romantic getaways.',
  },
  {
    id: '2',
    title: 'Ocean View Restaurant',
    description: 'Fresh seafood with panoramic ocean views. Voted best new restaurant 2024.',
    image: require('../../assets/images/ad2.jpg'),
    category: 'Food',
    rating: 4.5,
    distance: '0.8 km',
    price: '45€',
    isAd: true,
    adUrl: 'https://example.com/ocean-restaurant',
    details: 'Indulge in the finest seafood while enjoying breathtaking sunsets over the Mediterranean. Our chef brings 20 years of experience to every dish.',
  },
  {
    id: '3',
    title: 'Tech Conference 2024',
    description: 'Join industry leaders for three days of innovation, workshops, and networking.',
    image: require('../../assets/images/ad3.jpg'),
    category: 'Events',
    rating: 4.2,
    distance: '5.0 km',
    price: '199€',
    isAd: true,
    adUrl: 'https://example.com/tech-conf',
    details: 'Connect with over 5,000 tech professionals. Featuring keynotes from industry pioneers, hands-on workshops, and exclusive networking opportunities.',
  },
  {
    id: '4',
    title: 'Luxury Spa & Wellness',
    description: 'Rejuvenate your body and mind with our premium spa treatments and wellness programs.',
    image: require('../../assets/images/ad4.jpg'),
    category: 'Wellness',
    rating: 4.9,
    distance: '1.2 km',
    price: '150€',
    isAd: true,
    adUrl: 'https://example.com/spa',
    details: 'Escape the stress of daily life with our comprehensive wellness programs. From hot stone massages to aromatherapy, we offer a complete rejuvenation experience.',
  },
];

export default function AdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isGuest } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const ad = ads.find((a) => a.id === id);

  if (!ad) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ad not found</Text>
      </View>
    );
  }

  const handleViewAd = () => {
    if (isGuest) {
      setShowAuthPrompt(true);
      return;
    }

    if (ad.adUrl) {
      Linking.openURL(ad.adUrl).catch(() => {
        Alert.alert('Error', 'Could not open the advertisement link.');
      });
    } else {
      Alert.alert('Info', 'Advertisement link not available.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={ad.image} style={styles.image} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {ad.isAd && (
            <View style={styles.adBadge}>
              <Ionicons name="megaphone" size={14} color="#FFFFFF" />
              <Text style={styles.adBadgeText}>Ad</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category and Rating */}
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{ad.category}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{ad.rating}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{ad.title}</Text>

          {/* Price and Distance */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="pricetag" size={18} color="#E11D48" />
              <Text style={styles.infoText}>{ad.price}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={18} color="#E11D48" />
              <Text style={styles.infoText}>{ad.distance}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{ad.description}</Text>

          {/* Details */}
          {ad.details && (
            <>
              <Text style={styles.sectionTitle}>Details</Text>
              <Text style={styles.details}>{ad.details}</Text>
            </>
          )}

          {/* View Ad Button */}
          {ad.isAd && (
            <TouchableOpacity
              style={styles.viewAdButton}
              onPress={handleViewAd}
              activeOpacity={0.8}
            >
              <Ionicons name="eye" size={20} color="#FFFFFF" />
              <Text style={styles.viewAdButtonText}>View Advertisement</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Auth Prompt Modal for guests */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        featureName="view advertisements"
        description="Create an account to view ads and discover exclusive content from our partners."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adBadge: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  adBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  details: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  viewAdButton: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  viewAdButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 100,
  },
});
