const MAX_ORDER_LINES = 100;
const MAX_LINE_QUANTITY = 1000000;
const MAX_UNIT_COST_MINOR = Number.MAX_SAFE_INTEGER;

function normalizeSupplierInput(input = {}, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations fournisseur sont invalides.');
  }
  const normalized = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || has('name')) {
    normalized.name = String(input.name || '').trim();
    if (!normalized.name || normalized.name.length > 120) throw new Error('Le nom fournisseur est obligatoire.');
  }
  if (!partial || has('email')) {
    normalized.email = String(input.email || '').trim().toLowerCase();
    if (normalized.email && (normalized.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email))) {
      throw new Error('L’adresse e-mail fournisseur est invalide.');
    }
  }
  if (!partial || has('phone')) {
    normalized.phone = String(input.phone || '').trim();
    if (normalized.phone.length > 40) throw new Error('Le numéro fournisseur est trop long.');
  }
  if (!partial || has('currency')) {
    normalized.currency = String(input.currency || 'XOF').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized.currency)) throw new Error('La devise doit être un code de trois lettres.');
  }
  if (has('address')) {
    normalized.address = String(input.address || '').trim();
    if (normalized.address.length > 300) throw new Error('L’adresse fournisseur est trop longue.');
  }
  if (has('notes')) {
    normalized.notes = String(input.notes || '').trim();
    if (normalized.notes.length > 1000) throw new Error('Les notes fournisseur dépassent 1000 caractères.');
  }
  if (has('status')) {
    normalized.status = String(input.status || '').trim().toLowerCase();
    if (!['active', 'archived'].includes(normalized.status)) throw new Error('Le statut fournisseur est invalide.');
  }
  return normalized;
}

function normalizePurchaseOrderInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('La commande fournisseur est invalide.');
  }

  const supplierId = String(input.supplierId || '').trim();
  const currency = String(input.currency || '').trim().toUpperCase();
  const notes = String(input.notes || '').trim();
  if (!supplierId) throw new Error('Un fournisseur est requis.');
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('La devise doit être un code de trois lettres.');
  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > MAX_ORDER_LINES) {
    throw new Error(`Une commande doit contenir entre 1 et ${MAX_ORDER_LINES} lignes.`);
  }
  if (notes.length > 1000) throw new Error('Les notes de commande dépassent 1000 caractères.');

  const productIds = new Set();
  let totalMinor = 0;
  const lines = input.lines.map((line) => {
    const productId = String(line?.productId || '').trim();
    const quantity = Number(line?.quantity);
    const unitCostMinor = Number(line?.unitCostMinor);
    if (!productId) throw new Error('Chaque ligne doit référencer un produit.');
    if (productIds.has(productId)) throw new Error('Un produit ne peut apparaître qu’une fois par commande.');
    productIds.add(productId);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new Error('La quantité commandée doit être un entier positif.');
    }
    if (!Number.isSafeInteger(unitCostMinor) || unitCostMinor < 0 || unitCostMinor > MAX_UNIT_COST_MINOR) {
      throw new Error('Le coût unitaire doit être un entier positif en unité monétaire mineure.');
    }
    const lineTotal = quantity * unitCostMinor;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(totalMinor + lineTotal)) {
      throw new Error('Le montant total de la commande est trop élevé.');
    }
    totalMinor += lineTotal;
    return { productId, quantity, unitCostMinor };
  });

  let expectedAt = null;
  if (input.expectedAt) {
    expectedAt = new Date(input.expectedAt);
    if (Number.isNaN(expectedAt.getTime())) throw new Error('La date prévue est invalide.');
  }

  return { supplierId, currency, notes, expectedAt, lines, totalMinor };
}

function normalizeReceiptLines(receiptLines, orderLines) {
  if (!Array.isArray(receiptLines) || !receiptLines.length) {
    throw new Error('Au moins une ligne réceptionnée est requise.');
  }
  const orderLineById = new Map(orderLines.map((line) => [String(line._id), line]));
  const receivedLineIds = new Set();

  return receiptLines.map((item) => {
    const lineId = String(item?.lineId || '').trim();
    const quantity = Number(item?.quantity);
    const orderLine = orderLineById.get(lineId);
    if (!orderLine) throw new Error('La ligne de commande est introuvable.');
    if (receivedLineIds.has(lineId)) throw new Error('Une ligne ne peut être réceptionnée qu’une fois par opération.');
    receivedLineIds.add(lineId);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new Error('La quantité réceptionnée doit être un entier positif.');
    }
    if (orderLine.receivedQuantity + quantity > orderLine.quantity) {
      throw new Error('La quantité réceptionnée dépasse la quantité commandée.');
    }
    return { lineId, productId: orderLine.productId, quantity };
  });
}

function getPurchaseOrderStatus(lines) {
  return lines.every((line) => line.receivedQuantity >= line.quantity)
    ? 'received'
    : lines.some((line) => line.receivedQuantity > 0)
      ? 'partially_received'
      : 'ordered';
}

module.exports = {
  MAX_LINE_QUANTITY,
  getPurchaseOrderStatus,
  normalizePurchaseOrderInput,
  normalizeReceiptLines,
  normalizeSupplierInput,
};