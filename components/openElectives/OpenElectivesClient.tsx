'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { OpenElectiveSubject } from '@/data/openElectives';
import OpenElectiveCard from './OpenElectiveCard';

interface OpenElectivesClientProps {
  subjects: OpenElectiveSubject[];
  semSlug: string;
  allDepartments: string[];
}

export default function OpenElectivesClient({
  subjects,
  semSlug,
  allDepartments,
}: OpenElectivesClientProps) {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesDept = !filterDept || s.offeredBy === filterDept;
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.offeredBy.toLowerCase().includes(query);
      return matchesDept && matchesSearch;
    });
  }, [subjects, search, filterDept]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">Search by name or code</span>
          <div className="relative mt-2">
            <Search
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. BRA654C or Robotics"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-slate-100 outline-none transition focus:border-ocean-500"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Filter by offering department</span>
          <div className="relative mt-2">
            <SlidersHorizontal
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-slate-100 outline-none transition focus:border-ocean-500"
            >
              <option value="">All departments</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-slate-900/50 py-16">
          <p className="text-slate-400">No subjects match your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subject) => (
            <OpenElectiveCard key={subject.code} subject={subject} semSlug={semSlug} />
          ))}
        </div>
      )}

      <p className="text-center text-sm text-slate-500">
        Showing {filtered.length} of {subjects.length} subject
        {subjects.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
