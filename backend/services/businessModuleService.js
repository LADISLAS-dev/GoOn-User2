const BusinessModule = require('../models/BusinessModule');
const { getBusinessTypeModuleKeys } = require('./businessTypeService');
const PRODUCT_CATALOG_CATEGORY_IDS = new Set(['12', '13', '15', '25', '36']);

const BUSINESS_MODULES = [
  {
    key: 'company',
    labels: { en: 'Company', fr: 'Entreprise', es: 'Empresa', pt: 'Empresa' },
    icon: '🏢',
    screen: 'CompanyHome',
    categoryIds: [],
    defaultEnabled: true,
    mandatory: true,
    active: true,
    sortOrder: 10,
  },
  {
    key: 'appointments',
    labels: { en: 'Bookings', fr: 'Rendez-vous', es: 'Citas', pt: 'Agendamentos' },
    icon: '📅',
    screen: 'Booking',
    requiredPermission: 'appointments:read',
    categoryIds: ['2', '3', '4', '8', '9', '11', '16', '29', '30'],
    defaultEnabled: true,
    mandatory: false,
    active: true,
    sortOrder: 20,
  },
  {
    key: 'messages',
    labels: { en: 'Messages', fr: 'Messages', es: 'Mensajes', pt: 'Mensagens' },
    icon: '💬',
    screen: 'Messages',
    categoryIds: [],
    defaultEnabled: true,
    mandatory: false,
    active: true,
    sortOrder: 30,
  },
  {
    key: 'business_info',
    labels: { en: 'About', fr: 'Informations', es: 'Informacion', pt: 'Informacoes' },
    icon: '👤',
    screen: 'About',
    categoryIds: [],
    defaultEnabled: true,
    mandatory: true,
    active: true,
    sortOrder: 40,
  },
  {
    key: 'analytics',
    labels: { en: 'Analytics', fr: 'Statistiques', es: 'Estadisticas', pt: 'Analise' },
    icon: '📊',
    screen: 'Analytics',
    requiredPermission: 'analytics:read',
    requiredPermissions: ['appointments:read'],
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 50,
  },
  {
    key: 'customers',
    labels: { en: 'Customers', fr: 'Clients', es: 'Clientes', pt: 'Clientes' },
    icon: '👥',
    screen: 'Customers',
    requiredPermission: 'customers:read',
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 60,
  },
  {
    key: 'team',
    labels: { en: 'Team', fr: 'Équipe', es: 'Equipo', pt: 'Equipa' },
    icon: '👤',
    screen: 'Team',
    requiredPermission: 'team:read',
    categoryIds: [],
    defaultEnabled: true,
    mandatory: false,
    active: true,
    sortOrder: 70,
  },
  {
    key: 'audit_logs',
    labels: { en: 'Activity history', fr: 'Journal d’activité', es: 'Historial de actividad', pt: 'Histórico de atividade' },
    icon: '📜',
    screen: 'AuditLogs',
    requiredPermission: 'audit:read',
    categoryIds: [],
    defaultEnabled: true,
    mandatory: false,
    active: true,
    sortOrder: 80,
  },
  {
    key: 'inventory',
    labels: { en: 'Products & stock', fr: 'Produits et stock', es: 'Productos e inventario', pt: 'Produtos e estoque' },
    icon: '📦',
    screen: 'Inventory',
    requiredPermission: 'products:read',
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 90,
  },
  {
    key: 'procurement',
    labels: { en: 'Suppliers & purchasing', fr: 'Fournisseurs et achats', es: 'Proveedores y compras', pt: 'Fornecedores e compras' },
    icon: '🧾',
    screen: 'Procurement',
    requiredPermission: 'purchase_orders:read',
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 100,
  },
  {
    key: 'invoices',
    labels: { en: 'Invoices', fr: 'Factures', es: 'Facturas', pt: 'Faturas' },
    icon: '🧾',
    screen: 'Invoices',
    requiredPermission: 'invoices:read',
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 110,
  },
  {
    key: 'sales_orders',
    labels: { en: 'Sales orders', fr: 'Commandes de vente', es: 'Pedidos de venta', pt: 'Pedidos de venda' },
    icon: '🛍️',
    screen: 'SalesOrders',
    requiredPermission: 'orders:read',
    categoryIds: [],
    defaultEnabled: false,
    mandatory: false,
    active: true,
    sortOrder: 120,
  },
];

function normalizeCategoryIds(categoryIds = []) {
  const values = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  return [...new Set(values.map((id) => String(id || '').trim()).filter(Boolean))];
}

function getDefaultModuleKeys(categoryIds, catalog = BUSINESS_MODULES, businessTypeModuleKeys = null) {
  const selectedCategories = new Set(normalizeCategoryIds(categoryIds));
  const selectedModules = businessTypeModuleKeys === null
    ? null
    : new Set(businessTypeModuleKeys);

  return catalog
    .filter((module) => {
      if (module.active === false) return false;
      if (module.mandatory) return true;
      if (selectedModules) {
        if (selectedModules.has(module.key)) return true;
        if (module.defaultEnabled === false) return false;
        return !Array.isArray(module.categoryIds) || module.categoryIds.length === 0;
      }
      if (module.defaultEnabled === false) return false;
      if (!Array.isArray(module.categoryIds) || module.categoryIds.length === 0) return true;
      return module.categoryIds.some((id) => selectedCategories.has(String(id)));
    })
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map((module) => module.key);
}

function getCategoryRequiredModuleKeys(company) {
  const categoryIds = normalizeCategoryIds([
    ...(Array.isArray(company?.categoryIds) ? company.categoryIds : []),
    company?.categoryId,
    company?.businessTypeId,
  ]);
  if (categoryIds.includes('2')) return new Set(['inventory']);
  if (categoryIds.some((id) => PRODUCT_CATALOG_CATEGORY_IDS.has(id))) {
    return new Set(['inventory', 'sales_orders']);
  }
  return new Set();
}

function getCompanyModuleKeys(company, catalog = BUSINESS_MODULES) {
  const categoryRequiredKeys = getCategoryRequiredModuleKeys(company);
  if (!Array.isArray(company?.enabledModules)) {
    const defaults = getDefaultModuleKeys(
      company?.categoryIds?.length ? company.categoryIds : company?.categoryId,
      catalog
    );
    return [...new Set([...defaults, ...categoryRequiredKeys])];
  }

  const savedChoices = new Map(
    company.enabledModules
      .filter((module) => module && module.key)
      .map((module) => [String(module.key).trim(), module.enabled !== false])
  );

  return catalog
    .filter((module) => module.active !== false && (
      module.mandatory || categoryRequiredKeys.has(module.key) || (savedChoices.has(module.key)
        ? savedChoices.get(module.key)
        : module.defaultEnabled !== false)
    ))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map((module) => module.key);
}

function buildDefaultModuleAssignments(categoryIds, catalog = BUSINESS_MODULES, businessTypeModuleKeys = null) {
  return getDefaultModuleKeys(categoryIds, catalog, businessTypeModuleKeys).map((key) => ({
    key,
    enabled: true,
  }));
}

function buildCompanyModuleAssignments(selection, catalog = BUSINESS_MODULES) {
  const requested = Array.isArray(selection) ? selection : [];
  const requestedKeys = new Set(
    requested
      .filter((module) => module && module.enabled !== false)
      .map((module) => String(module.key || '').trim())
      .filter(Boolean)
  );
  const activeCatalog = catalog.filter((module) => module.active !== false);
  const availableKeys = new Set(activeCatalog.map((module) => module.key));
  const unknownKeys = [...requestedKeys].filter((key) => !availableKeys.has(key));

  return {
    unknownKeys,
    assignments: activeCatalog
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
      .map((module) => ({
        key: module.key,
        enabled: module.mandatory || requestedKeys.has(module.key),
      })),
  };
}

async function syncBusinessModuleCatalog() {
  await BusinessModule.bulkWrite(
    BUSINESS_MODULES.map((module) => {
      const { active, ...managedFields } = module;
      return {
        updateOne: {
          filter: { key: module.key },
          update: {
            $set: managedFields,
            $setOnInsert: { active },
          },
          upsert: true,
        },
      };
    })
  );
}

async function buildDefaultModuleAssignmentsFromDatabase(categoryIds) {
  const [catalog, businessTypeModuleKeys] = await Promise.all([
    BusinessModule.find({ active: true }).lean(),
    getBusinessTypeModuleKeys(categoryIds),
  ]);
  return buildDefaultModuleAssignments(
    categoryIds,
    catalog.length ? catalog : BUSINESS_MODULES,
    businessTypeModuleKeys
  );
}

async function getCompanyModules(company, access = {}) {
  const catalog = await BusinessModule.find({ active: true }).sort({ sortOrder: 1 }).lean();
  const availableModules = catalog.length ? catalog : BUSINESS_MODULES;
  const enabledKeys = new Set(getCompanyModuleKeys(company, availableModules));
  const categoryRequiredKeys = getCategoryRequiredModuleKeys(company);

  return availableModules
    .filter((module) => module.active !== false)
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map(({ key, labels, icon, screen, mandatory, requiredPermission, requiredPermissions = [] }) => ({
      key,
      labels,
      icon,
      screen,
      mandatory: Boolean(mandatory || categoryRequiredKeys.has(key)),
      enabled: enabledKeys.has(key) && (
        access.isOwner || [requiredPermission, ...requiredPermissions]
          .filter(Boolean)
          .every((permission) => hasPermission(access.role, permission))
      ),
    }));
}

module.exports = {
  BUSINESS_MODULES,
  buildCompanyModuleAssignments,
  buildDefaultModuleAssignments,
  buildDefaultModuleAssignmentsFromDatabase,
  getCompanyModuleKeys,
  getCategoryRequiredModuleKeys,
  getCompanyModules,
  getDefaultModuleKeys,
  syncBusinessModuleCatalog,
};