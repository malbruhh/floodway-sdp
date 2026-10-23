export interface SignInErrors { name?: string; email?: string }

/** Plain-language checks for the sign-in form. Empty object means valid. */
export function validateSignIn(name: string, email: string): SignInErrors {
  const errors: SignInErrors = {};
  if (!name.trim()) errors.name = 'Enter your name.';
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'That email does not look right. Example: you@example.com';
  return errors;
}
