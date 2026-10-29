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

const UI_TEXT = {
  fr: {
    autoRecipient: 'Destinataire automatique',
    reservationPrefix: 'Reservation',
    serviceLabel: 'Service',
    priceLabel: 'Prix',
    repeatTitle: 'Repetition',
    repeatPrompt: 'Choisir une frequence',
    privacyTitle: 'Confidentialite',
    privacyPrompt: 'Choisir la visibilite',
    impossibleTitle: 'Rendez-vous impossible',
    impossibleBody: 'Tu ne peux pas creer un rendez-vous avec ta propre entreprise. Connecte-toi avec un autre compte client pour tester ce flux.',
    videoLinkLabel: 'Lien visio',
    atLabel: 'a',
    planning: 'Planification',
    newAppointment: 'Nouveau rendez-vous',
    heroSub: 'Compose un rendez-vous clair, pro et elegant.',
    dateToPick: 'Date a choisir',
    recipientSection: 'Destinataire',
    ownerNotFound: 'Aucun proprietaire trouve pour cette entreprise.',
    selfHint: 'Tu es connecte avec le compte proprietaire de cette entreprise. Les rendez-vous doivent etre crees depuis un autre compte.',
    typeSection: 'Type de rendez-vous',
    dateTimeSection: 'Date et heure',
    pickDate: 'Choisir la date (jour/mois/annee)',
    pickTime: 'Choisir l\'heure',
    duration: 'Duree',
    detailsSection: 'Details',
    titlePlaceholder: 'Titre du rendez-vous',
    locationPlaceholder: 'Lieu ou lien de reunion',
    priority: 'Priorite',
    notes: 'Notes',
    notePlaceholder: 'Ordre du jour, documents a preparer...',
    options: 'Options',
    reminder: 'Rappel',
    reminderSub: '15 min avant',
    repeat: 'Repetition',
    privacy: 'Confidentialite',
    missingPrefix: 'Manquant : ',
    missingClientAccount: 'un compte client different',
    missingRecipient: 'destinataire',
    missingTitle: 'titre',
    missingDateTime: 'date et heure',
    creating: 'Creation en cours...',
    send: 'Envoyer',
    confirmAppointment: 'Confirmer le rendez-vous',
  },
  en: {
    autoRecipient: 'Automatic recipient',
    reservationPrefix: 'Booking',
    serviceLabel: 'Service',
    priceLabel: 'Price',
    repeatTitle: 'Repeat',
    repeatPrompt: 'Choose a frequency',
    privacyTitle: 'Privacy',
    privacyPrompt: 'Choose visibility',
    impossibleTitle: 'Appointment not allowed',
    impossibleBody: 'You cannot create an appointment with your own company. Sign in with a different client account to test this flow.',
    videoLinkLabel: 'Video link',
    atLabel: 'at',
    planning: 'Planning',
    newAppointment: 'New appointment',
    heroSub: 'Build a clear and professional appointment.',
    dateToPick: 'Pick a date',
    recipientSection: 'Recipient',
    ownerNotFound: 'No owner found for this company.',
    selfHint: 'You are signed in with the owner account of this company. Appointments must be created from another account.',
    typeSection: 'Appointment type',
    dateTimeSection: 'Date and time',
    pickDate: 'Choose date (day/month/year)',
    pickTime: 'Choose time',
    duration: 'Duration',
    detailsSection: 'Details',
    titlePlaceholder: 'Appointment title',
    locationPlaceholder: 'Location or meeting link',
    priority: 'Priority',
    notes: 'Notes',
    notePlaceholder: 'Agenda, docs to prepare...',
    options: 'Options',
    reminder: 'Reminder',
    reminderSub: '15 min before',
    repeat: 'Repeat',
    privacy: 'Privacy',
    missingPrefix: 'Missing: ',
    missingClientAccount: 'a different client account',
    missingRecipient: 'recipient',
    missingTitle: 'title',
    missingDateTime: 'date and time',
    creating: 'Creating...',
    send: 'Send',
    confirmAppointment: 'Confirm appointment',
  },
  es: {
    autoRecipient: 'Destinatario automatico',
    reservationPrefix: 'Reserva',
    serviceLabel: 'Servicio',
    priceLabel: 'Precio',
    repeatTitle: 'Repeticion',
    repeatPrompt: 'Elegir frecuencia',
    privacyTitle: 'Privacidad',
    privacyPrompt: 'Elegir visibilidad',
    impossibleTitle: 'Cita no permitida',
    impossibleBody: 'No puedes crear una cita con tu propia empresa. Inicia sesion con otra cuenta de cliente para probar este flujo.',
    videoLinkLabel: 'Enlace de video',
    atLabel: 'a las',
    planning: 'Planificacion',
    newAppointment: 'Nueva cita',
    heroSub: 'Crea una cita clara y profesional.',
    dateToPick: 'Elegir fecha',
    recipientSection: 'Destinatario',
    ownerNotFound: 'No se encontro propietario para esta empresa.',
    selfHint: 'Iniciaste sesion con la cuenta propietaria de esta empresa. Las citas deben crearse desde otra cuenta.',
    typeSection: 'Tipo de cita',
    dateTimeSection: 'Fecha y hora',
    pickDate: 'Elegir fecha (dia/mes/ano)',
    pickTime: 'Elegir hora',
    duration: 'Duracion',
    detailsSection: 'Detalles',
    titlePlaceholder: 'Titulo de la cita',
    locationPlaceholder: 'Lugar o enlace de reunion',
    priority: 'Prioridad',
    notes: 'Notas',
    notePlaceholder: 'Agenda, documentos a preparar...',
    options: 'Opciones',
    reminder: 'Recordatorio',
    reminderSub: '15 min antes',
    repeat: 'Repeticion',
    privacy: 'Privacidad',
    missingPrefix: 'Falta: ',
    missingClientAccount: 'una cuenta de cliente diferente',
    missingRecipient: 'destinatario',
    missingTitle: 'titulo',
    missingDateTime: 'fecha y hora',
    creating: 'Creando...',
    send: 'Enviar',
    confirmAppointment: 'Confirmar cita',
  },
  pt: {
    autoRecipient: 'Destinatario automatico',
    reservationPrefix: 'Reserva',
    serviceLabel: 'Servico',
    priceLabel: 'Preco',
    repeatTitle: 'Repeticao',
    repeatPrompt: 'Escolher frequencia',
    privacyTitle: 'Privacidade',
    privacyPrompt: 'Escolher visibilidade',
    impossibleTitle: 'Agendamento nao permitido',
    impossibleBody: 'Voce nao pode criar um agendamento com sua propria empresa. Entre com outra conta de cliente para testar este fluxo.',
    videoLinkLabel: 'Link de video',
    atLabel: 'as',
    planning: 'Planejamento',
    newAppointment: 'Novo agendamento',
    heroSub: 'Monte um agendamento claro e profissional.',
    dateToPick: 'Escolher data',
    recipientSection: 'Destinatario',
    ownerNotFound: 'Nenhum proprietario encontrado para esta empresa.',
    selfHint: 'Voce entrou com a conta proprietaria desta empresa. Os agendamentos devem ser criados com outra conta.',
    typeSection: 'Tipo de agendamento',
    dateTimeSection: 'Data e hora',
    pickDate: 'Escolher data (dia/mes/ano)',
    pickTime: 'Escolher hora',
    duration: 'Duracao',
    detailsSection: 'Detalhes',
    titlePlaceholder: 'Titulo do agendamento',
    locationPlaceholder: 'Local ou link da reuniao',
    priority: 'Prioridade',
    notes: 'Notas',
    notePlaceholder: 'Pauta, documentos para preparar...',
    options: 'Opcoes',
    reminder: 'Lembrete',
    reminderSub: '15 min antes',
    repeat: 'Repeticao',
    privacy: 'Privacidade',
    missingPrefix: 'Faltando: ',
    missingClientAccount: 'uma conta de cliente diferente',
    missingRecipient: 'destinatario',
    missingTitle: 'titulo',
    missingDateTime: 'data e hora',
    creating: 'Criando...',
    send: 'Enviar',
    confirmAppointment: 'Confirmar agendamento',
  },
  zh: {
    autoRecipient: '自动接收人',
    reservationPrefix: '预约',
    serviceLabel: '服务',
    priceLabel: '价格',
    repeatTitle: '重复',
    repeatPrompt: '选择频率',
    privacyTitle: '隐私',
    privacyPrompt: '选择可见性',
    impossibleTitle: '无法预约',
    impossibleBody: '你不能为自己的公司创建预约。请使用其他客户账号测试此流程。',
    videoLinkLabel: '视频链接',
    atLabel: '时间',
    planning: '计划',
    newAppointment: '新建预约',
    heroSub: '创建一个清晰且专业的预约。',
    dateToPick: '选择日期',
    recipientSection: '接收人',
    ownerNotFound: '未找到该公司的所有者。',
    selfHint: '你当前使用的是该公司所有者账号。预约必须使用其他账号创建。',
    typeSection: '预约类型',
    dateTimeSection: '日期和时间',
    pickDate: '选择日期（日/月/年）',
    pickTime: '选择时间',
    duration: '时长',
    detailsSection: '详情',
    titlePlaceholder: '预约标题',
    locationPlaceholder: '地点或会议链接',
    priority: '优先级',
    notes: '备注',
    notePlaceholder: '议程、待准备文件……',
    options: '选项',
    reminder: '提醒',
    reminderSub: '提前15分钟',
    repeat: '重复',
    privacy: '隐私',
    missingPrefix: '缺少：',
    missingClientAccount: '其他客户账号',
    missingRecipient: '接收人',
    missingTitle: '标题',
    missingDateTime: '日期和时间',
    creating: '创建中...',
    send: '发送',
    confirmAppointment: '确认预约',
  },
  hi: {
    autoRecipient: 'स्वचालित प्राप्तकर्ता',
    reservationPrefix: 'बुकिंग',
    serviceLabel: 'सेवा',
    priceLabel: 'कीमत',
    repeatTitle: 'दोहराव',
    repeatPrompt: 'आवृत्ति चुनें',
    privacyTitle: 'गोपनीयता',
    privacyPrompt: 'दृश्यता चुनें',
    impossibleTitle: 'अपॉइंटमेंट संभव नहीं',
    impossibleBody: 'आप अपनी ही कंपनी के साथ अपॉइंटमेंट नहीं बना सकते। इस प्रवाह को जांचने के लिए किसी अन्य ग्राहक खाते से साइन इन करें।',
    videoLinkLabel: 'वीडियो लिंक',
    atLabel: 'पर',
    planning: 'योजना',
    newAppointment: 'नया अपॉइंटमेंट',
    heroSub: 'एक स्पष्ट और पेशेवर अपॉइंटमेंट बनाएं।',
    dateToPick: 'तारीख चुनें',
    recipientSection: 'प्राप्तकर्ता',
    ownerNotFound: 'इस कंपनी के लिए कोई मालिक नहीं मिला।',
    selfHint: 'आप इस कंपनी के मालिक खाते से साइन इन हैं। अपॉइंटमेंट किसी अन्य खाते से बनाए जाने चाहिए।',
    typeSection: 'अपॉइंटमेंट प्रकार',
    dateTimeSection: 'तारीख और समय',
    pickDate: 'तारीख चुनें (दिन/महीना/वर्ष)',
    pickTime: 'समय चुनें',
    duration: 'अवधि',
    detailsSection: 'विवरण',
    titlePlaceholder: 'अपॉइंटमेंट शीर्षक',
    locationPlaceholder: 'स्थान या मीटिंग लिंक',
    priority: 'प्राथमिकता',
    notes: 'नोट्स',
    notePlaceholder: 'एजेंडा, तैयार करने वाले दस्तावेज़...',
    options: 'विकल्प',
    reminder: 'रिमाइंडर',
    reminderSub: '15 मिनट पहले',
    repeat: 'दोहराव',
    privacy: 'गोपनीयता',
    missingPrefix: 'अनुपस्थित: ',
    missingClientAccount: 'कोई अन्य ग्राहक खाता',
    missingRecipient: 'प्राप्तकर्ता',
    missingTitle: 'शीर्षक',
    missingDateTime: 'तारीख और समय',
    creating: 'बनाया जा रहा है...',
    send: 'भेजें',
    confirmAppointment: 'अपॉइंटमेंट की पुष्टि करें',
  },
  ar: {
    autoRecipient: 'المستلم التلقائي',
    reservationPrefix: 'حجز',
    serviceLabel: 'الخدمة',
    priceLabel: 'السعر',
    repeatTitle: 'التكرار',
    repeatPrompt: 'اختر التكرار',
    privacyTitle: 'الخصوصية',
    privacyPrompt: 'اختر مستوى الرؤية',
    impossibleTitle: 'لا يمكن إنشاء الموعد',
    impossibleBody: 'لا يمكنك إنشاء موعد مع شركتك الخاصة. سجّل الدخول بحساب عميل آخر لاختبار هذا التدفق.',
    videoLinkLabel: 'رابط الفيديو',
    atLabel: 'في',
    planning: 'التخطيط',
    newAppointment: 'موعد جديد',
    heroSub: 'أنشئ موعدًا واضحًا واحترافيًا.',
    dateToPick: 'اختر التاريخ',
    recipientSection: 'المستلم',
    ownerNotFound: 'لم يتم العثور على مالك لهذه الشركة.',
    selfHint: 'أنت مسجل الدخول بحساب مالك هذه الشركة. يجب إنشاء المواعيد من حساب آخر.',
    typeSection: 'نوع الموعد',
    dateTimeSection: 'التاريخ والوقت',
    pickDate: 'اختر التاريخ (يوم/شهر/سنة)',
    pickTime: 'اختر الوقت',
    duration: 'المدة',
    detailsSection: 'التفاصيل',
    titlePlaceholder: 'عنوان الموعد',
    locationPlaceholder: 'المكان أو رابط الاجتماع',
    priority: 'الأولوية',
    notes: 'ملاحظات',
    notePlaceholder: 'جدول الأعمال، المستندات المطلوب تحضيرها...',
    options: 'الخيارات',
    reminder: 'تذكير',
    reminderSub: 'قبل 15 دقيقة',
    repeat: 'التكرار',
    privacy: 'الخصوصية',
    missingPrefix: 'مفقود: ',
    missingClientAccount: 'حساب عميل مختلف',
    missingRecipient: 'المستلم',
    missingTitle: 'العنوان',
    missingDateTime: 'التاريخ والوقت',
    creating: 'جارٍ الإنشاء...',
    send: 'إرسال',
    confirmAppointment: 'تأكيد الموعد',
  },
  bn: {
    autoRecipient: 'স্বয়ংক্রিয় প্রাপক',
    reservationPrefix: 'বুকিং',
    serviceLabel: 'সেবা',
    priceLabel: 'মূল্য',
    repeatTitle: 'পুনরাবৃত্তি',
    repeatPrompt: 'ফ্রিকোয়েন্সি নির্বাচন করুন',
    privacyTitle: 'গোপনীয়তা',
    privacyPrompt: 'দৃশ্যমানতা নির্বাচন করুন',
    impossibleTitle: 'অ্যাপয়েন্টমেন্ট সম্ভব নয়',
    impossibleBody: 'আপনি নিজের কোম্পানির সাথে অ্যাপয়েন্টমেন্ট তৈরি করতে পারবেন না। এই প্রবাহ পরীক্ষা করতে অন্য গ্রাহক অ্যাকাউন্ট ব্যবহার করুন।',
    videoLinkLabel: 'ভিডিও লিংক',
    atLabel: 'সময়',
    planning: 'পরিকল্পনা',
    newAppointment: 'নতুন অ্যাপয়েন্টমেন্ট',
    heroSub: 'একটি পরিষ্কার ও পেশাদার অ্যাপয়েন্টমেন্ট তৈরি করুন।',
    dateToPick: 'তারিখ নির্বাচন করুন',
    recipientSection: 'প্রাপক',
    ownerNotFound: 'এই কোম্পানির জন্য কোনো মালিক পাওয়া যায়নি।',
    selfHint: 'আপনি এই কোম্পানির মালিক অ্যাকাউন্টে সাইন ইন করেছেন। অ্যাপয়েন্টমেন্ট অন্য অ্যাকাউন্ট থেকে তৈরি করতে হবে।',
    typeSection: 'অ্যাপয়েন্টমেন্টের ধরন',
    dateTimeSection: 'তারিখ ও সময়',
    pickDate: 'তারিখ নির্বাচন করুন (দিন/মাস/বছর)',
    pickTime: 'সময় নির্বাচন করুন',
    duration: 'সময়কাল',
    detailsSection: 'বিস্তারিত',
    titlePlaceholder: 'অ্যাপয়েন্টমেন্টের শিরোনাম',
    locationPlaceholder: 'স্থান বা মিটিং লিংক',
    priority: 'অগ্রাধিকার',
    notes: 'নোট',
    notePlaceholder: 'এজেন্ডা, প্রস্তুত করার নথি...',
    options: 'বিকল্প',
    reminder: 'রিমাইন্ডার',
    reminderSub: '১৫ মিনিট আগে',
    repeat: 'পুনরাবৃত্তি',
    privacy: 'গোপনীয়তা',
    missingPrefix: 'অনুপস্থিত: ',
    missingClientAccount: 'অন্য গ্রাহক অ্যাকাউন্ট',
    missingRecipient: 'প্রাপক',
    missingTitle: 'শিরোনাম',
    missingDateTime: 'তারিখ ও সময়',
    creating: 'তৈরি হচ্ছে...',
    send: 'পাঠান',
    confirmAppointment: 'অ্যাপয়েন্টমেন্ট নিশ্চিত করুন',
  },
  ru: {
    autoRecipient: 'Автоматический получатель',
    reservationPrefix: 'Бронирование',
    serviceLabel: 'Услуга',
    priceLabel: 'Цена',
    repeatTitle: 'Повтор',
    repeatPrompt: 'Выберите частоту',
    privacyTitle: 'Конфиденциальность',
    privacyPrompt: 'Выберите видимость',
    impossibleTitle: 'Нельзя создать встречу',
    impossibleBody: 'Вы не можете создать встречу со своей собственной компанией. Войдите под другим клиентским аккаунтом, чтобы протестировать этот сценарий.',
    videoLinkLabel: 'Видеоссылка',
    atLabel: 'в',
    planning: 'Планирование',
    newAppointment: 'Новая встреча',
    heroSub: 'Создайте понятную и профессиональную встречу.',
    dateToPick: 'Выберите дату',
    recipientSection: 'Получатель',
    ownerNotFound: 'Владелец этой компании не найден.',
    selfHint: 'Вы вошли под аккаунтом владельца этой компании. Встречи должны создаваться из другого аккаунта.',
    typeSection: 'Тип встречи',
    dateTimeSection: 'Дата и время',
    pickDate: 'Выберите дату (день/месяц/год)',
    pickTime: 'Выберите время',
    duration: 'Длительность',
    detailsSection: 'Детали',
    titlePlaceholder: 'Название встречи',
    locationPlaceholder: 'Место или ссылка на встречу',
    priority: 'Приоритет',
    notes: 'Заметки',
    notePlaceholder: 'Повестка, документы для подготовки...',
    options: 'Параметры',
    reminder: 'Напоминание',
    reminderSub: 'За 15 минут',
    repeat: 'Повтор',
    privacy: 'Конфиденциальность',
    missingPrefix: 'Отсутствует: ',
    missingClientAccount: 'другой клиентский аккаунт',
    missingRecipient: 'получатель',
    missingTitle: 'название',
    missingDateTime: 'дата и время',
    creating: 'Создание...',
    send: 'Отправить',
    confirmAppointment: 'Подтвердить встречу',
  },
  ja: {
    autoRecipient: '自動受信者',
    reservationPrefix: '予約',
    serviceLabel: 'サービス',
    priceLabel: '価格',
    repeatTitle: '繰り返し',
    repeatPrompt: '頻度を選択',
    privacyTitle: 'プライバシー',
    privacyPrompt: '公開範囲を選択',
    impossibleTitle: '予約できません',
    impossibleBody: '自分の会社に対して予約を作成することはできません。このフローを確認するには別の顧客アカウントでログインしてください。',
    videoLinkLabel: 'ビデオリンク',
    atLabel: '時刻',
    planning: '計画',
    newAppointment: '新しい予約',
    heroSub: '明確でプロフェッショナルな予約を作成します。',
    dateToPick: '日付を選択',
    recipientSection: '受信者',
    ownerNotFound: 'この会社の所有者が見つかりません。',
    selfHint: 'この会社のオーナーアカウントでログインしています。予約は別のアカウントから作成する必要があります。',
    typeSection: '予約タイプ',
    dateTimeSection: '日付と時間',
    pickDate: '日付を選択（日/月/年）',
    pickTime: '時間を選択',
    duration: '所要時間',
    detailsSection: '詳細',
    titlePlaceholder: '予約タイトル',
    locationPlaceholder: '場所または会議リンク',
    priority: '優先度',
    notes: 'メモ',
    notePlaceholder: '議題、準備する書類...',
    options: 'オプション',
    reminder: 'リマインダー',
    reminderSub: '15分前',
    repeat: '繰り返し',
    privacy: 'プライバシー',
    missingPrefix: '不足: ',
    missingClientAccount: '別の顧客アカウント',
    missingRecipient: '受信者',
    missingTitle: 'タイトル',
    missingDateTime: '日付と時間',
    creating: '作成中...',
    send: '送信',
    confirmAppointment: '予約を確認',
  },
  de: {
    autoRecipient: 'Automatischer Empfänger',
    reservationPrefix: 'Buchung',
    serviceLabel: 'Service',
    priceLabel: 'Preis',
    repeatTitle: 'Wiederholung',
    repeatPrompt: 'Häufigkeit wählen',
    privacyTitle: 'Privatsphäre',
    privacyPrompt: 'Sichtbarkeit wählen',
    impossibleTitle: 'Termin nicht möglich',
    impossibleBody: 'Sie können keinen Termin mit Ihrem eigenen Unternehmen erstellen. Melden Sie sich mit einem anderen Kundenkonto an, um diesen Ablauf zu testen.',
    videoLinkLabel: 'Videolink',
    atLabel: 'um',
    planning: 'Planung',
    newAppointment: 'Neuer Termin',
    heroSub: 'Erstellen Sie einen klaren und professionellen Termin.',
    dateToPick: 'Datum auswählen',
    recipientSection: 'Empfänger',
    ownerNotFound: 'Für dieses Unternehmen wurde kein Inhaber gefunden.',
    selfHint: 'Sie sind mit dem Inhaberkonto dieses Unternehmens angemeldet. Termine müssen mit einem anderen Konto erstellt werden.',
    typeSection: 'Terminart',
    dateTimeSection: 'Datum und Uhrzeit',
    pickDate: 'Datum wählen (Tag/Monat/Jahr)',
    pickTime: 'Uhrzeit wählen',
    duration: 'Dauer',
    detailsSection: 'Details',
    titlePlaceholder: 'Termintitel',
    locationPlaceholder: 'Ort oder Meeting-Link',
    priority: 'Priorität',
    notes: 'Notizen',
    notePlaceholder: 'Agenda, vorzubereitende Dokumente...',
    options: 'Optionen',
    reminder: 'Erinnerung',
    reminderSub: '15 Min. vorher',
    repeat: 'Wiederholung',
    privacy: 'Privatsphäre',
    missingPrefix: 'Fehlt: ',
    missingClientAccount: 'ein anderes Kundenkonto',
    missingRecipient: 'Empfänger',
    missingTitle: 'Titel',
    missingDateTime: 'Datum und Uhrzeit',
    creating: 'Wird erstellt...',
    send: 'Senden',
    confirmAppointment: 'Termin bestätigen',
  },
  id: {
    autoRecipient: 'Penerima otomatis',
    reservationPrefix: 'Pemesanan',
    serviceLabel: 'Layanan',
    priceLabel: 'Harga',
    repeatTitle: 'Pengulangan',
    repeatPrompt: 'Pilih frekuensi',
    privacyTitle: 'Privasi',
    privacyPrompt: 'Pilih visibilitas',
    impossibleTitle: 'Janji temu tidak diizinkan',
    impossibleBody: 'Anda tidak dapat membuat janji temu dengan perusahaan Anda sendiri. Masuk dengan akun klien lain untuk menguji alur ini.',
    videoLinkLabel: 'Tautan video',
    atLabel: 'pukul',
    planning: 'Perencanaan',
    newAppointment: 'Janji temu baru',
    heroSub: 'Buat janji temu yang jelas dan profesional.',
    dateToPick: 'Pilih tanggal',
    recipientSection: 'Penerima',
    ownerNotFound: 'Tidak ada pemilik yang ditemukan untuk perusahaan ini.',
    selfHint: 'Anda masuk dengan akun pemilik perusahaan ini. Janji temu harus dibuat dari akun lain.',
    typeSection: 'Jenis janji temu',
    dateTimeSection: 'Tanggal dan waktu',
    pickDate: 'Pilih tanggal (hari/bulan/tahun)',
    pickTime: 'Pilih waktu',
    duration: 'Durasi',
    detailsSection: 'Detail',
    titlePlaceholder: 'Judul janji temu',
    locationPlaceholder: 'Lokasi atau tautan rapat',
    priority: 'Prioritas',
    notes: 'Catatan',
    notePlaceholder: 'Agenda, dokumen yang perlu disiapkan...',
    options: 'Opsi',
    reminder: 'Pengingat',
    reminderSub: '15 menit sebelumnya',
    repeat: 'Pengulangan',
    privacy: 'Privasi',
    missingPrefix: 'Kurang: ',
    missingClientAccount: 'akun klien lain',
    missingRecipient: 'penerima',
    missingTitle: 'judul',
    missingDateTime: 'tanggal dan waktu',
    creating: 'Membuat...',
    send: 'Kirim',
    confirmAppointment: 'Konfirmasi janji temu',
  },
  ur: {
    autoRecipient: 'خودکار وصول کنندہ',
    reservationPrefix: 'بکنگ',
    serviceLabel: 'سروس',
    priceLabel: 'قیمت',
    repeatTitle: 'دہراؤ',
    repeatPrompt: 'تعدد منتخب کریں',
    privacyTitle: 'رازداری',
    privacyPrompt: 'مرئیت منتخب کریں',
    impossibleTitle: 'ملاقات ممکن نہیں',
    impossibleBody: 'آپ اپنی ہی کمپنی کے ساتھ ملاقات نہیں بنا سکتے۔ اس عمل کو جانچنے کے لیے کسی دوسرے کسٹمر اکاؤنٹ سے سائن ان کریں۔',
    videoLinkLabel: 'ویڈیو لنک',
    atLabel: 'بوقت',
    planning: 'منصوبہ بندی',
    newAppointment: 'نئی ملاقات',
    heroSub: 'ایک واضح اور پیشہ ورانہ ملاقات بنائیں۔',
    dateToPick: 'تاریخ منتخب کریں',
    recipientSection: 'وصول کنندہ',
    ownerNotFound: 'اس کمپنی کے لیے کوئی مالک نہیں ملا۔',
    selfHint: 'آپ اس کمپنی کے مالک اکاؤنٹ سے سائن ان ہیں۔ ملاقاتیں کسی دوسرے اکاؤنٹ سے بنائی جانی چاہئیں۔',
    typeSection: 'ملاقات کی قسم',
    dateTimeSection: 'تاریخ اور وقت',
    pickDate: 'تاریخ منتخب کریں (دن/مہینہ/سال)',
    pickTime: 'وقت منتخب کریں',
    duration: 'دورانیہ',
    detailsSection: 'تفصیلات',
    titlePlaceholder: 'ملاقات کا عنوان',
    locationPlaceholder: 'مقام یا میٹنگ لنک',
    priority: 'ترجیح',
    notes: 'نوٹس',
    notePlaceholder: 'ایجنڈا، تیار کیے جانے والے دستاویزات...',
    options: 'اختیارات',
    reminder: 'یاد دہانی',
    reminderSub: '15 منٹ پہلے',
    repeat: 'دہراؤ',
    privacy: 'رازداری',
    missingPrefix: 'کمی: ',
    missingClientAccount: 'کوئی مختلف کسٹمر اکاؤنٹ',
    missingRecipient: 'وصول کنندہ',
    missingTitle: 'عنوان',
    missingDateTime: 'تاریخ اور وقت',
    creating: 'بنایا جا رہا ہے...',
    send: 'بھیجیں',
    confirmAppointment: 'ملاقات کی تصدیق کریں',
  },
};

const TYPE_LABEL_KEYS = {
  video: 'typeVideo',
  in_person: 'typeInPerson',
  phone: 'typePhone',
  message: 'typeMessage',
};

const TYPE_SUBLABELS = {
  fr: {
    video: 'Lien auto-genere',
    in_person: 'Lieu a preciser',
    phone: 'Audio uniquement',
    message: 'Notification push',
  },
  en: {
    video: 'Auto-generated link',
    in_person: 'Location to define',
    phone: 'Audio only',
    message: 'Push notification',
  },
  es: {
    video: 'Enlace autogenerado',
    in_person: 'Lugar por definir',
    phone: 'Solo audio',
    message: 'Notificacion push',
  },
  pt: {
    video: 'Link gerado automaticamente',
    in_person: 'Local a definir',
    phone: 'Somente audio',
    message: 'Notificacao push',
  },
  zh: {
    video: '自动生成链接',
    in_person: '地点待定',
    phone: '仅音频',
    message: '推送通知',
  },
  hi: {
    video: 'स्वतः निर्मित लिंक',
    in_person: 'स्थान तय होना है',
    phone: 'केवल ऑडियो',
    message: 'पुश सूचना',
  },
  ar: {
    video: 'رابط يتم إنشاؤه تلقائياً',
    in_person: 'المكان يحدد لاحقاً',
    phone: 'صوت فقط',
    message: 'إشعار فوري',
  },
  bn: {
    video: 'স্বয়ংক্রিয়ভাবে তৈরি লিংক',
    in_person: 'স্থান পরে নির্ধারণ করা হবে',
    phone: 'শুধু অডিও',
    message: 'পুশ নোটিফিকেশন',
  },
  ru: {
    video: 'Ссылка создается автоматически',
    in_person: 'Место будет уточнено',
    phone: 'Только аудио',
    message: 'Push-уведомление',
  },
  ja: {
    video: '自動生成リンク',
    in_person: '場所は後で指定',
    phone: '音声のみ',
    message: 'プッシュ通知',
  },
  de: {
    video: 'Automatisch erzeugter Link',
    in_person: 'Ort noch festzulegen',
    phone: 'Nur Audio',
    message: 'Push-Benachrichtigung',
  },
  id: {
    video: 'Tautan dibuat otomatis',
    in_person: 'Lokasi akan ditentukan',
    phone: 'Hanya audio',
    message: 'Notifikasi push',
  },
  ur: {
    video: 'خودکار تیار کردہ لنک',
    in_person: 'مقام بعد میں طے ہوگا',
    phone: 'صرف آڈیو',
    message: 'پش نوٹیفکیشن',
  },
};

const REPEAT_LABELS = {
  fr: { never: 'Jamais', daily: 'Tous les jours', weekly: 'Chaque semaine', monthly: 'Chaque mois' },
  en: { never: 'Never', daily: 'Every day', weekly: 'Every week', monthly: 'Every month' },
  es: { never: 'Nunca', daily: 'Cada dia', weekly: 'Cada semana', monthly: 'Cada mes' },
  pt: { never: 'Nunca', daily: 'Todos os dias', weekly: 'Toda semana', monthly: 'Todo mes' },
  zh: { never: '从不', daily: '每天', weekly: '每周', monthly: '每月' },
  hi: { never: 'कभी नहीं', daily: 'हर दिन', weekly: 'हर सप्ताह', monthly: 'हर महीने' },
  ar: { never: 'أبداً', daily: 'كل يوم', weekly: 'كل أسبوع', monthly: 'كل شهر' },
  bn: { never: 'কখনও নয়', daily: 'প্রতিদিন', weekly: 'প্রতি সপ্তাহে', monthly: 'প্রতি মাসে' },
  ru: { never: 'Никогда', daily: 'Каждый день', weekly: 'Каждую неделю', monthly: 'Каждый месяц' },
  ja: { never: 'なし', daily: '毎日', weekly: '毎週', monthly: '毎月' },
  de: { never: 'Nie', daily: 'Jeden Tag', weekly: 'Jede Woche', monthly: 'Jeden Monat' },
  id: { never: 'Tidak pernah', daily: 'Setiap hari', weekly: 'Setiap minggu', monthly: 'Setiap bulan' },
  ur: { never: 'کبھی نہیں', daily: 'ہر روز', weekly: 'ہر ہفتے', monthly: 'ہر ماہ' },
};

const PRIVACY_LABELS = {
  fr: { shared: 'Partage avec le destinataire', private: 'Prive (visible pour moi)' },
  en: { shared: 'Shared with recipient', private: 'Private (visible to me)' },
  es: { shared: 'Compartido con el destinatario', private: 'Privado (visible para mi)' },
  pt: { shared: 'Compartilhado com o destinatario', private: 'Privado (visivel para mim)' },
  zh: { shared: '与接收人共享', private: '私密（仅自己可见）' },
  hi: { shared: 'प्राप्तकर्ता के साथ साझा', private: 'निजी (केवल मुझे दिखाई दे)' },
  ar: { shared: 'مشترك مع المستلم', private: 'خاص (مرئي لي فقط)' },
  bn: { shared: 'প্রাপকের সাথে শেয়ার করা', private: 'ব্যক্তিগত (শুধু আমার জন্য দৃশ্যমান)' },
  ru: { shared: 'Поделиться с получателем', private: 'Личное (вижу только я)' },
  ja: { shared: '受信者と共有', private: '非公開（自分のみに表示）' },
  de: { shared: 'Mit Empfänger geteilt', private: 'Privat (nur für mich sichtbar)' },
  id: { shared: 'Dibagikan dengan penerima', private: 'Pribadi (hanya terlihat oleh saya)' },
  ur: { shared: 'وصول کنندہ کے ساتھ شیئر', private: 'نجی (صرف مجھے نظر آئے)' },
};

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

const formatDateLabel = (value, locale) => {
  if (!value) return '';
  return value.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTimeLabel = (value, locale) => {
  if (!value) return '';
  return value.toLocaleTimeString(locale, {
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
  const { language, t, activeLanguage } = useLanguage();
  const {
    users = MOCK_USERS,
    user,
    ensurePushReadyOrAlert,
  } = useHomeScreen?.(navigation) || {
    users: MOCK_USERS,
    user: { _id: '1' },
    ensurePushReadyOrAlert: async () => true,
  };
  const ui = UI_TEXT[language] || UI_TEXT.en;
  const locale = LOCALE_BY_LANGUAGE[activeLanguage] || LOCALE_BY_LANGUAGE.en;

  const appointmentTypes = useMemo(() => {
    const sublabels = TYPE_SUBLABELS[language] || TYPE_SUBLABELS.en;
    return APPOINTMENT_TYPES.map((item) => ({
      ...item,
      label: t(TYPE_LABEL_KEYS[item.id], item.id),
      sublabel: sublabels[item.id] || '',
    }));
  }, [language, t]);

  const priorities = useMemo(() => ([
    { ...PRIORITIES[0], label: t('priorityLow', 'Low') },
    { ...PRIORITIES[1], label: t('priorityNormal', 'Normal') },
    { ...PRIORITIES[2], label: t('priorityHigh', 'High') },
  ]), [t]);

  const repeatOptions = useMemo(() => {
    const labels = REPEAT_LABELS[language] || REPEAT_LABELS.en;
    return REPEAT_OPTIONS.map((item) => ({
      ...item,
      label: labels[item.id] || item.id,
    }));
  }, [language]);

  const privacyOptions = useMemo(() => {
    const labels = PRIVACY_LABELS[language] || PRIVACY_LABELS.en;
    return PRIVACY_OPTIONS.map((item) => ({
      ...item,
      label: labels[item.id] || item.id,
    }));
  }, [language]);
  const companyId = route?.params?.companyId || route?.params?.service?.companyId;
  const service = route?.params?.service;
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
          ownerName = t('userDefault', 'User');
        }

        setCompanyOwnerFallback({
          _id: ownerId,
          name: ownerName,
          subtitle: ui.autoRecipient,
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
  }, [companyId, users]);

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
          name: companyOwnerFallback?.name || t('userDefault', 'User'),
          subtitle: ui.autoRecipient,
        },
      ];
    }

    return filtered;
  }, [users, user?.firebaseUid, user?._id, companyId, companyOwnerId, companyOwnerFallback, ui.autoRecipient, t]);

  const titlePrefix = route?.params?.appointmentTitlePrefix || ui.reservationPrefix;
  const prefTitle = service?.name ? `${titlePrefix} - ${service.name}` : '';
  const prefLocation = route?.params?.appointmentLocation || service?.location || '';
  const prefNote = [
    service?.name ? `${ui.serviceLabel}: ${service.name}` : null,
    service?.price ? `${ui.priceLabel}: $${Number(service.price || 0).toFixed(2)}` : null,
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

  const selectedUser = useMemo(() => recipientUsers[0] || null, [recipientUsers]);
  const selectedTypeLabel = useMemo(
    () => appointmentTypes.find((item) => item.id === appointmentType)?.label || appointmentType,
    [appointmentTypes, appointmentType]
  );

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

  const repeatLabel = repeatOptions.find((item) => item.id === repeat)?.label || repeatOptions[0]?.label || '';
  const privacyLabel = privacyOptions.find((item) => item.id === privacy)?.label || privacyOptions[0]?.label || '';

  const openRepeatSelector = () => {
    Alert.alert(
      ui.repeatTitle,
      ui.repeatPrompt,
      [
        ...repeatOptions.map((opt) => ({
          text: `${repeat === opt.id ? '✓ ' : ''}${opt.label}`,
          onPress: () => setRepeat(opt.id),
        })),
        { text: t('cancel', 'Cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openPrivacySelector = () => {
    Alert.alert(
      ui.privacyTitle,
      ui.privacyPrompt,
      [
        ...privacyOptions.map((opt) => ({
          text: `${privacy === opt.id ? '✓ ' : ''}${opt.label}`,
          onPress: () => setPrivacy(opt.id),
        })),
        { text: t('cancel', 'Cancel'), style: 'cancel' },
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

    const canSend = await ensurePushReadyOrAlert({ source: 'create-appointment' });
    if (!canSend) {
      navigation.navigate('NotificationLabs');
      return;
    }

    if (isSelfAppointment) {
      Alert.alert(
        ui.impossibleTitle,
        ui.impossibleBody
      );
      return;
    }

    const dateTime = appointmentDateTime;
    const dateLabel = formatDateLabel(dateTime, locale);
    const timeLabel = formatTimeLabel(dateTime, locale);

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
        ? [note.trim(), `${ui.videoLinkLabel}: ${generatedVideoLink}`].filter(Boolean).join('\n')
        : note;

      await createAppointment({
        companyId,
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
        message: `${title} - ${dateLabel} ${ui.atLabel} ${timeLabel} (${duration})`,
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
          <Text style={styles.navCancel}>{t('back', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{ui.newAppointment}</Text>
        <TouchableOpacity onPress={handleSend} disabled={!isReady || loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.navSend, (!isReady || loading) && styles.navSendDisabled]}>
            {loading ? ui.creating : ui.send}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>{ui.planning}</Text>
          <Text style={styles.heroTitle}>{title.trim() || ui.newAppointment}</Text>
          <Text style={styles.heroSub}>{ui.heroSub}</Text>
          <View style={styles.heroMetaWrap}>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaText}>{selectedTypeLabel}</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaText}>{duration}</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaText}>{appointmentDateTime ? formatDateLabel(appointmentDateTime, locale) : ui.dateToPick}</Text>
            </View>
          </View>
        </View>

        {/* Destinataire auto */}
        <SectionLabel text={ui.recipientSection} />
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
              <Text style={styles.rowSublabel}>{ui.ownerNotFound}</Text>
            </View>
          )}
        </Card>
        {isSelfAppointment && (
          <Text style={styles.hint}>
            {ui.selfHint}
          </Text>
        )}

        {/* Type */}
        <SectionLabel text={ui.typeSection} />
        <View style={styles.typeGrid}>
          {appointmentTypes.map(tItem => (
            <TypeCard
              key={tItem.id}
              item={tItem}
              selected={appointmentType === tItem.id}
              onPress={() => setAppointmentType(tItem.id)}
            />
          ))}
        </View>

        {/* Date & heure */}
        <SectionLabel text={ui.dateTimeSection} />
        <Card>
          <View style={styles.pickerRow}>
            <FieldRow
              icon="📅"
              placeholder={ui.pickDate}
              value={appointmentDateTime ? formatDateLabel(appointmentDateTime, locale) : ''}
              onChangeText={() => {}}
            />
            <TouchableOpacity style={styles.overlayTouch} onPress={openDatePicker} activeOpacity={0.8} />
          </View>
          <RowSeparator />
          <View style={styles.pickerRow}>
            <FieldRow
              icon="🕐"
              placeholder={ui.pickTime}
              value={appointmentDateTime ? formatTimeLabel(appointmentDateTime, locale) : ''}
              onChangeText={() => {}}
            />
            <TouchableOpacity style={styles.overlayTouch} onPress={openTimePicker} activeOpacity={0.8} />
          </View>
          <RowSeparator />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>⏱</Text>
            <Text style={[styles.rowLabel, { flex: 1 }]}>{ui.duration}</Text>
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
        <SectionLabel text={ui.detailsSection} />
        <Card>
          <FieldRow
            icon="✏️"
            placeholder={ui.titlePlaceholder}
            value={title}
            onChangeText={setTitle}
          />
          <RowSeparator />
          <FieldRow
            icon="📍"
            placeholder={ui.locationPlaceholder}
            value={location}
            onChangeText={setLocation}
          />
          <RowSeparator />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>🚩</Text>
            <Text style={styles.rowLabel}>{ui.priority}</Text>
          </View>
          <View style={styles.priorityRow}>
            {priorities.map(p => (
              <PriorityChip
                key={p.id}
                item={p}
                selected={priority === p.id}
                onPress={() => setPriority(p.id)}
              />
            ))}
          </View>
        </Card>

        {/* Notes */}
        <SectionLabel text={ui.notes} />
        <Card>
          <FieldRow
            icon="📝"
            placeholder={ui.notePlaceholder}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </Card>

        {/* Options */}
        <SectionLabel text={ui.options} />
        <Card>
          <View style={styles.row}>
            <Text style={styles.fieldIcon}>🔔</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{ui.reminder}</Text>
              <Text style={styles.rowSublabel}>{ui.reminderSub}</Text>
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
              <Text style={styles.rowLabel}>{ui.repeat}</Text>
              <Text style={styles.rowSublabel}>{repeatLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <RowSeparator />
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={openPrivacySelector}>
            <Text style={styles.fieldIcon}>🔒</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{ui.privacy}</Text>
              <Text style={styles.rowSublabel}>{privacyLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Status hint */}
        {!isReady && (
          <Text style={styles.hint}>
            {[
              isSelfAppointment && ui.missingClientAccount,
              !selectedUser && ui.missingRecipient,
              !title.trim() && ui.missingTitle,
              !appointmentDateTime && ui.missingDateTime,
            ]
              .filter(Boolean)
              .join(', ')
              .replace(/^./, (s) => `${ui.missingPrefix}${s}`)}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!isReady || loading) && styles.submitBtnDisabled]}
          onPress={handleSend}
          disabled={!isReady || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{loading ? ui.creating : ui.confirmAppointment}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={appointmentDateTime || new Date()}
        minimumDate={new Date()}
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
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