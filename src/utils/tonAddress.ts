/**
 * TON & Gram Wallet Address Sanitizer and Validator
 * Supports:
 * - TON user-friendly addresses: EQ..., UQ..., kQ..., 0Q..., Ef..., Uf... (both base64url and standard base64)
 * - Raw hex addresses with workchain (0:... or -1:...) and raw 64-hex
 * - Deep link prefixes (ton://transfer/..., tg://..., https://...)
 * - TON DNS & Gram domains (e.g. name.ton, name.gram, name.t.me)
 * - Telegram @wallet / @handles (or handles without @)
 * - Exchange addresses & memo destinations
 */
export function cleanAndValidateTonAddress(rawAddress: string): { valid: boolean; cleaned: string; error?: string } {
  if (!rawAddress || typeof rawAddress !== 'string') {
    return { valid: false, cleaned: '', error: 'Please enter a Gram / TON wallet address.' };
  }

  // Remove zero-width spaces, invisible unicode, wrapping quotes
  let cleaned = rawAddress
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["'`]|["'`]$/g, '');

  // Strip ton://transfer/ or ton:// URI prefixes and query params
  if (cleaned.toLowerCase().startsWith('ton://transfer/')) {
    cleaned = cleaned.substring('ton://transfer/'.length).split('?')[0];
  } else if (cleaned.toLowerCase().startsWith('ton://')) {
    cleaned = cleaned.substring('ton://'.length).split('?')[0];
  } else if (cleaned.toLowerCase().startsWith('tg://resolve?domain=')) {
    cleaned = '@' + cleaned.substring('tg://resolve?domain='.length).split('&')[0];
  }

  // Strip web URLs if pasted (e.g. https://ton.app/... or https://t.me/wallet or https://tonhub.com/transfer/...)
  if (cleaned.includes('://')) {
    const parts = cleaned.split('/');
    const last = parts[parts.length - 1].split('?')[0];
    if (last) cleaned = last;
  }

  // Remove all whitespace, line breaks, commas, semicolons
  cleaned = cleaned.replace(/[\s,\r\n\t;]+/g, '');

  if (!cleaned) {
    return { valid: false, cleaned: '', error: 'Wallet address cannot be blank.' };
  }

  // Auto-capitalize standard TON prefixes if typed in lowercase (eq..., uq...)
  if (/^eq[a-z0-9_\-+/]{40,60}$/i.test(cleaned)) {
    cleaned = 'EQ' + cleaned.substring(2);
  } else if (/^uq[a-z0-9_\-+/]{40,60}$/i.test(cleaned)) {
    cleaned = 'UQ' + cleaned.substring(2);
  } else if (/^ef[a-z0-9_\-+/]{40,60}$/i.test(cleaned)) {
    cleaned = 'Ef' + cleaned.substring(2);
  } else if (/^kq[a-z0-9_\-+/]{40,60}$/i.test(cleaned)) {
    cleaned = 'kQ' + cleaned.substring(2);
  } else if (/^0q[a-z0-9_\-+/]{40,60}$/i.test(cleaned)) {
    cleaned = '0Q' + cleaned.substring(2);
  }

  // Length check (minimum 4 characters, e.g. @bot or dns, max 128)
  if (cleaned.length < 4 || cleaned.length > 128) {
    return {
      valid: false,
      cleaned,
      error: 'Wallet address length is invalid (must be between 4 and 128 characters).'
    };
  }

  // Allowed character set check: letters, digits, _, -, +, /, :, @, .
  const hasValidChars = /^[a-zA-Z0-9_\-+/:\.@]+$/.test(cleaned);
  if (!hasValidChars) {
    return {
      valid: false,
      cleaned,
      error: 'Wallet address contains invalid characters.'
    };
  }

  return { valid: true, cleaned };
}

