const MAX_DELIVERY_ZONES = 20;

function normalizeDeliveryZones(input = []) {
  if (!Array.isArray(input) || input.length > MAX_DELIVERY_ZONES) {
    throw new Error(`Configure entre 0 et ${MAX_DELIVERY_ZONES} zones de livraison.`);
  }

  let previousDistance = 0;
  return input.map((entry) => {
    const maxDistanceKm = Number(entry?.maxDistanceKm);
    const feeMinor = Number(entry?.feeMinor);
    const currency = String(entry?.currency || '').trim().toUpperCase();
    if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= previousDistance || maxDistanceKm > 500) {
      throw new Error('Les distances maximales des zones doivent être positives et croissantes.');
    }
    if (!Number.isSafeInteger(feeMinor) || feeMinor < 0) {
      throw new Error('Les frais de chaque zone doivent être un montant valide.');
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error('La devise de chaque zone doit être un code de trois lettres.');
    }
    previousDistance = maxDistanceKm;
    return { maxDistanceKm, feeMinor, currency };
  });
}

function distanceBetweenCoordinatesKm(from, to) {
  const latitude1 = Number(from?.latitude);
  const longitude1 = Number(from?.longitude);
  const latitude2 = Number(to?.latitude);
  const longitude2 = Number(to?.longitude);
  if (![latitude1, longitude1, latitude2, longitude2].every(Number.isFinite)
    || Math.abs(latitude1) > 90 || Math.abs(latitude2) > 90
    || Math.abs(longitude1) > 180 || Math.abs(longitude2) > 180) {
    throw new Error('Les coordonnées de livraison sont invalides.');
  }

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function findDeliveryZone(zones, distanceKm) {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < 0) return null;
  return (Array.isArray(zones) ? zones : []).find((zone) => distance <= Number(zone.maxDistanceKm)) || null;
}

module.exports = {
  distanceBetweenCoordinatesKm,
  findDeliveryZone,
  normalizeDeliveryZones,
};