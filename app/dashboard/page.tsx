'use client';

import AppShell from '@/components/layout/AppShell';
import SubjectCard from '@/components/student/SubjectCard';
import { getProtectedRouteState, logout } from '@/lib/auth';
import { getAllSemesters, getDepartments, getSubjectResources } from '@/lib/academics';
import { getUserBookmarks } from '@/lib/bookmarks';
import {
  filterSubjectsByDepartmentAndSemester,
  getAvailableSemesterNumbers,
  groupSubjectsByAcademicOrder,
} from '@/lib/subjectOrdering';
import { getPublishedSubjectsResult } from '@/lib/subjects';
import type { AuthUser, Bookmark, Department, Document, Semester, Subject } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SavedResourceItem {
  bookmark: Bookmark;
  document: Document;
  subject: Subject;
  moduleTitle: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState('');
  const [semesterMap, setSemesterMap] = useState<Record<string, string>>({});
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [savedResources, setSavedResources] = useState<SavedResourceItem[]>([]);
  const [savedResourcesLoading, setSavedResourcesLoading] = useState(false);
  const [savedResourcesNotice, setSavedResourcesNotice] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      if (!isActive) return;
      const { user: currentUser, redirectTo } = await getProtectedRouteState('student');
      if (!isActive) return;
      if (redirectTo) { router.push(redirectTo); return; }
      setUser(currentUser);
      setIsCheckingAuth(false);
    };

    checkAuth();
    return () => { isActive = false; };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const loadData = async () => {
      setSubjectsLoading(true);
      setSubjectsError(null);

      try {
        const [subjectsData, departmentsResult, semestersResult] = await Promise.all([
          getPublishedSubjectsResult(),
          getDepartments(),
          getAllSemesters(),
        ]);
        if (!isActive) return;
        setSubjects(subjectsData.data);
        setDepartments(departmentsResult.data);
        setSemesters(semestersResult.data);
        setUsingFallbackData(subjectsData.fallback || departmentsResult.fallback || semestersResult.fallback);
        const map: Record<string, string> = {};
        for (const sem of semestersResult.data) {
          map[sem.id] = sem.title;
        }
        setSemesterMap(map);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load subjects:', error);
        setSubjectsError('Unable to load subjects right now. Please try again in a moment.');
      } finally {
        if (isActive) setSubjectsLoading(false);
      }
    };

    loadData();
    return () => { isActive = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const loadSavedResources = async () => {
      setSavedResourcesLoading(true);
      setSavedResourcesNotice(null);

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
            setSavedResourcesNotice(
              'Using local saved-resource data because live bookmark sync is unavailable right now.'
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
          setSavedResourcesNotice(
            'Some saved resources are using fallback data because live Supabase content is unavailable right now.'
          );
        }
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load saved resources:', error);
        setSavedResourcesNotice('Unable to load saved resources right now.');
      } finally {
        if (isActive) setSavedResourcesLoading(false);
      }
    };

    loadSavedResources();
    return () => {
      isActive = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const departmentFilteredSubjects = filterSubjectsByDepartmentAndSemester(subjects, semesters, {
    departmentId: selectedDepartmentId,
    semesterNumber: selectedSemesterNumber,
  });
  const availableSemesterNumbers = getAvailableSemesterNumbers(
    selectedDepartmentId
      ? filterSubjectsByDepartmentAndSemester(subjects, semesters, {
          departmentId: selectedDepartmentId,
          semesterNumber: '',
        })
      : subjects,
    semesters
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSubjects = departmentFilteredSubjects.filter((subject) => {
    if (!normalizedQuery) {
      return true;
    }

    const semesterTitle = semesterMap[subject.semester_id] ?? '';
    return [subject.name, subject.code, subject.description, semesterTitle]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
  const subjectGroups = groupSubjectsByAcademicOrder(filteredSubjects, { departments, semesters });

  if (isCheckingAuth) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Checking your account...</div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Student dashboard</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Welcome back, {user.full_name}!
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Browse your available subjects and jump into notes, PYQs, solved answers, and module-wise study material.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Logout
          </button>
        </div>

        {subjectsError ? (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {subjectsError}
          </div>
        ) : null}

        {usingFallbackData ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            Showing fallback subject data because the live Supabase content is unavailable right now.
          </div>
        ) : null}

        <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm text-slate-400">Department</span>
            <select
              value={selectedDepartmentId}
              onChange={(event) => {
                setSelectedDepartmentId(event.target.value);
                setSelectedSemesterNumber('');
              }}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Semester</span>
            <select
              value={selectedSemesterNumber}
              onChange={(event) => setSelectedSemesterNumber(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            >
              <option value="">All semesters</option>
              {availableSemesterNumbers.map((number) => (
                <option key={number} value={number}>
                  Semester {number}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Search subjects</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by subject name, code, description, or semester"
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Saved resources</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Pick up where you left off</h2>
              <p className="mt-2 text-slate-300">
                Quick access to the notes, PYQs, and answers you saved for later.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-300">
              {savedResources.length} saved
            </div>
          </div>

          {savedResourcesNotice ? (
            <div className="mt-4 rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">
              {savedResourcesNotice}
            </div>
          ) : null}

          {savedResourcesLoading ? (
            <div className="mt-6 text-slate-400">Loading saved resources...</div>
          ) : savedResources.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-slate-400">
              No saved resources yet. Open a subject and use “Save for later” on any helpful resource.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {savedResources.map((item) => (
                <article
                  key={item.bookmark.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {item.document.type}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{item.document.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {item.subject.name} {item.subject.code ? `• ${item.subject.code}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{item.moduleTitle}</p>
                    </div>
                    <Link
                      href={`/subjects/${item.subject.id}`}
                      className="rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-200 transition hover:border-brand-400 hover:bg-brand-500/20"
                    >
                      Open
                    </Link>
                  </div>

                  {item.document.content ? (
                    <p className="mt-4 line-clamp-3 text-sm text-slate-300">{item.document.content}</p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">
                      Saved resource with an attached file and no inline summary.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6">
          {subjectsLoading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-slate-400">Loading subjects...</div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-slate-400">No published subjects are available yet.</div>
            </div>
          ) : departmentFilteredSubjects.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-slate-400">No subjects match this department and semester.</div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="text-slate-400">No subjects match your search yet.</div>
            </div>
          ) : (
            subjectGroups.map((group) => (
              <div key={group.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                <div className="mt-4 grid gap-6 lg:grid-cols-3">
                  {group.subjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      semesterTitle={semesterMap[subject.semester_id]}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
