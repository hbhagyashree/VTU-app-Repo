import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();
const defaultPyqRoot = path.join(projectRoot, 'pyq-files');
const pyqRoot = path.resolve(process.argv[2] ?? defaultPyqRoot);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...valueParts] = line.split('=');
        const rawValue = valueParts.join('=').trim();
        return [key.trim(), rawValue.replace(/^['"]|['"]$/g, '')];
      })
  );
}

function getRequiredEnv(env, key) {
  const value = process.env[key] ?? env[key];

  if (!value) {
    throw new Error(`Missing ${key}. Add it to .env.local before running this script.`);
  }

  return value;
}

function sanitizePathSegment(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walkPdfFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`PYQ folder not found: ${directory}`);
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkPdfFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(fullPath);
    }
  }

  return files;
}

function parsePdfPath(filePath) {
  const relativePath = path.relative(pyqRoot, filePath);
  const parts = relativePath.split(path.sep);
  const fileName = parts.at(-1) ?? '';
  const fileBase = fileName.replace(/\.pdf$/i, '');
  const searchableText = parts.join(' ');
  const departmentSlug = parts[0]?.toLowerCase();
  const semesterMatch = searchableText.match(/(?:sem|semester)[-_ ]?([1-8])\b/i);
  const codeMatch = fileBase.match(/\b([A-Z]{2,5}\d{3}[A-Z]?(?:-[A-Z])?)\b/i);
  const yearMatch = searchableText.match(/\b(20\d{2})\b/);

  if (!departmentSlug || !semesterMatch || !codeMatch) {
    throw new Error(
      `Cannot parse "${relativePath}". Use pyq-files/<department>/semester-<number>/<subject-code>-<year>.pdf`
    );
  }

  return {
    relativePath,
    departmentSlug,
    semesterNumber: Number.parseInt(semesterMatch[1], 10),
    subjectCode: codeMatch[1].toUpperCase(),
    year: yearMatch ? Number.parseInt(yearMatch[1], 10) : null,
    titleSuffix: fileBase.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

function normalizeCode(code) {
  return code.trim().toLowerCase();
}

async function getOrCreatePyqModule(supabase, subjectId) {
  const { data: modules, error } = await supabase
    .from('modules')
    .select('id, title, order')
    .eq('subject_id', subjectId)
    .order('order', { ascending: true });

  if (error) {
    throw error;
  }

  const existing = modules.find((module) => module.title.trim().toLowerCase() === 'pyqs');
  if (existing) {
    return existing.id;
  }

  const usedOrders = new Set(modules.map((module) => module.order));
  let order = Math.max(0, ...modules.map((module) => module.order)) + 1;

  while (usedOrders.has(order)) {
    order += 1;
  }

  const { data: createdModule, error: createError } = await supabase
    .from('modules')
    .insert({
      subject_id: subjectId,
      title: 'PYQs',
      description: 'Previous year question papers and exam practice resources.',
      order,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return createdModule.id;
}

async function main() {
  const env = readEnvFile(path.join(projectRoot, '.env.local'));
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'subject-resources';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const pdfFiles = walkPdfFiles(pyqRoot);

  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found inside ${pyqRoot}`);
  }

  const [{ data: departments, error: departmentsError }, { data: semesters, error: semestersError }, { data: subjects, error: subjectsError }] =
    await Promise.all([
      supabase.from('departments').select('id, slug, name'),
      supabase.from('semesters').select('id, department_id, number'),
      supabase.from('subjects').select('id, department_id, semester_id, code, name'),
    ]);

  if (departmentsError) throw departmentsError;
  if (semestersError) throw semestersError;
  if (subjectsError) throw subjectsError;

  const departmentBySlug = new Map(departments.map((department) => [department.slug.toLowerCase(), department]));
  const semesterByDepartmentAndNumber = new Map(
    semesters.map((semester) => [`${semester.department_id}:${semester.number}`, semester])
  );
  const subjectBySemesterAndCode = new Map(
    subjects
      .filter((subject) => subject.code)
      .map((subject) => [`${subject.semester_id}:${normalizeCode(subject.code)}`, subject])
  );

  const results = {
    found: pdfFiles.length,
    uploaded: 0,
    skippedExisting: 0,
    failed: 0,
  };

  for (const filePath of pdfFiles) {
    try {
      const parsed = parsePdfPath(filePath);
      const department = departmentBySlug.get(parsed.departmentSlug);

      if (!department) {
        throw new Error(`No department found for slug "${parsed.departmentSlug}".`);
      }

      const semester = semesterByDepartmentAndNumber.get(`${department.id}:${parsed.semesterNumber}`);
      if (!semester) {
        throw new Error(`No semester ${parsed.semesterNumber} found for ${department.slug}.`);
      }

      const subject = subjectBySemesterAndCode.get(`${semester.id}:${normalizeCode(parsed.subjectCode)}`);
      if (!subject) {
        throw new Error(`No subject ${parsed.subjectCode} found in ${department.slug} semester ${parsed.semesterNumber}.`);
      }

      const moduleId = await getOrCreatePyqModule(supabase, subject.id);
      const storagePath = [
        'pyqs',
        sanitizePathSegment(department.slug),
        `semester-${parsed.semesterNumber}`,
        sanitizePathSegment(parsed.subjectCode),
        `${sanitizePathSegment(parsed.titleSuffix)}.pdf`,
      ].join('/');

      const fileBuffer = fs.readFileSync(filePath);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
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

      const title = parsed.year
        ? `${parsed.subjectCode} ${subject.name} ${parsed.year} PYQ`
        : `${parsed.subjectCode} ${subject.name} PYQ`;

      const { data: existingDocument, error: existingError } = await supabase
        .from('documents')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('type', 'pyq')
        .eq('file_url', publicUrl)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingDocument) {
        results.skippedExisting += 1;
        console.log(`Already exists: ${parsed.relativePath}`);
        continue;
      }

      const { error: insertError } = await supabase.from('documents').insert({
        subject_id: subject.id,
        module_id: moduleId,
        type: 'pyq',
        title,
        content: parsed.year
          ? `${parsed.year} previous year question paper for ${subject.name}.`
          : `Previous year question paper for ${subject.name}.`,
        file_url: publicUrl,
        metadata: {
          source: 'local_pdf_import',
          department_slug: department.slug,
          semester_number: parsed.semesterNumber,
          subject_code: parsed.subjectCode,
          year: parsed.year,
          storage_path: storagePath,
          imported_at: new Date().toISOString(),
        },
      });

      if (insertError) {
        throw insertError;
      }

      results.uploaded += 1;
      console.log(`Uploaded: ${parsed.relativePath}`);
    } catch (error) {
      results.failed += 1;
      console.warn(`Failed: ${path.relative(pyqRoot, filePath)} - ${error.message}`);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
