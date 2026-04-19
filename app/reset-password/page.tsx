'use client';

import AppShell from '@/components/layout/AppShell';
import { isUsingSupabaseAuth, updatePassword } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabaseAuthEnabled = isUsingSupabaseAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Both passwords must match.');
      return;
    }

    setIsSaving(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password updated successfully. You can sign in with your new password now.');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update your password. Please request a new reset link.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Password reset</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Create a new password</h1>
        <p className="mt-3 text-slate-400">
          Enter a new password for your VTU SmartPrep account.
        </p>

        {!supabaseAuthEnabled ? (
          <div className="mt-6 rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
            Password reset is available only when Supabase auth is configured.
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
            <span className="text-sm text-slate-400">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>

          <button
            type="submit"
            disabled={isSaving || !supabaseAuthEnabled}
            className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Remembered your password?{' '}
          <Link href="/login" className="text-brand-300 hover:text-brand-200">
            Back to login
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
