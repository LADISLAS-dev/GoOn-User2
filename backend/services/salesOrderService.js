const MAX_ORDER_LINES = 100;
const MAX_ORDER_QUANTITY = 1000000;
const RESTAURANT_TIP_RATES_BPS = new Set([0, 500, 1000, 1500]);

function normalizeSalesOrderInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations de commande sont invalides.');
  }
  const currency = String(input.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('La devise doit être un code de trois lettres.');
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > MAX_ORDER_LINES) {
    throw new Error(`Une commande doit contenir entre 1 et ${MAX_ORDER_LINES} lignes.`);
  }

  const productIds = new Set();
  let totalMinor = 0;
  const lines = input.lines.map((line) => {
    const productId = String(line?.productId || '').trim();
    const quantity = Number(line?.quantity);
    if (!productId) throw new Error('Chaque ligne doit référencer un produit.');
    if (productIds.has(productId)) throw new Error('Un produit ne peut apparaître qu’une fois dans une commande.');
    productIds.add(productId);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
      throw new Error('La quantité doit être un entier positif.');
    }
    return { productId, quantity, note: String(line?.note || '').trim().slice(0, 200) };
  });

  const customerId = String(input.customerId || '').trim();
  if (customerId && !/^[a-f\d]{24}$/i.test(customerId)) {
    throw new Error('Identifiant client invalide.');
  }
  const customer = {
    name: String(input.customer?.name || '').trim().slice(0, 120),
    email: String(input.customer?.email || '').trim().toLowerCase().slice(0, 254),
    phone: String(input.customer?.phone || '').trim().slice(0, 40),
  };
  if (!customerId && customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new Error('L’adresse e-mail client est invalide.');
  }

  const notes = String(input.notes || '').trim();
  if (notes.length > 1000) throw new Error('Les notes dépassent 1000 caractères.');

  return { currency, customerId: customerId || null, customer, lines, notes, totalMinor };
}

function normalizeRestaurantCheckoutInput(input = {}) {
  const order = normalizeSalesOrderInput(input);
  const isTakeaway = String(input.fulfillmentType || '') === 'takeaway';
  if (!order.customer.name && !order.customer.phone && (isTakeaway || !String(input.tableNumber || '').trim())) {
    throw new Error(isTakeaway ? 'Indique un nom ou un téléphone.' : 'Indique un nom, un téléphone ou un numéro de table.');
  }
  const tableNumber = String(input.tableNumber || '').trim();
  if (tableNumber.length > 24) throw new Error('Le numéro de table est trop long.');
  const fulfillmentType = String(input.fulfillmentType || 'dine_in').trim();
  if (!['dine_in', 'takeaway'].includes(fulfillmentType)) {
    throw new Error('Le mode de retrait est invalide.');
  }

  const tipRateBps = Number(input.tipRateBps ?? 0);
  if (!RESTAURANT_TIP_RATES_BPS.has(tipRateBps)) {
    throw new Error('Le pourboire sélectionné est invalide.');
  }
  const paymentMethod = String(input.paymentMethod || 'pay_at_venue').trim();
  if (!['pay_at_venue', 'stripe', 'paypal'].includes(paymentMethod)) {
    throw new Error('Le mode de paiement sélectionné est invalide.');
  }
  if (paymentMethod !== 'pay_at_venue' && order.currency !== 'USD') {
    throw new Error('Le paiement en ligne est disponible en USD uniquement.');
  }
  return { ...order, tableNumber, fulfillmentType, tipRateBps, paymentMethod };
}

function normalizeRetailCheckoutInput(input = {}) {
  const order = normalizeSalesOrderInput(input);
  if (order.currency !== 'USD') {
    throw new Error('Le paiement Retail en ligne est disponible en USD uniquement.');
  }
  const fulfillmentType = String(input.fulfillmentType || '').trim();
  const paymentMethod = String(input.paymentMethod || '').trim();
  if (!['pickup', 'delivery'].includes(fulfillmentType)) {
    throw new Error('Le mode de réception est invalide.');
  }
  if (!['stripe', 'paypal'].includes(paymentMethod)) {
    throw new Error('Le paiement en ligne est obligatoire pour une commande Retail.');
  }
  if (!order.customer.name) throw new Error('Le nom du client est obligatoire.');

  let deliveryAddress = '';
  let deliveryLatitude = null;
  let deliveryLongitude = null;
  if (fulfillmentType === 'delivery') {
    deliveryAddress = String(input.deliveryAddress || '').trim();
    if (input.deliveryLatitude === null || input.deliveryLatitude === undefined || String(input.deliveryLatitude).trim() === ''
      || input.deliveryLongitude === null || input.deliveryLongitude === undefined || String(input.deliveryLongitude).trim() === '') {
      throw new Error('La position de livraison est invalide.');
    }
    deliveryLatitude = Number(input.deliveryLatitude);
    deliveryLongitude = Number(input.deliveryLongitude);
    if (deliveryAddress.length < 5 || deliveryAddress.length > 500) {
      throw new Error('Une adresse de livraison valide est obligatoire.');
    }
    if (!Number.isFinite(deliveryLatitude) || deliveryLatitude < -90 || deliveryLatitude > 90
      || !Number.isFinite(deliveryLongitude) || deliveryLongitude < -180 || deliveryLongitude > 180) {
      throw new Error('La position de livraison est invalide.');
    }
  }

  return {
    ...order,
    fulfillmentType,
    paymentMethod,
    deliveryAddress,
    deliveryLatitude,
    deliveryLongitude,
  };
}

function calculateRestaurantOrderTotals(subtotalMinor, tipRateBps) {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0 || !RESTAURANT_TIP_RATES_BPS.has(tipRateBps)) {
    throw new Error('Le total de la commande est invalide.');
  }
  const tipMinor = Math.round((subtotalMinor * tipRateBps) / 10000);
  const totalMinor = subtotalMinor + tipMinor;
  if (!Number.isSafeInteger(tipMinor) || !Number.isSafeInteger(totalMinor)) {
    throw new Error('Le total de la commande est trop élevé.');
  }
  return { tipMinor, totalMinor };
}

function getSalesOrderPaymentStatus(totalMinor, paidMinor, isAuthorized = false) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || !Number.isSafeInteger(paidMinor) || paidMinor < 0 || paidMinor > totalMinor) {
    throw new Error('Le solde de paiement de la commande est invalide.');
  }
  if (totalMinor === 0 || paidMinor === totalMinor) return 'paid';
  if (paidMinor === 0 && isAuthorized) return 'authorized';
  return paidMinor === 0 ? 'unpaid' : 'partially_paid';
}

function canTransitionSalesOrder(status, action) {
  if (action === 'confirm') return status === 'draft';
  if (action === 'ready') return status === 'confirmed';
  if (action === 'fulfill') return status === 'confirmed' || status === 'ready';
  if (action === 'cancel') return status === 'draft' || status === 'confirmed' || status === 'ready';
  return false;
}

module.exports = {
  MAX_ORDER_LINES,
  MAX_ORDER_QUANTITY,
  calculateRestaurantOrderTotals,
  canTransitionSalesOrder,
  getSalesOrderPaymentStatus,
  normalizeRetailCheckoutInput,
  normalizeRestaurantCheckoutInput,
  normalizeSalesOrderInput,
};