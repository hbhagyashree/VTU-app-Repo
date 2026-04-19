import AppShell from '@/components/layout/AppShell';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Cpu,
  FileQuestion,
  FlaskConical,
  LayoutDashboard,
  Search,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    title: 'Organized subject content',
    description: 'Browse departments, semester subjects, and module-level notes with fast access.',
    icon: BookOpen,
  },
  {
    title: 'Student dashboard',
    description: 'Select your department, semester, and subject to open your study space.',
    icon: LayoutDashboard,
  },
  {
    title: 'Curated study resources',
    description: 'Published notes and exam materials stay organized by subject and module.',
    icon: Cpu,
  },
];

const resourceTiles = [
  {
    title: 'Notes Library',
    description: 'Module-wise notes and uploaded PDFs for quick revision.',
    icon: BookOpen,
  },
  {
    title: 'PYQ Practice',
    description: 'Previous-year questions grouped with subject context.',
    icon: FileQuestion,
  },
  {
    title: 'Lab Resources',
    description: 'Keep lab manuals and practical references organized.',
    icon: FlaskConical,
  },
  {
    title: 'Exam Tools',
    description: 'A focused space for calculators, saved resources, and revision flow.',
    icon: Calculator,
  },
];

const branchTiles = [
  'Computer Science',
  'Information Science',
  'AI & Machine Learning',
  'AI & Data Science',
  'Electronics & Communication',
  'Mechanical',
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/40 p-5 shadow-2xl shadow-slate-950/30 sm:rounded-[2rem] sm:p-10 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.14),transparent_30%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <Sparkles className="h-4 w-4" />
              VTU exam prep, organized by subject
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
              Study faster with notes, PYQs, and solved answers in one calm workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              VTU SmartPrep keeps module-wise resources, uploaded PDFs, and saved study materials behind a clean student login, so revision feels focused from the first click.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-950/30 transition hover:scale-[1.02]">
                Sign in to continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10">
                Create student account
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-ocean-300">Study flow</p>
              <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">Everything students need after login</h2>
              <div className="mt-6 space-y-4">
                {[
                  'Open published subjects only',
                  'Read module-wise notes and PDFs',
                  'Preview resources before opening files',
                  'Save important material for later',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-brand-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ocean-400/15 text-ocean-200">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-ocean-300">Fast discovery</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Find the right resource by subject, module, or file name.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Students can search after login, open published subjects, preview notes, and save useful PDFs for later revision.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-brand-200">Study schemes</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {['2022 Scheme', '2025 Scheme', 'Semester Notes', 'Exam PYQs'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="group rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-brand-300/40">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-ocean-400/20">
              <feature.icon className="h-6 w-6 text-brand-200" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-slate-300">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-brand-200">Resource hub</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Built around how VTU students actually search.</h2>
          <p className="mt-3 text-slate-300">
            This design keeps the resource-hub feel students expect, while keeping your app original, private, and cleaner for logged-in study.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {resourceTiles.map((tile) => (
            <article key={tile.title} className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 transition hover:border-ocean-300/40 hover:bg-slate-900/80">
              <tile.icon className="h-6 w-6 text-ocean-300" />
              <h3 className="mt-4 font-semibold text-white">{tile.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{tile.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-ocean-300">Popular branches</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Organize resources by branch and semester.</h2>
          </div>
          <Link href="/login" className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-brand-300/40">
            Login to browse
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branchTiles.map((branch) => (
            <div key={branch} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">{branch}</p>
              <p className="mt-1 text-sm text-slate-400">Notes, PYQs, and module resources</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
