'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/layout/AdminShell';
import { getProtectedRouteState, logout } from '@/lib/auth';
import { getBookmarkAnalytics } from '@/lib/bookmarks';
import type { AuthUser, BookmarkAnalytics } from '@/types';

const adminCards = [
  { title: 'Departments', subtitle: 'Create and manage VTU departments.', href: '/admin/departments' },
  { title: 'Subjects', subtitle: 'Add subjects, semesters and mapping.', href: '/admin/subjects' },
  { title: 'Upload resources', subtitle: 'Upload notes, syllabus and PYQs.', href: '/admin/resources' },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkAnalytics, setBookmarkAnalytics] = useState<BookmarkAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      const { user: currentUser, redirectTo } = await getProtectedRouteState('admin');

      if (!isActive) {
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      setUser(currentUser);
      setIsLoading(false);

      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const analytics = await getBookmarkAnalytics();
        if (!isActive) {
          return;
        }
        setBookmarkAnalytics(analytics);
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('Failed to load bookmark analytics:', error);
        setAnalyticsError('Unable to load bookmark analytics right now.');
      } finally {
        if (isActive) {
          setAnalyticsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AdminShell>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Admin dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Welcome back, {user.full_name}!
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">Manage VTU content and publish student-ready resources. Create departments, subjects, modules and upload study material.</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Logout
          </button>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          {adminCards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 transition hover:border-brand-500 hover:bg-slate-800">
              <h2 className="text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-slate-400">{card.subtitle}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Student engagement</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Bookmark activity</h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                See which subjects and resources students are saving most often.
              </p>
            </div>

            {bookmarkAnalytics ? (
              <div className="rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-300">
                {bookmarkAnalytics.totalBookmarks} saves
              </div>
            ) : null}
          </div>

          {analyticsError ? (
            <div className="mt-6 rounded-2xl border border-red-800 bg-red-950/40 p-4 text-red-200">
              {analyticsError}
            </div>
          ) : null}

          {bookmarkAnalytics?.fallback ? (
            <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-amber-200">
              Some bookmark analytics are using fallback subject/resource data because live Supabase content is unavailable right now.
            </div>
          ) : null}

          {analyticsLoading ? (
            <div className="mt-6 text-slate-400">Loading bookmark analytics...</div>
          ) : bookmarkAnalytics ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total saves</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {bookmarkAnalytics.totalBookmarks}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Students saving</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {bookmarkAnalytics.uniqueStudents}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Last 7 days</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {bookmarkAnalytics.recentBookmarks7d}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Recent bookmark activity across student accounts
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <h3 className="text-lg font-semibold text-white">Top subjects</h3>
                  {bookmarkAnalytics.topSubjects.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No subject bookmark trends yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {bookmarkAnalytics.topSubjects.map((subject, index) => (
                        <div
                          key={subject.subject_id}
                          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {subject.subject_name}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
                            {subject.count} saves
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <h3 className="text-lg font-semibold text-white">Top saved resources</h3>
                  {bookmarkAnalytics.topDocuments.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No document bookmark trends yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {bookmarkAnalytics.topDocuments.map((document, index) => (
                        <div
                          key={document.document_id}
                          className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                #{index + 1} {document.document_title}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{document.subject_name}</p>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
                              {document.count} saves
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <h3 className="text-lg font-semibold text-white">Low-engagement subjects</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Published subjects with little or no save activity yet.
                  </p>
                  {bookmarkAnalytics.lowEngagementSubjects.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No subject engagement gaps yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {bookmarkAnalytics.lowEngagementSubjects.map((subject, index) => (
                        <div
                          key={subject.subject_id}
                          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {subject.subject_name}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
                            {subject.count} saves
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
