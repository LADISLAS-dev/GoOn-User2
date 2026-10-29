import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import AuthPromptModal from '../components/AuthPromptModal';
import ThemePicker from '../components/ThemePicker';
const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  surfaceSoft: '#FCFBF8',
  border: '#E8E1D7',
  borderStrong: '#D8CDBF',
  text: '#17161D',
  textSoft: '#6F6A63',
  textMuted: '#8F8980',
  accent: '#8B2FC9',
  accentDark: '#612090',
  accentSoft: '#F3E9FB',
};
const SETTINGS_COPY = {
  fr: {
    systemLanguage: 'Langue du telephone',
    followDeviceSetting: 'Suivre le reglage de votre appareil',
  },
  en: {
    systemLanguage: 'Device language',
    followDeviceSetting: 'Follow your device setting',
  },
  es: {
    systemLanguage: 'Idioma del dispositivo',
    followDeviceSetting: 'Seguir la configuracion del dispositivo',
  },
  pt: {
    systemLanguage: 'Idioma do dispositivo',
    followDeviceSetting: 'Seguir a configuracao do dispositivo',
  },
  zh: {
    systemLanguage: '设备语言',
    followDeviceSetting: '跟随设备语言设置',
  },
  hi: {
    systemLanguage: 'डिवाइस की भाषा',
    followDeviceSetting: 'अपने डिवाइस की सेटिंग का पालन करें',
  },
  ar: {
    systemLanguage: 'لغة الجهاز',
    followDeviceSetting: 'اتبع إعداد لغة جهازك',
  },
  bn: {
    systemLanguage: 'ডিভাইসের ভাষা',
    followDeviceSetting: 'ডিভাইসের ভাষা সেটিং অনুসরণ করুন',
  },
  ru: {
    systemLanguage: 'Язык устройства',
    followDeviceSetting: 'Следовать настройке языка устройства',
  },
  ja: {
    systemLanguage: '端末の言語',
    followDeviceSetting: '端末の言語設定に従う',
  },
  de: {
    systemLanguage: 'Geraetesprache',
    followDeviceSetting: 'Der Spracheinstellung des Geraets folgen',
  },
  id: {
    systemLanguage: 'Bahasa perangkat',
    followDeviceSetting: 'Ikuti pengaturan bahasa perangkat',
  },
  ur: {
    systemLanguage: 'ڈیوائس کی زبان',
    followDeviceSetting: 'اپنے ڈیوائس کی زبان کی سیٹنگ کے مطابق',
  },
};
const resolveLanguageCode = (language) => {
  const safe = String(language || '').trim().toLowerCase();
  if (!safe) return 'en';
  const base = safe.split(/[-_]/)[0] || safe;
  return SETTINGS_COPY[base] ? base : 'en';
};
export default function SettingsScreen() {
  const navigation = useNavigation();
  const { isGuest } = useUser();
  const { language, languagePreference, setLanguage, t, supportedLanguages } = useLanguage();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  useEffect(() => {
    if (isGuest) setShowAuthPrompt(true);
  }, [isGuest]);
  const activeLanguage = resolveLanguageCode(languagePreference === 'system' ? language : languagePreference || language);
  const settingsCopy = SETTINGS_COPY[activeLanguage] || SETTINGS_COPY.en;
  const LANG_CODE_TO_KEY = {
    system: 'systemLanguage',
    fr: 'french',
    en: 'english',
    es: 'spanish',
    pt: 'portuguese',
    zh: 'chinese',
    hi: 'hindi',
    ar: 'arabic',
    bn: 'bengali',
    ru: 'russian',
    ja: 'japanese',
    de: 'german',
    id: 'indonesian',
    ur: 'urdu',
  };
  const langLabel = (code) => {
    const key = LANG_CODE_TO_KEY[code] || code;
    return t(key, code === 'system' ? settingsCopy.systemLanguage : code);
  };
  const langFlag = (code) => {
    const flags = {
      system: '⚙️',
      fr: '🇫🇷',
      en: '🇬🇧',
      es: '🇪🇸',
      pt: '🇵🇹',
      zh: '🇨🇳',
      hi: '🇮🇳',
      ar: '🇸🇦',
      bn: '🇧🇩',
      ru: '🇷🇺',
      ja: '🇯🇵',
      de: '🇩🇪',
      id: '🇮🇩',
      ur: '🇵🇰',
    };
    return flags[code] || '🌐';
  };
  const selectedLanguage = languagePreference || language;
  const languageOptions = ['system', ...(supportedLanguages || []).filter((code) => code !== 'system')];
  const helperTextByLanguage = {
    fr: 'Choisis la langue de l’interface.',
    en: 'Choose the interface language.',
    es: 'Elige el idioma de la interfaz.',
    pt: 'Escolhe o idioma da interface.',
    zh: '选择应用界面语言。',
    hi: 'इंटरफ़ेस की भाषा चुनें।',
    ar: 'اختر لغة الواجهة.',
    bn: 'ইন্টারফেসের ভাষা নির্বাচন করুন।',
    ru: 'Выберите язык интерфейса.',
    ja: 'アプリの表示言語を選択してください。',
    de: 'Wähle die Sprache der Oberfläche.',
    id: 'Pilih bahasa antarmuka.',
    ur: 'انٹرفیس کی زبان منتخب کریں۔',
  };
  const helperText = helperTextByLanguage[language] || 'Choose the interface language.';
  return (
    <>
      <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('settingsTitle')}</Text>
          <Text style={styles.title}>{t('language')}</Text>
          <Text style={styles.subtitle}>{t('currentLanguage')}: {langLabel(language) || language}</Text>
        </View>
        <ThemePicker language={activeLanguage} />
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{t('language')}</Text>
            <Text style={styles.sectionDescription}>{helperText}</Text>
          </View>
          <View style={styles.optionList}>
            {languageOptions.map((code) => {
              const isSelected = selectedLanguage === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => setLanguage(code)}
                  activeOpacity={0.88}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.flag}>{langFlag(code)}</Text>
                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {langLabel(code) || code}
                      </Text>
                      <Text style={styles.optionHint}>
                        {code === 'system' ? settingsCopy.followDeviceSetting : code.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.check, isSelected && styles.checkSelected]}>
                    <View style={[styles.checkDot, isSelected && styles.checkDotSelected]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
        featureName="accessSettings"
      />
    </SafeAreaView>
    </>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    paddingVertical: 8,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSoft,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#281A11',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  cardHeader: {
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  optionList: {
    marginTop: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.textSoft,
    lineHeight: 18,
  },
  optionRow: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionRowSelected: {
    backgroundColor: '#FBF7FF',
    borderColor: COLORS.borderStrong,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flag: {
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  optionTextSelected: {
    color: COLORS.accentDark,
  },
  optionHint: {
    marginTop: 2,
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#F5ECFF',
  },
  checkDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'transparent',
  },
  checkDotSelected: {
    backgroundColor: COLORS.accent,
  },
});
