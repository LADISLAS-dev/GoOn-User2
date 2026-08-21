import React, { useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const T = {
  fr: {
    savePlaces: 'Sauvegarder vos lieux et préférences favoris',
    chatVenues: 'Discutez directement avec des établissements premium',
    viewAds: 'Voir des publicités et promotions exclusives',
    bookInstantly: 'Réservez instantanément et suivez vos réservations',
    createAccount: 'Créer un compte gratuit',
    alreadyHaveAccount: 'J\'ai déjà un compte',
    maybeLater: 'Peut-être plus tard',
    signInTo: (f) => `Connectez-vous pour ${f}`,
    defaultTitle: 'Créez un compte pour continuer',
    defaultDesc: 'Rejoignez GoOn pour débloquer toutes les fonctionnalités.',
    accessProfile: 'accéder à votre profil',
    accessSettings: 'accéder aux réglages',
    createCompany: 'créer une entreprise',
    manageCompany: 'gérer votre entreprise',
    manageBookings: 'gérer les réservations',
    sendMessages: 'envoyer des messages',
    accessDashboard: 'accéder au tableau de bord',
  },
  en: {
    savePlaces: 'Save your favorite places and preferences',
    chatVenues: 'Chat directly with premium venues',
    viewAds: 'View exclusive ads and promotions',
    bookInstantly: 'Book instantly and track reservations',
    createAccount: 'Create Free Account',
    alreadyHaveAccount: 'I Already Have an Account',
    maybeLater: 'Maybe Later',
    signInTo: (f) => `Sign in to ${f}`,
    defaultTitle: 'Create an account to continue',
    defaultDesc: 'Join GoOn to unlock all features and get the most out of your premium experience.',
    accessProfile: 'access your profile',
    accessSettings: 'access settings',
    createCompany: 'create a company',
    manageCompany: 'manage your company',
    manageBookings: 'manage bookings',
    sendMessages: 'send messages',
    accessDashboard: 'access the dashboard',
  },
  es: {
    savePlaces: 'Guarda tus lugares y preferencias favoritos',
    chatVenues: 'Chatea directamente con establecimientos premium',
    viewAds: 'Ve anuncios y promociones exclusivas',
    bookInstantly: 'Reserva al instante y sigue tus reservas',
    createAccount: 'Crear cuenta gratis',
    alreadyHaveAccount: 'Ya tengo una cuenta',
    maybeLater: 'Quizás más tarde',
    signInTo: (f) => `Inicia sesión para ${f}`,
    defaultTitle: 'Crea una cuenta para continuar',
    defaultDesc: 'Únete a GoOn para desbloquear todas las funciones.',
    accessProfile: 'acceder a tu perfil',
    accessSettings: 'acceder a ajustes',
    createCompany: 'crear una empresa',
    manageCompany: 'gestionar tu empresa',
    manageBookings: 'gestionar reservas',
    sendMessages: 'enviar mensajes',
    accessDashboard: 'acceder al panel',
  },
  pt: {
    savePlaces: 'Salve seus lugares e preferências favoritos',
    chatVenues: 'Converse diretamente com estabelecimentos premium',
    viewAds: 'Veja anúncios e promoções exclusivas',
    bookInstantly: 'Reserve instantaneamente e acompanhe suas reservas',
    createAccount: 'Criar conta grátis',
    alreadyHaveAccount: 'Já tenho uma conta',
    maybeLater: 'Talvez mais tarde',
    signInTo: (f) => `Faça login para ${f}`,
    defaultTitle: 'Crie uma conta para continuar',
    defaultDesc: 'Junte-se ao GoOn para desbloquear todos os recursos.',
    accessProfile: 'aceder ao seu perfil',
    accessSettings: 'aceder às definições',
    createCompany: 'criar uma empresa',
    manageCompany: 'gerir a sua empresa',
    manageBookings: 'gerir reservas',
    sendMessages: 'enviar mensagens',
    accessDashboard: 'aceder ao painel',
  },
  zh: {
    savePlaces: '保存您喜爱的地点和偏好',
    chatVenues: '直接与高端场所聊天',
    viewAds: '查看独家广告和促销',
    bookInstantly: '即刻预订并追踪您的预约',
    createAccount: '免费创建账户',
    alreadyHaveAccount: '我已有账户',
    maybeLater: '稍后再说',
    signInTo: (f) => `登录以${f}`,
    defaultTitle: '创建账户以继续',
    defaultDesc: '加入GoOn，解锁所有功能。',
    accessProfile: '访问您的个人资料',
    accessSettings: '访问设置',
    createCompany: '创建公司',
    manageCompany: '管理您的公司',
    manageBookings: '管理预订',
    sendMessages: '发送消息',
    accessDashboard: '访问仪表板',
  },
  hi: {
    savePlaces: 'अपनी पसंदीदा जगहें और प्राथमिकताएं सहेजें',
    chatVenues: 'प्रीमियम स्थानों से सीधे चैट करें',
    viewAds: 'विशेष विज्ञापन और प्रमोशन देखें',
    bookInstantly: 'तुरंत बुक करें और आरक्षण ट्रैक करें',
    createAccount: 'मुफ्त खाता बनाएं',
    alreadyHaveAccount: 'मेरा पहले से खाता है',
    maybeLater: 'शायद बाद में',
    signInTo: (f) => `${f} के लिए साइन इन करें`,
    defaultTitle: 'जारी रखने के लिए खाता बनाएं',
    defaultDesc: 'सभी सुविधाएं अनलॉक करने के लिए GoOn से जुड़ें।',
    accessProfile: 'अपनी प्रोफ़ाइल तक पहुंचें',
    accessSettings: 'सेटिंग्स तक पहुंचें',
    createCompany: 'कंपनी बनाएं',
    manageCompany: 'अपनी कंपनी प्रबंधित करें',
    manageBookings: 'बुकिंग प्रबंधित करें',
    sendMessages: 'संदेश भेजें',
    accessDashboard: 'डैशबोर्ड तक पहुंचें',
  },
  ar: {
    savePlaces: 'احفظ أماكنك وتفضيلاتك المفضلة',
    chatVenues: 'تحدث مباشرة مع الأماكن المميزة',
    viewAds: 'شاهد إعلانات وعروض حصرية',
    bookInstantly: 'احجز فورا وتتبع حجوزاتك',
    createAccount: 'أنشئ حسابا مجانيا',
    alreadyHaveAccount: 'لدي حساب بالفعل',
    maybeLater: 'ربما لاحقا',
    signInTo: (f) => `سجل الدخول ل${f}`,
    defaultTitle: 'أنشئ حسابا للمتابعة',
    defaultDesc: 'انضم إلى GoOn لفتح جميع الميزات.',
    accessProfile: 'الوصول إلى ملفك الشخصي',
    accessSettings: 'الوصول إلى الإعدادات',
    createCompany: 'إنشاء شركة',
    manageCompany: 'إدارة شركتك',
    manageBookings: 'إدارة الحجوزات',
    sendMessages: 'إرسال الرسائل',
    accessDashboard: 'الوصول إلى لوحة التحكم',
  },
  bn: {
    savePlaces: 'আপনার প্রিয় স্থান এবং পছন্দ সংরক্ষণ করুন',
    chatVenues: 'প্রিমিয়াম ভেন্যুর সাথে সরাসরি চ্যাট করুন',
    viewAds: 'এক্সক্লুসিভ বিজ্ঞাপন এবং প্রচার দেখুন',
    bookInstantly: 'তাত্ক্ষণিক বুক করুন এবং রিজার্ভেশন ট্র্যাক করুন',
    createAccount: 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন',
    alreadyHaveAccount: 'আমার ইতিমধ্যে অ্যাকাউন্ট আছে',
    maybeLater: 'পরে দেখা যাবে',
    signInTo: (f) => `${f} করতে সাইন ইন করুন`,
    defaultTitle: 'চালিয়ে যেতে অ্যাকাউন্ট তৈরি করুন',
    defaultDesc: 'সকল ফিচার আনলক করতে GoOn-এ যোগ দিন।',
    accessProfile: 'আপনার প্রোফাইল অ্যাক্সেস করুন',
    accessSettings: 'সেটিংস অ্যাক্সেস করুন',
    createCompany: 'কোম্পানি তৈরি করুন',
    manageCompany: 'আপনার কোম্পানি পরিচালনা করুন',
    manageBookings: 'বুকিং পরিচালনা করুন',
    sendMessages: 'বার্তা পাঠান',
    accessDashboard: 'ড্যাশবোর্ড অ্যাক্সেস করুন',
  },
  ru: {
    savePlaces: 'Сохраняйте любимые места и предпочтения',
    chatVenues: 'Общайтесь напрямую с премиум-заведениями',
    viewAds: 'Смотрите эксклюзивные объявления и акции',
    bookInstantly: 'Бронируйте мгновенно и отслеживайте заказы',
    createAccount: 'Создать бесплатный аккаунт',
    alreadyHaveAccount: 'У меня уже есть аккаунт',
    maybeLater: 'Возможно позже',
    signInTo: (f) => `Войдите чтобы ${f}`,
    defaultTitle: 'Создайте аккаунт чтобы продолжить',
    defaultDesc: 'Присоединяйтесь к GoOn, чтобы разблокировать все функции.',
    accessProfile: 'доступ к профилю',
    accessSettings: 'доступ к настройкам',
    createCompany: 'создать компанию',
    manageCompany: 'управлять компанией',
    manageBookings: 'управлять бронированиями',
    sendMessages: 'отправлять сообщения',
    accessDashboard: 'доступ к панели управления',
  },
  ja: {
    savePlaces: 'お気に入りの場所と設定を保存',
    chatVenues: 'プレミアム施設と直接チャット',
    viewAds: '限定広告やプロモーションを見る',
    bookInstantly: '即座に予約して予約を追跡',
    createAccount: '無料アカウントを作成',
    alreadyHaveAccount: 'すでにアカウントを持っています',
    maybeLater: '後で',
    signInTo: (f) => `${f}するにはサインイン`,
    defaultTitle: '続行するにはアカウントを作成',
    defaultDesc: 'GoOnに参加してすべての機能をアンロック。',
    accessProfile: 'プロフィールにアクセス',
    accessSettings: '設定にアクセス',
    createCompany: '会社を作成',
    manageCompany: '会社を管理',
    manageBookings: '予約を管理',
    sendMessages: 'メッセージを送信',
    accessDashboard: 'ダッシュボードにアクセス',
  },
  de: {
    savePlaces: 'Lieblingsorte und Einstellungen speichern',
    chatVenues: 'Direkt mit Premium-Locations chatten',
    viewAds: 'Exklusive Anzeigen und Aktionen ansehen',
    bookInstantly: 'Sofort buchen und Reservierungen verfolgen',
    createAccount: 'Kostenloses Konto erstellen',
    alreadyHaveAccount: 'Ich habe bereits ein Konto',
    maybeLater: 'Vielleicht später',
    signInTo: (f) => `Anmelden um ${f}`,
    defaultTitle: 'Konto erstellen um fortzufahren',
    defaultDesc: 'Tritt GoOn bei, um alle Funktionen freizuschalten.',
    accessProfile: 'auf dein Profil zugreifen',
    accessSettings: 'auf Einstellungen zugreifen',
    createCompany: 'ein Unternehmen erstellen',
    manageCompany: 'dein Unternehmen verwalten',
    manageBookings: 'Buchungen verwalten',
    sendMessages: 'Nachrichten senden',
    accessDashboard: 'auf das Dashboard zugreifen',
  },
  id: {
    savePlaces: 'Simpan tempat dan preferensi favorit Anda',
    chatVenues: 'Ngobrol langsung dengan tempat premium',
    viewAds: 'Lihat iklan dan promosi eksklusif',
    bookInstantly: 'Pesan instan dan lacak reservasi',
    createAccount: 'Buat Akun Gratis',
    alreadyHaveAccount: 'Saya sudah punya akun',
    maybeLater: 'Mungkin nanti',
    signInTo: (f) => `Masuk untuk ${f}`,
    defaultTitle: 'Buat akun untuk melanjutkan',
    defaultDesc: 'Bergabung dengan GoOn untuk membuka semua fitur.',
    accessProfile: 'akses profil Anda',
    accessSettings: 'akses pengaturan',
    createCompany: 'buat perusahaan',
    manageCompany: 'kelola perusahaan Anda',
    manageBookings: 'kelola pemesanan',
    sendMessages: 'kirim pesan',
    accessDashboard: 'akses dasbor',
  },
  ur: {
    savePlaces: 'اپنی پسندیدہ جگہیں اور ترجیحات محفوظ کریں',
    chatVenues: 'پریمیم مقامات سے براہ راست چیٹ کریں',
    viewAds: 'خصوصی اشتہارات اور پروموشنز دیکھیں',
    bookInstantly: 'فوری بکنگ کریں اور ریزرویشن ٹریک کریں',
    createAccount: 'مفت اکاؤنٹ بنائیں',
    alreadyHaveAccount: 'میرا پہلے سے اکاؤنٹ ہے',
    maybeLater: 'شاید بعد میں',
    signInTo: (f) => `${f} کے لیے سائن ان کریں`,
    defaultTitle: 'جاری رکھنے کے لیے اکاؤنٹ بنائیں',
    defaultDesc: 'تمام خصوصیات کو غیر مقفل کرنے کے لیے GoOn میں شامل ہوں۔',
    accessProfile: 'اپنی پروفائل تک رسائی',
    accessSettings: 'ترتیبات تک رسائی',
    createCompany: 'کمپنی بنائیں',
    manageCompany: 'اپنی کمپنی کا انتظام کریں',
    manageBookings: 'بکنگ کا انتظام کریں',
    sendMessages: 'پیغامات بھیجیں',
    accessDashboard: 'ڈیش بورڈ تک رسائی',
  },
};

export default function AuthPromptModal({
  visible, onClose, onSignIn, onSignUp,
  title, description, featureName,
}) {
  const { language } = useLanguage();
  const lang = T[language] ? language : 'en';
  const t = T[lang];

  const benefits = useMemo(() => [
    { icon: 'bookmark', text: t.savePlaces },
    { icon: 'chatbubbles', text: t.chatVenues },
    { icon: 'eye', text: t.viewAds },
    { icon: 'calendar', text: t.bookInstantly },
  ], [lang]);

  const featureLabel = t[featureName] || featureName;
  const descKey = featureName ? 'desc_' + featureName : null;
  const defaultTitle = featureName
    ? t.signInTo(featureLabel)
    : t.defaultTitle;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={40} color="#7C3AED" />
            </View>
            <Text style={styles.title}>{title || defaultTitle}</Text>
            <Text style={styles.desc}>{description || t[descKey] || t.defaultDesc}</Text>
            <View style={styles.benefitsList}>
              {benefits.map((b, i) => (
                <View key={i} style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={b.icon} size={18} color="#7C3AED" />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={onSignUp || onClose} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t.createAccount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSignIn || onClose} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>{t.alreadyHaveAccount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.6}>
              <Text style={styles.dismissText}>{t.maybeLater}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { width: width * 0.9, maxWidth: 400, backgroundColor: '#FFF', borderRadius: 24, maxHeight: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 32, elevation: 16 },
  content: { padding: 28, alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 28, backgroundColor: '#f2eff6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  benefitsList: { width: '100%', marginBottom: 28, gap: 14 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f2eff6', justifyContent: 'center', alignItems: 'center' },
  benefitText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20, fontWeight: '500' },
  primaryBtn: { width: '100%', backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { width: '100%', backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
