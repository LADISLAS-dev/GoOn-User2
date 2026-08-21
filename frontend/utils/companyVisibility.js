export function hasRequiredCompanyContent(company) {
  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  return carouselCount >= 1 && servicesCount >= 2;
}

export function isCompanyValidated(company) {
  const setupStatus = String(company?.setupStatus || '').toLowerCase();
  return (
    Boolean(company?.profileValidatedAt) ||
    setupStatus === 'ready' ||
    company?.isVerified === true
  );
}

export function isCompanyPubliclyVisible(company) {
  if (!company || typeof company !== 'object') return false;
  const hasRequiredContent = hasRequiredCompanyContent(company);

  const validated = isCompanyValidated(company);
  if (!validated) {
    // Legacy fallback: keep visibility when markers are missing but content is ready.
    return company?.isDraft !== true && hasRequiredContent;
  }

  // Legacy support: already-validated companies can remain visible even if content is incomplete.
  if (company?.isVerified === true) return true;

  return hasRequiredContent;
}
