import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabasePublicKey) {
    return null;
  }

  return createClient(supabaseUrl, supabasePublicKey);
}

export const supabase = createSupabaseClient();

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
    );
  }

  return supabase;
}

function requireSupabase(): SupabaseClient {
  return getSupabaseClient();
}

export const db = {
  profiles: {
    getById: (id: string) => requireSupabase().from('profiles').select('*').eq('id', id).single(),
    update: (id: string, updates: Record<string, unknown>) =>
      requireSupabase().from('profiles').update(updates).eq('id', id),
  },

  departments: {
    getAll: () => requireSupabase().from('departments').select('*').order('name'),
    getBySlug: (slug: string) => requireSupabase().from('departments').select('*').eq('slug', slug).single(),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('departments').insert(data).select('*').single(),
    update: (id: string, data: Record<string, unknown>) =>
      requireSupabase().from('departments').update(data).eq('id', id).select('*').single(),
    delete: (id: string) => requireSupabase().from('departments').delete().eq('id', id),
  },

  semesters: {
    getAll: () => requireSupabase().from('semesters').select('*').order('number'),
    getByDepartment: (departmentId: string) =>
      requireSupabase().from('semesters').select('*').eq('department_id', departmentId).order('number'),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('semesters').insert(data).select('*').single(),
    delete: (id: string) => requireSupabase().from('semesters').delete().eq('id', id),
  },

  subjects: {
    getBySemester: (semesterId: string) =>
      requireSupabase()
        .from('subjects')
        .select('*')
        .eq('semester_id', semesterId)
        .eq('published', true)
        .order('name'),
    getById: (id: string) => requireSupabase().from('subjects').select('*').eq('id', id).single(),
  },

  modules: {
    getBySubject: (subjectId: string) =>
      requireSupabase().from('modules').select('*').eq('subject_id', subjectId).order('order'),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('modules').insert(data).select('*').single(),
    update: (id: string, data: Record<string, unknown>) =>
      requireSupabase().from('modules').update(data).eq('id', id).select('*').single(),
    delete: (id: string) => requireSupabase().from('modules').delete().eq('id', id),
  },

  documents: {
    getBySubject: (subjectId: string) =>
      requireSupabase().from('documents').select('*').eq('subject_id', subjectId).order('created_at'),
    getByModule: (moduleId: string) =>
      requireSupabase().from('documents').select('*').eq('module_id', moduleId).order('created_at'),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('documents').insert(data).select('*').single(),
    update: (id: string, data: Record<string, unknown>) =>
      requireSupabase().from('documents').update(data).eq('id', id).select('*').single(),
    delete: (id: string) => requireSupabase().from('documents').delete().eq('id', id),
  },

  bookmarks: {
    getAll: () =>
      requireSupabase().from('bookmarks').select('*').order('created_at', { ascending: false }),
    getByUser: (userId: string) =>
      requireSupabase().from('bookmarks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    getByUserAndSubject: (userId: string, subjectId: string) =>
      requireSupabase()
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false }),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('bookmarks').insert(data).select('*').single(),
    delete: (id: string) => requireSupabase().from('bookmarks').delete().eq('id', id),
  },

  adminActivityLog: {
    getBySubject: (subjectId: string) =>
      requireSupabase()
        .from('admin_activity_log')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false }),
    create: (data: Record<string, unknown>) =>
      requireSupabase().from('admin_activity_log').insert(data).select('*').single(),
  },
};
