import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();

const VTU_SCHEME_PAGE = 'https://vtu.ac.in/en/b-e-scheme-syllabus/';

const DIRECT_CODE_SYLLABUS = {
  BMATS101: {
    title: 'BMATS101 Mathematics for CSE Stream-I Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BMATS101.pdf',
  },
  BMATS201: {
    title: 'BMATS201 Mathematics for CSE Stream-II Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BMATS201.pdf',
  },
  BPHYS102: {
    title: 'BPHYS102 Physics for CSE Stream Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BPHYS102.pdf',
  },
  BCHES202: {
    title: 'BCHES102/202 Chemistry for CSE Stream Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BCHES102.pdf',
  },
  BPOPS103: {
    title: 'BPOPS103 Principles of Programming Using C Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BPOPS103.pdf',
  },
  BPLCK105B: {
    title: 'BPLCK105B/205B Introduction to Python Programming Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BPLCK105B.pdf',
  },
  BPLCK205C: {
    title: 'BPLCK105C/205C Basics of Java Programming Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BPLCK105C.pdf',
  },
  BESCK204H: {
    title: 'BETCK105H/205H Introduction to IoT Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BETCK105H.pdf',
  },
  BETCK205I: {
    title: 'BETCK105I/205I Introduction to Cyber Security Official VTU Syllabus',
    file_url: 'https://vtu.ac.in/pdf/2022syll/BETCK105l.pdf',
  },
};

const BRANCH_SEMESTER_SYLLABUS = {
  cse: {
    label: 'Computer Science and Engineering',
    3: 'https://vtu.ac.in/pdf/2022_3to8/2csessyll.pdf',
    4: 'https://vtu.ac.in/pdf/2022_3to8/2csessyll.pdf',
    5: 'https://vtu.ac.in/pdf/2022_3to8/3csesyll.pdf',
    6: 'https://vtu.ac.in/pdf/2022_3to8/6csesyll.pdf',
    7: 'https://vtu.ac.in/pdf/2022_3to8/7csesyll.pdf',
  },
  ise: {
    label: 'Information Science and Engineering',
    3: 'https://vtu.ac.in/pdf/2022_3to8/2issyll.pdf',
    4: 'https://vtu.ac.in/pdf/2022_3to8/2issyll.pdf',
    5: 'https://vtu.ac.in/pdf/2022_3to8/3issyll.pdf',
    6: 'https://vtu.ac.in/pdf/2022_3to8/6issyll.pdf',
    7: 'https://vtu.ac.in/pdf/2022_3to8/7issyll.pdf',
  },
  aiml: {
    label: 'Artificial Intelligence and Machine Learning',
    3: 'https://vtu.ac.in/pdf/2022_3to8/2aimlsyll.pdf',
    4: 'https://vtu.ac.in/pdf/2022_3to8/2aimlsyll.pdf',
    5: 'https://vtu.ac.in/pdf/2022_3to8/3aimlsyll.pdf',
    6: 'https://vtu.ac.in/pdf/2022_3to8/6aimlsyll.pdf',
    7: 'https://vtu.ac.in/pdf/2022_3to8/7aimlsyll.pdf',
  },
  aids: {
    label: 'Artificial Intelligence and Data Science',
    3: 'https://vtu.ac.in/pdf/2022_3to8/2aidssyll.pdf',
    4: 'https://vtu.ac.in/pdf/2022_3to8/2aidssyll.pdf',
    5: 'https://vtu.ac.in/pdf/2022_3to8/3aidssyll.pdf',
    6: 'https://vtu.ac.in/pdf/2022_3to8/6aidssyll.pdf',
    7: 'https://vtu.ac.in/pdf/2022_3to8/7aidssyll.pdf',
  },
};

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

async function getOrCreateSyllabusModule(supabase, subjectId) {
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, order')
    .eq('subject_id', subjectId)
    .order('order', { ascending: true });

  if (modulesError) {
    throw modulesError;
  }

  const existingModule = modules.find((module) => module.title.trim().toLowerCase() === 'syllabus');

  if (existingModule) {
    return existingModule.id;
  }

  const usedOrders = new Set(modules.map((module) => module.order));
  let order = 0;

  while (usedOrders.has(order)) {
    order += 1;
  }

  const { data: createdModule, error: createError } = await supabase
    .from('modules')
    .insert({
      subject_id: subjectId,
      title: 'Syllabus',
      description: 'Official VTU scheme and syllabus links.',
      order,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return createdModule.id;
}

function getSyllabusResource(subject, semester, department) {
  const direct = DIRECT_CODE_SYLLABUS[subject.code];

  if (direct) {
    return {
      ...direct,
      content: `Official VTU syllabus for ${subject.name}.`,
    };
  }

  const branch = BRANCH_SEMESTER_SYLLABUS[department.slug];
  const fileUrl = branch?.[semester.number];

  if (!branch || !fileUrl) {
    return null;
  }

  return {
    title: `${subject.code} ${subject.name} Official VTU Syllabus`,
    file_url: fileUrl,
    content: `Official VTU ${branch.label} Semester ${semester.number} syllabus document containing ${subject.code} ${subject.name}.`,
  };
}

async function main() {
  const env = readEnvFile(path.join(projectRoot, '.env.local'));
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [{ data: subjects, error: subjectError }, { data: semesters, error: semesterError }, { data: departments, error: departmentError }] =
    await Promise.all([
      supabase.from('subjects').select('id, department_id, semester_id, code, name, published'),
      supabase.from('semesters').select('id, department_id, number, title'),
      supabase.from('departments').select('id, slug, name'),
    ]);

  if (subjectError) throw subjectError;
  if (semesterError) throw semesterError;
  if (departmentError) throw departmentError;

  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  let inserted = 0;
  let skippedExisting = 0;
  let missingMapping = 0;

  for (const subject of subjects) {
    if (!subject.code) {
      missingMapping += 1;
      continue;
    }

    const semester = semesterById.get(subject.semester_id);
    const department = departmentById.get(subject.department_id);

    if (!semester || !department) {
      missingMapping += 1;
      continue;
    }

    const resource = getSyllabusResource(subject, semester, department);

    if (!resource) {
      missingMapping += 1;
      continue;
    }

    const { data: existingDocument, error: existingError } = await supabase
      .from('documents')
      .select('id')
      .eq('subject_id', subject.id)
      .eq('type', 'syllabus')
      .eq('file_url', resource.file_url)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingDocument) {
      skippedExisting += 1;
      continue;
    }

    const moduleId = await getOrCreateSyllabusModule(supabase, subject.id);
    const { error: insertError } = await supabase.from('documents').insert({
      subject_id: subject.id,
      module_id: moduleId,
      type: 'syllabus',
      title: resource.title,
      content: resource.content,
      file_url: resource.file_url,
      metadata: {
        source: 'official_vtu',
        source_page: VTU_SCHEME_PAGE,
        import_type: 'external_link',
        subject_code: subject.code,
        imported_at: new Date().toISOString(),
      },
    });

    if (insertError) {
      throw insertError;
    }

    inserted += 1;
  }

  console.log(`Inserted syllabus resources: ${inserted}`);
  console.log(`Skipped existing syllabus resources: ${skippedExisting}`);
  console.log(`Subjects without syllabus mapping: ${missingMapping}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
