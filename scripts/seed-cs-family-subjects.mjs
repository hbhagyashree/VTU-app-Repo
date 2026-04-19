import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();

const DEPARTMENTS = [
  {
    name: 'Computer Science and Engineering',
    slug: 'cse',
    description: 'Computer Science and Engineering resources.',
    codes: [
      ['BCS301', 3],
      ['BCS302', 3],
      ['BCS303', 3],
      ['BCS304', 3],
      ['BCS306-A', 3],
      ['BCS306-B', 3],
      ['BCS358D', 3],
      ['BDS306-C', 3],
      ['BBOC407', 4],
      ['BCS401', 4],
      ['BCS402', 4],
      ['BCS403', 4],
      ['BCS405A', 4],
      ['BCS405B', 4],
      ['BCS456C', 4],
      ['BUHK408', 4],
      ['BCS501', 5],
      ['BCS502', 5],
      ['BCS503', 5],
      ['BCS508', 5],
      ['BCS515B', 5],
      ['BRMK557', 5],
      ['BCS601', 6],
      ['BCS602', 6],
      ['BCS613A', 6],
    ],
  },
  {
    name: 'Information Science and Engineering',
    slug: 'ise',
    description: 'Information Science and Engineering resources.',
    codes: [
      ['BCS301', 3],
      ['BCS302', 3],
      ['BCS303', 3],
      ['BCS304', 3],
      ['BCS306-A', 3],
      ['BCS306-B', 3],
      ['BCS358D', 3],
      ['BDS306-C', 3],
      ['BBOC407', 4],
      ['BCS401', 4],
      ['BCS402', 4],
      ['BCS403', 4],
      ['BCS405A', 4],
      ['BCS405B', 4],
      ['BCS456C', 4],
      ['BUHK408', 4],
      ['BCS501', 5],
      ['BCS502', 5],
      ['BCS503', 5],
      ['BCS508', 5],
      ['BCS515B', 5],
      ['BRMK557', 5],
      ['BCS602', 6],
      ['BIS613D', 6],
    ],
  },
  {
    name: 'Artificial Intelligence and Machine Learning',
    slug: 'aiml',
    description: 'Artificial Intelligence and Machine Learning resources.',
    codes: [
      ['BCS301', 3],
      ['BCS302', 3],
      ['BCS303', 3],
      ['BCS304', 3],
      ['BCS306-A', 3],
      ['BCS306-B', 3],
      ['BDS306-C', 3],
      ['BBOC407', 4],
      ['BCS401', 4],
      ['BCS402', 4],
      ['BCS403', 4],
      ['BCS405A', 4],
      ['BCS405B', 4],
      ['BUHK408', 4],
      ['BAI515A', 5],
      ['BCS501', 5],
      ['BCS502', 5],
      ['BCS503', 5],
      ['BCS508', 5],
      ['BRMK557', 5],
      ['BAI654x', 6],
    ],
  },
  {
    name: 'Artificial Intelligence and Data Science',
    slug: 'aids',
    description: 'Artificial Intelligence and Data Science resources.',
    codes: [
      ['BCS302', 3],
      ['BCS303', 3],
      ['BCS304', 3],
      ['BDS306-C', 3],
      ['BBOC407', 4],
      ['BCS401', 4],
      ['BCS402', 4],
      ['BCS403', 4],
      ['BCS405A', 4],
      ['BCS405B', 4],
      ['BUHK408', 4],
      ['BCS501', 5],
      ['BCS502', 5],
      ['BCS503', 5],
      ['BCS508', 5],
      ['BRMK557', 5],
      ['BCS602', 6],
    ],
  },
];

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

function parseSubjectNames(sqlPath) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rowRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
  const names = new Map();
  let match;

  while ((match = rowRegex.exec(sql))) {
    const code = match[1];
    const title = match[2];
    const name = title
      .replace(new RegExp(`^${code}\\s+`, 'i'), '')
      .replace(/\s+PYQ Collection$/i, '')
      .trim();

    names.set(code.toLowerCase(), name);
  }

  return names;
}

async function getOrCreateDepartment(supabase, department) {
  const { data: existing, error: findError } = await supabase
    .from('departments')
    .select('id')
    .eq('slug', department.slug)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from('departments')
    .insert({
      name: department.name,
      slug: department.slug,
      description: department.description,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id;
}

async function getOrCreateSemester(supabase, departmentId, semesterNumber) {
  const { data: existing, error: findError } = await supabase
    .from('semesters')
    .select('id')
    .eq('department_id', departmentId)
    .eq('number', semesterNumber)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from('semesters')
    .insert({
      department_id: departmentId,
      number: semesterNumber,
      title: `Semester ${semesterNumber}`,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id;
}

async function upsertSubject(supabase, subject) {
  const { data: existing, error: findError } = await supabase
    .from('subjects')
    .select('id, published')
    .eq('department_id', subject.department_id)
    .eq('code', subject.code)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    if (!existing.published) {
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ published: true })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    }

    return 'existing';
  }

  const { error: createError } = await supabase.from('subjects').insert(subject);

  if (createError) {
    throw createError;
  }

  return 'created';
}

async function main() {
  const env = readEnvFile(path.join(projectRoot, '.env.local'));
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const namesByCode = parseSubjectNames(path.join(projectRoot, 'sql/import-cs-pyq-links.sql'));
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let departmentsCreatedOrFound = 0;
  let semestersCreatedOrFound = 0;
  let subjectsCreated = 0;
  let subjectsExisting = 0;

  for (const department of DEPARTMENTS) {
    const departmentId = await getOrCreateDepartment(supabase, department);
    departmentsCreatedOrFound += 1;
    const semesterIds = new Map();

    for (const [, semesterNumber] of department.codes) {
      if (!semesterIds.has(semesterNumber)) {
        const semesterId = await getOrCreateSemester(supabase, departmentId, semesterNumber);
        semesterIds.set(semesterNumber, semesterId);
        semestersCreatedOrFound += 1;
      }
    }

    for (const [code, semesterNumber] of department.codes) {
      const name = namesByCode.get(code.toLowerCase());

      if (!name) {
        throw new Error(`No subject name found for ${code}.`);
      }

      const result = await upsertSubject(supabase, {
        department_id: departmentId,
        semester_id: semesterIds.get(semesterNumber),
        name,
        code,
        description: `${name} resources and previous year question papers.`,
        published: true,
      });

      if (result === 'created') {
        subjectsCreated += 1;
      } else {
        subjectsExisting += 1;
      }
    }
  }

  console.log(`Departments ready: ${departmentsCreatedOrFound}`);
  console.log(`Semesters ready: ${semestersCreatedOrFound}`);
  console.log(`Subjects created: ${subjectsCreated}`);
  console.log(`Subjects already existing: ${subjectsExisting}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
