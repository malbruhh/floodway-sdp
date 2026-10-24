import { beforeEach, describe, expect, it } from 'vitest';
import { EXAMPLE_CONTACTS, loadContacts, saveContacts, validateContact } from '../lib/contacts';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('family contacts', () => {
  beforeEach(() => { (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage(); });

  it('validates name and phone with plain messages', () => {
    expect(validateContact('', '')).toEqual({ name: expect.stringMatching(/Enter a name/), phone: expect.stringMatching(/8 to 15 digits/) });
    expect(validateContact('Uncle Hadi', '+60 17-555 1234')).toEqual({});
    expect(validateContact('Hadi', '12345').phone).toBeDefined();
    expect(validateContact('Hadi', 'abc').phone).toBeDefined();
  });
  it('shows examples first, then what was saved', () => {
    expect(loadContacts()).toEqual(EXAMPLE_CONTACTS);
    saveContacts([{ id: 'a', name: 'Aina', phone: '0123456789' }]);
    expect(loadContacts()).toEqual([{ id: 'a', name: 'Aina', phone: '0123456789' }]);
  });
});
