import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  FileQuestion,
  FileText,
  Lightbulb,
  Star,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { openElectives6thSem } from '@/data/openElectives';

interface Props {
  params: { subjectSlug: string };
}

export function generateStaticParams() {
  return openElectives6thSem.map((s) => ({ subjectSlug: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const subject = openElectives6thSem.find((s) => s.slug === params.subjectSlug);
  if (!subject) return {};
  return {
    title: `${subject.code} ${subject.name} – VTU 6th Sem Open Elective`,
    description: `VTU ${subject.name} (${subject.code}) 6th semester open elective — syllabus, module notes, PYQs, important questions and exam preparation tips. 2022 scheme.`,
    openGraph: {
      title: `${subject.code} ${subject.name} – VTU 6th Sem Open Elective`,
      description: `VTU ${subject.name} (${subject.code}) 6th semester open elective — syllabus, module notes, PYQs, important questions and exam preparation tips. 2022 scheme.`,
    },
  };
}

const sections = [
  {
    id: 'syllabus',
    label: 'Syllabus',
    Icon: FileText,
    description: 'Official VTU 2022 scheme syllabus for this open elective subject.',
  },
  {
    id: 'module-1',
    label: 'Module 1 Notes',
    Icon: BookOpen,
    description: 'Lecture notes and study material for Module 1.',
  },
  {
    id: 'module-2',
    label: 'Module 2 Notes',
    Icon: BookOpen,
    description: 'Lecture notes and study material for Module 2.',
  },
  {
    id: 'module-3',
    label: 'Module 3 Notes',
    Icon: BookOpen,
    description: 'Lecture notes and study material for Module 3.',
  },
  {
    id: 'module-4',
    label: 'Module 4 Notes',
    Icon: BookOpen,
    description: 'Lecture notes and study material for Module 4.',
  },
  {
    id: 'module-5',
    label: 'Module 5 Notes',
    Icon: BookOpen,
    description: 'Lecture notes and study material for Module 5.',
  },
  {
    id: 'pyqs',
    label: 'Previous Year Questions',
    Icon: FileQuestion,
    description: 'PYQs from past VTU exams for this open elective — sorted by year.',
  },
  {
    id: 'important-questions',
    label: 'Important Questions',
    Icon: Star,
    description: 'Curated high-priority questions frequently asked in VTU exams.',
  },
  {
    id: 'exam-tips',
    label: 'Exam Preparation Tips',
    Icon: Lightbulb,
    description: 'Practical tips to prepare effectively for this open elective exam.',
  },
] as const;

export default function OpenElectiveSubjectPage({ params }: Props) {
  const subject = openElectives6thSem.find((s) => s.slug === params.subjectSlug);
  if (!subject) notFound();

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-slate-300">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives" className="transition hover:text-slate-300">Open Electives</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives/6th-sem" className="transition hover:text-slate-300">6th Sem</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">{subject.code}</span>
        </nav>

        <header className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(34,211,238,0.10),transparent_35%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <Link
              href="/vtu/open-electives/6th-sem"
              className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to 6th Sem Open Electives
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ocean-400/40 bg-ocean-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ocean-200">
                {subject.code}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {subject.scheme}
              </span>
              <span className="rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-xs text-brand-200">
                Open Elective
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
              {subject.name}
            </h1>
            <p className="mt-2 text-slate-400">
              Offered by {subject.offeredBy} &middot; {subject.semester}
            </p>
          </div>
        </header>

        <nav aria-label="Section quick links">
          <div className="flex flex-wrap gap-2">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-ocean-300/40 hover:text-white"
              >
                {sec.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-6">
          {sections.map(({ id, label, Icon, description }) => (
            <section
              key={id}
              id={id}
              className="scroll-mt-24 rounded-3xl border border-white/10 bg-slate-900/70 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ocean-400/10">
                  <Icon className="h-5 w-5 text-ocean-300" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-white">{label}</h2>
              </div>
              <p className="mt-3 text-slate-400">{description}</p>
              <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 py-10">
                <p className="text-sm text-slate-500">Content coming soon — check back later.</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
