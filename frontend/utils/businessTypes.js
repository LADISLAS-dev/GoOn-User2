import { getCategoryLabel } from './categoryLabels';

const SERVICE_REQUEST_CATEGORY_IDS = new Set([
  '5', '16', '17', '18', '23', '26', '28', '31', '32', '33', '34', '35', '37', '38', '39', '40',
]);

const IN_PERSON_SERVICE_CATEGORY_IDS = new Set(['26', '28', '31', '32', '33', '34', '35']);
const PRODUCT_CATALOG_CATEGORY_IDS = new Set(['12', '13', '15', '25', '36']);

export function getProductCatalogCategoryId(categoryIds = []) {
  const ids = (Array.isArray(categoryIds) ? categoryIds : []).map((id) => String(id || '').trim());
  if (ids.includes('2')) return '';
  return ids.find((id) => PRODUCT_CATALOG_CATEGORY_IDS.has(id)) || '';
}

export function getServiceRequestCategoryId(categoryIds = []) {
  return (Array.isArray(categoryIds) ? categoryIds : [])
    .map((id) => String(id || '').trim())
    .find((id) => SERVICE_REQUEST_CATEGORY_IDS.has(id)) || '';
}

export function isInPersonServiceCategory(categoryId) {
  return IN_PERSON_SERVICE_CATEGORY_IDS.has(String(categoryId || '').trim());
}

const MODULE_LABELS = {
  company: { en: 'Company workspace', fr: 'Espace entreprise' },
  business_info: { en: 'Company profile', fr: 'Fiche entreprise' },
  messages: { en: 'Messages', fr: 'Messagerie' },
  team: { en: 'Team', fr: 'Équipe' },
  audit_logs: { en: 'Activity history', fr: 'Journal d’activité' },
  appointments: { en: 'Appointments', fr: 'Rendez-vous' },
  analytics: { en: 'Analytics', fr: 'Statistiques' },
  customers: { en: 'Customer management', fr: 'Gestion clients' },
  inventory: { en: 'Products & stock', fr: 'Produits et stock' },
  invoices: { en: 'Invoices', fr: 'Factures' },
  procurement: { en: 'Suppliers & purchasing', fr: 'Fournisseurs et achats' },
  sales_orders: { en: 'Sales orders', fr: 'Commandes de vente' },
};

export function getBusinessModuleLabel(key, language = 'en') {
  return MODULE_LABELS[key]?.[language] || MODULE_LABELS[key]?.en || key;
}

export function getBusinessModulePreviewKeys(businessTypes, selectedIds) {
  const selectedModuleKeys = (businessTypes || [])
    .filter((type) => selectedIds.includes(type.id))
    .flatMap((type) => type.moduleKeys || []);
  return [...new Set([
    'company', 'business_info', 'messages', 'team', 'audit_logs',
    ...selectedModuleKeys,
  ])];
}

export function mergeBusinessTypes(types, fallbackCategories, language) {
  if (!Array.isArray(types) || types.length === 0) return fallbackCategories;

  return types.map((type) => {
    const id = String(type?.key || '').trim();
    const fallback = fallbackCategories.find((category) => String(category.id) === id) || {};
    const localLabel = getCategoryLabel(id, language);

    return {
      ...fallback,
      id,
      icon: type.icon || fallback.icon || '🏢',
      moduleKeys: Array.isArray(type.moduleKeys) ? type.moduleKeys : [],
      label: type.labels?.[language]
        || (localLabel !== id ? localLabel : fallback.label || type.labels?.en || id),
    };
  });
}