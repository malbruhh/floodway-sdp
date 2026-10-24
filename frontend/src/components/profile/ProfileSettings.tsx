import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, ChevronDown, ChevronRight, LogOut, Phone, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendTelegramMessage } from '../../services/telegramService';
import { hasWriteToken, setWriteToken } from '../../services/auth';
import { loadContacts, saveContacts, validateContact, type Contact, type ContactErrors } from '../../lib/contacts';
import { Field } from '../ui/Field';

const section = 'grid gap-3 rounded-card border border-line bg-surface p-4';

export function ProfileSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  const [added, setAdded] = useState<string | null>(null);

  const [tgChatId, setTgChatId] = useState(() => localStorage.getItem('floodway_tg_chat_id') || '');
  const [tgSaved, setTgSaved] = useState(false);
  const [tgStatus, setTgStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [operatorToken, setOperatorToken] = useState('');
  const [operatorSet, setOperatorSet] = useState(hasWriteToken());

  const update = (next: Contact[]) => { setContacts(next); saveContacts(next); };

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContact(name, phone);
    setErrors(found);
    if (found.name || found.phone) return;
    // The first real contact replaces the examples.
    const base = contacts.filter((c) => !c.example);
    update([...base, { id: `c-${Date.now()}`, name: name.trim(), phone: phone.trim() }]);
    setAdded(name.trim());
    setName(''); setPhone(''); setAdding(false);
  };

  const testTelegram = async () => {
    setTgStatus({ ok: false, text: 'Sending…' });
    const res = await sendTelegramMessage('Test alert from the FloodWay demo.', tgChatId.trim() || undefined);
    setTgStatus({ ok: res.success, text: res.success ? 'Delivered by the FloodWay bot.' : res.error || 'Not delivered. The server may not have a bot set up.' });
  };

  const signOut = () => { logout(); navigate('/', { replace: true }); };

  return (
    <div className="mx-auto grid w-full max-w-2xl content-start gap-3 p-4">
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-action text-xl font-bold text-white" aria-hidden="true">{(user?.name ?? '?').slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{user?.name}</h1>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          {user?.isDemo && <p className="text-xs text-muted">Demo account</p>}
        </div>
      </div>

      <Link to="/estate" className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-surface p-4">
        <Building2 className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <b className="block font-semibold">Estate view</b>
          <span className="text-sm text-muted">Water, alerts, reports and building risk for one township.</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>

      <section className={section} aria-labelledby="family-title">
        <h2 id="family-title" className="text-base font-semibold">Family contacts</h2>
        <p className="text-sm text-muted">People who should hear that you are safe. Kept on this device only.</p>
        {added && <p role="status" className="flex animate-rise items-center gap-2 rounded-ctl bg-normal-bg p-3 text-sm font-medium text-normal"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {added} added.</p>}
        {contacts.length === 0 && <p className="text-sm text-muted">No contacts yet.</p>}
        <ul className="grid gap-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex animate-rise items-center gap-2 rounded-ctl bg-raised p-2 pl-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-sm text-muted">{c.phone}{c.example && ' · example'}</p>
              </div>
              <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface"><Phone className="h-5 w-5" aria-hidden="true" /></a>
              <button type="button" onClick={() => update(contacts.filter((x) => x.id !== c.id))} aria-label={`Remove ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-danger"><Trash2 className="h-5 w-5" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form onSubmit={addContact} noValidate className="grid animate-rise gap-3 rounded-ctl bg-raised p-3" aria-label="Add a family contact">
            <Field label="Name" value={name} onChange={setName} error={errors.name} autoComplete="off" placeholder="Uncle Hadi" />
            <Field label="Phone number" value={phone} onChange={setPhone} error={errors.phone} type="tel" inputMode="tel" autoComplete="off" placeholder="+60 17-555 1234" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setAdding(false); setErrors({}); }} className="min-h-12 rounded-btn bg-surface font-medium">Cancel</button>
              <button type="submit" className="min-h-12 rounded-btn bg-action font-medium text-white">Save contact</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => { setAdding(true); setAdded(null); }} className="flex min-h-12 items-center justify-center gap-2 rounded-btn bg-raised font-medium"><Plus className="h-5 w-5" aria-hidden="true" /> Add a contact</button>
        )}
      </section>

      <details className={`${section} group`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-base font-semibold">
          Advanced <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-4 pt-1">
          <div className="grid gap-2">
            <h3 className="font-medium">Telegram alerts</h3>
            <p className="text-sm text-muted">The chat or channel that should receive demo alerts. The bot key stays on the FloodWay server.</p>
            <Field label="Telegram chat or channel ID" value={tgChatId} onChange={(v) => { setTgChatId(v); setTgSaved(false); }} placeholder="@your_channel or -1001234567" autoComplete="off" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { localStorage.setItem('floodway_tg_chat_id', tgChatId); setTgSaved(true); }} className="min-h-12 rounded-btn bg-raised font-medium">{tgSaved ? 'Saved' : 'Save'}</button>
              <button type="button" onClick={testTelegram} className="min-h-12 rounded-btn bg-raised font-medium">Send test alert</button>
            </div>
            {tgStatus && <p role="status" className={`animate-rise text-sm font-medium ${tgStatus.ok ? 'text-normal' : 'text-muted'}`}>{tgStatus.text}</p>}
          </div>
          <div className="grid gap-2">
            <h3 className="font-medium">Operator access</h3>
            <p className="text-sm text-muted">Only needed if this server protects changes such as adding cameras. Kept in this tab's memory and cleared on reload.</p>
            <Field label="Operator token" type="password" value={operatorToken} onChange={setOperatorToken} autoComplete="off" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setWriteToken(operatorToken); setOperatorSet(hasWriteToken()); setOperatorToken(''); }} className="min-h-12 rounded-btn bg-raised font-medium">Use token</button>
              <button type="button" onClick={() => { setWriteToken(''); setOperatorSet(false); setOperatorToken(''); }} className="min-h-12 rounded-btn bg-raised font-medium">Clear</button>
            </div>
            <p role="status" className="text-sm text-muted">{operatorSet ? 'A token is set for this tab.' : 'No token set.'}</p>
          </div>
        </div>
      </details>

      <button type="button" onClick={signOut} className="flex min-h-12 items-center justify-center gap-2 rounded-btn bg-raised font-medium"><LogOut className="h-5 w-5" aria-hidden="true" /> Sign out</button>
    </div>
  );
}
