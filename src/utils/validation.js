export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function normalizeUAPhone(input) {
  if (!input) return null;

  const cleaned = String(input).replace(/[^\d+]/g, '');

  if (/^\+380\d{9}$/.test(cleaned)) return cleaned;
  if (/^380\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0\d{9}$/.test(cleaned)) return `+38${cleaned}`;

  return null;
}