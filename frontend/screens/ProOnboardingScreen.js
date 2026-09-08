import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'has_seen_onboarding';
const DEFAULT_IMAGE_HEIGHT_RATIO = 0.44;
const DEFAULT_IMAGE_WIDTH_PERCENT = 100;
const DEFAULT_IMAGE_SCALE = 1;
const DEFAULT_IMAGE_TRANSLATE_Y = 0;





const C = {
  primary: '#8F2AC3',
  primaryDark: '#7421A8',
  textDark: '#251A34',
  textMuted: '#8B7A9F',
  panel1: '#FeFfF4',
  panel2: '#c64e42',
  panel3: '#ffffff',
  white: '#FFFFFF',
  dotIdle: '#D9D2E8',
  background: '#FEFBFF',
};

const slides = [
  {
    id: 'welcome',
    image: require('../assets/GoOn1.gif'),
    imageHeightRatio: 0.46,
    imageWidthPercent: 95,
    imageScale: 1.05,
    imageTranslateY: -6,
    backgroundColor: C.background,
    cardColor: '#FeFfF4',
    titleColor: C.primary,
  },

  {
    id: 'manage',
    image: require('../assets/GoOn2.gif'),
    imageHeightRatio: 0.48,
    imageWidthPercent: 98,
    imageScale: 1.05,
    imageTranslateY: -4,
    backgroundColor: C.background,
    cardColor: '#d03f32',
    titleColor: C.textDark,
  },
  {
    id: 'grow',
    image: require('../assets/GoOn3.gif'),
    imageHeightRatio: 0.46,
    imageWidthPercent: 96,
    imageScale: 1.06,
    imageTranslateY: -5,
    backgroundColor: C.background,
    cardColor: '#ffffff',
    titleColor: C.primary,
  },
];

export default function OnboardingScreen({ navigation }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const translatedSlides = useMemo(() => [
    {
      ...slides[0],
      eyebrow: t('onboarding1Eyebrow', 'WELCOME'),
      title: t('onboarding1Title', 'Welcome to\nGo On'),
      subtitle: t('onboarding1Subtitle', 'Organize your activity, clients and appointments in one elegant space.'),
    },
    {
      ...slides[1],
      eyebrow: t('onboarding2Eyebrow', 'SMART PLANNING'),
      title: t('onboarding2Title', 'Manage your appointments\nwith ease.'),
      subtitle: t('onboarding2Subtitle', 'Stay on time with reminders and keep your workflow fluid every day.'),
    },
    {
      ...slides[2],
      eyebrow: t('onboarding3Eyebrow', 'BUSINESS GROWTH'),
      title: t('onboarding3Title', 'Boost your business\nwith us'),
      subtitle: t('onboarding3Subtitle', 'Turn every interaction into growth with a professional mobile experience.'),
    },
  ], [t]);

  const activeSlide = useMemo(() => translatedSlides[index] || translatedSlides[0], [translatedSlides, index]);
  const isLast = index === slides.length - 1;

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch (_) {
      // Ignore storage errors and continue to login.
    }
    navigation.replace('Login');
  };

  const goNext = () => {
    const next = Math.min(index + 1, slides.length - 1);
    if (next === index) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const onMomentumEnd = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(nextIndex, slides.length - 1)));
  };

  const renderItem = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}> 
      <View style={[styles.imageCard, { backgroundColor: item.cardColor }]}>
        <View
          style={[
            styles.imageWrap,
            {
              height: height * (item.imageHeightRatio || DEFAULT_IMAGE_HEIGHT_RATIO),
            },
          ]}
        >
        <Image
          source={item.image}
          style={[
            styles.image,
            {
              width: `${item.imageWidthPercent || DEFAULT_IMAGE_WIDTH_PERCENT}%`,
              transform: [
                { scale: item.imageScale || DEFAULT_IMAGE_SCALE },
                { translateY: item.imageTranslateY || DEFAULT_IMAGE_TRANSLATE_Y },
              ],
            },
          ]}
          resizeMode="contain"
        />
        </View>
      </View>
      <Text style={styles.eyebrow}>{item.eyebrow}</Text>
      <Text style={[styles.title, { color: item.titleColor }]}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeSlide.backgroundColor }]} edges={['top', 'left', 'right']}> 
      <FlatList
        ref={listRef}
        data={translatedSlides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={renderItem}
      />

      <View style={[styles.bottomCard, !isLast && styles.bottomCardCompact, isLast && styles.bottomCardLast, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {!isLast && (
          <View style={styles.rowTop}>
            <TouchableOpacity onPress={finish} activeOpacity={0.8} style={styles.secondaryAction}>
              <Text style={styles.skipText}>{t('skip', 'Skip')}</Text>
            </TouchableOpacity>

            <View style={styles.dots}>
              {slides.map((item, dotIndex) => (
                <View
                  key={item.id}
                  style={[styles.dot, dotIndex === index && styles.dotActive]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={isLast ? finish : goNext}
              activeOpacity={0.86}
              style={styles.primaryAction}
            >
              <Text style={styles.nextText}>{isLast ? t('doneLabel', 'Done') : t('nextLabel', 'Next')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLast ? (
          <TouchableOpacity style={styles.getStartedBtn} onPress={finish} activeOpacity={0.88}>
            <Text style={styles.getStartedText}>{t('getStarted', 'Get Started')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  imageCard: {
    width: '90%',
    borderRadius: 28,
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: '#F0E6F8',
    shadowColor: '#8F2AC3',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  imageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  eyebrow: {
    marginTop: 18,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '900',
    color: C.primary,
    opacity: 0.8,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  bottomCard: {
    // backgroundColor: '#F4EEFB',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#E2D4F0',
  },
  bottomCardCompact: {
    paddingBottom: 10,
  },
  bottomCardLast: {
    paddingTop: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primaryDark,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: C.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondaryAction: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  primaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nextText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 26,
    backgroundColor: '#FFFFFF',
    height: 8,
    borderRadius: 4,
  },
  getStartedBtn: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    shadowColor: C.primary,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  getStartedText: {
    color: C.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});