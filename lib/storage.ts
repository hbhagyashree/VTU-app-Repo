import { supabase } from '@/lib/supabaseClient';

const storageBucket =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'subject-resources';

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildStoragePath(subjectId: string, moduleId: string, fileName: string): string {
  const safeSubjectId = sanitizePathSegment(subjectId) || 'subject';
  const safeModuleId = sanitizePathSegment(moduleId) || 'module';
  const timestamp = Date.now();
  const dotIndex = fileName.lastIndexOf('.');
  const rawBaseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const rawExtension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
  const safeBaseName = sanitizePathSegment(rawBaseName) || 'resource';

  return `${safeSubjectId}/${safeModuleId}/${timestamp}-${safeBaseName}${rawExtension}`;
}

export function isStorageUploadConfigured(): boolean {
  return Boolean(supabase) && Boolean(storageBucket);
}

export function getStorageBucketName(): string {
  return storageBucket;
}

function getStoragePathFromPublicUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const marker = `/storage/v1/object/public/${storageBucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = url.pathname.slice(markerIndex + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

export async function uploadResourceFile(
  file: File,
  subjectId: string,
  moduleId: string
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase storage is not configured.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error(
      'Your Supabase login session is missing. Please log out, sign in again, and retry the upload.'
    );
  }

  const path = buildStoragePath(subjectId, moduleId, file.name);
  try {
    const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to upload the selected file.');
  }

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Unable to generate a public URL for the uploaded file.');
  }

  return data.publicUrl;
}

export async function deleteResourceFile(fileUrl: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const path = getStoragePathFromPublicUrl(fileUrl);
  if (!path) {
    return;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error(
      'Your Supabase login session is missing. Please log out, sign in again, and retry the delete.'
    );
  }

  const { error } = await supabase.storage.from(storageBucket).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}
