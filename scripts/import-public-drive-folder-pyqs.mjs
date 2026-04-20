import fs from 'node:fs';
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
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function sanitizePathSegment(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function getDriveFolderId(fileUrl) {
  try {
    const url = new URL(fileUrl);

    if (!url.hostname.includes('drive.google.com')) {
      return null;
    }

    const folderPathMatch = url.pathname.match(/\/drive\/folders\/([^/]+)/);
    if (folderPathMatch?.[1]) {
      return folderPathMatch[1];
    }

    if (url.pathname.includes('folderview')) {
      return url.searchParams.get('id');
    }

    return null;
  } catch {
    return null;
  }
}

function decodeUnicodeEscapes(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
}

function extractPdfFilesFromHtml(html) {
  const files = new Map();
  const fileRegex = /\["([a-zA-Z0-9_-]{20,})",\s*"((?:\\"|[^"])*)",\s*"application\/pdf"/g;
  let match;

  while ((match = fileRegex.exec(html))) {
    const id = match[1];
    const name = decodeUnicodeEscapes(match[2].replace(/\\"/g, '"'));
    files.set(id, { id, name });
  }

  const fallbackRegex = /\/file\/d\/([a-zA-Z0-9_-]{20,})[\s\S]{0,500}?([^"<>]+?\.pdf)/gi;
  while ((match = fallbackRegex.exec(html))) {
    const id = match[1];
    const name = decodeUnicodeEscapes(match[2].replace(/\\"/g, '"')).trim();
    files.set(id, { id, name });
  }

  return [...files.values()];
}

async function listPublicDriveFolderPdfs(folderId) {
  const urls = [
    `https://drive.google.com/drive/folders/${folderId}`,
    `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
  ];
  const files = new Map();

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    for (const file of extractPdfFilesFromHtml(html)) {
      files.set(file.id, file);
    }
  }

  return [...files.values()];
}

async function downloadDrivePdf(fileId) {
  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    throw new Error(`Drive download failed with ${response.status}`);
  }

  if (contentType.includes('text/html')) {
    throw new Error('Drive returned an HTML page instead of a PDF.');
  }

  return Buffer.from(await response.arrayBuffer());
}

function getYearFromText(value) {
  const match = value.match(/\b(20\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function main() {
  const { data: folderDocuments, error } = await supabase
    .from('documents')
    .select('id, subject_id, module_id, title, content, file_url, metadata')
    .eq('type', 'pyq')
    .not('file_url', 'is', null);

  if (error) {
    throw error;
  }

  const driveFolderDocuments = (folderDocuments ?? []).filter((document) =>
    getDriveFolderId(document.file_url)
  );
  const results = {
    folders: driveFolderDocuments.length,
    discoveredPdfs: 0,
    uploadedPdfs: 0,
    skippedExisting: 0,
    failedFolders: 0,
    failedPdfs: 0,
  };

  for (const folderDocument of driveFolderDocuments) {
    const folderId = getDriveFolderId(folderDocument.file_url);

    try {
      const pdfFiles = await listPublicDriveFolderPdfs(folderId);
      results.discoveredPdfs += pdfFiles.length;
      let importedForFolder = 0;

      if (pdfFiles.length === 0) {
        console.warn(`No public PDFs discovered in: ${folderDocument.title}`);
        continue;
      }

      for (const pdfFile of pdfFiles) {
        try {
          const year = getYearFromText(pdfFile.name) ?? getYearFromText(folderDocument.title);
          const storagePath = [
            'pyqs',
            folderDocument.subject_id,
            `${sanitizePathSegment(pdfFile.name.replace(/\.pdf$/i, ''))}-${pdfFile.id}.pdf`,
          ].join('/');

          const downloadedPdf = await downloadDrivePdf(pdfFile.id);
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, downloadedPdf, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

          const { data: existingDocument, error: existingError } = await supabase
            .from('documents')
            .select('id')
            .eq('subject_id', folderDocument.subject_id)
            .eq('type', 'pyq')
            .eq('file_url', publicUrl)
            .maybeSingle();

          if (existingError) {
            throw existingError;
          }

          if (existingDocument) {
            results.skippedExisting += 1;
            continue;
          }

          const title = year
            ? `${folderDocument.title.replace(/\s+PYQ Collection$/i, '')} ${year} PYQ`
            : pdfFile.name.replace(/\.pdf$/i, '');

          const { error: insertError } = await supabase.from('documents').insert({
            subject_id: folderDocument.subject_id,
            module_id: folderDocument.module_id,
            type: 'pyq',
            title,
            content: year
              ? `${year} previous year question paper.`
              : folderDocument.content ?? 'Previous year question paper.',
            file_url: publicUrl,
            metadata: {
              ...(folderDocument.metadata ?? {}),
              source: 'public_drive_folder_import',
              original_folder_document_id: folderDocument.id,
              original_folder_url: folderDocument.file_url,
              drive_file_id: pdfFile.id,
              drive_file_name: pdfFile.name,
              year,
              storage_path: storagePath,
              imported_at: new Date().toISOString(),
            },
          });

          if (insertError) {
            throw insertError;
          }

          results.uploadedPdfs += 1;
          importedForFolder += 1;
          console.log(`Imported: ${pdfFile.name}`);
        } catch (pdfError) {
          results.failedPdfs += 1;
          console.warn(`Failed PDF in ${folderDocument.title}: ${pdfFile.name} - ${pdfError.message}`);
        }
      }

      if (importedForFolder > 0) {
        const { error: deleteFolderDocumentError } = await supabase
          .from('documents')
          .delete()
          .eq('id', folderDocument.id);

        if (deleteFolderDocumentError) {
          throw deleteFolderDocumentError;
        }
      }
    } catch (folderError) {
      results.failedFolders += 1;
      console.warn(`Failed folder: ${folderDocument.title} - ${folderError.message}`);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
