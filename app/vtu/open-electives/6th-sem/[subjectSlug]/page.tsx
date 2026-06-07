'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, FileText, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { openElectives6thSem } from '@/data/openElectives';
import { getSubjectByCode } from '@/lib/subjects';
import { getSubjectResources } from '@/lib/academics';
import {
  getEmbeddedFileKind,
  getEmbeddedFileUrl,
  getFileLabel,
  getModuleDisplayTitle,
} from '@/lib/resourceDisplay';
import type { Document, Module } from '@/types';

interface Props {
  params: { subjectSlug: string };
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  notes: 'Notes',
  pyq: 'PYQ',
  syllabus: 'Syllabus',
  'important-question': 'Important Question',
  'solved-answer': 'Solved Answer',
  textbook: 'Textbook',
};

function ResourceCard({
  document,
  onPreview,
}: {
  document: Document;
  onPreview: (doc: Document) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h5 className="text-base font-semibold text-white">{document.title}</h5>
        <span className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
          {RESOURCE_TYPE_LABELS[document.type] ?? document.type}
        </span>
      </div>

      {document.content && (
        <p className="mt-3 text-sm text-slate-400">{document.content}</p>
      )}

      {document.file_url && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
          <FileText className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
          {getFileLabel(document.file_url)}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => onPreview(document)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-ocean-400/50"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          {document.file_url ? 'Read inside website' : 'Preview resource'}
        </button>
      </div>
    </article>
  );
}

export default function OpenElectiveSubjectPage({ params }: Props) {
  const subject = openElectives6thSem.find((s) => s.slug === params.subjectSlug);

  const [modules, setModules] = useState<Module[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notInSupabase, setNotInSupabase] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (!subject) return;

    let active = true;
    setIsLoading(true);
    setNotInSupabase(false);

    async function load() {
      // Prefer explicit supabaseSubjectId; fall back to code lookup
      const subjectId =
        subject!.supabaseSubjectId ?? (await getSubjectByCode(subject!.code))?.id;

      if (!active) return;

      if (!subjectId) {
        setNotInSupabase(true);
        setIsLoading(false);
        return;
      }

      const result = await getSubjectResources(subjectId);
      if (!active) return;

      setModules(result.modules);
      setDocuments(result.documents);
      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, [subject?.code, subject?.supabaseSubjectId]);

  if (!subject) notFound();

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-slate-300">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives" className="transition hover:text-slate-300">Open Electives</Link>
          <span aria-hidden="true">/</span>
          <Link href="/vtu/open-electives/6th-sem" className="transition hover:text-slate-300">6th Sem</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">{subject.code}</span>
        </nav>

        {/* Header */}
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

        {/* Resources */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-slate-400">Loading study resources...</p>
          </div>
        ) : notInSupabase ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-slate-900/50 py-16 text-center">
            <p className="font-semibold text-slate-300">Resources coming soon</p>
            <p className="max-w-md text-sm text-slate-400">
              Study materials for this subject are being prepared. Check back later.
            </p>
          </div>
        ) : modules.length === 0 && documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-slate-900/50 py-16 text-center">
            <p className="font-semibold text-slate-300">No resources published yet</p>
            <p className="max-w-md text-sm text-slate-400">
              Resources for this subject have not been published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {modules.map((mod) => {
              const modDocs = documents.filter((d) => d.module_id === mod.id);
              if (modDocs.length === 0) return null;
              return (
                <section
                  key={mod.id}
                  id={`module-${mod.order}`}
                  className="scroll-mt-24 rounded-3xl border border-white/10 bg-slate-900/70 p-6"
                >
                  <h2 className="text-xl font-semibold text-white">{getModuleDisplayTitle(mod)}</h2>
                  {mod.description && (
                    <p className="mt-2 text-sm text-slate-400">{mod.description}</p>
                  )}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {modDocs.map((doc) => (
                      <ResourceCard key={doc.id} document={doc} onPreview={setPreviewDocument} />
                    ))}
                  </div>
                </section>
              );
            })}

            {(() => {
              const unlinked = documents.filter(
                (d) => !modules.some((m) => m.id === d.module_id)
              );
              if (unlinked.length === 0) return null;
              return (
                <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                  <h2 className="text-xl font-semibold text-white">General Resources</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {unlinked.map((doc) => (
                      <ResourceCard key={doc.id} document={doc} onPreview={setPreviewDocument} />
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}
      </div>

      {/* PDF preview modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[96vh] w-full max-w-[min(96vw,1400px)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {RESOURCE_TYPE_LABELS[previewDocument.type] ?? previewDocument.type}
                </span>
                <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white sm:text-xl">
                  {previewDocument.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="shrink-0 rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {previewDocument.file_url ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4 py-2">
                  <p className="inline-flex min-w-0 items-center gap-2 text-xs text-slate-300">
                    <FileText className="h-4 w-4 text-brand-300" aria-hidden="true" />
                    <span className="truncate">{getFileLabel(previewDocument.file_url)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {getEmbeddedFileKind(previewDocument.file_url) === 'folder'
                      ? 'Folder preview inside VTU SmartPrep'
                      : 'Viewing inside VTU SmartPrep'}
                  </p>
                </div>
                {getEmbeddedFileUrl(previewDocument.file_url) ? (
                  <iframe
                    src={getEmbeddedFileUrl(previewDocument.file_url) ?? undefined}
                    title={previewDocument.title}
                    className="min-h-0 flex-1 bg-white"
                  />
                ) : (
                  <p className="p-6 text-sm text-slate-400">
                    This file could not be previewed in the browser.
                  </p>
                )}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Content preview</p>
                  {previewDocument.content ? (
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {previewDocument.content}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">This resource has no inline text yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
