import { useBusinessTypes } from '../hooks/useBusinessTypes';
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
  Animated,
  Alert,
  Modal,
  ScrollView,
  Keyboard,
  AppState,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { API_URL } from "../env";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import {
  getAllCompanies,
  getCompaniesByCategory,
  deleteCompany,
  updateCompany,
} from "../services/api";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";
import * as ImagePicker from "expo-image-picker";
import api from "../services/api";
import { auth } from "../services/firebase";
import { isLocalAssetUri, resolveAvatarUri } from "../utils/profileUtils";

const { width, height } = Dimensions.get("window");

const C = {
  purple: "#8B2FC9",
  purpleLight: "#F3E8FF",
  white: "#FFFFFF",
  bg: "#F8F0FF",
  textPrimary: "#2D1F40",
  textSecondary: "#7C6A93",
  separator: "#E2D5F0",
  cardBg: "#FFFFFF",
  red: "#DC2626",
  grayBorder: "#DDCFEE",
};

const NUM_COLUMNS = 3;
const ICON_SIZE = (width - 64) / NUM_COLUMNS;

const CATEGORY_OPTIONS = [
  { id: "1", label: "Technology & IT", icon: "💻" },
  { id: "2", label: "Food & Restaurant", icon: "🍽️" },
  { id: "3", label: "Beauty & Fashion", icon: "💄" },
  { id: "4", label: "Health & Medical", icon: "🏥" },
  { id: "5", label: "Education", icon: "📚" },
  { id: "6", label: "Finance & Banking", icon: "💰" },
  { id: "7", label: "Real Estate", icon: "🏠" },
  { id: "8", label: "Transport & Logistics", icon: "🚗" },
  { id: "9", label: "Hospitality & Hotels", icon: "🏨" },
  { id: "10", label: "Arts & Entertainment", icon: "🎭" },
  { id: "11", label: "Sports & Fitness", icon: "⚽" },
  { id: "12", label: "Manufacturing", icon: "🏭" },
  { id: "13", label: "Agriculture", icon: "🌾" },
  { id: "14", label: "Construction", icon: "🔨" },
  { id: "15", label: "Retail & Shopping", icon: "🛍️" },
  { id: "16", label: "Legal Services", icon: "⚖️" },
  { id: "17", label: "Consulting", icon: "💼" },
  { id: "18", label: "Marketing & Advertising", icon: "📢" },
  { id: "19", label: "Logistics & Warehouse", icon: "📦" },
  { id: "20", label: "Energy & Utilities", icon: "⚡" },
  { id: "21", label: "Telecommunications", icon: "📡" },
  { id: "22", label: "Media & Publishing", icon: "📰" },
  { id: "23", label: "Human Resources", icon: "👥" },
  { id: "24", label: "Environmental Services", icon: "♻️" },
  { id: "25", label: "Arts & Crafts", icon: "🎨" },
  { id: "26", label: "Pet Services", icon: "🐾" },
  { id: "27", label: "Automotive", icon: "🚙" },
  { id: "28", label: "Photography", icon: "📷" },
  { id: "29", label: "Tourism & Travel", icon: "✈️" },
  { id: "30", label: "Event Management", icon: "🎉" },
  { id: "31", label: "Security Services", icon: "🛡️" },
  { id: "32", label: "Plumbing & HVAC", icon: "🔧" },
  { id: "33", label: "Electrical Services", icon: "⚙️" },
  { id: "34", label: "Cleaning Services", icon: "🧹" },
  { id: "35", label: "Landscaping", icon: "🌿" },
  { id: "36", label: "Printing & Design", icon: "🖨️" },
  { id: "37", label: "Software Development", icon: "💾" },
  { id: "38", label: "Graphic Design", icon: "🎯" },
  { id: "39", label: "Web Development", icon: "🌐" },
  { id: "40", label: "Content Creation", icon: "📝" },
];

const normalizeCategorySelection = (company) => {
  const fromArray = Array.isArray(company?.categoryIds)
    ? company.categoryIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const primary = String(company?.categoryId || "").trim();
  return [...new Set([...(primary ? [primary] : []), ...fromArray])];
};

const imgUrl = (src) => {
  if (!src || src === "" || src === "undefined") return null;
  return resolveAvatarUri(src, API_URL) || null;
};

const getCompanyPrimaryId = (company) =>
  String(company?._id || company?.id || company?.companyId || "").trim();

// Fonction d'upload d'image
const uploadImage = async (companyId, localUri) => {
  const filename = localUri.split("/").pop() || "photo.jpg";

  const form = new FormData();
  form.append("image", {
    uri: localUri,
    name: filename,
    type: "image/jpeg",
  });

  try {
    console.log(
      "UPLOAD DEBUG [CategoryCompanies]: auth.currentUser?",
      !!auth.currentUser,
    );
    let token = null;
    try {
      if (auth.currentUser) token = await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("UPLOAD DEBUG [CategoryCompanies]: token error", e.message);
    }
    console.log("UPLOAD DEBUG [CategoryCompanies]: token?", !!token);

    const headers = {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await api.post(`/companies/${companyId}/upload-image`, form, {
      headers,
    });
    return res.data.url;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// ─── Composant carte entreprise ───────────────────────────────────────────────
const CompanyCard2 = React.memo(function CompanyCard2({
  company,
  color,
  onPress,
  onLongPress,
}) {
  const initials = company.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hasLogo =
    company.logo && company.logo !== "" && company.logo !== "undefined";

  return (
    <Animated.View
      style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[styles.cardLeft, styles.cardWithBorder]}>
          {hasLogo ? (
            <Image source={{ uri: imgUrl(company.logo) }} style={styles.logo} />
          ) : (
            <View
              style={[
                styles.logoPlaceholder,
                { backgroundColor: color + "20" },
              ]}
            >
              <Text style={[styles.logoInitials, { color }]}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.companyName} numberOfLines={2}>
          {company.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Modal d'édition ──────────────────────────────────────────────────────────
const EditCompanyModal = ({
  visible,
  company,
  onClose,
  onSave,
  onDelete,
  color,
}) => {
  const { t } = useLanguage();
    const { t, activeLanguage } = useLanguage();
    const businessTypes = useBusinessTypes(CATEGORY_OPTIONS, activeLanguage);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setDescription(company.description || "");
      setPhone(company.phone || "");
      setEmail(company.email || "");
      setLogo(company.logo || "");
      setSelectedCategoryIds(normalizeCategorySelection(company));
    }
  }, [company]);

  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id)
        ? prev.filter((currentId) => currentId !== id)
        : [...prev, id]
    ));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t('permissionRequired', 'Permission requise'), t('permissionGallery', "Autorisez l'accès à la galerie"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('error', 'Erreur'), t('companyNameRequired', 'Le nom est obligatoire'));
      return;
    }

    if (!selectedCategoryIds.length) {
      Alert.alert(t('error', 'Erreur'), t('selectCategory', 'Sélectionnez au moins un secteur'));
      return;
    }

    setLoading(true);
    try {
      let finalLogo = logo;

      if (logo && isLocalAssetUri(logo)) {
        setUploadingImage(true);
        finalLogo = await uploadImage(company._id, logo);
        setUploadingImage(false);
      }

      const normalizedCategories = [...new Set(
        selectedCategoryIds.map((id) => String(id || "").trim()).filter(Boolean)
      )];

      await onSave({
        name: name.trim(),
        description: description.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo: finalLogo,
        categoryId: normalizedCategories[0],
        categoryIds: normalizedCategories,
      });

      Alert.alert(t('success', 'Succès'), t('companyUpdated', 'Entreprise mise à jour !'));
      onClose();
    } catch (error) {
      Alert.alert(t('error', 'Erreur'), t('saveFailed', 'Impossible de sauvegarder'));
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete', 'Supprimer'),
      `${t('deleteCompanyPrompt', 'Voulez-vous vraiment supprimer cette entreprise ?')} "${company?.name}"`,
      [
        { text: t('cancel', 'Annuler'), style: 'cancel' },
        {
          text: t('delete', 'Supprimer'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await onDelete();
              Alert.alert(t('success', 'Succès'), t('companyDeleted', 'Entreprise supprimée !'));
              onClose();
            } catch (error) {
              Alert.alert(t('error', 'Erreur'), t('deleteFailed', 'Impossible de supprimer'));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('editCompany', "Modifier l'entreprise")}</Text>

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {logo ? (
                <Image source={{ uri: imgUrl(logo) }} style={styles.modalLogo} />
              ) : (
                <View
                  style={[styles.modalLogoPlaceholder, { borderColor: color }]}
                >
                  <Text style={styles.modalLogoPlaceholderText}>📷</Text>
                  <Text style={styles.modalLogoPlaceholderLabel}>
                    {t('addLogo', 'Ajouter un logo')}
                  </Text>
                </View>
              )}
              {uploadingImage && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={styles.modalScrollContent}
            >
              <TextInput
                style={styles.modalInput}
                placeholder={t('companyNamePlaceholder', "Nom de l'entreprise")}
                placeholderTextColor={C.textSecondary}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder={t('description', 'Description')}
                placeholderTextColor={C.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={styles.modalInput}
                placeholder={t('phonePlaceholder', 'Téléphone')}
                placeholderTextColor={C.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                placeholderTextColor={C.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.categorySectionTitle}>{t('categoryLabel', 'Secteurs')}</Text>
              <View style={styles.categoryGrid}>
                {businessTypes.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                      onPress={() => toggleCategory(category.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.categoryChipIcon}>{category.icon}</Text>
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]} numberOfLines={2}>
                        {category.label}
                      </Text>
                      {selected && <Text style={styles.categoryChipCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{t('cancel', 'Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: color },
                ]}
                onPress={handleSave}
                disabled={loading || uploadingImage}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('save', 'Sauvegarder')}</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>
                🗑 {t('deleteCompanyLabel', "Supprimer l'entreprise")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = React.memo(function EmptyState({
  icon,
  categoryName,
  onCreatePress,
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{t('noCompaniesInCategory', 'Aucune entreprise ici.')}</Text>
      <Text style={styles.emptySub}>
        {categoryName}
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: C.purple }]}
        onPress={onCreatePress}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyBtnText}>{t('addFirst', 'Créer la première')}</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryCompaniesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { user } = useUser();
  const { t } = useLanguage();

  const {
    categoryId,
    showAll = false,
    categoryName = "Entreprises",
    categoryIcon = "🏢",
    categoryColor = C.purple,
  } = route.params || {};

  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const loadInFlightRef = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadCompanies();
    }, [categoryId, showAll]),
  );

  const loadCompanies = async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    try {
      const data = showAll || !categoryId
        ? await getAllCompanies()
        : await getCompaniesByCategory(categoryId);
      setCompanies(data);
      setFiltered(data);
    } catch (e) {
      console.log("LOAD ERROR:", e.message);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(companies);
    } else {
      const q = text.toLowerCase();
      setFiltered(
        companies.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q),
        ),
      );
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCompanies();
  };

  useEffect(() => {
    if (!isFocused) return undefined;

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadCompanies();
      }
    });

    const intervalId = setInterval(() => {
      loadCompanies();
    }, 60 * 1000);

    return () => {
      appStateSub.remove();
      clearInterval(intervalId);
    };
  }, [isFocused, categoryId, showAll]);

  const goToCreate = () =>
    navigation.navigate("CreateCompany", {
      ...(showAll ? {} : { defaultCategoryId: categoryId }),
      defaultCategoryName: categoryName,
    });

  const handleLongPress = (company) => {
    setSelectedCompany(company);
    setEditModalVisible(true);
  };

  const handleSaveCompany = async (updatedData) => {
    try {
      await updateCompany(selectedCompany._id, updatedData);
      await loadCompanies();
    } catch (error) {
      Alert.alert(t('error', 'Erreur'), t('saveFailed', 'Impossible de sauvegarder'));
      throw error;
    }
  };

  const handleDeleteCompany = async () => {
    try {
      await deleteCompany(selectedCompany._id);
      setCompanies((prev) => prev.filter((c) => c._id !== selectedCompany._id));
      setFiltered((prev) => prev.filter((c) => c._id !== selectedCompany._id));
    } catch (error) {
      throw error;
    }
  };

  const handleScroll = () => {
    if (showSearch) {
      setShowSearch(false);
      Keyboard.dismiss();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator size="large" color={categoryColor} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("Home");
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{categoryName}</Text>

          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.headerBtn}
          >
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {showSearch && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIconSmall}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchCompanies', 'Rechercher...')}
              placeholderTextColor={C.textSecondary}
              value={search}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoFocus={true}
            />
            {search !== "" && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  handleSearch("");
                }}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {!showSearch && companies.length > 0 && (
        <Text style={styles.countLabel}>
          {filtered.length} {t('results', 'résultats')}
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => getCompanyPrimaryId(item) || `${item?.name || 'company'}-${index}`}
        numColumns={NUM_COLUMNS}
        renderItem={({ item }) => (
          <CompanyCard2
            company={item}
            color={categoryColor}
            onPress={() => {
              const companyId = getCompanyPrimaryId(item);
              if (!companyId) {
                Alert.alert(t('error', 'Erreur'), t('invalidCompanyBody', 'Entreprise invalide, impossible d\'ouvrir le detail.'));
                return;
              }

              navigation.navigate("MainTabs", {
                screen: "CompanyHome",
                params: {
                  companyId,
                  currentUserId: user?._id,
                },
              });
            }}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={[
          styles.grid,
          filtered.length === 0 && styles.gridEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={categoryColor}
            colors={[categoryColor]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={categoryIcon}
            categoryName={categoryName}
            onCreatePress={goToCreate}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={goToCreate}
        activeOpacity={0.8}
      >
        <View style={[styles.fabInner, { backgroundColor: categoryColor }]}>
          <Text style={styles.fabText}>+</Text>
        </View>
      </TouchableOpacity>

      <EditCompanyModal
        visible={editModalVisible}
        company={selectedCompany}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedCompany(null);
        }}
        onSave={handleSaveCompany}
        onDelete={handleDeleteCompany}
        color={categoryColor}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.purple,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 32,
    color: C.white,
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: C.white,
    letterSpacing: 0.5,
  },
  searchIcon: {
    fontSize: 20,
    color: C.white,
  },
  searchWrap: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.separator,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.separator,
  },
  searchIconSmall: {
    fontSize: 16,
    color: C.textSecondary,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.textPrimary,
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: C.textSecondary,
    padding: 4,
  },
  countLabel: {
    fontSize: 13,
    color: C.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  grid: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  gridEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  cardWrapper: {
    width: ICON_SIZE,
    alignItems: "center",
    marginVertical: 12,
  },
  card: {
    alignItems: "center",
    width: ICON_SIZE,
  },
  cardLeft: {
    marginBottom: 8,
  },
  cardWithBorder: {
    borderWidth: 1,
    borderColor: C.grayBorder,
    borderRadius: (ICON_SIZE - 16) / 4,
    backgroundColor: C.cardBg,
  },
  logo: {
    width: ICON_SIZE - 16,
    height: ICON_SIZE - 16,
    borderRadius: (ICON_SIZE - 16) / 4,
    backgroundColor: "#EFE5FA",
  },
  logoPlaceholder: {
    width: ICON_SIZE - 16,
    height: ICON_SIZE - 16,
    borderRadius: (ICON_SIZE - 16) / 4,
    backgroundColor: "#EFE5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: {
    fontSize: (ICON_SIZE - 16) * 0.35,
    fontWeight: "600",
  },
  companyName: {
    fontSize: 12,
    fontWeight: "500",
    color: C.textPrimary,
    textAlign: "center",
    marginTop: -3,
    maxWidth: ICON_SIZE - 8,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: height * 0.25,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fabInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B2FC9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "400",
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(49, 22, 77, 0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.separator,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  modalLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#EFE5FA",
  },
  modalLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6EEFF",
  },
  modalLogoPlaceholderText: {
    fontSize: 24,
    marginBottom: 4,
  },
  modalLogoPlaceholderLabel: {
    fontSize: 10,
    color: C.textSecondary,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalInput: {
    backgroundColor: "#FBF8FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.separator,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categorySectionTitle: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    width: "48.5%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.separator,
    backgroundColor: "#FBF8FF",
    paddingHorizontal: 9,
    paddingVertical: 10,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  categoryChipSelected: {
    borderColor: C.purple,
    backgroundColor: C.purpleLight,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: "center",
  },
  categoryChipTextSelected: {
    color: C.purple,
  },
  categoryChipCheck: {
    position: "absolute",
    top: 6,
    right: 8,
    color: C.purple,
    fontWeight: "800",
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F4ECFF",
  },
  cancelButtonText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: C.purple,
  },
  saveButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    marginTop: 8,
  },
  deleteButtonText: {
    color: C.red,
    fontSize: 16,
    fontWeight: "600",
  },
});
