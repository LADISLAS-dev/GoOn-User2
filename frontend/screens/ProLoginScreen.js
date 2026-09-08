import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { resetPassword } from '../services/authService';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { login, isLoading, enterGuestMode } = useUser();
  const { t, language, activeLanguage } = useLanguage();
  const isFrench = language === 'fr';
  const legalLang = activeLanguage || language;

  const LOGIN_UI = {
    fr: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Gérez votre boutique, entreprise, clients et réservations en un seul endroit',
      email: 'Email',
      password: 'Mot de passe',
      signIn: 'Se connecter',
      forgotPassword: 'Mot de passe oublié ?',
      noAccount: "Pas encore de compte ?",
      createAccount: 'Créer un compte',
      sendRecovery: 'Envoyer le lien de récupération',
      backToLogin: 'Retour à la connexion',
      continueAsGuest: 'Continuer sans compte',
      recoveryTitle: 'Récupérer le mot de passe',
    },
    en: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Manage your shop, company, clients, and bookings in one place',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      createAccount: 'Create one',
      sendRecovery: 'Send recovery link',
      backToLogin: 'Back to sign in',
      continueAsGuest: 'Continue as Guest',
      recoveryTitle: 'Recover password',
    },
    es: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Gestiona tu tienda, empresa, clientes y reservas en un solo lugar',
      email: 'Correo electrónico',
      password: 'Contraseña',
      signIn: 'Iniciar sesión',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      createAccount: 'Crear una',
      sendRecovery: 'Enviar enlace',
      backToLogin: 'Volver',
      continueAsGuest: 'Continuar como invitado',
      recoveryTitle: 'Recuperar contraseña',
    },
    pt: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Gerencie sua loja, empresa, clientes e reservas em um só lugar',
      email: 'E-mail',
      password: 'Senha',
      signIn: 'Entrar',
      forgotPassword: 'Esqueceu a senha?',
      noAccount: 'Não tem conta?',
      createAccount: 'Criar uma',
      sendRecovery: 'Enviar link',
      backToLogin: 'Voltar',
      continueAsGuest: 'Continuar sem conta',
      recoveryTitle: 'Recuperar senha',
    },
    zh: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: '一站式管理您的店铺、公司、客户和预约',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      forgotPassword: '忘记密码？',
      noAccount: '还没有账户？',
      createAccount: '创建一个',
      sendRecovery: '发送恢复链接',
      backToLogin: '返回登录',
      continueAsGuest: '以访客身份继续',
      recoveryTitle: '找回密码',
    },
    hi: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'अपनी दुकान, कंपनी, ग्राहक और बुकिंग एक ही जगह प्रबंधित करें',
      email: 'ईमेल',
      password: 'पासवर्ड',
      signIn: 'साइन इन करें',
      forgotPassword: 'पासवर्ड भूल गए?',
      noAccount: 'खाता नहीं है?',
      createAccount: 'खाता बनाएं',
      sendRecovery: 'रिकवरी लिंक भेजें',
      backToLogin: 'वापस जाएं',
      continueAsGuest: 'अतिथि के रूप में जारी रखें',
      recoveryTitle: 'पासवर्ड रिकवर करें',
    },
    ar: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'أدر متجرك وشركتك وعملائك وحجوزاتك في مكان واحد',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signIn: 'تسجيل الدخول',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      createAccount: 'أنشئ حساباً',
      sendRecovery: 'إرسال رابط الاستعادة',
      backToLogin: 'العودة',
      continueAsGuest: 'المتابعة كزائر',
      recoveryTitle: 'استعادة كلمة المرور',
    },
    bn: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'আপনার দোকান, কোম্পানি, ক্লায়েন্ট এবং বুকিং এক জায়গায় পরিচালনা করুন',
      email: 'ইমেইল',
      password: 'পাসওয়ার্ড',
      signIn: 'সাইন ইন',
      forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
      noAccount: 'অ্যাকাউন্ট নেই?',
      createAccount: 'একটি তৈরি করুন',
      sendRecovery: 'পুনরুদ্ধার লিঙ্ক পাঠান',
      backToLogin: 'ফিরে যান',
      continueAsGuest: 'অতিথি হিসেবে চালিয়ে যান',
      recoveryTitle: 'পাসওয়ার্ড পুনরুদ্ধার',
    },
    ru: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Управляйте магазином, компанией, клиентами и бронированиями в одном месте',
      email: 'Эл. почта',
      password: 'Пароль',
      signIn: 'Войти',
      forgotPassword: 'Забыли пароль?',
      noAccount: 'Нет аккаунта?',
      createAccount: 'Создать',
      sendRecovery: 'Отправить ссылку',
      backToLogin: 'Назад',
      continueAsGuest: 'Продолжить как гость',
      recoveryTitle: 'Восстановить пароль',
    },
    ja: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'お店、会社、顧客、予約を一か所で管理',
      email: 'メール',
      password: 'パスワード',
      signIn: 'サインイン',
      forgotPassword: 'パスワードをお忘れですか？',
      noAccount: 'アカウントをお持ちでないですか？',
      createAccount: 'アカウントを作成',
      sendRecovery: '復旧リンクを送信',
      backToLogin: '戻る',
      continueAsGuest: 'ゲストとして続行',
      recoveryTitle: 'パスワードを復旧',
    },
    de: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Verwalten Sie Ihren Shop, Ihr Unternehmen, Kunden und Buchungen an einem Ort',
      email: 'E-Mail',
      password: 'Passwort',
      signIn: 'Anmelden',
      forgotPassword: 'Passwort vergessen?',
      noAccount: 'Noch kein Konto?',
      createAccount: 'Konto erstellen',
      sendRecovery: 'Link senden',
      backToLogin: 'Zurück',
      continueAsGuest: 'Als Gast fortfahren',
      recoveryTitle: 'Passwort wiederherstellen',
    },
    id: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'Kelola toko, perusahaan, klien, dan pemesanan Anda dalam satu tempat',
      email: 'Email',
      password: 'Kata sandi',
      signIn: 'Masuk',
      forgotPassword: 'Lupa kata sandi?',
      noAccount: 'Belum punya akun?',
      createAccount: 'Buat akun',
      sendRecovery: 'Kirim tautan pemulihan',
      backToLogin: 'Kembali',
      continueAsGuest: 'Lanjutkan sebagai Tamu',
      recoveryTitle: 'Pulihkan kata sandi',
    },
    ur: {
      appBusinessTitle: 'GoOn Business',
      appBusinessSubtitle: 'اپنی دکان، کمپنی، کلائنٹس اور بکنگ ایک جگہ پر منظم کریں',
      email: 'ای میل',
      password: 'پاس ورڈ',
      signIn: 'سائن ان کریں',
      forgotPassword: 'پاس ورڈ بھول گئے؟',
      noAccount: 'اکاؤنٹ نہیں ہے؟',
      createAccount: 'اکاؤنٹ بنائیں',
      sendRecovery: 'ریکوری لنک بھیجیں',
      backToLogin: 'واپس جائیں',
      continueAsGuest: 'مہمان کے طور پر جاری رکھیں',
      recoveryTitle: 'پاس ورڈ بازیافت کریں',
    },
  };

  const u = (key) => {
    const langBlock = LOGIN_UI[activeLanguage] || LOGIN_UI[language] || LOGIN_UI.en;
    return langBlock[key] || LOGIN_UI.en[key] || key;
  };

  const LEGAL_TRANSLATIONS = {
        fr: {
          'Privacy Policy': 'Politique de confidentialité',
          'Last updated: July 22, 2026': 'Dernière mise à jour : 22 juillet 2026',
          'Terms of Service': 'Conditions d\'utilisation',
          'Last updated: August 05, 2026': 'Dernière mise à jour : 05 août 2026',
          'Cookie Policy': 'Politique de cookies',
          Contents: 'Contenu',
          '1. Introduction': '1. Introduction',
          '2. Information We Collect': '2. Informations que nous collectons',
          '3. How We Use Information': '3. Utilisation des informations',
          '4. Location Information': '4. Informations de localisation',
          '5. User Generated Content': '5. Contenu généré par les utilisateurs',
          '6. Data Sharing': '6. Partage des données',
          '7. Third-Party Services': '7. Services tiers',
          '8. Data Security': '8. Sécurité des données',
          '9. Data Retention and Account Deletion': '9. Conservation des données et suppression du compte',
          '10. Children\'s Privacy': '10. Vie privée des enfants',
          '11. Your Privacy Rights': '11. Vos droits en matière de vie privée',
          '12. Changes to This Privacy Policy': '12. Modifications de cette politique de confidentialité',
          '13. Contact Information': '13. Contact',
          'We collect the following categories of information:': 'Nous collectons les catégories d\'informations suivantes :',
          'We use the information we collect to:': 'Nous utilisons ces informations pour :',
          'Depending on your location, you may have the right to:': 'Selon votre lieu de résidence, vous pouvez avoir le droit de :',
          'GoOn Support': 'Support GoOn',
          'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business est une plateforme de gestion et de réservation locale conçue pour les boutiques, entreprises et professionnels. Via l\'application mobile GoOn, les propriétaires peuvent gérer leur profil, présenter leurs services, répondre aux messages clients, organiser les rendez-vous, publier des offres et recevoir des notifications.',
          'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Votre vie privée est importante pour nous. Cette politique de confidentialité explique quelles informations nous collectons, comment nous les utilisons et quels choix vous avez. En utilisant GoOn Business, vous acceptez les pratiques décrites dans cette politique.',
          'Account information: such as your name, email address, and phone number (if provided).': 'Informations de compte : nom, email et numéro de téléphone (si fourni).',
          'Profile information: details you add to your customer or business profile.': 'Informations de profil : détails ajoutés à votre profil commercial ou professionnel.',
          'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informations d\'entreprise : données des comptes commerciaux, incluant services, horaires, localisation et contact.',
          'Location data: collected only when you allow location access through your device.': 'Données de localisation : collectées uniquement lorsque vous autorisez l\'accès sur votre appareil pour afficher les commerces proches.',
          'Messages and communications: messages exchanged between customers and businesses through the app.': 'Messages et communications : messages échangés entre clients et entreprises dans l\'application.',
          'Appointment and booking information: details related to appointments you book or receive.': 'Informations de rendez-vous et réservations : détails des rendez-vous que vous réservez, confirmez ou recevez.',
          'Reviews and ratings: content you submit about businesses.': 'Avis et notes : contenu que vous publiez sur vos services ou votre entreprise.',
          'Photos: images uploaded by users or businesses.': 'Photos : images ajoutées par les utilisateurs ou les entreprises pour montrer produits, services ou réalisations.',
          'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informations techniques et appareil : modèle, système d\'exploitation, version de l\'application et diagnostics.',
          'Push notification information: tokens and preferences used to deliver notifications.': 'Informations de notifications push : jetons et préférences utilisés pour envoyer des notifications liées à votre activité.',
          'Create and manage user and business accounts.': 'Créer et gérer les comptes entreprises et les utilisateurs associés.',
          'Connect customers with local businesses.': 'Mettre en relation les clients avec les commerces, boutiques et professionnels à proximité.',
          'Provide messaging, booking, and related services.': 'Fournir la messagerie, les réservations, les services et le suivi commercial.',
          'Improve app functionality, reliability, and user experience.': 'Améliorer le fonctionnement, la fiabilité et l\'expérience pour les entreprises et leurs clients.',
          'Send notifications relevant to your activity and preferences.': 'Envoyer des notifications liées à votre activité, vos réservations et vos clients.',
          'Maintain the security and integrity of the platform.': 'Maintenir la sécurité et l\'intégrité de la plateforme.',
          'Provide customer support and respond to inquiries.': 'Fournir une assistance et répondre aux demandes des entreprises et professionnels.',
          'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Avec votre permission, nous utilisons la localisation de votre appareil pour vous aider à découvrir les commerces proches et améliorer les résultats locaux.',
          'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Vous pouvez activer ou désactiver l\'accès à la localisation à tout moment depuis les réglages de votre appareil. Le désactiver peut limiter certaines fonctionnalités.',
          'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Les utilisateurs et les entreprises peuvent publier du contenu sur GoOn, y compris avis, photos, profils et messages.',
          'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Vous êtes responsable du contenu publié et de sa conformité aux lois et à nos règles. GoOn peut supprimer tout contenu contraire à ces règles.',
          'GoOn does not sell your personal information.': 'GoOn ne vend pas vos informations personnelles.',
          'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Nous pouvons partager certaines informations avec des prestataires de confiance pour l\'hébergement, l\'authentification, la base de données et les notifications. Ils ne peuvent les utiliser que pour fournir ces services.',
          'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Nous pouvons aussi divulguer des informations lorsque la loi l\'exige, dans le cadre d\'une procédure ou pour protéger les droits, la sécurité et les biens de GoOn, des utilisateurs ou de tiers.',
          'GoOn may use third-party services to support the app. These services may include:': 'GoOn peut utiliser des services tiers pour faire fonctionner l\'application. Ces services peuvent inclure :',
          'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Nous mettons en place des mesures techniques et organisationnelles raisonnables pour protéger vos informations contre tout accès ou usage non autorisé.',
          'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'Cependant, aucune méthode de transmission ou de stockage électronique n\'est totalement sûre, et nous ne pouvons pas garantir une sécurité absolue.',
          'You may request deletion of your account and associated personal data at any time by contacting us.': 'Vous pouvez demander la suppression de votre compte et de vos données personnelles à tout moment en nous contactant.',
          'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Certaines informations peuvent être conservées après suppression lorsque cela est nécessaire pour respecter des obligations légales ou prévenir la fraude.',
          'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn n\'est pas conçu pour les enfants de moins de 13 ans. Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 13 ans.',
          'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Si vous pensez qu\'un enfant nous a fourni des informations personnelles, contactez-nous afin que nous puissions les supprimer.',
          'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. En cas de changement important, nous vous informerons via l\'application ou notre site. Votre utilisation continue de GoOn Business signifie que vous acceptez la version mise à jour.',
          'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'En accédant à GoOn ou en l\'utilisant, vous acceptez ces conditions d\'utilisation. Si vous n\'êtes pas d\'accord, n\'utilisez pas l\'application.',
          'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business est une plateforme de gestion, messagerie et réservation pour les boutiques, entreprises et professionnels.',
          'You must provide accurate and current information.': 'Vous devez fournir des informations exactes et à jour sur votre activité.',
          'You are responsible for maintaining the confidentiality of your account credentials.': 'Vous êtes responsable de la confidentialité des identifiants de votre compte professionnel.',
          'You are responsible for activities under your account.': 'Vous êtes responsable des activités effectuées depuis votre compte.',
          'Do not misuse, disrupt, or reverse engineer the service.': 'N\'abusez pas du service, ne le perturbez pas et ne tentez pas d\'ingénierie inverse.',
          'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'N\'envoyez pas de contenu illégal, abusif, frauduleux ou contrefaisant.',
          'Do not attempt unauthorized access to systems or data.': 'N\'essayez pas d\'accéder sans autorisation aux systèmes ou données.',
          'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Les entreprises et utilisateurs conservent la propriété de leurs contenus. En publiant sur GoOn Business, vous nous accordez une licence limitée pour l\'héberger, l\'afficher et le traiter uniquement pour faire fonctionner le service.',
          'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn facilite les réservations et les communications entre clients et entreprises. GoOn n\'est pas partie à la prestation de services réalisée par des professionnels indépendants.',
          'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Nous pouvons suspendre ou supprimer les comptes qui violent ces conditions, la loi applicable ou la sécurité de la plateforme.',
          'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'Le service est fourni "en l\'état" et "selon disponibilité", sans garantie d\'aucune sorte, dans la limite permise par la loi.',
          'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'Dans la limite maximale permise par la loi, GoOn ne peut être tenu responsable des dommages indirects, accessoires, spéciaux ou punitifs liés à l\'utilisation du service.',
          'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Nous pouvons mettre à jour ces conditions de temps à autre. L\'utilisation continue de GoOn Business vaut acceptation des conditions mises à jour.',
          'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Les cookies et technologies similaires servent à améliorer la fiabilité, la sécurité et l\'utilisation de GoOn Business.',
          'Authentication and session continuity.': 'Authentification et continuité de session.',
          'Security monitoring and fraud prevention.': 'Surveillance de sécurité et prévention de la fraude.',
          'App performance and reliability diagnostics.': 'Performance de l\'application et diagnostics de fiabilité.',
          'Notification and preference management.': 'Gestion des notifications, préférences et rappels clients.',
          'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'Sur mobile, ces technologies peuvent inclure des jetons de stockage local et des identifiants d\'appareil pour la connexion sécurisée et les notifications push.',
          'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Vous pouvez gérer les autorisations depuis les réglages de votre appareil. Les désactiver peut réduire certaines fonctions comme les notifications ou la découverte locale.',
          'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Nous pouvons mettre à jour cette politique de cookies pour refléter des évolutions techniques, légales ou produit.',
          'Firebase services': 'Services Firebase',
          'Cloud hosting providers': 'Fournisseurs d\'hébergement cloud',
          'Database services': 'Services de base de données',
          'Push notification services': 'Services de notifications push',
          'Analytics and crash reporting, if enabled': 'Analytique et rapports de crash, si activés',
          'Access the personal information we hold about you.': 'Accéder aux données personnelles que nous détenons sur vous.',
          'Update or correct your information.': 'Mettre à jour ou corriger vos informations.',
          'Request deletion of your account or personal data.': 'Demander la suppression de votre compte ou de vos données personnelles.',
          'Contact GoOn regarding privacy questions or concerns.': 'Contacter GoOn pour toute question relative à la vie privée.',
          'For legal inquiries: idealcrea@gmail.com': 'Pour les questions juridiques : idealcrea@gmail.com',
          'For cookie-related questions: idealcrea@gmail.com': 'Pour les questions relatives aux cookies : idealcrea@gmail.com',
          '1. Acceptance of Terms': '1. Acceptation des conditions',
          '2. Description of Service': '2. Description du service',
          '3. Account Responsibilities': '3. Responsabilités du compte',
          '4. Acceptable Use': '4. Utilisation acceptable',
          '5. Business Content and User Content': '5. Contenu des entreprises et des utilisateurs',
          '6. Bookings and Communications': '6. Réservations et communications',
          '7. Suspension and Termination': '7. Suspension et résiliation',
          '8. Disclaimer of Warranties': '8. Exclusion de garantie',
          '9. Limitation of Liability': '9. Limitation de responsabilité',
          '10. Changes to Terms': '10. Modifications des conditions',
          '11. Contact': '11. Contact',
          '1. What Are Cookies and Similar Technologies': '1. Que sont les cookies et technologies similaires',
          '2. How GoOn Uses Them': '2. Comment GoOn les utilise',
          '3. Mobile Environment': '3. Environnement mobile',
          '4. Your Choices': '4. Vos choix',
          '5. Updates': '5. Mises à jour',
          '6. Contact': '6. Contact',
        },
    fr: {
      'Privacy Policy': 'Politique de confidentialité',
      'Last updated: July 22, 2026': 'Dernière mise à jour : 22 juillet 2026',
      'Terms of Service': 'Conditions d\'utilisation',
      'Last updated: August 05, 2026': 'Dernière mise à jour : 05 août 2026',
      'Cookie Policy': 'Politique de cookies',
      Contents: 'Contenu',
      '1. Introduction': '1. Introduction',
      '2. Information We Collect': '2. Informations que nous collectons',
      '3. How We Use Information': '3. Utilisation des informations',
      '4. Location Information': '4. Informations de localisation',
      '5. User Generated Content': '5. Contenu généré par les utilisateurs',
      '6. Data Sharing': '6. Partage des données',
      '7. Third-Party Services': '7. Services tiers',
      '8. Data Security': '8. Sécurité des données',
      '9. Data Retention and Account Deletion': '9. Conservation des données et suppression du compte',
      '10. Children\'s Privacy': '10. Vie privée des enfants',
      '11. Your Privacy Rights': '11. Vos droits en matière de vie privée',
      '12. Changes to This Privacy Policy': '12. Modifications de cette politique de confidentialité',
      '13. Contact Information': '13. Contact',
      'We collect the following categories of information:': 'Nous collectons les catégories d\'informations suivantes :',
      'We use the information we collect to:': 'Nous utilisons ces informations pour :',
      'Depending on your location, you may have the right to:': 'Selon votre lieu de résidence, vous pouvez avoir le droit de :',
      'GoOn Support': 'Support GoOn',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business est une plateforme de gestion et de réservation locale conçue pour les boutiques, entreprises et professionnels. Via l\'application mobile GoOn, les propriétaires peuvent gérer leur profil, présenter leurs services, répondre aux messages clients, organiser les rendez-vous, publier des offres et recevoir des notifications.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Votre vie privée est importante pour nous. Cette politique de confidentialité explique quelles informations nous collectons, comment nous les utilisons et quels choix vous avez. En utilisant GoOn Business, vous acceptez les pratiques décrites dans cette politique.',
      'Account information: such as your name, email address, and phone number (if provided).': 'Informations de compte : nom, email et numéro de téléphone (si fourni).',
      'Profile information: details you add to your customer or business profile.': 'Informations de profil : détails ajoutés à votre profil commercial ou professionnel.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informations d\'entreprise : données des comptes commerciaux, incluant services, horaires, localisation et contact.',
      'Location data: collected only when you allow location access through your device.': 'Données de localisation : collectées uniquement lorsque vous autorisez l\'accès sur votre appareil pour afficher les commerces proches.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'Messages et communications : messages échangés entre clients et entreprises dans l\'application.',
      'Appointment and booking information: details related to appointments you book or receive.': 'Informations de rendez-vous et réservations : détails des rendez-vous que vous réservez, confirmez ou recevez.',
      'Reviews and ratings: content you submit about businesses.': 'Avis et notes : contenu que vous publiez sur vos services ou votre entreprise.',
      'Photos: images uploaded by users or businesses.': 'Photos : images ajoutées par les utilisateurs ou les entreprises pour montrer produits, services ou réalisations.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informations techniques et appareil : modèle, système d\'exploitation, version de l\'application et diagnostics.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'Informations de notifications push : jetons et préférences utilisés pour envoyer des notifications liées à votre activité.',
      'Create and manage user and business accounts.': 'Créer et gérer les comptes entreprises et les utilisateurs associés.',
      'Connect customers with local businesses.': 'Mettre en relation les clients avec les commerces, boutiques et professionnels à proximité.',
      'Provide messaging, booking, and related services.': 'Fournir la messagerie, les réservations, les services et le suivi commercial.',
      'Improve app functionality, reliability, and user experience.': 'Améliorer le fonctionnement, la fiabilité et l\'expérience pour les entreprises et leurs clients.',
      'Send notifications relevant to your activity and preferences.': 'Envoyer des notifications liées à votre activité, vos réservations et vos clients.',
      'Maintain the security and integrity of the platform.': 'Maintenir la sécurité et l\'intégrité de la plateforme.',
      'Provide customer support and respond to inquiries.': 'Fournir une assistance et répondre aux demandes des entreprises et professionnels.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Avec votre permission, nous utilisons la localisation de votre appareil pour vous aider à découvrir les commerces proches et améliorer les résultats locaux.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Vous pouvez activer ou désactiver l\'accès à la localisation à tout moment depuis les réglages de votre appareil. Le désactiver peut limiter certaines fonctionnalités.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Les utilisateurs et les entreprises peuvent publier du contenu sur GoOn, y compris avis, photos, profils et messages.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Vous êtes responsable du contenu publié et de sa conformité aux lois et à nos règles. GoOn peut supprimer tout contenu contraire à ces règles.',
      'GoOn does not sell your personal information.': 'GoOn ne vend pas vos informations personnelles.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Nous pouvons partager certaines informations avec des prestataires de confiance pour l\'hébergement, l\'authentification, la base de données et les notifications. Ils ne peuvent les utiliser que pour fournir ces services.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Nous pouvons aussi divulguer des informations lorsque la loi l\'exige, dans le cadre d\'une procédure ou pour protéger les droits, la sécurité et les biens de GoOn, des utilisateurs ou de tiers.',
      'GoOn may use third-party services to support the app. These services may include:': 'GoOn peut utiliser des services tiers pour faire fonctionner l\'application. Ces services peuvent inclure :',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Nous mettons en place des mesures techniques et organisationnelles raisonnables pour protéger vos informations contre tout accès ou usage non autorisé.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'Cependant, aucune méthode de transmission ou de stockage électronique n\'est totalement sûre, et nous ne pouvons pas garantir une sécurité absolue.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'Vous pouvez demander la suppression de votre compte et de vos données personnelles à tout moment en nous contactant.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Certaines informations peuvent être conservées après suppression lorsque cela est nécessaire pour respecter des obligations légales ou prévenir la fraude.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn n\'est pas conçu pour les enfants de moins de 13 ans. Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 13 ans.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Si vous pensez qu\'un enfant nous a fourni des informations personnelles, contactez-nous afin que nous puissions les supprimer.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. En cas de changement important, nous vous informerons via l\'application ou notre site. Votre utilisation continue de GoOn Business signifie que vous acceptez la version mise à jour.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'En accédant à GoOn ou en l\'utilisant, vous acceptez ces conditions d\'utilisation. Si vous n\'êtes pas d\'accord, n\'utilisez pas l\'application.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business est une plateforme de gestion, messagerie et réservation pour les boutiques, entreprises et professionnels.',
      'You must provide accurate and current information.': 'Vous devez fournir des informations exactes et à jour sur votre activité.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'Vous êtes responsable de la confidentialité des identifiants de votre compte professionnel.',
      'You are responsible for activities under your account.': 'Vous êtes responsable des activités effectuées depuis votre compte.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'N\'abusez pas du service, ne le perturbez pas et ne tentez pas d\'ingénierie inverse.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'N\'envoyez pas de contenu illégal, abusif, frauduleux ou contrefaisant.',
      'Do not attempt unauthorized access to systems or data.': 'N\'essayez pas d\'accéder sans autorisation aux systèmes ou données.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Les entreprises et utilisateurs conservent la propriété de leurs contenus. En publiant sur GoOn Business, vous nous accordez une licence limitée pour l\'héberger, l\'afficher et le traiter uniquement pour faire fonctionner le service.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn facilite les réservations et les communications entre clients et entreprises. GoOn n\'est pas partie à la prestation de services réalisée par des professionnels indépendants.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Nous pouvons suspendre ou supprimer les comptes qui violent ces conditions, la loi applicable ou la sécurité de la plateforme.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'Le service est fourni "en l\'état" et "selon disponibilité", sans garantie d\'aucune sorte, dans la limite permise par la loi.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'Dans la limite maximale permise par la loi, GoOn ne peut être tenu responsable des dommages indirects, accessoires, spéciaux ou punitifs liés à l\'utilisation du service.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Nous pouvons mettre à jour ces conditions de temps à autre. L\'utilisation continue de GoOn Business vaut acceptation des conditions mises à jour.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Les cookies et technologies similaires servent à améliorer la fiabilité, la sécurité et l\'utilisation de GoOn Business.',
      'Authentication and session continuity.': 'Authentification et continuité de session.',
      'Security monitoring and fraud prevention.': 'Surveillance de sécurité et prévention de la fraude.',
      'App performance and reliability diagnostics.': 'Performance de l\'application et diagnostics de fiabilité.',
      'Notification and preference management.': 'Gestion des notifications, préférences et rappels clients.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'Sur mobile, ces technologies peuvent inclure des jetons de stockage local et des identifiants d\'appareil pour la connexion sécurisée et les notifications push.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Vous pouvez gérer les autorisations depuis les réglages de votre appareil. Les désactiver peut réduire certaines fonctions comme les notifications ou la découverte locale.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Nous pouvons mettre à jour cette politique de cookies pour refléter des évolutions techniques, légales ou produit.',
      'Firebase services': 'Services Firebase',
      'Cloud hosting providers': 'Fournisseurs d\'hébergement cloud',
      'Database services': 'Services de base de données',
      'Push notification services': 'Services de notifications push',
      'Analytics and crash reporting, if enabled': 'Analytique et rapports de crash, si activés',
      'Access the personal information we hold about you.': 'Accéder aux données personnelles que nous détenons sur vous.',
      'Update or correct your information.': 'Mettre à jour ou corriger vos informations.',
      'Request deletion of your account or personal data.': 'Demander la suppression de votre compte ou de vos données personnelles.',
      'Contact GoOn regarding privacy questions or concerns.': 'Contacter GoOn pour toute question relative à la vie privée.',
      'For legal inquiries: idealcrea@gmail.com': 'Pour les questions juridiques : idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Pour les questions relatives aux cookies : idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. Acceptation des conditions',
      '2. Description of Service': '2. Description du service',
      '3. Account Responsibilities': '3. Responsabilités du compte',
      '4. Acceptable Use': '4. Utilisation acceptable',
      '5. Business Content and User Content': '5. Contenu des entreprises et des utilisateurs',
      '6. Bookings and Communications': '6. Réservations et communications',
      '7. Suspension and Termination': '7. Suspension et résiliation',
      '8. Disclaimer of Warranties': '8. Exclusion de garantie',
      '9. Limitation of Liability': '9. Limitation de responsabilité',
      '10. Changes to Terms': '10. Modifications des conditions',
      '11. Contact': '11. Contact',
      '1. What Are Cookies and Similar Technologies': '1. Que sont les cookies et technologies similaires',
      '2. How GoOn Uses Them': '2. Comment GoOn les utilise',
      '3. Mobile Environment': '3. Environnement mobile',
      '4. Your Choices': '4. Vos choix',
      '5. Updates': '5. Mises à jour',
      '6. Contact': '6. Contact',
    },
    zh: {
      'Privacy Policy': '隐私政策',
      'Last updated: July 22, 2026': '最后更新：2026年7月22日',
      'Terms of Service': '服务条款',
      'Last updated: August 05, 2026': '最后更新：2026年8月5日',
      'Cookie Policy': 'Cookie 政策',
      Contents: '目录',
      '1. Introduction': '1. 介绍',
      '2. Information We Collect': '2. 我们收集的信息',
      '3. How We Use Information': '3. 我们如何使用信息',
      '4. Location Information': '4. 位置信息',
      '5. User Generated Content': '5. 用户生成内容',
      '6. Data Sharing': '6. 数据共享',
      '7. Third-Party Services': '7. 第三方服务',
      '8. Data Security': '8. 数据安全',
      '9. Data Retention and Account Deletion': '9. 数据保留与账户删除',
      '10. Children\'s Privacy': '10. 儿童隐私',
      '11. Your Privacy Rights': '11. 您的隐私权利',
      '12. Changes to This Privacy Policy': '12. 本隐私政策的变更',
      '13. Contact Information': '13. 联系方式',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business 是一个面向店铺、企业和专业人士的本地业务管理与预约平台。通过 GoOn 移动应用，商家可以管理资料、展示服务、处理客户消息、安排预约、发布优惠并接收通知。',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': '您的隐私对我们很重要。本隐私政策说明我们收集哪些信息、如何使用这些信息以及您可选择的内容。使用 GoOn Business 即表示您同意本政策所述做法。',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business 是一个面向店铺、企业和专业人士的管理、消息和预约平台。',
      'You must provide accurate and current information.': '您必须提供与业务相关的准确且最新的信息。',
      'Provide customer support and respond to inquiries.': '为商家和专业人士提供支持并回复咨询。',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookie 和类似技术用于提升 GoOn Business 的可靠性、安全性和易用性。',
      'Authentication and session continuity.': '身份验证和会话连续性。',
      'Notification and preference management.': '通知、偏好和客户提醒管理。',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': '我们可能会不时更新本隐私政策。如有重大变更，我们会通过应用或网站通知您。继续使用 GoOn Business 即表示您接受更新后的政策。',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business 用于连接客户与商家。GoOn 不参与独立专业人士或商家的服务履行。',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': '访问或使用 GoOn Business 即表示您同意受本服务条款约束。如不同意，请勿使用该应用。',
      '1. Acceptance of Terms': '1. 接受条款',
      '2. Description of Service': '2. 服务说明',
      '3. Account Responsibilities': '3. 账户责任',
      '4. Acceptable Use': '4. 可接受使用',
      '5. Business Content and User Content': '5. 商家内容和用户内容',
      '6. Bookings and Communications': '6. 预约与沟通',
      '7. Suspension and Termination': '7. 暂停与终止',
      '8. Disclaimer of Warranties': '8. 免责声明',
      '9. Limitation of Liability': '9. 责任限制',
      '10. Changes to Terms': '10. 条款变更',
      '11. Contact': '11. 联系',
      '1. What Are Cookies and Similar Technologies': '1. 什么是 Cookie 和类似技术',
      '2. How GoOn Uses Them': '2. GoOn 如何使用它们',
      '3. Mobile Environment': '3. 移动环境',
      '4. Your Choices': '4. 您的选择',
      '5. Updates': '5. 更新',
      '6. Contact': '6. 联系',
    },
    hi: {
      'Privacy Policy': 'गोपनीयता नीति',
      'Last updated: July 22, 2026': 'अंतिम अपडेट: 22 जुलाई 2026',
      'Terms of Service': 'सेवा की शर्तें',
      'Last updated: August 05, 2026': 'अंतिम अपडेट: 05 अगस्त 2026',
      'Cookie Policy': 'कुकी नीति',
      Contents: 'विषय सूची',
      '1. Introduction': '1. परिचय',
      '2. Information We Collect': '2. हम कौन-सी जानकारी एकत्र करते हैं',
      '3. How We Use Information': '3. हम जानकारी का उपयोग कैसे करते हैं',
      '4. Location Information': '4. स्थान संबंधी जानकारी',
      '5. User Generated Content': '5. उपयोगकर्ता द्वारा बनाई गई सामग्री',
      '6. Data Sharing': '6. डेटा साझा करना',
      '7. Third-Party Services': '7. तृतीय-पक्ष सेवाएँ',
      '8. Data Security': '8. डेटा सुरक्षा',
      '9. Data Retention and Account Deletion': '9. डेटा संरक्षण और खाता हटाना',
      '10. Children\'s Privacy': '10. बच्चों की गोपनीयता',
      '11. Your Privacy Rights': '11. आपके गोपनीयता अधिकार',
      '12. Changes to This Privacy Policy': '12. इस गोपनीयता नीति में बदलाव',
      '13. Contact Information': '13. संपर्क जानकारी',
      'We collect the following categories of information:': 'हम निम्न श्रेणियों की जानकारी एकत्र करते हैं:',
      'Account information: such as your name, email address, and phone number (if provided).': 'खाते की जानकारी: जैसे आपका नाम, ईमेल पता और फोन नंबर (यदि प्रदान किया गया हो)।',
      'Profile information: details you add to your customer or business profile.': 'प्रोफ़ाइल जानकारी: वे विवरण जो आप अपने ग्राहक या व्यवसाय प्रोफ़ाइल में जोड़ते हैं।',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'व्यवसाय जानकारी: व्यवसाय खातों द्वारा प्रदान की गई जानकारी, जिसमें सेवाएँ, समय और संपर्क विवरण शामिल हैं।',
      'Location data: collected only when you allow location access through your device.': 'लोकेशन डेटा: केवल तब एकत्र किया जाता है जब आप अपने डिवाइस से स्थान की अनुमति देते हैं।',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'संदेश और संचार: ऐप के माध्यम से ग्राहकों और व्यवसायों के बीच आदान-प्रदान किए गए संदेश।',
      'Appointment and booking information: details related to appointments you book or receive.': 'अपॉइंटमेंट और बुकिंग जानकारी: उन अपॉइंटमेंट से संबंधित विवरण जिन्हें आप बुक करते हैं या प्राप्त करते हैं।',
      'Reviews and ratings: content you submit about businesses.': 'समीक्षाएँ और रेटिंग: व्यवसायों के बारे में आपके द्वारा भेजी गई सामग्री।',
      'Photos: images uploaded by users or businesses.': 'फोटो: उपयोगकर्ताओं या व्यवसायों द्वारा अपलोड की गई छवियाँ।',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'डिवाइस जानकारी और तकनीकी डेटा: जैसे डिवाइस मॉडल, ऑपरेटिंग सिस्टम, ऐप संस्करण और निदान जानकारी।',
      'Push notification information: tokens and preferences used to deliver notifications.': 'पुश नोटिफिकेशन जानकारी: नोटिफिकेशन भेजने के लिए उपयोग किए जाने वाले टोकन और प्राथमिकताएँ।',
      'We use the information we collect to:': 'हम एकत्र की गई जानकारी का उपयोग इन उद्देश्यों के लिए करते हैं:',
      'Create and manage user and business accounts.': 'उपयोगकर्ता और व्यवसाय खाते बनाना और प्रबंधित करना।',
      'Connect customers with local businesses.': 'ग्राहकों को स्थानीय व्यवसायों से जोड़ना।',
      'Provide messaging, booking, and related services.': 'मैसेजिंग, बुकिंग और संबंधित सेवाएँ प्रदान करना।',
      'Improve app functionality, reliability, and user experience.': 'ऐप की कार्यक्षमता, विश्वसनीयता और उपयोगकर्ता अनुभव में सुधार करना।',
      'Send notifications relevant to your activity and preferences.': 'आपकी गतिविधि और प्राथमिकताओं से संबंधित नोटिफिकेशन भेजना।',
      'Maintain the security and integrity of the platform.': 'प्लेटफ़ॉर्म की सुरक्षा और अखंडता बनाए रखना।',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'आपकी अनुमति से, हम आपके डिवाइस की लोकेशन का उपयोग पास के व्यवसाय खोजने और स्थानीय खोज परिणाम बेहतर करने के लिए करते हैं।',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'आप डिवाइस सेटिंग्स से किसी भी समय लोकेशन एक्सेस चालू या बंद कर सकते हैं। इसे बंद करने से ऐप की कुछ सुविधाएँ सीमित हो सकती हैं।',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'उपयोगकर्ता और व्यवसाय GoOn पर सामग्री जमा कर सकते हैं, जिसमें समीक्षाएँ, फोटो, प्रोफ़ाइल विवरण और संदेश शामिल हैं।',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'आप अपनी जमा की गई सामग्री के लिए जिम्मेदार हैं और यह सुनिश्चित करने के लिए भी कि वह लागू कानूनों और हमारी नीतियों का पालन करती है। GoOn ऐसी सामग्री हटा सकता है जो नीतियों या कानून का उल्लंघन करती हो।',
      'GoOn does not sell your personal information.': 'GoOn आपकी व्यक्तिगत जानकारी नहीं बेचता।',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'हम जानकारी को भरोसेमंद सेवा प्रदाताओं के साथ साझा कर सकते हैं जो ऐप चलाने में मदद करते हैं, जैसे होस्टिंग, ऑथेंटिकेशन, डेटाबेस और नोटिफिकेशन प्रदाता। इन्हें आपकी जानकारी का उपयोग केवल आवश्यक सेवा प्रदान करने के लिए ही करने की अनुमति है।',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'कानून, कानूनी प्रक्रिया, या GoOn, हमारे उपयोगकर्ताओं या अन्य की सुरक्षा, अधिकार और संपत्ति की रक्षा के लिए आवश्यकता होने पर हम जानकारी प्रकट कर सकते हैं।',
      'GoOn may use third-party services to support the app. These services may include:': 'GoOn ऐप के समर्थन के लिए तृतीय-पक्ष सेवाओं का उपयोग कर सकता है। इनमें शामिल हो सकती हैं:',
      'Firebase services': 'Firebase सेवाएँ',
      'Cloud hosting providers': 'क्लाउड होस्टिंग प्रदाता',
      'Database services': 'डेटाबेस सेवाएँ',
      'Push notification services': 'पुश नोटिफिकेशन सेवाएँ',
      'Analytics and crash reporting, if enabled': 'विश्लेषण और क्रैश रिपोर्टिंग, यदि सक्षम हो',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'हम आपकी जानकारी को अनधिकृत पहुँच, खुलासे, परिवर्तन या नष्ट होने से बचाने के लिए उचित तकनीकी और संगठनात्मक उपाय अपनाते हैं।',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'हालाँकि, इंटरनेट पर ट्रांसमिशन या इलेक्ट्रॉनिक स्टोरेज का कोई भी तरीका 100% सुरक्षित नहीं है, और हम पूर्ण सुरक्षा की गारंटी नहीं दे सकते।',
      'For legal inquiries: idealcrea@gmail.com': 'कानूनी पूछताछ के लिए: idealcrea@gmail.com',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'हम समय-समय पर इन शर्तों को अपडेट कर सकते हैं। अपडेट के बाद GoOn का निरंतर उपयोग संशोधित शर्तों की स्वीकृति माना जाएगा।',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business दुकानों, कंपनियों और पेशेवरों के लिए बनाया गया एक लोकल व्यवसाय प्रबंधन और बुकिंग प्लेटफ़ॉर्म है। मोबाइल ऐप के जरिए व्यवसाय मालिक प्रोफ़ाइल, सेवाएँ, ग्राहक संदेश, अपॉइंटमेंट, ऑफ़र और सूचनाएँ संभाल सकते हैं।',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'आपकी गोपनीयता हमारे लिए महत्वपूर्ण है। यह नीति बताती है कि हम कौन-सी जानकारी एकत्र करते हैं, उसका उपयोग कैसे करते हैं और आपके विकल्प क्या हैं। GoOn Business का उपयोग करने पर आप इस नीति से सहमत होते हैं।',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business दुकानों, कंपनियों और पेशेवरों के लिए एक प्रबंधन, संदेश और बुकिंग प्लेटफ़ॉर्म है।',
      'You must provide accurate and current information.': 'आपको अपने व्यवसाय से जुड़ी सटीक और अद्यतन जानकारी देनी होगी।',
      'Provide customer support and respond to inquiries.': 'व्यवसाय और पेशेवरों को सहायता देना और पूछताछ का जवाब देना।',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'कुकीज़ और समान तकनीकें GoOn Business की विश्वसनीयता, सुरक्षा और उपयोगिता सुधारने के लिए उपयोग की जाती हैं।',
      'Authentication and session continuity.': 'प्रमाणीकरण और सत्र निरंतरता।',
      'Notification and preference management.': 'सूचनाएँ, प्राथमिकताएँ और ग्राहक रिमाइंडर प्रबंधन।',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'हम समय-समय पर इस नीति को अपडेट कर सकते हैं। महत्वपूर्ण बदलाव होने पर हम ऐप या वेबसाइट के माध्यम से सूचना देंगे। GoOn Business का उपयोग जारी रखने का अर्थ है कि आप अपडेट की गई नीति स्वीकार करते हैं।',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business ग्राहकों और व्यवसायों के बीच बुकिंग और संचार को सरल बनाता है। यह स्वतंत्र व्यवसायों की सेवाओं के निष्पादन का पक्ष नहीं है।',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'GoOn Business का उपयोग करने पर आप इन सेवा शर्तों से सहमत होते हैं। यदि सहमत नहीं हैं, तो ऐप का उपयोग न करें।',
      '1. Acceptance of Terms': '1. शर्तों की स्वीकृति',
      '2. Description of Service': '2. सेवा का विवरण',
      '3. Account Responsibilities': '3. खाता ज़िम्मेदारियाँ',
      '4. Acceptable Use': '4. स्वीकार्य उपयोग',
      '5. Business Content and User Content': '5. व्यवसाय और उपयोगकर्ता सामग्री',
      '6. Bookings and Communications': '6. बुकिंग और संचार',
      '7. Suspension and Termination': '7. निलंबन और समाप्ति',
      '8. Disclaimer of Warranties': '8. वारंटी अस्वीकरण',
      '9. Limitation of Liability': '9. दायित्व की सीमा',
      '10. Changes to Terms': '10. शर्तों में बदलाव',
      '11. Contact': '11. संपर्क',
      '1. What Are Cookies and Similar Technologies': '1. कुकीज़ और समान तकनीकें क्या हैं',
      '2. How GoOn Uses Them': '2. GoOn उनका उपयोग कैसे करता है',
      '3. Mobile Environment': '3. मोबाइल वातावरण',
      '4. Your Choices': '4. आपके विकल्प',
      '5. Updates': '5. अपडेट',
      '6. Contact': '6. संपर्क',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'आप अपने खाते के लॉगिन विवरण की गोपनीयता बनाए रखने के लिए जिम्मेदार हैं।',
      'You are responsible for activities under your account.': 'आप अपने खाते के अंतर्गत होने वाली गतिविधियों के लिए जिम्मेदार हैं।',
      'Do not misuse, disrupt, or reverse engineer the service.': 'सेवा का दुरुपयोग, व्यवधान या रिवर्स इंजीनियरिंग न करें।',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'अवैध, अपमानजनक, धोखाधड़ीपूर्ण या अधिकार-उल्लंघन वाला सामग्री न भेजें।',
      'Do not attempt unauthorized access to systems or data.': 'सिस्टम या डेटा तक अनधिकृत पहुँच का प्रयास न करें।',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'व्यवसाय और उपयोगकर्ता अपनी सामग्री के स्वामी बने रहते हैं। GoOn पर सामग्री भेजकर आप हमें केवल सेवा चलाने के लिए उसे होस्ट, प्रदर्शित और संसाधित करने का सीमित लाइसेंस देते हैं।',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn ग्राहकों और व्यवसायों के बीच बुकिंग और संचार को आसान बनाता है। GoOn स्वतंत्र व्यवसायों द्वारा दी जाने वाली सेवाओं का पक्ष नहीं है।',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'हम उन खातों को निलंबित या समाप्त कर सकते हैं जो इन शर्तों, लागू कानून या प्लेटफ़ॉर्म सुरक्षा आवश्यकताओं का उल्लंघन करते हैं।',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'यह सेवा "जैसी है" और "जैसी उपलब्ध है" के आधार पर दी जाती है, और कानून द्वारा अनुमति की गई सीमा तक किसी भी प्रकार की वारंटी नहीं दी जाती।',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'कानून द्वारा अनुमत अधिकतम सीमा तक, आपके द्वारा सेवा उपयोग से उत्पन्न अप्रत्यक्ष, आकस्मिक, विशेष, परिणामी या दंडात्मक क्षति के लिए GoOn उत्तरदायी नहीं होगा।',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'आप हमसे संपर्क करके किसी भी समय अपने खाते और उससे जुड़े व्यक्तिगत डेटा को हटाने का अनुरोध कर सकते हैं।',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'कुछ जानकारी खाता हटाने के बाद भी रखी जा सकती है यदि यह कानूनी दायित्वों को पूरा करने, विवाद सुलझाने, धोखाधड़ी रोकने या हमारे समझौतों को लागू करने के लिए आवश्यक हो।',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn 13 वर्ष से कम आयु के बच्चों के लिए बनाई गई या लक्षित नहीं है। हम जानबूझकर 13 वर्ष से कम आयु के बच्चों से व्यक्तिगत जानकारी एकत्र नहीं करते।',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'यदि आपको लगता है कि किसी बच्चे ने हमें व्यक्तिगत जानकारी दी है, तो कृपया हमसे संपर्क करें ताकि हम उसे हटाने के लिए उचित कदम उठा सकें।',
      'Depending on your location, you may have the right to:': 'आपके स्थान के आधार पर, आपके पास निम्न अधिकार हो सकते हैं:',
      'Access the personal information we hold about you.': 'हमारे पास आपके बारे में मौजूद व्यक्तिगत जानकारी तक पहुंचें।',
      'Update or correct your information.': 'अपनी जानकारी को अपडेट या सही करें।',
      'Request deletion of your account or personal data.': 'अपने खाते या व्यक्तिगत डेटा को हटाने का अनुरोध करें।',
      'Contact GoOn regarding privacy questions or concerns.': 'गोपनीयता से जुड़े प्रश्नों या चिंताओं के लिए GoOn से संपर्क करें।',
      'GoOn Support': 'GoOn सहायता',
      'Email: idealcrea@gmail.com': 'ईमेल: idealcrea@gmail.com',
      '© 2026 GoOn. All rights reserved.': '© 2026 GoOn. सर्वाधिकार सुरक्षित।',
      'Security monitoring and fraud prevention.': 'सुरक्षा निगरानी और धोखाधड़ी रोकथाम।',
      'App performance and reliability diagnostics.': 'ऐप प्रदर्शन और विश्वसनीयता निदान।',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'मोबाइल पर, इन तकनीकों में सुरक्षित लॉगिन और पुश नोटिफिकेशन के लिए स्थानीय संग्रहण टोकन और डिवाइस-स्तरीय पहचानकर्ता शामिल हो सकते हैं।',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'तकनीक, कानूनी आवश्यकताओं या उत्पाद सुविधाओं में बदलाव को दर्शाने के लिए हम इस कुकी नीति को अपडेट कर सकते हैं।',
      'For cookie-related questions: idealcrea@gmail.com': 'कुकी से संबंधित प्रश्नों के लिए: idealcrea@gmail.com',
    },
    ar: {
      'Privacy Policy': 'سياسة الخصوصية',
      'Last updated: July 22, 2026': 'آخر تحديث: 22 يوليو 2026',
      'Terms of Service': 'شروط الخدمة',
      'Last updated: August 05, 2026': 'آخر تحديث: 05 أغسطس 2026',
      'Cookie Policy': 'سياسة ملفات الارتباط',
      Contents: 'المحتويات',
      '1. Introduction': '1. المقدمة',
      '2. Information We Collect': '2. المعلومات التي نجمعها',
      '3. How We Use Information': '3. كيف نستخدم المعلومات',
      '4. Location Information': '4. معلومات الموقع',
      '5. User Generated Content': '5. المحتوى الذي ينشئه المستخدمون',
      '6. Data Sharing': '6. مشاركة البيانات',
      '7. Third-Party Services': '7. خدمات الطرف الثالث',
      '8. Data Security': '8. أمان البيانات',
      '9. Data Retention and Account Deletion': '9. الاحتفاظ بالبيانات وحذف الحساب',
      '10. Children\'s Privacy': '10. خصوصية الأطفال',
      '11. Your Privacy Rights': '11. حقوق الخصوصية الخاصة بك',
      '12. Changes to This Privacy Policy': '12. التغييرات على سياسة الخصوصية',
      '13. Contact Information': '13. معلومات الاتصال',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business منصة محلية لإدارة الأعمال والحجوزات مخصصة للمتاجر والشركات والمحترفين. عبر التطبيق يمكن لأصحاب الأعمال إدارة الملف التجاري وعرض الخدمات والرسائل وتنظيم المواعيد ونشر العروض واستلام الإشعارات.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'خصوصيتك مهمة لنا. تشرح هذه السياسة ما هي المعلومات التي نجمعها وكيف نستخدمها والخيارات المتاحة لك. باستخدام GoOn Business فإنك توافق على ما ورد هنا.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business منصة لإدارة الأعمال والرسائل والحجوزات للمتاجر والشركات والمحترفين.',
      'You must provide accurate and current information.': 'يجب عليك تقديم معلومات دقيقة ومحدثة عن نشاطك التجاري.',
      'Provide customer support and respond to inquiries.': 'تقديم الدعم والرد على استفسارات الشركات والمحترفين.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'تُستخدم ملفات الارتباط والتقنيات المشابهة لتحسين الموثوقية والأمان وسهولة الاستخدام في GoOn Business.',
      'Authentication and session continuity.': 'المصادقة واستمرارية الجلسة.',
      'Notification and preference management.': 'إدارة الإشعارات والتفضيلات وتذكير العملاء.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. عند وجود تغييرات مهمة سنُخطرك عبر التطبيق أو الموقع. استمرار استخدام GoOn Business يعني قبولك للإصدار المحدث.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'يسهّل GoOn Business الحجوزات والتواصل بين العملاء والأعمال. وهو ليس طرفًا في تنفيذ خدمات مزودي الخدمة المستقلين.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'عند استخدام GoOn Business فإنك توافق على شروط الخدمة هذه. إذا كنت لا توافق، فلا تستخدم التطبيق.',
      '1. Acceptance of Terms': '1. قبول الشروط',
      '2. Description of Service': '2. وصف الخدمة',
      '3. Account Responsibilities': '3. مسؤوليات الحساب',
      '4. Acceptable Use': '4. الاستخدام المقبول',
      '5. Business Content and User Content': '5. محتوى الأعمال ومحتوى المستخدم',
      '6. Bookings and Communications': '6. الحجوزات والتواصل',
      '7. Suspension and Termination': '7. الإيقاف والإنهاء',
      '8. Disclaimer of Warranties': '8. إخلاء المسؤولية عن الضمانات',
      '9. Limitation of Liability': '9. تحديد المسؤولية',
      '10. Changes to Terms': '10. التغييرات على الشروط',
      '11. Contact': '11. الاتصال',
      '1. What Are Cookies and Similar Technologies': '1. ما هي ملفات الارتباط والتقنيات المشابهة',
      '2. How GoOn Uses Them': '2. كيف يستخدمها GoOn',
      '3. Mobile Environment': '3. بيئة الهاتف',
      '4. Your Choices': '4. خياراتك',
      '5. Updates': '5. التحديثات',
      '6. Contact': '6. الاتصال',
    },
    bn: {
      'Privacy Policy': 'গোপনীয়তা নীতি',
      'Last updated: July 22, 2026': 'সর্বশেষ আপডেট: 22 জুলাই 2026',
      'Terms of Service': 'সেবার শর্তাবলী',
      'Last updated: August 05, 2026': 'সর্বশেষ আপডেট: 05 আগস্ট 2026',
      'Cookie Policy': 'কুকি নীতি',
      Contents: 'সূচিপত্র',
      '1. Introduction': '1. ভূমিকা',
      '2. Information We Collect': '2. আমরা যে তথ্য সংগ্রহ করি',
      '3. How We Use Information': '3. আমরা তথ্য কীভাবে ব্যবহার করি',
      '4. Location Information': '4. অবস্থান সম্পর্কিত তথ্য',
      '5. User Generated Content': '5. ব্যবহারকারীর তৈরি কনটেন্ট',
      '6. Data Sharing': '6. তথ্য ভাগাভাগি',
      '7. Third-Party Services': '7. তৃতীয়-পক্ষ সেবা',
      '8. Data Security': '8. তথ্যের নিরাপত্তা',
      '9. Data Retention and Account Deletion': '9. তথ্য সংরক্ষণ ও অ্যাকাউন্ট মুছে ফেলা',
      '10. Children\'s Privacy': '10. শিশুদের গোপনীয়তা',
      '11. Your Privacy Rights': '11. আপনার গোপনীয়তা অধিকার',
      '12. Changes to This Privacy Policy': '12. এই নীতির পরিবর্তন',
      '13. Contact Information': '13. যোগাযোগের তথ্য',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business দোকান, কোম্পানি এবং পেশাজীবীদের জন্য তৈরি একটি লোকাল ব্যবসা ব্যবস্থাপনা ও বুকিং প্ল্যাটফর্ম। অ্যাপের মাধ্যমে ব্যবসার মালিকরা প্রোফাইল, সেবা, বার্তা, অ্যাপয়েন্টমেন্ট, অফার ও নোটিফিকেশন পরিচালনা করতে পারেন।',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। এই নীতিতে আমরা কী তথ্য সংগ্রহ করি, কীভাবে ব্যবহার করি এবং আপনার কী বিকল্প আছে তা ব্যাখ্যা করা হয়েছে। GoOn Business ব্যবহার করলে আপনি এই নীতিতে সম্মত হন।',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business দোকান, কোম্পানি এবং পেশাজীবীদের জন্য একটি ব্যবস্থাপনা, বার্তা ও বুকিং প্ল্যাটফর্ম।',
      'You must provide accurate and current information.': 'আপনাকে আপনার ব্যবসা সম্পর্কে সঠিক ও হালনাগাদ তথ্য দিতে হবে।',
      'Provide customer support and respond to inquiries.': 'ব্যবসা ও পেশাজীবীদের সহায়তা প্রদান ও প্রশ্নের উত্তর দেওয়া।',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'কুকি ও অনুরূপ প্রযুক্তি GoOn Business-এর নির্ভরযোগ্যতা, নিরাপত্তা ও ব্যবহারযোগ্যতা বাড়াতে ব্যবহৃত হয়।',
      'Authentication and session continuity.': 'প্রমাণীকরণ ও সেশন ধারাবাহিকতা।',
      'Notification and preference management.': 'নোটিফিকেশন, পছন্দ ও ক্লায়েন্ট রিমাইন্ডার ব্যবস্থাপনা।',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'আমরা সময়ে সময়ে এই নীতি আপডেট করতে পারি। গুরুত্বপূর্ণ পরিবর্তন হলে অ্যাপ বা ওয়েবসাইটে জানানো হবে। GoOn Business ব্যবহার চালিয়ে গেলে আপনি হালনাগাদ নীতি মেনে নিচ্ছেন।',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business গ্রাহক ও ব্যবসার মধ্যে বুকিং ও যোগাযোগ সহজ করে। এটি স্বাধীন সেবাদাতার সেবার পক্ষ নয়।',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'GoOn Business ব্যবহার করলে আপনি এই শর্তাবলীতে সম্মত হন। সম্মত না হলে অ্যাপ ব্যবহার করবেন না।',
      '1. Acceptance of Terms': '1. শর্ত গ্রহণ',
      '2. Description of Service': '2. সেবার বিবরণ',
      '3. Account Responsibilities': '3. অ্যাকাউন্ট দায়িত্ব',
      '4. Acceptable Use': '4. গ্রহণযোগ্য ব্যবহার',
      '5. Business Content and User Content': '5. ব্যবসায়িক ও ব্যবহারকারীর কনটেন্ট',
      '6. Bookings and Communications': '6. বুকিং ও যোগাযোগ',
      '7. Suspension and Termination': '7. স্থগিতকরণ ও সমাপ্তি',
      '8. Disclaimer of Warranties': '8. ওয়ারেন্টি অস্বীকার',
      '9. Limitation of Liability': '9. দায়বদ্ধতার সীমাবদ্ধতা',
      '10. Changes to Terms': '10. শর্তের পরিবর্তন',
      '11. Contact': '11. যোগাযোগ',
      '1. What Are Cookies and Similar Technologies': '1. কুকি ও অনুরূপ প্রযুক্তি কী',
      '2. How GoOn Uses Them': '2. GoOn সেগুলো কীভাবে ব্যবহার করে',
      '3. Mobile Environment': '3. মোবাইল পরিবেশ',
      '4. Your Choices': '4. আপনার বিকল্প',
      '5. Updates': '5. আপডেট',
      '6. Contact': '6. যোগাযোগ',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn একটি স্থানীয় ব্যবসা অনুসন্ধান ও বুকিং প্ল্যাটফর্ম, যা গ্রাহকদের স্থানীয় ব্যবসার সাথে সংযুক্ত করে। GoOn মোবাইল অ্যাপের মাধ্যমে গ্রাহকরা ব্যবসা খুঁজে পেতে, প্রোফাইল দেখতে, বার্তা বিনিময় করতে, অ্যাপয়েন্টমেন্ট বুক করতে, রিভিউ দিতে এবং নোটিফিকেশন পেতে পারেন। ব্যবসাগুলো তাদের প্রোফাইল পরিচালনা, গ্রাহকদের সাথে যোগাযোগ, অ্যাপয়েন্টমেন্ট ম্যানেজ এবং সেবা প্রচার করতে পারে।',
      'We collect the following categories of information:': 'আমরা নিম্নলিখিত ধরনের তথ্য সংগ্রহ করি:',
      'Account information: such as your name, email address, and phone number (if provided).': 'অ্যাকাউন্ট তথ্য: যেমন আপনার নাম, ইমেইল ঠিকানা এবং ফোন নম্বর (প্রযোজ্য হলে)।',
      'Profile information: details you add to your customer or business profile.': 'প্রোফাইল তথ্য: আপনি আপনার গ্রাহক বা ব্যবসায়িক প্রোফাইলে যে তথ্য যোগ করেন।',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'ব্যবসায়িক তথ্য: ব্যবসায়িক অ্যাকাউন্ট থেকে দেওয়া তথ্য, যেমন সেবা, সময়সূচি এবং যোগাযোগের তথ্য।',
      'Location data: collected only when you allow location access through your device.': 'লোকেশন ডেটা: কেবল তখনই সংগ্রহ করা হয় যখন আপনি আপনার ডিভাইস থেকে লোকেশন অ্যাক্সেস অনুমতি দেন।',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'বার্তা ও যোগাযোগ: অ্যাপের মাধ্যমে গ্রাহক ও ব্যবসার মধ্যে বিনিময় হওয়া বার্তাসমূহ।',
      'Appointment and booking information: details related to appointments you book or receive.': 'অ্যাপয়েন্টমেন্ট ও বুকিং তথ্য: আপনি যে অ্যাপয়েন্টমেন্ট বুক করেন বা পান, তার সম্পর্কিত তথ্য।',
      'Reviews and ratings: content you submit about businesses.': 'রিভিউ ও রেটিং: ব্যবসা সম্পর্কে আপনি যে কনটেন্ট জমা দেন।',
      'Photos: images uploaded by users or businesses.': 'ছবি: ব্যবহারকারী বা ব্যবসা কর্তৃক আপলোড করা ছবি।',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'ডিভাইস ও প্রযুক্তিগত তথ্য: যেমন ডিভাইস মডেল, অপারেটিং সিস্টেম, অ্যাপ ভার্সন এবং ডায়াগনস্টিক তথ্য।',
      'Push notification information: tokens and preferences used to deliver notifications.': 'পুশ নোটিফিকেশন তথ্য: নোটিফিকেশন পাঠাতে ব্যবহৃত টোকেন ও পছন্দসমূহ।',
      'We use the information we collect to:': 'আমরা সংগ্রহ করা তথ্য ব্যবহার করি:',
      'Create and manage user and business accounts.': 'ব্যবহারকারী ও ব্যবসায়িক অ্যাকাউন্ট তৈরি ও পরিচালনা করতে।',
      'Connect customers with local businesses.': 'গ্রাহকদের স্থানীয় ব্যবসার সাথে যুক্ত করতে।',
      'Provide messaging, booking, and related services.': 'মেসেজিং, বুকিং ও সংশ্লিষ্ট সেবা দিতে।',
      'Improve app functionality, reliability, and user experience.': 'অ্যাপের কার্যকারিতা, নির্ভরযোগ্যতা ও ব্যবহারকারীর অভিজ্ঞতা উন্নত করতে।',
      'Send notifications relevant to your activity and preferences.': 'আপনার কার্যকলাপ ও পছন্দ অনুযায়ী প্রাসঙ্গিক নোটিফিকেশন পাঠাতে।',
      'Maintain the security and integrity of the platform.': 'প্ল্যাটফর্মের নিরাপত্তা ও অখণ্ডতা বজায় রাখতে।',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'আপনার অনুমতিতে, আমরা আপনার ডিভাইসের লোকেশন ব্যবহার করি যাতে আপনি কাছাকাছি ব্যবসা খুঁজে পান এবং স্থানীয় সার্চ ফলাফল উন্নত হয়।',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'আপনি ডিভাইস সেটিংস থেকে যেকোনো সময় লোকেশন অ্যাক্সেস চালু বা বন্ধ করতে পারেন। এটি বন্ধ করলে অ্যাপের কিছু ফিচার সীমিত হতে পারে।',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'ব্যবহারকারী ও ব্যবসা GoOn-এ কনটেন্ট জমা দিতে পারে, যেমন রিভিউ, ছবি, প্রোফাইল তথ্য ও বার্তা।',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'আপনি যে কনটেন্ট জমা দেন তার জন্য আপনি দায়ী, এবং তা প্রযোজ্য আইন ও আমাদের নীতিমালার সাথে সামঞ্জস্যপূর্ণ কি না তা নিশ্চিত করা আপনার দায়িত্ব। GoOn আমাদের নীতি বা আইন ভঙ্গকারী কনটেন্ট সরিয়ে দিতে পারে।',
      'GoOn does not sell your personal information.': 'GoOn আপনার ব্যক্তিগত তথ্য বিক্রি করে না।',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'আমরা অ্যাপ পরিচালনায় সহায়তাকারী বিশ্বস্ত সেবা প্রদানকারীদের সঙ্গে তথ্য শেয়ার করতে পারি, যেমন হোস্টিং, অথেন্টিকেশন, ডাটাবেস ও নোটিফিকেশন প্রদানকারী। এসব প্রদানকারী আপনার তথ্য কেবল আমাদের সেবা দেওয়ার প্রয়োজন অনুযায়ী ব্যবহার করতে পারে।',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'আইনের প্রয়োজন, আইনি প্রক্রিয়া, বা GoOn, আমাদের ব্যবহারকারী বা অন্যদের অধিকার, নিরাপত্তা ও সম্পদ রক্ষার প্রয়োজনে আমরা তথ্য প্রকাশ করতে পারি।',
      'GoOn may use third-party services to support the app. These services may include:': 'অ্যাপ সমর্থনের জন্য GoOn তৃতীয় পক্ষের সেবা ব্যবহার করতে পারে। এসব সেবার মধ্যে থাকতে পারে:',
      'Firebase services': 'Firebase সেবা',
      'Cloud hosting providers': 'ক্লাউড হোস্টিং প্রদানকারী',
      'Database services': 'ডাটাবেস সেবা',
      'Push notification services': 'পুশ নোটিফিকেশন সেবা',
      'Analytics and crash reporting, if enabled': 'অ্যানালিটিক্স এবং ক্র্যাশ রিপোর্টিং, যদি সক্রিয় থাকে',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'অননুমোদিত প্রবেশ, প্রকাশ, পরিবর্তন বা ধ্বংস থেকে আপনার তথ্য রক্ষা করতে আমরা যৌক্তিক প্রযুক্তিগত ও সাংগঠনিক ব্যবস্থা ব্যবহার করি।',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'তবে ইন্টারনেটে তথ্য আদান-প্রদান বা ইলেকট্রনিক সংরক্ষণের কোনো পদ্ধতিই ১০০% নিরাপদ নয়, এবং আমরা সম্পূর্ণ নিরাপত্তা নিশ্চিত করতে পারি না।',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'আমাদের সাথে যোগাযোগ করে আপনি যেকোনো সময় আপনার অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত ডেটা মুছে ফেলার অনুরোধ করতে পারেন।',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'আইনি বাধ্যবাধকতা পূরণ, বিরোধ নিষ্পত্তি, জালিয়াতি প্রতিরোধ বা আমাদের চুক্তি কার্যকর করার জন্য অ্যাকাউন্ট মুছে ফেলার পরও কিছু তথ্য সংরক্ষিত থাকতে পারে।',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn ১৩ বছরের কম বয়সী শিশুদের জন্য তৈরি বা নির্দেশিত নয়। আমরা জেনে শুনে ১৩ বছরের কম বয়সী শিশুদের ব্যক্তিগত তথ্য সংগ্রহ করি না।',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'আপনি যদি মনে করেন কোনো শিশু আমাদের ব্যক্তিগত তথ্য দিয়েছে, দয়া করে আমাদের সঙ্গে যোগাযোগ করুন যাতে আমরা তা অপসারণের যথাযথ ব্যবস্থা নিতে পারি।',
      'Depending on your location, you may have the right to:': 'আপনার অবস্থান অনুযায়ী, আপনার নিম্নলিখিত অধিকার থাকতে পারে:',
      'Access the personal information we hold about you.': 'আমাদের কাছে থাকা আপনার ব্যক্তিগত তথ্যে প্রবেশাধিকার।',
      'Update or correct your information.': 'আপনার তথ্য হালনাগাদ বা সংশোধন করা।',
      'Request deletion of your account or personal data.': 'আপনার অ্যাকাউন্ট বা ব্যক্তিগত ডেটা মুছে ফেলার অনুরোধ করা।',
      'Contact GoOn regarding privacy questions or concerns.': 'গোপনীয়তা সম্পর্কিত প্রশ্ন বা উদ্বেগে GoOn-এর সাথে যোগাযোগ করা।',
      'GoOn Support': 'GoOn সহায়তা',
      'Email: idealcrea@gmail.com': 'ইমেইল: idealcrea@gmail.com',
      '© 2026 GoOn. All rights reserved.': '© 2026 GoOn. সর্বস্বত্ব সংরক্ষিত।',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'আপনার অ্যাকাউন্টের শংসাপত্রের গোপনীয়তা রক্ষা করার দায়িত্ব আপনার।',
      'You are responsible for activities under your account.': 'আপনার অ্যাকাউন্টের অধীনে সম্পাদিত কার্যকলাপের জন্য আপনি দায়ী।',
      'Do not misuse, disrupt, or reverse engineer the service.': 'সেবার অপব্যবহার, বিঘ্ন সৃষ্টি বা রিভার্স ইঞ্জিনিয়ারিং করবেন না।',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'অবৈধ, অপব্যবহারমূলক, প্রতারণামূলক বা অধিকার লঙ্ঘনকারী কনটেন্ট জমা দেবেন না।',
      'Do not attempt unauthorized access to systems or data.': 'সিস্টেম বা ডেটায় অননুমোদিত প্রবেশের চেষ্টা করবেন না।',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'ব্যবসা ও ব্যবহারকারীরা তাদের কনটেন্টের মালিকানা ধরে রাখেন। GoOn-এ কনটেন্ট জমা দিয়ে আপনি কেবল সেবা পরিচালনার উদ্দেশ্যে সেটি হোস্ট, প্রদর্শন ও প্রক্রিয়াকরণের জন্য আমাদের সীমিত লাইসেন্স প্রদান করেন।',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'এই শর্তাবলী, প্রযোজ্য আইন বা প্ল্যাটফর্ম নিরাপত্তা নীতিমালা লঙ্ঘনকারী অ্যাকাউন্ট আমরা স্থগিত বা বাতিল করতে পারি।',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'আইন দ্বারা অনুমোদিত সীমার মধ্যে সেবাটি "যেমন আছে" এবং "যেমন উপলব্ধ" ভিত্তিতে প্রদান করা হয়, কোনো ধরনের ওয়ারেন্টি ছাড়া।',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'আইন দ্বারা অনুমোদিত সর্বোচ্চ সীমায়, সেবার আপনার ব্যবহারের ফলে সৃষ্ট পরোক্ষ, আনুষঙ্গিক, বিশেষ, ফলশ্রুতিমূলক বা দণ্ডমূলক ক্ষতির জন্য GoOn দায়ী থাকবে না।',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'আমরা সময়ে সময়ে এই শর্তাবলী আপডেট করতে পারি। আপডেটের পর GoOn ব্যবহার চালিয়ে গেলে তা সংশোধিত শর্তাবলী গ্রহণ হিসেবে গণ্য হবে।',
      'For legal inquiries: idealcrea@gmail.com': 'আইনি জিজ্ঞাসার জন্য: idealcrea@gmail.com',
      'Security monitoring and fraud prevention.': 'নিরাপত্তা পর্যবেক্ষণ এবং জালিয়াতি প্রতিরোধ।',
      'App performance and reliability diagnostics.': 'অ্যাপের পারফরম্যান্স ও নির্ভরযোগ্যতার ডায়াগনস্টিক।',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'মোবাইলে, এই প্রযুক্তিগুলোর মধ্যে নিরাপদ লগইন এবং পুশ নোটিফিকেশনের জন্য ব্যবহৃত লোকাল স্টোরেজ টোকেন ও ডিভাইস-স্তরের শনাক্তকারী থাকতে পারে।',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'আপনি ডিভাইস সেটিংস থেকে অনুমতিসমূহ পরিচালনা করতে পারেন। কিছু অনুমতি বন্ধ করলে নোটিফিকেশন, লোকেশন-ভিত্তিক অনুসন্ধান বা স্থায়ী সেশনের মতো কিছু ফিচার কমে যেতে বা বন্ধ হতে পারে।',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'প্রযুক্তি, আইনি প্রয়োজনীয়তা বা পণ্যের ফিচারের পরিবর্তন প্রতিফলিত করতে আমরা এই কুকি নীতি আপডেট করতে পারি।',
      'For cookie-related questions: idealcrea@gmail.com': 'কুকি-সম্পর্কিত প্রশ্নের জন্য: idealcrea@gmail.com',
    },
    ru: {
      'Privacy Policy': 'Политика конфиденциальности',
      'Last updated: July 22, 2026': 'Последнее обновление: 22 июля 2026',
      'Terms of Service': 'Условия использования',
      'Last updated: August 05, 2026': 'Последнее обновление: 05 августа 2026',
      'Cookie Policy': 'Политика cookies',
      Contents: 'Содержание',
      '1. Introduction': '1. Введение',
      '2. Information We Collect': '2. Какие данные мы собираем',
      '3. How We Use Information': '3. Как мы используем информацию',
      '4. Location Information': '4. Данные о местоположении',
      '5. User Generated Content': '5. Контент, создаваемый пользователями',
      '6. Data Sharing': '6. Передача данных',
      '7. Third-Party Services': '7. Сторонние сервисы',
      '8. Data Security': '8. Безопасность данных',
      '9. Data Retention and Account Deletion': '9. Хранение данных и удаление аккаунта',
      '10. Children\'s Privacy': '10. Конфиденциальность детей',
      '11. Your Privacy Rights': '11. Ваши права на конфиденциальность',
      '12. Changes to This Privacy Policy': '12. Изменения в политике конфиденциальности',
      '13. Contact Information': '13. Контакты',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business — это платформа для управления бизнесом и бронирования, предназначенная для магазинов, компаний и профессионалов. Через приложение владельцы могут управлять профилем, услугами, сообщениями клиентов, встречами, предложениями и уведомлениями.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Ваша конфиденциальность важна для нас. В этой политике объясняется, какие данные мы собираем, как используем и какие у вас есть варианты. Используя GoOn Business, вы соглашаетесь с этой политикой.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business — это платформа для управления, сообщений и бронирований для магазинов, компаний и профессионалов.',
      'You must provide accurate and current information.': 'Вы должны предоставлять точную и актуальную информацию о своем бизнесе.',
      'Provide customer support and respond to inquiries.': 'Поддержка бизнеса и профессионалов, ответы на запросы.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookies и похожие технологии используются для повышения надежности, безопасности и удобства GoOn Business.',
      'Authentication and session continuity.': 'Аутентификация и непрерывность сессии.',
      'Notification and preference management.': 'Управление уведомлениями, предпочтениями и напоминаниями клиентам.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Мы можем время от времени обновлять политику. При существенных изменениях уведомим через приложение или сайт. Продолжая использовать GoOn Business, вы принимаете обновленную политику.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business упрощает бронирования и коммуникацию между клиентами и бизнесом. Сторонние исполнители несут ответственность за свои услуги.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Используя GoOn Business, вы соглашаетесь с условиями использования. Если не согласны, не используйте приложение.',
      '1. Acceptance of Terms': '1. Принятие условий',
      '2. Description of Service': '2. Описание сервиса',
      '3. Account Responsibilities': '3. Обязанности аккаунта',
      '4. Acceptable Use': '4. Допустимое использование',
      '5. Business Content and User Content': '5. Контент бизнеса и пользователей',
      '6. Bookings and Communications': '6. Бронирования и коммуникация',
      '7. Suspension and Termination': '7. Приостановка и прекращение',
      '8. Disclaimer of Warranties': '8. Отказ от гарантий',
      '9. Limitation of Liability': '9. Ограничение ответственности',
      '10. Changes to Terms': '10. Изменения условий',
      '11. Contact': '11. Контакты',
      '1. What Are Cookies and Similar Technologies': '1. Что такое cookies и похожие технологии',
      '2. How GoOn Uses Them': '2. Как GoOn их использует',
      '3. Mobile Environment': '3. Мобильная среда',
      '4. Your Choices': '4. Ваш выбор',
      '5. Updates': '5. Обновления',
      '6. Contact': '6. Контакты',
    },
    ja: {
      'Privacy Policy': 'プライバシーポリシー',
      'Last updated: July 22, 2026': '最終更新日: 2026年7月22日',
      'Terms of Service': '利用規約',
      'Last updated: August 05, 2026': '最終更新日: 2026年8月5日',
      'Cookie Policy': 'Cookie ポリシー',
      Contents: '目次',
      '1. Introduction': '1. はじめに',
      '2. Information We Collect': '2. 収集する情報',
      '3. How We Use Information': '3. 情報の利用方法',
      '4. Location Information': '4. 位置情報',
      '5. User Generated Content': '5. ユーザー生成コンテンツ',
      '6. Data Sharing': '6. データ共有',
      '7. Third-Party Services': '7. 第三者サービス',
      '8. Data Security': '8. データの安全性',
      '9. Data Retention and Account Deletion': '9. データ保持とアカウント削除',
      '10. Children\'s Privacy': '10. 子どものプライバシー',
      '11. Your Privacy Rights': '11. あなたのプライバシー権',
      '12. Changes to This Privacy Policy': '12. ポリシーの変更',
      '13. Contact Information': '13. お問い合わせ',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business は、店舗・企業・専門職向けの管理と予約のためのローカルプラットフォームです。アプリから、プロフィール、サービス、顧客メッセージ、予約、オファー、通知を管理できます。',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'あなたのプライバシーは重要です。このポリシーでは、収集する情報、利用方法、選択肢について説明します。GoOn Business を利用すると、このポリシーに同意したものとみなされます。',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business は、店舗・企業・専門職向けの管理、メッセージ、予約プラットフォームです。',
      'You must provide accurate and current information.': '事業に関する正確で最新の情報を提供する必要があります。',
      'Provide customer support and respond to inquiries.': '事業者や専門職へのサポート、問い合わせ対応。',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookie と類似技術は、GoOn Business の信頼性・安全性・使いやすさの向上に使用されます。',
      'Authentication and session continuity.': '認証とセッション継続。',
      'Notification and preference management.': '通知・設定・顧客リマインダーの管理。',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': '本ポリシーは随時更新されることがあります。重要な変更がある場合はアプリやウェブサイトで通知します。GoOn Business を継続利用すると、更新版に同意したものとみなされます。',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business は顧客と事業者の予約や連絡を円滑にします。独立した事業者のサービス提供には関与しません。',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'GoOn Business を利用すると、利用規約に同意したことになります。同意しない場合は利用しないでください。',
      '1. Acceptance of Terms': '1. 規約への同意',
      '2. Description of Service': '2. サービスの説明',
      '3. Account Responsibilities': '3. アカウント責任',
      '4. Acceptable Use': '4. 許容される利用',
      '5. Business Content and User Content': '5. 事業者コンテンツとユーザーコンテンツ',
      '6. Bookings and Communications': '6. 予約と連絡',
      '7. Suspension and Termination': '7. 停止と終了',
      '8. Disclaimer of Warranties': '8. 保証の否認',
      '9. Limitation of Liability': '9. 責任の制限',
      '10. Changes to Terms': '10. 規約変更',
      '11. Contact': '11. お問い合わせ',
      '1. What Are Cookies and Similar Technologies': '1. Cookie と類似技術とは',
      '2. How GoOn Uses Them': '2. GoOn による利用方法',
      '3. Mobile Environment': '3. モバイル環境',
      '4. Your Choices': '4. あなたの選択',
      '5. Updates': '5. 更新',
      '6. Contact': '6. お問い合わせ',
      'We collect the following categories of information:': '当社は次の種類の情報を収集します。',
      'Account information: such as your name, email address, and phone number (if provided).': 'アカウント情報: 氏名、メールアドレス、電話番号（提供された場合）。',
      'Profile information: details you add to your customer or business profile.': 'プロフィール情報: お客様または事業者プロフィールに追加する情報。',
      'Business information: information provided by business accounts, including services, hours, and contact details.': '事業者情報: サービス内容、営業時間、連絡先など、事業者アカウントが提供する情報。',
      'Location data: collected only when you allow location access through your device.': '位置情報データ: 端末で位置情報アクセスを許可した場合にのみ収集されます。',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'メッセージと通信: アプリを通じて顧客と事業者の間でやり取りされるメッセージ。',
      'Appointment and booking information: details related to appointments you book or receive.': '予約・来店情報: あなたが予約した、または受けた予約に関する詳細。',
      'Reviews and ratings: content you submit about businesses.': 'レビューと評価: 事業者に関してあなたが投稿する内容。',
      'Photos: images uploaded by users or businesses.': '写真: ユーザーまたは事業者がアップロードした画像。',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': '端末情報および技術データ: 端末モデル、OS、アプリのバージョン、診断情報など。',
      'Push notification information: tokens and preferences used to deliver notifications.': 'プッシュ通知情報: 通知配信に使用するトークンと設定。',
      'We use the information we collect to:': '収集した情報は次の目的で使用します。',
      'Create and manage user and business accounts.': 'ユーザーおよび事業者アカウントの作成と管理。',
      'Connect customers with local businesses.': '顧客と地域の事業者をつなぐ。',
      'Provide messaging, booking, and related services.': 'メッセージ、予約、および関連サービスの提供。',
      'Improve app functionality, reliability, and user experience.': 'アプリの機能性、信頼性、ユーザー体験の向上。',
      'Send notifications relevant to your activity and preferences.': 'あなたの利用状況や設定に関連する通知の送信。',
      'Maintain the security and integrity of the platform.': 'プラットフォームの安全性と完全性の維持。',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'ユーザーおよび事業者は、レビュー、写真、プロフィール情報、メッセージなどのコンテンツを GoOn に投稿できます。',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': '投稿されたコンテンツについては投稿者が責任を負い、適用法令および当社ポリシーへの適合を確保する必要があります。違反するコンテンツは GoOn が削除する場合があります。',
      'GoOn does not sell your personal information.': 'GoOn はあなたの個人情報を販売しません。',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': '当社は、ホスティング、認証、データベース、通知配信など、アプリ運営を支援する信頼できるサービス提供者と情報を共有することがあります。これら提供者は、当社へのサービス提供に必要な範囲でのみ情報を利用できます。',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': '法令、法的手続き、または GoOn・ユーザー・第三者の権利、安全、財産を保護するために必要な場合、情報を開示することがあります。',
      'GoOn may use third-party services to support the app. These services may include:': 'GoOn はアプリを支えるために第三者サービスを利用する場合があります。これには次が含まれます。',
      'Firebase services': 'Firebase サービス',
      'Cloud hosting providers': 'クラウドホスティング事業者',
      'Database services': 'データベースサービス',
      'Push notification services': 'プッシュ通知サービス',
      'Analytics and crash reporting, if enabled': '分析およびクラッシュレポート（有効な場合）',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': '当社は、あなたの情報を不正アクセス、開示、改ざん、破壊から保護するため、合理的な技術的・組織的対策を講じます。',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'ただし、インターネット送信や電子保管の方法に 100% の安全性はなく、絶対的な安全を保証することはできません。',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'アカウントおよび関連する個人データの削除は、いつでも当社への連絡により申請できます。',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': '法令遵守、紛争解決、不正防止、契約履行のために必要な場合、アカウント削除後も一部情報を保持することがあります。',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn は 13 歳未満の子ども向けに設計・提供されていません。13 歳未満の子どもの個人情報を故意に収集することはありません。',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': '子どもが個人情報を当社に提供したと思われる場合は、削除のため適切な対応を行いますのでご連絡ください。',
      'Depending on your location, you may have the right to:': '居住地によっては、次の権利を有する場合があります。',
      'Access the personal information we hold about you.': '当社が保有するあなたの個人情報へのアクセス。',
      'Update or correct your information.': 'あなたの情報の更新または訂正。',
      'Request deletion of your account or personal data.': 'アカウントまたは個人データの削除請求。',
      'Contact GoOn regarding privacy questions or concerns.': 'プライバシーに関する質問や懸念について GoOn へ連絡。',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': '本規約は随時更新される場合があります。更新後も GoOn を継続して利用した場合、改定規約に同意したものとみなされます。',
      'For legal inquiries: idealcrea@gmail.com': '法的なお問い合わせ: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Cookie に関するお問い合わせ: idealcrea@gmail.com',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'モバイル環境では、安全なログインとプッシュ通知のために、ローカル保存トークンや端末レベルの識別子が含まれる場合があります。',
      'Security monitoring and fraud prevention.': 'セキュリティ監視と不正防止。',
      'App performance and reliability diagnostics.': 'アプリのパフォーマンスおよび信頼性の診断。',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': '権限は端末設定から管理できます。特定の権限を無効化すると、通知、位置情報ベースの検索、セッション保持など一部機能が制限または無効になる場合があります。',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': '技術、法的要件、または製品機能の変更に合わせて、この Cookie ポリシーを更新する場合があります。',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn は、顧客と地域の事業者をつなぐローカルビジネス発見・予約プラットフォームです。GoOn モバイルアプリを通じて、顧客は事業者の検索、プロフィール閲覧、メッセージ交換、予約、レビュー投稿、通知受信ができます。事業者はプロフィール管理、顧客対応、予約管理、サービス告知を行えます。',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'あなたの許可がある場合、周辺の事業者を見つけやすくし、ローカル検索結果を向上させるために端末の位置情報を利用します。',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': '位置情報アクセスは端末設定からいつでも有効化・無効化できます。無効化すると、アプリの一部機能が制限される場合があります。',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'アカウント認証情報の機密性を維持する責任はあなたにあります。',
      'You are responsible for activities under your account.': 'あなたのアカウントで行われる活動については、あなたが責任を負います。',
      'Do not misuse, disrupt, or reverse engineer the service.': 'サービスを悪用、妨害、またはリバースエンジニアリングしないでください。',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': '違法、虐待的、詐欺的、または権利侵害となるコンテンツを投稿しないでください。',
      'Do not attempt unauthorized access to systems or data.': 'システムまたはデータへの不正アクセスを試みないでください。',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': '事業者およびユーザーは、自身のコンテンツの所有権を保持します。GoOn にコンテンツを投稿することで、サービス運営に必要な範囲に限り、当社に対してホスティング、表示、処理の限定的ライセンスを付与するものとします。',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': '本規約、適用法令、またはプラットフォームの安全要件に違反するアカウントは、停止または終了される場合があります。',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': '本サービスは、法令で許容される範囲で、いかなる保証も伴わない「現状有姿」かつ「提供可能な範囲」で提供されます。',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': '法令で許容される最大限の範囲で、GoOn は本サービスの利用に起因する間接的、付随的、特別、結果的、または懲罰的損害について責任を負いません。',
      'GoOn Support': 'GoOn サポート',
      'Email: idealcrea@gmail.com': 'メール: idealcrea@gmail.com',
      '© 2026 GoOn. All rights reserved.': '© 2026 GoOn. 無断転載を禁じます。',
    },
    de: {
      'Privacy Policy': 'Datenschutzrichtlinie',
      'Last updated: July 22, 2026': 'Zuletzt aktualisiert: 22. Juli 2026',
      'Terms of Service': 'Nutzungsbedingungen',
      'Last updated: August 05, 2026': 'Zuletzt aktualisiert: 05. August 2026',
      'Cookie Policy': 'Cookie-Richtlinie',
      Contents: 'Inhalt',
      '1. Introduction': '1. Einleitung',
      '2. Information We Collect': '2. Welche Daten wir erfassen',
      '3. How We Use Information': '3. Wie wir Informationen nutzen',
      '4. Location Information': '4. Standortdaten',
      '5. User Generated Content': '5. Von Nutzern erstellte Inhalte',
      '6. Data Sharing': '6. Datenweitergabe',
      '7. Third-Party Services': '7. Dienste von Drittanbietern',
      '8. Data Security': '8. Datensicherheit',
      '9. Data Retention and Account Deletion': '9. Datenspeicherung und Kontolöschung',
      '10. Children\'s Privacy': '10. Datenschutz für Kinder',
      '11. Your Privacy Rights': '11. Ihre Datenschutzrechte',
      '12. Changes to This Privacy Policy': '12. Änderungen dieser Datenschutzrichtlinie',
      '13. Contact Information': '13. Kontakt',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business ist eine Plattform zur Verwaltung und Buchung für Geschäfte, Unternehmen und Fachleute. Über die App können Inhaber ihr Profil verwalten, Dienstleistungen präsentieren, Nachrichten bearbeiten, Termine organisieren, Angebote veröffentlichen und Benachrichtigungen erhalten.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Ihre Privatsphäre ist uns wichtig. Diese Richtlinie erklärt, welche Informationen wir erfassen, wie wir sie verwenden und welche Optionen Sie haben. Durch die Nutzung von GoOn Business stimmen Sie dieser Richtlinie zu.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business ist eine Plattform für Verwaltung, Nachrichten und Buchungen für Geschäfte, Unternehmen und Fachleute.',
      'You must provide accurate and current information.': 'Sie müssen genaue und aktuelle Informationen zu Ihrem Unternehmen bereitstellen.',
      'Provide customer support and respond to inquiries.': 'Unterstützung für Unternehmen und Fachleute sowie Beantwortung von Anfragen.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookies und ähnliche Technologien verbessern die Zuverlässigkeit, Sicherheit und Bedienbarkeit von GoOn Business.',
      'Authentication and session continuity.': 'Authentifizierung und Sitzungsfortsetzung.',
      'Notification and preference management.': 'Verwaltung von Benachrichtigungen, Einstellungen und Kundenerinnerungen.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Wir können diese Richtlinie von Zeit zu Zeit aktualisieren. Bei wesentlichen Änderungen informieren wir Sie über die App oder Website. Wenn Sie GoOn Business weiter nutzen, akzeptieren Sie die aktualisierte Richtlinie.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business erleichtert Buchungen und Kommunikation zwischen Kunden und Unternehmen. Es ist nicht Partei der Leistungen unabhängiger Anbieter.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Durch die Nutzung von GoOn Business stimmen Sie den Nutzungsbedingungen zu. Wenn Sie nicht zustimmen, nutzen Sie die App nicht.',
      '1. Acceptance of Terms': '1. Annahme der Bedingungen',
      '2. Description of Service': '2. Beschreibung des Dienstes',
      '3. Account Responsibilities': '3. Kontoverantwortung',
      '4. Acceptable Use': '4. Zulässige Nutzung',
      '5. Business Content and User Content': '5. Unternehmens- und Nutzerinhalte',
      '6. Bookings and Communications': '6. Buchungen und Kommunikation',
      '7. Suspension and Termination': '7. Aussetzung und Kündigung',
      '8. Disclaimer of Warranties': '8. Haftungsausschluss',
      '9. Limitation of Liability': '9. Haftungsbeschränkung',
      '10. Changes to Terms': '10. Änderungen der Bedingungen',
      '11. Contact': '11. Kontakt',
      '1. What Are Cookies and Similar Technologies': '1. Was sind Cookies und ähnliche Technologien',
      '2. How GoOn Uses Them': '2. Wie GoOn sie verwendet',
      '3. Mobile Environment': '3. Mobile Umgebung',
      '4. Your Choices': '4. Ihre Auswahl',
      '5. Updates': '5. Aktualisierungen',
      '6. Contact': '6. Kontakt',
    },
    id: {
      'Privacy Policy': 'Kebijakan Privasi',
      'Last updated: July 22, 2026': 'Terakhir diperbarui: 22 Juli 2026',
      'Terms of Service': 'Ketentuan Layanan',
      'Last updated: August 05, 2026': 'Terakhir diperbarui: 05 Agustus 2026',
      'Cookie Policy': 'Kebijakan Cookie',
      Contents: 'Daftar isi',
      '1. Introduction': '1. Pengantar',
      '2. Information We Collect': '2. Informasi yang kami kumpulkan',
      '3. How We Use Information': '3. Cara kami menggunakan informasi',
      '4. Location Information': '4. Informasi lokasi',
      '5. User Generated Content': '5. Konten yang dibuat pengguna',
      '6. Data Sharing': '6. Pembagian data',
      '7. Third-Party Services': '7. Layanan pihak ketiga',
      '8. Data Security': '8. Keamanan data',
      '9. Data Retention and Account Deletion': '9. Penyimpanan data dan penghapusan akun',
      '10. Children\'s Privacy': '10. Privasi anak',
      '11. Your Privacy Rights': '11. Hak privasi Anda',
      '12. Changes to This Privacy Policy': '12. Perubahan kebijakan privasi ini',
      '13. Contact Information': '13. Kontak',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business adalah platform manajemen dan pemesanan untuk toko, perusahaan, dan profesional. Melalui aplikasi ini, pemilik usaha dapat mengelola profil, menampilkan layanan, menangani pesan pelanggan, mengatur janji temu, mempublikasikan penawaran, dan menerima notifikasi.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Privasi Anda penting bagi kami. Kebijakan ini menjelaskan informasi apa yang kami kumpulkan, bagaimana kami menggunakannya, dan pilihan Anda. Dengan menggunakan GoOn Business, Anda menyetujui kebijakan ini.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business adalah platform manajemen, pesan, dan pemesanan untuk toko, perusahaan, dan profesional.',
      'You must provide accurate and current information.': 'Anda harus memberikan informasi bisnis yang akurat dan terbaru.',
      'Provide customer support and respond to inquiries.': 'Memberikan dukungan dan menjawab pertanyaan dari bisnis dan profesional.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookie dan teknologi serupa digunakan untuk meningkatkan keandalan, keamanan, dan kemudahan penggunaan GoOn Business.',
      'Authentication and session continuity.': 'Autentikasi dan kesinambungan sesi.',
      'Notification and preference management.': 'Pengelolaan notifikasi, preferensi, dan pengingat pelanggan.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Jika ada perubahan penting, kami akan memberi tahu melalui aplikasi atau situs. Terus menggunakan GoOn Business berarti Anda menerima kebijakan yang diperbarui.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business memudahkan pemesanan dan komunikasi antara pelanggan dan bisnis. GoOn tidak menjadi pihak dalam layanan yang dilakukan penyedia independen.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Dengan menggunakan GoOn Business, Anda setuju pada Ketentuan Layanan ini. Jika tidak setuju, jangan gunakan aplikasi.',
      '1. Acceptance of Terms': '1. Persetujuan ketentuan',
      '2. Description of Service': '2. Deskripsi layanan',
      '3. Account Responsibilities': '3. Tanggung jawab akun',
      '4. Acceptable Use': '4. Penggunaan yang diperbolehkan',
      '5. Business Content and User Content': '5. Konten bisnis dan konten pengguna',
      '6. Bookings and Communications': '6. Pemesanan dan komunikasi',
      '7. Suspension and Termination': '7. Penangguhan dan penghentian',
      '8. Disclaimer of Warranties': '8. Penafian jaminan',
      '9. Limitation of Liability': '9. Batasan tanggung jawab',
      '10. Changes to Terms': '10. Perubahan ketentuan',
      '11. Contact': '11. Kontak',
      '1. What Are Cookies and Similar Technologies': '1. Apa itu cookie dan teknologi serupa',
      '2. How GoOn Uses Them': '2. Bagaimana GoOn menggunakannya',
      '3. Mobile Environment': '3. Lingkungan seluler',
      '4. Your Choices': '4. Pilihan Anda',
      '5. Updates': '5. Pembaruan',
      '6. Contact': '6. Kontak',
    },
    ur: {
      'Privacy Policy': 'پرائیویسی پالیسی',
      'Last updated: July 22, 2026': 'آخری اپ ڈیٹ: 22 جولائی 2026',
      'Terms of Service': 'سروس کی شرائط',
      'Last updated: August 05, 2026': 'آخری اپ ڈیٹ: 05 اگست 2026',
      'Cookie Policy': 'کوکی پالیسی',
      Contents: 'فہرست',
      '1. Introduction': '1. تعارف',
      '2. Information We Collect': '2. ہم کون سی معلومات جمع کرتے ہیں',
      '3. How We Use Information': '3. ہم معلومات کیسے استعمال کرتے ہیں',
      '4. Location Information': '4. مقام سے متعلق معلومات',
      '5. User Generated Content': '5. صارف کے بنائے ہوئے مواد',
      '6. Data Sharing': '6. ڈیٹا شیئرنگ',
      '7. Third-Party Services': '7. فریق ثالث کی خدمات',
      '8. Data Security': '8. ڈیٹا کی حفاظت',
      '9. Data Retention and Account Deletion': '9. ڈیٹا برقرار رکھنا اور اکاؤنٹ حذف کرنا',
      '10. Children\'s Privacy': '10. بچوں کی پرائیویسی',
      '11. Your Privacy Rights': '11. آپ کے پرائیویسی حقوق',
      '12. Changes to This Privacy Policy': '12. اس پرائیویسی پالیسی میں تبدیلیاں',
      '13. Contact Information': '13. رابطہ معلومات',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business دکانوں، کمپنیوں اور پیشہ ور افراد کے لیے ایک لوکل بزنس مینجمنٹ اور بکنگ پلیٹ فارم ہے۔ اس ایپ کے ذریعے کاروباری مالکان پروفائل، سروسز، پیغامات، اپوائنٹس، آفرز اور نوٹیفکیشنز سنبھال سکتے ہیں۔',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'آپ کی پرائیویسی ہمارے لیے اہم ہے۔ یہ پالیسی بتاتی ہے کہ ہم کون سی معلومات جمع کرتے ہیں، انہیں کیسے استعمال کرتے ہیں، اور آپ کے کیا اختیارات ہیں۔ GoOn Business استعمال کرنے سے آپ اس پالیسی سے اتفاق کرتے ہیں۔',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business دکانوں، کمپنیوں اور پیشہ ور افراد کے لیے ایک مینجمنٹ، میسجنگ اور بکنگ پلیٹ فارم ہے۔',
      'You must provide accurate and current information.': 'آپ کو اپنے کاروبار کے بارے میں درست اور تازہ معلومات دینی ہوں گی۔',
      'Provide customer support and respond to inquiries.': 'کاروبار اور پیشہ ور افراد کی مدد اور سوالات کے جواب دینا۔',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'کوکیز اور ملتی جلتی ٹیکنالوجیز GoOn Business کی قابلِ اعتماد، محفوظ اور آسان استعمال کو بہتر بنانے کے لیے استعمال ہوتی ہیں۔',
      'Authentication and session continuity.': 'تصدیق اور سیشن تسلسل۔',
      'Notification and preference management.': 'نوٹیفکیشن، ترجیحات اور کسٹمر ریمائنڈرز کا انتظام۔',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'ہم وقتاً فوقتاً یہ پالیسی اپ ڈیٹ کر سکتے ہیں۔ اہم تبدیلی کی صورت میں ایپ یا ویب سائٹ پر اطلاع دی جائے گی۔ GoOn Business کا استعمال جاری رکھنے کا مطلب ہے کہ آپ اپ ڈیٹ شدہ پالیسی قبول کرتے ہیں۔',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn Business گاہکوں اور کاروباروں کے درمیان بکنگ اور رابطہ آسان بناتا ہے۔ یہ آزاد سروس فراہم کرنے والوں کی خدمت کا فریق نہیں ہے۔',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'GoOn Business استعمال کرنے سے آپ ان شرائط سے متفق ہوتے ہیں۔ اگر متفق نہیں تو ایپ استعمال نہ کریں۔',
      '1. Acceptance of Terms': '1. شرائط کی قبولیت',
      '2. Description of Service': '2. سروس کی تفصیل',
      '3. Account Responsibilities': '3. اکاؤنٹ کی ذمہ داریاں',
      '4. Acceptable Use': '4. قابلِ قبول استعمال',
      '5. Business Content and User Content': '5. کاروباری اور صارف مواد',
      '6. Bookings and Communications': '6. بکنگ اور رابطہ',
      '7. Suspension and Termination': '7. معطلی اور خاتمہ',
      '8. Disclaimer of Warranties': '8. ضمانت سے انکار',
      '9. Limitation of Liability': '9. ذمہ داری کی حد',
      '10. Changes to Terms': '10. شرائط میں تبدیلیاں',
      '11. Contact': '11. رابطہ',
      '1. What Are Cookies and Similar Technologies': '1. کوکیز اور ملتی جلتی ٹیکنالوجیز کیا ہیں',
      '2. How GoOn Uses Them': '2. GoOn انہیں کیسے استعمال کرتا ہے',
      '3. Mobile Environment': '3. موبائل ماحول',
      '4. Your Choices': '4. آپ کے انتخاب',
      '5. Updates': '5. اپ ڈیٹس',
      '6. Contact': '6. رابطہ',
    },
    es: {
      'Privacy Policy': 'Politica de Privacidad',
      'Last updated: July 22, 2026': 'Ultima actualizacion: 22 de julio de 2026',
      'Terms of Service': 'Terminos del Servicio',
      'Last updated: August 05, 2026': 'Ultima actualizacion: 05 de agosto de 2026',
      'Cookie Policy': 'Politica de Cookies',
      Contents: 'Contenido',
      '1. Introduction': '1. Introduccion',
      '2. Information We Collect': '2. Informacion que recopilamos',
      '3. How We Use Information': '3. Como usamos la informacion',
      '4. Location Information': '4. Informacion de ubicacion',
      '5. User Generated Content': '5. Contenido generado por usuarios',
      '6. Data Sharing': '6. Comparticion de datos',
      '7. Third-Party Services': '7. Servicios de terceros',
      '8. Data Security': '8. Seguridad de datos',
      '9. Data Retention and Account Deletion': '9. Retencion de datos y eliminacion de cuenta',
      '10. Children\'s Privacy': '10. Privacidad de menores',
      '11. Your Privacy Rights': '11. Tus derechos de privacidad',
      '12. Changes to This Privacy Policy': '12. Cambios en esta politica de privacidad',
      '13. Contact Information': '13. Informacion de contacto',
      'We collect the following categories of information:': 'Recopilamos las siguientes categorias de informacion:',
      'We use the information we collect to:': 'Usamos la informacion recopilada para:',
      'Depending on your location, you may have the right to:': 'Segun tu ubicacion, puedes tener derecho a:',
      'GoOn Support': 'Soporte GoOn',
      'GoOn Business is a local business management and booking platform designed for shops, companies, and professionals. Through the GoOn mobile application, business owners can manage their business profile, showcase services, handle customer messages, organize appointments, publish offers, and receive notifications.': 'GoOn Business es una plataforma local de gestion y reservas disenada para tiendas, empresas y profesionales. A traves de la aplicacion movil GoOn, los propietarios pueden gestionar su perfil comercial, mostrar sus servicios, responder mensajes de clientes, organizar citas, publicar ofertas y recibir notificaciones.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Tu privacidad es importante para nosotros. Esta Politica de Privacidad explica que informacion recopilamos, como la usamos y que opciones tienes. Al usar GoOn Business, aceptas las practicas descritas en esta politica.',
      'Account information: such as your name, email address, and phone number (if provided).': 'Informacion de cuenta: como tu nombre, correo electronico y numero de telefono (si se proporciona).',
      'Profile information: details you add to your customer or business profile.': 'Informacion de perfil: detalles que agregas a tu perfil comercial o profesional.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informacion del negocio: datos de cuentas comerciales, incluidos servicios, horarios, ubicacion y contacto.',
      'Location data: collected only when you allow location access through your device.': 'Datos de ubicacion: recopilados solo cuando permites acceso desde tu dispositivo para mostrar negocios cercanos y resultados locales.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'Mensajes y comunicaciones: mensajes intercambiados entre clientes y negocios dentro de la app.',
      'Appointment and booking information: details related to appointments you book or receive.': 'Informacion de citas y reservas: detalles de citas que reservas, confirmas o recibes.',
      'Reviews and ratings: content you submit about businesses.': 'Resenas y calificaciones: contenido que envias sobre tus servicios o tu negocio.',
      'Photos: images uploaded by users or businesses.': 'Fotos: imagenes cargadas por usuarios o negocios para mostrar productos, servicios o trabajos.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informacion del dispositivo y datos tecnicos: modelo, sistema operativo, version de la app y diagnosticos.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'Informacion de notificaciones push: tokens y preferencias usadas para enviar notificaciones relevantes a tu negocio.',
      'Create and manage user and business accounts.': 'Crear y administrar cuentas de negocio y usuarios asociados.',
      'Connect customers with local businesses.': 'Conectar clientes con negocios, tiendas y profesionales cercanos.',
      'Provide messaging, booking, and related services.': 'Ofrecer mensajeria, reservas, servicios y seguimiento comercial.',
      'Improve app functionality, reliability, and user experience.': 'Mejorar funcionalidad, fiabilidad y experiencia de uso para negocios y clientes.',
      'Send notifications relevant to your activity and preferences.': 'Enviar notificaciones relacionadas con tu actividad, reservas y clientes.',
      'Maintain the security and integrity of the platform.': 'Mantener la seguridad e integridad de la plataforma.',
      'Provide customer support and respond to inquiries.': 'Brindar soporte y responder consultas de negocios y profesionales.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Con tu permiso, usamos la ubicacion de tu dispositivo para ayudarte a descubrir negocios cercanos y mejorar los resultados locales.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Puedes activar o desactivar el acceso a la ubicacion en cualquier momento desde la configuracion de tu dispositivo. Desactivarlo puede limitar algunas funciones de la app.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Los usuarios y negocios pueden enviar contenido a GoOn, incluyendo resenas, fotos, datos de perfil y mensajes.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Eres responsable del contenido que publicas y de asegurar que cumpla con las leyes aplicables y nuestras politicas. GoOn puede eliminar contenido que infrinja nuestras politicas o la ley.',
      'GoOn does not sell your personal information.': 'GoOn no vende tu informacion personal.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Podemos compartir informacion con proveedores de confianza que nos ayudan a operar la app, incluyendo alojamiento, autenticacion, base de datos y notificaciones. Estos proveedores solo pueden usar tu informacion para prestar esos servicios.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Tambien podemos divulgar informacion cuando la ley lo exija, por proceso legal o para proteger los derechos, la seguridad y la propiedad de GoOn, nuestros usuarios u otros.',
      'GoOn may use third-party services to support the app. These services may include:': 'GoOn puede usar servicios de terceros para respaldar la app. Estos servicios pueden incluir:',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Aplicamos medidas tecnicas y organizativas razonables para proteger tu informacion contra acceso, divulgacion, alteracion o destruccion no autorizados.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'Sin embargo, ningun metodo de transmision por internet o almacenamiento electronico es 100% seguro, y no podemos garantizar seguridad absoluta.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'Puedes solicitar la eliminacion de tu cuenta y datos personales asociados en cualquier momento contactandonos.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Parte de la informacion puede conservarse tras eliminar la cuenta cuando sea necesario para cumplir obligaciones legales, resolver disputas, prevenir fraude o hacer cumplir acuerdos.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'GoOn no esta disenada para menores de 13 anos. No recopilamos intencionalmente informacion personal de menores de 13 anos.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Si crees que un menor nos ha proporcionado informacion personal, contactanos para tomar las medidas adecuadas y eliminarla.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Podemos actualizar esta Politica de Privacidad periodicamente. Cuando haya cambios materiales, te avisaremos por la app o en nuestro sitio web. El uso continuo de GoOn despues de una actualizacion implica tu aceptacion de la politica revisada.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Al acceder o usar GoOn, aceptas quedar vinculado por estos Terminos del Servicio. Si no estas de acuerdo, no uses la aplicacion.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn Business es una plataforma de gestion, mensajeria y reservas para tiendas, empresas y profesionales.',
      'You must provide accurate and current information.': 'Debes proporcionar informacion precisa y actual sobre tu negocio.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'Eres responsable de mantener la confidencialidad de las credenciales de tu cuenta comercial.',
      'You are responsible for activities under your account.': 'Eres responsable de las actividades realizadas desde tu cuenta.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'No hagas uso indebido, no interrumpas ni intentes ingenieria inversa del servicio.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'No publiques contenido ilegal, abusivo, fraudulento o que infrinja derechos.',
      'Do not attempt unauthorized access to systems or data.': 'No intentes acceso no autorizado a sistemas o datos.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Los negocios y usuarios conservan la propiedad de su contenido. Al enviarlo a GoOn Business, nos otorgas una licencia limitada para alojarlo, mostrarlo y procesarlo solo para operar el servicio.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'GoOn facilita reservas y comunicaciones entre clientes y negocios. GoOn no es parte de la prestacion de servicios de negocios independientes.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Podemos suspender o cerrar cuentas que violen estos terminos, la ley aplicable o requisitos de seguridad de la plataforma.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'El servicio se ofrece "tal cual" y "segun disponibilidad", sin garantias de ningun tipo, en la medida permitida por la ley.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'En la maxima medida permitida por la ley, GoOn no sera responsable por danos indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso del servicio.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Podemos actualizar estos terminos periodicamente. El uso continuo de GoOn despues de actualizaciones constituye aceptacion de los terminos revisados.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Las cookies y tecnologias similares son pequenos identificadores usados para mejorar confiabilidad, seguridad y usabilidad en el ecosistema de GoOn Business.',
      'Authentication and session continuity.': 'Autenticacion y continuidad de sesion comercial.',
      'Security monitoring and fraud prevention.': 'Monitoreo de seguridad y prevencion de fraude.',
      'App performance and reliability diagnostics.': 'Rendimiento de la app y diagnostico de fiabilidad.',
      'Notification and preference management.': 'Gestion de notificaciones, preferencias y recordatorios de clientes.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'En movil, estas tecnologias pueden incluir tokens de almacenamiento local e identificadores del dispositivo para inicio de sesion seguro y notificaciones push.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Puedes gestionar permisos desde la configuracion del dispositivo. Desactivar ciertos permisos puede reducir o deshabilitar funciones como notificaciones, descubrimiento por ubicacion o sesiones persistentes.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Podemos actualizar esta Politica de Cookies para reflejar cambios tecnologicos, legales o de producto.',
      'Firebase services': 'Servicios Firebase',
      'Cloud hosting providers': 'Proveedores de alojamiento en la nube',
      'Database services': 'Servicios de base de datos',
      'Push notification services': 'Servicios de notificaciones push',
      'Analytics and crash reporting, if enabled': 'Analitica y reportes de fallos, si estan habilitados',
      'Access the personal information we hold about you.': 'Acceder a la informacion personal que tenemos sobre ti.',
      'Update or correct your information.': 'Actualizar o corregir tu informacion.',
      'Request deletion of your account or personal data.': 'Solicitar eliminacion de tu cuenta o datos personales.',
      'Contact GoOn regarding privacy questions or concerns.': 'Contactar a GoOn sobre dudas o inquietudes de privacidad.',
      'For legal inquiries: idealcrea@gmail.com': 'Para consultas legales: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Para consultas sobre cookies: idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. Aceptacion de terminos',
      '2. Description of Service': '2. Descripcion del servicio',
      '3. Account Responsibilities': '3. Responsabilidades de cuenta',
      '4. Acceptable Use': '4. Uso aceptable',
      '5. Business Content and User Content': '5. Contenido de negocios y usuarios',
      '6. Bookings and Communications': '6. Reservas y comunicaciones',
      '7. Suspension and Termination': '7. Suspension y terminacion',
      '8. Disclaimer of Warranties': '8. Exclusion de garantias',
      '9. Limitation of Liability': '9. Limitacion de responsabilidad',
      '10. Changes to Terms': '10. Cambios en los terminos',
      '11. Contact': '11. Contacto',
      '1. What Are Cookies and Similar Technologies': '1. Que son las cookies y tecnologias similares',
      '2. How GoOn Uses Them': '2. Como GoOn las utiliza',
      '3. Mobile Environment': '3. Entorno movil',
      '4. Your Choices': '4. Tus opciones',
      '5. Updates': '5. Actualizaciones',
      '6. Contact': '6. Contacto',
    },
    pt: {
      'Privacy Policy': 'Politica de Privacidade',
      'Last updated: July 22, 2026': 'Ultima atualizacao: 22 de julho de 2026',
      'Terms of Service': 'Termos de Servico',
      'Last updated: August 05, 2026': 'Ultima atualizacao: 05 de agosto de 2026',
      'Cookie Policy': 'Politica de Cookies',
      Contents: 'Conteudo',
      '1. Introduction': '1. Introducao',
      '2. Information We Collect': '2. Informacoes que coletamos',
      '3. How We Use Information': '3. Como usamos as informacoes',
      '4. Location Information': '4. Informacoes de localizacao',
      '5. User Generated Content': '5. Conteudo gerado pelo usuario',
      '6. Data Sharing': '6. Compartilhamento de dados',
      '7. Third-Party Services': '7. Servicos de terceiros',
      '8. Data Security': '8. Seguranca de dados',
      '9. Data Retention and Account Deletion': '9. Retencao de dados e exclusao de conta',
      '10. Children\'s Privacy': '10. Privacidade de criancas',
      '11. Your Privacy Rights': '11. Seus direitos de privacidade',
      '12. Changes to This Privacy Policy': '12. Alteracoes nesta politica de privacidade',
      '13. Contact Information': '13. Informacoes de contato',
      'We collect the following categories of information:': 'Coletamos as seguintes categorias de informacao:',
      'We use the information we collect to:': 'Usamos as informacoes coletadas para:',
      'Depending on your location, you may have the right to:': 'Dependendo da sua localizacao, voce pode ter o direito de:',
      'GoOn Support': 'Suporte GoOn',
      'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.': 'GoOn e uma plataforma local de descoberta de negocios e agendamento que conecta clientes a negocios locais. Pelo aplicativo movel GoOn, clientes podem descobrir negocios, ver perfis, trocar mensagens, agendar compromissos, deixar avaliacoes e receber notificacoes. Negocios podem gerenciar perfis, comunicar-se com clientes, gerenciar compromissos e promover servicos.',
      'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.': 'Sua privacidade e importante para nos. Esta Politica de Privacidade explica quais informacoes coletamos, como usamos e quais opcoes voce possui. Ao usar GoOn, voce concorda com as praticas descritas nesta politica.',
      'Account information: such as your name, email address, and phone number (if provided).': 'Informacoes de conta: como nome, email e telefone (se informado).',
      'Profile information: details you add to your customer or business profile.': 'Informacoes de perfil: detalhes adicionados ao perfil de cliente ou negocio.',
      'Business information: information provided by business accounts, including services, hours, and contact details.': 'Informacoes do negocio: dados fornecidos por contas empresariais, incluindo servicos, horarios e contato.',
      'Location data: collected only when you allow location access through your device.': 'Dados de localizacao: coletados somente quando voce permite acesso no dispositivo.',
      'Messages and communications: messages exchanged between customers and businesses through the app.': 'Mensagens e comunicacoes: mensagens trocadas entre clientes e negocios no app.',
      'Appointment and booking information: details related to appointments you book or receive.': 'Informacoes de agendamentos e reservas: detalhes dos compromissos marcados ou recebidos.',
      'Reviews and ratings: content you submit about businesses.': 'Avaliacoes e notas: conteudo enviado sobre negocios.',
      'Photos: images uploaded by users or businesses.': 'Fotos: imagens enviadas por usuarios ou negocios.',
      'Device information and technical data: such as device model, operating system, app version, and diagnostic information.': 'Informacoes do dispositivo e dados tecnicos: modelo, sistema operacional, versao do app e diagnosticos.',
      'Push notification information: tokens and preferences used to deliver notifications.': 'Informacoes de notificacoes push: tokens e preferencias usados para enviar notificacoes.',
      'Create and manage user and business accounts.': 'Criar e gerenciar contas de usuarios e negocios.',
      'Connect customers with local businesses.': 'Conectar clientes a negocios locais.',
      'Provide messaging, booking, and related services.': 'Fornecer mensageria, reservas e servicos relacionados.',
      'Improve app functionality, reliability, and user experience.': 'Melhorar funcionalidade, confiabilidade e experiencia do usuario.',
      'Send notifications relevant to your activity and preferences.': 'Enviar notificacoes relevantes para sua atividade e preferencias.',
      'Maintain the security and integrity of the platform.': 'Manter seguranca e integridade da plataforma.',
      'Provide customer support and respond to inquiries.': 'Oferecer suporte ao cliente e responder solicitacoes.',
      'With your permission, we use your device location to help you discover nearby businesses and improve local search results.': 'Com sua permissao, usamos a localizacao do dispositivo para ajudar voce a descobrir negocios proximos e melhorar resultados locais.',
      'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.': 'Voce pode ativar ou desativar o acesso a localizacao a qualquer momento nas configuracoes do dispositivo. Desativar pode limitar alguns recursos do app.',
      'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.': 'Usuarios e negocios podem enviar conteudo para GoOn, incluindo avaliacoes, fotos, detalhes de perfil e mensagens.',
      'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.': 'Voce e responsavel pelo conteudo que envia e por garantir conformidade com leis aplicaveis e nossas politicas. GoOn pode remover conteudo que viole politicas ou a lei.',
      'GoOn does not sell your personal information.': 'A GoOn nao vende suas informacoes pessoais.',
      'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.': 'Podemos compartilhar informacoes com provedores confiaveis que ajudam a operar o app, incluindo hospedagem, autenticacao, banco de dados e notificacoes. Esses provedores so podem usar informacoes conforme necessario para prestar servicos.',
      'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.': 'Tambem podemos divulgar informacoes quando exigido por lei, processo legal, ou para proteger direitos, seguranca e propriedade da GoOn, usuarios ou terceiros.',
      'GoOn may use third-party services to support the app. These services may include:': 'A GoOn pode usar servicos de terceiros para apoiar o app. Esses servicos podem incluir:',
      'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.': 'Usamos medidas tecnicas e organizacionais razoaveis para proteger suas informacoes contra acesso, divulgacao, alteracao ou destruicao nao autorizados.',
      'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.': 'No entanto, nenhum metodo de transmissao pela internet ou armazenamento eletronico e 100% seguro, e nao podemos garantir seguranca absoluta.',
      'You may request deletion of your account and associated personal data at any time by contacting us.': 'Voce pode solicitar a exclusao da sua conta e dos dados pessoais associados a qualquer momento entrando em contato conosco.',
      'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.': 'Algumas informacoes podem ser retidas apos exclusao da conta quando necessario para cumprir obrigacoes legais, resolver disputas, prevenir fraude ou executar acordos.',
      'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.': 'A GoOn nao foi projetada para criancas menores de 13 anos. Nao coletamos intencionalmente informacoes pessoais de menores de 13 anos.',
      'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.': 'Se voce acredita que uma crianca nos forneceu informacoes pessoais, entre em contato para tomarmos medidas apropriadas de remocao.',
      'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.': 'Podemos atualizar esta Politica de Privacidade periodicamente. Quando houver mudancas materiais, notificaremos voce pelo app ou site. O uso continuo da GoOn apos uma atualizacao significa aceitacao da politica revisada.',
      'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.': 'Ao acessar ou usar GoOn, voce concorda em ficar vinculado a estes Termos de Servico. Se nao concordar, nao use o aplicativo.',
      'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.': 'GoOn e uma plataforma local de descoberta de negocios, mensagens e agendamentos para clientes e negocios.',
      'You must provide accurate and current information.': 'Voce deve fornecer informacoes precisas e atualizadas.',
      'You are responsible for maintaining the confidentiality of your account credentials.': 'Voce e responsavel por manter a confidencialidade das credenciais da conta.',
      'You are responsible for activities under your account.': 'Voce e responsavel pelas atividades realizadas em sua conta.',
      'Do not misuse, disrupt, or reverse engineer the service.': 'Nao use indevidamente, nao interrompa e nao faca engenharia reversa do servico.',
      'Do not submit unlawful, abusive, fraudulent, or infringing content.': 'Nao envie conteudo ilegal, abusivo, fraudulento ou que infrinja direitos.',
      'Do not attempt unauthorized access to systems or data.': 'Nao tente acesso nao autorizado a sistemas ou dados.',
      'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.': 'Negocios e usuarios mantem a propriedade do proprio conteudo. Ao enviar conteudo para GoOn, voce concede licenca limitada para hospedar, exibir e processar somente para operar o servico.',
      'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.': 'A GoOn facilita agendamentos e comunicacoes entre clientes e negocios. A GoOn nao e parte na execucao de servicos de negocios independentes.',
      'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.': 'Podemos suspender ou encerrar contas que violem estes termos, a lei aplicavel ou requisitos de seguranca da plataforma.',
      'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.': 'O servico e fornecido "no estado em que se encontra" e "conforme disponibilidade", sem garantias de qualquer tipo, na extensao permitida por lei.',
      'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.': 'Na maxima extensao permitida por lei, GoOn nao sera responsavel por danos indiretos, incidentais, especiais, consequenciais ou punitivos decorrentes do uso do servico.',
      'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.': 'Podemos atualizar estes termos periodicamente. O uso continuo da GoOn apos atualizacoes constitui aceitacao dos termos revisados.',
      'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.': 'Cookies e tecnologias similares sao pequenos identificadores usados para melhorar confiabilidade, seguranca e usabilidade em nosso ecossistema de app.',
      'Authentication and session continuity.': 'Autenticacao e continuidade de sessao.',
      'Security monitoring and fraud prevention.': 'Monitoramento de seguranca e prevencao de fraude.',
      'App performance and reliability diagnostics.': 'Desempenho do app e diagnostico de confiabilidade.',
      'Notification and preference management.': 'Gerenciamento de notificacoes e preferencias.',
      'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.': 'No ambiente movel, essas tecnologias podem incluir tokens de armazenamento local e identificadores do dispositivo para login seguro e notificacoes push.',
      'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.': 'Voce pode gerenciar permissoes nas configuracoes do dispositivo. Desativar certas permissoes pode reduzir ou desativar recursos como notificacoes, descoberta por localizacao ou sessoes persistentes.',
      'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.': 'Podemos atualizar esta Politica de Cookies para refletir mudancas tecnologicas, legais ou de produto.',
      'Firebase services': 'Servicos Firebase',
      'Cloud hosting providers': 'Provedores de hospedagem em nuvem',
      'Database services': 'Servicos de banco de dados',
      'Push notification services': 'Servicos de notificacao push',
      'Analytics and crash reporting, if enabled': 'Analitica e relatorios de falhas, se habilitados',
      'Access the personal information we hold about you.': 'Acessar as informacoes pessoais que mantemos sobre voce.',
      'Update or correct your information.': 'Atualizar ou corrigir suas informacoes.',
      'Request deletion of your account or personal data.': 'Solicitar exclusao da sua conta ou dados pessoais.',
      'Contact GoOn regarding privacy questions or concerns.': 'Contatar a GoOn sobre duvidas ou preocupacoes de privacidade.',
      'For legal inquiries: idealcrea@gmail.com': 'Para assuntos legais: idealcrea@gmail.com',
      'For cookie-related questions: idealcrea@gmail.com': 'Para questoes sobre cookies: idealcrea@gmail.com',
      '1. Acceptance of Terms': '1. Aceitacao dos termos',
      '2. Description of Service': '2. Descricao do servico',
      '3. Account Responsibilities': '3. Responsabilidades da conta',
      '4. Acceptable Use': '4. Uso aceitavel',
      '5. Business Content and User Content': '5. Conteudo de negocios e usuarios',
      '6. Bookings and Communications': '6. Reservas e comunicacoes',
      '7. Suspension and Termination': '7. Suspensao e encerramento',
      '8. Disclaimer of Warranties': '8. Isencao de garantias',
      '9. Limitation of Liability': '9. Limitacao de responsabilidade',
      '10. Changes to Terms': '10. Alteracoes dos termos',
      '11. Contact': '11. Contato',
      '1. What Are Cookies and Similar Technologies': '1. O que sao cookies e tecnologias similares',
      '2. How GoOn Uses Them': '2. Como a GoOn os utiliza',
      '3. Mobile Environment': '3. Ambiente movel',
      '4. Your Choices': '4. Suas escolhas',
      '5. Updates': '5. Atualizacoes',
      '6. Contact': '6. Contato',
    },
  };

  const translateLegalDoc = (doc, lang) => {
    const dict = LEGAL_TRANSLATIONS[lang];

    const tr = (value) => {
      if (typeof value !== 'string') return value;
      if (dict && dict[value]) {
        return t(value, dict[value]);
      }
      return t(value, value);
    };

    return {
      ...doc,
      title: tr(doc.title),
      lastUpdated: tr(doc.lastUpdated),
      sections: (doc.sections || []).map((section) => ({
        ...section,
        heading: tr(section.heading),
        paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.map(tr) : section.paragraphs,
        bullets: Array.isArray(section.bullets) ? section.bullets.map(tr) : section.bullets,
      })),
    };
  };

  const recoverySteps = [
    t('recoveryStep1'),
    t('recoveryStep2'),
    t('recoveryStep3'),
  ];
  const recoveryOptions = [
    {
      key: 'email',
      title: t('recoveryOptionEmailTitle'),
      detail: t('recoveryOptionEmailDetail'),
      icon: '✉️',
    },
    {
      key: 'spam',
      title: t('recoveryOptionSpamTitle'),
      detail: t('recoveryOptionSpamDetail'),
      icon: '🛡️',
    },
    {
      key: 'mailapp',
      title: t('recoveryOptionMailTitle'),
      detail: t('recoveryOptionMailDetail'),
      icon: '📬',
    },
  ];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [authError, setAuthError] = useState('');
  const [legalVisible, setLegalVisible] = useState(false);
  const [legalType, setLegalType] = useState('terms');

  const resolveAuthErrorMessage = (res) => {
    const deletedMessage = t(
      'authAccountDeleted',
      'This account has been permanently deleted. You cannot sign in or create a new account with this email anymore.'
    );

    if (String(res?.errorCode || '').toUpperCase() === 'ACCOUNT_DELETED') {
      return deletedMessage;
    }

    const rawError = String(res?.error || '');
    if (/account has been deleted|cannot sign in anymore|cannot be used anymore/i.test(rawError)) {
      return deletedMessage;
    }

    return rawError || t('loginFailed', 'Unable to sign in. Please check your credentials and try again.');
  };

  const legalDocs = {
    privacy: {
      title: isFrench ? 'Politique de confidentialite' : 'Privacy Policy',
      lastUpdated: isFrench ? 'Derniere mise a jour : 22 juillet 2026' : 'Last updated: July 22, 2026',
      sections: [
        {
          heading: isFrench ? 'Sommaire' : 'Contents',
          bullets: [
            isFrench ? '1. Introduction' : '1. Introduction',
            isFrench ? '2. Informations que nous collectons' : '2. Information We Collect',
            isFrench ? '3. Utilisation des informations' : '3. How We Use Information',
            isFrench ? '4. Informations de localisation' : '4. Location Information',
            isFrench ? '5. Contenu genere par les utilisateurs' : '5. User Generated Content',
            isFrench ? '6. Partage des donnees' : '6. Data Sharing',
            isFrench ? '7. Services tiers' : '7. Third-Party Services',
            isFrench ? '8. Securite des donnees' : '8. Data Security',
            isFrench ? '9. Conservation des donnees et suppression du compte' : '9. Data Retention and Account Deletion',
            isFrench ? '10. Vie privee des enfants' : '10. Children\'s Privacy',
            isFrench ? '11. Vos droits en matiere de vie privee' : '11. Your Privacy Rights',
            isFrench ? '12. Modifications de cette politique de confidentialite' : '12. Changes to This Privacy Policy',
            isFrench ? '13. Contact' : '13. Contact Information',
          ],
        },
        {
          heading: isFrench ? '1. Introduction' : '1. Introduction',
          paragraphs: [
            isFrench
              ? 'GoOn est une plateforme locale de decouverte d\'entreprises et de reservation qui connecte les clients aux entreprises de proximite. Via l\'application mobile GoOn, les clients peuvent decouvrir des entreprises, consulter des profils, echanger des messages, reserver des rendez-vous, laisser des avis et recevoir des notifications. Les entreprises peuvent gerer leurs profils, communiquer avec les clients, organiser leurs rendez-vous et promouvoir leurs services.'
              : 'GoOn is a local business discovery and booking platform that connects customers with local businesses. Through the GoOn mobile application, customers can discover businesses, view profiles, exchange messages, book appointments, leave reviews, and receive notifications. Businesses can manage their profiles, communicate with customers, manage appointments, and promote their services.',
            isFrench
              ? 'Votre vie privee est importante pour nous. Cette politique de confidentialite explique quelles informations nous collectons, comment nous les utilisons et quels choix vous avez. En utilisant GoOn, vous acceptez les pratiques decrites dans cette politique.'
              : 'Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using GoOn, you agree to the practices described in this policy.',
          ],
        },
        {
          heading: isFrench ? '2. Informations que nous collectons' : '2. Information We Collect',
          paragraphs: [isFrench ? 'Nous collectons les categories d\'informations suivantes :' : 'We collect the following categories of information:'],
          bullets: [
            isFrench ? 'Informations de compte : nom, email et numero de telephone (si fourni).' : 'Account information: such as your name, email address, and phone number (if provided).',
            isFrench ? 'Informations de profil : details ajoutes a votre profil client ou entreprise.' : 'Profile information: details you add to your customer or business profile.',
            isFrench ? 'Informations entreprise : services, horaires et coordonnees fournis par les comptes entreprise.' : 'Business information: information provided by business accounts, including services, hours, and contact details.',
            isFrench ? 'Donnees de localisation : collectees uniquement si vous autorisez l\'acces a la localisation.' : 'Location data: collected only when you allow location access through your device.',
            isFrench ? 'Messages et communications : messages echanges entre clients et entreprises via l\'application.' : 'Messages and communications: messages exchanged between customers and businesses through the app.',
            isFrench ? 'Informations de rendez-vous et reservation : details des rendez-vous reserves ou recus.' : 'Appointment and booking information: details related to appointments you book or receive.',
            isFrench ? 'Avis et notes : contenu que vous publiez sur les entreprises.' : 'Reviews and ratings: content you submit about businesses.',
            isFrench ? 'Photos : images televersees par les utilisateurs ou les entreprises.' : 'Photos: images uploaded by users or businesses.',
            isFrench ? 'Informations techniques de l\'appareil : modele, systeme, version de l\'app et diagnostic.' : 'Device information and technical data: such as device model, operating system, app version, and diagnostic information.',
            isFrench ? 'Informations de notification push : tokens et preferences utilises pour livrer les notifications.' : 'Push notification information: tokens and preferences used to deliver notifications.',
          ],
        },
        {
          heading: isFrench ? '3. Utilisation des informations' : '3. How We Use Information',
          paragraphs: [isFrench ? 'Nous utilisons ces informations pour :' : 'We use the information we collect to:'],
          bullets: [
            isFrench ? 'Creer et gerer les comptes utilisateurs et entreprises.' : 'Create and manage user and business accounts.',
            isFrench ? 'Connecter les clients aux entreprises locales.' : 'Connect customers with local businesses.',
            isFrench ? 'Fournir la messagerie, la reservation et les services associes.' : 'Provide messaging, booking, and related services.',
            isFrench ? 'Ameliorer la fiabilite, les fonctionnalites et l\'experience utilisateur.' : 'Improve app functionality, reliability, and user experience.',
            isFrench ? 'Envoyer des notifications pertinentes selon votre activite et vos preferences.' : 'Send notifications relevant to your activity and preferences.',
            isFrench ? 'Maintenir la securite et l\'integrite de la plateforme.' : 'Maintain the security and integrity of the platform.',
            isFrench ? 'Fournir une assistance client et repondre a vos demandes.' : 'Provide customer support and respond to inquiries.',
          ],
        },
        {
          heading: isFrench ? '4. Informations de localisation' : '4. Location Information',
          paragraphs: [
            isFrench
              ? 'Avec votre permission, nous utilisons la localisation de votre appareil pour vous aider a decouvrir des entreprises proches et ameliorer les resultats de recherche locale.'
              : 'With your permission, we use your device location to help you discover nearby businesses and improve local search results.',
            isFrench
              ? 'Vous pouvez activer ou desactiver cet acces a tout moment depuis les reglages de votre appareil. La desactivation peut limiter certaines fonctionnalites de l\'application.'
              : 'You can enable or disable location access at any time through your device settings. Disabling location access may limit certain features of the app.',
          ],
        },
        {
          heading: isFrench ? '5. Contenu genere par les utilisateurs' : '5. User Generated Content',
          paragraphs: [
            isFrench
              ? 'Les utilisateurs et les entreprises peuvent publier du contenu sur GoOn, y compris des avis, photos, details de profil et messages.'
              : 'Users and businesses may submit content to GoOn, including reviews, photos, profile details, and messages.',
            isFrench
              ? 'Vous etes responsable du contenu que vous publiez et de sa conformite aux lois applicables et a nos politiques. GoOn peut retirer tout contenu contraire a ces regles.'
              : 'You are responsible for the content you submit and for ensuring that it complies with applicable laws and our policies. GoOn may remove content that violates our policies or applicable law.',
          ],
        },
        {
          heading: isFrench ? '6. Partage des donnees' : '6. Data Sharing',
          paragraphs: [
            isFrench ? 'GoOn ne vend pas vos informations personnelles.' : 'GoOn does not sell your personal information.',
            isFrench
              ? 'Nous pouvons partager certaines informations avec des prestataires de confiance qui nous aident a exploiter l\'application, notamment pour l\'hebergement, l\'authentification, la base de donnees et les notifications. Ces prestataires ne peuvent utiliser vos informations que pour fournir ces services.'
              : 'We may share information with trusted service providers that help us operate the app, including hosting, authentication, database, and notification providers. These providers are only permitted to use your information as needed to provide services to us.',
            isFrench
              ? 'Nous pouvons egalement divulguer des informations lorsque la loi l\'exige, dans le cadre d\'une procedure legale, ou pour proteger les droits, la securite et les biens de GoOn, de nos utilisateurs ou de tiers.'
              : 'We may also disclose information when required by law, legal process, or to protect the rights, safety, and property of GoOn, our users, or others.',
          ],
        },
        {
          heading: isFrench ? '7. Services tiers' : '7. Third-Party Services',
          paragraphs: [
            isFrench
              ? 'GoOn peut utiliser des services tiers pour faire fonctionner l\'application. Ces services peuvent inclure :'
              : 'GoOn may use third-party services to support the app. These services may include:',
          ],
          bullets: [
            isFrench ? 'Services Firebase' : 'Firebase services',
            isFrench ? 'Fournisseurs cloud d\'hebergement' : 'Cloud hosting providers',
            isFrench ? 'Services de base de donnees' : 'Database services',
            isFrench ? 'Services de notifications push' : 'Push notification services',
            isFrench ? 'Analytics et rapports de crash, si actives' : 'Analytics and crash reporting, if enabled',
          ],
        },
        {
          heading: isFrench ? '8. Securite des donnees' : '8. Data Security',
          paragraphs: [
            isFrench
              ? 'Nous mettons en oeuvre des mesures techniques et organisationnelles raisonnables pour proteger vos informations contre tout acces, divulgation, alteration ou destruction non autorise.'
              : 'We use reasonable technical and organizational measures to help protect your information from unauthorized access, disclosure, alteration, or destruction.',
            isFrench
              ? 'Toutefois, aucune methode de transmission sur internet ou de stockage electronique n\'est totalement securisee, et nous ne pouvons pas garantir une securite absolue.'
              : 'However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.',
          ],
        },
        {
          heading: isFrench ? '9. Conservation des donnees et suppression du compte' : '9. Data Retention and Account Deletion',
          paragraphs: [
            isFrench
              ? 'Vous pouvez demander la suppression de votre compte et des donnees personnelles associees a tout moment en nous contactant.'
              : 'You may request deletion of your account and associated personal data at any time by contacting us.',
            isFrench
              ? 'Certaines informations peuvent etre conservees apres suppression lorsque cela est necessaire pour respecter des obligations legales, resoudre des litiges, prevenir la fraude ou faire appliquer nos accords.'
              : 'Some information may be retained after account deletion when necessary to comply with legal obligations, resolve disputes, prevent fraud, or enforce our agreements.',
          ],
        },
        {
          heading: isFrench ? '10. Vie privee des enfants' : '10. Children\'s Privacy',
          paragraphs: [
            isFrench
              ? 'GoOn n\'est pas concu pour les enfants de moins de 13 ans et ne leur est pas destine. Nous ne collectons pas sciemment de donnees personnelles concernant des enfants de moins de 13 ans.'
              : 'GoOn is not designed for or directed to children under the age of 13. We do not knowingly collect personal information from children under 13.',
            isFrench
              ? 'Si vous pensez qu\'un enfant nous a fourni des informations personnelles, contactez-nous afin que nous puissions prendre les mesures appropriees pour les supprimer.'
              : 'If you believe a child has provided us with personal information, please contact us so we can take appropriate steps to remove it.',
          ],
        },
        {
          heading: isFrench ? '11. Vos droits en matiere de vie privee' : '11. Your Privacy Rights',
          paragraphs: [isFrench ? 'Selon votre lieu de residence, vous pouvez avoir le droit de :' : 'Depending on your location, you may have the right to:'],
          bullets: [
            isFrench ? 'Acceder aux informations personnelles que nous detenons sur vous.' : 'Access the personal information we hold about you.',
            isFrench ? 'Mettre a jour ou corriger vos informations.' : 'Update or correct your information.',
            isFrench ? 'Demander la suppression de votre compte ou de vos donnees personnelles.' : 'Request deletion of your account or personal data.',
            isFrench ? 'Contacter GoOn pour toute question ou preoccupation relative a la vie privee.' : 'Contact GoOn regarding privacy questions or concerns.',
          ],
        },
        {
          heading: isFrench ? '12. Modifications de cette politique de confidentialite' : '12. Changes to This Privacy Policy',
          paragraphs: [
            isFrench
              ? 'Nous pouvons mettre a jour cette politique de confidentialite de temps en temps. En cas de modification importante, nous vous informerons via l\'application ou notre site web. Votre utilisation continue de GoOn apres une mise a jour signifie que vous acceptez la version revisee.'
              : 'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or on our website. Your continued use of GoOn after any update means you accept the revised policy.',
          ],
        },
        {
          heading: isFrench ? '13. Contact' : '13. Contact Information',
          paragraphs: [
            'GoOn Support',
            'Email: idealcrea@gmail.com',
            '© 2026 GoOn. All rights reserved.',
          ],
        },
      ],
    },
    terms: {
      title: isFrench ? 'Conditions d\'utilisation' : 'Terms of Service',
      lastUpdated: isFrench ? 'Derniere mise a jour : 05 aout 2026' : 'Last updated: August 05, 2026',
      sections: [
        {
          heading: isFrench ? '1. Acceptation des conditions' : '1. Acceptance of Terms',
          paragraphs: [
            isFrench
              ? 'En accedant a GoOn ou en l\'utilisant, vous acceptez d\'etre lie par ces conditions d\'utilisation. Si vous n\'etes pas d\'accord, veuillez ne pas utiliser l\'application.'
              : 'By accessing or using GoOn, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.',
          ],
        },
        {
          heading: isFrench ? '2. Description du service' : '2. Description of Service',
          paragraphs: [
            isFrench
              ? 'GoOn est une plateforme locale de decouverte d\'entreprises, de messagerie et de reservation pour les clients et les entreprises.'
              : 'GoOn is a local business discovery, messaging, and booking platform for customers and businesses.',
          ],
        },
        {
          heading: isFrench ? '3. Responsabilites du compte' : '3. Account Responsibilities',
          bullets: [
            isFrench ? 'Vous devez fournir des informations exactes et a jour.' : 'You must provide accurate and current information.',
            isFrench ? 'Vous etes responsable de la confidentialite de vos identifiants.' : 'You are responsible for maintaining the confidentiality of your account credentials.',
            isFrench ? 'Vous etes responsable des activites effectuees avec votre compte.' : 'You are responsible for activities under your account.',
          ],
        },
        {
          heading: isFrench ? '4. Utilisation acceptable' : '4. Acceptable Use',
          bullets: [
            isFrench ? 'Ne pas detourner, perturber ou retro-concevoir le service.' : 'Do not misuse, disrupt, or reverse engineer the service.',
            isFrench ? 'Ne pas soumettre de contenu illicite, abusif, frauduleux ou contrefaisant.' : 'Do not submit unlawful, abusive, fraudulent, or infringing content.',
            isFrench ? 'Ne pas tenter un acces non autorise aux systemes ou donnees.' : 'Do not attempt unauthorized access to systems or data.',
          ],
        },
        {
          heading: isFrench ? '5. Contenu des entreprises et des utilisateurs' : '5. Business Content and User Content',
          paragraphs: [
            isFrench
              ? 'Les entreprises et utilisateurs conservent la propriete de leur contenu. En publiant du contenu sur GoOn, vous nous accordez une licence limitee pour l\'heberger, l\'afficher et le traiter uniquement afin d\'exploiter le service.'
              : 'Businesses and users retain ownership of their content. By submitting content to GoOn, you grant us a limited license to host, display, and process it solely for operating the service.',
          ],
        },
        {
          heading: isFrench ? '6. Reservations et communications' : '6. Bookings and Communications',
          paragraphs: [
            isFrench
              ? 'GoOn facilite les reservations et les communications entre clients et entreprises. GoOn n\'est pas partie a l\'execution des prestations fournies par des entreprises independantes.'
              : 'GoOn facilitates bookings and communications between customers and businesses. GoOn is not a party to service performance by independent businesses.',
          ],
        },
        {
          heading: isFrench ? '7. Suspension et resiliation' : '7. Suspension and Termination',
          paragraphs: [
            isFrench
              ? 'Nous pouvons suspendre ou supprimer les comptes qui violent ces conditions, la loi applicable ou les exigences de securite de la plateforme.'
              : 'We may suspend or terminate accounts that violate these terms, applicable law, or platform safety requirements.',
          ],
        },
        {
          heading: isFrench ? '8. Exclusion de garantie' : '8. Disclaimer of Warranties',
          paragraphs: [
            isFrench
              ? 'Le service est fourni "en l\'etat" et "selon disponibilite", sans garantie d\'aucune sorte, dans les limites autorisees par la loi.'
              : 'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.',
          ],
        },
        {
          heading: isFrench ? '9. Limitation de responsabilite' : '9. Limitation of Liability',
          paragraphs: [
            isFrench
              ? 'Dans la mesure maximale permise par la loi, GoOn ne pourra etre tenu responsable des dommages indirects, accessoires, speciaux, consecutifs ou punitifs lies a votre utilisation du service.'
              : 'To the maximum extent permitted by law, GoOn shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.',
          ],
        },
        {
          heading: isFrench ? '10. Modifications des conditions' : '10. Changes to Terms',
          paragraphs: [
            isFrench
              ? 'Nous pouvons modifier ces conditions de temps a autre. La poursuite de l\'utilisation de GoOn apres mise a jour vaut acceptation des conditions revisees.'
              : 'We may update these terms from time to time. Continued use of GoOn after updates constitutes acceptance of the revised terms.',
          ],
        },
        {
          heading: isFrench ? '11. Contact' : '11. Contact',
          paragraphs: [
            isFrench ? 'Pour les demandes juridiques : idealcrea@gmail.com' : 'For legal inquiries: idealcrea@gmail.com',
          ],
        },
      ],
    },
    cookies: {
      title: isFrench ? 'Politique de cookies' : 'Cookie Policy',
      lastUpdated: isFrench ? 'Derniere mise a jour : 05 aout 2026' : 'Last updated: August 05, 2026',
      sections: [
        {
          heading: isFrench ? '1. Que sont les cookies et technologies similaires' : '1. What Are Cookies and Similar Technologies',
          paragraphs: [
            isFrench
              ? 'Les cookies et technologies similaires sont de petits identifiants utilises pour ameliorer la fiabilite, la securite et l\'utilisabilite de notre ecosysteme applicatif.'
              : 'Cookies and similar technologies are small identifiers used to improve reliability, security, and usability across our app ecosystem.',
          ],
        },
        {
          heading: isFrench ? '2. Comment GoOn les utilise' : '2. How GoOn Uses Them',
          bullets: [
            isFrench ? 'Authentification et continuite de session.' : 'Authentication and session continuity.',
            isFrench ? 'Surveillance de securite et prevention de la fraude.' : 'Security monitoring and fraud prevention.',
            isFrench ? 'Performance applicative et diagnostic de fiabilite.' : 'App performance and reliability diagnostics.',
            isFrench ? 'Gestion des notifications et des preferences.' : 'Notification and preference management.',
          ],
        },
        {
          heading: isFrench ? '3. Environnement mobile' : '3. Mobile Environment',
          paragraphs: [
            isFrench
              ? 'Sur mobile, ces technologies peuvent inclure des tokens de stockage local et des identifiants appareil utilises pour une connexion securisee et les notifications push.'
              : 'On mobile, these technologies may include local storage tokens and device-level identifiers used for secure login and push notifications.',
          ],
        },
        {
          heading: isFrench ? '4. Vos choix' : '4. Your Choices',
          paragraphs: [
            isFrench
              ? 'Vous pouvez gerer les permissions depuis les reglages de votre appareil. La desactivation de certaines permissions peut reduire ou desactiver des fonctionnalites comme les notifications, la decouverte locale ou la persistance de session.'
              : 'You can manage permissions from your device settings. Disabling certain permissions may reduce or disable some features such as notifications, location-based discovery, or persistent sessions.',
          ],
        },
        {
          heading: isFrench ? '5. Mises a jour' : '5. Updates',
          paragraphs: [
            isFrench
              ? 'Nous pouvons mettre a jour cette politique de cookies pour refleter les evolutions technologiques, legales ou produit.'
              : 'We may update this Cookie Policy to reflect changes in technology, legal requirements, or product features.',
          ],
        },
        {
          heading: isFrench ? '6. Contact' : '6. Contact',
          paragraphs: [
            isFrench ? 'Pour toute question sur les cookies : idealcrea@gmail.com' : 'For cookie-related questions: idealcrea@gmail.com',
          ],
        },
      ],
    },
  };

  const selectedLegalDocRaw = legalDocs[legalType] || legalDocs.terms;
  const selectedLegalDoc = legalLang ? translateLegalDoc(selectedLegalDocRaw, legalLang) : selectedLegalDocRaw;

  const handleLogin = async () => {
    setAuthError('');
    const res = await login(email, password);

    if (!res.success) {
      const message = resolveAuthErrorMessage(res);
      setAuthError(message);
      console.log(message);
    }
  };

  const openRecovery = () => {
    setRecoveryEmail(email.trim());
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryVisible(true);
  };

  const openLegal = (type) => {
    setLegalType(type);
    setLegalVisible(true);
  };

  const closeLegal = () => {
    setLegalVisible(false);
  };

  const closeRecovery = () => {
    if (recoveryLoading) return;
    setRecoveryVisible(false);
    setRecoveryError('');
    setRecoveryMessage('');
  };

  const handleSendRecovery = async () => {
    const targetEmail = recoveryEmail.trim();

    if (!emailRegex.test(targetEmail)) {
      setRecoveryError(t('recoveryEmailInvalid'));
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoveryMessage('');

    try {
      await resetPassword(targetEmail);
      setRecoveryMessage(t('recoveryEmailSent'));
    } catch (error) {
      const message = error?.message || t('recoveryUnableSend');
      setRecoveryError(message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const openMailApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL('mailto:');
      if (canOpen) {
        await Linking.openURL('mailto:');
      }
    } catch (_) {
      Alert.alert(t('recoveryOpenMail'), t('recoveryUnableSend'));
    }
  };

  const isDisabled = !email || !password || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{u('appBusinessTitle')}</Text>
        <Text style={styles.subtitle}>{u('appBusinessSubtitle')}</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('email')}</Text>
          <TextInput
            placeholder={t('email')}
            placeholderTextColor="#8E8E93"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (authError) setAuthError('');
            }}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder={t('passwordMask', '••••••••')}
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (authError) setAuthError('');
              }}
              secureTextEntry={secure}
              style={styles.inputFlex}
            />
            <TouchableOpacity onPress={() => setSecure(!secure)}>
              <Text style={styles.show}>
                {secure ? t('show') : t('hide')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isDisabled}
          style={[
            styles.button,
            isDisabled && styles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          )}
        </TouchableOpacity>

            {/* ── Guest Mode Button ── */}
            <TouchableOpacity style={styles.guestButton} onPress={async () => { await enterGuestMode(); navigation.navigate('ProHome'); }} activeOpacity={0.85}>
              <Text style={styles.guestButtonText}>{u('continueAsGuest')}</Text>
            </TouchableOpacity>


        {!!authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity onPress={openRecovery} activeOpacity={0.82}>
            <Text style={styles.footerText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerTextStrong}>{t('createAccount')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalWrap}>
          <Text style={styles.legalText}>
            {t('loginLegalPrefix', 'By continuing, you agree to our')}{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('terms')}>
              {t('loginLegalTerms', 'Terms of Service')}
            </Text>
            ,{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('privacy')}>
              {t('loginLegalPrivacy', 'Privacy Policy')}
            </Text>{' '}
            {t('loginLegalAnd', 'and')}{' '}
            <Text style={styles.legalLink} onPress={() => openLegal('cookies')}>
              {t('loginLegalCookies', 'Cookie Policy')}
            </Text>
            .
          </Text>
        </View>
      </View>

      <Modal
        visible={recoveryVisible}
        animationType="fade"
        transparent
        onRequestClose={closeRecovery}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouchable} onPress={closeRecovery} />
          <Pressable style={styles.recoverySheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>{t('recoveryTitle')}</Text>
                <Text style={styles.sheetSubtitle}>{t('recoverySubtitle')}</Text>
              </View>
              <TouchableOpacity onPress={closeRecovery} disabled={recoveryLoading} activeOpacity={0.8}>
                <Text style={styles.closeBtn}>{t('close')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              nestedScrollEnabled
              alwaysBounceVertical
            >
              <View style={styles.stepCard}>
                <Text style={styles.sectionLabel}>{t('recoveryHowItWorks')}</Text>
                {recoverySteps.map((step, index) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.formCard}>
                <Text style={styles.sectionLabel}>{t('recoverySendLink')}</Text>
                <Text style={styles.formHint}>{t('recoverySubtitle')}</Text>

                <TextInput
                  placeholder={t('email')}
                  placeholderTextColor="#7C7C93"
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  style={styles.recoveryInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                {!!recoveryError ? <Text style={styles.errorText}>{recoveryError}</Text> : null}
                {!!recoveryMessage ? <Text style={styles.successText}>{recoveryMessage}</Text> : null}

                <TouchableOpacity
                  onPress={handleSendRecovery}
                  disabled={recoveryLoading}
                  style={[styles.recoveryButton, recoveryLoading && styles.recoveryButtonDisabled]}
                  activeOpacity={0.86}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.recoveryButtonText}>{t('recoverySendLink')}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.optionsCard}>
                <Text style={styles.sectionLabel}>{t('recoveryUsefulOptions')}</Text>
                {recoveryOptions.map((option) => (
                  <View key={option.key} style={styles.optionRow}>
                    <View style={styles.optionIconWrap}>
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDetail}>{option.detail}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity onPress={openMailApp} style={styles.secondaryButton} activeOpacity={0.85}>
                  <Text style={styles.secondaryButtonText}>{t('recoveryOpenMail')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sheetNote}>
                <Text style={styles.sheetNoteTitle}>{t('recoverySecurityTip')}</Text>
                <Text style={styles.sheetNoteText}>{t('recoverySecurityText')}</Text>
              </View>
            </ScrollView>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={legalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeLegal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouchable} onPress={closeLegal} />
          <View style={styles.legalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.legalBrandWrap}>
              <View style={styles.legalBrandBadge}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.legalBrandLogo}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.legalBrandText}>GoOn</Text>
            </View>
            <View style={styles.legalHeader}>
              <Text style={styles.legalTitle}>{selectedLegalDoc.title}</Text>
              <TouchableOpacity onPress={closeLegal} activeOpacity={0.8}>
                <Text style={styles.closeBtn}>{t('close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalMeta}>{selectedLegalDoc.lastUpdated}</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.legalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {selectedLegalDoc.sections.map((section) => (
                <View key={section.heading} style={styles.legalSectionCard}>
                  <Text style={styles.legalSectionTitle}>{section.heading}</Text>

                  {Array.isArray(section.paragraphs)
                    ? section.paragraphs.map((paragraph, index) => (
                        <Text key={`${section.heading}-p-${index}`} style={styles.legalBody}>
                          {paragraph}
                        </Text>
                      ))
                    : null}

                  {Array.isArray(section.bullets)
                    ? section.bullets.map((bullet, index) => (
                        <View key={`${section.heading}-b-${index}`} style={styles.legalBulletRow}>
                          <Text style={styles.legalBulletDot}>•</Text>
                          <Text style={styles.legalBulletText}>{bullet}</Text>
                        </View>
                      ))
                    : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0E6F8',
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    shadowColor: '#7421A8',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#251A34',
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#8B7A9F',
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '500',
  },

  inputBox: {
    marginBottom: 16,
  },

  label: {
    color: '#7421A8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  input: {
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    padding: 14,
    color: '#251A34',
    borderWidth: 1,
    borderColor: '#D9D2E8',
    fontSize: 15,
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    paddingRight: 12,
  },

  inputFlex: {
    flex: 1,
    padding: 14,
    color: '#251A34',
    fontSize: 15,
  },

  show: {
    color: '#8F2AC3',
    fontWeight: '700',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#8F2AC3',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7421A8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  footerText: {
    color: '#8B7A9F',
    fontSize: 13,
    fontWeight: '500',
  },

  footerTextStrong: {
    color: '#8F2AC3',
    fontWeight: '800',
    fontSize: 13,
  },

  legalWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECE4F5',
  },

  legalText: {
    color: '#7F6C97',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },

  legalLink: {
    color: '#6D1DA0',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(37, 26, 52, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  recoverySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#D9D2E8',
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D9D2E8',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#251A34',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#8B7A9F',
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    color: '#8F2AC3',
    fontWeight: '700',
    fontSize: 14,
    paddingTop: 4,
  },
  sheetScroll: {
    paddingBottom: 8,
    gap: 14,
  },
  stepCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  sectionLabel: {
    color: '#7421A8',
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8F2AC3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    color: '#251A34',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  formHint: {
    color: '#8B7A9F',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '500',
  },
  recoveryInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#251A34',
    borderWidth: 1,
    borderColor: '#D9D2E8',
    fontSize: 15,
  },
  errorText: {
    color: '#C0392B',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  successText: {
    color: '#27AE60',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  recoveryButton: {
    marginTop: 14,
    backgroundColor: '#8F2AC3',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7421A8',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  recoveryButtonDisabled: {
    opacity: 0.6,
  },
  recoveryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  optionsCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0E6F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9D2E8',
  },
  optionIcon: {
    fontSize: 18,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: '#251A34',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 3,
  },
  optionDetail: {
    color: '#8B7A9F',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#8F2AC3',
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F0E6F8',
  },
  secondaryButtonText: {
    color: '#7421A8',
    fontWeight: '800',
    fontSize: 14,
  },
  sheetNote: {
    backgroundColor: '#F0E6F8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    padding: 14,
  },
  sheetNoteTitle: {
    color: '#251A34',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  sheetNoteText: {
    color: '#8B7A9F',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  legalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#D9D2E8',
    maxHeight: '88%',
  },
  legalBrandWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  legalBrandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7421A8',
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7DEF3',
  },
  legalBrandLogo: {
    width: '100%',
    height: '100%',
  },
  legalBrandText: {
    marginTop: 6,
    color: '#251A34',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  legalTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    color: '#251A34',
    letterSpacing: -0.2,
  },
  legalScroll: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  legalSectionCard: {
    backgroundColor: '#F9F5FE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6DDF2',
    padding: 12,
  },
  legalSectionTitle: {
    color: '#5E1E90',
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 8,
  },
  legalBody: {
    color: '#5A4A6F',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  legalBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 4,
  },
  legalBulletDot: {
    color: '#7A2AAF',
    fontSize: 16,
    lineHeight: 20,
    width: 14,
    fontWeight: '900',
  },
  legalBulletText: {
    flex: 1,
    color: '#5A4A6F',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  legalMeta: {
    marginBottom: 8,
    color: '#8B7A9F',
    fontSize: 12,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  guestButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '700',
  },

});