'use client';

import SubjectForm from '@/components/admin/SubjectForm';
import AdminShell from '@/components/layout/AdminShell';
import { getProtectedRouteState } from '@/lib/auth';
import { getBookmarkAnalytics } from '@/lib/bookmarks';
import { deleteSubject, getSubjectsResult, updateSubject } from '@/lib/subjects';
import type { BookmarkAnalytics, Subject, UpdateSubjectInput } from '@/types';
import { Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function sortSubjects(items: Subject[]): Subject[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

interface EditFormState {
  name: string;
  code: string;
  description: string;
  published: boolean;
}

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ name: '', code: '', description: '', published: false });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [bookmarkAnalytics, setBookmarkAnalytics] = useState<BookmarkAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [subjectSortMode, setSubjectSortMode] = useState<'name' | 'engagement_low' | 'engagement_high'>('name');

  useEffect(() => {
    let isActive = true;

    const checkAccess = async () => {
      const { redirectTo } = await getProtectedRouteState('admin');
      if (!isActive) return false;
      if (redirectTo) { router.push(redirectTo); return false; }
      setIsCheckingAccess(false);
      return true;
    };

    const loadSubjects = async () => {
      const hasAccess = await checkAccess();
      if (!hasAccess || !isActive) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const [result, analytics] = await Promise.all([
          getSubjectsResult(),
          getBookmarkAnalytics(),
        ]);
        if (!isActive) return;
        setSubjects(sortSubjects(result.data));
        setUsingFallbackData(result.fallback);
        setBookmarkAnalytics(analytics);
        setAnalyticsError(null);
      } catch {
        if (!isActive) return;
        setLoadError('Unable to load subjects right now. Please try again in a moment.');
        setAnalyticsError('Unable to load subject engagement right now.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadSubjects();
    return () => { isActive = false; };
  }, [router]);

  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects((previous) => sortSubjects([...previous, newSubject]));
    setShowForm(false);
  };

  const startEditing = (subject: Subject) => {
    setEditingId(subject.id);
    setEditForm({
      name: subject.name,
      code: subject.code ?? '',
      description: subject.description ?? '',
      published: subject.published,
    });
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (subjectId: string) => {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const updates: UpdateSubjectInput = {
        name: editForm.name.trim(),
        code: editForm.code.trim() || undefined,
        description: editForm.description.trim() || undefined,
        published: editForm.published,
      };
      const updated = await updateSubject(subjectId, updates);
      setSubjects((prev) => sortSubjects(prev.map((s) => (s.id === subjectId ? updated : s))));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete subject');
    }
  };

  const subjectSaveCounts = new Map(
    (bookmarkAnalytics?.topSubjects ?? []).map((item) => [item.subject_id, item.count])
  );

  const lowEngagementSubjectIds = new Set(
    (bookmarkAnalytics?.lowEngagementSubjects ?? []).map((item) => item.subject_id)
  );

  const sortedSubjects = [...subjects].sort((left, right) => {
    if (subjectSortMode === 'engagement_low') {
      return (
        (subjectSaveCounts.get(left.id) ?? 0) - (subjectSaveCounts.get(right.id) ?? 0) ||
        left.name.localeCompare(right.name)
      );
    }

    if (subjectSortMode === 'engagement_high') {
      return (
        (subjectSaveCounts.get(right.id) ?? 0) - (subjectSaveCounts.get(left.id) ?? 0) ||
        left.name.localeCompare(right.name)
      );
    }

    return left.name.localeCompare(right.name);
  });

  if (isCheckingAccess) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Checking access...</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Subjects</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">
                Manage subjects and semester mapping
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Create and review VTU subjects with department, semester, and publish status in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowForm((current) => !current)}
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                {showForm ? 'Hide Form' : 'Add Subject'}
              </button>
              <Link
                href="/admin"
                className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </div>

        {showForm ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
            <SubjectForm onSuccess={handleSubjectCreated} />
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {loadError}
          </div>
        ) : null}

        {usingFallbackData ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            Showing fallback subject data because the live Supabase content is unavailable right now.
          </div>
        ) : null}

        {analyticsError ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            {analyticsError}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Existing Subjects</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use engagement badges to spot published subjects that may need stronger resource coverage or discoverability.
              </p>
            </div>
            <label className="block lg:w-72">
              <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Sort subjects</span>
              <select
                value={subjectSortMode}
                onChange={(event) =>
                  setSubjectSortMode(
                    event.target.value as 'name' | 'engagement_low' | 'engagement_high'
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-500"
              >
                <option value="name">Name A-Z</option>
                <option value="engagement_low">Lowest engagement first</option>
                <option value="engagement_high">Highest engagement first</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="text-slate-400">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="text-slate-400">No subjects created yet.</div>
          ) : (
            <div className="grid gap-4">
              {sortedSubjects.map((subject) =>
                editingId === subject.id ? (
                  /* Edit form */
                  <div
                    key={subject.id}
                    className="rounded-2xl border border-brand-700 bg-slate-950/70 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Editing: {subject.name}</span>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-slate-400 transition hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {editError && (
                      <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                        {editError}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs text-slate-400">Subject Name *</span>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-400">Subject Code</span>
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                            placeholder="CS401"
                            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs text-slate-400">Description</span>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="mt-1.5 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.published}
                          onChange={(e) => setEditForm((p) => ({ ...p, published: e.target.checked }))}
                          className="rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-400">Published</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(subject.id)}
                          disabled={isSavingEdit}
                          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                        >
                          {isSavingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Read view */
                  <div
                    key={subject.id}
                    className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{subject.name}</h3>
                        {subject.published ? (
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-300">
                            {subjectSaveCounts.get(subject.id) ?? 0} saves
                          </span>
                        ) : null}
                        {subject.published && lowEngagementSubjectIds.has(subject.id) ? (
                          <span className="rounded-full border border-amber-700 bg-amber-900/40 px-2.5 py-0.5 text-xs text-amber-200">
                            Low engagement
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-400">
                        Code: {subject.code || 'Not assigned'} • Dept: {subject.department_id} • Sem:{' '}
                        {subject.semester_id}
                      </p>
                      {subject.description ? (
                        <p className="mt-1 text-sm text-slate-500">{subject.description}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={
                          subject.published
                            ? 'rounded-full border border-green-700 bg-green-900/50 px-2 py-1 text-xs text-green-300'
                            : 'rounded-full border border-yellow-700 bg-yellow-900/50 px-2 py-1 text-xs text-yellow-300'
                        }
                      >
                        {subject.published ? 'Published' : 'Draft'}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(subject)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                        title="Edit subject"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-950/50 hover:text-red-400"
                        title="Delete subject"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
