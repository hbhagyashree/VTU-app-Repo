import Link from 'next/link';
import { BookOpen, FileQuestion, FileText, Star } from 'lucide-react';
import type { OpenElectiveSubject } from '@/data/openElectives';

interface OpenElectiveCardProps {
  subject: OpenElectiveSubject;
  semSlug: string;
}

const actionButtons = [
  { label: 'Syllabus', Icon: FileText, anchor: 'syllabus' },
  { label: 'Notes', Icon: BookOpen, anchor: 'notes' },
  { label: 'PYQs', Icon: FileQuestion, anchor: 'pyqs' },
  { label: 'Important Questions', Icon: Star, anchor: 'important-questions' },
] as const;

export default function OpenElectiveCard({ subject, semSlug }: OpenElectiveCardProps) {
  const detailPath = `/vtu/open-electives/${semSlug}/${subject.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-ocean-400/40 hover:bg-slate-900">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-ocean-500/10 blur-2xl transition group-hover:bg-ocean-400/20" aria-hidden="true" />

      <div className="relative flex flex-wrap items-center gap-2">
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

      <h2 className="relative mt-4 text-lg font-semibold leading-snug text-white">
        {subject.name}
      </h2>

      <dl className="relative mt-3 space-y-1 text-sm text-slate-400">
        <div className="flex gap-1">
          <dt className="text-slate-500">Offered by:</dt>
          <dd>{subject.offeredBy}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-slate-500">Semester:</dt>
          <dd>{subject.semester}</dd>
        </div>
      </dl>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {actionButtons.map(({ label, Icon, anchor }) => (
          <Link
            key={label}
            href={`${detailPath}#${anchor}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-ocean-300/50 hover:bg-ocean-500/10 hover:text-ocean-100"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </article>
  );
}
