import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();

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

function parsePyqSources(sqlPath) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rowRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
  const rows = [];
  let match;

  while ((match = rowRegex.exec(sql))) {
    rows.push({
      code: match[1],
      title: match[2],
      file_url: match[3],
      summary: match[4],
    });
  }

  return rows;
}

function normalizeCode(code) {
  return code.trim().toLowerCase();
}

function candidateCodes(code) {
  return [...new Set([code, code.replace(/^B/i, '')].map(normalizeCode))];
}

async function getOrCreatePyqModule(supabase, subjectId) {
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, order, created_at')
    .eq('subject_id', subjectId)
    .order('order', { ascending: true });

  if (modulesError) {
    throw modulesError;
  }

  const existingPyqModule = modules.find((module) => module.title.trim().toLowerCase() === 'pyqs');

  if (existingPyqModule) {
    return existingPyqModule.id;
  }

  const usedOrders = new Set(modules.map((module) => module.order));
  let order = 99;

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
  const sources = parsePyqSources(path.join(projectRoot, 'sql/import-cs-pyq-links.sql'));

  if (sources.length === 0) {
    throw new Error('No PYQ sources found in sql/import-cs-pyq-links.sql.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, code, name, published');

  if (subjectsError) {
    throw subjectsError;
  }

  const subjectsByCode = new Map();

  for (const subject of subjects) {
    if (!subject.code) {
      continue;
    }

    const normalized = normalizeCode(subject.code);
    subjectsByCode.set(normalized, [...(subjectsByCode.get(normalized) ?? []), subject]);
  }

  let inserted = 0;
  let skippedExisting = 0;
  let matchedSubjects = 0;
  const missingCodes = [];

  for (const source of sources) {
    const matchingSubjects = candidateCodes(source.code).flatMap((code) => subjectsByCode.get(code) ?? []);

    if (matchingSubjects.length === 0) {
      missingCodes.push(source.code);
      continue;
    }

    matchedSubjects += matchingSubjects.length;

    for (const subject of matchingSubjects) {
      const { data: existingDocument, error: existingError } = await supabase
        .from('documents')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('type', 'pyq')
        .eq('file_url', source.file_url)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingDocument) {
        skippedExisting += 1;
        continue;
      }

      const moduleId = await getOrCreatePyqModule(supabase, subject.id);
      const { error: insertError } = await supabase.from('documents').insert({
        subject_id: subject.id,
        module_id: moduleId,
        type: 'pyq',
        title: source.title,
        content: source.summary,
        file_url: source.file_url,
        metadata: {
          import_type: 'external_link',
          subject_code: source.code,
          imported_at: new Date().toISOString(),
        },
      });

      if (insertError) {
        throw insertError;
      }

      inserted += 1;
    }
  }

  console.log(`PYQ sources read: ${sources.length}`);
  console.log(`Matched subject records: ${matchedSubjects}`);
  console.log(`Inserted PYQ resources: ${inserted}`);
  console.log(`Skipped existing resources: ${skippedExisting}`);

  if (missingCodes.length > 0) {
    console.log(`Missing subject codes: ${[...new Set(missingCodes)].join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
