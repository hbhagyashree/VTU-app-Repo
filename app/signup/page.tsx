'use client';

import AppShell from '@/components/layout/AppShell';
import { isUsingSupabaseAuth, signup } from '@/lib/auth';
import type { SignupInput } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function formatSignupError(message: string): string {
  if (message.toLowerCase().includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  if (message.toLowerCase().includes('password')) {
    return message;
  }

  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupInput>({
    full_name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabaseAuthEnabled = isUsingSupabaseAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signup(formData);

      if (supabaseAuthEnabled) {
        setSuccessMessage(
          'Account created. Check your email for a confirmation link, then return to sign in. If nothing arrives, use the resend option on the login page.'
        );
        return;
      }

      router.push('/dashboard');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Signup failed';
      setError(formatSignupError(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <AppShell>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Account registration</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Create your study account</h1>
        <p className="mt-3 text-slate-400">
          {supabaseAuthEnabled
            ? 'Create your account to access subject dashboards, notes, and exam prep resources.'
            : 'Create a demo student account instantly and start exploring the app.'}
        </p>

        {supabaseAuthEnabled ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            Need admin access later? Create the account here first, then change its role to
            <span className="font-semibold text-white"> admin </span>
            in Supabase. The same
            <span className="font-semibold text-white"> /login </span>
            page works for both students and admins.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
              {successMessage}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm text-slate-400">Full name</span>
            <input
              type="text"
              name="full_name"
              placeholder="Jane Doe"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Email</span>
            <input
              type="email"
              name="email"
              placeholder="student@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Password</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
