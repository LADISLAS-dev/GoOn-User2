import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { createAppointment, getCompanyById } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#F8F0FF',
  card: '#FFFFFF',
  separator: '#E8D8F6',
  label: '#73628E',
  primary: '#8B2FC9',
  primaryDark: '#6A1FA0',
  primaryLight: '#F3E8FF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  textPrimary: '#211A2E',
  textSecondary: '#6B6B8A',
  textTertiary: '#AEA0C6',
};

const APPOINTMENT_TYPES = [
  { id: 'video', icon: '📹' },
  { id: 'in_person', icon: '🏢' },
  { id: 'phone', icon: '📞' },
  { id: 'message', icon: '💬' },
];

const DURATIONS = ['15 min', '30 min', '45 min', '1h', '1h30', '2h'];

const PRIORITIES = [
  { id: 'low', color: '#34C759', bg: '#E9F8EE' },
  { id: 'normal', color: '#FF9500', bg: '#FFF4E5' },
  { id: 'high', color: '#FF3B30', bg: '#FFEEED' },
];

const REPEAT_OPTIONS = [
  { id: 'never' },
  { id: 'daily' },
  { id: 'weekly' },
  { id: 'monthly' },
];

const PRIVACY_OPTIONS = [
  { id: 'shared' },
  { id: 'private' },
];

const LOCALE_BY_LANGUAGE = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ar: 'ar-SA',
  bn: 'bn-BD',
  ru: 'ru-RU',
  ja: 'ja-JP',
  de: 'de-DE',
  id: 'id-ID',
  ur: 'ur-PK',
};

const APPOINTMENT_COPY = {
  fr: {
    defaultUser: 'Utilisateur',
    autoRecipient: 'Destinataire automatique',
    reservationPrefix: 'Reservation',
    servicePrefix: 'Service',
    pricePrefix: 'Prix',
    repeatTitle: 'Repetition',
    repeatSubtitle: 'Choisir une frequence',
    privacyTitle: 'Confidentialite',
    privacySubtitle: 'Choisir la visibilite',
    impossibleTitle: 'Rendez-vous impossible',
    impossibleBody: 'Tu ne peux pas creer un rendez-vous avec ta propre entreprise. Connecte-toi avec un autre compte client pour tester ce flux.',
    videoLinkPrefix: 'Lien visio',
    messageAt: 'a',
    back: 'Retour',
    navTitle: 'Nouveau rendez-vous',
    sending: 'Envoi...',
    send: 'Envoyer',
    planning: 'Planification',
    heroSub: 'Compose un rendez-vous clair, pro et elegant.',
    chooseDate: 'Date a choisir',
    recipient: 'Destinataire',
    noOwner: 'Aucun proprietaire trouve pour cette entreprise.',
    selfHint: 'Tu es connecte avec le compte proprietaire de cette entreprise. Les rendez-vous doivent etre crees depuis un autre compte.',
    typeSection: 'Type de rendez-vous',
    dateTimeSection: 'Date et heure',
    datePlaceholder: 'Choisir la date (jour/mois/annee)',
    timePlaceholder: 'Choisir l\'heure',
    duration: 'Duree',
    details: 'Details',
    titlePlaceholder: 'Titre du rendez-vous',
    locationPlaceholder: 'Lieu ou lien de reunion',
    priority: 'Priorite',
    notes: 'Notes',
    notePlaceholder: 'Ordre du jour, documents a preparer...',
    options: 'Options',
    reminder: 'Rappel',
    reminderSub: '15 min avant',
    repetition: 'Repetition',
    privacy: 'Confidentialite',
    missingPrefix: 'Manquant : ',
    missingDifferentAccount: 'un compte client different',
    missingRecipient: 'destinataire',
    missingTitle: 'titre',
    missingDateTime: 'date et heure',
    creating: 'Creation en cours...',
    confirm: 'Confirmer le rendez-vous',
    typeVideoLabel: 'Visio',
    typeVideoSub: 'Lien auto-genere',
    typeInPersonLabel: 'Presentiel',
    typeInPersonSub: 'Lieu a preciser',
    typePhoneLabel: 'Telephone',
    typePhoneSub: 'Audio uniquement',
    typeMessageLabel: 'Message',
    typeMessageSub: 'Notification push',
    priorityLow: 'Faible',
    priorityNormal: 'Normale',
    priorityHigh: 'Urgente',
    repeatNever: 'Jamais',
    repeatDaily: 'Tous les jours',
    repeatWeekly: 'Chaque semaine',
    repeatMonthly: 'Chaque mois',
    privacyShared: 'Partage avec le destinataire',
    privacyPrivate: 'Prive (visible pour moi)',
    cancel: 'Annuler',
    datePickerConfirm: 'Confirmer',
    datePickerCancel: 'Annuler',
  },
  en: {
    defaultUser: 'User', autoRecipient: 'Automatic recipient', reservationPrefix: 'Booking', servicePrefix: 'Service', pricePrefix: 'Price',
    repeatTitle: 'Repeat', repeatSubtitle: 'Choose a frequency', privacyTitle: 'Privacy', privacySubtitle: 'Choose visibility',
    impossibleTitle: 'Appointment not allowed', impossibleBody: 'You cannot create an appointment with your own company. Sign in with another client account to test this flow.',
    videoLinkPrefix: 'Video link', messageAt: 'at', back: 'Back', navTitle: 'New appointment', sending: 'Sending...', send: 'Send',
    planning: 'Planning', heroSub: 'Create a clear and professional appointment.', chooseDate: 'Choose date', recipient: 'Recipient',
    noOwner: 'No owner found for this company.', selfHint: 'You are signed in with the owner account of this company. Appointments must be created from another account.',
    typeSection: 'Appointment type', dateTimeSection: 'Date and time', datePlaceholder: 'Choose date (day/month/year)', timePlaceholder: 'Choose time',
    duration: 'Duration', details: 'Details', titlePlaceholder: 'Appointment title', locationPlaceholder: 'Location or meeting link',
    priority: 'Priority', notes: 'Notes', notePlaceholder: 'Agenda, documents to prepare...', options: 'Options', reminder: 'Reminder',
    reminderSub: '15 min before', repetition: 'Repeat', privacy: 'Privacy', missingPrefix: 'Missing: ', missingDifferentAccount: 'a different client account',
    missingRecipient: 'recipient', missingTitle: 'title', missingDateTime: 'date and time', creating: 'Creating...', confirm: 'Confirm appointment',
    typeVideoLabel: 'Video', typeVideoSub: 'Auto-generated link', typeInPersonLabel: 'In person', typeInPersonSub: 'Location required',
    typePhoneLabel: 'Phone', typePhoneSub: 'Audio only', typeMessageLabel: 'Message', typeMessageSub: 'Push notification',
    priorityLow: 'Low', priorityNormal: 'Normal', priorityHigh: 'Urgent', repeatNever: 'Never', repeatDaily: 'Every day',
    repeatWeekly: 'Every week', repeatMonthly: 'Every month', privacyShared: 'Shared with recipient', privacyPrivate: 'Private (visible to me)', cancel: 'Cancel', datePickerConfirm: 'Confirm', datePickerCancel: 'Cancel',
  },
  es: {
    defaultUser: 'Usuario', autoRecipient: 'Destinatario automatico', reservationPrefix: 'Reserva', servicePrefix: 'Servicio', pricePrefix: 'Precio',
    repeatTitle: 'Repeticion', repeatSubtitle: 'Elige una frecuencia', privacyTitle: 'Privacidad', privacySubtitle: 'Elige la visibilidad',
    impossibleTitle: 'Cita no permitida', impossibleBody: 'No puedes crear una cita con tu propia empresa. Inicia sesion con otra cuenta cliente para probar este flujo.',
    videoLinkPrefix: 'Enlace de video', messageAt: 'a las', back: 'Atras', navTitle: 'Nueva cita', sending: 'Enviando...', send: 'Enviar',
    planning: 'Planificacion', heroSub: 'Crea una cita clara y profesional.', chooseDate: 'Elegir fecha', recipient: 'Destinatario',
    noOwner: 'No se encontro propietario para esta empresa.', selfHint: 'Estas conectado con la cuenta propietaria de esta empresa. Las citas deben crearse desde otra cuenta.',
    typeSection: 'Tipo de cita', dateTimeSection: 'Fecha y hora', datePlaceholder: 'Elegir fecha (dia/mes/ano)', timePlaceholder: 'Elegir hora',
    duration: 'Duracion', details: 'Detalles', titlePlaceholder: 'Titulo de la cita', locationPlaceholder: 'Lugar o enlace de reunion',
    priority: 'Prioridad', notes: 'Notas', notePlaceholder: 'Agenda, documentos para preparar...', options: 'Opciones', reminder: 'Recordatorio',
    reminderSub: '15 min antes', repetition: 'Repeticion', privacy: 'Privacidad', missingPrefix: 'Falta: ', missingDifferentAccount: 'una cuenta cliente diferente',
    missingRecipient: 'destinatario', missingTitle: 'titulo', missingDateTime: 'fecha y hora', creating: 'Creando...', confirm: 'Confirmar cita',
    typeVideoLabel: 'Video', typeVideoSub: 'Enlace autogenerado', typeInPersonLabel: 'Presencial', typeInPersonSub: 'Lugar por definir',
    typePhoneLabel: 'Telefono', typePhoneSub: 'Solo audio', typeMessageLabel: 'Mensaje', typeMessageSub: 'Notificacion push',
    priorityLow: 'Baja', priorityNormal: 'Normal', priorityHigh: 'Urgente', repeatNever: 'Nunca', repeatDaily: 'Todos los dias',
    repeatWeekly: 'Cada semana', repeatMonthly: 'Cada mes', privacyShared: 'Compartido con el destinatario', privacyPrivate: 'Privado (visible para mi)', cancel: 'Cancelar', datePickerConfirm: 'Confirmar', datePickerCancel: 'Cancelar',
  },
  pt: {
    defaultUser: 'Usuario', autoRecipient: 'Destinatario automatico', reservationPrefix: 'Reserva', servicePrefix: 'Servico', pricePrefix: 'Preco',
    repeatTitle: 'Repeticao', repeatSubtitle: 'Escolha uma frequencia', privacyTitle: 'Privacidade', privacySubtitle: 'Escolha a visibilidade',
    impossibleTitle: 'Agendamento nao permitido', impossibleBody: 'Voce nao pode criar um agendamento para a propria empresa. Entre com outra conta de cliente para testar este fluxo.',
    videoLinkPrefix: 'Link de video', messageAt: 'as', back: 'Voltar', navTitle: 'Novo agendamento', sending: 'Enviando...', send: 'Enviar',
    planning: 'Planejamento', heroSub: 'Monte um agendamento claro e profissional.', chooseDate: 'Escolher data', recipient: 'Destinatario',
    noOwner: 'Nenhum proprietario encontrado para esta empresa.', selfHint: 'Voce esta conectado com a conta proprietaria desta empresa. Os agendamentos devem ser criados por outra conta.',
    typeSection: 'Tipo de agendamento', dateTimeSection: 'Data e hora', datePlaceholder: 'Escolher data (dia/mes/ano)', timePlaceholder: 'Escolher horario',
    duration: 'Duracao', details: 'Detalhes', titlePlaceholder: 'Titulo do agendamento', locationPlaceholder: 'Local ou link da reuniao',
    priority: 'Prioridade', notes: 'Notas', notePlaceholder: 'Agenda, documentos para preparar...', options: 'Opcoes', reminder: 'Lembrete',
    reminderSub: '15 min antes', repetition: 'Repeticao', privacy: 'Privacidade', missingPrefix: 'Faltando: ', missingDifferentAccount: 'uma conta de cliente diferente',
    missingRecipient: 'destinatario', missingTitle: 'titulo', missingDateTime: 'data e hora', creating: 'Criando...', confirm: 'Confirmar agendamento',
    typeVideoLabel: 'Video', typeVideoSub: 'Link gerado automaticamente', typeInPersonLabel: 'Presencial', typeInPersonSub: 'Local a definir',
    typePhoneLabel: 'Telefone', typePhoneSub: 'Somente audio', typeMessageLabel: 'Mensagem', typeMessageSub: 'Notificacao push',
    priorityLow: 'Baixa', priorityNormal: 'Normal', priorityHigh: 'Urgente', repeatNever: 'Nunca', repeatDaily: 'Todos os dias',
    repeatWeekly: 'Toda semana', repeatMonthly: 'Todo mes', privacyShared: 'Compartilhado com o destinatario', privacyPrivate: 'Privado (visivel para mim)', cancel: 'Cancelar', datePickerConfirm: 'Confirmar', datePickerCancel: 'Cancelar',
  },
};

const APPOINTMENT_COPY_BY_LANGUAGE = {
  ...APPOINTMENT_COPY,
  zh: {
    ...APPOINTMENT_COPY.en,
    details: '详情',
    defaultUser: '用户',
    autoRecipient: '自动接收人',
    reservationPrefix: '预约',
    servicePrefix: '服务',
    pricePrefix: '价格',
    repeatTitle: '重复',
    repeatSubtitle: '选择频率',
    privacyTitle: '隐私',
    privacySubtitle: '选择可见性',
    impossibleTitle: '无法预约',
    impossibleBody: '你不能和自己的公司创建预约。请使用其他客户账号登录进行测试。',
    videoLinkPrefix: '视频链接',
    messageAt: '于',
    sending: '发送中...',
    heroSub: '创建清晰且专业的预约。',
    chooseDate: '选择日期',
    noOwner: '未找到该公司的所有者。',
    selfHint: '你正在使用所有者账号登录。请使用其他客户账号创建预约。',
    datePlaceholder: '选择日期（日/月/年）',
    timePlaceholder: '选择时间',
    notePlaceholder: '议程、需准备的资料...',
    privacy: '隐私',
    reminderSub: '15 分钟前',
    repetition: '重复',
    missingDifferentAccount: '另一个客户账号',
    creating: '创建中...',
    typeVideoSub: '自动生成链接',
    typeInPersonSub: '需要填写地点',
    typePhoneSub: '仅语音',
    typeMessageSub: '推送通知',
    repeatNever: '从不',
    repeatDaily: '每天',
    repeatWeekly: '每周',
    repeatMonthly: '每月',
    privacyShared: '与接收人共享',
    privacyPrivate: '私密（仅自己可见）',
  },
  hi: {
    ...APPOINTMENT_COPY.en,
    details: 'विवरण',
    defaultUser: 'उपयोगकर्ता',
    autoRecipient: 'स्वचालित प्राप्तकर्ता',
    reservationPrefix: 'अपॉइंटमेंट',
    servicePrefix: 'सेवा',
    pricePrefix: 'कीमत',
    repeatTitle: 'दोहराव',
    repeatSubtitle: 'आवृत्ति चुनें',
    privacyTitle: 'गोपनीयता',
    privacySubtitle: 'दृश्यता चुनें',
    impossibleTitle: 'अपॉइंटमेंट संभव नहीं',
    impossibleBody: 'आप अपनी कंपनी के साथ अपॉइंटमेंट नहीं बना सकते। कृपया किसी अन्य क्लाइंट खाते से साइन इन करें।',
    videoLinkPrefix: 'वीडियो लिंक',
    messageAt: 'पर',
    sending: 'भेजा जा रहा है...',
    heroSub: 'स्पष्ट और पेशेवर अपॉइंटमेंट बनाएं।',
    chooseDate: 'तारीख चुनें',
    noOwner: 'इस कंपनी के लिए कोई मालिक नहीं मिला।',
    selfHint: 'आप मालिक खाते से साइन इन हैं। अपॉइंटमेंट बनाने के लिए अलग क्लाइंट खाता उपयोग करें।',
    datePlaceholder: 'तारीख चुनें (दिन/महीना/साल)',
    timePlaceholder: 'समय चुनें',
    notePlaceholder: 'एजेंडा, तैयारी के दस्तावेज...',
    reminderSub: '15 मिनट पहले',
    privacy: 'गोपनीयता',
    repetition: 'दोहराव',
    missingDifferentAccount: 'अलग क्लाइंट खाता',
    creating: 'बनाया जा रहा है...',
    typeVideoSub: 'स्वचालित रूप से बना लिंक',
    typeInPersonSub: 'स्थान आवश्यक',
    typePhoneSub: 'केवल ऑडियो',
    typeMessageSub: 'पुश नोटिफिकेशन',
    repeatNever: 'कभी नहीं',
    repeatDaily: 'हर दिन',
    repeatWeekly: 'हर सप्ताह',
    repeatMonthly: 'हर महीने',
    privacyShared: 'प्राप्तकर्ता के साथ साझा',
    privacyPrivate: 'निजी (केवल मुझे दिखे)',
  },
  ar: {
    ...APPOINTMENT_COPY.en,
    details: 'التفاصيل',
    defaultUser: 'مستخدم',
    autoRecipient: 'مستلم تلقائي',
    reservationPrefix: 'حجز',
    servicePrefix: 'خدمة',
    pricePrefix: 'السعر',
    repeatTitle: 'التكرار',
    repeatSubtitle: 'اختر التكرار',
    privacyTitle: 'الخصوصية',
    privacySubtitle: 'اختر مستوى الرؤية',
    impossibleTitle: 'الموعد غير ممكن',
    impossibleBody: 'لا يمكنك إنشاء موعد مع شركتك الخاصة. سجّل الدخول بحساب عميل آخر.',
    videoLinkPrefix: 'رابط فيديو',
    messageAt: 'في',
    sending: 'جارٍ الإرسال...',
    heroSub: 'أنشئ موعدا واضحا واحترافيا.',
    chooseDate: 'اختر التاريخ',
    noOwner: 'لم يتم العثور على مالك لهذه الشركة.',
    selfHint: 'أنت مسجل بحساب المالك. استخدم حساب عميل آخر لإنشاء الموعد.',
    datePlaceholder: 'اختر التاريخ (يوم/شهر/سنة)',
    timePlaceholder: 'اختر الوقت',
    notePlaceholder: 'جدول الأعمال، مستندات التحضير...',
    reminderSub: 'قبل 15 دقيقة',
    privacy: 'الخصوصية',
    repetition: 'التكرار',
    missingDifferentAccount: 'حساب عميل آخر',
    creating: 'جارٍ الإنشاء...',
    typeVideoSub: 'رابط يتم إنشاؤه تلقائيا',
    typeInPersonSub: 'الموقع مطلوب',
    typePhoneSub: 'صوت فقط',
    typeMessageSub: 'إشعار فوري',
    repeatNever: 'أبدا',
    repeatDaily: 'يوميا',
    repeatWeekly: 'أسبوعيا',
    repeatMonthly: 'شهريا',
    privacyShared: 'مشترك مع المستلم',
    privacyPrivate: 'خاص (مرئي لي فقط)',
  },
  bn: {
    ...APPOINTMENT_COPY.en,
    details: 'বিস্তারিত',
    defaultUser: 'ব্যবহারকারী',
    autoRecipient: 'স্বয়ংক্রিয় প্রাপক',
    reservationPrefix: 'অ্যাপয়েন্টমেন্ট',
    servicePrefix: 'সেবা',
    pricePrefix: 'মূল্য',
    repeatTitle: 'পুনরাবৃত্তি',
    repeatSubtitle: 'পুনরাবৃত্তির হার নির্বাচন করুন',
    privacyTitle: 'গোপনীয়তা',
    privacySubtitle: 'দৃশ্যমানতা নির্বাচন করুন',
    impossibleTitle: 'অ্যাপয়েন্টমেন্ট করা যাবে না',
    impossibleBody: 'আপনি নিজের কোম্পানির সাথে অ্যাপয়েন্টমেন্ট তৈরি করতে পারবেন না। পরীক্ষা করতে অন্য ক্লায়েন্ট অ্যাকাউন্ট দিয়ে সাইন ইন করুন।',
    videoLinkPrefix: 'ভিডিও লিংক',
    messageAt: 'এ',
    sending: 'পাঠানো হচ্ছে...',
    heroSub: 'পরিষ্কার ও পেশাদার অ্যাপয়েন্টমেন্ট তৈরি করুন।',
    chooseDate: 'তারিখ নির্বাচন করুন',
    noOwner: 'এই কোম্পানির মালিক খুঁজে পাওয়া যায়নি।',
    selfHint: 'আপনি মালিক অ্যাকাউন্ট দিয়ে সাইন ইন আছেন। অ্যাপয়েন্টমেন্টের জন্য অন্য ক্লায়েন্ট অ্যাকাউন্ট ব্যবহার করুন।',
    datePlaceholder: 'তারিখ নির্বাচন করুন (দিন/মাস/বছর)',
    timePlaceholder: 'সময় নির্বাচন করুন',
    notePlaceholder: 'এজেন্ডা, প্রস্তুতির ডকুমেন্ট...',
    reminderSub: '১৫ মিনিট আগে',
    privacy: 'গোপনীয়তা',
    repetition: 'পুনরাবৃত্তি',
    missingDifferentAccount: 'ভিন্ন ক্লায়েন্ট অ্যাকাউন্ট',
    creating: 'তৈরি হচ্ছে...',
    typeVideoSub: 'স্বয়ংক্রিয়ভাবে তৈরি লিংক',
    typeInPersonSub: 'অবস্থান প্রয়োজন',
    typePhoneSub: 'শুধু অডিও',
    typeMessageSub: 'পুশ নোটিফিকেশন',
    repeatNever: 'কখনও নয়',
    repeatDaily: 'প্রতিদিন',
    repeatWeekly: 'প্রতি সপ্তাহে',
    repeatMonthly: 'প্রতি মাসে',
    privacyShared: 'প্রাপকের সাথে শেয়ার করা',
    privacyPrivate: 'ব্যক্তিগত (শুধু আমি দেখতে পাব)',
  },
  ru: {
    ...APPOINTMENT_COPY.en,
    details: 'Детали',
    defaultUser: 'Пользователь',
    autoRecipient: 'Автоматический получатель',
    reservationPrefix: 'Встреча',
    servicePrefix: 'Услуга',
    pricePrefix: 'Цена',
    repeatTitle: 'Повтор',
    repeatSubtitle: 'Выберите частоту',
    privacyTitle: 'Конфиденциальность',
    privacySubtitle: 'Выберите видимость',
    impossibleTitle: 'Встреча недоступна',
    impossibleBody: 'Нельзя создать встречу со своей компанией. Войдите с другого клиентского аккаунта.',
    videoLinkPrefix: 'Видеоссылка',
    messageAt: 'в',
    sending: 'Отправка...',
    heroSub: 'Создайте понятную и профессиональную встречу.',
    chooseDate: 'Выберите дату',
    noOwner: 'Владелец компании не найден.',
    selfHint: 'Вы вошли как владелец. Создавайте встречу из другого клиентского аккаунта.',
    datePlaceholder: 'Выберите дату (день/месяц/год)',
    timePlaceholder: 'Выберите время',
    notePlaceholder: 'Повестка, документы для подготовки...',
    reminderSub: 'За 15 мин',
    privacy: 'Конфиденциальность',
    repetition: 'Повтор',
    missingDifferentAccount: 'другой клиентский аккаунт',
    creating: 'Создание...',
    typeVideoSub: 'Ссылка создается автоматически',
    typeInPersonSub: 'Нужно указать место',
    typePhoneSub: 'Только аудио',
    typeMessageSub: 'Push-уведомление',
    repeatNever: 'Никогда',
    repeatDaily: 'Каждый день',
    repeatWeekly: 'Каждую неделю',
    repeatMonthly: 'Каждый месяц',
    privacyShared: 'Общий доступ с получателем',
    privacyPrivate: 'Личное (видно только мне)',
  },
  ja: {
    ...APPOINTMENT_COPY.en,
    details: '詳細',
    defaultUser: 'ユーザー',
    autoRecipient: '自動受信者',
    reservationPrefix: '予約',
    servicePrefix: 'サービス',
    pricePrefix: '価格',
    repeatTitle: '繰り返し',
    repeatSubtitle: '頻度を選択',
    privacyTitle: 'プライバシー',
    privacySubtitle: '公開範囲を選択',
    impossibleTitle: '予約できません',
    impossibleBody: '自分の会社には予約できません。別のクライアントアカウントでサインインしてください。',
    videoLinkPrefix: 'ビデオリンク',
    messageAt: 'に',
    sending: '送信中...',
    heroSub: '明確でプロフェッショナルな予約を作成します。',
    chooseDate: '日付を選択',
    noOwner: 'この会社のオーナーが見つかりません。',
    selfHint: 'オーナーアカウントでログイン中です。別のクライアントアカウントで予約を作成してください。',
    datePlaceholder: '日付を選択（日/月/年）',
    timePlaceholder: '時間を選択',
    notePlaceholder: '議題、準備する書類...',
    reminderSub: '15分前',
    privacy: 'プライバシー',
    repetition: '繰り返し',
    missingDifferentAccount: '別のクライアントアカウント',
    creating: '作成中...',
    typeVideoSub: '自動生成リンク',
    typeInPersonSub: '場所の入力が必要',
    typePhoneSub: '音声のみ',
    typeMessageSub: 'プッシュ通知',
    repeatNever: 'なし',
    repeatDaily: '毎日',
    repeatWeekly: '毎週',
    repeatMonthly: '毎月',
    privacyShared: '受信者と共有',
    privacyPrivate: '非公開（自分のみ表示）',
  },
  de: {
    ...APPOINTMENT_COPY.en,
    details: 'Details',
    defaultUser: 'Benutzer',
    autoRecipient: 'Automatischer Empfaenger',
    reservationPrefix: 'Buchung',
    servicePrefix: 'Service',
    pricePrefix: 'Preis',
    repeatTitle: 'Wiederholung',
    repeatSubtitle: 'Haeufigkeit waehlen',
    privacyTitle: 'Datenschutz',
    privacySubtitle: 'Sichtbarkeit waehlen',
    impossibleTitle: 'Termin nicht erlaubt',
    impossibleBody: 'Du kannst keinen Termin mit deiner eigenen Firma erstellen. Melde dich mit einem anderen Kundenkonto an.',
    videoLinkPrefix: 'Video-Link',
    messageAt: 'um',
    sending: 'Wird gesendet...',
    heroSub: 'Erstelle einen klaren und professionellen Termin.',
    chooseDate: 'Datum waehlen',
    noOwner: 'Kein Besitzer fuer diese Firma gefunden.',
    selfHint: 'Du bist mit dem Besitzerkonto angemeldet. Termine muessen mit einem anderen Kundenkonto erstellt werden.',
    datePlaceholder: 'Datum waehlen (Tag/Monat/Jahr)',
    timePlaceholder: 'Uhrzeit waehlen',
    notePlaceholder: 'Agenda, vorzubereitende Dokumente...',
    privacy: 'Datenschutz',
    reminderSub: '15 Min vorher',
    repetition: 'Wiederholung',
    missingDifferentAccount: 'ein anderes Kundenkonto',
    creating: 'Wird erstellt...',
    typeVideoSub: 'Automatisch erzeugter Link',
    typeInPersonSub: 'Ort erforderlich',
    typePhoneSub: 'Nur Audio',
    typeMessageSub: 'Push-Benachrichtigung',
    repeatNever: 'Nie',
    repeatDaily: 'Taeglich',
    repeatWeekly: 'Woechentlich',
    repeatMonthly: 'Monatlich',
    privacyShared: 'Mit Empfaenger teilen',
    privacyPrivate: 'Privat (nur fuer mich sichtbar)',
  },
  id: {
    ...APPOINTMENT_COPY.en,
    details: 'Rincian',
    defaultUser: 'Pengguna',
    autoRecipient: 'Penerima otomatis',
    reservationPrefix: 'Pemesanan',
    servicePrefix: 'Layanan',
    pricePrefix: 'Harga',
    repeatTitle: 'Ulangi',
    repeatSubtitle: 'Pilih frekuensi',
    privacyTitle: 'Privasi',
    privacySubtitle: 'Pilih visibilitas',
    impossibleTitle: 'Janji tidak diizinkan',
    impossibleBody: 'Anda tidak bisa membuat janji dengan perusahaan sendiri. Masuk dengan akun klien lain.',
    videoLinkPrefix: 'Tautan video',
    messageAt: 'pukul',
    sending: 'Mengirim...',
    heroSub: 'Buat janji yang jelas dan profesional.',
    chooseDate: 'Pilih tanggal',
    noOwner: 'Pemilik perusahaan tidak ditemukan.',
    selfHint: 'Anda masuk dengan akun pemilik. Janji harus dibuat dari akun klien lain.',
    datePlaceholder: 'Pilih tanggal (hari/bulan/tahun)',
    timePlaceholder: 'Pilih waktu',
    notePlaceholder: 'Agenda, dokumen yang perlu disiapkan...',
    privacy: 'Privasi',
    reminderSub: '15 menit sebelumnya',
    repetition: 'Ulangi',
    missingDifferentAccount: 'akun klien yang berbeda',
    creating: 'Membuat...',
    typeVideoSub: 'Tautan dibuat otomatis',
    typeInPersonSub: 'Lokasi wajib diisi',
    typePhoneSub: 'Hanya audio',
    typeMessageSub: 'Notifikasi push',
    repeatNever: 'Tidak pernah',
    repeatDaily: 'Setiap hari',
    repeatWeekly: 'Setiap minggu',
    repeatMonthly: 'Setiap bulan',
    privacyShared: 'Dibagikan dengan penerima',
    privacyPrivate: 'Pribadi (hanya saya yang lihat)',
  },
  ur: {
    ...APPOINTMENT_COPY.en,
    details: 'تفصیل',
    defaultUser: 'صارف',
    autoRecipient: 'خودکار وصول کنندہ',
    reservationPrefix: 'ملاقات',
    servicePrefix: 'سروس',
    pricePrefix: 'قیمت',
    repeatTitle: 'دہرائیں',
    repeatSubtitle: 'تعدد منتخب کریں',
    privacyTitle: 'رازداری',
    privacySubtitle: 'مرئیت منتخب کریں',
    impossibleTitle: 'ملاقات ممکن نہیں',
    impossibleBody: 'آپ اپنی کمپنی کے ساتھ ملاقات نہیں بنا سکتے۔ براہ کرم کسی دوسرے کلائنٹ اکاؤنٹ سے سائن اِن کریں۔',
    videoLinkPrefix: 'ویڈیو لنک',
    messageAt: 'پر',
    sending: 'بھیجا جا رہا ہے...',
    heroSub: 'واضح اور پیشہ ورانہ ملاقات بنائیں۔',
    chooseDate: 'تاریخ منتخب کریں',
    noOwner: 'اس کمپنی کا مالک نہیں ملا۔',
    selfHint: 'آپ مالک اکاؤنٹ سے لاگ اِن ہیں۔ ملاقات کے لیے دوسرا کلائنٹ اکاؤنٹ استعمال کریں۔',
    datePlaceholder: 'تاریخ منتخب کریں (دن/مہینہ/سال)',
    timePlaceholder: 'وقت منتخب کریں',
    notePlaceholder: 'ایجنڈا، تیاری کے دستاویزات...',
    reminderSub: '15 منٹ پہلے',
    privacy: 'رازدारी',
    repetition: 'دہرائیں',
    missingDifferentAccount: 'دوسرا کلائنٹ اکاؤنٹ',
    creating: 'بنایا جا رہا ہے...',
    typeVideoSub: 'خودکار طور پر تیار کردہ لنک',
    typeInPersonSub: 'مقام ضروری ہے',
    typePhoneSub: 'صرف آڈیو',
    typeMessageSub: 'پش نوٹیفکیشن',
    repeatNever: 'کبھی نہیں',
    repeatDaily: 'ہر دن',
    repeatWeekly: 'ہر ہفتہ',
    repeatMonthly: 'ہر مہینہ',
    privacyShared: 'وصول کنندہ کے ساتھ شیئر',
    privacyPrivate: 'نجی (صرف مجھے نظر آئے)',
  },
};

const formatDateLabel = (value, language = 'fr') => {
  if (!value) return '';
  return value.toLocaleDateString(LOCALE_BY_LANGUAGE[language] || 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTimeLabel = (value, language = 'fr') => {
  if (!value) return '';
  return value.toLocaleTimeString(LOCALE_BY_LANGUAGE[language] || 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

function buildVideoMeetingUrl({ companyId, senderId, receiverId, date }) {
  const daySeed = date
    ? new Date(date).toISOString().slice(0, 10).replace(/-/g, '')
    : Date.now().toString();

  const base = [companyId, senderId, receiverId, daySeed]
    .map((part) => String(part || '').replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('-')
    .slice(0, 64);

  return `https://talky.io/room/goone6-${base || 'room'}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return (
    <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

function UserRow({ user, selected, onPress }) {
  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
          {initials}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{user.name}</Text>
        {user.subtitle ? (
          <Text style={styles.rowSublabel}>{user.subtitle}</Text>
        ) : null}
      </View>
      {selected && (
        <Text style={styles.checkMark}>✓</Text>
      )}
    </TouchableOpacity>
  );
}

function TypeCard({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.typeCard, selected && styles.typeCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.typeIcon}>{item.icon}</Text>
      <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
        {item.label}
      </Text>
      <Text style={styles.typeSublabel}>{item.sublabel}</Text>
    </TouchableOpacity>
  );
}

function DurationChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PriorityChip({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.priorityChip,
        { backgroundColor: item.bg, borderColor: selected ? item.color : 'transparent', borderWidth: selected ? 1.5 : 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.priorityText, { color: item.color }]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

function FieldRow({ icon, placeholder, value, onChangeText, multiline, keyboardType, maxLength }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldIcon}>{icon}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateAppointmentScreen({ navigation, route }) {
  const { language, activeLanguage, languagePreference, t } = useLanguage();
  const resolvedCopyLanguage = useMemo(() => {
    if (activeLanguage) return activeLanguage;
    if (languagePreference && languagePreference !== 'system') {
      return languagePreference;
    }
    return language;
  }, [activeLanguage, language, languagePreference]);
  const copy = useMemo(() => {
    const base = APPOINTMENT_COPY_BY_LANGUAGE[resolvedCopyLanguage] || APPOINTMENT_COPY_BY_LANGUAGE.en;

    return {
      ...base,
      back: t('back', base.back),
      navTitle: t('appointmentsTitle', base.navTitle),
      planning: t('appointmentsTitle', base.planning),
      chooseDate: t('date', base.chooseDate),
      recipient: t('recipientLabel', base.recipient),
      typeSection: t('infoType', base.typeSection),
      dateTimeSection: `${t('infoDate', t('date', 'Date'))} / ${t('infoTime', 'Time')}`,
      duration: t('infoDuration', base.duration),
      details: base.details,
      notes: t('additionalInfo', base.notes),
      titlePlaceholder: t('infoSubject', base.titlePlaceholder),
      locationPlaceholder: t('infoLocation', base.locationPlaceholder),
      notePlaceholder: t('additionalInfo', base.notePlaceholder),
      priority: t('infoPriority', base.priority),
      options: t('quickAccessSection', base.options),
      reminder: t('notificationCenter', base.reminder),
      privacy: base.privacy,
      cancel: t('cancel', base.cancel),
      typeVideoLabel: t('typeVideo', base.typeVideoLabel),
      typeInPersonLabel: t('typeInPerson', base.typeInPersonLabel),
      typePhoneLabel: t('typePhone', base.typePhoneLabel),
      typeMessageLabel: t('typeMessage', base.typeMessageLabel),
      priorityLow: t('priorityLow', base.priorityLow),
      priorityNormal: t('priorityNormal', base.priorityNormal),
      priorityHigh: t('priorityHigh', base.priorityHigh),
      missingPrefix: `${t('requiredFieldTitle', base.missingPrefix)}: `,
      missingRecipient: t('recipientLabel', base.missingRecipient),
      missingTitle: t('infoSubject', base.missingTitle),
      missingDateTime: `${t('infoDate', t('date', 'Date'))} / ${t('infoTime', 'Time')}`,
      creating: t('loading', base.creating),
      confirm: t('validateBtn', base.confirm),
      send: t('sendNotificationButton', base.send),
      datePickerConfirm: t('validateBtn', base.datePickerConfirm),
      datePickerCancel: t('cancel', base.datePickerCancel),
    };
  }, [resolvedCopyLanguage, t]);
  const {
    users = MOCK_USERS,
    user,
    ensurePushReadyOrAlert,
  } = useHomeScreen?.(navigation) || {
    users: MOCK_USERS,
    user: { _id: '1' },
    ensurePushReadyOrAlert: async () => true,
  };
  const companyId = route?.params?.companyId || route?.params?.service?.companyId;
  const service = route?.params?.service;
  const isBeautyFashionBooking = route?.params?.beautyFashionBooking === true;
  const beautyCopy = resolvedCopyLanguage === 'fr'
    ? {
        provider: 'Votre professionnel', dateTime: 'Choisir une date et une heure', service: 'Prestation',
        inPerson: 'Rendez-vous en personne', confirm: 'Envoyer la demande de rendez-vous',
        serviceStep: 'Prestation', dateStep: 'Date / heure', requestStep: 'Demande',
        requestDetails: 'Précisez votre demande', location: 'Adresse du rendez-vous',
      }
    : {
        provider: 'Your professional', dateTime: 'Choose a date and time', service: 'Service',
        inPerson: 'In-person appointment', confirm: 'Send appointment request',
        serviceStep: 'Service', dateStep: 'Date / time', requestStep: 'Request',
        requestDetails: 'Add a request note', location: 'Appointment address',
      };
  const [companyOwnerId, setCompanyOwnerId] = useState('');
  const [companyOwnerFallback, setCompanyOwnerFallback] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadCompanyOwner = async () => {
      if (!companyId) {
        if (mounted) setCompanyOwnerId('');
        if (mounted) setCompanyOwnerFallback(null);
        return;
      }

      try {
        const company = await getCompanyById(companyId);
        if (!mounted) return;

        const ownerId = String(company?.ownerId?._id || company?.ownerId || '').trim();
        setCompanyOwnerId(ownerId);

        let ownerName =
          String(company?.ownerId?.name || '').trim() ||
          String(company?.ownerName || '').trim();

        if (!ownerName && ownerId) {
          const ownerFromLoadedUsers = (users || []).find(
            (candidate) => String(candidate?._id || '').trim() === ownerId
          );
          ownerName = String(ownerFromLoadedUsers?.name || '').trim();
        }

        if (!ownerName) {
          ownerName = copy.defaultUser;
        }

        setCompanyOwnerFallback({
          _id: ownerId,
          name: ownerName,
          subtitle: copy.autoRecipient,
        });
      } catch (_) {
        if (mounted) setCompanyOwnerId('');
        if (mounted) setCompanyOwnerFallback(null);
      }
    };

    loadCompanyOwner();

    return () => {
      mounted = false;
    };
  }, [companyId, users, copy.defaultUser, copy.autoRecipient]);

  const recipientUsers = useMemo(() => {
    const currentFirebaseUid = String(user?.firebaseUid || '').trim();
    const currentMongoId = String(user?._id || '').trim();

    let filtered = (users || []).filter((candidate) => {
      if (String(candidate?._id || '').trim() === currentMongoId) return false;

      const sameFirebaseUid =
        !!currentFirebaseUid &&
        String(candidate?.firebaseUid || '').trim() === currentFirebaseUid;

      return !sameFirebaseUid;
    });

    // Nouveau rendez-vous: ne proposer que l'utilisateur lié à l'entreprise sélectionnée (propriétaire).
    if (companyId) {
      if (!companyOwnerId) return [];

      const ownerFromUsers = filtered.find(
        (candidate) => String(candidate?._id || '').trim() === companyOwnerId
      );

      if (ownerFromUsers) {
        return [ownerFromUsers];
      }

      if (companyOwnerFallback?._id) {
        return [companyOwnerFallback];
      }

      return [
        {
          _id: companyOwnerId,
          name: companyOwnerFallback?.name || copy.defaultUser,
          subtitle: copy.autoRecipient,
        },
      ];
    }

    return filtered;
  }, [users, user?.firebaseUid, user?._id, companyId, companyOwnerId, companyOwnerFallback, copy]);

  const titlePrefix = route?.params?.appointmentTitlePrefix || copy.reservationPrefix;
  const prefTitle = service?.name ? `${titlePrefix} - ${service.name}` : '';
  const prefLocation = route?.params?.appointmentLocation || service?.location || '';
  const prefNote = [
    service?.name ? `${copy.servicePrefix}: ${service.name}` : null,
    service?.price ? `${copy.pricePrefix}: $${Number(service.price || 0).toFixed(2)}` : null,
    service?.description || null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const [appointmentType, setAppointmentType] = useState(route?.params?.defaultAppointmentType || 'video');
  const [title, setTitle] = useState(prefTitle);
  const [appointmentDateTime, setAppointmentDateTime] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [duration, setDuration] = useState('30 min');
  const [location, setLocation] = useState(prefLocation);
  const [note, setNote] = useState(prefNote);
  const [priority, setPriority] = useState('normal');
  const [reminder, setReminder] = useState(true);
  const [repeat, setRepeat] = useState('never');
  const [privacy, setPrivacy] = useState('shared');
  const [loading, setLoading] = useState(false);
  const [titleEdited, setTitleEdited] = useState(false);
  const [noteEdited, setNoteEdited] = useState(false);

  useEffect(() => {
    if (!service?.name || titleEdited) return;
    setTitle(`${titlePrefix} - ${service.name}`);
  }, [service?.name, titlePrefix, titleEdited]);

  useEffect(() => {
    if (!service || noteEdited) return;

    const localizedNote = [
      service?.name ? `${copy.servicePrefix}: ${service.name}` : null,
      service?.price ? `${copy.pricePrefix}: $${Number(service.price || 0).toFixed(2)}` : null,
      service?.description || null,
    ]
      .filter(Boolean)
      .join('\n\n');

    setNote(localizedNote);
  }, [service, copy.servicePrefix, copy.pricePrefix, noteEdited]);

  const selectedUser = useMemo(() => recipientUsers[0] || null, [recipientUsers]);

  const isSelfAppointment = useMemo(() => {
    if (!selectedUser || !user) return false;

    const currentMongoId = String(user?._id || '').trim();
    const currentFirebaseUid = String(user?.firebaseUid || '').trim();
    const selectedMongoId = String(selectedUser?._id || '').trim();
    const selectedFirebaseUid = String(selectedUser?.firebaseUid || '').trim();

    if (currentMongoId && selectedMongoId && currentMongoId === selectedMongoId) {
      return true;
    }

    if (currentFirebaseUid && selectedFirebaseUid && currentFirebaseUid === selectedFirebaseUid) {
      return true;
    }

    return false;
  }, [selectedUser, user]);

  const isReady = companyId && selectedUser && !isSelfAppointment && title.trim() && appointmentDateTime;

  const repeatLabels = {
    never: copy.repeatNever,
    daily: copy.repeatDaily,
    weekly: copy.repeatWeekly,
    monthly: copy.repeatMonthly,
  };

  const privacyLabels = {
    shared: copy.privacyShared,
    private: copy.privacyPrivate,
  };

  const priorityLabels = {
    low: copy.priorityLow,
    normal: copy.priorityNormal,
    high: copy.priorityHigh,
  };

  const typeLabels = {
    video: { label: copy.typeVideoLabel, sublabel: copy.typeVideoSub },
    in_person: { label: copy.typeInPersonLabel, sublabel: copy.typeInPersonSub },
    phone: { label: copy.typePhoneLabel, sublabel: copy.typePhoneSub },
    message: { label: copy.typeMessageLabel, sublabel: copy.typeMessageSub },
  };

  const localizedTypes = APPOINTMENT_TYPES.map((item) => ({
    ...item,
    label: typeLabels[item.id]?.label || item.id,
    sublabel: typeLabels[item.id]?.sublabel || '',
  }));

  const localizedPriorities = PRIORITIES.map((item) => ({
    ...item,
    label: priorityLabels[item.id] || item.id,
  }));

  const repeatLabel = repeatLabels[repeat] || copy.repeatNever;
  const privacyLabel = privacyLabels[privacy] || copy.privacyShared;
  const selectedTypeLabel = typeLabels[appointmentType]?.label || appointmentType;

  const openRepeatSelector = () => {
    Alert.alert(
      copy.repeatTitle,
      copy.repeatSubtitle,
      [
        ...REPEAT_OPTIONS.map((opt) => ({
          text: `${repeat === opt.id ? '✓ ' : ''}${repeatLabels[opt.id] || opt.id}`,
          onPress: () => setRepeat(opt.id),
        })),
        { text: copy.cancel, style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openPrivacySelector = () => {
    Alert.alert(
      copy.privacyTitle,
      copy.privacySubtitle,
      [
        ...PRIVACY_OPTIONS.map((opt) => ({
          text: `${privacy === opt.id ? '✓ ' : ''}${privacyLabels[opt.id] || opt.id}`,
          onPress: () => setPrivacy(opt.id),
        })),
        { text: copy.cancel, style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openDatePicker = () => setDatePickerVisible(true);
  const openTimePicker = () => setTimePickerVisible(true);

  const handleConfirmDate = (selectedDate) => {
    const base = appointmentDateTime ? new Date(appointmentDateTime) : new Date();
    const next = new Date(selectedDate);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    setAppointmentDateTime(next);
    setDatePickerVisible(false);
  };

  const handleConfirmTime = (selectedTime) => {
    const base = appointmentDateTime ? new Date(appointmentDateTime) : new Date();
    base.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setAppointmentDateTime(base);
    setTimePickerVisible(false);
  };

  const handleSend = async () => {
    if (!isReady || loading) return;

    const canSend = await ensurePushReadyOrAlert({ source: 'create-appointment', language: activeLanguage });
    if (!canSend) {
      navigation.navigate('NotificationLabs');
      return;
    }

    if (isSelfAppointment) {
      Alert.alert(
        copy.impossibleTitle,
        copy.impossibleBody
      );
      return;
    }

    const dateTime = appointmentDateTime;
    const dateLabel = formatDateLabel(dateTime, resolvedCopyLanguage);
    const timeLabel = formatTimeLabel(dateTime, resolvedCopyLanguage);

    setLoading(true);
    try {
      const shouldAttachVideoLink = appointmentType === 'video';
      const generatedVideoLink = shouldAttachVideoLink
        ? buildVideoMeetingUrl({
            companyId,
            senderId: user?._id,
            receiverId: selectedUser?._id,
            date: dateTime,
          })
        : '';
      const finalLocation = shouldAttachVideoLink
        ? (location.trim() || generatedVideoLink)
        : location;
      const finalNote = shouldAttachVideoLink
        ? [note.trim(), `${copy.videoLinkPrefix}: ${generatedVideoLink}`].filter(Boolean).join('\n')
        : note;

      await createAppointment({
        companyId,
        serviceId: route?.params?.serviceId || service?._id,
        selectedServiceImage: route?.params?.selectedServiceImage || service?.selectedImage || service?.image || '',
        senderId: user._id,
        receiverId: selectedUser._id,
        title,
        date: dateTime.toISOString(),
        time: timeLabel,
        duration,
        type: appointmentType,
        location: finalLocation,
        note: finalNote,
        priority,
        reminder,
        repeat,
        privacy,
        message: `${title} — ${dateLabel} ${copy.messageAt} ${timeLabel} (${duration})`,
      });
      navigation.goBack();
    } catch (e) {
      console.log('❌ CREATE APPOINTMENT ERROR:', e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToBookings = () => {
    const parentNav = navigation.getParent?.();
    const routeNames = parentNav?.getState?.()?.routeNames || [];

    if (routeNames.includes('Booking')) {
      parentNav.navigate('Booking');
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBackToBookings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navCancel}>{copy.back}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isBeautyFashionBooking ? beautyCopy.service : copy.navTitle}</Text>
        <TouchableOpacity onPress={handleSend} disabled={!isReady || loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.navSend, (!isReady || loading) && styles.navSendDisabled]}>
            {loading ? copy.sending : isBeautyFashionBooking ? beautyCopy.confirm : copy.send}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {isBeautyFashionBooking ? (
          <>
            <View style={styles.beautyStepper}>
              {[
                { label: beautyCopy.serviceStep, complete: true, active: false },
                { label: beautyCopy.dateStep, complete: !!appointmentDateTime, active: !appointmentDateTime },
                { label: beautyCopy.requestStep, complete: false, active: !!appointmentDateTime },
              ].map((step, index) => (
                <View key={step.label} style={styles.beautyStep}>
                  <View style={[styles.beautyStepDot, (step.complete || step.active) && styles.beautyStepDotActive]}>
                    <Text style={[styles.beautyStepNumber, (step.complete || step.active) && styles.beautyStepNumberActive]}>{step.complete ? '✓' : index + 1}</Text>
                  </View>
                  <Text style={[styles.beautyStepLabel, step.active && styles.beautyStepLabelActive]}>{step.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.beautyHeroCard}>
              <Text style={styles.beautyHeroKicker}>{beautyCopy.service}</Text>
              <Text style={styles.beautyHeroTitle}>{service?.name || title.trim()}</Text>
              <Text style={styles.beautyHeroSub}>{route?.params?.companyName || selectedUser?.name || ''}</Text>
              <View style={styles.beautyHeroMeta}>
                <Text style={styles.beautyHeroChip}>{beautyCopy.inPerson}</Text>
                {service?.price > 0 ? <Text style={styles.beautyHeroChip}>${Number(service.price).toFixed(2)}</Text> : null}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>{copy.planning}</Text>
            <Text style={styles.heroTitle}>{title.trim() || copy.navTitle}</Text>
            <Text style={styles.heroSub}>{copy.heroSub}</Text>
            <View style={styles.heroMetaWrap}>
              <View style={styles.heroMetaChip}><Text style={styles.heroMetaText}>{selectedTypeLabel}</Text></View>
              <View style={styles.heroMetaChip}><Text style={styles.heroMetaText}>{duration}</Text></View>
              <View style={styles.heroMetaChip}><Text style={styles.heroMetaText}>{appointmentDateTime ? formatDateLabel(appointmentDateTime, resolvedCopyLanguage) : copy.chooseDate}</Text></View>
            </View>
          </View>
        )}

        {/* Destinataire auto */}
        <SectionLabel text={isBeautyFashionBooking ? beautyCopy.provider : copy.recipient} />
        <Card>
          {selectedUser ? (
            <React.Fragment key={selectedUser._id}>
              <UserRow
                user={selectedUser}
                selected
                onPress={undefined}
              />
            </React.Fragment>
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowSublabel}>{copy.noOwner}</Text>
            </View>
          )}
        </Card>
        {isSelfAppointment && (
          <Text style={styles.hint}>
            {copy.selfHint}
          </Text>
        )}

        {/* Type */}
        {!isBeautyFashionBooking ? (
          <>
            <SectionLabel text={copy.typeSection} />
            <View style={styles.typeGrid}>
              {localizedTypes.map(t => (
                <TypeCard key={t.id} item={t} selected={appointmentType === t.id} onPress={() => setAppointmentType(t.id)} />
              ))}
            </View>
          </>
        ) : null}

        {/* Date & heure */}
        <SectionLabel text={isBeautyFashionBooking ? beautyCopy.dateTime : copy.dateTimeSection} />
        <Card>
          <View style={styles.pickerRow}>
            <FieldRow
              icon="📅"
              placeholder={copy.datePlaceholder}
              value={appointmentDateTime ? formatDateLabel(appointmentDateTime, resolvedCopyLanguage) : ''}
              onChangeText={() => {}}
            />
            <TouchableOpacity style={styles.overlayTouch} onPress={openDatePicker} activeOpacity={0.8} />
          </View>
          <RowSeparator />
          <View style={styles.pickerRow}>
            <FieldRow
              icon="🕐"
              placeholder={copy.timePlaceholder}
              value={appointmentDateTime ? formatTimeLabel(appointmentDateTime, resolvedCopyLanguage) : ''}
              onChangeText={() => {}}
            />
            <TouchableOpacity style={styles.overlayTouch} onPress={openTimePicker} activeOpacity={0.8} />
          </View>
          <RowSeparator />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>⏱</Text>
            <Text style={[styles.rowLabel, { flex: 1 }]}>{copy.duration}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipScrollContent}
          >
            {DURATIONS.map(d => (
              <DurationChip
                key={d}
                label={d}
                selected={duration === d}
                onPress={() => setDuration(d)}
              />
            ))}
          </ScrollView>
        </Card>

        {/* Détails */}
        <SectionLabel text={isBeautyFashionBooking ? beautyCopy.requestDetails : copy.details} />
        <Card>
          <FieldRow
            icon="✏️"
            placeholder={copy.titlePlaceholder}
            value={title}
            onChangeText={(value) => {
              setTitleEdited(true);
              setTitle(value);
            }}
          />
          <RowSeparator />
          <FieldRow
            icon="📍"
            placeholder={isBeautyFashionBooking ? beautyCopy.location : copy.locationPlaceholder}
            value={location}
            onChangeText={setLocation}
          />
          {!isBeautyFashionBooking ? <RowSeparator /> : null}
          {!isBeautyFashionBooking ? (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldIcon}>🚩</Text>
                <Text style={styles.rowLabel}>{copy.priority}</Text>
              </View>
              <View style={styles.priorityRow}>
                {localizedPriorities.map(p => (
                  <PriorityChip
                    key={p.id}
                    item={p}
                    selected={priority === p.id}
                    onPress={() => setPriority(p.id)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Card>

        {/* Notes */}
        <SectionLabel text={copy.notes} />
        <Card>
          <FieldRow
            icon="📝"
            placeholder={copy.notePlaceholder}
            value={note}
            onChangeText={(value) => {
              setNoteEdited(true);
              setNote(value);
            }}
            multiline
          />
        </Card>

        {/* Options */}
        {!isBeautyFashionBooking ? <>
        <SectionLabel text={copy.options} />
        <Card>
          <View style={styles.row}>
            <Text style={styles.fieldIcon}>🔔</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{copy.reminder}</Text>
              <Text style={styles.rowSublabel}>{copy.reminderSub}</Text>
            </View>
            <Switch
              value={reminder}
              onValueChange={setReminder}
              trackColor={{ false: C.separator, true: C.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={C.separator}
            />
          </View>
          <RowSeparator />
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={openRepeatSelector}>
            <Text style={styles.fieldIcon}>🔁</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{copy.repetition}</Text>
              <Text style={styles.rowSublabel}>{repeatLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <RowSeparator />
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={openPrivacySelector}>
            <Text style={styles.fieldIcon}>🔒</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{copy.privacy}</Text>
              <Text style={styles.rowSublabel}>{privacyLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>
        </> : null}

        {/* Status hint */}
        {!isReady && (
          <Text style={styles.hint}>
            {[
              isSelfAppointment && copy.missingDifferentAccount,
              !selectedUser && copy.missingRecipient,
              !title.trim() && copy.missingTitle,
              !appointmentDateTime && copy.missingDateTime,
            ]
              .filter(Boolean)
              .map((f, i, a) => (i === a.length - 1 ? f : f + ', '))
              .join('')
              .replace(/^./, s => `${copy.missingPrefix}${s}`)}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!isReady || loading) && styles.submitBtnDisabled]}
          onPress={handleSend}
          disabled={!isReady || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{loading ? copy.creating : isBeautyFashionBooking ? beautyCopy.confirm : copy.confirm}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        locale={LOCALE_BY_LANGUAGE[resolvedCopyLanguage] || 'en-US'}
        confirmTextIOS={copy.datePickerConfirm}
        cancelTextIOS={copy.datePickerCancel}
        date={appointmentDateTime || new Date()}
        minimumDate={new Date()}
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        locale={LOCALE_BY_LANGUAGE[resolvedCopyLanguage] || 'en-US'}
        confirmTextIOS={copy.datePickerConfirm}
        cancelTextIOS={copy.datePickerCancel}
        date={appointmentDateTime || new Date()}
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisible(false)}
        is24Hour
      />
    </SafeAreaView>
  );
}

// ─── Mock data (à retirer quand useHomeScreen est disponible) ─────────────────
const MOCK_USERS = [
  { _id: '1', name: 'Sophie Martin' },
  { _id: '2', name: 'Lucas Bernard' },
  { _id: '3', name: 'Amina Traore' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  navCancel: { fontSize: 16, color: C.primary, fontWeight: '700' },
  navTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  navSend: { fontSize: 16, fontWeight: '800', color: C.primary },
  navSendDisabled: { opacity: 0.35 },

  beautyStepper: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 8 },
  beautyStep: { flex: 1, alignItems: 'center', gap: 5 },
  beautyStepDot: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#D8CCC4', backgroundColor: '#FFFFFF' },
  beautyStepDotActive: { borderColor: '#F47732', backgroundColor: '#F47732' },
  beautyStepNumber: { color: C.label, fontSize: 10, fontWeight: '800' },
  beautyStepNumberActive: { color: '#FFFFFF' },
  beautyStepLabel: { color: C.label, fontSize: 9, textAlign: 'center' },
  beautyStepLabelActive: { color: '#D85D22', fontWeight: '800' },
  beautyHeroCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3D7C8', backgroundColor: '#FFF8F3' },
  beautyHeroKicker: { color: '#D85D22', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  beautyHeroTitle: { color: '#211D1B', fontSize: 18, fontWeight: '800', marginTop: 5 },
  beautyHeroSub: { color: '#857D78', fontSize: 12, marginTop: 3 },
  beautyHeroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  beautyHeroChip: { color: '#A64C25', backgroundColor: '#FCE8DC', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '700' },

  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  heroMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroMetaChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Sections
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.label,
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.separator,
    shadowColor: '#381456',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },

  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.separator,
    marginLeft: 56,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 16, color: C.textPrimary },
  rowSublabel: { fontSize: 13, color: C.textSecondary, marginTop: 1 },
  checkMark: { fontSize: 17, color: C.primary, fontWeight: '800' },
  chevron: { fontSize: 20, color: C.textTertiary, lineHeight: 22 },

  // Avatar
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE0F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { backgroundColor: C.primaryLight },
  avatarText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  avatarTextSelected: { color: C.primary },

  // Type cards
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 10,
  },
  typeCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.separator,
  },
  typeCardSelected: {
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  typeIcon: { fontSize: 22, marginBottom: 6 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  typeLabelSelected: { color: C.primaryDark },
  typeSublabel: { fontSize: 11, color: C.textSecondary, marginTop: 2 },

  // Chips (duration)
  chipScroll: { marginTop: 4 },
  chipScrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.separator,
    backgroundColor: C.bg,
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  chipTextSelected: { color: '#FFFFFF' },

  // Fields
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  fieldIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 2,
  },
  pickerRow: {
    position: 'relative',
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  priorityText: { fontSize: 13, fontWeight: '600' },

  // Hint
  hint: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 24,
  },
  submitBtn: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});