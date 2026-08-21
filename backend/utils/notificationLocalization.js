const FALLBACK_LANGUAGE = 'en';

const LANGUAGE_MAP = {
  in: 'id',
};

const STRINGS = {
  en: {
    appointmentCreatedTitle: 'New appointment',
    appointmentUpdateTitle: 'Appointment update',
    reminderTitle: 'Appointment reminder',
    reminderBody: (label) => `Reminder: your appointment is in ${label}.`,
    nowTitle: 'Appointment now',
    nowBody: 'It is time for your appointment.',
    missedTitle: 'Missed appointment',
    missedBody: 'Your appointment seems to have been missed. Please reschedule if needed.',
    digestTitle: 'Notification summary',
    digestEmptyBody: (count) => `${count} new notifications are waiting for you.`,
    digestSummaryPrefix: 'Summary:',
    units: {
      message: ['message', 'messages'],
      booking: ['booking', 'bookings'],
      minute: ['minute', 'minutes'],
      hour: ['hour', 'hours'],
    },
    statuses: {
      accepted: 'accepted your appointment',
      rejected: 'declined your appointment',
      cancelled: 'cancelled the appointment',
      completed: 'marked the appointment as completed',
      pending: 'updated the appointment',
      default: 'updated the appointment',
    },
  },
  fr: {
    appointmentCreatedTitle: 'Nouveau rendez-vous',
    appointmentUpdateTitle: 'Mise a jour du rendez-vous',
    reminderTitle: 'Rappel rendez-vous',
    reminderBody: (label) => `Rappel : votre rendez-vous est dans ${label}.`,
    nowTitle: 'Rendez-vous maintenant',
    nowBody: "C'est l'heure de votre rendez-vous.",
    missedTitle: 'Rendez-vous manqué',
    missedBody: 'Votre rendez-vous semble avoir été manqué. Merci de reprogrammer si nécessaire.',
    digestTitle: 'Resume notifications',
    digestEmptyBody: (count) => `${count} nouvelles notifications vous attendent.`,
    digestSummaryPrefix: 'Resume :',
    units: {
      message: ['message', 'messages'],
      booking: ['rendez-vous', 'rendez-vous'],
      minute: ['minute', 'minutes'],
      hour: ['heure', 'heures'],
    },
    statuses: {
      accepted: 'a accepte votre rendez-vous',
      rejected: 'a refuse votre rendez-vous',
      cancelled: 'a annule le rendez-vous',
      completed: 'a marque le rendez-vous comme finalise',
      pending: 'a mis le rendez-vous en attente',
      default: 'a mis a jour le rendez-vous',
    },
  },
  es: {
    appointmentCreatedTitle: 'Nueva cita',
    appointmentUpdateTitle: 'Actualizacion de cita',
    reminderTitle: 'Recordatorio de cita',
    reminderBody: (label) => `Recordatorio: tu cita es dentro de ${label}.`,
    nowTitle: 'Cita ahora',
    nowBody: 'Es hora de tu cita.',
    missedTitle: 'Cita perdida',
    missedBody: 'Parece que has perdido tu cita. Reprograma si hace falta.',
    digestTitle: 'Resumen de notificaciones',
    digestEmptyBody: (count) => `Tienes ${count} notificaciones nuevas esperando.`,
    digestSummaryPrefix: 'Resumen:',
    units: {
      message: ['mensaje', 'mensajes'],
      booking: ['reserva', 'reservas'],
      minute: ['minuto', 'minutos'],
      hour: ['hora', 'horas'],
    },
    statuses: {
      accepted: 'ha aceptado tu cita',
      rejected: 'ha rechazado tu cita',
      cancelled: 'ha cancelado la cita',
      completed: 'ha marcado la cita como completada',
      pending: 'ha actualizado la cita',
      default: 'ha actualizado la cita',
    },
  },
  pt: {
    appointmentCreatedTitle: 'Novo agendamento',
    appointmentUpdateTitle: 'Atualizacao do agendamento',
    reminderTitle: 'Lembrete do agendamento',
    reminderBody: (label) => `Lembrete: o seu agendamento é daqui a ${label}.`,
    nowTitle: 'Agendamento agora',
    nowBody: 'Esta na hora do seu agendamento.',
    missedTitle: 'Agendamento perdido',
    missedBody: 'Parece que o seu agendamento foi perdido. Reagende se necessario.',
    digestTitle: 'Resumo das notificacoes',
    digestEmptyBody: (count) => `Tem ${count} novas notificacoes à espera.`,
    digestSummaryPrefix: 'Resumo:',
    units: {
      message: ['mensagem', 'mensagens'],
      booking: ['agendamento', 'agendamentos'],
      minute: ['minuto', 'minutos'],
      hour: ['hora', 'horas'],
    },
    statuses: {
      accepted: 'aceitou o seu agendamento',
      rejected: 'recusou o seu agendamento',
      cancelled: 'cancelou o agendamento',
      completed: 'marcou o agendamento como concluido',
      pending: 'atualizou o agendamento',
      default: 'atualizou o agendamento',
    },
  },
  de: {
    appointmentCreatedTitle: 'Neuer Termin',
    appointmentUpdateTitle: 'Terminaktualisierung',
    reminderTitle: 'Terminerinnerung',
    reminderBody: (label) => `Erinnerung: Ihr Termin ist in ${label}.`,
    nowTitle: 'Termin jetzt',
    nowBody: 'Es ist Zeit für Ihren Termin.',
    missedTitle: 'Verpasster Termin',
    missedBody: 'Ihr Termin scheint verpasst worden zu sein. Bitte bei Bedarf neu planen.',
    digestTitle: 'Benachrichtigungsübersicht',
    digestEmptyBody: (count) => `Es warten ${count} neue Benachrichtigungen auf Sie.`,
    digestSummaryPrefix: 'Zusammenfassung:',
    units: {
      message: ['Nachricht', 'Nachrichten'],
      booking: ['Termin', 'Termine'],
      minute: ['Minute', 'Minuten'],
      hour: ['Stunde', 'Stunden'],
    },
    statuses: {
      accepted: 'hat Ihren Termin angenommen',
      rejected: 'hat Ihren Termin abgelehnt',
      cancelled: 'hat den Termin abgesagt',
      completed: 'hat den Termin als erledigt markiert',
      pending: 'hat den Termin aktualisiert',
      default: 'hat den Termin aktualisiert',
    },
  },
  id: {
    appointmentCreatedTitle: 'Janji temu baru',
    appointmentUpdateTitle: 'Pembaruan janji temu',
    reminderTitle: 'Pengingat janji temu',
    reminderBody: (label) => `Pengingat: janji temu Anda dalam ${label}.`,
    nowTitle: 'Janji temu sekarang',
    nowBody: 'Waktunya janji temu Anda.',
    missedTitle: 'Janji temu terlewat',
    missedBody: 'Janji temu Anda tampaknya terlewat. Jadwalkan ulang jika perlu.',
    digestTitle: 'Ringkasan notifikasi',
    digestEmptyBody: (count) => `Ada ${count} notifikasi baru menunggu Anda.`,
    digestSummaryPrefix: 'Ringkasan:',
    units: {
      message: ['pesan', 'pesan'],
      booking: ['janji temu', 'janji temu'],
      minute: ['menit', 'menit'],
      hour: ['jam', 'jam'],
    },
    statuses: {
      accepted: 'telah menerima janji temu Anda',
      rejected: 'telah menolak janji temu Anda',
      cancelled: 'telah membatalkan janji temu',
      completed: 'telah menandai janji temu sebagai selesai',
      pending: 'telah memperbarui janji temu',
      default: 'telah memperbarui janji temu',
    },
  },
  zh: {
    appointmentCreatedTitle: '新的预约',
    appointmentUpdateTitle: '预约更新',
    reminderTitle: '预约提醒',
    reminderBody: (label) => `提醒：你的预约还有${label}。`,
    nowTitle: '预约现在',
    nowBody: '你的预约时间到了。',
    missedTitle: '预约已错过',
    missedBody: '你的预约似乎已错过。如有需要请重新安排。',
    digestTitle: '通知摘要',
    digestEmptyBody: (count) => `还有 ${count} 条新通知在等你。`,
    digestSummaryPrefix: '摘要：',
    units: {
      message: ['条消息', '条消息'],
      booking: ['个预约', '个预约'],
      minute: ['分钟', '分钟'],
      hour: ['小时', '小时'],
    },
    statuses: {
      accepted: '已接受你的预约',
      rejected: '已拒绝你的预约',
      cancelled: '已取消预约',
      completed: '已将预约标记为完成',
      pending: '已更新预约',
      default: '已更新预约',
    },
  },
  hi: {
    appointmentCreatedTitle: 'नई अपॉइंटमेंट',
    appointmentUpdateTitle: 'अपॉइंटमेंट अपडेट',
    reminderTitle: 'अपॉइंटमेंट रिमाइंडर',
    reminderBody: (label) => `रिमाइंडर: आपकी अपॉइंटमेंट ${label} में है।`,
    nowTitle: 'अपॉइंटमेंट अभी',
    nowBody: 'आपकी अपॉइंटमेंट का समय हो गया है।',
    missedTitle: 'अपॉइंटमेंट मिस हो गई',
    missedBody: 'लगता है आपकी अपॉइंटमेंट मिस हो गई है। जरूरत हो तो फिर से शेड्यूल करें।',
    digestTitle: 'सूचनाओं का सारांश',
    digestEmptyBody: (count) => `${count} नई सूचनाएं आपका इंतजार कर रही हैं।`,
    digestSummaryPrefix: 'सारांश:',
    units: {
      message: ['संदेश', 'संदेश'],
      booking: ['बुकिंग', 'बुकिंग'],
      minute: ['मिनट', 'मिनट'],
      hour: ['घंटा', 'घंटे'],
    },
    statuses: {
      accepted: 'ने आपकी अपॉइंटमेंट स्वीकार की',
      rejected: 'ने आपकी अपॉइंटमेंट अस्वीकार की',
      cancelled: 'ने अपॉइंटमेंट रद्द की',
      completed: 'ने अपॉइंटमेंट को पूर्ण चिह्नित किया',
      pending: 'ने अपॉइंटमेंट अपडेट की',
      default: 'ने अपॉइंटमेंट अपडेट की',
    },
  },
  ar: {
    appointmentCreatedTitle: 'موعد جديد',
    appointmentUpdateTitle: 'تحديث الموعد',
    reminderTitle: 'تذكير بالموعد',
    reminderBody: (label) => `تذكير: موعدك خلال ${label}.`,
    nowTitle: 'الموعد الآن',
    nowBody: 'حان وقت موعدك.',
    missedTitle: 'موعد فائت',
    missedBody: 'يبدو أن موعدك قد فات. يرجى إعادة الجدولة إذا لزم الأمر.',
    digestTitle: 'ملخص الإشعارات',
    digestEmptyBody: (count) => `هناك ${count} إشعارات جديدة بانتظارك.`,
    digestSummaryPrefix: 'الملخص:',
    units: {
      message: ['رسالة', 'رسائل'],
      booking: ['موعد', 'مواعيد'],
      minute: ['دقيقة', 'دقائق'],
      hour: ['ساعة', 'ساعات'],
    },
    statuses: {
      accepted: 'قبل موعدك',
      rejected: 'رفض موعدك',
      cancelled: 'ألغى الموعد',
      completed: 'أكمل الموعد',
      pending: 'حدّث الموعد',
      default: 'حدّث الموعد',
    },
  },
  bn: {
    appointmentCreatedTitle: 'নতুন অ্যাপয়েন্টমেন্ট',
    appointmentUpdateTitle: 'অ্যাপয়েন্টমেন্ট আপডেট',
    reminderTitle: 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার',
    reminderBody: (label) => `রিমাইন্ডার: আপনার অ্যাপয়েন্টমেন্ট ${label} পরে।`,
    nowTitle: 'এখন অ্যাপয়েন্টমেন্ট',
    nowBody: 'আপনার অ্যাপয়েন্টমেন্টের সময় হয়েছে।',
    missedTitle: 'অ্যাপয়েন্টমেন্ট মিস হয়েছে',
    missedBody: 'দেখা যাচ্ছে আপনার অ্যাপয়েন্টমেন্ট মিস হয়েছে। প্রয়োজন হলে আবার সময় নিন।',
    digestTitle: 'নোটিফিকেশন সারাংশ',
    digestEmptyBody: (count) => `${count}টি নতুন নোটিফিকেশন আপনার জন্য অপেক্ষা করছে।`,
    digestSummaryPrefix: 'সারাংশ:',
    units: {
      message: ['বার্তা', 'বার্তা'],
      booking: ['অ্যাপয়েন্টমেন্ট', 'অ্যাপয়েন্টমেন্ট'],
      minute: ['মিনিট', 'মিনিট'],
      hour: ['ঘন্টা', 'ঘন্টা'],
    },
    statuses: {
      accepted: 'আপনার অ্যাপয়েন্টমেন্ট গ্রহণ করেছে',
      rejected: 'আপনার অ্যাপয়েন্টমেন্ট প্রত্যাখ্যান করেছে',
      cancelled: 'অ্যাপয়েন্টমেন্ট বাতিল করেছে',
      completed: 'অ্যাপয়েন্টমেন্ট সম্পন্ন হিসেবে চিহ্নিত করেছে',
      pending: 'অ্যাপয়েন্টমেন্ট আপডেট করেছে',
      default: 'অ্যাপয়েন্টমেন্ট আপডেট করেছে',
    },
  },
  ru: {
    appointmentCreatedTitle: 'Новая встреча',
    appointmentUpdateTitle: 'Обновление встречи',
    reminderTitle: 'Напоминание о встрече',
    reminderBody: (label) => `Напоминание: ваша встреча через ${label}.`,
    nowTitle: 'Встреча сейчас',
    nowBody: 'Пора на вашу встречу.',
    missedTitle: 'Встреча пропущена',
    missedBody: 'Похоже, вы пропустили встречу. При необходимости перенесите её.',
    digestTitle: 'Сводка уведомлений',
    digestEmptyBody: (count) => `Ожидают ${count} новых уведомлений.`,
    digestSummaryPrefix: 'Сводка:',
    units: {
      message: ['сообщение', 'сообщения'],
      booking: ['встреча', 'встречи'],
      minute: ['минута', 'минуты'],
      hour: ['час', 'часа'],
    },
    statuses: {
      accepted: 'принял вашу встречу',
      rejected: 'отклонил вашу встречу',
      cancelled: 'отменил встречу',
      completed: 'отметил встречу как завершенную',
      pending: 'обновил встречу',
      default: 'обновил встречу',
    },
  },
  ja: {
    appointmentCreatedTitle: '新しい予約',
    appointmentUpdateTitle: '予約の更新',
    reminderTitle: '予約のリマインダー',
    reminderBody: (label) => `リマインダー: 予約まで${label}です。`,
    nowTitle: '予約の時間です',
    nowBody: '予約の時間になりました。',
    missedTitle: '予約を逃しました',
    missedBody: '予約を逃したようです。必要に応じて再調整してください。',
    digestTitle: '通知の要約',
    digestEmptyBody: (count) => `新しい通知が${count}件届いています。`,
    digestSummaryPrefix: '要約:',
    units: {
      message: ['件のメッセージ', '件のメッセージ'],
      booking: ['件の予約', '件の予約'],
      minute: ['分', '分'],
      hour: ['時間', '時間'],
    },
    statuses: {
      accepted: 'が予約を承認しました',
      rejected: 'が予約を辞退しました',
      cancelled: 'が予約をキャンセルしました',
      completed: 'が予約を完了にしました',
      pending: 'が予約を更新しました',
      default: 'が予約を更新しました',
    },
  },
  ur: {
    appointmentCreatedTitle: 'نیا اپائنٹمنٹ',
    appointmentUpdateTitle: 'اپائنٹمنٹ اپ ڈیٹ',
    reminderTitle: 'اپائنٹمنٹ یاد دہانی',
    reminderBody: (label) => `یاد دہانی: آپ کی اپائنٹمنٹ ${label} میں ہے۔`,
    nowTitle: 'اب اپائنٹمنٹ',
    nowBody: 'آپ کی اپائنٹمنٹ کا وقت ہو گیا ہے۔',
    missedTitle: 'اپائنٹمنٹ رہ گئی',
    missedBody: 'لگتا ہے آپ کی اپائنٹمنٹ رہ گئی ہے۔ ضرورت ہو تو دوبارہ شیڈول کریں۔',
    digestTitle: 'اطلاعات کا خلاصہ',
    digestEmptyBody: (count) => `${count} نئی اطلاعات آپ کا انتظار کر رہی ہیں۔`,
    digestSummaryPrefix: 'خلاصہ:',
    units: {
      message: ['پیغام', 'پیغامات'],
      booking: ['اپائنٹمنٹ', 'اپائنٹمنٹس'],
      minute: ['منٹ', 'منٹ'],
      hour: ['گھنٹہ', 'گھنٹے'],
    },
    statuses: {
      accepted: 'نے آپ کی اپائنٹمنٹ قبول کی',
      rejected: 'نے آپ کی اپائنٹمنٹ مسترد کی',
      cancelled: 'نے اپائنٹمنٹ منسوخ کی',
      completed: 'نے اپائنٹمنٹ مکمل کر دی',
      pending: 'نے اپائنٹمنٹ اپ ڈیٹ کی',
      default: 'نے اپائنٹمنٹ اپ ڈیٹ کی',
    },
  },
};

function normalizeLanguage(language, fallback = FALLBACK_LANGUAGE) {
  const raw = String(language || '').trim().toLowerCase();
  if (!raw) return fallback;

  const mapped = LANGUAGE_MAP[raw] || raw;
  return STRINGS[mapped] ? mapped : fallback;
}

function getLanguagePack(language) {
  return STRINGS[normalizeLanguage(language)] || STRINGS[FALLBACK_LANGUAGE];
}

function pluralize(count, forms) {
  return Number(count) === 1 ? forms[0] : forms[1];
}

function formatDurationLabel(language, minutes) {
  const pack = getLanguagePack(language);
  const safeMinutes = Number(minutes) || 0;

  if (safeMinutes >= 60) {
    const hours = Math.round(safeMinutes / 60);
    return `${hours} ${pluralize(hours, pack.units.hour)}`;
  }

  return `${safeMinutes} ${pluralize(safeMinutes, pack.units.minute)}`;
}

function getUserNotificationLanguage(user) {
  return normalizeLanguage(user?.language || user?.locale || user?.notificationPreferences?.language);
}

function buildAppointmentCreatedTitle(language) {
  return getLanguagePack(language).appointmentCreatedTitle;
}

function buildAppointmentStatusUpdateCopy(language, senderName = 'User', status = 'default') {
  const pack = getLanguagePack(language);
  const statusKey = String(status || '').toLowerCase();
  const statusText = pack.statuses[statusKey] || pack.statuses.default;

  return {
    title: pack.appointmentUpdateTitle,
    message: `${senderName} ${statusText}.`,
  };
}

function buildAppointmentReminderCopy(language, minutes, kind = 'reminder') {
  const pack = getLanguagePack(language);
  const label = formatDurationLabel(language, minutes);

  if (kind === 'now') {
    return { title: pack.nowTitle, message: pack.nowBody };
  }

  if (kind === 'missed') {
    return { title: pack.missedTitle, message: pack.missedBody };
  }

  return {
    title: pack.reminderTitle,
    message: pack.reminderBody(label),
  };
}

function buildDigestCopy(language, totalCount, byType = {}) {
  const pack = getLanguagePack(language);
  const messageCount = Number(byType.message || 0);
  const appointmentCount = Number(byType.appointment || 0);
  const parts = [];

  if (messageCount > 0) {
    parts.push(`${messageCount} ${pluralize(messageCount, pack.units.message)}`);
  }

  if (appointmentCount > 0) {
    parts.push(`${appointmentCount} ${pluralize(appointmentCount, pack.units.booking)}`);
  }

  if (!parts.length) {
    return {
      title: pack.digestTitle,
      body: pack.digestEmptyBody(totalCount),
    };
  }

  return {
    title: pack.digestTitle,
    body: `${pack.digestSummaryPrefix} ${parts.join(' • ')}`,
  };
}

module.exports = {
  buildAppointmentCreatedTitle,
  buildAppointmentReminderCopy,
  buildAppointmentStatusUpdateCopy,
  buildDigestCopy,
  getUserNotificationLanguage,
  normalizeLanguage,
};