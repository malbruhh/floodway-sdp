export interface Contact { id: string; name: string; phone: string; example?: boolean }
export interface ContactErrors { name?: string; phone?: string }

const KEY = 'floodway_family_contacts';

/** Examples shown until the person adds their own. Marked so nobody mistakes them for real contacts. */
export const EXAMPLE_CONTACTS: Contact[] = [
  { id: 'ex1', name: 'Nurul Huda (mother)', phone: '+60 12-987 6543', example: true },
  { id: 'ex2', name: 'Farhan Rosli (brother)', phone: '+60 19-321 0987', example: true },
];

/** Plain-language checks. A phone number needs 8 to 15 digits; spaces, dashes, brackets and a leading + are fine. */
export function validateContact(name: string, phone: string): ContactErrors {
  const e: ContactErrors = {};
  if (name.trim().length < 2) e.name = 'Enter a name, for example Uncle Hadi.';
  const digits = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (!/^\d{8,15}$/.test(digits)) e.phone = 'Enter a phone number with 8 to 15 digits, for example +60 17-555 1234.';
  return e;
}

export function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EXAMPLE_CONTACTS;
    const list = JSON.parse(raw) as Contact[];
    return Array.isArray(list) ? list : EXAMPLE_CONTACTS;
  } catch {
    return EXAMPLE_CONTACTS;
  }
}

export function saveContacts(list: Contact[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode: contacts last for this visit only */ }
}
