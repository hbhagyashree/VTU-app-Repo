'use client';

import AppShell from '@/components/layout/AppShell';
import { isUsingSupabaseAuth, login, resendSignupConfirmation } from '@/lib/auth';
import type { LoginInput } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function formatLoginError(message: string): string {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Your email or password is incorrect.';
  }

  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const supabaseAuthEnabled = isUsingSupabaseAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const user = await login(formData);

      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Login failed';
      setError(formatLoginError(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setError('Enter your email address first so we know where to resend the confirmation link.');
      return;
    }

    setIsResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      await resendSignupConfirmation(formData.email);
      setInfoMessage('Confirmation email sent. Check your inbox and spam folder.');
    } catch (resendError) {
      const message =
        resendError instanceof Error ? resendError.message : 'Unable to resend confirmation email.';
      setError(message);
    } finally {
      setIsResending(false);
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
        <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Account sign in</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Log in to VTU SmartPrep</h1>
        <p className="mt-3 text-slate-400">
          {supabaseAuthEnabled
            ? 'Sign in to access your study dashboard, resources, and saved materials.'
            : 'Use the demo accounts below. Students and admins share the same sign-in form in both demo mode and Supabase mode.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {infoMessage ? (
            <div className="rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
              {infoMessage}
            </div>
          ) : null}

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
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {supabaseAuthEnabled ? (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={isResending}
            className="mt-4 text-sm text-brand-300 transition hover:text-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending ? 'Sending confirmation email...' : 'Resend confirmation email'}
          </button>
        ) : null}

        <p className="mt-6 text-sm text-slate-400">
          New here?{' '}
          <Link href="/signup" className="text-brand-300 hover:text-brand-200">
            Create an account
          </Link>
        </p>

        {!supabaseAuthEnabled ? (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-500">
            <strong>Demo credentials:</strong>
            <br />
            Student: student@example.com / password
            <br />
            Admin: admin@example.com / password
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
