const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProductFilter,
  canDisplayPublicRetailCatalog,
  canDisplayPublicRestaurantMenu,
  normalizeProductInput,
  normalizeStockMovement,
} = require('../services/productService');

test('public menus are limited to validated restaurant companies', () => {
  assert.equal(canDisplayPublicRestaurantMenu({ categoryId: '2', setupStatus: 'ready' }), true);
  assert.equal(canDisplayPublicRestaurantMenu({ categoryIds: ['1', '2'], profileValidatedAt: new Date() }), true);
  assert.equal(canDisplayPublicRestaurantMenu({ categoryId: '2', setupStatus: 'draft' }), false);
  assert.equal(canDisplayPublicRestaurantMenu({ categoryId: '15', setupStatus: 'ready' }), false);
  assert.equal(canDisplayPublicRestaurantMenu(null), false);
});

test('public product catalogs are limited to validated product-sale categories and exclude restaurants', () => {
  for (const categoryId of ['12', '13', '15', '25', '36']) {
    assert.equal(canDisplayPublicRetailCatalog({ categoryId, setupStatus: 'ready' }), true);
  }
  assert.equal(canDisplayPublicRetailCatalog({ categoryIds: ['2', '15'], profileValidatedAt: new Date() }), false);
  assert.equal(canDisplayPublicRetailCatalog({ categoryId: '15', setupStatus: 'draft' }), false);
  assert.equal(canDisplayPublicRetailCatalog({ categoryId: '2', setupStatus: 'ready' }), false);
  assert.equal(canDisplayPublicRetailCatalog(null), false);
});

test('product input normalizes sku and currency while keeping money in minor units', () => {
  const product = normalizeProductInput({
    name: '  Huile moteur 5W30 ',
    sku: ' oil-5w30 ',
    priceMinor: 125000,
    currency: 'xof',
    reorderPoint: 4,
  });

  assert.equal(product.name, 'Huile moteur 5W30');
  assert.equal(product.sku, 'OIL-5W30');
  assert.equal(product.priceMinor, 125000);
  assert.equal(product.currency, 'XOF');
});

test('menu products validate image urls and explicit availability', () => {
  const product = normalizeProductInput({
    name: 'Plat du jour',
    sku: 'MENU-PLAT-1',
    priceMinor: 2500,
    currency: 'XOF',
    imageUrl: 'https://cdn.example.com/menu.jpg',
    isAvailable: false,
  });
  assert.equal(product.isAvailable, false);
  assert.equal(product.imageUrl, 'https://cdn.example.com/menu.jpg');
  assert.throws(() => normalizeProductInput({ imageUrl: 'javascript:alert(1)' }, { partial: true }));
  assert.throws(() => normalizeProductInput({ isAvailable: 'false' }, { partial: true }));
});

test('product input rejects fractional prices and direct stock changes', () => {
  assert.throws(() => normalizeProductInput({ name: 'Item', sku: 'ITEM', priceMinor: 10.5, currency: 'USD' }));
  assert.throws(() => normalizeProductInput({ name: 'Item', sku: 'ITEM', priceMinor: 100, currency: 'USD', stockOnHand: 5 }));
});

test('stock movement reasons enforce signed integer deltas', () => {
  assert.deepEqual(normalizeStockMovement({ delta: -2, reason: 'sale', note: 'Order #4' }), {
    delta: -2,
    reason: 'sale',
    note: 'Order #4',
  });
  assert.throws(() => normalizeStockMovement({ delta: 2, reason: 'sale' }));
  assert.throws(() => normalizeStockMovement({ delta: -1, reason: 'restock' }));
  assert.throws(() => normalizeStockMovement({ delta: 0, reason: 'adjustment' }));
});

test('product search is scoped by company and treats regex characters literally', () => {
  const filter = buildProductFilter({ companyId: 'company-id', search: 'oil.*[5' });

  assert.equal(filter.companyId, 'company-id');
  assert.equal(filter.$or[0].name.test('oil.*[5'), true);
  assert.equal(filter.$or[0].name.test('oil-abc5'), false);
});
test('dish presentation fields are validated', () => {
  const dish = normalizeProductInput({ badge: 'new', discountPercent: 20, prepTimeMinutes: 35, calories: 403 }, { partial: true });
  assert.deepEqual(dish, { badge: 'new', discountPercent: 20, prepTimeMinutes: 35, calories: 403 });
  assert.throws(() => normalizeProductInput({ badge: 'hot' }, { partial: true }));
  assert.throws(() => normalizeProductInput({ discountPercent: 95 }, { partial: true }));
});

test('dish tags, allergens and bulk pricing', () => {
  const { lineUnitPriceMinor } = require('../services/productService');
  assert.deepEqual(normalizeProductInput({ tags: ['spicy', 'spicy'], allergens: ['nuts'] }, { partial: true }), { tags: ['spicy'], allergens: ['nuts'] });
  assert.throws(() => normalizeProductInput({ allergens: ['lead'] }, { partial: true }));
  const dish = { priceMinor: 1000, discountPercent: 0, bulkMinQuantity: 5, bulkDiscountPercent: 5 };
  assert.equal(lineUnitPriceMinor(dish, 4), 1000);
  assert.equal(lineUnitPriceMinor(dish, 5), 950);
});

test('featured flag must be a boolean', () => {
  assert.deepEqual(normalizeProductInput({ isFeatured: true }, { partial: true }), { isFeatured: true });
  assert.throws(() => normalizeProductInput({ isFeatured: 'yes' }, { partial: true }));
});
