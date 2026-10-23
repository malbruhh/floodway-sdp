import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AboutDemo } from '../components/common/AboutDemo';
import { FloodWayLogo } from '../components/brand/FloodWayLogo';
import { DemoChip } from '../components/ui/DemoChip';
import { Field } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { validateSignIn } from '../lib/signIn';
import { btnPrimary } from '../styles/tokens';

export function WelcomePage() {
  const navigate = useNavigate();
  const { loginDemo, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleDemo = () => {
    loginDemo();
    navigate('/home');
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSignIn(name, email);
    setErrors(found);
    if (found.name || found.email) return;
    login(email.trim(), name.trim());
    navigate('/home');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ground px-4 pb-8 pt-4">
      <header className="mx-auto flex w-full max-w-md items-center gap-2.5">
        <FloodWayLogo className="h-8 w-8" />
        <span className="text-lg font-bold tracking-tight">FloodWay</span>
        <span className="flex-1" />
        <DemoChip />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
        <div>
          <h1 className="text-[32px]/10 font-bold tracking-tight">Know if you are safe. Know where to go.</h1>
          <p className="mt-3 text-base text-muted">FloodWay watches river cameras and tells you the flood risk near you, with the nearest refuge and a route to it.</p>
        </div>

        <button type="button" onClick={handleDemo} className={`${btnPrimary} min-h-14 w-full text-[17px]`}>
          Continue as demo user <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>

        <form onSubmit={handleSignIn} noValidate className="grid gap-3 rounded-card border border-line bg-surface p-4" aria-label="Sign in with your details">
          <h2 className="text-base font-semibold">Or use your own name</h2>
          <Field label="Your name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
          <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" inputMode="email" />
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-btn bg-raised px-4 font-medium hover:bg-control/60">Sign in</button>
          <p className="text-sm text-muted">Nothing is sent anywhere. Your name is kept on this device only.</p>
        </form>
      </main>

      <footer className="mx-auto w-full max-w-md">
        <AboutDemo />
      </footer>
    </div>
  );
}
