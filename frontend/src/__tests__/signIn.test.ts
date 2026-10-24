import { describe, expect, it } from 'vitest';
import { validateSignIn } from '../lib/signIn';

describe('validateSignIn', () => {
  it('asks for both fields when empty', () => {
    expect(validateSignIn('', '')).toEqual({ name: 'Enter your name.', email: 'Enter your email.' });
  });
  it('rejects a malformed email', () => {
    expect(validateSignIn('Aina', 'aina@').email).toMatch(/does not look right/);
  });
  it('accepts a name and an email, ignoring surrounding spaces', () => {
    expect(validateSignIn(' Aina ', ' aina@example.com ')).toEqual({});
  });
});
