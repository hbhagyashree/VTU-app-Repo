import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const [key, ...value] = line.split('=');
      return [key.trim(), value.join('=').trim().replace(/^['"]|['"]$/g, '')];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'subject-resources';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function getDriveFileId(fileUrl) {
  try {
    const url = new URL(fileUrl);

    if (!url.hostname.includes('drive.google.com')) {
      return null;
    }

    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }

    if (url.pathname.includes('folderview') || url.pathname.includes('/drive/folders/')) {
      return null;
    }

    return url.searchParams.get('id');
  } catch {
    return null;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

async function downloadDriveFile(fileId) {
  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    throw new Error(`Drive download failed with ${response.status}`);
  }

  if (contentType.includes('text/html')) {
    throw new Error('Drive returned an HTML page instead of a downloadable PDF.');
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: contentType || 'application/pdf',
  };
}

async function main() {
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, subject_id, title, type, file_url, metadata')
    .eq('type', 'pyq')
    .not('file_url', 'is', null);

  if (error) {
    throw error;
  }

  const driveDocuments = (documents ?? []).filter((document) => getDriveFileId(document.file_url));
  const results = {
    found: driveDocuments.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const document of driveDocuments) {
    const driveFileId = getDriveFileId(document.file_url);

    if (!driveFileId) {
      results.skipped += 1;
      continue;
    }

    const storagePath = [
      'pyqs',
      document.subject_id,
      `${slugify(document.title || document.id)}-${document.id}.pdf`,
    ].join('/');

    try {
      const downloadedFile = await downloadDriveFile(driveFileId);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, downloadedFile.body, {
          contentType: downloadedFile.contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          file_url: publicUrl,
          metadata: {
            ...(document.metadata ?? {}),
            migrated_from_drive: true,
            original_file_url: document.file_url,
            storage_path: storagePath,
          },
        })
        .eq('id', document.id);

      if (updateError) {
        throw updateError;
      }

      results.migrated += 1;
      console.log(`Migrated: ${document.title}`);
    } catch (migrationError) {
      results.failed += 1;
      console.warn(`Failed: ${document.title} - ${migrationError.message}`);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
