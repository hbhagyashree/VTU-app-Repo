'use client';

import AppShell from '@/components/layout/AppShell';
import { getAllSemesters, getSubjectResources } from '@/lib/academics';
import { getSubjectBookmarks, toggleDocumentBookmark } from '@/lib/bookmarks';
import { getCurrentUser } from '@/lib/auth';
import { getSubjectByIdResult } from '@/lib/subjects';
import type { AuthUser, Bookmark, Document, Module, Subject } from '@/types';
import { Bookmark as BookmarkIcon, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SubjectPageProps {
  params: { subjectId: string };
}

const tabs = [
  { id: 'notes', label: 'Notes' },
  { id: 'pyq', label: 'PYQs' },
  { id: 'solved-answer', label: 'Solved Answers' },
  { id: 'important-question', label: 'Important Questions' },
] as const;

type TabId = (typeof tabs)[number]['id'];

function getTabHeading(tab: TabId): string {
  if (tab === 'pyq') {
    return 'Previous year questions';
  }

  if (tab === 'solved-answer') {
    return 'Solved answers';
  }

  if (tab === 'important-question') {
    return 'Important questions';
  }

  return 'Module-wise notes';
}

function getTabDescription(tab: TabId): string {
  if (tab === 'pyq') {
    return 'Browse previous year questions and exam patterns linked to the subject modules.';
  }

  if (tab === 'solved-answer') {
    return 'Review model answers and exam-focused writing support for important questions.';
  }

  if (tab === 'important-question') {
    return 'Focus on the most exam-relevant questions and high-priority revision prompts.';
  }

  return 'Read notes and revision content grouped by module for faster study sessions.';
}

function getTabEmptyLabel(tab: TabId): string {
  const match = tabs.find((item) => item.id === tab);
  return match ? match.label.toLowerCase() : 'resources';
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

function formatDocumentDate(value?: string): string {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString();
}

function ResourceCard({
  document,
  subtitle,
  onPreview,
  isBookmarked,
  isBookmarkPending,
  onToggleBookmark,
}: {
  document: Document;
  subtitle: string;
  onPreview: (document: Document) => void;
  isBookmarked: boolean;
  isBookmarkPending: boolean;
  onToggleBookmark: (document: Document) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h5 className="text-lg font-semibold text-white">{document.title}</h5>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
          {document.type}
        </span>
      </div>

      {document.content ? (
        <p className="mt-4 text-slate-300">{document.content}</p>
      ) : (
        <p className="mt-4 text-slate-400">
          This resource is ready to be linked to uploaded files or generated content.
        </p>
      )}

      {document.file_url ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex max-w-full items-center rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
            {getFileLabel(document.file_url)}
          </span>
          <a
            href={document.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-200 transition hover:border-brand-400 hover:bg-brand-500/20"
          >
            Open or download file
          </a>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onPreview(document)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-brand-500"
        >
          <Eye className="h-4 w-4" />
          Preview resource
        </button>
        <button
          type="button"
          onClick={() => onToggleBookmark(document)}
          disabled={isBookmarkPending}
          className={
            isBookmarked
              ? 'inline-flex items-center gap-2 rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-400 disabled:opacity-60'
              : 'inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-amber-500 disabled:opacity-60'
          }
        >
          <BookmarkIcon className="h-4 w-4" />
          {isBookmarkPending
            ? 'Saving...'
            : isBookmarked
              ? 'Saved'
              : 'Save for later'}
        </button>
      </div>
    </article>
  );
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const { subjectId } = params;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [semesterTitle, setSemesterTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);
  const [bookmarkPendingId, setBookmarkPendingId] = useState<string | null>(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSubject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getSubjectByIdResult(subjectId);
        if (!isActive) {
          return;
        }
        setSubject(result.data);
        setUsingFallbackData(result.fallback);

        const subjectData = result.data;

        if (subjectData) {
          const semestersResult = await getAllSemesters();
          if (!isActive) {
            return;
          }

          const matchedSemester = semestersResult.data.find(
            (semester) => semester.id === subjectData.semester_id
          );
          setSemesterTitle(matchedSemester?.title ?? `Semester ${subjectData.semester_id}`);
          setUsingFallbackData(result.fallback || semestersResult.fallback);
        } else {
          setSemesterTitle('');
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        console.error('Failed to load subject:', loadError);
        setError('Unable to load this subject right now. Please try again in a moment.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadSubject();

    return () => {
      isActive = false;
    };
  }, [subjectId]);

  useEffect(() => {
    setSelectedModuleId('all');
    setResourceSearchQuery('');
    setShowBookmarkedOnly(false);
  }, [subjectId]);

  useEffect(() => {
    let isActive = true;

    const loadUserAndBookmarks = async () => {
      const user = await getCurrentUser();
      if (!isActive) {
        return;
      }

      setCurrentUser(user);
      setBookmarkError(null);
      setBookmarkNotice(null);

      if (!user) {
        setBookmarks([]);
        return;
      }

      try {
        const result = await getSubjectBookmarks(subjectId);
        if (!isActive) {
          return;
        }

        setBookmarks(result.data);
        if (result.fallback) {
          setBookmarkNotice('Using local bookmark storage because live bookmark sync is unavailable right now.');
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('Failed to load bookmarks:', error);
        setBookmarkError('Unable to load saved bookmarks right now.');
      }
    };

    loadUserAndBookmarks();

    return () => {
      isActive = false;
    };
  }, [subjectId]);

  useEffect(() => {
    let isActive = true;

    const loadResources = async () => {
      setResourcesLoading(true);
      setResourcesError(null);

      try {
        if (!isActive) {
          return;
        }

        const result = await getSubjectResources(subjectId);
        if (!isActive) {
          return;
        }

        setModules(result.modules);
        setDocuments(result.documents);
        if (result.fallback) {
          setResourcesError('Using fallback study content because Supabase resources are unavailable.');
          setUsingFallbackData(true);
        }
      } finally {
        if (isActive) {
          setResourcesLoading(false);
        }
      }
    };

    loadResources();

    return () => {
      isActive = false;
    };
  }, [subjectId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Loading subject...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
          {error}
        </div>
      </AppShell>
    );
  }

  if (!subject) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Subject not found</h1>
          <p className="mt-3 text-slate-400">
            The subject you are looking for is unavailable or has not been published yet.
          </p>
          <Link
            href="/subjects"
            className="mt-6 inline-flex rounded-full border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Back to subjects
          </Link>
        </div>
      </AppShell>
    );
  }

  const filteredDocuments = documents.filter((document) => {
    if (document.type !== activeTab) {
      return false;
    }

    if (selectedModuleId === 'all') {
      return true;
    }

    return document.module_id === selectedModuleId;
  });

  const bookmarkedDocumentIds = new Set(
    bookmarks
      .filter((bookmark) => bookmark.item_type === 'document' && bookmark.document_id)
      .map((bookmark) => bookmark.document_id as string)
  );

  const normalizedResourceQuery = resourceSearchQuery.trim().toLowerCase();
  const searchedDocuments = filteredDocuments.filter((document) => {
    if (showBookmarkedOnly && !bookmarkedDocumentIds.has(document.id)) {
      return false;
    }

    if (!normalizedResourceQuery) {
      return true;
    }

    return [document.title, document.content, getFileLabel(document.file_url ?? '')]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedResourceQuery));
  });

  const modulesWithDocuments = modules
    .map((module) => ({
      ...module,
      documents: searchedDocuments.filter((document) => document.module_id === module.id),
    }))
    .filter((module) => module.documents.length > 0);

  const uncategorizedDocuments = searchedDocuments.filter(
    (document) => !modules.some((module) => module.id === document.module_id)
  );
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Resources';

  const documentCounts = tabs.reduce<Record<TabId, number>>((counts, tab) => {
    counts[tab.id] = documents.filter((document) => document.type === tab.id).length;
    return counts;
  }, {} as Record<TabId, number>);

  const bookmarkedCount = searchedDocuments.filter((document) =>
    bookmarkedDocumentIds.has(document.id)
  ).length;

  const handleToggleBookmark = async (document: Document) => {
    setBookmarkPendingId(document.id);
    setBookmarkError(null);
    setBookmarkNotice(null);

    try {
      const result = await toggleDocumentBookmark(subjectId, document.id);

      setBookmarks((prev) => {
        const next = prev.filter((bookmark) => bookmark.document_id !== document.id);
        return result.bookmark ? [result.bookmark, ...next] : next;
      });

      setBookmarkNotice(
        result.bookmarked
          ? `"${document.title}" saved to your bookmarks.`
          : `"${document.title}" removed from your bookmarks.`
      );

      if (result.fallback) {
        setBookmarkNotice((prev) =>
          prev
            ? `${prev} Stored locally because live bookmark sync is unavailable right now.`
            : 'Bookmark saved locally because live bookmark sync is unavailable right now.'
        );
      }
    } catch (error) {
      setBookmarkError(error instanceof Error ? error.message : 'Failed to update bookmark');
    } finally {
      setBookmarkPendingId(null);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Subject dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{subject.name}</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              {subject.code ? <span className="text-brand-300">{subject.code} • </span> : null}
              {semesterTitle || `Semester ${subject.semester_id}`}
              {subject.description ? <span> • {subject.description}</span> : null}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Back to dashboard
          </Link>
        </div>

        {resourcesError ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            {resourcesError}
          </div>
        ) : null}

        {usingFallbackData && !resourcesError ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            Some subject details are using fallback data because live Supabase content is unavailable right now.
          </div>
        ) : null}

        {bookmarkNotice ? (
          <div className="rounded-3xl border border-brand-800 bg-brand-950/30 p-6 text-brand-200">
            {bookmarkNotice}
          </div>
        ) : null}

        {bookmarkError ? (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {bookmarkError}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{tab.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{documentCounts[tab.id]}</p>
              <p className="mt-2 text-sm text-slate-400">Available study resources</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">Modules</h2>
            {resourcesLoading ? (
              <p className="mt-6 text-slate-400">Loading modules...</p>
            ) : modules.length === 0 ? (
              <p className="mt-6 text-slate-400">No modules available yet.</p>
            ) : (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedModuleId('all')}
                  className={
                    selectedModuleId === 'all'
                      ? 'w-full rounded-2xl border border-brand-500 bg-brand-500/10 px-4 py-3 text-left'
                      : 'w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-left transition hover:border-slate-600'
                  }
                >
                  <p className="text-sm font-semibold text-white">All modules</p>
                  <p className="mt-1 text-xs text-slate-400">View every resource in this tab together.</p>
                </button>

                {modules.map((module) => {
                  const isActiveModule = selectedModuleId === module.id;
                  const moduleDocumentCount = documents.filter(
                    (document) => document.module_id === module.id && document.type === activeTab
                  ).length;

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setSelectedModuleId(module.id)}
                      className={
                        isActiveModule
                          ? 'w-full rounded-2xl border border-brand-500 bg-brand-500/10 px-4 py-3 text-left'
                          : 'w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-left transition hover:border-slate-600'
                      }
                    >
                      <p className="text-sm font-semibold text-white">
                        Module {module.order}: {module.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {moduleDocumentCount} {getTabEmptyLabel(activeTab)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="flex flex-wrap items-center gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      activeTab === tab.id
                        ? 'rounded-full border border-brand-500 bg-brand-500/15 px-4 py-2 text-sm font-medium text-white'
                        : 'rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-brand-500'
                    }
                  >
                    {tab.label} ({documentCounts[tab.id]})
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <h3 className="text-xl font-semibold text-white">{getTabHeading(activeTab)}</h3>
                <p className="mt-3 text-slate-300">{getTabDescription(activeTab)}</p>

                <div className="mt-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="block">
                      <span className="text-sm text-slate-400">Search in this tab</span>
                      <input
                        type="text"
                        value={resourceSearchQuery}
                        onChange={(event) => setResourceSearchQuery(event.target.value)}
                        placeholder="Search by title, content, or attached filename"
                        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowBookmarkedOnly((prev) => !prev)}
                      disabled={!currentUser}
                      className={
                        showBookmarkedOnly
                          ? 'rounded-full border border-amber-500 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60'
                          : 'rounded-full border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60'
                      }
                    >
                      {showBookmarkedOnly ? 'Showing saved only' : `Saved only${currentUser ? ` (${bookmarkedCount})` : ''}`}
                    </button>
                  </div>
                  {!currentUser ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Log in to save useful resources and filter by your bookmarks.
                    </p>
                  ) : null}
                </div>

                {resourcesLoading ? (
                  <p className="mt-6 text-slate-400">Loading study material...</p>
                ) : filteredDocuments.length === 0 ? (
                  <p className="mt-6 text-slate-400">
                    No {getTabEmptyLabel(activeTab)} available yet
                    {selectedModuleId === 'all'
                      ? '.'
                      : ' for the selected module.'}
                  </p>
                ) : searchedDocuments.length === 0 ? (
                  <p className="mt-6 text-slate-400">
                    No {getTabEmptyLabel(activeTab)} match your search in this view.
                  </p>
                ) : (
                  <div className="mt-6 space-y-6">
                    {modulesWithDocuments.map((module) => (
                      <div key={module.id} className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            Module {module.order}: {module.title}
                          </h4>
                          {module.description ? (
                            <p className="mt-1 text-sm text-slate-400">{module.description}</p>
                          ) : null}
                        </div>

                      <div className="grid gap-4">
                          {module.documents.map((document) => (
                            <ResourceCard
                              key={document.id}
                              document={document}
                              subtitle={`${activeTabLabel} resource for this module`}
                              onPreview={setPreviewDocument}
                              isBookmarked={bookmarkedDocumentIds.has(document.id)}
                              isBookmarkPending={bookmarkPendingId === document.id}
                              onToggleBookmark={handleToggleBookmark}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {uncategorizedDocuments.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white">General resources</h4>
                          <p className="mt-1 text-sm text-slate-400">
                            Resources that are not mapped to a specific module yet.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          {uncategorizedDocuments.map((document) => (
                            <ResourceCard
                              key={document.id}
                              document={document}
                              subtitle="General subject resource"
                              onPreview={setPreviewDocument}
                              isBookmarked={bookmarkedDocumentIds.has(document.id)}
                              isBookmarkPending={bookmarkPendingId === document.id}
                              onToggleBookmark={handleToggleBookmark}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {previewDocument ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {previewDocument.type}
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-white">{previewDocument.title}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Added {formatDocumentDate(previewDocument.created_at)}
                </p>
                <p className="text-sm text-slate-400">
                  Updated {formatDocumentDate(previewDocument.updated_at ?? previewDocument.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {previewDocument.file_url ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attached file</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                    {getFileLabel(previewDocument.file_url)}
                  </span>
                  <a
                    href={previewDocument.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-brand-300 transition hover:text-brand-200"
                  >
                    Open or download file
                  </a>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Content preview</p>
              {previewDocument.content ? (
                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {previewDocument.content}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  This resource does not include inline text. Use the attached file if the study material was uploaded as a PDF or external document.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {previewDocument.file_url ? (
                <a
                  href={previewDocument.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  Open file
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
