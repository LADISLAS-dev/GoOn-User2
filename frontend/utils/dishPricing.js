// Doit rester identique à lineUnitPriceMinor côté backend (productService).
export function unitPrice(item, quantity = 1) {
  let price = Math.round(((item?.priceMinor || 0) * (100 - (item?.discountPercent || 0))) / 100);
  if (item?.bulkMinQuantity > 0 && quantity >= item.bulkMinQuantity) {
    price = Math.round((price * (100 - (item.bulkDiscountPercent || 0))) / 100);
  }
  return price;
}

export function dishBadges(item, labels) {
  const list = [];
  if (item?.badge === 'new') list.push(labels.new);
  if (item?.badge === 'limited') list.push(labels.limited);
  if (item?.badge === 'offer' || item?.discountPercent > 0) list.push(`-${item.discountPercent || 0}%`);
  if (item?.bulkMinQuantity > 0 && item?.bulkDiscountPercent > 0) list.push(`-${item.bulkDiscountPercent}% x${item.bulkMinQuantity}`);
  return list;
}
