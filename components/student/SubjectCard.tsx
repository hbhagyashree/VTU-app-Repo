import Link from 'next/link';
import type { Subject } from '@/types';

interface SubjectCardProps {
  subject: Subject;
  semesterTitle?: string;
}

export default function SubjectCard({ subject, semesterTitle }: SubjectCardProps) {
  return (
    <Link href={`/subjects/${subject.id}`} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 transition hover:border-brand-500 hover:bg-slate-800">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {subject.code || 'No Code'} • {semesterTitle ?? 'Semester'}
      </p>
      <h2 className="mt-4 text-xl font-semibold text-white">{subject.name}</h2>
      {subject.description && (
        <p className="mt-4 text-slate-400">{subject.description}</p>
      )}
      <p className="mt-4 text-slate-400">Subject dashboard for detailed content and resource navigation.</p>
    </Link>
  );
}
