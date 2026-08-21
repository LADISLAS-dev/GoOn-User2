import React, { useState, useEffect } from "react";
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
import { resolveAvatarUri } from '../utils/profileUtils';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import AuthPromptModal from '../components/AuthPromptModal';

const { width } = Dimensions.get("window");

const PURPLE = "#7C3AED";

const SERVICE_DETAIL_COPY = {
  fr: {
    serviceNotFound: 'Service introuvable',
    videoContentAvailable: 'Contenu video disponible',
    details: 'Details',
    noDescription: 'Aucune description disponible pour ce service.',
    seeMore: 'Voir plus',
    seeLess: ' Voir moins',
    price: 'Prix',
    bookService: 'Reserver ce service ->',
  },
  en: {
    serviceNotFound: 'Service not found',
    videoContentAvailable: 'Video content available',
    details: 'Details',
    noDescription: 'No description available for this service.',
    seeMore: 'See More',
    seeLess: ' See Less',
    price: 'Price',
    bookService: 'Book this service ->',
  },
  es: {
    serviceNotFound: 'Servicio no encontrado',
    videoContentAvailable: 'Contenido de video disponible',
    details: 'Detalles',
    noDescription: 'No hay descripcion disponible para este servicio.',
    seeMore: 'Ver mas',
    seeLess: ' Ver menos',
    price: 'Precio',
    bookService: 'Reservar este servicio ->',
  },
  pt: {
    serviceNotFound: 'Servico nao encontrado',
    videoContentAvailable: 'Conteudo de video disponivel',
    details: 'Detalhes',
    noDescription: 'Nenhuma descricao disponivel para este servico.',
    seeMore: 'Ver mais',
    seeLess: ' Ver menos',
    price: 'Preco',
    bookService: 'Reservar este servico ->',
  },
  zh: {
    serviceNotFound: '未找到服务',
    videoContentAvailable: '有可用视频内容',
    details: '详情',
    noDescription: '该服务暂无描述。',
    seeMore: '查看更多',
    seeLess: ' 收起',
    price: '价格',
    bookService: '预约此服务 ->',
  },
  hi: {
    serviceNotFound: 'सेवा नहीं मिली',
    videoContentAvailable: 'वीडियो सामग्री उपलब्ध है',
    details: 'विवरण',
    noDescription: 'इस सेवा के लिए कोई विवरण उपलब्ध नहीं है।',
    seeMore: 'और देखें',
    seeLess: ' कम देखें',
    price: 'कीमत',
    bookService: 'इस सेवा को बुक करें ->',
  },
  ar: {
    serviceNotFound: 'الخدمة غير موجودة',
    videoContentAvailable: 'يتوفر محتوى فيديو',
    details: 'التفاصيل',
    noDescription: 'لا يوجد وصف متاح لهذه الخدمة.',
    seeMore: 'عرض المزيد',
    seeLess: ' عرض اقل',
    price: 'السعر',
    bookService: 'احجز هذه الخدمة ->',
  },
  bn: {
    serviceNotFound: 'সেবা পাওয়া যায়নি',
    videoContentAvailable: 'ভিডিও কনটেন্ট উপলব্ধ',
    details: 'বিস্তারিত',
    noDescription: 'এই সেবার জন্য কোন বর্ণনা উপলব্ধ নেই।',
    seeMore: 'আরও দেখুন',
    seeLess: ' কম দেখুন',
    price: 'মূল্য',
    bookService: 'এই সেবাটি বুক করুন ->',
  },
  ru: {
    serviceNotFound: 'Услуга не найдена',
    videoContentAvailable: 'Доступен видеоконтент',
    details: 'Детали',
    noDescription: 'Для этой услуги описание недоступно.',
    seeMore: 'Показать еще',
    seeLess: ' Скрыть',
    price: 'Цена',
    bookService: 'Забронировать услугу ->',
  },
  ja: {
    serviceNotFound: 'サービスが見つかりません',
    videoContentAvailable: '動画コンテンツがあります',
    details: '詳細',
    noDescription: 'このサービスには説明がありません。',
    seeMore: 'もっと見る',
    seeLess: ' 閉じる',
    price: '価格',
    bookService: 'このサービスを予約する ->',
  },
  de: {
    serviceNotFound: 'Service nicht gefunden',
    videoContentAvailable: 'Videoinhalt verfugbar',
    details: 'Details',
    noDescription: 'Fur diesen Service ist keine Beschreibung verfugbar.',
    seeMore: 'Mehr sehen',
    seeLess: ' Weniger sehen',
    price: 'Preis',
    bookService: 'Diesen Service buchen ->',
  },
  id: {
    serviceNotFound: 'Layanan tidak ditemukan',
    videoContentAvailable: 'Konten video tersedia',
    details: 'Detail',
    noDescription: 'Tidak ada deskripsi yang tersedia untuk layanan ini.',
    seeMore: 'Lihat lebih banyak',
    seeLess: ' Lihat lebih sedikit',
    price: 'Harga',
    bookService: 'Pesan layanan ini ->',
  },
  ur: {
    serviceNotFound: 'سروس نہیں ملی',
    videoContentAvailable: 'ویڈیو مواد دستیاب ہے',
    details: 'تفصیلات',
    noDescription: 'اس سروس کے لیے کوئی تفصیل دستیاب نہیں ہے۔',
    seeMore: 'مزید دیکھیں',
    seeLess: ' کم دیکھیں',
    price: 'قیمت',
    bookService: 'اس سروس کو بک کریں ->',
  },
};

const resolveLanguageCode = (language) => {
  const safe = String(language || '').trim().toLowerCase();
  if (!safe) return 'en';
  const base = safe.split(/[-_]/)[0] || safe;
  return SERVICE_DETAIL_COPY[base] ? base : 'en';
};

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
  const { language } = useLanguage();
  const { isGuest } = useUser();
  const { service } = route.params || {};
  const companyId = route?.params?.companyId;
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const copy = SERVICE_DETAIL_COPY[resolveLanguageCode(language)] || SERVICE_DETAIL_COPY.en;
  const hasVideo = !!service?.video;
  const videoUrl = hasVideo ? (resolveAvatarUri(service.video, API_URL) || null) : null;
  const videoHtml = videoUrl ? buildVideoHtml(videoUrl) : "";

  if (!service) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <View style={styles.centered}>
          <Text>{copy.serviceNotFound}</Text>
        </View>
      </View>
    );
  }

  // Fonction pour couper la description
  const getShortDescription = (text, maxLength = 100) => {
    if (!text) return copy.noDescription;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "... ";
  };

  // Vérifie si la description est longue
  const isLongDescription = (text) => {
    return text && text.length > 100;
  };

  return (
    <>
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
              <Text style={styles.mediaLabel}>{copy.videoContentAvailable}</Text>
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
            <Text style={styles.detailsTitle}>{copy.details}</Text>

            {/* DESCRIPTION avec "See More" / "See Less" */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {showFullDescription
                  ? service.description ||
                    copy.noDescription
                  : getShortDescription(
                      service.description ||
                        copy.noDescription,
                      100
                    )}
                {!showFullDescription && isLongDescription(service.description) && (
                  <Text
                    style={styles.seeMore}
                    onPress={() => setShowFullDescription(true)}
                  >
                    {copy.seeMore}
                  </Text>
                )}
                {showFullDescription && isLongDescription(service.description) && (
                  <Text
                    style={styles.seeLess}
                    onPress={() => setShowFullDescription(false)}
                  >
                    {copy.seeLess}
                  </Text>
                )}
              </Text>
            </View>

            {/* PRIX */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{copy.price}</Text>
              <Text style={styles.price}>
                ${Number(service.price || 0).toFixed(2)}
              </Text>
            </View>

            {/* ACTION BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (isGuest) {
                  setShowAuthPrompt(true);
                } else {
                  navigation.navigate("CreateAppointment", {
                    companyId,
                    service,
                  });
                }
              }}
            >
              <Text style={styles.buttonText}>{copy.bookService}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>

      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => { setShowAuthPrompt(false); navigation.replace('Login'); }}
        onSignUp={() => { setShowAuthPrompt(false); navigation.replace('Register'); }}
        featureName="manageBookings"
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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