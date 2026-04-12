export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function normalizeUAPhone(phone) {
  const raw = String(phone || '').replace(/[^\d+]/g, '');

  if (!raw) return '';

  if (raw.startsWith('+380') && raw.length === 13) return raw;

  if (raw.startsWith('380') && raw.length === 12) return `+${raw}`;

  if (raw.startsWith('0') && raw.length === 10) {
    return `+38${raw}`;
  }

  return '';
}