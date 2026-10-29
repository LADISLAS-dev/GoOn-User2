const STOCK_REASONS = new Set(['opening', 'restock', 'sale', 'return', 'damage', 'adjustment']);
const PRODUCT_STATUSES = new Set(['active', 'archived']);
const PRODUCT_BADGES = new Set(['', 'new', 'limited', 'offer']);
const PRODUCT_CATALOG_CATEGORY_IDS = new Set(['12', '13', '15', '25', '36']);
const DISH_TAGS = new Set(['spicy', 'fish', 'vegetarian', 'vegan', 'meat', 'sweet']);
const DISH_ALLERGENS = new Set(['gluten', 'dairy', 'nuts', 'eggs', 'shellfish', 'fish', 'soy', 'sesame']);

function normalizeChoiceList(value, allowed, label) {
  if (!Array.isArray(value)) throw new Error(`${label} doit être une liste.`);
  const list = [...new Set(value.map((entry) => String(entry || '').trim().toLowerCase()))];
  if (list.some((entry) => !allowed.has(entry))) throw new Error(`${label} contient une valeur invalide.`);
  return list;
}

function lineUnitPriceMinor(product, quantity) {
  let unit = Math.round(((product.priceMinor || 0) * (100 - (product.discountPercent || 0))) / 100);
  if (product.bulkMinQuantity > 0 && quantity >= product.bulkMinQuantity) {
    unit = Math.round((unit * (100 - (product.bulkDiscountPercent || 0))) / 100);
  }
  return unit;
}
const MAX_STOCK_MOVEMENT = 1000000;

function normalizeProductInput(input = {}, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations du produit sont invalides.');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'stockOnHand')) {
    throw new Error('Le stock doit être modifié via un mouvement d’inventaire.');
  }

  const normalized = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || has('name')) {
    normalized.name = String(input.name || '').trim();
    if (!normalized.name || normalized.name.length > 120) {
      throw new Error('Le nom est obligatoire et limité à 120 caractères.');
    }
  }

  if (!partial || has('sku')) {
    normalized.sku = String(input.sku || '').trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(normalized.sku)) {
      throw new Error('Le SKU doit contenir 1 à 64 caractères alphanumériques, tirets, points ou underscores.');
    }
  }

  if (!partial || has('priceMinor')) {
    const priceMinor = Number(input.priceMinor);
    if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
      throw new Error('Le prix doit être un entier positif en unité monétaire mineure.');
    }
    normalized.priceMinor = priceMinor;
  }

  if (!partial || has('currency')) {
    normalized.currency = String(input.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized.currency)) {
      throw new Error('La devise doit être un code de trois lettres.');
    }
  }

  if (has('description')) {
    normalized.description = String(input.description || '').trim();
    if (normalized.description.length > 2000) throw new Error('La description dépasse 2000 caractères.');
  }

  if (has('imageUrl')) {
    normalized.imageUrl = String(input.imageUrl || '').trim();
    if (normalized.imageUrl.length > 2048) throw new Error('L’image du produit dépasse la taille autorisée.');
    if (normalized.imageUrl && !/^https?:\/\//i.test(normalized.imageUrl) && !normalized.imageUrl.startsWith('/uploads/')) {
      throw new Error('L’URL de l’image du produit est invalide.');
    }
  }

  if (has('isAvailable')) {
    if (typeof input.isAvailable !== 'boolean') throw new Error('La disponibilité doit être vraie ou fausse.');
    normalized.isAvailable = input.isAvailable;
  }

  if (has('isFeatured')) {
    if (typeof input.isFeatured !== 'boolean') throw new Error('La mise en avant doit être vraie ou fausse.');
    normalized.isFeatured = input.isFeatured;
  }

  if (has('barcode')) {
    normalized.barcode = String(input.barcode || '').trim();
    if (normalized.barcode.length > 64) throw new Error('Le code-barres dépasse 64 caractères.');
  }

  if (has('category')) {
    normalized.category = String(input.category || '').trim();
    if (normalized.category.length > 80) throw new Error('La catégorie dépasse 80 caractères.');
  }

  if (has('reorderPoint')) {
    const reorderPoint = Number(input.reorderPoint);
    if (!Number.isSafeInteger(reorderPoint) || reorderPoint < 0 || reorderPoint > MAX_STOCK_MOVEMENT) {
      throw new Error('Le seuil de réapprovisionnement doit être un entier positif.');
    }
    normalized.reorderPoint = reorderPoint;
  }

  if (has('status')) {
    normalized.status = String(input.status || '').trim().toLowerCase();
    if (!PRODUCT_STATUSES.has(normalized.status)) throw new Error('Le statut produit est invalide.');
  }

  if (has('badge')) {
    normalized.badge = String(input.badge || '').trim().toLowerCase();
    if (!PRODUCT_BADGES.has(normalized.badge)) throw new Error('Le badge produit est invalide.');
  }

  [['discountPercent', 90], ['prepTimeMinutes', 600], ['calories', 10000], ['bulkMinQuantity', 100], ['bulkDiscountPercent', 90]].forEach(([key, max]) => {
    if (!has(key)) return;
    const value = Number(input[key] || 0);
    if (!Number.isSafeInteger(value) || value < 0 || value > max) {
      throw new Error(`Le champ ${key} doit être un entier entre 0 et ${max}.`);
    }
    normalized[key] = value;
  });

  if (has('tags')) normalized.tags = normalizeChoiceList(input.tags, DISH_TAGS, 'Les tags');
  if (has('allergens')) normalized.allergens = normalizeChoiceList(input.allergens, DISH_ALLERGENS, 'Les allergènes');

  return normalized;
}

function normalizeStockMovement(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Le mouvement de stock est invalide.');
  }

  const delta = Number(input.delta);
  const reason = String(input.reason || '').trim().toLowerCase();
  const note = String(input.note || '').trim();
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > MAX_STOCK_MOVEMENT) {
    throw new Error('La variation doit être un entier non nul inférieur ou égal à 1 000 000.');
  }
  if (!STOCK_REASONS.has(reason)) throw new Error('Le motif du mouvement est invalide.');
  if (note.length > 300) throw new Error('La note dépasse 300 caractères.');
  if (reason === 'sale' && delta >= 0) throw new Error('Une vente doit diminuer le stock.');
  if (['opening', 'restock', 'return'].includes(reason) && delta <= 0) {
    throw new Error('Ce motif doit augmenter le stock.');
  }
  if (reason === 'damage' && delta >= 0) throw new Error('Une perte doit diminuer le stock.');

  return { delta, reason, note };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProductFilter({ companyId, search, status }) {
  const filter = { companyId };
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (PRODUCT_STATUSES.has(normalizedStatus)) filter.status = normalizedStatus;

  const query = String(search || '').trim().slice(0, 100);
  if (query) {
    const escaped = new RegExp(escapeRegex(query), 'i');
    filter.$or = [{ name: escaped }, { sku: escaped }, { barcode: escaped }];
  }
  return filter;
}

function canDisplayPublicRestaurantMenu(company) {
  if (!company) return false;
  const categoryIds = [
    ...(Array.isArray(company.categoryIds) ? company.categoryIds : []),
    company.categoryId,
    company.businessTypeId,
  ].map((id) => String(id || '').trim());
  const isRestaurant = categoryIds.includes('2');
  const isPublic = company.setupStatus === 'ready' || Boolean(company.profileValidatedAt);
  return isRestaurant && isPublic;
}

function isProductCatalogCategory(company) {
  if (!company) return false;
  const categoryIds = [
    ...(Array.isArray(company.categoryIds) ? company.categoryIds : []),
    company.categoryId,
    company.businessTypeId,
  ].map((id) => String(id || '').trim());
  return !categoryIds.includes('2') && categoryIds.some((id) => PRODUCT_CATALOG_CATEGORY_IDS.has(id));
}

function canDisplayPublicRetailCatalog(company) {
  if (!isProductCatalogCategory(company)) return false;
  const isPublic = company.setupStatus === 'ready' || Boolean(company.profileValidatedAt);
  return isPublic;
}

module.exports = {
  MAX_STOCK_MOVEMENT,
  buildProductFilter,
  canDisplayPublicRetailCatalog,
  canDisplayPublicRestaurantMenu,
  isProductCatalogCategory,
  lineUnitPriceMinor,
  normalizeProductInput,
  normalizeStockMovement,
};