import AppShell from '@/components/layout/AppShell';

import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Cpu, LayoutDashboard, Sparkles } from 'lucide-react';

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
    </AppShell>
  );
}
