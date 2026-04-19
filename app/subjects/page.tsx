'use client';

import AppShell from '@/components/layout/AppShell';
import SubjectCard from '@/components/student/SubjectCard';
import { getAllSemesters, getDepartments } from '@/lib/academics';
import { getProtectedRouteState } from '@/lib/auth';
import {
  filterSubjectsByDepartmentAndSemester,
  getAvailableSemesterNumbers,
  groupSubjectsByAcademicOrder,
} from '@/lib/subjectOrdering';
import { getPublishedSubjectsResult } from '@/lib/subjects';
import type { Department, Semester, Subject } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState('');
  const [semesterMap, setSemesterMap] = useState<Record<string, string>>({});
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      const { redirectTo } = await getProtectedRouteState('student');
      if (!isActive) return;
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      setIsCheckingAuth(false);
      setIsLoading(true);
      setError(null);

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
      } catch (loadError) {
        if (!isActive) return;
        console.error('Failed to load subjects:', loadError);
        setError('Unable to load subjects right now. Please try again in a moment.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadData();
    return () => { isActive = false; };
  }, [router]);

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

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {isCheckingAuth ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400">Checking your account...</div>
          </div>
        ) : (
          <>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Subjects</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">All Available Subjects</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Explore published subjects and open each dashboard for modules, notes, PYQs, and solved answers.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {error}
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

        <section className="grid gap-6">
          {isLoading ? (
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
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}
      </div>
    </AppShell>
  );
}
