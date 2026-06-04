'use client';

import { getCurrentUser, logout, subscribeToAuthChanges } from '@/lib/auth';
import type { AuthUser } from '@/types';
import { CalendarDays, ChevronDown, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const openElectiveLinks = [
  { label: '5th Sem Open Electives', href: '/vtu/open-electives/5th-sem' },
  { label: '6th Sem Open Electives', href: '/vtu/open-electives/6th-sem' },
  { label: '7th Sem Open Electives', href: '/vtu/open-electives/7th-sem' },
];

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [oeOpen, setOeOpen] = useState(false);
  const oeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((nextUser) => {
        if (isActive) setUser(nextUser);
      })
      .catch(() => {
        if (isActive) setUser(null);
      });

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      if (isActive) setUser(nextUser);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (oeRef.current && !oeRef.current.contains(e.target as Node)) {
        setOeOpen(false);
      }
    }
    if (oeOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [oeOpen]);

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
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-ocean-400 text-sm font-black text-slate-950 shadow-lg">
            VTU
          </span>
          <span>SmartPrep</span>
        </Link>

        <div className="flex max-w-full flex-wrap items-center gap-2 text-sm text-slate-300 sm:justify-end sm:gap-3">
          <Link href="/" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
            Home
          </Link>

          {/* Open Electives dropdown */}
          <div ref={oeRef} className="relative">
            <button
              type="button"
              onClick={() => setOeOpen((prev) => !prev)}
              aria-expanded={oeOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white"
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Open Electives
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${oeOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {oeOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-slate-950/40">
                <div className="border-b border-white/10 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ocean-300">
                    VTU Open Electives
                  </p>
                </div>
                <div className="p-1.5">
                  {openElectiveLinks.map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOeOpen(false)}
                      className="block rounded-xl px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="/vtu/open-electives"
                    onClick={() => setOeOpen(false)}
                    className="mt-1 block rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-ocean-200 transition hover:bg-ocean-500/10"
                  >
                    All Open Electives →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <a
            href="https://topmate.io/bhagyashree_hosmani/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ocean-400/40 bg-ocean-500/10 px-4 py-2 font-semibold text-ocean-100 transition hover:border-ocean-300 hover:bg-ocean-500/20"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Book 1:1
          </a>

          {user === undefined ? null : user === null ? (
            <Link
              href="/login"
              className="rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-2 font-semibold text-brand-100 transition hover:border-brand-300 hover:bg-brand-500/20"
            >
              Login
            </Link>
          ) : (
            <>
              {user.role === 'admin' ? (
                <Link href="/admin" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
                  Admin
                </Link>
              ) : (
                <>
                  <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
                    Study
                  </Link>
                  <Link href="/bookmarks" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
                    Saved
                  </Link>
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
