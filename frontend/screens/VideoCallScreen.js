import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../context/LanguageContext';

function addMeetingDefaults(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || '').toLowerCase();
    if (host !== 'meet.jit.si' && !host.endsWith('.jit.si')) {
      return raw;
    }
  } catch (_) {
    return raw;
  }

  if (raw.includes('#')) {
    return `${raw}&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.disableDeepLinking=true`;
  }

  return `${raw}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.disableDeepLinking=true`;
}

function toHttpsUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text.replace(/^\/+/, '')}`;
}

function toTalkyWhenNeeded(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const fromJitsiScheme = text.replace(/^org\.jitsi\.meet:\/\//i, 'https://meet.jit.si/');
  const httpsUrl = toHttpsUrl(fromJitsiScheme);

  try {
    const parsed = new URL(httpsUrl);
    const host = String(parsed.hostname || '').toLowerCase();

    if (host === 'talky.io' && parsed.pathname.startsWith('/room/')) {
      return parsed.toString();
    }

    if (host === 'meet.jit.si' || host.endsWith('.jit.si')) {
      const room = String(parsed.pathname || '')
        .split('/')
        .filter(Boolean)
        .pop();

      const safeRoom = String(room || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 90);

      if (safeRoom) {
        return `https://talky.io/room/${safeRoom}`;
      }
    }

    return parsed.toString();
  } catch (_) {
    return httpsUrl;
  }
}

export default function VideoCallScreen({ route, navigation }) {
  const { t } = useLanguage();
  const meetingUrl = route?.params?.meetingUrl || '';
  const roomLabel = route?.params?.roomLabel || t('videoRoomLabel');
  const [loadError, setLoadError] = useState(false);
  const [webviewKey, setWebviewKey] = useState(0);
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [lastNavUrl, setLastNavUrl] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const hasUsablePageRef = useRef(false);

  const finalUrl = useMemo(() => {
    const normalized = toTalkyWhenNeeded(meetingUrl);
    return addMeetingDefaults(normalized);
  }, [meetingUrl]);

  useEffect(() => {
    setLoadedOnce(false);
    setShowStuckHelp(false);
    setLoadError(false);
    setLastNavUrl('');
    setLoadProgress(0);
    hasUsablePageRef.current = false;
  }, [finalUrl, webviewKey]);

  useEffect(() => {
    if (!finalUrl || loadedOnce) return undefined;

    const timeoutId = setTimeout(() => {
      if (!loadedOnce) {
        setShowStuckHelp(true);
      }
    }, 9000);

    return () => clearTimeout(timeoutId);
  }, [finalUrl, loadedOnce, webviewKey]);

  const retryInApp = () => {
    setShowStuckHelp(false);
    setLoadedOnce(false);
    setLoadError(false);
    setWebviewKey((prev) => prev + 1);
  };

  const handleOpenExternally = async () => {
    if (!finalUrl) {
      Alert.alert(t('videoLinkUnavailableTitle'), t('videoLinkUnavailableBody'));
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(finalUrl);
      if (!canOpen) {
        Alert.alert(t('videoOpenImpossibleTitle'), t('videoOpenImpossibleBody'));
        return;
      }
      await Linking.openURL(finalUrl);
    } catch (err) {
      Alert.alert(t('videoOpenErrorTitle'), t('videoOpenErrorBody'));
    }
  };

  if (!finalUrl) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.headerBtn}>{t('videoClose')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{roomLabel}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{t('videoMissingLinkTitle')}</Text>
          <Text style={styles.errorSub}>{t('videoMissingLinkBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.headerBtn}>{t('videoClose')}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{roomLabel}</Text>

        <TouchableOpacity onPress={handleOpenExternally} activeOpacity={0.8}>
          <Text style={styles.headerBtn}>{t('videoExternal')}</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{t('videoConnectionFailedTitle')}</Text>
          <Text style={styles.errorSub}>{t('videoConnectionFailedBody')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleOpenExternally} activeOpacity={0.85}>
            <Text style={styles.retryText}>{t('videoOpenBrowser')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          key={`video-webview-${webviewKey}`}
          source={{ uri: finalUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#0F766E" />
              <Text style={styles.loadingText}>{t('videoLoading')}</Text>
            </View>
          )}
          onError={() => setLoadError(true)}
          onHttpError={() => setLoadError(true)}
          onLoadProgress={({ nativeEvent }) => {
            const progress = Number(nativeEvent?.progress || 0);
            setLoadProgress(progress);
            if (progress > 0.55) {
              hasUsablePageRef.current = true;
            }
          }}
          onNavigationStateChange={(state) => {
            const url = String(state?.url || '');
            setLastNavUrl(url);
            if (url && !url.startsWith('about:blank')) {
              hasUsablePageRef.current = true;
            }
          }}
          onLoadEnd={() => {
            const canRender = hasUsablePageRef.current || loadProgress > 0.55;
            if (canRender) {
              setLoadedOnce(true);
              setShowStuckHelp(false);
              return;
            }

            const navIsBlank = !lastNavUrl || lastNavUrl.startsWith('about:blank');
            if (navIsBlank) {
              setShowStuckHelp(true);
            }
          }}
          originWhitelist={["http://*", "https://*"]}
          onShouldStartLoadWithRequest={(request) => {
            const url = String(request?.url || '');
            if (!url) return false;

            // Keep users inside the in-app web call even when Jitsi tries app deep links.
            if (url.startsWith('org.jitsi.meet://')) {
              return false;
            }

            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:blank')) {
              return true;
            }
            Linking.openURL(url).catch(() => {});
            return false;
          }}
        />
      )}

      {!loadError && showStuckHelp ? (
        <View style={styles.stuckCard}>
          <Text style={styles.stuckTitle}>{t('videoSlowDetectedTitle')}</Text>
          <Text style={styles.stuckText}>{t('videoSlowDetectedBody')}</Text>
          <View style={styles.stuckActions}>
            <TouchableOpacity style={styles.stuckBtnGhost} onPress={retryInApp} activeOpacity={0.85}>
              <Text style={styles.stuckBtnGhostText}>{t('videoRetry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stuckBtnPrimary} onPress={handleOpenExternally} activeOpacity={0.85}>
              <Text style={styles.stuckBtnPrimaryText}>{t('videoOpenExternal')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#04141B',
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#163040',
    backgroundColor: '#082333',
  },
  headerBtn: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 10,
    color: '#E2E8F0',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
  headerSpacer: {
    width: 56,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04141B',
    gap: 10,
  },
  loadingText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F766E',
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
  },
  stuckCard: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    right: 14,
    backgroundColor: '#0B2634',
    borderWidth: 1,
    borderColor: '#1E3A4A',
    borderRadius: 12,
    padding: 12,
  },
  stuckTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  stuckText: {
    color: '#93A8B5',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  stuckActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stuckBtnGhost: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#35566A',
    paddingVertical: 8,
    alignItems: 'center',
  },
  stuckBtnGhostText: {
    color: '#C7D3DB',
    fontWeight: '700',
    fontSize: 12,
  },
  stuckBtnPrimary: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    paddingVertical: 8,
    alignItems: 'center',
  },
  stuckBtnPrimaryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
});