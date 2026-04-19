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
    <header className="border-b border-slate-800 bg-slate-950/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          VTU SmartPrep
        </Link>

        <div className="flex items-center gap-4 text-sm text-slate-300">
          <Link href="/" className="hover:text-white">Home</Link>

          {user === undefined ? null : user === null ? (
            <>
              <Link
                href="/login"
                className="rounded-md border border-slate-700 px-3 py-2 hover:border-slate-500 hover:text-white"
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {user.role === 'admin' ? (
                <Link href="/admin" className="hover:text-white">Admin</Link>
              ) : (
                <>
                  <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
                  <Link href="/subjects" className="hover:text-white">Subjects</Link>
                  <Link href="/bookmarks" className="hover:text-white">Bookmarks</Link>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-slate-700 px-3 py-2 hover:border-slate-500 hover:text-white"
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
