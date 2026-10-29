const BusinessType = require('../models/BusinessType');

const APPOINTMENT_TYPE_KEYS = new Set(['1', '2', '3', '4', '5', '8', '9', '11', '16', '17', '18', '23', '26', '28', '29', '30', '31', '32', '33', '34', '35', '37', '38', '39', '40']);
const INVENTORY_TYPE_KEYS = new Set(['2', '3', '12', '13', '15', '19', '25', '26', '27', '32', '33', '36']);
const INVOICE_TYPE_KEYS = new Set(['2', '3', '4', '7', '9', '11', '12', '13', '15', '16', '25', '27', '29', '30', '32', '33', '34', '35', '36']);
const SALES_ORDER_TYPE_KEYS = new Set(['2', '12', '13', '15', '25', '27', '36']);
const BUSINESS_TYPE_CATALOG_VERSION = 7;

function normalizeBusinessTypeKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(key)) {
    throw new Error('La clé du domaine doit contenir 1 à 48 caractères alphanumériques.');
  }
  return key;
}

function normalizeBusinessTypePayload(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations du domaine sont invalides.');
  }

  const labels = input.labels;
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    throw new Error('Les libellés anglais et français sont obligatoires.');
  }

  const normalizedLabels = {
    en: String(labels.en || '').trim().slice(0, 100),
    fr: String(labels.fr || '').trim().slice(0, 100),
  };
  if (!normalizedLabels.en || !normalizedLabels.fr) {
    throw new Error('Les libellés anglais et français sont obligatoires.');
  }

  const icon = String(input.icon || '').trim();
  if (!icon || Array.from(icon).length > 12) {
    throw new Error('Une icône de 1 à 12 caractères est requise.');
  }

  if (!Array.isArray(input.moduleKeys)) {
    throw new Error('Les modules par défaut doivent être une liste.');
  }

  const moduleKeys = [...new Set(
    input.moduleKeys.map((key) => String(key || '').trim()).filter(Boolean)
  )];
  if (moduleKeys.length > 50) {
    throw new Error('Un domaine ne peut pas activer plus de 50 modules.');
  }

  const sortOrder = Number(input.sortOrder ?? 100);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    throw new Error('L’ordre de tri doit être un entier entre 0 et 10000.');
  }

  if (input.active !== undefined && typeof input.active !== 'boolean') {
    throw new Error('Le statut active doit être un booléen.');
  }

  return {
    labels: normalizedLabels,
    icon,
    moduleKeys,
    active: input.active === undefined ? true : input.active,
    sortOrder,
  };
}

const BUSINESS_TYPES = [
  ['1', 'Technology & IT', 'Technologie et IT', '💻'],
  ['2', 'Food & Restaurant', 'Restauration', '🍽️'],
  ['3', 'Beauty & Fashion', 'Beauté et Mode', '💄'],
  ['4', 'Health & Medical', 'Santé et Médical', '🏥'],
  ['5', 'Education', 'Éducation', '📚'],
  ['6', 'Finance & Banking', 'Finance et Banque', '💰'],
  ['7', 'Real Estate', 'Immobilier', '🏠'],
  ['8', 'Transport & Logistics', 'Transport et Logistique', '🚗'],
  ['9', 'Hospitality & Hotels', 'Hôtellerie', '🏨'],
  ['10', 'Arts & Entertainment', 'Arts et Divertissement', '🎭'],
  ['11', 'Sports & Fitness', 'Sport et Fitness', '⚽'],
  ['12', 'Manufacturing', 'Industrie', '🏭'],
  ['13', 'Agriculture', 'Agriculture', '🌾'],
  ['14', 'Construction', 'Construction', '🔨'],
  ['15', 'Retail & Shopping', 'Commerce et Shopping', '🛍️'],
  ['16', 'Legal Services', 'Services Juridiques', '⚖️'],
  ['17', 'Consulting', 'Conseil', '💼'],
  ['18', 'Marketing & Advertising', 'Marketing et Publicité', '📢'],
  ['19', 'Logistics & Warehouse', 'Logistique et Entrepôt', '📦'],
  ['20', 'Energy & Utilities', 'Énergie et Services publics', '⚡'],
  ['21', 'Telecommunications', 'Télécommunications', '📡'],
  ['22', 'Media & Publishing', 'Médias et Édition', '📰'],
  ['23', 'Human Resources', 'Ressources Humaines', '👥'],
  ['24', 'Environmental Services', 'Services Environnementaux', '♻️'],
  ['25', 'Arts & Crafts', 'Arts et Artisanat', '🎨'],
  ['26', 'Pet Services', 'Services pour Animaux', '🐾'],
  ['27', 'Automotive', 'Automobile', '🚙'],
  ['28', 'Photography', 'Photographie', '📷'],
  ['29', 'Tourism & Travel', 'Tourisme et Voyage', '✈️'],
  ['30', 'Event Management', 'Événementiel', '🎉'],
  ['31', 'Security Services', 'Services de Sécurité', '🛡️'],
  ['32', 'Plumbing & HVAC', 'Plomberie et CVC', '🔧'],
  ['33', 'Electrical Services', 'Services Électriques', '⚙️'],
  ['34', 'Cleaning Services', 'Services de Nettoyage', '🧹'],
  ['35', 'Landscaping', 'Aménagement Paysager', '🌿'],
  ['36', 'Printing & Design', 'Impression et Design', '🖨️'],
  ['37', 'Software Development', 'Développement Logiciel', '💾'],
  ['38', 'Graphic Design', 'Design Graphique', '🎯'],
  ['39', 'Web Development', 'Développement Web', '🌐'],
  ['40', 'Content Creation', 'Création de Contenu', '📝'],
].map(([key, en, fr, icon], index) => ({
  key,
  labels: { en, fr },
  icon,
  moduleKeys: [
    ...(APPOINTMENT_TYPE_KEYS.has(key) ? ['appointments'] : []),
    ...(INVENTORY_TYPE_KEYS.has(key) ? ['inventory'] : []),
    ...(INVOICE_TYPE_KEYS.has(key) ? ['invoices'] : []),
    ...(SALES_ORDER_TYPE_KEYS.has(key) ? ['sales_orders'] : []),
  ],
  catalogVersion: BUSINESS_TYPE_CATALOG_VERSION,
  active: true,
  sortOrder: index + 1,
}));

function normalizeBusinessTypeKeys(keys = []) {
  const values = Array.isArray(keys) ? keys : [keys];
  return [...new Set(values.map((key) => String(key || '').trim()).filter(Boolean))];
}

function collectBusinessTypeModuleKeys(types = []) {
  return [...new Set(types.flatMap((type) => type?.moduleKeys || []))];
}

async function syncBusinessTypeCatalog() {
  await BusinessType.bulkWrite(
    BUSINESS_TYPES.map((type) => {
      const { active, moduleKeys, catalogVersion, ...managedFields } = type;
      return {
        updateOne: {
          filter: { key: type.key },
          update: {
            $set: managedFields,
            $setOnInsert: { active, moduleKeys, catalogVersion },
          },
          upsert: true,
        },
      };
    })
  );

  await BusinessType.bulkWrite(
    BUSINESS_TYPES.map((type) => ({
      updateOne: {
        filter: {
          key: type.key,
          $or: [
            { catalogVersion: { $lt: BUSINESS_TYPE_CATALOG_VERSION } },
            { catalogVersion: { $exists: false } },
          ],
        },
        update: {
          $set: {
            catalogVersion: BUSINESS_TYPE_CATALOG_VERSION,
            moduleKeys: type.moduleKeys,
          },
        },
      },
    }))
  );
}

async function getActiveBusinessTypes() {
  const types = await BusinessType.find({ active: true }).sort({ sortOrder: 1 }).lean();
  return types.length ? types : BUSINESS_TYPES;
}

async function getBusinessTypeModuleKeys(typeKeys) {
  const keys = normalizeBusinessTypeKeys(typeKeys);
  if (!keys.length) return null;

  const types = await BusinessType.find({ key: { $in: keys }, active: true })
    .select('moduleKeys')
    .lean();
  if (!types.length) return null;

  return collectBusinessTypeModuleKeys(types);
}

module.exports = {
  BUSINESS_TYPE_CATALOG_VERSION,
  BUSINESS_TYPES,
  collectBusinessTypeModuleKeys,
  getActiveBusinessTypes,
  getBusinessTypeModuleKeys,
  normalizeBusinessTypeKey,
  normalizeBusinessTypePayload,
  normalizeBusinessTypeKeys,
  syncBusinessTypeCatalog,
};