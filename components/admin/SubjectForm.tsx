'use client';

import { getDepartments, getSemestersByDepartment } from '@/lib/academics';
import { createSubject } from '@/lib/subjects';
import type { CreateSubjectInput, Department, Semester, Subject } from '@/types';
import { useEffect, useState } from 'react';

interface SubjectFormProps {
  onSuccess: (subject: Subject) => void;
}

const initialFormData: CreateSubjectInput = {
  name: '',
  code: '',
  description: '',
  department_id: '',
  semester_id: '',
  published: false,
};

export default function SubjectForm({ onSuccess }: SubjectFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSubjectInput>(initialFormData);

  useEffect(() => {
    let isActive = true;

    const loadDepartments = async () => {
      setIsOptionsLoading(true);
      setOptionsError(null);

      try {
        if (!isActive) {
          return;
        }

        const result = await getDepartments();
        if (!isActive) {
          return;
        }

        setDepartments(result.data);
        if (result.fallback) {
          setOptionsError('Using fallback department data because Supabase is unavailable.');
        }
      } finally {
        if (isActive) {
          setIsOptionsLoading(false);
        }
      }
    };

    loadDepartments();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSemesters = async () => {
      if (!formData.department_id) {
        setSemesters([]);
        return;
      }

      if (!isActive) {
        return;
      }

      const result = await getSemestersByDepartment(formData.department_id);
      if (!isActive) {
        return;
      }

      setSemesters(result.data);
      if (result.fallback) {
        setOptionsError('Using fallback semester data because Supabase is unavailable.');
      }
    };

    loadSemesters();

    return () => {
      isActive = false;
    };
  }, [formData.department_id]);

  const availableSemesters = semesters.filter(
    (semester) => semester.department_id === formData.department_id
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const newSubject = await createSubject(formData);
      setFormData(initialFormData);
      onSuccess(newSubject);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const nextValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;

    setFormData((previous) => {
      const nextFormData = {
        ...previous,
        [name]: nextValue,
      };

      if (name === 'department_id') {
        nextFormData.semester_id = '';
      }

      return nextFormData;
    });
  };

  return (
    <div>
      <h3 className="mb-6 text-lg font-semibold text-white">Create New Subject</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {optionsError ? (
          <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">
            {optionsError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block">
              <span className="text-sm text-slate-400">Subject Name *</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Analysis and Design of Algorithms"
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-sm text-slate-400">Subject Code</span>
              <input
                type="text"
                name="code"
                value={formData.code ?? ''}
                onChange={handleChange}
                placeholder="CS401"
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block">
              <span className="text-sm text-slate-400">Department *</span>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
                disabled={isOptionsLoading}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
              >
                <option value="">
                  {isOptionsLoading ? 'Loading Departments...' : 'Select Department'}
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-sm text-slate-400">Semester *</span>
              <select
                name="semester_id"
                value={formData.semester_id}
                onChange={handleChange}
                required
                disabled={!formData.department_id}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {formData.department_id ? 'Select Semester' : 'Select Department First'}
                </option>
                {availableSemesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div>
          <label className="block">
            <span className="text-sm text-slate-400">Description</span>
            <textarea
              name="description"
              value={formData.description ?? ''}
              onChange={handleChange}
              placeholder="Brief description of the subject..."
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="published"
              checked={formData.published ?? false}
              onChange={handleChange}
              className="rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-400">Publish immediately</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Subject'}
          </button>
        </div>
      </form>
    </div>
  );
}
