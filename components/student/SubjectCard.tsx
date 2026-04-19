import Link from 'next/link';
import type { Subject } from '@/types';

interface SubjectCardProps {
  subject: Subject;
  semesterTitle?: string;
}

export default function SubjectCard({ subject, semesterTitle }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${subject.id}`}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-brand-300/60 hover:bg-slate-900"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl transition group-hover:bg-brand-400/20" />
      <p className="relative text-xs uppercase tracking-[0.3em] text-brand-200">
        {subject.code || 'No Code'} • {semesterTitle ?? 'Semester'}
      </p>
      <h2 className="relative mt-4 text-xl font-semibold text-white">{subject.name}</h2>
      {subject.description && (
        <p className="relative mt-4 text-slate-400">{subject.description}</p>
      )}
      <p className="relative mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
        Open study space
      </p>
    </Link>
  );
}
