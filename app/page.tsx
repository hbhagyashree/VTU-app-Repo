import AppShell from '@/components/layout/AppShell';

import Link from 'next/link';
import { ArrowRight, BookOpen, Cpu, LayoutDashboard } from 'lucide-react';

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
    title: 'Admin control panel',
    description: 'Manage departments, subjects and upload curriculum resources from one place.',
    icon: Cpu,
  },
];

export default function HomePage() {
  return (
  <AppShell>

      <section className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-brand-300">VTU SmartPrep</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Exam-ready study content for VTU students, backed by AI and college syllabus structure.
          </h1>
          <p className="mt-6 max-w-xl text-slate-300 sm:text-lg">
            Access subject notes, PYQs, solved answers, and admin-managed resources in one reliable platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">
              Open student dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500">
              Open admin dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-900/40">
          <h2 className="text-xl font-semibold text-white">Phase 1 MVP</h2>
          <ul className="mt-6 space-y-4 text-slate-300">
            <li>Authentication scaffolding</li>
            <li>Admin content structure</li>
            <li>Subject and module pages</li>
            <li>Notes, PYQ, solved answer tabs</li>
            <li>Supabase-ready schema</li>
          </ul>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm shadow-slate-950/20">
            <feature.icon className="h-7 w-7 text-brand-400" />
            <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-slate-300">{feature.description}</p>
          </article>
        ))}
      </section>
     </AppShell>
);

}
