import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createCompany } from '../services/api';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import AuthPromptModal from '../components/AuthPromptModal';
import { useLazyImagePicker } from '../hooks/useLazyImagePicker';
import * as Location from 'expo-location';
import { API_URL } from '../env';
import { auth } from '../services/firebase';
import { isLocalAssetUri } from '../utils/profileUtils';
const C = {
  purple:       '#8B2FC9',
  purpleLight:  '#F3E8FF',
  purpleDark:   '#6A1FA0',
  white:        '#FFFFFF',
  bg:           '#F8F0FF',
  card:         '#FFFFFF',
  separator:    '#EDE0F7',
  success:      '#27AE60',
  danger:       '#E74C3C',
  textPrimary:  '#1A1A2E',
  textSecondary:'#6B6B8A',
  textTertiary: '#AEAEB2',
};
const CATEGORIES = [
  { id: '1', label: 'Technology & IT', icon: '💻' },
  { id: '2', label: 'Food & Restaurant', icon: '🍽️' },
  { id: '3', label: 'Beauty & Fashion', icon: '💄' },
  { id: '4', label: 'Health & Medical', icon: '🏥' },
  { id: '5', label: 'Education', icon: '📚' },
  { id: '6', label: 'Finance & Banking', icon: '💰' },
  { id: '7', label: 'Real Estate', icon: '🏠' },
  { id: '8', label: 'Transport & Logistics', icon: '🚗' },
  { id: '9', label: 'Hospitality & Hotels', icon: '🏨' },
  { id: '10', label: 'Arts & Entertainment', icon: '🎭' },
  { id: '11', label: 'Sports & Fitness', icon: '⚽' },
  { id: '12', label: 'Manufacturing', icon: '🏭' },
  { id: '13', label: 'Agriculture', icon: '🌾' },
  { id: '14', label: 'Construction', icon: '🔨' },
  { id: '15', label: 'Retail & Shopping', icon: '🛍️' },
  { id: '16', label: 'Legal Services', icon: '⚖️' },
  { id: '17', label: 'Consulting', icon: '💼' },
  { id: '18', label: 'Marketing & Advertising', icon: '📢' },
  { id: '19', label: 'Logistics & Warehouse', icon: '📦' },
  { id: '20', label: 'Energy & Utilities', icon: '⚡' },
  { id: '21', label: 'Telecommunications', icon: '📡' },
  { id: '22', label: 'Media & Publishing', icon: '📰' },
  { id: '23', label: 'Human Resources', icon: '👥' },
  { id: '24', label: 'Environmental Services', icon: '♻️' },
  { id: '25', label: 'Arts & Crafts', icon: '🎨' },
  { id: '26', label: 'Pet Services', icon: '🐾' },
  { id: '27', label: 'Automotive', icon: '🚙' },
  { id: '28', label: 'Photography', icon: '📷' },
  { id: '29', label: 'Tourism & Travel', icon: '✈️' },
  { id: '30', label: 'Event Management', icon: '🎉' },
  { id: '31', label: 'Security Services', icon: '🛡️' },
  { id: '32', label: 'Plumbing & HVAC', icon: '🔧' },
  { id: '33', label: 'Electrical Services', icon: '⚙️' },
  { id: '34', label: 'Cleaning Services', icon: '🧹' },
  { id: '35', label: 'Landscaping', icon: '🌿' },
  { id: '36', label: 'Printing & Design', icon: '🖨️' },
  { id: '37', label: 'Software Development', icon: '💾' },
  { id: '38', label: 'Graphic Design', icon: '🎯' },
  { id: '39', label: 'Web Development', icon: '🌐' },
  { id: '40', label: 'Content Creation', icon: '📝' },
];
const getCategorySubtitle = (categoryId) => {
  const id = String(categoryId || '').trim();
  if (['1', '17', '37', '39', '21', '22', '18', '36', '38', '40'].includes(id)) return 'Digital';
  if (['2', '9', '29', '30', '26'].includes(id)) return 'Accueil';
  if (['3', '11', '35'].includes(id)) return 'Lifestyle';
  if (['4', '24'].includes(id)) return 'Sante';
  if (['6', '16', '12', '15', '23'].includes(id)) return 'Expertise';
  if (['7', '14', '32', '33', '34'].includes(id)) return 'Infrastructure';
  if (['8', '19', '20', '27'].includes(id)) return 'Mobilite';
  if (['5', '13', '17', '23'].includes(id)) return 'Services';
  if (['18', '22', '36', '38', '40'].includes(id)) return 'Communication';
  return 'Business';
};
// ─── Sous-composants ──────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}
function FieldCard({ children }) {
  return <View style={styles.fieldCard}>{children}</View>;
}
function Field({ icon, label, placeholder, value, onChangeText, multiline, keyboardType, maxLength }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldIcon}>{icon}</Text>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        returnKeyType={multiline ? 'default' : 'next'}
      />
      {maxLength && value.length > 0 && (
        <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
      )}
    </View>
  );
}
// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateCompanyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const imagePicker = useLazyImagePicker();
  const { defaultCategoryId = '1', defaultCategoryName = '' } = route.params || {};
  // Formulaire
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => defaultCategoryId ? [defaultCategoryId] : ['1']);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const selectedCategory = CATEGORIES.find(c => c.id === selectedCategoryIds[0]) || CATEGORIES[0];
  const selectedCategoryLabel = t(`category_${selectedCategory.id}`, selectedCategory.label);
  const orderedCategories = [...CATEGORIES].sort((a, b) => {
    const aSelected = selectedCategoryIds.includes(a.id);
    const bSelected = selectedCategoryIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (bSelected && !aSelected) return 1;
    return a.label.localeCompare(b.label);
  });
  const isValid = name.trim().length >= 2 && selectedCategoryIds.length > 0;
  const { user, isGuest } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  useEffect(() => {
    if (isGuest) setShowAuthPrompt(true);
  }, [isGuest]);
  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    ));
  };
  // Fonction pour choisir une image
  const pickLogo = async () => {
    const { status } = await imagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
        Alert.alert(t('permissionRequired', 'Permission requise'), t('permissionGalleryLogo', "Autorisez l'accès à la galerie pour ajouter un logo"));
      return;
    }
    const result = await imagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0].uri);
    }
  };
  // Fonction pour choisir l'image de background
  const pickBackgroundImage = async () => {
    const { status } = await imagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t('permissionRequired', 'Permission requise'), t('permissionGallery', "Autorisez l\'accès à la galerie"));
      return;
    }
    const result = await imagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBackgroundImage(result.assets[0].uri);
    }
  };
  // Fonction pour supprimer le logo
  const removeLogo = () => {
    setLogo(null);
  };
  // Fonction pour supprimer l'image de background
  const removeBackgroundImage = () => {
    setBackgroundImage(null);
  };
  // Obtenir la localisation actuelle
  const getMyLocation = async () => {
    if (locating) return;
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired', 'Permission requise'), t('permissionLocation', "Autorisez l\'accès à la localisation"));
        return;
      }
      // Try last known location first for fast UX, then fallback to a fresh GPS fix.
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 120000,
        requiredAccuracy: 250,
      });
      const loc = lastKnown || await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(loc.coords.latitude.toString());
      setLongitude(loc.coords.longitude.toString());
      setLocationAccuracy(
        Number.isFinite(loc.coords.accuracy) ? Math.round(loc.coords.accuracy) : null
      );
      setLocationUpdatedAt(new Date());
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (Array.isArray(geocoded) && geocoded[0]) {
          const item = geocoded[0];
          const addressParts = [
            item.name,
            item.street,
            item.city,
            item.region,
            item.country,
          ]
            .map((part) => String(part || '').trim())
            .filter(Boolean);
          const detectedAddress = [...new Set(addressParts)].join(', ');
          if (detectedAddress) {
            setLocation(detectedAddress);
          }
        }
      } catch (geoError) {
        // Keep coords even if reverse geocoding is unavailable.
      }
      Alert.alert(t('success', 'Succès'), t('locationUpdated', 'Position GPS mise à jour.'));
    } catch (error) {
      Alert.alert(t('error', 'Erreur'), t('locationError', "Impossible d\'obtenir la localisation"));
    } finally {
      setLocating(false);
    }
  };
  const handleCreate = async () => {
    if (!isValid || loading) return;
    if (!user?._id) {
      Alert.alert(t('error', 'Erreur'), t('userNotLogged', 'Utilisateur non connecté'));
      return;
    }
    setLoading(true);
    try {
      let uploadedLogoUrl = '';
      let uploadedBackgroundUrl = '';
      // Upload du logo si sélectionné
      if (logo && isLocalAssetUri(logo)) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', {
          uri: logo,
          name: 'logo.jpg',
          type: 'image/jpeg',
        });
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const uploadRes = await fetch(`${API_URL}/companies/upload-temp`, {
          method: 'POST',
          body: formData,
          headers,
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Upload failed: ${errorText}`);
        }
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          uploadedLogoUrl = uploadData.url;
        }
        setUploadingImage(false);
      }
      // Upload de l'image de background si sélectionnée
      if (backgroundImage && isLocalAssetUri(backgroundImage)) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', {
          uri: backgroundImage,
          name: 'background.jpg',
          type: 'image/jpeg',
        });
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const uploadRes = await fetch(`${API_URL}/companies/upload-temp`, {
          method: 'POST',
          body: formData,
          headers,
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Background upload failed: ${errorText}`);
        }
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          uploadedBackgroundUrl = uploadData.url;
        }
        setUploadingImage(false);
      }
      // Création de l'entreprise avec le logo et background
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('website', website.trim());
      const locationValue = location.trim();
      formData.append('location', locationValue);
      const primaryCategoryId = selectedCategoryIds[0] || defaultCategoryId || '1';
      formData.append('categoryId', primaryCategoryId);
      formData.append('categoryIds', JSON.stringify(selectedCategoryIds));
      // Compatibility fallback for backends expecting owner id in payload.
      formData.append('ownerId', String(user._id));
      formData.append('ownerid', String(user._id));
      if (user.firebaseUid) {
        formData.append('firebaseUid', String(user.firebaseUid));
      }
      if (uploadedLogoUrl) {
        formData.append('logo', uploadedLogoUrl);
      }
      if (uploadedBackgroundUrl) {
        formData.append('backgroundImage', uploadedBackgroundUrl);
      }
      // Localisation
      if (latitude && longitude) {
        formData.append('latitude', parseFloat(latitude).toString());
        formData.append('longitude', parseFloat(longitude).toString());
        formData.append('locationAddress', locationValue);
      }
      const created = await createCompany(formData);
      Alert.alert(
        t('companyCreatedTitle', '🎉 Entreprise créée !'),
        `"${created.name}" ${t('companyUpdated', 'a été ajoutée avec succès.')}`,
        [
          {
            text: t('ok', 'OK'),
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'CategoryCompanies',
                    params: {
                      categoryId: primaryCategoryId,
                      categoryName: selectedCategoryLabel,
                      categoryIcon: selectedCategory.icon,
                      categoryColor: '#8B2FC9',
                    },
                  },
                ],
              });
            },
          },
        ]
      );
    } catch (e) {
      console.log('❌ CREATE ERROR:', e);
      Alert.alert(t('error', 'Erreur'), e.response?.data?.error || t('createCompanyError', "Impossible de créer l'entreprise"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.purple} />
        <SafeAreaView style={styles.header}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navCancel}>{t('cancelLabel', 'Annuler')}</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>{t('newCompany', 'Nouvelle entreprise')}</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isValid || loading || uploadingImage}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {loading || uploadingImage ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={[styles.navCreate, (!isValid) && styles.navCreateDisabled]}>{t('createLabel', 'Créer')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION LOGO */}
          <SectionLabel text="LOGO DE L'ENTREPRISE" />
          <View style={styles.logoSection}>
            <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} disabled={uploadingImage}>
              {logo ? (
                <View style={styles.logoPreviewContainer}>
                  <Image source={{ uri: logo }} style={styles.logoPreview} />
                  <TouchableOpacity style={styles.removeLogoBtn} onPress={removeLogo}>
                    <Text style={styles.removeLogoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderIcon}>📷</Text>
                  <Text style={styles.logoPlaceholderText}>{t('addLogoLabel', 'Ajouter un logo')}</Text>
                  <Text style={styles.logoPlaceholderSub}>{t('squareFormatHint', 'Format carré recommandé')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={C.purple} />
                <Text style={styles.uploadingText}>{t('uploadingLabel', 'Upload en cours...')}</Text>
              </View>
            )}
          </View>
          {/* Infos principales */}
          <SectionLabel text="INFORMATIONS PRINCIPALES" />
          <FieldCard>
            <Field
              icon="🏢"
              label="Nom de l'entreprise *"
              placeholder={t('companyNamePlaceholderEx', 'Ex : Ahmed Company')}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="📝"
              label="Description"
              placeholder={t('describeActivity', 'Décrivez votre activité en quelques mots…')}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={280}
            />
          </FieldCard>
          {/* Catégorie */}
          <SectionLabel text="CATÉGORIES" />
          <Text style={styles.categoryHelperText}>{t('categoryHint', 'Vous pouvez choisir plusieurs secteurs pour la meme entreprise.')}</Text>
          <View style={styles.categoryGrid}>
            {orderedCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, selectedCategoryIds.includes(cat.id) && styles.catChipSelected]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.catChipIcon}>{cat.icon}</Text>
                <Text style={[styles.catChipLabel, selectedCategoryIds.includes(cat.id) && styles.catChipLabelSelected]}>
                  {t(`category_${cat.id}`, cat.label)}
                </Text>
                <Text style={[styles.catChipSubLabel, selectedCategoryIds.includes(cat.id) && styles.catChipSubLabelSelected]}>
                  {getCategorySubtitle(cat.label)}
                </Text>
                {selectedCategoryIds.includes(cat.id) && <Text style={styles.catChipCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          {/* Contact */}
          <SectionLabel text="CONTACT" />
          <FieldCard>
            <Field
              icon="📞"
              label="Téléphone"
              placeholder={t('phonePlaceholderEx', '+221 77 000 00 00')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="✉️"
              label="Email"
              placeholder={t('emailPlaceholderEx', 'contact@entreprise.com')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="🌐"
              label="Site web"
              placeholder={t('websitePlaceholderEx', 'https://www.entreprise.com')}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
            />
          </FieldCard>
          {/* Localisation */}
          <SectionLabel text="LOCALISATION" />
          <FieldCard>
            <Field
              icon="📍"
              label="Adresse / Ville"
              placeholder={t('locationPlaceholderEx', 'Ex : Dakar, Sénégal')}
              value={location}
              onChangeText={setLocation}
            />
            <View style={styles.fieldDivider} />
            <TouchableOpacity
              style={[styles.geoBtn, locating && styles.geoBtnDisabled]}
              onPress={getMyLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={C.purple} />
              ) : (
                <Text style={styles.geoBtnIcon}>📍</Text>
              )}
              <Text style={styles.geoBtnText}>
                {locating ? 'Détection en cours...' : 'Détecter ma localisation'}
              </Text>
            </TouchableOpacity>
            {(latitude || longitude) && (
              <>
                <View style={styles.fieldDivider} />
                <View style={styles.coordsDisplay}>
                  <Text style={styles.coordLabel}>Latitude: <Text style={styles.coordValue}>{parseFloat(latitude).toFixed(4)}</Text></Text>
                  <Text style={styles.coordLabel}>Longitude: <Text style={styles.coordValue}>{parseFloat(longitude).toFixed(4)}</Text></Text>
                  {locationAccuracy !== null && (
                    <Text style={styles.coordLabel}>Precision GPS: <Text style={styles.coordValue}>~{locationAccuracy} m</Text></Text>
                  )}
                  {locationUpdatedAt && (
                    <Text style={styles.coordMeta}>Mis a jour: {locationUpdatedAt.toLocaleTimeString()}</Text>
                  )}
                </View>
              </>
            )}
          </FieldCard>
          {/* Image de Background */}
          <SectionLabel text="IMAGE DE FOND" />
          <Text style={styles.categoryHelperText}>Sélectionnez une image de fond pour la fiche entreprise (format paysage)</Text>
          <View style={styles.backgroundSection}>
            <TouchableOpacity
              style={styles.backgroundPicker}
              onPress={pickBackgroundImage}
              disabled={uploadingImage}
            >
              {backgroundImage ? (
                <View style={styles.backgroundPreviewContainer}>
                  <Image source={{ uri: backgroundImage }} style={styles.backgroundPreview} />
                  <TouchableOpacity style={styles.removeBgBtn} onPress={removeBackgroundImage}>
                    <Text style={styles.removeBgText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.backgroundPlaceholder}>
                  <Text style={styles.bgPlaceholderIcon}>🖼️</Text>
                  <Text style={styles.bgPlaceholderText}>Ajouter une image</Text>
                  <Text style={styles.bgPlaceholderSub}>Format paysage recommandé</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {!isValid && name.length > 0 && (
            <Text style={styles.validationHint}>{t('nameTooShort', 'Le nom doit contenir au moins 2 caractères.')}</Text>
          )}
          <TouchableOpacity
            style={[styles.createBtn, (!isValid || loading || uploadingImage) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!isValid || loading || uploadingImage}
            activeOpacity={0.85}
          >
            {loading || uploadingImage ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={styles.createBtnIcon}>🏪</Text>
                <Text style={styles.createBtnText}>{t('createCompanyBtn', "Créer l'entreprise")}</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
        featureName="createCompany"
      />
    </>
  );
}
// Styles
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { backgroundColor: C.purple },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  navCancel: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  navTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  navCreate: { fontSize: 16, fontWeight: '700', color: C.white },
  navCreateDisabled: { opacity: 0.4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSecondary,
    letterSpacing: 0.7, marginTop: 24, marginBottom: 10, marginHorizontal: 20,
  },
  logoSection: { alignItems: 'center', marginHorizontal: 16, marginBottom: 16, position: 'relative' },
  logoPicker: { alignItems: 'center', justifyContent: 'center', width: 120, height: 120, borderRadius: 60, overflow: 'hidden' },
  logoPreviewContainer: { width: 120, height: 120, borderRadius: 60, position: 'relative' },
  logoPreview: { width: 120, height: 120, borderRadius: 60, resizeMode: 'cover' },
  removeLogoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeLogoText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  logoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.purple, borderStyle: 'dashed' },
  logoPlaceholderIcon: { fontSize: 32, marginBottom: 6 },
  logoPlaceholderText: { fontSize: 12, color: C.purple, fontWeight: '600' },
  logoPlaceholderSub: { textAlign: 'center', fontSize: 9, color: C.textSecondary, marginTop: 2 },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  uploadingText: { fontSize: 11, color: C.purple, marginTop: 8 },
  fieldCard: { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', shadowColor: '#8B2FC9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  field: { padding: 16 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldIcon: { fontSize: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.3 },
  fieldInput: { fontSize: 15, color: C.textPrimary, padding: 0 },
  fieldInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginHorizontal: 16 },
  charCount: { fontSize: 11, color: C.textTertiary, textAlign: 'right', marginTop: 4 },
  categoryHelperText: { fontSize: 12, color: C.textSecondary, marginHorizontal: 20, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, rowGap: 10 },
  catChip: {
    width: '48.5%',
    minHeight: 118,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.separator,
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#8B2FC9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  catChipSelected: { borderColor: C.purple, backgroundColor: C.purpleLight, shadowOpacity: 0.12 },
  catChipIcon: { fontSize: 20, marginBottom: 8 },
  catChipLabel: { fontSize: 12, color: C.textPrimary, fontWeight: '700', textAlign: 'center' },
  catChipLabelSelected: { color: C.purpleDark },
  catChipSubLabel: { fontSize: 11, color: C.textSecondary, marginTop: 'auto', textAlign: 'center' },
  catChipSubLabelSelected: { color: C.purple },
  catChipCheck: { position: 'absolute', top: 8, right: 8, fontSize: 14, color: C.purple, fontWeight: '700' },
  validationHint: { fontSize: 12, color: C.danger, textAlign: 'center', marginTop: 10 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.purple, marginHorizontal: 16, marginTop: 24, paddingVertical: 16, borderRadius: 16, shadowColor: C.purple, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  createBtnDisabled: { opacity: 0.45 },
  createBtnIcon: { fontSize: 20 },
  createBtnText: { fontSize: 17, fontWeight: '800', color: C.white },
  geoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: C.purpleLight,
  },
  geoBtnDisabled: {
    opacity: 0.7,
  },
  geoBtnIcon: { fontSize: 16 },
  geoBtnText: { fontSize: 13, fontWeight: '600', color: C.purple },
  coordsDisplay: {
    padding: 12,
    backgroundColor: C.purpleLight,
    borderRadius: 10,
    marginHorizontal: 16,
  },
  coordLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
  coordValue: { fontWeight: '700', color: C.purple },
  coordMeta: { fontSize: 11, color: C.textTertiary, marginTop: 2 },
  backgroundSection: { alignItems: 'center', marginHorizontal: 16, marginBottom: 16 },
  backgroundPicker: { width: '100%', minHeight: 160, borderRadius: 16, overflow: 'hidden' },
  backgroundPreviewContainer: { width: '100%', minHeight: 160, borderRadius: 16, position: 'relative' },
  backgroundPreview: { width: '100%', minHeight: 160, borderRadius: 16, resizeMode: 'cover' },
  removeBgBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeBgText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backgroundPlaceholder: { width: '100%', minHeight: 160, borderRadius: 16, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.purple, borderStyle: 'dashed' },
  bgPlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  bgPlaceholderText: { fontSize: 14, color: C.purple, fontWeight: '600' },
  bgPlaceholderSub: { fontSize: 11, color: C.textSecondary, marginTop: 4 },
});