import { AboutDemo } from '../components/common/AboutDemo';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle2, Cpu } from 'lucide-react';
import { FloodWayLogo } from '../components/brand/FloodWayLogo';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  const navigate = useNavigate();
  const { loginDemo, login } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleDemo = () => {
    loginDemo();
    navigate('/home');
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, name);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071426] via-[#0B1E38] to-[#050D1A] text-white flex flex-col justify-between p-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <FloodWayLogo tile className="h-10 w-10" />
        <div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-white block">
            FloodWay
          </span>
          <span className="text-xs text-slate-400 font-medium">Sime Darby Property University Hackathon 2026</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="max-w-xl mx-auto my-auto w-full text-center py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-xs font-bold text-blue-400 mb-6 shadow-md">
          <Cpu className="w-3.5 h-3.5 text-[#1677FF]" />
          <span>Prototype for the Sime Darby Property University Hackathon 2026</span>
        </div>

        <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
          Life-Safety Flood Intelligence & Evacuation System
        </h1>
        <p className="text-slate-300 text-sm md:text-base mt-4 max-w-md mx-auto leading-relaxed">
          One glance to know if you are safe. One tap to reach refuge and protect your family circle.
        </p>

        {/* 1-Tap Demo Access Button */}
        <div className="mt-8 space-y-3 max-w-sm mx-auto">
          <button
            onClick={handleDemo}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#0958D9] hover:from-[#0958D9] hover:to-[#003EB3] text-white font-heading font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Explore Demo as Citizen (Luqman)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#071426] px-3 text-slate-400 font-semibold">Or Quick Login</span>
            </div>
          </div>

          <form onSubmit={handleCustomLogin} className="space-y-2">
            <input
              type="text"
              placeholder="Your Name (e.g. Inspector Tan)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#1677FF]"
            />
            <input
              type="email"
              placeholder="Email (e.g. evaluator@example.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#1677FF]"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      {/* Footer: what is real and what is simulated */}
      <div className="mx-auto w-full max-w-xl space-y-3 pb-4">
        <AboutDemo tone="dark" />
        <p className="text-center text-xs text-slate-400">© 2026 FloodWay Team · This demo runs on simulated data and calls no external cloud service.</p>
      </div>
    </div>
  );
}
