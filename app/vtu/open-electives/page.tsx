import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { openElectives5thSem, openElectives6thSem, openElectives7thSem } from '@/data/openElectives';

export const metadata: Metadata = {
  title: 'VTU Open Electives – 5th, 6th & 7th Sem Subjects | VTU SmartPrep',
  description:
    'Explore VTU open elective subjects for 5th, 6th and 7th semester with syllabus, notes, PYQs and important questions — 2022 scheme.',
  openGraph: {
    title: 'VTU Open Electives – 5th, 6th & 7th Sem Subjects | VTU SmartPrep',
    description:
      'Explore VTU open elective subjects for 5th, 6th and 7th semester with syllabus, notes, PYQs and important questions — 2022 scheme.',
  },
};

const semesterCards = [
  {
    sem: '5th Sem',
    label: '5th Sem Open Electives',
    href: '/vtu/open-electives/5th-sem',
    description: 'Open elective subjects offered in 5th semester.',
    count: openElectives5thSem.length,
  },
  {
    sem: '6th Sem',
    label: '6th Sem Open Electives',
    href: '/vtu/open-electives/6th-sem',
    description: 'Open elective subjects offered in 6th semester.',
    count: openElectives6thSem.length,
    featured: true,
  },
  {
    sem: '7th Sem',
    label: '7th Sem Open Electives',
    href: '/vtu/open-electives/7th-sem',
    description: 'Open elective subjects offered in 7th semester.',
    count: openElectives7thSem.length,
  },
];

export default function OpenElectivesIndexPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300 transition">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">VTU Open Electives</span>
        </nav>

        <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.10),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(34,211,238,0.10),transparent_30%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ocean-300/30 bg-ocean-500/10 px-4 py-1.5 text-sm font-medium text-ocean-100">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              2022 Scheme
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              VTU Open Elective Subjects
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300 leading-7">
              Open elective subjects are chosen by students from any department outside their own. All open elective resources are kept in one place — no need to search inside CSE, ISE, AIML, or other department pages.
            </p>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-3">
          {semesterCards.map((card) => (
            <Link
              key={card.sem}
              href={card.href}
              className={`group relative overflow-hidden rounded-3xl border p-6 shadow-xl transition hover:-translate-y-1 ${
                card.featured
                  ? 'border-ocean-400/40 bg-ocean-500/5 hover:border-ocean-300/60'
                  : 'border-white/10 bg-slate-900/70 hover:border-white/25'
              }`}
            >
              <div
                className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-ocean-500/10 blur-2xl transition group-hover:bg-ocean-400/20"
                aria-hidden="true"
              />
              <p className="relative text-lg font-bold text-white">{card.label}</p>
              <p className="relative mt-2 text-sm text-slate-400">{card.description}</p>
              <p className="relative mt-3 text-xs text-ocean-300">
                {card.count} subject{card.count !== 1 ? 's' : ''} available
              </p>
              <div className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-200 group-hover:text-white">
                View subjects
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/50 p-6">
          <h2 className="font-semibold text-white">What are VTU Open Electives?</h2>
          <p className="mt-3 text-slate-300 leading-7">
            VTU open elective subjects are courses that students can choose from any department outside their own. For example, a CSE student can select a subject offered by the Robotics, Mechanical, or Civil department. This section keeps all open elective study resources — syllabus, notes, PYQs, and important questions — in one dedicated space so you never have to look inside individual department pages.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
