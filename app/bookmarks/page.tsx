'use client';

import AppShell from '@/components/layout/AppShell';
import { getProtectedRouteState } from '@/lib/auth';
import { getSubjectResources } from '@/lib/academics';
import { getUserBookmarks } from '@/lib/bookmarks';
import { getPublishedSubjectsResult } from '@/lib/subjects';
import type { Bookmark, Document, Subject } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SavedResourceItem {
  bookmark: Bookmark;
  document: Document;
  subject: Subject;
  moduleTitle: string;
}

function getFileLabel(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : 'Attached file';
  } catch {
    return 'Attached file';
  }
}

export default function BookmarksPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [savedResources, setSavedResources] = useState<SavedResourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadPage = async () => {
      const { redirectTo } = await getProtectedRouteState('student');
      if (!isActive) return;
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      setIsCheckingAuth(false);
      setIsLoading(true);
      setLoadError(null);
      setNotice(null);

      try {
        const [bookmarksResult, subjectsResult] = await Promise.all([
          getUserBookmarks(),
          getPublishedSubjectsResult(),
        ]);

        if (!isActive) return;

        const documentBookmarks = bookmarksResult.data.filter(
          (bookmark) => bookmark.item_type === 'document' && bookmark.document_id && bookmark.subject_id
        );

        if (documentBookmarks.length === 0) {
          setSavedResources([]);
          if (bookmarksResult.fallback) {
            setNotice(
              'Using local bookmark storage because live bookmark sync is unavailable right now.'
            );
          }
          return;
        }

        const uniqueSubjectIds = [...new Set(documentBookmarks.map((bookmark) => bookmark.subject_id as string))];
        const resourcesBySubject = await Promise.all(
          uniqueSubjectIds.map(async (subjectId) => ({
            subjectId,
            ...(await getSubjectResources(subjectId)),
          }))
        );

        if (!isActive) return;

        const subjectMap = new Map(subjectsResult.data.map((subject) => [subject.id, subject]));
        const resolvedResources = documentBookmarks
          .map((bookmark) => {
            const subject = subjectMap.get(bookmark.subject_id as string);
            const subjectResources = resourcesBySubject.find(
              (resource) => resource.subjectId === bookmark.subject_id
            );
            const document = subjectResources?.documents.find(
              (item) => item.id === bookmark.document_id
            );

            if (!subject || !document) {
              return null;
            }

            const moduleTitle =
              subjectResources?.modules.find((module) => module.id === document.module_id)?.title ??
              'General resource';

            return {
              bookmark,
              document,
              subject,
              moduleTitle,
            } satisfies SavedResourceItem;
          })
          .filter((item): item is SavedResourceItem => item !== null);

        setSavedResources(resolvedResources);

        if (
          bookmarksResult.fallback ||
          subjectsResult.fallback ||
          resourcesBySubject.some((resource) => resource.fallback)
        ) {
          setNotice(
            'Some saved resources are using fallback data because live Supabase content is unavailable right now.'
          );
        }
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load bookmarks page:', error);
        setLoadError('Unable to load saved resources right now. Please try again in a moment.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadPage();
    return () => {
      isActive = false;
    };
  }, [router]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredResources = savedResources.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    return [
      item.document.title,
      item.document.content,
      item.subject.name,
      item.subject.code,
      item.moduleTitle,
      getFileLabel(item.document.file_url ?? ''),
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });

  if (isCheckingAuth) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Checking your account...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Saved resources</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Your bookmarks
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Revisit the notes, PYQs, and solved answers you saved while studying.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Back to dashboard
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {loadError}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            {notice}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
          <label className="block">
            <span className="text-sm text-slate-400">Search saved resources</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, subject, module, content, or filename"
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-slate-400">Loading saved resources...</div>
            </div>
          ) : savedResources.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center">
              <h2 className="text-2xl font-semibold text-white">No bookmarks yet</h2>
              <p className="mt-3 text-slate-400">
                Open any subject and use “Save for later” on a useful resource to see it here.
              </p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-400">
              No saved resources match your search.
            </div>
          ) : (
            filteredResources.map((item) => (
              <article
                key={item.bookmark.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      {item.document.type}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {item.document.title}
                    </h2>
                    <p className="mt-3 text-sm text-slate-300">
                      {item.subject.name} {item.subject.code ? `• ${item.subject.code}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{item.moduleTitle}</p>
                  </div>

                  <Link
                    href={`/subjects/${item.subject.id}`}
                    className="rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-200 transition hover:border-brand-400 hover:bg-brand-500/20"
                  >
                    Open subject
                  </Link>
                </div>

                {item.document.content ? (
                  <p className="mt-4 line-clamp-4 text-sm text-slate-300">{item.document.content}</p>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    Saved resource with an attached file and no inline summary.
                  </p>
                )}

                {item.document.file_url ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
                      {getFileLabel(item.document.file_url)}
                    </span>
                    <a
                      href={item.document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-brand-300 transition hover:text-brand-200"
                    >
                      Open attached file
                    </a>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
