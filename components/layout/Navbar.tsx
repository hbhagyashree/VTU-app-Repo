'use client';

import { getCurrentUser, logout, subscribeToAuthChanges } from '@/lib/auth';
import type { AuthUser } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((nextUser) => {
        if (isActive) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (isActive) {
          setUser(null);
        }
      });

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      if (isActive) {
        setUser(nextUser);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="group flex w-fit items-center gap-3 text-lg font-semibold text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-ocean-400 text-sm font-black text-slate-950 shadow-lg shadow-brand-950/30">
            VTU
          </span>
          <span>SmartPrep</span>
        </Link>

        <div className="flex max-w-full flex-wrap items-center gap-2 text-sm text-slate-300 sm:justify-end sm:gap-3">
          <Link href="/" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Home</Link>

          {user === undefined ? null : user === null ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-2 font-semibold text-brand-100 transition hover:border-brand-300 hover:bg-brand-500/20"
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {user.role === 'admin' ? (
                <Link href="/admin" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Admin</Link>
              ) : (
                <>
                  <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
                  <Link href="/subjects" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Subjects</Link>
                  <Link href="/bookmarks" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Bookmarks</Link>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 hover:text-white"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
