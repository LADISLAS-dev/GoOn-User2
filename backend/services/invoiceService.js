const PAYMENT_METHODS = new Set(['cash', 'bank_transfer', 'card_manual', 'mobile_money_manual', 'other']);
const MAX_INVOICE_LINES = 100;

function normalizeInvoiceInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations de facture sont invalides.');
  }
  const currency = String(input.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('La devise doit être un code de trois lettres.');
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > MAX_INVOICE_LINES) {
    throw new Error(`Une facture doit contenir entre 1 et ${MAX_INVOICE_LINES} lignes.`);
  }

  const lines = input.lines.map((line) => {
    const description = String(line?.description || '').trim();
    const quantity = Number(line?.quantity);
    const unitPriceMinor = Number(line?.unitPriceMinor);
    const taxRateBps = Number(line?.taxRateBps ?? 0);
    if (!description || description.length > 180) throw new Error('Chaque ligne doit avoir une description valide.');
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) {
      throw new Error('La quantité doit être un entier positif.');
    }
    if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
      throw new Error('Le prix unitaire doit être un entier positif en unité monétaire mineure.');
    }
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
      throw new Error('Le taux de taxe doit être un entier de 0 à 10000 points de base.');
    }

    const lineSubtotalMinor = quantity * unitPriceMinor;
    const lineTaxMinor = Math.round((lineSubtotalMinor * taxRateBps) / 10000);
    const lineTotalMinor = lineSubtotalMinor + lineTaxMinor;
    if (![lineSubtotalMinor, lineTaxMinor, lineTotalMinor].every(Number.isSafeInteger)) {
      throw new Error('Le montant de cette ligne est trop élevé.');
    }

    return {
      productId: line.productId || null,
      description,
      quantity,
      unitPriceMinor,
      taxRateBps,
      lineSubtotalMinor,
      lineTaxMinor,
      lineTotalMinor,
    };
  });

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineSubtotalMinor, 0);
  const taxMinor = lines.reduce((sum, line) => sum + line.lineTaxMinor, 0);
  const totalMinor = subtotalMinor + taxMinor;
  if (![subtotalMinor, taxMinor, totalMinor].every(Number.isSafeInteger)) {
    throw new Error('Le total de facture est trop élevé.');
  }

  const notes = String(input.notes || '').trim();
  if (notes.length > 1500) throw new Error('Les notes dépassent 1500 caractères.');

  let dueAt = null;
  if (input.dueAt) {
    dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw new Error('La date d’échéance est invalide.');
  }

  return { currency, lines, subtotalMinor, taxMinor, totalMinor, notes, dueAt };
}

function buildInvoiceInputFromSalesOrder(order = {}) {
  if (!['confirmed', 'fulfilled'].includes(order.status)) {
    throw Object.assign(new Error('Seules les commandes confirmées ou livrées peuvent être facturées.'), { status: 409 });
  }
  const customer = {
    name: String(order.customer?.name || '').trim(),
    email: String(order.customer?.email || '').trim().toLowerCase(),
    phone: String(order.customer?.phone || '').trim(),
    address: '',
  };
  if (!customer.name) throw new Error('Un nom de client est requis pour créer la facture.');

  const orderReference = `Commande ${String(order.orderNumber || '').trim()}`;
  const tableReference = order.tableNumber ? `Table ${String(order.tableNumber).trim()}` : '';
  const notes = [String(order.notes || '').trim(), orderReference, tableReference].filter(Boolean).join('\n').slice(0, 1500);
  const lines = (order.lines || []).map((line) => ({
    productId: line.productId,
    description: line.productName,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    taxRateBps: 0,
  }));
  if (Number(order.tipMinor) > 0) {
    lines.push({ description: 'Pourboire / Tip', quantity: 1, unitPriceMinor: order.tipMinor, taxRateBps: 0 });
  }
  if (order.channel === 'retail_app' && Number(order.deliveryFeeMinor) > 0) {
    lines.push({ description: 'Delivery', quantity: 1, unitPriceMinor: Number(order.deliveryFeeMinor), taxRateBps: 0 });
  }
  const invoice = normalizeInvoiceInput({
    currency: order.currency,
    notes,
    lines,
  });
  return { ...invoice, customer };
}

function normalizeManualPayment(input = {}, expectedCurrency) {
  const amountMinor = Number(input.amountMinor);
  const method = String(input.method || '').trim().toLowerCase();
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  const currency = String(input.currency || expectedCurrency || '').trim().toUpperCase();
  const reference = String(input.reference || '').trim();

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Le montant du règlement doit être un entier positif.');
  }
  if (!PAYMENT_METHODS.has(method)) throw new Error('Le moyen de règlement manuel est invalide.');
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) throw new Error('Une clé idempotente valide est requise.');
  if (currency !== expectedCurrency) throw new Error('La devise du règlement doit correspondre à la facture.');
  if (reference.length > 100) throw new Error('La référence de paiement dépasse 100 caractères.');

  return { amountMinor, method, idempotencyKey, currency, reference };
}

function getInvoiceStatus(totalMinor, paidMinor, currentStatus = 'issued') {
  if (currentStatus === 'void') return 'void';
  if (paidMinor <= 0) return 'issued';
  return paidMinor >= totalMinor ? 'paid' : 'partially_paid';
}

module.exports = {
  buildInvoiceInputFromSalesOrder,
  getInvoiceStatus,
  normalizeInvoiceInput,
  normalizeManualPayment,
};