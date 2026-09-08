import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import { API_URL } from '../env';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import AuthPromptModal from '../components/AuthPromptModal';
import ReportModal from '../components/ReportModal';
import { resolveAvatarUri } from '../utils/profileUtils';

const { width } = Dimensions.get("window");

const PURPLE = "#7C3AED";

const imgUrl = (src) => {
  return resolveAvatarUri(src, API_URL) || null;
};

const getYouTubeEmbedUrl = (rawUrl = "") => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;

      const parts = url.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[shortsIndex + 1]}`;
      }
    }
  } catch (_) {
    return "";
  }

  return "";
};

const getVimeoEmbedUrl = (rawUrl = "") => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.includes("vimeo.com")) return "";

    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : "";
  } catch (_) {
    return "";
  }
};

const buildVideoHtml = (url) => {
  const youtube = getYouTubeEmbedUrl(url);
  const vimeo = getVimeoEmbedUrl(url);
  const iframeUrl = youtube || vimeo;

  if (iframeUrl) {
    return `
      <html>
        <body style="margin:0;background:#000;">
          <iframe
            src="${iframeUrl}"
            style="border:0;width:100%;height:100%;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </body>
      </html>
    `;
  }

  const lower = String(url || "").toLowerCase();
  const isDirectVideo =
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".m4v") ||
    lower.includes(".webm") ||
    lower.includes(".m3u8");

  if (isDirectVideo) {
    return `
      <html>
        <body style="margin:0;background:#000;">
          <video controls playsinline style="width:100%;height:100%;object-fit:cover;" src="${url}"></video>
        </body>
      </html>
    `;
  }

  return `
    <html>
      <body style="margin:0;background:#000;">
        <iframe
          src="${url}"
          style="border:0;width:100%;height:100%;"
          allow="autoplay; fullscreen"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;
};

export default function ServiceDetailScreen({ route, navigation }) {
  const { isGuest } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const { t } = useLanguage();
  const { service } = route.params || {};
  const companyId = route?.params?.companyId;
  const [showFullDescription, setShowFullDescription] = useState(false);
  const hasVideo = !!service?.video;
  const videoUrl = hasVideo ? (resolveAvatarUri(service.video, API_URL) || null) : null;
  const videoHtml = videoUrl ? buildVideoHtml(videoUrl) : "";

  if (!service) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <View style={styles.centered}>
          <Text>{t('serviceNotFound', 'Service not found')}</Text>
        </View>
      </View>
    );
  }

  // Fonction pour couper la description
  const getShortDescription = (text, maxLength = 100) => {
    if (!text) return t('noDescriptionAvailable', 'No description available for this service.');
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "... ";
  };

  // Vérifie si la description est longue
  const isLongDescription = (text) => {
    return text && text.length > 100;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* MEDIA - image ou vidéo */}
        {videoUrl ? (
          <View style={styles.videoBox}>
            <WebView
              source={{ html: videoHtml }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction
              javaScriptEnabled
              scrollEnabled={false}
            />
          </View>
        ) : (
          <Image
            source={{ uri: imgUrl(service.image) }}
            style={styles.image}
          />
        )}

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* CONTENT - Style Kungliga Slottet avec arrondis */}
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
            <Text style={styles.name}>{service.name}</Text>

            {videoUrl ? (
              <Text style={styles.mediaLabel}>{t('videoContentAvailable', 'Video content available')}</Text>
            ) : null}

            {/* Location + Rating */}
            {(service.location || service.rating || service.reviewCount) && (
              <View style={styles.locationRow}>
                {service.location ? (
                  <Text style={styles.location}>📍 {service.location}</Text>
                ) : null}
                {(service.rating || service.reviewCount) ? (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingStar}>⭐</Text>
                    {service.rating ? (
                      <Text style={styles.rating}>{service.rating}/10</Text>
                    ) : null}
                    {service.reviewCount ? (
                      <Text style={styles.reviewCount}>({service.reviewCount})</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}

            {/* DETAILS TITLE */}
            <Text style={styles.detailsTitle}>{t('detailsSection', 'Details')}</Text>

            {/* DESCRIPTION avec "See More" / "See Less" */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {showFullDescription
                  ? service.description ||
                    t('noDescriptionAvailable', 'No description available for this service.')
                  : getShortDescription(
                      service.description ||
                        t('noDescriptionAvailable', 'No description available for this service.'),
                      100
                    )}
                {!showFullDescription && isLongDescription(service.description) && (
                  <Text
                    style={styles.seeMore}
                    onPress={() => setShowFullDescription(true)}
                  >
                    {t('seeMore', 'See more')}
                  </Text>
                )}
                {showFullDescription && isLongDescription(service.description) && (
                  <Text
                    style={styles.seeLess}
                    onPress={() => setShowFullDescription(false)}
                  >
                    {` ${t('seeLess', 'See less')}`}
                  </Text>
                )}
              </Text>
            </View>

            {/* PRIX */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{t('priceLabel', 'Price')}</Text>
              <Text style={styles.price}>
                ${Number(service.price || 0).toFixed(2)}
              </Text>
            </View>

            {/* ACTION BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                isGuest ? setShowAuthPrompt(true) : navigation.navigate("CreateAppointment", {
                  companyId,
                  service,
                });
              }}
            >
              <Text style={styles.buttonText}>{t('bookService', 'Book this service')} →</Text>
            </TouchableOpacity>

            {/* ── Bouton Signaler ── */}
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setReportVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reportButtonText}>🚩 {t('report', 'Signaler')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => { setShowAuthPrompt(false); navigation.navigate('Login'); }}
        onSignUp={() => { setShowAuthPrompt(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowAuthPrompt(false)}
      />
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="service"
        targetId={service?._id || service?.id || null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  reportButton: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  reportButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },

  image: {
    width: width,
    height: 500,
    resizeMode: "cover",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  videoBox: {
    width: width,
    height: 500,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    overflow: "hidden",
  },

  contentWrapper: {
    marginTop: 460,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
  },

  backBtn: {
    position: "absolute",
    top: 44,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },

  backText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "400",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  mediaLabel: {
    marginTop: 8,
    color: PURPLE,
    fontSize: 13,
    fontWeight: "700",
  },

  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },

  location: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },

  rating: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginRight: 4,
  },

  reviewCount: {
    fontSize: 12,
    color: "#999999",
  },

  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  descriptionContainer: {
    marginBottom: 20,
  },

  description: {
    fontSize: 15,
    color: "#444444",
    lineHeight: 22,
  },

  seeMore: {
    color: PURPLE,
    fontWeight: "600",
  },

  seeLess: {
    color: PURPLE,
    fontWeight: "600",
  },

  priceContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  priceLabel: {
    fontSize: 13,
    color: "#999999",
    fontWeight: "500",
    marginBottom: 4,
  },

  price: {
    fontSize: 24,
    fontWeight: "800",
    color: PURPLE,
  },

  button: {
    marginTop: 24,
    backgroundColor: PURPLE,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});