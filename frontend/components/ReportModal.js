import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { createReport } from '../services/api';

const { width } = Dimensions.get('window');

const PURPLE = '#7C3AED';

const REASONS = [
  { key: 'shocking', icon: 'alert-circle' },
  { key: 'spam', icon: 'mail-unread' },
  { key: 'fake', icon: 'person-remove' },
  { key: 'illegal', icon: 'warning' },
  { key: 'other', icon: 'ellipsis-horizontal' },
];

const T = {
  fr: {
    title: 'Signaler ce contenu',
    shocking: 'Contenu choquant ou inapproprié',
    spam: 'Spam ou publicité abusive',
    fake: 'Usurpation d\'identité ou fraude',
    illegal: 'Contenu illégal',
    other: 'Autre',
    detailsPlaceholder: 'Détails (optionnel)',
    cancel: 'Annuler',
    submit: 'Envoyer',
    error: 'Erreur',
    chooseReason: 'Choisissez une raison',
    thankYou: 'Merci',
    submitted: 'Votre signalement a bien été envoyé.',
    failed: 'Impossible d\'envoyer le signalement.',
  },
  en: {
    title: 'Report this content',
    shocking: 'Shocking or inappropriate content',
    spam: 'Spam or abusive advertising',
    fake: 'Impersonation or fraud',
    illegal: 'Illegal content',
    other: 'Other',
    detailsPlaceholder: 'Details (optional)',
    cancel: 'Cancel',
    submit: 'Submit',
    error: 'Error',
    chooseReason: 'Choose a reason',
    thankYou: 'Thank you',
    submitted: 'Your report has been submitted.',
    failed: 'Unable to submit the report.',
  },
  es: {
    title: 'Reportar este contenido',
    shocking: 'Contenido impactante o inapropiado',
    spam: 'Spam o publicidad abusiva',
    fake: 'Suplantación de identidad o fraude',
    illegal: 'Contenido ilegal',
    other: 'Otro',
    detailsPlaceholder: 'Detalles (opcional)',
    cancel: 'Cancelar',
    submit: 'Enviar',
    error: 'Error',
    chooseReason: 'Elige una razón',
    thankYou: 'Gracias',
    submitted: 'Su reporte ha sido enviado.',
    failed: 'No se pudo enviar el reporte.',
  },
  pt: {
    title: 'Reportar este conteúdo',
    shocking: 'Conteúdo chocante ou impróprio',
    spam: 'Spam ou publicidade abusiva',
    fake: 'Usurpação de identidade ou fraude',
    illegal: 'Conteúdo ilegal',
    other: 'Outro',
    detailsPlaceholder: 'Detalhes (opcional)',
    cancel: 'Cancelar',
    submit: 'Enviar',
    error: 'Erro',
    chooseReason: 'Escolha uma razão',
    thankYou: 'Obrigado',
    submitted: 'Seu relatório foi enviado.',
    failed: 'Não foi possível enviar o relatório.',
  },
  zh: {
    title: '举报此内容',
    shocking: '令人震惊或不适当的内容',
    spam: '垃圾信息或滥用广告',
    fake: '冒充身份或欺诈',
    illegal: '非法内容',
    other: '其他',
    detailsPlaceholder: '详情（可选）',
    cancel: '取消',
    submit: '提交',
    error: '错误',
    chooseReason: '请选择一个原因',
    thankYou: '谢谢',
    submitted: '您的举报已提交。',
    failed: '无法提交举报。',
  },
  hi: {
    title: 'इस सामग्री की रिपोर्ट करें',
    shocking: 'चौंकाने वाली या अनुचित सामग्री',
    spam: 'स्पैम या अपमानजनक विज्ञापन',
    fake: 'प्रतिरूपण या धोखाधड़ी',
    illegal: 'अवैध सामग्री',
    other: 'अन्य',
    detailsPlaceholder: 'विवरण (वैकल्पिक)',
    cancel: 'रद्द करें',
    submit: 'जमा करें',
    error: 'त्रुटि',
    chooseReason: 'एक कारण चुनें',
    thankYou: 'धन्यवाद',
    submitted: 'आपकी रिपोर्ट सबमिट कर दी गई है।',
    failed: 'रिपोर्ट सबमिट करने में असमर्थ।',
  },
  ar: {
    title: 'الإبلاغ عن هذا المحتوى',
    shocking: 'محتوى صادم أو غير لائق',
    spam: 'بريد مزعج أو إعلانات مسيئة',
    fake: 'انتحال شخصية أو احتيال',
    illegal: 'محتوى غير قانوني',
    other: 'أخرى',
    detailsPlaceholder: 'التفاصيل (اختياري)',
    cancel: 'إلغاء',
    submit: 'إرسال',
    error: 'خطأ',
    chooseReason: 'اختر سبباً',
    thankYou: 'شكراً',
    submitted: 'تم إرسال بلاغك.',
    failed: 'تعذر إرسال البلاغ.',
  },
  bn: {
    title: 'এই কনটেন্ট রিপোর্ট করুন',
    shocking: 'আপত্তিকর বা অনুপযুক্ত কনটেন্ট',
    spam: 'স্প্যাম বা অপমানজনক বিজ্ঞাপন',
    fake: 'পরিচয় জালিয়াতি বা প্রতারণা',
    illegal: 'অবৈধ কনটেন্ট',
    other: 'অন্যান্য',
    detailsPlaceholder: 'বিস্তারিত (ঐচ্ছিক)',
    cancel: 'বাতিল',
    submit: 'জমা দিন',
    error: 'ত্রুটি',
    chooseReason: 'একটি কারণ চয়ন করুন',
    thankYou: 'ধন্যবাদ',
    submitted: 'আপনার রিপোর্ট জমা দেওয়া হয়েছে।',
    failed: 'রিপোর্ট জমা দেওয়া যায়নি।',
  },
  ru: {
    title: 'Пожаловаться на этот контент',
    shocking: 'Шокирующий или неуместный контент',
    spam: 'Спам или оскорбительная реклама',
    fake: 'Выдача себя за другого или мошенничество',
    illegal: 'Незаконный контент',
    other: 'Другое',
    detailsPlaceholder: 'Подробности (необязательно)',
    cancel: 'Отмена',
    submit: 'Отправить',
    error: 'Ошибка',
    chooseReason: 'Выберите причину',
    thankYou: 'Спасибо',
    submitted: 'Ваша жалоба отправлена.',
    failed: 'Не удалось отправить жалобу.',
  },
  ja: {
    title: 'このコンテンツを報告',
    shocking: '衝撃的または不適切なコンテンツ',
    spam: 'スパムまたは悪質な広告',
    fake: 'なりすましまたは詐欺',
    illegal: '違法なコンテンツ',
    other: 'その他',
    detailsPlaceholder: '詳細（任意）',
    cancel: 'キャンセル',
    submit: '送信',
    error: 'エラー',
    chooseReason: '理由を選択してください',
    thankYou: 'ありがとうございます',
    submitted: '報告が送信されました。',
    failed: '報告を送信できませんでした。',
  },
  de: {
    title: 'Diesen Inhalt melden',
    shocking: 'Schockierende oder unangemessene Inhalte',
    spam: 'Spam oder missbräuchliche Werbung',
    fake: 'Identitätsbetrug oder Betrug',
    illegal: 'Illegale Inhalte',
    other: 'Sonstiges',
    detailsPlaceholder: 'Details (optional)',
    cancel: 'Abbrechen',
    submit: 'Senden',
    error: 'Fehler',
    chooseReason: 'Wählen Sie einen Grund',
    thankYou: 'Danke',
    submitted: 'Ihre Meldung wurde übermittelt.',
    failed: 'Meldung konnte nicht übermittelt werden.',
  },
  id: {
    title: 'Laporkan konten ini',
    shocking: 'Konten yang mengejutkan atau tidak pantas',
    spam: 'Spam atau iklan yang kasar',
    fake: 'Peniruan identitas atau penipuan',
    illegal: 'Konten ilegal',
    other: 'Lainnya',
    detailsPlaceholder: 'Detail (opsional)',
    cancel: 'Batal',
    submit: 'Kirim',
    error: 'Kesalahan',
    chooseReason: 'Pilih alasan',
    thankYou: 'Terima kasih',
    submitted: 'Laporan Anda telah dikirim.',
    failed: 'Tidak dapat mengirim laporan.',
  },
  ur: {
    title: 'اس مواد کی اطلاع دیں',
    shocking: 'چونکا دینے والا یا نامناسب مواد',
    spam: 'سپیم یا نازیبا اشتہار',
    fake: 'نقالی یا دھوکہ دہی',
    illegal: 'غیر قانونی مواد',
    other: 'دیگر',
    detailsPlaceholder: 'تفصیلات (اختیاری)',
    cancel: 'منسوخ کریں',
    submit: 'جمع کریں',
    error: 'خرابی',
    chooseReason: 'ایک وجہ منتخب کریں',
    thankYou: 'شکریہ',
    submitted: 'آپ کی رپورٹ جمع کر دی گئی ہے۔',
    failed: 'رپورٹ جمع نہیں کی جا سکی۔',
  },
};

export default function ReportModal({
  visible, onClose, targetType, targetId,
}) {
  const { language } = useLanguage();
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = T[language] || T.en;

  const reasonLabel = (key) => t[key] || key;

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert(t.error, t.chooseReason);
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        targetType,
        targetId,
        reason: t[reason],
        details,
      });
      Alert.alert(t.thankYou, t.submitted);
      setReason(null);
      setDetails('');
      onClose();
    } catch (e) {
      Alert.alert(t.error, t.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t.title}</Text>

          {REASONS.map((r) => {
            const selected = reason === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.reasonItem, selected && styles.reasonItemSelected]}
                onPress={() => setReason(r.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={r.icon} size={20} color={selected ? PURPLE : '#6B7280'} />
                <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reasonLabel(r.key)}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={PURPLE} /> : null}
              </TouchableOpacity>
            );
          })}

          <TextInput
            style={styles.detailsInput}
            placeholder={t.detailsPlaceholder}
            value={details}
            onChangeText={setDetails}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!reason || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t.submit}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, width: '100%', maxWidth: 520, alignSelf: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6' },
  reasonItemSelected: { backgroundColor: '#F5F3FF', borderColor: PURPLE },
  reasonText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  reasonTextSelected: { color: PURPLE },
  detailsInput: { minHeight: 70, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', marginTop: 8, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
