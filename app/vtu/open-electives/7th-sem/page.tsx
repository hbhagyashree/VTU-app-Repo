import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'VTU 7th Sem Open Elective PYQs, Notes and Syllabus – 2022 Scheme',
  description:
    'VTU 7th semester open elective subjects with syllabus, notes, PYQs, important questions and exam preparation materials for 2022 scheme. Content coming soon.',
};

const semesterTabs = [
  { label: '5th Sem Open Electives', href: '/vtu/open-electives/5th-sem', active: false },
  { label: '6th Sem Open Electives', href: '/vtu/open-electives/6th-sem', active: false },
  { label: '7th Sem Open Electives', href: '/vtu/open-electives/7th-sem', active: true },
];

export default function OpenElectives7thSemPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-slate-300">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives" className="transition hover:text-slate-300">VTU Open Electives</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">7th Sem</span>
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
              VTU 7th Sem Open Electives
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300 leading-7">
              Syllabus, notes, PYQs, and important questions for all VTU 7th semester open elective subjects — 2022 scheme.
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

        <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-white/10 bg-slate-900/50 py-20 text-center">
          <p className="text-slate-300 font-semibold">7th Sem Open Electives — Coming Soon</p>
          <p className="max-w-md text-sm text-slate-400">
            Subjects for 7th semester open electives are being added. Check the 6th semester section which is already available.
          </p>
          <Link
            href="/vtu/open-electives/6th-sem"
            className="inline-flex items-center gap-2 rounded-full border border-ocean-400/40 bg-ocean-500/10 px-5 py-2.5 text-sm font-semibold text-ocean-100 transition hover:border-ocean-300"
          >
            View 6th Sem Open Electives
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
