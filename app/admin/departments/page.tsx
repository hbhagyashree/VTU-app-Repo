'use client';

import AdminShell from '@/components/layout/AdminShell';
import { getProtectedRouteState } from '@/lib/auth';
import {
  createDepartment,
  createSemester,
  deleteDepartment,
  deleteSemester,
  getDepartments,
  getSemestersByDepartment,
} from '@/lib/academics';
import type { CreateDepartmentInput, Department, Semester } from '@/types';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DepartmentWithSemesters extends Department {
  semesters: Semester[];
  expanded: boolean;
}

const initialDeptForm: CreateDepartmentInput = { name: '', slug: '', description: '' };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [departments, setDepartments] = useState<DepartmentWithSemesters[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm] = useState<CreateDepartmentInput>(initialDeptForm);
  const [deptFormError, setDeptFormError] = useState<string | null>(null);
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [addSemesterFor, setAddSemesterFor] = useState<string | null>(null);
  const [semesterForm, setSemesterForm] = useState({ number: '', title: '' });
  const [semesterFormError, setSemesterFormError] = useState<string | null>(null);
  const [isSubmittingSemester, setIsSubmittingSemester] = useState(false);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      const { redirectTo } = await getProtectedRouteState('admin');
      if (!isActive) return;
      if (redirectTo) { router.push(redirectTo); return; }
      setIsCheckingAccess(false);
      await loadDepartments(isActive);
    };

    const loadDepartments = async (active: boolean) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data } = await getDepartments();
        if (!active) return;
        const withSemesters: DepartmentWithSemesters[] = await Promise.all(
          data.map(async (dept) => {
            const { data: sems } = await getSemestersByDepartment(dept.id);
            return { ...dept, semesters: sems, expanded: true };
          })
        );
        if (active) setDepartments(withSemesters);
      } catch {
        if (active) setLoadError('Unable to load departments. Please try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    init();
    return () => { isActive = false; };
  }, [router]);

  const handleDeptFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeptForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && !prev.slug) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.slug.trim()) {
      setDeptFormError('Name and slug are required.');
      return;
    }
    setIsSubmittingDept(true);
    setDeptFormError(null);
    try {
      const { data } = await createDepartment(deptForm);
      setDepartments((prev) => [...prev, { ...data, semesters: [], expanded: true }]);
      setDeptForm(initialDeptForm);
      setShowDeptForm(false);
    } catch (err) {
      setDeptFormError(err instanceof Error ? err.message : 'Failed to create department');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Delete this department and all its semesters?')) return;
    await deleteDepartment(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const toggleExpand = (id: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, expanded: !d.expanded } : d))
    );
  };

  const handleSemesterFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSemesterForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'number' && value) {
        next.title = `Semester ${value}`;
      }
      return next;
    });
  };

  const handleCreateSemester = async (e: React.FormEvent, departmentId: string) => {
    e.preventDefault();
    const num = parseInt(semesterForm.number, 10);
    if (!num || num < 1 || num > 10) {
      setSemesterFormError('Enter a valid semester number (1–10).');
      return;
    }
    setIsSubmittingSemester(true);
    setSemesterFormError(null);
    try {
      const { data } = await createSemester({
        department_id: departmentId,
        number: num,
        title: semesterForm.title || `Semester ${num}`,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === departmentId
            ? { ...d, semesters: [...d.semesters, data].sort((a, b) => a.number - b.number) }
            : d
        )
      );
      setSemesterForm({ number: '', title: '' });
      setAddSemesterFor(null);
    } catch (err) {
      setSemesterFormError(err instanceof Error ? err.message : 'Failed to create semester');
    } finally {
      setIsSubmittingSemester(false);
    }
  };

  const handleDeleteSemester = async (semesterId: string, departmentId: string) => {
    if (!confirm('Delete this semester?')) return;
    await deleteSemester(semesterId);
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === departmentId
          ? { ...d, semesters: d.semesters.filter((s) => s.id !== semesterId) }
          : d
      )
    );
  };

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
        {/* Header */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Departments</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Manage departments and semesters</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Create VTU departments, then add semesters under each one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeptForm((v) => !v)}
              className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              {showDeptForm ? 'Cancel' : 'Add Department'}
            </button>
          </div>
        </div>

        {/* Add Department Form */}
        {showDeptForm && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
            <h2 className="mb-6 text-lg font-semibold text-white">New Department</h2>
            {deptFormError && (
              <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
                {deptFormError}
              </div>
            )}
            <form onSubmit={handleCreateDepartment} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-400">Department Name *</span>
                  <input
                    type="text"
                    name="name"
                    value={deptForm.name}
                    onChange={handleDeptFormChange}
                    required
                    placeholder="Computer Science and Engineering"
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">Slug *</span>
                  <input
                    type="text"
                    name="slug"
                    value={deptForm.slug}
                    onChange={handleDeptFormChange}
                    required
                    placeholder="cse"
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-slate-400">Description</span>
                <textarea
                  name="description"
                  value={deptForm.description ?? ''}
                  onChange={handleDeptFormChange}
                  rows={2}
                  placeholder="Brief description..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmittingDept}
                className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingDept ? 'Creating...' : 'Create Department'}
              </button>
            </form>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            {loadError}
          </div>
        )}

        {/* Departments List */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <h2 className="mb-6 text-xl font-semibold text-white">Departments</h2>

          {isLoading ? (
            <div className="text-slate-400">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="text-slate-400">No departments yet. Add one above.</div>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept.id} className="rounded-2xl border border-slate-700 bg-slate-950/50">
                  {/* Department row */}
                  <div className="flex items-center justify-between p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(dept.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {dept.expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div>
                        <span className="font-semibold text-white">{dept.name}</span>
                        <span className="ml-2 text-xs text-slate-500">/{dept.slug}</span>
                        {dept.description && (
                          <p className="mt-0.5 text-sm text-slate-500">{dept.description}</p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {dept.semesters.length} semester{dept.semesters.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950/50 hover:text-red-400"
                        title="Delete department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Semesters */}
                  {dept.expanded && (
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      {dept.semesters.length === 0 ? (
                        <p className="text-sm text-slate-500">No semesters yet.</p>
                      ) : (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {dept.semesters.map((sem) => (
                            <div
                              key={sem.id}
                              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5"
                            >
                              <span className="text-sm text-slate-200">{sem.title}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSemester(sem.id, dept.id)}
                                className="text-slate-500 transition hover:text-red-400"
                                title="Delete semester"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {addSemesterFor === dept.id ? (
                        <form
                          onSubmit={(e) => handleCreateSemester(e, dept.id)}
                          className="mt-2 flex items-start gap-3"
                        >
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              name="number"
                              value={semesterForm.number}
                              onChange={handleSemesterFormChange}
                              min={1}
                              max={10}
                              placeholder="No."
                              className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              name="title"
                              value={semesterForm.title}
                              onChange={handleSemesterFormChange}
                              placeholder="Semester 4"
                              className="w-36 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            />
                          </div>
                          {semesterFormError && (
                            <p className="self-center text-xs text-red-400">{semesterFormError}</p>
                          )}
                          <button
                            type="submit"
                            disabled={isSubmittingSemester}
                            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                          >
                            {isSubmittingSemester ? '...' : 'Add'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAddSemesterFor(null); setSemesterFormError(null); setSemesterForm({ number: '', title: '' }); }}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setAddSemesterFor(dept.id); setSemesterFormError(null); setSemesterForm({ number: '', title: '' }); }}
                          className="mt-1 flex items-center gap-1.5 text-sm text-brand-400 transition hover:text-brand-300"
                        >
                          <Plus className="h-4 w-4" />
                          Add Semester
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
