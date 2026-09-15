const APPOINTMENT_TITLES = {
  fr: {
    update: 'Mise a jour du rendez-vous',
    reminder: 'Rappel rendez-vous',
    now: 'Rendez-vous maintenant',
    missed: 'Rendez-vous manque',
    completed: 'Rendez-vous finalise',
    fallback: 'Rendez-vous',
  },
  en: {
    update: 'Appointment update',
    reminder: 'Appointment reminder',
    now: 'Appointment now',
    missed: 'Missed appointment',
    completed: 'Appointment completed',
    fallback: 'Appointment',
  },
  es: {
    update: 'Actualizacion de cita',
    reminder: 'Recordatorio de cita',
    now: 'Cita ahora',
    missed: 'Cita perdida',
    completed: 'Cita finalizada',
    fallback: 'Cita',
  },
  pt: {
    update: 'Atualizacao do agendamento',
    reminder: 'Lembrete do agendamento',
    now: 'Agendamento agora',
    missed: 'Agendamento perdido',
    completed: 'Agendamento finalizado',
    fallback: 'Agendamento',
  },
  ar: {
    update: 'تحديث الموعد',
    reminder: 'تذكير بالموعد',
    now: 'الموعد الآن',
    missed: 'موعد فائت',
    completed: 'تم إنهاء الموعد',
    fallback: 'الموعد',
  },
  bn: {
    update: 'অ্যাপয়েন্টমেন্ট আপডেট',
    reminder: 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার',
    now: 'এখন অ্যাপয়েন্টমেন্ট',
    missed: 'অ্যাপয়েন্টমেন্ট মিস হয়েছে',
    completed: 'অ্যাপয়েন্টমেন্ট সম্পন্ন',
    fallback: 'অ্যাপয়েন্টমেন্ট',
  },
  ru: {
    update: 'Обновление встречи',
    reminder: 'Напоминание о встрече',
    now: 'Встреча сейчас',
    missed: 'Встреча пропущена',
    completed: 'Встреча завершена',
    fallback: 'Встреча',
  },
  ja: {
    update: '予約の更新',
    reminder: '予約のリマインダー',
    now: '予約の時間です',
    missed: '予約を逃しました',
    completed: '予約が完了しました',
    fallback: '予約',
  },
  de: {
    update: 'Terminaktualisierung',
    reminder: 'Terminerinnerung',
    now: 'Termin jetzt',
    missed: 'Verpasster Termin',
    completed: 'Termin abgeschlossen',
    fallback: 'Termin',
  },
  id: {
    update: 'Pembaruan janji temu',
    reminder: 'Pengingat janji temu',
    now: 'Janji temu sekarang',
    missed: 'Janji temu terlewat',
    completed: 'Janji temu selesai',
    fallback: 'Janji temu',
  },
  ur: {
    update: 'ملاقات کی تازہ کاری',
    reminder: 'ملاقات کی یاد دہانی',
    now: 'اب ملاقات',
    missed: 'ملاقات رہ گئی',
    completed: 'ملاقات مکمل ہو گئی',
    fallback: 'ملاقات',
  },
  hi: {
    update: 'अपॉइंटमेंट अपडेट',
    reminder: 'अपॉइंटमेंट रिमाइंडर',
    now: 'अपॉइंटमेंट अभी',
    missed: 'अपॉइंटमेंट मिस हो गई',
    completed: 'अपॉइंटमेंट समाप्त हुआ',
    fallback: 'अपॉइंटमेंट',
  },
  zh: {
    update: '预约更新',
    reminder: '预约提醒',
    now: '预约现在',
    missed: '预约已错过',
    completed: '预约已完成',
    fallback: '预约',
  },
};

const APPOINTMENT_MESSAGES = {
  fr: {
    reminder: (label) => `Rappel : votre rendez-vous est dans ${label}.`,
    now: "C'est l'heure de votre rendez-vous.",
    missed: 'Votre rendez-vous semble avoir ete manque. Merci de reprogrammer si necessaire.',
    accepted: (name) => `${name} a accepte votre rendez-vous.`,
    rejected: (name) => `${name} a refuse votre rendez-vous.`,
    cancelled: (name) => `${name} a annule le rendez-vous.`,
    completed: (name) => `${name} a marque le rendez-vous comme finalise.`,
    pending: (name) => `${name} a mis a jour le rendez-vous.`,
    default: (name) => `${name} a mis a jour le rendez-vous.`,
  },
  en: {
    reminder: (label) => `Reminder: your appointment is in ${label}.`,
    now: 'It is time for your appointment.',
    missed: 'Your appointment seems to have been missed. Please reschedule if needed.',
    accepted: (name) => `${name} accepted your appointment.`,
    rejected: (name) => `${name} declined your appointment.`,
    cancelled: (name) => `${name} cancelled the appointment.`,
    completed: (name) => `${name} marked the appointment as completed.`,
    pending: (name) => `${name} updated the appointment.`,
    default: (name) => `${name} updated the appointment.`,
  },
  es: {
    reminder: (label) => `Recordatorio: tu cita es dentro de ${label}.`,
    now: 'Es hora de tu cita.',
    missed: 'Parece que has perdido tu cita. Reprograma si hace falta.',
    accepted: (name) => `${name} ha aceptado tu cita.`,
    rejected: (name) => `${name} ha rechazado tu cita.`,
    cancelled: (name) => `${name} ha cancelado la cita.`,
    completed: (name) => `${name} ha marcado la cita como completada.`,
    pending: (name) => `${name} ha actualizado la cita.`,
    default: (name) => `${name} ha actualizado la cita.`,
  },
  pt: {
    reminder: (label) => `Lembrete: o seu agendamento e daqui a ${label}.`,
    now: 'Esta na hora do seu agendamento.',
    missed: 'Parece que o seu agendamento foi perdido. Reagende se necessario.',
    accepted: (name) => `${name} aceitou o seu agendamento.`,
    rejected: (name) => `${name} recusou o seu agendamento.`,
    cancelled: (name) => `${name} cancelou o agendamento.`,
    completed: (name) => `${name} marcou o agendamento como concluido.`,
    pending: (name) => `${name} atualizou o agendamento.`,
    default: (name) => `${name} atualizou o agendamento.`,
  },
  ar: {
    reminder: (label) => `تذكير: موعدك خلال ${label}.`,
    now: 'حان وقت موعدك.',
    missed: 'يبدو أن موعدك قد فات. يرجى إعادة الجدولة إذا لزم الأمر.',
    accepted: (name) => `${name} قبل موعدك.`,
    rejected: (name) => `${name} رفض موعدك.`,
    cancelled: (name) => `${name} ألغى الموعد.`,
    completed: (name) => `${name} أنهى الموعد.`,
    pending: (name) => `${name} حدّث الموعد.`,
    default: (name) => `${name} حدّث الموعد.`,
  },
  bn: {
    reminder: (label) => `রিমাইন্ডার: আপনার অ্যাপয়েন্টমেন্ট ${label} পরে।`,
    now: 'আপনার অ্যাপয়েন্টমেন্টের সময় হয়েছে।',
    missed: 'দেখা যাচ্ছে আপনার অ্যাপয়েন্টমেন্ট মিস হয়েছে। প্রয়োজন হলে আবার সময় নিন।',
    accepted: (name) => `${name} আপনার অ্যাপয়েন্টমেন্ট গ্রহণ করেছে।`,
    rejected: (name) => `${name} আপনার অ্যাপয়েন্টমেন্ট প্রত্যাখ্যান করেছে।`,
    cancelled: (name) => `${name} অ্যাপয়েন্টমেন্ট বাতিল করেছে।`,
    completed: (name) => `${name} অ্যাপয়েন্টমেন্ট সম্পন্ন হিসেবে চিহ্নিত করেছে।`,
    pending: (name) => `${name} অ্যাপয়েন্টমেন্ট আপডেট করেছে।`,
    default: (name) => `${name} অ্যাপয়েন্টমেন্ট আপডেট করেছে।`,
  },
  ru: {
    reminder: (label) => `Напоминание: ваша встреча через ${label}.`,
    now: 'Пора на вашу встречу.',
    missed: 'Похоже, вы пропустили встречу. При необходимости перенесите ее.',
    accepted: (name) => `${name} принял вашу встречу.`,
    rejected: (name) => `${name} отклонил вашу встречу.`,
    cancelled: (name) => `${name} отменил встречу.`,
    completed: (name) => `${name} отметил встречу как завершенную.`,
    pending: (name) => `${name} обновил встречу.`,
    default: (name) => `${name} обновил встречу.`,
  },
  ja: {
    reminder: (label) => `リマインダー: 予約まで${label}です。`,
    now: '予約の時間になりました。',
    missed: '予約を逃したようです。必要に応じて再調整してください。',
    accepted: (name) => `${name} が予約を承認しました。`,
    rejected: (name) => `${name} が予約を辞退しました。`,
    cancelled: (name) => `${name} が予約をキャンセルしました。`,
    completed: (name) => `${name} が予約を完了にしました。`,
    pending: (name) => `${name} が予約を更新しました。`,
    default: (name) => `${name} が予約を更新しました。`,
  },
  de: {
    reminder: (label) => `Erinnerung: Ihr Termin ist in ${label}.`,
    now: 'Es ist Zeit fur Ihren Termin.',
    missed: 'Ihr Termin scheint verpasst worden zu sein. Bitte bei Bedarf neu planen.',
    accepted: (name) => `${name} hat Ihren Termin angenommen.`,
    rejected: (name) => `${name} hat Ihren Termin abgelehnt.`,
    cancelled: (name) => `${name} hat den Termin abgesagt.`,
    completed: (name) => `${name} hat den Termin als erledigt markiert.`,
    pending: (name) => `${name} hat den Termin aktualisiert.`,
    default: (name) => `${name} hat den Termin aktualisiert.`,
  },
  id: {
    reminder: (label) => `Pengingat: janji temu Anda dalam ${label}.`,
    now: 'Waktunya janji temu Anda.',
    missed: 'Janji temu Anda tampaknya terlewat. Jadwalkan ulang jika perlu.',
    accepted: (name) => `${name} telah menerima janji temu Anda.`,
    rejected: (name) => `${name} telah menolak janji temu Anda.`,
    cancelled: (name) => `${name} telah membatalkan janji temu.`,
    completed: (name) => `${name} telah menandai janji temu sebagai selesai.`,
    pending: (name) => `${name} telah memperbarui janji temu.`,
    default: (name) => `${name} telah memperbarui janji temu.`,
  },
  ur: {
    reminder: (label) => `یاد دہانی: آپ کی ملاقات ${label} میں ہے۔`,
    now: 'آپ کی ملاقات کا وقت ہو گیا ہے۔',
    missed: 'لگتا ہے آپ کی ملاقات رہ گئی ہے۔ ضرورت ہو تو دوبارہ شیڈول کریں۔',
    accepted: (name) => `${name} نے آپ کی ملاقات قبول کی۔`,
    rejected: (name) => `${name} نے آپ کی ملاقات مسترد کی۔`,
    cancelled: (name) => `${name} نے ملاقات منسوخ کی۔`,
    completed: (name) => `${name} نے ملاقات مکمل کر دی۔`,
    pending: (name) => `${name} نے ملاقات اپ ڈیٹ کی۔`,
    default: (name) => `${name} نے ملاقات اپ ڈیٹ کی۔`,
  },
  hi: {
    reminder: (label) => `रिमाइंडर: आपकी अपॉइंटमेंट ${label} में है।`,
    now: 'आपकी अपॉइंटमेंट का समय हो गया है।',
    missed: 'लगता है आपकी अपॉइंटमेंट मिस हो गई है। जरूरत हो तो फिर से शेड्यूल करें।',
    accepted: (name) => `${name} ने आपकी अपॉइंटमेंट स्वीकार की।`,
    rejected: (name) => `${name} ने आपकी अपॉइंटमेंट अस्वीकार की।`,
    cancelled: (name) => `${name} ने अपॉइंटमेंट रद्द की।`,
    completed: (name) => `${name} ने अपॉइंटमेंट को पूर्ण चिह्नित किया।`,
    pending: (name) => `${name} ने अपॉइंटमेंट अपडेट की।`,
    default: (name) => `${name} ने अपॉइंटमेंट अपडेट की।`,
  },
  zh: {
    reminder: (label) => `提醒：你的预约还有${label}。`,
    now: '你的预约时间到了。',
    missed: '你的预约似乎已错过。如有需要请重新安排。',
    accepted: (name) => `${name} 已接受你的预约。`,
    rejected: (name) => `${name} 已拒绝你的预约。`,
    cancelled: (name) => `${name} 已取消预约。`,
    completed: (name) => `${name} 已将预约标记为完成。`,
    pending: (name) => `${name} 已更新预约。`,
    default: (name) => `${name} 已更新预约。`,
  },
};

function normalizeLanguage(language) {
  const safe = String(language || '').trim().toLowerCase();
  if (!safe) return 'en';
  const base = safe.split(/[-_]/)[0] || safe;
  if (base === 'in') return 'id';
  return APPOINTMENT_TITLES[base] ? base : 'en';
}

function formatReminderLabel(language, minutes) {
  const value = Number(minutes) || 0;
  if (language === 'fr') {
    if (value >= 60) {
      const hours = Math.round(value / 60);
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    }
    return `${value} minute${value > 1 ? 's' : ''}`;
  }
  if (value >= 60) {
    const hours = Math.round(value / 60);
    return `${hours} ${hours > 1 ? 'hours' : 'hour'}`;
  }
  return `${value} ${value > 1 ? 'minutes' : 'minute'}`;
}

function inferStatusFromFallbackText(title, message) {
  const rawTitle = String(title || '').trim();
  const rawMessage = String(message || '').trim();
  const lowerTitle = rawTitle.toLowerCase();
  const lowerMessage = rawMessage.toLowerCase();
  const combined = `${lowerTitle} ${lowerMessage}`;

  const reminderMinutesFromStatus = lowerMessage.match(/reminder_(\d+)m/i)?.[1];
  if (reminderMinutesFromStatus) {
    return `reminder_${Number(reminderMinutesFromStatus)}m`;
  }

  const reminderMinutesFromText = lowerMessage.match(/\bin\s+(\d+)\s+minute/i)?.[1];
  if (reminderMinutesFromText) {
    return `reminder_${Number(reminderMinutesFromText)}m`;
  }

  if (
    lowerTitle.includes('appointment reminder') ||
    lowerTitle.includes('booking reminder') ||
    lowerMessage.includes('reminder: your appointment is in')
  ) {
    return 'reminder_15m';
  }

  if (
    lowerTitle.includes('appointment now') ||
    lowerTitle.includes('booking now') ||
    lowerMessage.includes('it is time for your appointment')
  ) {
    return 'appointment_now';
  }

  if (
    lowerTitle.includes('missed appointment') ||
    lowerTitle.includes('appointment missed') ||
    lowerMessage.includes('appointment seems to have been missed')
  ) {
    return 'appointment_missed';
  }

  if (combined.includes('accepted your appointment')) return 'accepted';
  if (combined.includes('declined your appointment') || combined.includes('rejected your appointment')) return 'rejected';
  if (combined.includes('cancelled the appointment')) return 'cancelled';
  if (combined.includes('marked the appointment as completed')) return 'completed';

  if (
    lowerTitle.includes('booking update') ||
    lowerTitle.includes('appointment update') ||
    combined.includes('updated the appointment')
  ) {
    return 'pending';
  }

  return '';
}

function hasAppointmentClues(notification, fallbackTitle, fallbackMessage) {
  const type = String(notification?.type || '').trim().toLowerCase();
  if (type === 'appointment' || type === 'booking') return true;

  const title = String(fallbackTitle || notification?.title || '').toLowerCase();
  const message = String(fallbackMessage || notification?.message || '').toLowerCase();
  const combined = `${title} ${message}`;

  return (
    combined.includes('appointment') ||
    combined.includes('booking update') ||
    combined.includes('accepted your appointment') ||
    combined.includes('declined your appointment') ||
    combined.includes('rejected your appointment') ||
    combined.includes('cancelled the appointment') ||
    combined.includes('marked the appointment as completed')
  );
}

function isAppointmentNotification(notification) {
  const type = String(notification?.type || '').trim().toLowerCase();
  const status = String(notification?.status || '').trim().toLowerCase();
  const hasAppointmentId = String(notification?.appointmentId || '').trim().length > 0;

  if (type === 'appointment' || type === 'booking') return true;
  if (hasAppointmentId) return true;

  if (
    status.startsWith('reminder_') ||
    status === 'appointment_now' ||
    status === 'appointment_missed' ||
    status === 'accepted' ||
    status === 'rejected' ||
    status === 'cancelled' ||
    status === 'pending' ||
    status === 'completed' ||
    status === 'finalized'
  ) {
    return true;
  }

  return false;
}

function getAppointmentNotificationTitle(notification, language, fallbackTitle) {
  const status = String(notification?.status || '').trim().toLowerCase();
  const inferredStatus = inferStatusFromFallbackText(fallbackTitle || notification?.title, notification?.message);
  const effectiveStatus = status || inferredStatus;
  const pack = APPOINTMENT_TITLES[language] || APPOINTMENT_TITLES.en;

  if (effectiveStatus.startsWith('reminder_')) return pack.reminder;
  if (effectiveStatus === 'appointment_now') return pack.now;
  if (effectiveStatus === 'appointment_missed') return pack.missed;
  if (effectiveStatus === 'completed' || effectiveStatus === 'finalized') return pack.completed;
  if (['pending', 'accepted', 'rejected', 'cancelled'].includes(effectiveStatus)) return pack.update;

  return String(fallbackTitle || '').trim() || pack.fallback;
}

function getAppointmentNotificationBody(notification, language, senderName, fallbackMessage) {
  const status = String(notification?.status || '').trim().toLowerCase();
  const inferredStatus = inferStatusFromFallbackText(notification?.title, fallbackMessage || notification?.message);
  const effectiveStatus = status || inferredStatus;
  const pack = APPOINTMENT_MESSAGES[language] || APPOINTMENT_MESSAGES.en;
  const safeSenderName = String(senderName || 'User').trim() || 'User';

  if (effectiveStatus.startsWith('reminder_')) {
    const minutes = Number(effectiveStatus.match(/reminder_(\d+)m/)?.[1] || 0);
    return pack.reminder(formatReminderLabel(language, minutes));
  }

  if (effectiveStatus === 'appointment_now') return pack.now;
  if (effectiveStatus === 'appointment_missed') return pack.missed;
  if (effectiveStatus === 'accepted') return pack.accepted(safeSenderName);
  if (effectiveStatus === 'rejected') return pack.rejected(safeSenderName);
  if (effectiveStatus === 'cancelled') return pack.cancelled(safeSenderName);
  if (effectiveStatus === 'completed' || effectiveStatus === 'finalized') return pack.completed(safeSenderName);
  if (effectiveStatus === 'pending') return pack.pending(safeSenderName);

  return String(fallbackMessage || '').trim() || pack.default(safeSenderName);
}

export function getLocalizedNotificationCopy(
  notification,
  language,
  { senderName = '', fallbackTitle = '', fallbackMessage = '' } = {}
) {
  const resolvedLanguage = normalizeLanguage(language);

  const shouldLocalizeAsAppointment =
    isAppointmentNotification(notification) ||
    hasAppointmentClues(notification, fallbackTitle, fallbackMessage);

  if (!shouldLocalizeAsAppointment) {
    return {
      title: String(fallbackTitle || notification?.title || '').trim(),
      message: String(fallbackMessage || notification?.message || '').trim(),
    };
  }

  return {
    title: getAppointmentNotificationTitle(notification, resolvedLanguage, fallbackTitle || notification?.title),
    message: getAppointmentNotificationBody(
      notification,
      resolvedLanguage,
      senderName || notification?.senderId?.name,
      fallbackMessage || notification?.message
    ),
  };
}

export function getNotificationTagKey(notification) {
  const type = String(notification?.type || '').toLowerCase();
  const status = String(notification?.status || '').toLowerCase();

  if (type === 'message') return 'messages';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'bookings';
}

export function localizeNotificationContent(notification, language) {
  return getLocalizedNotificationCopy(notification, language, {
    senderName: notification?.senderId?.name || '',
    fallbackTitle: notification?.title || '',
    fallbackMessage: notification?.message || '',
  });
}

export function localizeNotificationTag(metaKey, t) {
  const normalized = String(metaKey || '').toLowerCase();

  if (normalized === 'message' || normalized === 'messages') {
    return t('messages', 'Messages');
  }

  if (normalized === 'accepted') {
    return t('accepted', 'Accepted');
  }

  if (normalized === 'rejected') {
    return t('rejected', 'Rejected');
  }

  return t('bookings', 'Bookings');
}
