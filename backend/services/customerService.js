const CUSTOMER_STATUSES = new Set(['lead', 'active', 'inactive']);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCustomerInput(input = {}, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Les informations du client sont invalides.');
  }

  const normalized = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || has('name')) {
    normalized.name = String(input.name || '').trim();
    if (!normalized.name || normalized.name.length > 120) {
      throw new Error('Le nom est obligatoire et ne peut pas dépasser 120 caractères.');
    }
  }

  if (!partial || has('email')) {
    normalized.email = String(input.email || '').trim().toLowerCase();
    if (normalized.email && (
      normalized.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
    )) {
      throw new Error('L’adresse e-mail est invalide.');
    }
  }

  if (!partial || has('phone')) {
    normalized.phone = String(input.phone || '').trim();
    if (normalized.phone.length > 40) {
      throw new Error('Le numéro de téléphone ne peut pas dépasser 40 caractères.');
    }
  }

  if (!partial || has('status')) {
    normalized.status = String(input.status || 'active').trim().toLowerCase();
    if (!CUSTOMER_STATUSES.has(normalized.status)) {
      throw new Error('Le statut du client est invalide.');
    }
  }

  if (!partial || has('tags')) {
    if (input.tags !== undefined && !Array.isArray(input.tags)) {
      throw new Error('Les étiquettes doivent être une liste.');
    }

    normalized.tags = [...new Set(
      (input.tags || [])
        .map((tag) => String(tag || '').trim().slice(0, 32))
        .filter(Boolean)
    )].slice(0, 20);
  }

  if (!partial || has('notes')) {
    normalized.notes = String(input.notes || '').trim();
    if (normalized.notes.length > 2000) {
      throw new Error('Les notes ne peuvent pas dépasser 2000 caractères.');
    }
  }

  return normalized;
}

function buildCustomerFilter({ companyId, search, status }) {
  const filter = { companyId };
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (CUSTOMER_STATUSES.has(normalizedStatus)) {
    filter.status = normalizedStatus;
  }

  const query = String(search || '').trim().slice(0, 100);
  if (query) {
    const safeQuery = new RegExp(escapeRegex(query), 'i');
    filter.$or = [{ name: safeQuery }, { email: safeQuery }, { phone: safeQuery }];
  }

  return filter;
}

function normalizePagination(page, limit) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit: Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 25,
  };
}

module.exports = {
  buildCustomerFilter,
  normalizeCustomerInput,
  normalizePagination,
};