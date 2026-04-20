import type { Document } from '@/types';

export function getFileLabel(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : 'Attached file';
  } catch {
    return 'Attached file';
  }
}

function getGoogleDriveFileId(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);

    if (!url.hostname.includes('drive.google.com')) {
      return null;
    }

    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }

    return url.searchParams.get('id');
  } catch {
    return null;
  }
}

export function getEmbeddedFileUrl(fileUrl?: string): string | null {
  if (!fileUrl) {
    return null;
  }

  const driveFileId = getGoogleDriveFileId(fileUrl);
  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }

  return fileUrl;
}

export function getDocumentYear(document: Document): number | null {
  const metadataYear = document.metadata?.year;

  if (typeof metadataYear === 'number' && Number.isInteger(metadataYear)) {
    return metadataYear;
  }

  if (typeof metadataYear === 'string') {
    const parsedYear = Number.parseInt(metadataYear, 10);
    if (Number.isInteger(parsedYear)) {
      return parsedYear;
    }
  }

  const yearMatch = [document.title, document.content]
    .filter(Boolean)
    .join(' ')
    .match(/\b(20\d{2})\b/);

  return yearMatch ? Number.parseInt(yearMatch[1], 10) : null;
}

export function getDocumentYearLabel(document: Document): string {
  return getDocumentYear(document)?.toString() ?? 'Year not specified';
}

export function sortDocumentsForStudy(left: Document, right: Document): number {
  const leftYear = getDocumentYear(left);
  const rightYear = getDocumentYear(right);

  if (left.type === 'pyq' || right.type === 'pyq') {
    if (leftYear !== rightYear) {
      return (rightYear ?? 0) - (leftYear ?? 0);
    }
  }

  return (
    left.title.localeCompare(right.title) ||
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export function groupDocumentsByYear(documents: Document[]): Array<{
  yearLabel: string;
  documents: Document[];
}> {
  const groups = new Map<string, Document[]>();

  for (const document of [...documents].sort(sortDocumentsForStudy)) {
    const yearLabel = getDocumentYearLabel(document);
    groups.set(yearLabel, [...(groups.get(yearLabel) ?? []), document]);
  }

  return [...groups.entries()].map(([yearLabel, groupedDocuments]) => ({
    yearLabel,
    documents: groupedDocuments,
  }));
}
