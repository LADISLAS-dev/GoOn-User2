import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createCompany, getBusinessTypes } from '../services/api';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useLazyImagePicker } from '../hooks/useLazyImagePicker';
import * as Location from 'expo-location';
import { API_URL } from '../env';
import { auth } from '../services/firebase';
import { isLocalAssetUri } from '../utils/profileUtils';
import { getCategoryLabel } from '../utils/categoryLabels';
import { getBusinessModuleLabel, getBusinessModulePreviewKeys } from '../utils/businessTypes';

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
  { id: '1', icon: '💻' },
  { id: '2', icon: '🍽️' },
  { id: '3', icon: '💄' },
  { id: '4', icon: '🏥' },
  { id: '5', icon: '📚' },
  { id: '6', icon: '💰' },
  { id: '7', icon: '🏠' },
  { id: '8', icon: '🚗' },
  { id: '9', icon: '🏨' },
  { id: '10', icon: '🎭' },
  { id: '11', icon: '⚽' },
  { id: '12', icon: '🏭' },
  { id: '13', icon: '🌾' },
  { id: '14', icon: '🔨' },
  { id: '15', icon: '🛍️' },
  { id: '16', icon: '⚖️' },
  { id: '17', icon: '💼' },
  { id: '18', icon: '📢' },
  { id: '19', icon: '📦' },
  { id: '20', icon: '⚡' },
  { id: '21', icon: '📡' },
  { id: '22', icon: '📰' },
  { id: '23', icon: '👥' },
  { id: '24', icon: '♻️' },
  { id: '25', icon: '🎨' },
  { id: '26', icon: '🐾' },
  { id: '27', icon: '🚙' },
  { id: '28', icon: '📷' },
  { id: '29', icon: '✈️' },
  { id: '30', icon: '🎉' },
  { id: '31', icon: '🛡️' },
  { id: '32', icon: '🔧' },
  { id: '33', icon: '⚙️' },
  { id: '34', icon: '🧹' },
  { id: '35', icon: '🌿' },
  { id: '36', icon: '🖨️' },
  { id: '37', icon: '💾' },
  { id: '38', icon: '🎯' },
  { id: '39', icon: '🌐' },
  { id: '40', icon: '📝' },
];

const getCategorySubtitle = (id, t) => {
  const categoryId = String(id);
  if (['1', '21', '37', '39'].includes(categoryId)) return t('categorySubtitleDigital', 'Digital');
  if (['2', '9', '29'].includes(categoryId)) return t('categorySubtitleHospitality', 'Hospitality');
  if (['3', '11'].includes(categoryId)) return t('categorySubtitleLifestyle', 'Lifestyle');
  if (['4', '24'].includes(categoryId)) return t('categorySubtitleHealth', 'Health');
  if (['6', '16'].includes(categoryId)) return t('categorySubtitleExpertise', 'Expertise');
  if (['7', '14', '32', '33'].includes(categoryId)) return t('categorySubtitleInfrastructure', 'Infrastructure');
  if (['8', '19', '27'].includes(categoryId)) return t('categorySubtitleMobility', 'Mobility');
  if (['5', '17', '23'].includes(categoryId)) return t('categorySubtitleServices', 'Services');
  if (['18', '22', '38', '40'].includes(categoryId)) return t('categorySubtitleCommunication', 'Communication');
  return t('categorySubtitleBusiness', 'Business');
};

const CREATE_COMPANY_UI = {
  en: { sectionCompanyLogo: 'COMPANY LOGO', sectionMainInfo: 'MAIN INFORMATION', companyNameRequiredLabel: 'Company name *', sectionCategories: 'CATEGORIES', categoryHint: 'You can choose multiple sectors for the same company.', sectionContact: 'CONTACT', sectionLocation: 'LOCATION', addressCity: 'Address / City', detectingLocation: 'Detecting...', detectMyLocation: 'Detect my location', latitudeLabel: 'Latitude', longitudeLabel: 'Longitude', gpsPrecisionLabel: 'GPS precision', updatedAtLabel: 'Updated', sectionBackgroundImage: 'BACKGROUND IMAGE', backgroundImageHint: 'Select a background image for the company page (landscape format)', landscapeRecommended: 'Landscape format recommended', sectionOptions: 'OPTIONS', locationDetectedTitle: 'Location detected', locationUpdatedBody: 'GPS position updated.', locationFailed: 'Unable to get location.', userNotConnected: 'User not connected' },
  fr: { sectionCompanyLogo: 'LOGO DE L\'ENTREPRISE', sectionMainInfo: 'INFORMATIONS PRINCIPALES', companyNameRequiredLabel: 'Nom de l\'entreprise *', sectionCategories: 'CATEGORIES', categoryHint: 'Vous pouvez choisir plusieurs secteurs pour la meme entreprise.', sectionContact: 'CONTACT', sectionLocation: 'LOCALISATION', addressCity: 'Adresse / Ville', detectingLocation: 'Detection en cours...', detectMyLocation: 'Detecter ma localisation', latitudeLabel: 'Latitude', longitudeLabel: 'Longitude', gpsPrecisionLabel: 'Precision GPS', updatedAtLabel: 'Mis a jour', sectionBackgroundImage: 'IMAGE DE FOND', backgroundImageHint: 'Selectionnez une image de fond pour la fiche entreprise (format paysage)', landscapeRecommended: 'Format paysage recommande', sectionOptions: 'OPTIONS', locationDetectedTitle: 'Localisation detectee', locationUpdatedBody: 'Position GPS mise a jour.', locationFailed: 'Impossible d\'obtenir la localisation', userNotConnected: 'Utilisateur non connecte' },
  es: { sectionCompanyLogo: 'LOGOTIPO DE LA EMPRESA', sectionMainInfo: 'INFORMACION PRINCIPAL', companyNameRequiredLabel: 'Nombre de la empresa *', sectionCategories: 'CATEGORIAS', categoryHint: 'Puedes elegir varios sectores para la misma empresa.', sectionContact: 'CONTACTO', sectionLocation: 'UBICACION', addressCity: 'Direccion / Ciudad', detectingLocation: 'Detectando...', detectMyLocation: 'Detectar mi ubicacion', latitudeLabel: 'Latitud', longitudeLabel: 'Longitud', gpsPrecisionLabel: 'Precision GPS', updatedAtLabel: 'Actualizado', sectionBackgroundImage: 'IMAGEN DE FONDO', backgroundImageHint: 'Selecciona una imagen de fondo para la ficha de empresa (formato horizontal)', landscapeRecommended: 'Formato horizontal recomendado', sectionOptions: 'OPCIONES', locationDetectedTitle: 'Ubicacion detectada', locationUpdatedBody: 'Posicion GPS actualizada.', locationFailed: 'No se pudo obtener la ubicacion', userNotConnected: 'Usuario no conectado' },
  pt: { sectionCompanyLogo: 'LOGOTIPO DA EMPRESA', sectionMainInfo: 'INFORMACOES PRINCIPAIS', companyNameRequiredLabel: 'Nome da empresa *', sectionCategories: 'CATEGORIAS', categoryHint: 'Voce pode escolher varios setores para a mesma empresa.', sectionContact: 'CONTATO', sectionLocation: 'LOCALIZACAO', addressCity: 'Endereco / Cidade', detectingLocation: 'Detectando...', detectMyLocation: 'Detectar minha localizacao', latitudeLabel: 'Latitude', longitudeLabel: 'Longitude', gpsPrecisionLabel: 'Precisao GPS', updatedAtLabel: 'Atualizado', sectionBackgroundImage: 'IMAGEM DE FUNDO', backgroundImageHint: 'Selecione uma imagem de fundo para a pagina da empresa (formato paisagem)', landscapeRecommended: 'Formato paisagem recomendado', sectionOptions: 'OPCOES', locationDetectedTitle: 'Localizacao detectada', locationUpdatedBody: 'Posicao GPS atualizada.', locationFailed: 'Nao foi possivel obter a localizacao', userNotConnected: 'Usuario nao conectado' },
  zh: { sectionCompanyLogo: '公司标志', sectionMainInfo: '主要信息', companyNameRequiredLabel: '公司名称 *', sectionCategories: '分类', categoryHint: '同一家公司可以选择多个行业。', sectionContact: '联系方式', sectionLocation: '位置', addressCity: '地址 / 城市', detectingLocation: '检测中...', detectMyLocation: '检测我的位置', latitudeLabel: '纬度', longitudeLabel: '经度', gpsPrecisionLabel: 'GPS 精度', updatedAtLabel: '更新时间', sectionBackgroundImage: '背景图片', backgroundImageHint: '为企业页面选择一张背景图（横向格式）', landscapeRecommended: '推荐横向格式', sectionOptions: '选项', locationDetectedTitle: '已检测到位置', locationUpdatedBody: 'GPS 位置已更新。', locationFailed: '无法获取位置。', userNotConnected: '用户未连接' },
  hi: { sectionCompanyLogo: 'कंपनी लोगो', sectionMainInfo: 'मुख्य जानकारी', companyNameRequiredLabel: 'कंपनी का नाम *', sectionCategories: 'श्रेणियां', categoryHint: 'आप एक ही कंपनी के लिए कई सेक्टर चुन सकते हैं।', sectionContact: 'संपर्क', sectionLocation: 'स्थान', addressCity: 'पता / शहर', detectingLocation: 'पता लगाया जा रहा है...', detectMyLocation: 'मेरा स्थान पता करें', latitudeLabel: 'अक्षांश', longitudeLabel: 'देशांतर', gpsPrecisionLabel: 'GPS सटीकता', updatedAtLabel: 'अपडेट किया गया', sectionBackgroundImage: 'पृष्ठभूमि छवि', backgroundImageHint: 'कंपनी पेज के लिए पृष्ठभूमि छवि चुनें (लैंडस्केप)', landscapeRecommended: 'लैंडस्केप प्रारूप अनुशंसित', sectionOptions: 'विकल्प', locationDetectedTitle: 'स्थान मिल गया', locationUpdatedBody: 'GPS स्थिति अपडेट हुई।', locationFailed: 'स्थान प्राप्त नहीं हो सका।', userNotConnected: 'उपयोगकर्ता कनेक्ट नहीं है' },
  ar: { sectionCompanyLogo: 'شعار الشركة', sectionMainInfo: 'المعلومات الرئيسية', companyNameRequiredLabel: 'اسم الشركة *', sectionCategories: 'الفئات', categoryHint: 'يمكنك اختيار عدة قطاعات لنفس الشركة.', sectionContact: 'التواصل', sectionLocation: 'الموقع', addressCity: 'العنوان / المدينة', detectingLocation: 'جارٍ التحديد...', detectMyLocation: 'تحديد موقعي', latitudeLabel: 'خط العرض', longitudeLabel: 'خط الطول', gpsPrecisionLabel: 'دقة GPS', updatedAtLabel: 'تم التحديث', sectionBackgroundImage: 'صورة الخلفية', backgroundImageHint: 'اختر صورة خلفية لصفحة الشركة (تنسيق أفقي)', landscapeRecommended: 'يوصى بالتنسيق الأفقي', sectionOptions: 'الخيارات', locationDetectedTitle: 'تم تحديد الموقع', locationUpdatedBody: 'تم تحديث موقع GPS.', locationFailed: 'تعذر الحصول على الموقع.', userNotConnected: 'المستخدم غير متصل' },
  bn: { sectionCompanyLogo: 'কোম্পানির লোগো', sectionMainInfo: 'প্রধান তথ্য', companyNameRequiredLabel: 'কোম্পানির নাম *', sectionCategories: 'বিভাগ', categoryHint: 'একই কোম্পানির জন্য একাধিক সেক্টর বেছে নিতে পারেন।', sectionContact: 'যোগাযোগ', sectionLocation: 'অবস্থান', addressCity: 'ঠিকানা / শহর', detectingLocation: 'সনাক্ত করা হচ্ছে...', detectMyLocation: 'আমার অবস্থান শনাক্ত করুন', latitudeLabel: 'অক্ষাংশ', longitudeLabel: 'দ্রাঘিমাংশ', gpsPrecisionLabel: 'GPS নির্ভুলতা', updatedAtLabel: 'আপডেট হয়েছে', sectionBackgroundImage: 'পটভূমির ছবি', backgroundImageHint: 'কোম্পানি পেজের জন্য একটি ব্যাকগ্রাউন্ড ছবি বেছে নিন (ল্যান্ডস্কেপ)', landscapeRecommended: 'ল্যান্ডস্কেপ ফরম্যাট সুপারিশকৃত', sectionOptions: 'বিকল্প', locationDetectedTitle: 'অবস্থান সনাক্ত হয়েছে', locationUpdatedBody: 'GPS অবস্থান আপডেট হয়েছে।', locationFailed: 'অবস্থান পাওয়া যায়নি।', userNotConnected: 'ব্যবহারকারী সংযুক্ত নয়' },
  ru: { sectionCompanyLogo: 'ЛОГОТИП КОМПАНИИ', sectionMainInfo: 'ОСНОВНАЯ ИНФОРМАЦИЯ', companyNameRequiredLabel: 'Название компании *', sectionCategories: 'КАТЕГОРИИ', categoryHint: 'Вы можете выбрать несколько секторов для одной компании.', sectionContact: 'КОНТАКТЫ', sectionLocation: 'МЕСТОПОЛОЖЕНИЕ', addressCity: 'Адрес / Город', detectingLocation: 'Определение...', detectMyLocation: 'Определить мое местоположение', latitudeLabel: 'Широта', longitudeLabel: 'Долгота', gpsPrecisionLabel: 'Точность GPS', updatedAtLabel: 'Обновлено', sectionBackgroundImage: 'ФОНОВОЕ ИЗОБРАЖЕНИЕ', backgroundImageHint: 'Выберите фоновое изображение для страницы компании (горизонтальный формат)', landscapeRecommended: 'Рекомендуется горизонтальный формат', sectionOptions: 'ПАРАМЕТРЫ', locationDetectedTitle: 'Местоположение определено', locationUpdatedBody: 'GPS-позиция обновлена.', locationFailed: 'Не удалось получить местоположение.', userNotConnected: 'Пользователь не подключен' },
  ja: { sectionCompanyLogo: '会社ロゴ', sectionMainInfo: '基本情報', companyNameRequiredLabel: '会社名 *', sectionCategories: 'カテゴリ', categoryHint: '同じ会社に複数の業種を選択できます。', sectionContact: '連絡先', sectionLocation: '所在地', addressCity: '住所 / 市区町村', detectingLocation: '検出中...', detectMyLocation: '現在地を検出', latitudeLabel: '緯度', longitudeLabel: '経度', gpsPrecisionLabel: 'GPS精度', updatedAtLabel: '更新日時', sectionBackgroundImage: '背景画像', backgroundImageHint: '会社ページの背景画像を選択してください（横長推奨）', landscapeRecommended: '横長形式を推奨', sectionOptions: 'オプション', locationDetectedTitle: '位置を検出しました', locationUpdatedBody: 'GPS位置を更新しました。', locationFailed: '位置情報を取得できません。', userNotConnected: 'ユーザー未接続' },
  de: { sectionCompanyLogo: 'FIRMENLOGO', sectionMainInfo: 'HAUPTINFORMATIONEN', companyNameRequiredLabel: 'Firmenname *', sectionCategories: 'KATEGORIEN', categoryHint: 'Sie können mehrere Sektoren für dasselbe Unternehmen auswählen.', sectionContact: 'KONTAKT', sectionLocation: 'STANDORT', addressCity: 'Adresse / Stadt', detectingLocation: 'Wird erkannt...', detectMyLocation: 'Meinen Standort erkennen', latitudeLabel: 'Breitengrad', longitudeLabel: 'Längengrad', gpsPrecisionLabel: 'GPS-Genauigkeit', updatedAtLabel: 'Aktualisiert', sectionBackgroundImage: 'HINTERGRUNDBILD', backgroundImageHint: 'Wählen Sie ein Hintergrundbild für die Unternehmensseite (Querformat)', landscapeRecommended: 'Querformat empfohlen', sectionOptions: 'OPTIONEN', locationDetectedTitle: 'Standort erkannt', locationUpdatedBody: 'GPS-Position aktualisiert.', locationFailed: 'Standort konnte nicht abgerufen werden.', userNotConnected: 'Benutzer nicht verbunden' },
  id: { sectionCompanyLogo: 'LOGO PERUSAHAAN', sectionMainInfo: 'INFORMASI UTAMA', companyNameRequiredLabel: 'Nama perusahaan *', sectionCategories: 'KATEGORI', categoryHint: 'Anda dapat memilih beberapa sektor untuk perusahaan yang sama.', sectionContact: 'KONTAK', sectionLocation: 'LOKASI', addressCity: 'Alamat / Kota', detectingLocation: 'Mendeteksi...', detectMyLocation: 'Deteksi lokasi saya', latitudeLabel: 'Lintang', longitudeLabel: 'Bujur', gpsPrecisionLabel: 'Presisi GPS', updatedAtLabel: 'Diperbarui', sectionBackgroundImage: 'GAMBAR LATAR', backgroundImageHint: 'Pilih gambar latar untuk halaman perusahaan (format lanskap)', landscapeRecommended: 'Format lanskap disarankan', sectionOptions: 'OPSI', locationDetectedTitle: 'Lokasi terdeteksi', locationUpdatedBody: 'Posisi GPS diperbarui.', locationFailed: 'Tidak dapat memperoleh lokasi.', userNotConnected: 'Pengguna tidak terhubung' },
  ur: { sectionCompanyLogo: 'کمپنی لوگو', sectionMainInfo: 'اہم معلومات', companyNameRequiredLabel: 'کمپنی کا نام *', sectionCategories: 'زمرے', categoryHint: 'آپ ایک ہی کمپنی کے لیے کئی شعبے منتخب کر سکتے ہیں۔', sectionContact: 'رابطہ', sectionLocation: 'مقام', addressCity: 'پتہ / شہر', detectingLocation: 'پتہ لگایا جا رہا ہے...', detectMyLocation: 'میرا مقام معلوم کریں', latitudeLabel: 'عرض بلد', longitudeLabel: 'طول بلد', gpsPrecisionLabel: 'GPS درستگی', updatedAtLabel: 'اپ ڈیٹ ہوا', sectionBackgroundImage: 'پس منظر کی تصویر', backgroundImageHint: 'کمپنی صفحے کے لیے پس منظر کی تصویر منتخب کریں (افقی فارمیٹ)', landscapeRecommended: 'افقی فارمیٹ تجویز کردہ', sectionOptions: 'اختیارات', locationDetectedTitle: 'مقام مل گیا', locationUpdatedBody: 'GPS مقام اپ ڈیٹ ہو گیا۔', locationFailed: 'مقام حاصل نہیں ہو سکا۔', userNotConnected: 'صارف منسلک نہیں' },
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
  const { t, language, activeLanguage } = useLanguage();
  const tr = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const ui = CREATE_COMPANY_UI[language] || CREATE_COMPANY_UI.en;
  const imagePicker = useLazyImagePicker();
  const [businessTypes, setBusinessTypes] = useState(CATEGORIES);

  const { defaultCategoryId = '1', defaultCategoryName = '' } = route.params || {};

  // Formulaire
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => defaultCategoryId ? [defaultCategoryId] : ['1']);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    getBusinessTypes()
      .then((types) => {
        if (!isCurrent || !types.length) return;
        setBusinessTypes(types.map((type) => {
          const localLabel = getCategoryLabel(type.key, activeLanguage);
          return {
            id: type.key,
            icon: type.icon,
            moduleKeys: type.moduleKeys || [],
            label: type.labels?.[activeLanguage] || (localLabel !== type.key ? localLabel : type.labels?.en),
          };
        }));
      })
      .catch((error) => console.warn('Unable to load business types:', error?.message || error));

    return () => {
      isCurrent = false;
    };
  }, [activeLanguage]);

  const localizedCategories = useMemo(
    () => businessTypes.map((category) => ({
      ...category,
      label: category.label || getCategoryLabel(category.id, activeLanguage),
    })),
    [businessTypes, activeLanguage]
  );
  const selectedCategory = localizedCategories.find(c => c.id === selectedCategoryIds[0]) || localizedCategories[0];
  const orderedCategories = [...localizedCategories].sort((a, b) => {
    const aSelected = selectedCategoryIds.includes(a.id);
    const bSelected = selectedCategoryIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (bSelected && !aSelected) return 1;
    return a.label.localeCompare(b.label);
  });
  const filteredCategories = orderedCategories.filter((category) => (
    category.label.toLowerCase().includes(categorySearch.trim().toLowerCase())
  ));
  const previewModuleKeys = getBusinessModulePreviewKeys(localizedCategories, selectedCategoryIds);
  const isValid = name.trim().length >= 2 && selectedCategoryIds.length > 0;
  const { user } = useUser();

  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    ));
  };

  // Fonction pour choisir une image
  const pickLogo = async () => {
    const { status } = await imagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
        Alert.alert(t('permissionRequired'), t('permissionGalleryLogo'));
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
      Alert.alert(t('permissionRequired'), t('permissionGallery'));
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
        Alert.alert(t('permissionRequired'), t('permissionLocation'));
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

      Alert.alert(ui.locationDetectedTitle, ui.locationUpdatedBody);
    } catch (error) {
      Alert.alert(t('error'), ui.locationFailed);
    } finally {
      setLocating(false);
    }
  };

  const handleCreate = async () => {
    if (!isValid || loading) return;

    if (!user?._id) {
      Alert.alert(t('error'), ui.userNotConnected);
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
      formData.append('businessTypeId', primaryCategoryId);
      formData.append('categoryIds', JSON.stringify(selectedCategoryIds));
      formData.append('isVerified', String(isVerified));
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
      const newCompanyId = created?._id || created?.id;

      Alert.alert(
        t('companyCreatedTitle', '🎉 Entreprise créée !'),
        `"${created.name}" ${t('companyUpdated', 'a été ajoutée avec succès.')}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Amener l'utilisateur sur la page de son entreprise
              // pour finaliser la création et valider le profil.
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'MainTabs',
                    params: {
                      screen: 'CompanyHome',
                      params: {
                        screen: selectedCategoryIds.includes('2') ? 'RestaurantDashboard' : 'CompanyOverview',
                        params: {
                          companyId: newCompanyId,
                          currentUserId: user?._id || null,
                          onboardingFlow: true,
                          justCreatedCompany: true,
                        },
                      },
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
      Alert.alert(t('error'), e.response?.data?.error || tr('createCompanyFailed', 'Impossible de creer l\'entreprise'));
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <SectionLabel text={ui.sectionCompanyLogo} />
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
          <SectionLabel text={ui.sectionMainInfo} />
          <FieldCard>
            <Field
              icon="🏢"
              label={ui.companyNameRequiredLabel}
              placeholder={t('companyNamePlaceholderEx', 'Ex : Ahmed Company')}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="📝"
              label={t('description')}
              placeholder={t('describeActivity', 'Décrivez votre activité en quelques mots…')}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={280}
            />
          </FieldCard>

          {/* Catégorie */}
          <SectionLabel text={ui.sectionCategories} />
          <Text style={styles.categoryHelperText}>
            {tr('primaryBusinessTypeHint', 'Le premier secteur sélectionné définit le domaine principal. Vous pouvez ajouter des secteurs complémentaires.')}
          </Text>
          <Text style={styles.primaryTypeText}>
            {tr('primaryBusinessType', 'Domaine principal')}: {selectedCategory?.label || tr('chooseBusinessType', 'Sélectionnez un domaine')}
          </Text>
          <TextInput
            value={categorySearch}
            onChangeText={setCategorySearch}
            placeholder={tr('searchBusinessTypes', 'Rechercher un domaine')}
            placeholderTextColor={C.textSecondary}
            style={styles.categorySearch}
            accessibilityLabel={tr('searchBusinessTypes', 'Rechercher un domaine')}
          />
          <View style={styles.categoryGrid}>
            {filteredCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, selectedCategoryIds.includes(cat.id) && styles.catChipSelected]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.catChipIcon}>{cat.icon}</Text>
                <Text style={[styles.catChipLabel, selectedCategoryIds.includes(cat.id) && styles.catChipLabelSelected]}>
                  {cat.label}
                </Text>
                <Text style={[styles.catChipSubLabel, selectedCategoryIds.includes(cat.id) && styles.catChipSubLabelSelected]}>
                  {getCategorySubtitle(cat.id, t)}
                </Text>
                {selectedCategoryIds.includes(cat.id) && <Text style={styles.catChipCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          {!!previewModuleKeys.length && (
            <View style={styles.modulePreview}>
              <Text style={styles.modulePreviewTitle}>{tr('modulesEnabledForBusiness', 'Modules prévus pour ce domaine')}</Text>
              <View style={styles.modulePreviewList}>
                {previewModuleKeys.map((moduleKey) => (
                  <View key={moduleKey} style={styles.modulePreviewChip}>
                    <Text style={styles.modulePreviewText}>{getBusinessModuleLabel(moduleKey, activeLanguage)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact */}
          <SectionLabel text={ui.sectionContact} />
          <FieldCard>
            <Field
              icon="📞"
              label={t('phone')}
              placeholder={t('phonePlaceholderEx', '+221 77 000 00 00')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="✉️"
              label={t('email')}
              placeholder={t('emailPlaceholderEx', 'contact@entreprise.com')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <View style={styles.fieldDivider} />
            <Field
              icon="🌐"
              label={t('website')}
              placeholder={t('websitePlaceholderEx', 'https://www.entreprise.com')}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
            />
          </FieldCard>

          {/* Localisation */}
          <SectionLabel text={ui.sectionLocation} />
          <FieldCard>
            <Field
              icon="📍"
              label={ui.addressCity}
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
                {locating ? ui.detectingLocation : ui.detectMyLocation}
              </Text>
            </TouchableOpacity>
            {(latitude || longitude) && (
              <>
                <View style={styles.fieldDivider} />
                <View style={styles.coordsDisplay}>
                  <Text style={styles.coordLabel}>{ui.latitudeLabel}: <Text style={styles.coordValue}>{parseFloat(latitude).toFixed(4)}</Text></Text>
                  <Text style={styles.coordLabel}>{ui.longitudeLabel}: <Text style={styles.coordValue}>{parseFloat(longitude).toFixed(4)}</Text></Text>
                  {locationAccuracy !== null && (
                    <Text style={styles.coordLabel}>{ui.gpsPrecisionLabel}: <Text style={styles.coordValue}>~{locationAccuracy} m</Text></Text>
                  )}
                  {locationUpdatedAt && (
                    <Text style={styles.coordMeta}>{ui.updatedAtLabel}: {locationUpdatedAt.toLocaleTimeString()}</Text>
                  )}
                </View>
              </>
            )}
          </FieldCard>

          {/* Image de Background */}
          <SectionLabel text={ui.sectionBackgroundImage} />
          <Text style={styles.categoryHelperText}>{ui.backgroundImageHint}</Text>
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
                  <Text style={styles.bgPlaceholderText}>{tr('addImage', 'Ajouter image')}</Text>
                  <Text style={styles.bgPlaceholderSub}>{ui.landscapeRecommended}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Options */}
          <SectionLabel text={ui.sectionOptions} />
          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>✅</Text>
                <View>
                  <Text style={styles.optionLabel}>{t('verifiedCompany', 'Entreprise vérifiée')}</Text>
                  <Text style={styles.optionSub}>{t('verifiedBadgeHint', 'Affiche un badge de confiance')}</Text>
                </View>
              </View>
              <Switch
                value={isVerified}
                onValueChange={setIsVerified}
                trackColor={{ false: '#D1C4E9', true: C.purple }}
                thumbColor={C.white}
                ios_backgroundColor="#D1C4E9"
              />
            </View>
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
  primaryTypeText: { color: C.textPrimary, fontSize: 13, fontWeight: '700', marginHorizontal: 20, marginBottom: 8 },
  categorySearch: { minHeight: 42, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.separator, borderRadius: 10, backgroundColor: C.card, color: C.textPrimary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, rowGap: 10 },
  modulePreview: { marginHorizontal: 16, marginTop: 13, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.separator, backgroundColor: C.card },
  modulePreviewTitle: { color: C.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  modulePreviewList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modulePreviewChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: C.purpleLight },
  modulePreviewText: { color: C.purpleDark, fontSize: 10, fontWeight: '700' },
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

  optionCard: { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', shadowColor: '#8B2FC9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  optionIcon: { fontSize: 24 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  optionSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

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