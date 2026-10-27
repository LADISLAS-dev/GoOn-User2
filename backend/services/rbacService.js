const Permission = require('../models/Permission');
const Role = require('../models/Role');
const Company = require('../models/company');
const Employee = require('../models/Employee');
const User = require('../models/User');

const PERMISSIONS = [
  { key: 'customers:read', labels: { en: 'View customers', fr: 'Voir les clients' } },
  { key: 'customers:create', labels: { en: 'Create customers', fr: 'Créer des clients' } },
  { key: 'customers:update', labels: { en: 'Edit customers', fr: 'Modifier les clients' } },
  { key: 'customers:delete', labels: { en: 'Delete customers', fr: 'Supprimer les clients' } },
  { key: 'products:read', labels: { en: 'View products', fr: 'Voir les produits' } },
  { key: 'products:create', labels: { en: 'Create products', fr: 'Créer des produits' } },
  { key: 'products:update', labels: { en: 'Edit products', fr: 'Modifier les produits' } },
  { key: 'products:archive', labels: { en: 'Archive products', fr: 'Archiver les produits' } },
  { key: 'inventory:manage', labels: { en: 'Manage stock', fr: 'Gérer le stock' } },
  { key: 'suppliers:read', labels: { en: 'View suppliers', fr: 'Voir les fournisseurs' } },
  { key: 'suppliers:manage', labels: { en: 'Manage suppliers', fr: 'Gérer les fournisseurs' } },
  { key: 'purchase_orders:read', labels: { en: 'View purchase orders', fr: 'Voir les commandes fournisseurs' } },
  { key: 'purchase_orders:create', labels: { en: 'Create purchase orders', fr: 'Créer des commandes fournisseurs' } },
  { key: 'purchase_orders:receive', labels: { en: 'Receive purchase orders', fr: 'Réceptionner les commandes' } },
  { key: 'invoices:read', labels: { en: 'View invoices', fr: 'Voir les factures' } },
  { key: 'invoices:create', labels: { en: 'Create invoices', fr: 'Créer des factures' } },
  { key: 'invoices:update', labels: { en: 'Edit invoice drafts', fr: 'Modifier les brouillons' } },
  { key: 'invoices:issue', labels: { en: 'Issue invoices', fr: 'Émettre des factures' } },
  { key: 'invoices:pay', labels: { en: 'Record invoice payments', fr: 'Enregistrer les règlements' } },
  { key: 'orders:read', labels: { en: 'View sales orders', fr: 'Voir les commandes de vente' } },
  { key: 'orders:create', labels: { en: 'Create sales orders', fr: 'Créer des commandes de vente' } },
  { key: 'orders:manage', labels: { en: 'Manage sales orders', fr: 'Gérer les commandes de vente' } },
  { key: 'appointments:read', labels: { en: 'View appointments', fr: 'Voir les rendez-vous' } },
  { key: 'appointments:manage', labels: { en: 'Manage appointments', fr: 'Gérer les rendez-vous' } },
  { key: 'team:read', labels: { en: 'View team', fr: 'Voir l’équipe' } },
  { key: 'team:manage', labels: { en: 'Manage team', fr: 'Gérer l’équipe' } },
  { key: 'modules:read', labels: { en: 'View modules', fr: 'Voir les modules' } },
  { key: 'modules:manage', labels: { en: 'Manage modules', fr: 'Gérer les modules' } },
  { key: 'analytics:read', labels: { en: 'View analytics', fr: 'Voir les statistiques' } },
  { key: 'audit:read', labels: { en: 'View activity history', fr: 'Voir le journal d’activité' } },
];

const DEFAULT_ROLES = [
  {
    key: 'manager',
    name: 'Manager',
    isSystem: true,
    permissions: [
      'customers:read',
      'customers:create',
      'customers:update',
      'customers:delete',
      'products:read',
      'products:create',
      'products:update',
      'products:archive',
      'inventory:manage',
      'suppliers:read',
      'suppliers:manage',
      'purchase_orders:read',
      'purchase_orders:create',
      'purchase_orders:receive',
      'invoices:read',
      'invoices:create',
      'invoices:update',
      'invoices:issue',
      'invoices:pay',
      'orders:read',
      'orders:create',
      'orders:manage',
      'appointments:read',
      'appointments:manage',
      'team:read',
      'team:manage',
      'modules:read',
      'analytics:read',
      'audit:read',
    ],
  },
  {
    key: 'staff',
    name: 'Staff',
    isSystem: true,
    permissions: ['customers:read', 'customers:create', 'customers:update', 'products:read', 'modules:read'],
  },
];
const DEFAULT_ROLE_VERSION = 11;

function hasPermission(role, permission) {
  return Array.isArray(role?.permissions) && role.permissions.includes(permission);
}

function canAccessCompany({ isOwner = false, role, permission }) {
  return Boolean(isOwner || hasPermission(role, permission));
}

function canAssignRole({ isOwner = false, actorRole, targetRole }) {
  if (!targetRole || targetRole.key === 'owner') return false;
  if (isOwner) return true;

  const actorPermissions = new Set(actorRole?.permissions || []);
  return (targetRole.permissions || []).every((permission) => actorPermissions.has(permission));
}

function validateRolePermissions(inputPermissions, availablePermissions = PERMISSIONS) {
  if (!Array.isArray(inputPermissions)) {
    throw new Error('Les permissions doivent être une liste.');
  }

  const availableKeys = new Set(availablePermissions.map((permission) => permission.key));
  const requested = [...new Set(inputPermissions.map((key) => String(key || '').trim()).filter(Boolean))];
  const unknown = requested.filter((key) => !availableKeys.has(key));

  if (unknown.length) {
    throw new Error(`Permissions inconnues : ${unknown.join(', ')}`);
  }

  return requested;
}

async function syncPermissionCatalog() {
  await Permission.bulkWrite(
    PERMISSIONS.map((permission) => ({
      updateOne: {
        filter: { key: permission.key },
        update: { $setOnInsert: permission },
        upsert: true,
      },
    }))
  );
}

async function ensureCompanyDefaultRoles(companyId) {
  await Role.bulkWrite(
    DEFAULT_ROLES.map((role) => ({
      updateOne: {
        filter: { companyId, key: role.key, isSystem: true },
        update: {
          $set: { name: role.name, permissions: role.permissions, defaultVersion: DEFAULT_ROLE_VERSION },
          $setOnInsert: { companyId, key: role.key, isSystem: true },
        },
        upsert: true,
      },
    }))
  );
}

async function resolveCompanyAccess({ firebaseUid, companyId, permission }) {
  const user = await User.findOne({ firebaseUid }).select('_id name email');
  if (!user) return { error: { status: 401, message: 'Utilisateur authentifié introuvable.' } };

  const company = await Company.findById(companyId)
    .select('_id ownerId name email categoryId categoryIds businessTypeId enabledModules paymentAccounts');
  if (!company) return { error: { status: 404, message: 'Entreprise introuvable.' } };

  const isOwner = String(company.ownerId) === String(user._id);
  if (isOwner) return { user, company, role: null, employee: null, isOwner: true };

  const employee = await Employee.findOne({
    companyId: company._id,
    userId: user._id,
    status: 'active',
  }).populate('roleId', 'key name permissions');
  const role = employee?.roleId || null;

  if (!employee || !canAccessCompany({ role, permission })) {
    return { error: { status: 403, message: 'Permission insuffisante pour cette entreprise.' } };
  }

  return { user, company, role, employee, isOwner: false };
}

module.exports = {
  DEFAULT_ROLES,
  DEFAULT_ROLE_VERSION,
  PERMISSIONS,
  canAccessCompany,
  canAssignRole,
  ensureCompanyDefaultRoles,
  hasPermission,
  resolveCompanyAccess,
  syncPermissionCatalog,
  validateRolePermissions,
};