import { getCurrentUser } from '@/lib/auth';
import { getSubjectResources } from '@/lib/academics';
import { getSubjectsResult } from '@/lib/subjects';
import { db } from '@/lib/supabaseClient';
import type { Bookmark, BookmarkAnalytics } from '@/types';

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const BOOKMARK_STORAGE_PREFIX = 'vtu-smartprep.bookmarks.';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getStorageKey(userId: string): string {
  return `${BOOKMARK_STORAGE_PREFIX}${userId}`;
}

function readLocalBookmarks(userId: string): Bookmark[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Bookmark[];
  } catch (error) {
    console.error('Failed to parse stored bookmarks:', error);
    return [];
  }
}

function writeLocalBookmarks(userId: string, bookmarks: Bookmark[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(bookmarks));
}

function shouldUseMockWrites(): boolean {
  return !hasSupabaseEnv;
}

export async function getSubjectBookmarks(
  subjectId: string
): Promise<{ data: Bookmark[]; fallback: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    return { data: [], fallback: false };
  }

  try {
    const { data, error } = await db.bookmarks.getByUserAndSubject(user.id, subjectId);
    if (error) {
      throw new Error(error.message);
    }

    return { data: (data ?? []) as Bookmark[], fallback: false };
  } catch (error) {
    console.error('Failed to load subject bookmarks:', error);
    return {
      data: readLocalBookmarks(user.id).filter((bookmark) => bookmark.subject_id === subjectId),
      fallback: true,
    };
  }
}

export async function getUserBookmarks(): Promise<{ data: Bookmark[]; fallback: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    return { data: [], fallback: false };
  }

  try {
    const { data, error } = await db.bookmarks.getByUser(user.id);
    if (error) {
      throw new Error(error.message);
    }

    return { data: (data ?? []) as Bookmark[], fallback: false };
  } catch (error) {
    console.error('Failed to load user bookmarks:', error);
    return { data: readLocalBookmarks(user.id), fallback: true };
  }
}

export async function getBookmarkAnalytics(): Promise<BookmarkAnalytics> {
  try {
    const [{ data: bookmarkData, error: bookmarkError }, subjectsResult] = await Promise.all([
      db.bookmarks.getAll(),
      getSubjectsResult(),
    ]);

    if (bookmarkError) {
      throw new Error(bookmarkError.message);
    }

    const documentBookmarks = ((bookmarkData ?? []) as Bookmark[]).filter(
      (bookmark) => bookmark.item_type === 'document' && bookmark.document_id && bookmark.subject_id
    );

    if (documentBookmarks.length === 0) {
      return {
        totalBookmarks: 0,
        uniqueStudents: 0,
        recentBookmarks7d: 0,
        topSubjects: [],
        topDocuments: [],
        lowEngagementSubjects: subjectsResult.data
          .map((subject) => ({
            subject_id: subject.id,
            subject_name: subject.name,
            count: 0,
          }))
          .slice(0, 5),
        fallback: subjectsResult.fallback,
      };
    }

    const uniqueSubjectIds = [...new Set(documentBookmarks.map((bookmark) => bookmark.subject_id as string))];
    const resourcesBySubject = await Promise.all(
      uniqueSubjectIds.map(async (subjectId) => ({
        subjectId,
        ...(await getSubjectResources(subjectId)),
      }))
    );

    const subjectMap = new Map(subjectsResult.data.map((subject) => [subject.id, subject]));

    const subjectCounts = new Map<string, { subject_name: string; count: number }>();
    const documentCounts = new Map<
      string,
      { subject_id: string; subject_name: string; document_title: string; count: number }
    >();

    for (const bookmark of documentBookmarks) {
      const subjectId = bookmark.subject_id as string;
      const documentId = bookmark.document_id as string;
      const subject = subjectMap.get(subjectId);
      const resources = resourcesBySubject.find((item) => item.subjectId === subjectId);
      const document = resources?.documents.find((item) => item.id === documentId);

      if (!subject || !document) {
        continue;
      }

      const currentSubject = subjectCounts.get(subjectId);
      subjectCounts.set(subjectId, {
        subject_name: subject.name,
        count: (currentSubject?.count ?? 0) + 1,
      });

      const currentDocument = documentCounts.get(documentId);
      documentCounts.set(documentId, {
        subject_id: subjectId,
        subject_name: subject.name,
        document_title: document.title,
        count: (currentDocument?.count ?? 0) + 1,
      });
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentBookmarks7d = documentBookmarks.filter((bookmark) => {
      const createdAt = new Date(bookmark.created_at).getTime();
      return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo;
    }).length;

    const lowEngagementSubjects = subjectsResult.data
      .map((subject) => ({
        subject_id: subject.id,
        subject_name: subject.name,
        count: subjectCounts.get(subject.id)?.count ?? 0,
      }))
      .sort((left, right) => left.count - right.count || left.subject_name.localeCompare(right.subject_name))
      .slice(0, 5);

    return {
      totalBookmarks: documentBookmarks.length,
      uniqueStudents: new Set(documentBookmarks.map((bookmark) => bookmark.user_id)).size,
      recentBookmarks7d,
      topSubjects: [...subjectCounts.entries()]
        .map(([subject_id, value]) => ({ subject_id, ...value }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
      topDocuments: [...documentCounts.entries()]
        .map(([document_id, value]) => ({ document_id, ...value }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
      lowEngagementSubjects,
      fallback: subjectsResult.fallback || resourcesBySubject.some((item) => item.fallback),
    };
  } catch (error) {
    console.error('Failed to load bookmark analytics:', error);
    return {
      totalBookmarks: 0,
      uniqueStudents: 0,
      recentBookmarks7d: 0,
      topSubjects: [],
      topDocuments: [],
      lowEngagementSubjects: [],
      fallback: true,
    };
  }
}

export async function getSubjectDocumentBookmarkCounts(
  subjectId: string
): Promise<{ counts: Record<string, number>; fallback: boolean }> {
  try {
    const { data, error } = await db.bookmarks.getAll();
    if (error) {
      throw new Error(error.message);
    }

    const counts: Record<string, number> = {};
    for (const bookmark of (data ?? []) as Bookmark[]) {
      if (
        bookmark.item_type !== 'document' ||
        bookmark.subject_id !== subjectId ||
        !bookmark.document_id
      ) {
        continue;
      }

      counts[bookmark.document_id] = (counts[bookmark.document_id] ?? 0) + 1;
    }

    return { counts, fallback: false };
  } catch (error) {
    console.error('Failed to load subject document bookmark counts:', error);
    return { counts: {}, fallback: true };
  }
}

export async function toggleDocumentBookmark(
  subjectId: string,
  documentId: string
): Promise<{ bookmarked: boolean; bookmark: Bookmark | null; fallback: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Please log in to save bookmarks.');
  }

  try {
    const { data: existing, error: existingError } = await db.bookmarks.getByUserAndSubject(
      user.id,
      subjectId
    );

    if (existingError) {
      throw new Error(existingError.message);
    }

    const matchingBookmark = (existing ?? []).find(
      (bookmark) => bookmark.document_id === documentId && bookmark.item_type === 'document'
    ) as Bookmark | undefined;

    if (matchingBookmark) {
      const { error } = await db.bookmarks.delete(matchingBookmark.id);
      if (error) {
        throw new Error(error.message);
      }

      return { bookmarked: false, bookmark: null, fallback: false };
    }

    const { data, error } = await db.bookmarks.create({
      user_id: user.id,
      subject_id: subjectId,
      document_id: documentId,
      item_type: 'document',
    });

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save bookmark');
    }

    return { bookmarked: true, bookmark: data as Bookmark, fallback: false };
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);

    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to update bookmark');
    }

    const storedBookmarks = readLocalBookmarks(user.id);
    const existingBookmark = storedBookmarks.find(
      (bookmark) => bookmark.document_id === documentId && bookmark.item_type === 'document'
    );

    if (existingBookmark) {
      const nextBookmarks = storedBookmarks.filter((bookmark) => bookmark.id !== existingBookmark.id);
      writeLocalBookmarks(user.id, nextBookmarks);
      return { bookmarked: false, bookmark: null, fallback: true };
    }

    const bookmark: Bookmark = {
      id: `${Date.now()}-${documentId}`,
      user_id: user.id,
      subject_id: subjectId,
      document_id: documentId,
      item_type: 'document',
      created_at: new Date().toISOString(),
    };

    writeLocalBookmarks(user.id, [bookmark, ...storedBookmarks]);
    return { bookmarked: true, bookmark, fallback: true };
  }
}
