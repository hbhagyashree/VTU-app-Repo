import type { CreateSubjectInput, Subject, UpdateSubjectInput } from '@/types';

type SupabaseSubjectsClient = {
  from: (table: 'subjects') => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => PromiseLike<{ data: Subject[] | null; error: { message: string } | null }>;
      eq: (column: string, value: string | boolean) => {
        order: (orderColumn: string, options?: { ascending?: boolean }) => PromiseLike<{ data: Subject[] | null; error: { message: string } | null }>;
        single: () => PromiseLike<{ data: Subject | null; error: { message: string } | null }>;
      };
    };
    insert: (values: CreateSubjectInput | CreateSubjectInput[]) => {
      select: (columns: string) => {
        single: () => PromiseLike<{ data: Subject | null; error: { message: string } | null }>;
      };
    };
    update: (values: UpdateSubjectInput) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => PromiseLike<{ data: Subject | null; error: { message: string } | null }>;
        };
      };
    };
    delete: () => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

const mockSubjects: Subject[] = [
  {
    id: '1',
    department_id: '1',
    semester_id: '1',
    name: 'Analysis and Design of Algorithms',
    code: 'CS401',
    description: 'Design and analysis of algorithms subject',
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    department_id: '1',
    semester_id: '1',
    name: 'Operating Systems',
    code: 'CS402',
    description: 'Operating systems concepts and design',
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    department_id: '1',
    semester_id: '1',
    name: 'DBMS',
    code: 'CS403',
    description: 'Database management systems fundamentals',
    published: true,
    created_at: new Date().toISOString(),
  },
];

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

interface SubjectQueryResult<T> {
  data: T;
  fallback: boolean;
}

function cloneMockSubjects(subjects: Subject[]): Subject[] {
  return subjects.map((subject) => ({ ...subject }));
}

function normalizeSubjectInput(data: CreateSubjectInput): CreateSubjectInput {
  return {
    ...data,
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    description: data.description?.trim() || undefined,
    published: data.published ?? false,
  };
}

async function getSupabase(): Promise<SupabaseSubjectsClient | null> {
  if (!hasSupabaseEnv) {
    return null;
  }

  try {
    const { supabase } = await import('@/lib/supabaseClient');
    return supabase as unknown as SupabaseSubjectsClient;
  } catch (error) {
    console.warn('Falling back to mock subjects data because Supabase is unavailable.', error);
    return null;
  }
}

function warnFallback(context: string, error: unknown): void {
  console.warn(`Falling back to mock subject data for ${context}.`, error);
}

function shouldUseMockWrites(): boolean {
  return !hasSupabaseEnv;
}

function ensureRequiredFields(data: CreateSubjectInput): void {
  if (!data.name || !data.department_id || !data.semester_id) {
    throw new Error('Name, department, and semester are required');
  }
}

export async function getSubjectsResult(): Promise<SubjectQueryResult<Subject[]>> {
  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) {
        throw new Error(error.message);
      }

      return { data: data ?? [], fallback: false };
    }
  } catch (error) {
    warnFallback('subject list', error);
  }

  return { data: cloneMockSubjects(mockSubjects), fallback: true };
}

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await getSubjectsResult();
  return data;
}

export async function getPublishedSubjectsResult(): Promise<SubjectQueryResult<Subject[]>> {
  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('published', true)
        .order('name');

      if (error) {
        throw new Error(error.message);
      }

      return { data: data ?? [], fallback: false };
    }
  } catch (error) {
    warnFallback('published subjects', error);
  }

  return {
    data: cloneMockSubjects(mockSubjects.filter((subject) => subject.published)),
    fallback: true,
  };
}

export async function getPublishedSubjects(): Promise<Subject[]> {
  const { data } = await getPublishedSubjectsResult();
  return data;
}

export async function getSubjectByIdResult(id: string): Promise<SubjectQueryResult<Subject | null>> {
  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
      if (error) {
        throw new Error(error.message);
      }

      return { data, fallback: false };
    }
  } catch (error) {
    warnFallback(`subject ${id}`, error);
  }

  const subject = mockSubjects.find((item) => item.id === id);
  return { data: subject ? { ...subject } : null, fallback: true };
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  const { data } = await getSubjectByIdResult(id);
  return data;
}

export async function createSubject(data: CreateSubjectInput): Promise<Subject> {
  const normalized = normalizeSubjectInput(data);
  ensureRequiredFields(normalized);

  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { data: createdSubject, error } = await supabase
        .from('subjects')
        .insert(normalized)
        .select('*')
        .single();

      if (error || !createdSubject) {
        throw new Error(error?.message ?? 'Failed to create subject');
      }

      return createdSubject;
    }
  } catch (error) {
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to create subject');
    }
  }

  const existing = mockSubjects.find(
    (subject) =>
      subject.name.toLowerCase() === normalized.name.toLowerCase() &&
      subject.department_id === normalized.department_id &&
      subject.semester_id === normalized.semester_id
  );

  if (existing) {
    throw new Error('Subject with this name already exists in the selected department and semester');
  }

  const newSubject: Subject = {
    id: Date.now().toString(),
    department_id: normalized.department_id,
    semester_id: normalized.semester_id,
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    published: normalized.published ?? false,
    created_at: new Date().toISOString(),
  };

  mockSubjects.push(newSubject);
  return { ...newSubject };
}

export async function updateSubject(id: string, updates: UpdateSubjectInput): Promise<Subject> {
  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? 'Subject not found');
      }

      return data;
    }
  } catch (error) {
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to update subject');
    }
  }

  const index = mockSubjects.findIndex((subject) => subject.id === id);
  if (index === -1) {
    throw new Error('Subject not found');
  }

  mockSubjects[index] = { ...mockSubjects[index], ...updates };
  return { ...mockSubjects[index] };
}

export async function deleteSubject(id: string): Promise<void> {
  try {
    const supabase = await getSupabase();

    if (supabase) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }
  } catch (error) {
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to delete subject');
    }
  }

  const index = mockSubjects.findIndex((subject) => subject.id === id);
  if (index === -1) {
    throw new Error('Subject not found');
  }

  mockSubjects.splice(index, 1);
}
