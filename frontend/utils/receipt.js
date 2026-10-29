import { Image, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const GOON_LOGO = require('../assets/icon.png');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(minor, currency, locale) {
  const code = currency || 'USD';
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format((minor || 0) / (10 ** digits));
  } catch (_) {
    return `${((minor || 0) / 100).toFixed(2)} ${code}`;
  }
}

// Les logos sont int\u00e9gr\u00e9s en base64 pour qu'ils s'impriment partout, y compris hors ligne.
async function toDataUri(uri) {
  if (!uri) return '';
  try {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_) {
    return '';
  }
}

const LABELS = {
  fr: {
    invoice: 'Facture', number: 'N\u00b0', date: 'Date', customer: 'Client', order: 'Commande', table: 'Table', takeaway: '\u00c0 emporter', dineIn: 'Sur place',
    description: 'Article', quantity: 'Qt\u00e9', unitPrice: 'Prix unitaire', total: 'Total', subtotal: 'Sous-total', tip: 'Pourboire',
    payment: 'Paiement', paid: 'Pay\u00e9e', unpaid: '\u00c0 r\u00e9gler au restaurant', authorized: 'Autoris\u00e9e', paidAmount: 'D\u00e9j\u00e0 pay\u00e9', balance: 'Reste \u00e0 payer',
    thanks: 'Merci pour ta commande !', poweredBy: 'Facture \u00e9mise via l\u2019application GoOn', note: 'Note',
  },
  en: {
    invoice: 'Invoice', number: 'No.', date: 'Date', customer: 'Customer', order: 'Order', table: 'Table', takeaway: 'Take away', dineIn: 'Eat in',
    description: 'Item', quantity: 'Qty', unitPrice: 'Unit price', total: 'Total', subtotal: 'Subtotal', tip: 'Tip',
    payment: 'Payment', paid: 'Paid', unpaid: 'Pay at the restaurant', authorized: 'Authorized', paidAmount: 'Already paid', balance: 'Balance due',
    thanks: 'Thank you for your order!', poweredBy: 'Invoice issued through the GoOn app', note: 'Note',
  },
};

export async function buildReceiptHtml(receipt, language = 'en') {
  const isFrench = language === 'fr';
  const locale = isFrench ? 'fr-FR' : 'en-US';
  const t = LABELS[isFrench ? 'fr' : 'en'];
  const { company, order } = receipt;
  const [goonLogo, companyLogo] = await Promise.all([
    toDataUri(Image.resolveAssetSource(GOON_LOGO)?.uri),
    toDataUri(company?.logo),
  ]);
  const money = (minor) => escapeHtml(formatMoney(minor, order.currency, locale));
  const balance = Math.max(0, order.totalMinor - order.paidMinor);
  const paymentLabel = order.paymentStatus === 'paid' ? t.paid : order.paymentStatus === 'authorized' ? t.authorized : t.unpaid;

  const rows = order.lines.map((line) => `
    <tr>
      <td>${escapeHtml(line.productName)}${line.note ? `<div class="note">${escapeHtml(t.note)}: ${escapeHtml(line.note)}</div>` : ''}</td>
      <td class="num">${escapeHtml(line.quantity)}</td>
      <td class="num">${money(line.unitPriceMinor)}</td>
      <td class="num">${money(line.lineTotalMinor)}</td>
    </tr>`).join('');

  const companyContact = [company?.location, company?.phone, company?.email, company?.website].filter(Boolean).map(escapeHtml).join('<br/>');

  return `<!doctype html><html lang="${isFrench ? 'fr' : 'en'}"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(receipt.invoiceNumber)}</title>
    <style>
      *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17161d;margin:0;padding:36px;background:#fff}
      .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid #8b2fc9;padding-bottom:20px;margin-bottom:24px}
      .brand{display:flex;gap:14px;align-items:center}.logo{width:64px;height:64px;border-radius:14px;object-fit:cover;background:#f3eefb}
      .company{font-size:20px;font-weight:800}.contact{font-size:11px;color:#6f6a63;line-height:1.6;margin-top:4px}
      .goon{text-align:right}.goon .logo{width:48px;height:48px;border-radius:12px}.goon .tag{font-size:10px;font-weight:800;color:#8b2fc9;letter-spacing:1px;margin-top:6px}
      .title{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px}.title h1{margin:0;font-size:28px}.meta{text-align:right;font-size:12px;color:#6f6a63;line-height:1.6}
      .box{padding:14px 16px;background:#f7f5fb;border-radius:10px;margin-bottom:20px;font-size:13px;line-height:1.7}.label{font-size:10px;text-transform:uppercase;color:#6f6a63;font-weight:800}
      table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:#6f6a63;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e5dff0;padding:10px 6px}
      td{padding:12px 6px;border-bottom:1px solid #eee;vertical-align:top}.num{text-align:right;white-space:nowrap}.note{font-size:11px;color:#6f6a63;margin-top:3px}
      .totals{width:290px;margin:18px 0 0 auto}.row{display:flex;justify-content:space-between;padding:5px 0;color:#6f6a63;font-size:13px}
      .grand{border-top:1px solid #e5dff0;margin-top:6px;padding-top:12px;color:#17161d;font-size:18px;font-weight:800}
      .foot{margin-top:34px;padding-top:14px;border-top:1px solid #e5dff0;text-align:center;font-size:12px;color:#6f6a63}.foot strong{color:#8b2fc9}
    </style></head><body>
    <div class="top">
      <div class="brand">
        ${companyLogo ? `<img class="logo" src="${companyLogo}" alt="" />` : ''}
        <div><div class="company">${escapeHtml(company?.name)}</div><div class="contact">${companyContact}</div></div>
      </div>
      <div class="goon">${goonLogo ? `<img class="logo" src="${goonLogo}" alt="GoOn" />` : ''}<div class="tag">GOON</div></div>
    </div>
    <div class="title"><h1>${escapeHtml(t.invoice)}</h1>
      <div class="meta"><strong>${escapeHtml(t.number)} ${escapeHtml(receipt.invoiceNumber)}</strong><br/>${escapeHtml(t.date)}: ${escapeHtml(new Date(receipt.issuedAt).toLocaleDateString(locale))}</div></div>
    <div class="box">
      <div class="label">${escapeHtml(t.customer)}</div><div><strong>${escapeHtml(receipt.customerName)}</strong></div>
      <div>${escapeHtml(t.order)} ${escapeHtml(order.orderNumber)} \u00b7 ${escapeHtml(order.fulfillmentType === 'takeaway' ? t.takeaway : t.dineIn)}${order.tableNumber ? ` \u00b7 ${escapeHtml(t.table)} ${escapeHtml(order.tableNumber)}` : ''}</div>
    </div>
    <table><thead><tr><th>${escapeHtml(t.description)}</th><th class="num">${escapeHtml(t.quantity)}</th><th class="num">${escapeHtml(t.unitPrice)}</th><th class="num">${escapeHtml(t.total)}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="row"><span>${escapeHtml(t.subtotal)}</span><span>${money(order.subtotalMinor)}</span></div>
      ${order.tipMinor ? `<div class="row"><span>${escapeHtml(t.tip)}</span><span>${money(order.tipMinor)}</span></div>` : ''}
      <div class="row grand"><span>${escapeHtml(t.total)}</span><span>${money(order.totalMinor)}</span></div>
      <div class="row"><span>${escapeHtml(t.payment)}</span><span>${escapeHtml(paymentLabel)}</span></div>
      ${order.paidMinor ? `<div class="row"><span>${escapeHtml(t.paidAmount)}</span><span>${money(order.paidMinor)}</span></div>` : ''}
      ${balance ? `<div class="row"><span>${escapeHtml(t.balance)}</span><span>${money(balance)}</span></div>` : ''}
    </div>
    <div class="foot">${escapeHtml(t.thanks)}<br/><strong>${escapeHtml(t.poweredBy)}</strong></div>
    </body></html>`;
}

export async function shareReceipt(receipt, language) {
  const html = await buildReceiptHtml(receipt, language);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const file = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: receipt.invoiceNumber });
  }
}
