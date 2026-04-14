import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/supabaseClient';
import type { AdminActivityLog } from '@/types';

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const ADMIN_ACTIVITY_STORAGE_PREFIX = 'vtu-smartprep.admin-resources.recent-changes.';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getStorageKey(subjectId: string): string {
  return `${ADMIN_ACTIVITY_STORAGE_PREFIX}${subjectId}`;
}

function readLocalActivity(subjectId: string): AdminActivityLog[] {
  if (!isBrowser() || !subjectId) {
    return [];
  }

  const raw = window.localStorage.getItem(getStorageKey(subjectId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as AdminActivityLog[];
  } catch (error) {
    console.error('Failed to parse local admin activity log:', error);
    return [];
  }
}

function writeLocalActivity(subjectId: string, items: AdminActivityLog[]): void {
  if (!isBrowser() || !subjectId) {
    return;
  }

  window.localStorage.setItem(getStorageKey(subjectId), JSON.stringify(items));
}

function shouldUseMockWrites(): boolean {
  return !hasSupabaseEnv;
}

export async function getAdminActivityLog(
  subjectId: string
): Promise<{ data: AdminActivityLog[]; fallback: boolean }> {
  if (!subjectId) {
    return { data: [], fallback: false };
  }

  try {
    const { data, error } = await db.adminActivityLog.getBySubject(subjectId);
    if (error) {
      throw new Error(error.message);
    }

    return { data: (data ?? []) as AdminActivityLog[], fallback: false };
  } catch (error) {
    console.error('Failed to load admin activity log:', error);
    return { data: readLocalActivity(subjectId), fallback: true };
  }
}

export async function createAdminActivityLog(
  subjectId: string,
  action: string,
  details: string,
  metadata?: Record<string, unknown>
): Promise<{ data: AdminActivityLog; fallback: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Please sign in again to record admin activity.');
  }

  const enrichedMetadata = {
    ...(metadata ?? {}),
    admin_name: user.full_name,
    admin_email: user.email,
  };

  try {
    const { data, error } = await db.adminActivityLog.create({
      user_id: user.id,
      subject_id: subjectId,
      action,
      details,
      metadata: enrichedMetadata,
    });

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save admin activity');
    }

    return { data: data as AdminActivityLog, fallback: false };
  } catch (error) {
    console.error('Failed to create admin activity log:', error);

    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to save admin activity');
    }

    const item: AdminActivityLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: user.id,
      subject_id: subjectId,
      action,
      details,
      metadata: enrichedMetadata,
      created_at: new Date().toISOString(),
    };

    const nextItems = [item, ...readLocalActivity(subjectId)].slice(0, 8);
    writeLocalActivity(subjectId, nextItems);
    return { data: item, fallback: true };
  }
}

export function clearLocalAdminActivityLog(subjectId: string): void {
  if (!isBrowser() || !subjectId) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(subjectId));
}
