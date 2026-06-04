import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import OpenElectivesClient from '@/components/openElectives/OpenElectivesClient';
import { openElectives6thSem } from '@/data/openElectives';

export const metadata: Metadata = {
  title: 'VTU 6th Sem Open Elective PYQs, Notes and Syllabus – 2022 Scheme',
  description:
    'Find VTU 6th semester open elective subjects with syllabus, notes, PYQs, important questions and exam preparation materials for 2022 scheme.',
  openGraph: {
    title: 'VTU 6th Sem Open Elective PYQs, Notes and Syllabus – 2022 Scheme',
    description:
      'Find VTU 6th semester open elective subjects with syllabus, notes, PYQs, important questions and exam preparation materials for 2022 scheme.',
  },
};

const semesterTabs = [
  { label: '5th Sem Open Electives', href: '/vtu/open-electives/5th-sem', active: false },
  { label: '6th Sem Open Electives', href: '/vtu/open-electives/6th-sem', active: true },
  { label: '7th Sem Open Electives', href: '/vtu/open-electives/7th-sem', active: false },
];

const allDepartments = [...new Set(openElectives6thSem.map((s) => s.offeredBy))];

export default function OpenElectives6thSemPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-slate-300">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives" className="transition hover:text-slate-300">VTU Open Electives</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">6th Sem</span>
        </nav>

        <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.12),transparent_35%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ocean-300/30 bg-ocean-500/10 px-4 py-1.5 text-sm font-medium text-ocean-100">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              2022 Scheme
            </div>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              VTU 6th Sem Open Electives
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300 leading-7">
              Syllabus, notes, PYQs, and important questions for all VTU 6th semester open elective subjects — 2022 scheme. Choose a subject to start studying.
            </p>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Semester selection">
          {semesterTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={tab.active}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                tab.active
                  ? 'border border-ocean-400/50 bg-ocean-500/20 text-ocean-100'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <OpenElectivesClient
          subjects={openElectives6thSem}
          semSlug="6th-sem"
          allDepartments={allDepartments}
        />

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/50 p-6 text-center">
          <p className="text-sm text-slate-400">Looking for regular department subjects?</p>
          <Link
            href="/subjects"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-brand-300/40"
          >
            Browse Department Subjects
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
