'use client';

import AdminShell from '@/components/layout/AdminShell';
import {
  clearLocalAdminActivityLog,
  createAdminActivityLog,
  getAdminActivityLog,
} from '@/lib/adminActivity';
import { getProtectedRouteState } from '@/lib/auth';
import {
  createDocument,
  createModule,
  deleteDocument,
  deleteModule,
  getSubjectResources,
  updateDocument,
  updateModule,
} from '@/lib/academics';
import { getSubjectDocumentBookmarkCounts } from '@/lib/bookmarks';
import {
  deleteResourceFile,
  getStorageBucketName,
  isStorageUploadConfigured,
  uploadResourceFile,
} from '@/lib/storage';
import { getSubjectsResult } from '@/lib/subjects';
import type {
  AdminActivityLog,
  CreateDocumentInput,
  CreateModuleInput,
  Document,
  Module,
  Subject,
  SubjectDocumentType,
  UpdateDocumentInput,
  UpdateModuleInput,
} from '@/types';
import { BookOpen, Eye, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DOCUMENT_TYPES: { value: SubjectDocumentType; label: string }[] = [
  { value: 'notes', label: 'Notes' },
  { value: 'pyq', label: 'PYQ (Previous Year Question)' },
  { value: 'solved-answer', label: 'Solved Answer' },
  { value: 'important-question', label: 'Important Question' },
];

const TYPE_BADGE: Record<SubjectDocumentType, string> = {
  notes: 'bg-blue-900/50 border-blue-700 text-blue-300',
  pyq: 'bg-amber-900/50 border-amber-700 text-amber-300',
  'solved-answer': 'bg-green-900/50 border-green-700 text-green-300',
  'important-question': 'bg-purple-900/50 border-purple-700 text-purple-300',
  textbook: 'bg-slate-800 border-slate-700 text-slate-300',
  syllabus: 'bg-slate-800 border-slate-700 text-slate-300',
};

const TYPE_LABEL: Record<SubjectDocumentType, string> = {
  notes: 'Notes',
  pyq: 'PYQ',
  'solved-answer': 'Solved',
  'important-question': 'Important Q',
  textbook: 'Textbook',
  syllabus: 'Syllabus',
};

const BULK_SUMMARY_TEMPLATES: Array<{
  id: 'notes' | 'pyq' | 'solved-answer' | 'important-question' | 'file-only' | 'short-summary';
  label: string;
  content: string;
}> = [
  {
    id: 'notes',
    label: 'Notes template',
    content:
      'Covers the core concepts for this module with short revision points, key definitions, and exam-focused takeaways.',
  },
  {
    id: 'pyq',
    label: 'PYQ template',
    content:
      'Includes repeated previous-year questions grouped for quick revision, with patterns that commonly appear in VTU exams.',
  },
  {
    id: 'solved-answer',
    label: 'Solved answer template',
    content:
      'Provides structured model answers with point-wise explanations that help students write stronger 5-mark and 10-mark responses.',
  },
  {
    id: 'important-question',
    label: 'Important question template',
    content:
      'Highlights high-priority exam questions and the exact topics students should prepare first for faster scoring revision.',
  },
  {
    id: 'file-only',
    label: 'File-only template',
    content:
      'Use this file for quick revision of the attached material. It contains the main exam-relevant points students should review before practice.',
  },
  {
    id: 'short-summary',
    label: 'Expand weak summary',
    content:
      'Recommended use: explain the topic coverage, the question types or marks this helps with, and why it is worth saving for later revision.',
  },
];

const TYPE_TEMPLATE_IDS: SubjectDocumentType[] = [
  'notes',
  'pyq',
  'solved-answer',
  'important-question',
];

function isSummaryTemplateDocumentType(
  value: SubjectDocumentType
): value is 'notes' | 'pyq' | 'solved-answer' | 'important-question' {
  return TYPE_TEMPLATE_IDS.includes(value);
}

function getDocumentTypeLead(type: SubjectDocumentType): string {
  if (type === 'pyq') {
    return 'previous-year questions';
  }

  if (type === 'solved-answer') {
    return 'model answers and answer-writing guidance';
  }

  if (type === 'important-question') {
    return 'high-priority exam questions';
  }

  if (type === 'textbook') {
    return 'reference reading material';
  }

  if (type === 'syllabus') {
    return 'syllabus coverage and scope';
  }

  return 'module revision notes';
}

function getActivityActor(item: Pick<AdminActivityLog, 'metadata'>): {
  actorName?: string;
  actorEmail?: string;
} {
  const actorName =
    typeof item.metadata?.admin_name === 'string' && item.metadata.admin_name.trim()
      ? item.metadata.admin_name.trim()
      : undefined;
  const actorEmail =
    typeof item.metadata?.admin_email === 'string' && item.metadata.admin_email.trim()
      ? item.metadata.admin_email.trim()
      : undefined;

  return { actorName, actorEmail };
}

function getActivityTargets(item: Pick<AdminActivityLog, 'metadata'>): {
  moduleId?: string;
  documentId?: string;
} {
  const moduleId =
    typeof item.metadata?.module_id === 'string' && item.metadata.module_id.trim()
      ? item.metadata.module_id.trim()
      : undefined;
  const documentId =
    typeof item.metadata?.document_id === 'string' && item.metadata.document_id.trim()
      ? item.metadata.document_id.trim()
      : undefined;

  return { moduleId, documentId };
}

interface RecentChangeItem {
  id: string;
  label: string;
  details: string;
  createdAt: string;
  actorName?: string;
  actorEmail?: string;
  moduleId?: string;
  documentId?: string;
  metadata?: AdminActivityLog['metadata'];
}

interface RecentChangeGroup {
  id: string;
  actorLabel: string;
  dateLabel: string;
  startedAt: string;
  endedAt: string;
  items: RecentChangeItem[];
}

interface BulkUndoItem {
  id: string;
  documents: Array<{
    id: string;
    module_id: string;
    type: SubjectDocumentType;
    content?: string;
  }>;
}

export default function AdminResourcesPage() {
  const storageUploadsEnabled = isStorageUploadConfigured();
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [subjectLoadNotice, setSubjectLoadNotice] = useState<string | null>(null);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);
  const [activityNotice, setActivityNotice] = useState<string | null>(null);
  const [documentBookmarkCounts, setDocumentBookmarkCounts] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentChanges, setRecentChanges] = useState<RecentChangeItem[]>([]);
  const [recentChangeActionFilter, setRecentChangeActionFilter] = useState<'all' | string>('all');
  const [recentChangeAdminQuery, setRecentChangeAdminQuery] = useState('');
  const [recentChangeSearchQuery, setRecentChangeSearchQuery] = useState('');
  const [selectedRecentChange, setSelectedRecentChange] = useState<RecentChangeItem | null>(null);
  const [expandedRecentChangeGroups, setExpandedRecentChangeGroups] = useState<string[]>([]);

  // Module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState<Omit<CreateModuleInput, 'subject_id'>>({
    title: '',
    description: '',
    order: 1,
  });
  const [moduleFormError, setModuleFormError] = useState<string | null>(null);
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleEditForm, setModuleEditForm] = useState<Omit<CreateModuleInput, 'subject_id'>>({
    title: '',
    description: '',
    order: 1,
  });
  const [moduleEditError, setModuleEditError] = useState<string | null>(null);
  const [isSavingModuleEdit, setIsSavingModuleEdit] = useState(false);

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState<Omit<CreateDocumentInput, 'subject_id'>>({
    module_id: '',
    type: 'notes',
    title: '',
    content: '',
    file_url: '',
  });
  const [docFormError, setDocFormError] = useState<string | null>(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [isUploadingDocFile, setIsUploadingDocFile] = useState(false);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'all' | SubjectDocumentType>('all');
  const [documentSortOrder, setDocumentSortOrder] = useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'bookmarks_desc'>('updated_desc');
  const [documentInsightFilter, setDocumentInsightFilter] = useState<'all' | 'zero_saves' | 'file_only' | 'short_summary'>('all');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docEditForm, setDocEditForm] = useState<Omit<CreateDocumentInput, 'subject_id'>>({
    module_id: '',
    type: 'notes',
    title: '',
    content: '',
    file_url: '',
  });
  const [docEditError, setDocEditError] = useState<string | null>(null);
  const [isSavingDocEdit, setIsSavingDocEdit] = useState(false);
  const [isUploadingReplacementFile, setIsUploadingReplacementFile] = useState(false);
  const [docEditUploadFile, setDocEditUploadFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [bulkEditModuleId, setBulkEditModuleId] = useState('');
  const [bulkEditType, setBulkEditType] = useState<'keep' | SubjectDocumentType>('keep');
  const [bulkSummaryText, setBulkSummaryText] = useState('');
  const [bulkSummaryTemplate, setBulkSummaryTemplate] = useState<
    (typeof BULK_SUMMARY_TEMPLATES)[number]['id'] | ''
  >('');
  const [isBulkSavingDocuments, setIsBulkSavingDocuments] = useState(false);
  const [isBulkDeletingDocuments, setIsBulkDeletingDocuments] = useState(false);
  const [lastBulkUndo, setLastBulkUndo] = useState<BulkUndoItem | null>(null);
  const [isUndoingBulkEdit, setIsUndoingBulkEdit] = useState(false);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      const { redirectTo } = await getProtectedRouteState('admin');
      if (!isActive) return;
      if (redirectTo) { router.push(redirectTo); return; }
      setIsCheckingAccess(false);

      setIsLoadingSubjects(true);
      try {
        const result = await getSubjectsResult();
        if (isActive) {
          setSubjects(result.data);
          setSubjectLoadNotice(
            result.fallback
              ? 'Using fallback subject data because the live Supabase content is unavailable right now.'
              : null
          );
        }
      } finally {
        if (isActive) setIsLoadingSubjects(false);
      }
    };

    init();
    return () => { isActive = false; };
  }, [router]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setModules([]);
      setDocuments([]);
      setRecentChanges([]);
      setRecentChangeActionFilter('all');
      setRecentChangeAdminQuery('');
      setRecentChangeSearchQuery('');
      setSelectedRecentChange(null);
      setExpandedRecentChangeGroups([]);
      return;
    }

    let isActive = true;

    const load = async () => {
      setIsLoadingResources(true);
      try {
        const [{ modules: mods, documents: docs }, bookmarkCountsResult] = await Promise.all([
          getSubjectResources(selectedSubjectId),
          getSubjectDocumentBookmarkCounts(selectedSubjectId),
        ]);
        if (!isActive) return;
        setModules(mods);
        setDocuments(docs);
        setDocumentBookmarkCounts(bookmarkCountsResult.counts);
        setBookmarkNotice(
          bookmarkCountsResult.fallback
            ? 'Bookmark engagement counts are unavailable right now, so document save metrics may be incomplete.'
            : null
        );
        setEditingModuleId(null);
        setEditingDocId(null);
        setModuleEditError(null);
        setDocEditError(null);
        setSelectedDocumentIds([]);
        setBulkEditModuleId('');
        setBulkEditType('keep');
        setBulkSummaryText('');
        setBulkSummaryTemplate('');
        setLastBulkUndo(null);
        const activityResult = await getAdminActivityLog(selectedSubjectId);
        if (!isActive) return;
        setRecentChanges(
          activityResult.data.map((item: AdminActivityLog) => ({
            id: item.id,
            label: item.action,
            details: item.details,
            createdAt: item.created_at,
            ...getActivityActor(item),
            ...getActivityTargets(item),
            metadata: item.metadata,
          }))
        );
        setActivityNotice(
          activityResult.fallback
            ? 'Using local admin activity history because shared Supabase logging is unavailable right now.'
            : null
        );
        setRecentChangeActionFilter('all');
        setRecentChangeAdminQuery('');
        setRecentChangeSearchQuery('');
        setSelectedRecentChange(null);
        setExpandedRecentChangeGroups([]);
        setDocumentSearchQuery('');
        setDocumentTypeFilter('all');
        setDocumentSortOrder('updated_desc');
        setDocumentInsightFilter('all');
        if (mods.length > 0) {
          setDocForm((prev) => ({ ...prev, module_id: prev.module_id || mods[0].id }));
        }
      } finally {
        if (isActive) setIsLoadingResources(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, [selectedSubjectId]);

  const addRecentChange = async (
    label: string,
    details: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const result = await createAdminActivityLog(selectedSubjectId, label, details, metadata);
      const nextItem: RecentChangeItem = {
        id: result.data.id,
        label: result.data.action,
        details: result.data.details,
        createdAt: result.data.created_at,
        ...getActivityActor(result.data),
        ...getActivityTargets(result.data),
        metadata: result.data.metadata,
      };
      setRecentChanges((prev) => [nextItem, ...prev].slice(0, 8));
      setActivityNotice(
        result.fallback
          ? 'Using local admin activity history because shared Supabase logging is unavailable right now.'
          : null
      );
    } catch (error) {
      console.error('Failed to record admin activity:', error);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) { setModuleFormError('Title is required.'); return; }
    setIsSubmittingModule(true);
    setModuleFormError(null);
    setSuccessMessage(null);
    try {
      const { data } = await createModule({ ...moduleForm, subject_id: selectedSubjectId });
      setModules((prev) => [...prev, data].sort((a, b) => a.order - b.order));
      setModuleForm({ title: '', description: '', order: modules.length + 2 });
      setShowModuleForm(false);
      setSuccessMessage(`Module "${data.title}" created successfully.`);
      void addRecentChange('Module created', data.title, { module_id: data.id });
    } catch (err) {
      setModuleFormError(err instanceof Error ? err.message : 'Failed to create module');
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Delete this module and all its documents?')) return;
    setSuccessMessage(null);
    await deleteModule(id);
    setModules((prev) => prev.filter((m) => m.id !== id));
    setDocuments((prev) => prev.filter((d) => d.module_id !== id));
    if (editingModuleId === id) {
      setEditingModuleId(null);
      setModuleEditError(null);
    }
    setSuccessMessage('Module deleted successfully.');
    void addRecentChange('Module deleted', id, { module_id: id });
  };

  const startEditingModule = (module: Module) => {
    setEditingModuleId(module.id);
    setModuleEditForm({
      title: module.title,
      description: module.description ?? '',
      order: module.order,
    });
    setModuleEditError(null);
    setShowModuleForm(false);
  };

  const cancelEditingModule = () => {
    setEditingModuleId(null);
    setModuleEditError(null);
  };

  const handleSaveModuleEdit = async (moduleId: string) => {
    if (!moduleEditForm.title.trim()) {
      setModuleEditError('Title is required.');
      return;
    }

    setIsSavingModuleEdit(true);
    setModuleEditError(null);
    setSuccessMessage(null);

    try {
      const updates: UpdateModuleInput = {
        title: moduleEditForm.title.trim(),
        description: moduleEditForm.description?.trim() || undefined,
        order: moduleEditForm.order,
      };
      const { data } = await updateModule(moduleId, updates);
      setModules((prev) => prev.map((module) => (module.id === moduleId ? data : module)).sort((a, b) => a.order - b.order));
      setEditingModuleId(null);
      setSuccessMessage(`Module "${data.title}" updated successfully.`);
      void addRecentChange('Module updated', data.title, { module_id: data.id });
    } catch (err) {
      setModuleEditError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setIsSavingModuleEdit(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim() || !docForm.module_id) {
      setDocFormError('Title and module are required.');
      return;
    }
    setIsSubmittingDoc(true);
    setDocFormError(null);
    setSuccessMessage(null);
    try {
      let uploadedFileUrl: string | undefined;
      if (docUploadFile) {
        setIsUploadingDocFile(true);
        uploadedFileUrl = await uploadResourceFile(
          docUploadFile,
          selectedSubjectId,
          docForm.module_id
        );
      }
      const { data } = await createDocument({
        ...docForm,
        subject_id: selectedSubjectId,
        file_url: uploadedFileUrl ?? docForm.file_url,
      });
      setDocuments((prev) => [...prev, data]);
      setDocForm((prev) => ({ ...prev, title: '', content: '', file_url: '' }));
      setDocUploadFile(null);
      setShowDocForm(false);
      setSuccessMessage(`Document "${data.title}" saved successfully.`);
      void addRecentChange('Document created', data.title, { document_id: data.id });
    } catch (err) {
      setDocFormError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setIsUploadingDocFile(false);
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    setSuccessMessage(null);
    const documentToDelete = documents.find((doc) => doc.id === id);
    if (documentToDelete?.file_url) {
      try {
        await deleteResourceFile(documentToDelete.file_url);
      } catch (error) {
        console.warn('Failed to delete file from storage:', error);
      }
    }
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedDocumentIds((prev) => prev.filter((documentId) => documentId !== id));
    if (editingDocId === id) {
      setEditingDocId(null);
      setDocEditError(null);
    }
    setSuccessMessage('Document deleted successfully.');
    void addRecentChange('Document deleted', documentToDelete?.title ?? id, { document_id: id });
  };

  const handleToggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleBulkDeleteDocuments = async () => {
    if (selectedDocumentIds.length === 0) {
      return;
    }

    if (!confirm(`Delete ${selectedDocumentIds.length} selected document(s)? This cannot be undone.`)) {
      return;
    }

    setIsBulkDeletingDocuments(true);
    setSuccessMessage(null);

    try {
      const documentsToDelete = documents.filter((document) => selectedDocumentIds.includes(document.id));

      for (const document of documentsToDelete) {
        if (document.file_url) {
          try {
            await deleteResourceFile(document.file_url);
          } catch (error) {
            console.warn('Failed to delete file from storage during bulk delete:', error);
          }
        }

        await deleteDocument(document.id);
      }

      setDocuments((prev) => prev.filter((document) => !selectedDocumentIds.includes(document.id)));
      setSelectedDocumentIds([]);
      setSuccessMessage(`${documentsToDelete.length} document(s) deleted successfully.`);
      void addRecentChange(
        'Bulk delete',
        `${documentsToDelete.length} document(s): ${documentsToDelete.slice(0, 3).map((document) => document.title).join(', ')}${documentsToDelete.length > 3 ? '...' : ''}`,
        {
          document_ids: documentsToDelete.map((document) => document.id),
          affected_count: documentsToDelete.length,
        }
      );
    } finally {
      setIsBulkDeletingDocuments(false);
    }
  };

  const handleBulkUpdateDocuments = async () => {
    if (selectedDocumentIds.length === 0) {
      return;
    }

    const hasModuleChange = Boolean(bulkEditModuleId);
    const hasTypeChange = bulkEditType !== 'keep';
    const hasSummaryChange = Boolean(bulkSummaryText.trim());

    if (!hasModuleChange && !hasTypeChange && !hasSummaryChange) {
      setSuccessMessage('Choose a module, type, or summary change before applying a bulk update.');
      return;
    }

    setIsBulkSavingDocuments(true);
    setSuccessMessage(null);

    try {
      const documentsToUpdate = documents.filter((document) => selectedDocumentIds.includes(document.id));
      const nextBulkType: SubjectDocumentType | undefined =
        bulkEditType === 'keep' ? undefined : bulkEditType;
      const previousDocuments = documentsToUpdate.map((document) => ({
        id: document.id,
        module_id: document.module_id,
        type: document.type,
        content: document.content,
      }));
      const moduleChangeCount = hasModuleChange
        ? documentsToUpdate.filter((document) => document.module_id !== bulkEditModuleId).length
        : 0;
      const typeChangeCount = hasTypeChange
        ? documentsToUpdate.filter((document) => document.type !== bulkEditType).length
        : 0;
      const summaryChangeCount = hasSummaryChange ? documentsToUpdate.length : 0;
      const moduleFromTitles = hasModuleChange
        ? [...new Set(documentsToUpdate.map((document) => getModuleTitle(document.module_id)))]
        : [];
      const typeFromLabels = nextBulkType
        ? [...new Set(documentsToUpdate.map((document) => TYPE_LABEL[document.type] ?? document.type))]
        : [];
      const typeToLabel = nextBulkType ? TYPE_LABEL[nextBulkType] ?? nextBulkType : undefined;

      const updatedDocuments = await Promise.all(
        documentsToUpdate.map(async (document) => {
          const existingContent = document.content?.trim();
          const nextContent = hasSummaryChange
            ? [bulkSummaryText.trim(), existingContent].filter(Boolean).join('\n\n')
            : document.content;
          const updates: UpdateDocumentInput = {
            module_id: hasModuleChange ? bulkEditModuleId : document.module_id,
            type: nextBulkType ?? document.type,
            content: nextContent,
          };

          const { data } = await updateDocument(document.id, updates);
          return data;
        })
      );

      const updatedMap = new Map(updatedDocuments.map((document) => [document.id, document]));
      setDocuments((prev) =>
        prev.map((document) => updatedMap.get(document.id) ?? document)
      );
      setSelectedDocumentIds([]);
      setBulkEditModuleId('');
      setBulkEditType('keep');
      setBulkSummaryText('');
      setBulkSummaryTemplate('');
      setLastBulkUndo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        documents: previousDocuments,
      });
      setSuccessMessage(`${updatedDocuments.length} document(s) updated successfully.`);
      void addRecentChange(
        'Bulk update',
        `${updatedDocuments.length} document(s) updated`,
        {
          document_ids: updatedDocuments.map((document) => document.id),
          affected_count: updatedDocuments.length,
          module_change_count: moduleChangeCount,
          module_from_titles: moduleFromTitles,
          module_to_title: hasModuleChange ? getModuleTitle(bulkEditModuleId) : undefined,
          type_change_count: typeChangeCount,
          type_from_labels: typeFromLabels,
          type_to_label: typeToLabel,
          summary_change_count: summaryChangeCount,
          summary_preview: hasSummaryChange ? bulkSummaryText.trim().slice(0, 140) : undefined,
        }
      );
    } catch (error) {
      setSuccessMessage(
        error instanceof Error ? error.message : 'Failed to bulk update selected documents.'
      );
    } finally {
      setIsBulkSavingDocuments(false);
    }
  };

  const handleUndoLastBulkEdit = async () => {
    if (!lastBulkUndo) {
      return;
    }

    setIsUndoingBulkEdit(true);
    setSuccessMessage(null);

    try {
      const restoredDocuments = await Promise.all(
        lastBulkUndo.documents.map(async (document) => {
          const { data } = await updateDocument(document.id, {
            module_id: document.module_id,
            type: document.type,
            content: document.content,
          });

          return data;
        })
      );

      const restoredMap = new Map(restoredDocuments.map((document) => [document.id, document]));
      setDocuments((prev) => prev.map((document) => restoredMap.get(document.id) ?? document));
      setLastBulkUndo(null);
      setSuccessMessage('Last bulk edit was undone successfully.');
      void addRecentChange('Bulk undo', `${restoredDocuments.length} document(s) restored`, {
        document_ids: restoredDocuments.map((document) => document.id),
        affected_count: restoredDocuments.length,
      });
    } catch (error) {
      setSuccessMessage(
        error instanceof Error ? error.message : 'Failed to undo the last bulk edit.'
      );
    } finally {
      setIsUndoingBulkEdit(false);
    }
  };

  const startEditingDocument = (document: Document) => {
    setEditingDocId(document.id);
    setDocEditForm({
      module_id: document.module_id,
      type: document.type,
      title: document.title,
      content: document.content ?? '',
      file_url: document.file_url ?? '',
    });
    setDocEditUploadFile(null);
    setDocEditError(null);
    setShowDocForm(false);
  };

  const cancelEditingDocument = () => {
    setEditingDocId(null);
    setDocEditUploadFile(null);
    setDocEditError(null);
  };

  const handleSaveDocumentEdit = async (documentId: string) => {
    if (!docEditForm.title.trim() || !docEditForm.module_id) {
      setDocEditError('Title and module are required.');
      return;
    }

    setIsSavingDocEdit(true);
    setDocEditError(null);
    setSuccessMessage(null);

    try {
      let uploadedFileUrl: string | undefined;
      if (docEditUploadFile) {
        setIsUploadingReplacementFile(true);
        uploadedFileUrl = await uploadResourceFile(
          docEditUploadFile,
          selectedSubjectId,
          docEditForm.module_id
        );
      }
      const updates: UpdateDocumentInput = {
        module_id: docEditForm.module_id,
        type: docEditForm.type,
        title: docEditForm.title.trim(),
        content: docEditForm.content?.trim() || undefined,
        file_url: uploadedFileUrl ?? (docEditForm.file_url?.trim() || undefined),
      };
      const { data } = await updateDocument(documentId, updates);
      setDocuments((prev) => prev.map((document) => (document.id === documentId ? data : document)));
      setEditingDocId(null);
      setDocEditUploadFile(null);
      setSuccessMessage(`Document "${data.title}" updated successfully.`);
      void addRecentChange('Document updated', data.title, { document_id: data.id });
    } catch (err) {
      setDocEditError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setIsUploadingReplacementFile(false);
      setIsSavingDocEdit(false);
    }
  };

  const getModuleTitle = (moduleId: string) =>
    modules.find((m) => m.id === moduleId)?.title ?? 'Unknown module';

  const getFileLabel = (fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      return lastSegment ? decodeURIComponent(lastSegment) : 'Attached file';
    } catch {
      return 'Attached file';
    }
  };

  const formatDocumentDate = (value?: string) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleString();
  };

  const recentChangeActionOptions = Array.from(
    new Set(recentChanges.map((change) => change.label))
  ).sort((a, b) => a.localeCompare(b));

  const normalizedRecentChangeAdminQuery = recentChangeAdminQuery.trim().toLowerCase();
  const normalizedRecentChangeSearchQuery = recentChangeSearchQuery.trim().toLowerCase();
  const filteredRecentChanges = recentChanges.filter((change) => {
    if (recentChangeActionFilter !== 'all' && change.label !== recentChangeActionFilter) {
      return false;
    }

    if (normalizedRecentChangeAdminQuery) {
      const actorText = `${change.actorName ?? ''} ${change.actorEmail ?? ''}`.toLowerCase();
      if (!actorText.includes(normalizedRecentChangeAdminQuery)) {
        return false;
      }
    }

    if (!normalizedRecentChangeSearchQuery) {
      return true;
    }

    const searchableText = [
      change.label,
      change.details,
      change.actorName ?? '',
      change.actorEmail ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedRecentChangeSearchQuery);
  });

  const groupedRecentChanges = filteredRecentChanges.reduce<RecentChangeGroup[]>(
    (groups, change) => {
      const actorLabel = change.actorName ?? change.actorEmail ?? 'Unknown admin';
      const parsedChangeDate = new Date(change.createdAt);
      const dateLabel = Number.isNaN(parsedChangeDate.getTime())
        ? 'Unknown date'
        : parsedChangeDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

      const previousGroup = groups[groups.length - 1];
      const previousGroupEnd = previousGroup ? new Date(previousGroup.endedAt) : null;
      const sameActor = previousGroup?.actorLabel === actorLabel;
      const sameDate = previousGroup?.dateLabel === dateLabel;
      const withinSessionWindow =
        previousGroupEnd &&
        !Number.isNaN(parsedChangeDate.getTime()) &&
        !Number.isNaN(previousGroupEnd.getTime()) &&
        Math.abs(previousGroupEnd.getTime() - parsedChangeDate.getTime()) <= 10 * 60 * 1000;

      if (previousGroup && sameActor && sameDate && withinSessionWindow) {
        previousGroup.items.push(change);
        previousGroup.endedAt = change.createdAt;
        return groups;
      }

      groups.push({
        id: `${change.id}-group`,
        actorLabel,
        dateLabel,
        startedAt: change.createdAt,
        endedAt: change.createdAt,
        items: [change],
      });

      return groups;
    },
    []
  );

  const isRecentChangeGroupExpanded = (group: RecentChangeGroup) =>
    group.items.length <= 1 || expandedRecentChangeGroups.includes(group.id);

  const toggleRecentChangeGroup = (groupId: string) => {
    setExpandedRecentChangeGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const focusRecentChangeTarget = (change: RecentChangeItem) => {
    if (change.documentId) {
      const document = documents.find((item) => item.id === change.documentId);
      if (document) {
        setPreviewDocument(document);
        setEditingDocId(null);
        setEditingModuleId(null);
        return;
      }
    }

    if (change.moduleId) {
      const relatedModule = modules.find((item) => item.id === change.moduleId);
      if (relatedModule) {
        setPreviewDocument(null);
        startEditingModule(relatedModule);
      }
    }
  };

  const hasRecentChangeTarget = (change: RecentChangeItem) =>
    (change.documentId && documents.some((item) => item.id === change.documentId)) ||
    (change.moduleId && modules.some((item) => item.id === change.moduleId));

  const getRecentChangeInsights = (change: RecentChangeItem): string[] => {
    const insights: string[] = [];
    const metadata = change.metadata;

    if (!metadata) {
      return insights;
    }

    if (typeof metadata.affected_count === 'number') {
      insights.push(`${metadata.affected_count} item(s) affected`);
    }

    if (
      typeof metadata.module_change_count === 'number' &&
      metadata.module_change_count > 0 &&
      typeof metadata.module_to_title === 'string'
    ) {
      const fromTitles = Array.isArray(metadata.module_from_titles)
        ? metadata.module_from_titles.filter((value): value is string => typeof value === 'string')
        : [];
      insights.push(
        `Modules: ${fromTitles.length > 0 ? `${fromTitles.join(', ')} -> ` : ''}${metadata.module_to_title} (${metadata.module_change_count})`
      );
    }

    if (
      typeof metadata.type_change_count === 'number' &&
      metadata.type_change_count > 0 &&
      typeof metadata.type_to_label === 'string'
    ) {
      const fromLabels = Array.isArray(metadata.type_from_labels)
        ? metadata.type_from_labels.filter((value): value is string => typeof value === 'string')
        : [];
      insights.push(
        `Types: ${fromLabels.length > 0 ? `${fromLabels.join(', ')} -> ` : ''}${metadata.type_to_label} (${metadata.type_change_count})`
      );
    }

    if (typeof metadata.summary_change_count === 'number' && metadata.summary_change_count > 0) {
      const summaryPreview =
        typeof metadata.summary_preview === 'string' ? metadata.summary_preview : undefined;
      insights.push(
        `Summary note added to ${metadata.summary_change_count} item(s)${summaryPreview ? `: "${summaryPreview}"` : ''}`
      );
    }

    return insights;
  };

  const getRecentChangeTargetLabel = (change: RecentChangeItem) => {
    if (change.documentId) {
      const document = documents.find((item) => item.id === change.documentId);
      if (document) {
        return `Document: ${document.title}`;
      }
    }

    if (change.moduleId) {
      const relatedModule = modules.find((item) => item.id === change.moduleId);
      if (relatedModule) {
        return `Module: ${relatedModule.title}`;
      }
    }

    return null;
  };

  const getRecentChangeMetadataRows = (change: RecentChangeItem) => {
    const metadata = change.metadata;
    if (!metadata) {
      return [] as Array<{ label: string; value: string }>;
    }

    const rows: Array<{ label: string; value: string }> = [];
    const pushRow = (label: string, value: unknown) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        const rendered = value
          .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
          .filter(Boolean)
          .join(', ');
        if (rendered) {
          rows.push({ label, value: rendered });
        }
        return;
      }

      if (typeof value === 'object') {
        rows.push({ label, value: JSON.stringify(value) });
        return;
      }

      rows.push({ label, value: String(value) });
    };

    pushRow('Affected items', metadata.affected_count);
    pushRow('Module from', metadata.module_from_titles);
    pushRow('Module to', metadata.module_to_title);
    pushRow('Module changes', metadata.module_change_count);
    pushRow('Type from', metadata.type_from_labels);
    pushRow('Type to', metadata.type_to_label);
    pushRow('Type changes', metadata.type_change_count);
    pushRow('Summary changes', metadata.summary_change_count);
    pushRow('Summary preview', metadata.summary_preview);

    return rows;
  };

  const normalizedDocumentQuery = documentSearchQuery.trim().toLowerCase();
  const filteredDocuments = documents.filter((doc) => {
    if (documentTypeFilter !== 'all' && doc.type !== documentTypeFilter) {
      return false;
    }

    if (documentInsightFilter === 'zero_saves' && (documentBookmarkCounts[doc.id] ?? 0) !== 0) {
      return false;
    }

    if (documentInsightFilter === 'file_only' && !(Boolean(doc.file_url) && !doc.content?.trim())) {
      return false;
    }

    if (
      documentInsightFilter === 'short_summary' &&
      !(Boolean(doc.content?.trim()) && (doc.content?.trim().length ?? 0) < 80)
    ) {
      return false;
    }

    if (!normalizedDocumentQuery) {
      return true;
    }

    return [doc.title, doc.content, getModuleTitle(doc.module_id), getFileLabel(doc.file_url ?? '')]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedDocumentQuery));
  });

  const sortedDocuments = [...filteredDocuments].sort((left, right) => {
    if (documentSortOrder === 'bookmarks_desc') {
      return (
        (documentBookmarkCounts[right.id] ?? 0) - (documentBookmarkCounts[left.id] ?? 0) ||
        left.title.localeCompare(right.title)
      );
    }

    if (documentSortOrder === 'title_asc') {
      return left.title.localeCompare(right.title);
    }

    const leftDate = new Date(left.updated_at ?? left.created_at).getTime();
    const rightDate = new Date(right.updated_at ?? right.created_at).getTime();

    if (documentSortOrder === 'updated_asc') {
      return leftDate - rightDate;
    }

    return rightDate - leftDate;
  });

  const totalDocumentSaves = documents.reduce(
    (sum, document) => sum + (documentBookmarkCounts[document.id] ?? 0),
    0
  );
  const zeroSaveDocuments = documents.filter((document) => (documentBookmarkCounts[document.id] ?? 0) === 0);
  const fileOnlyZeroSaveDocuments = zeroSaveDocuments.filter(
    (document) => Boolean(document.file_url) && !document.content?.trim()
  );
  const uncategorizedZeroSaveDocuments = zeroSaveDocuments.filter(
    (document) => !modules.some((module) => module.id === document.module_id)
  );
  const thinSummaryDocuments = zeroSaveDocuments.filter(
    (document) => Boolean(document.content?.trim()) && (document.content?.trim().length ?? 0) < 80
  );
  const topSavedDocument = [...documents].sort(
    (left, right) => (documentBookmarkCounts[right.id] ?? 0) - (documentBookmarkCounts[left.id] ?? 0)
  )[0];
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id));
  const bulkPreviewItems = selectedDocuments.slice(0, 3).map((document) => {
    const nextModuleId = bulkEditModuleId || document.module_id;
    const nextType = bulkEditType === 'keep' ? document.type : bulkEditType;
    const nextSummary = bulkSummaryText.trim()
      ? [bulkSummaryText.trim(), document.content?.trim()].filter(Boolean).join('\n\n')
      : (document.content ?? '');

    return {
      id: document.id,
      title: document.title,
      currentModuleTitle: getModuleTitle(document.module_id),
      nextModuleTitle: getModuleTitle(nextModuleId),
      currentType: document.type,
      nextType,
      currentSummary: document.content?.trim() ?? '',
      nextSummary,
    };
  });
  const hasBulkPreviewChanges = Boolean(
    bulkEditModuleId || bulkEditType !== 'keep' || bulkSummaryText.trim()
  );
  const bulkPreviewStats = selectedDocuments.reduce(
    (stats, document) => {
      if (bulkEditModuleId && bulkEditModuleId !== document.module_id) {
        stats.moduleChanges += 1;
      }

      if (bulkEditType !== 'keep' && bulkEditType !== document.type) {
        stats.typeChanges += 1;
      }

      if (bulkSummaryText.trim()) {
        stats.summaryChanges += 1;
      }

      return stats;
    },
    {
      moduleChanges: 0,
      typeChanges: 0,
      summaryChanges: 0,
    }
  );

  const suggestedBulkTemplateId: (typeof BULK_SUMMARY_TEMPLATES)[number]['id'] | '' =
    documentInsightFilter === 'file_only'
      ? 'file-only'
      : documentInsightFilter === 'short_summary'
        ? 'short-summary'
        : documentTypeFilter !== 'all' && isSummaryTemplateDocumentType(documentTypeFilter)
          ? documentTypeFilter
          : '';
  const canGenerateBulkSuggestion = selectedDocuments.length > 0;

  const handleGenerateBulkSummary = () => {
    if (selectedDocuments.length === 0) {
      return;
    }

    const dominantType = selectedDocuments.reduce<Record<string, number>>((counts, document) => {
      counts[document.type] = (counts[document.type] ?? 0) + 1;
      return counts;
    }, {});

    const sortedTypes = Object.entries(dominantType).sort((left, right) => right[1] - left[1]);
    const mainType = (sortedTypes[0]?.[0] as SubjectDocumentType | undefined) ?? 'notes';
    const uniqueModuleTitles = [...new Set(selectedDocuments.map((document) => getModuleTitle(document.module_id)))];
    const modulePhrase =
      uniqueModuleTitles.length === 1
        ? `for ${uniqueModuleTitles[0]}`
        : `across ${uniqueModuleTitles.length} modules`;
    const hasAttachedFiles = selectedDocuments.some((document) => Boolean(document.file_url));
    const hasMissingSummaries = selectedDocuments.some((document) => !document.content?.trim());

    const generatedSummary = [
      `Use these resources ${modulePhrase} to revise ${getDocumentTypeLead(mainType)} in a more exam-focused way.`,
      hasAttachedFiles
        ? 'The attached files collect the most useful material in one place for quicker review before class tests and VTU exams.'
        : 'These notes collect the most useful material in one place for quicker review before class tests and VTU exams.',
      hasMissingSummaries
        ? 'Start here if you want a faster overview of what each resource covers before opening every file individually.'
        : 'Start here if you want a faster overview of the key ideas, recurring questions, and answer patterns covered by this set.',
    ].join(' ');

    setBulkSummaryTemplate('');
    setBulkSummaryText(generatedSummary);
  };

  if (isCheckingAccess) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">Checking access...</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Resources</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Manage modules and content</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Select a subject to manage its modules and add notes, PYQs, and solved answers.
          </p>
        </div>

        {successMessage ? (
          <div className="rounded-3xl border border-green-800 bg-green-950/40 p-6 text-green-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{successMessage}</span>
              {lastBulkUndo ? (
                <button
                  type="button"
                  onClick={handleUndoLastBulkEdit}
                  disabled={isUndoingBulkEdit}
                  className="rounded-full border border-green-700 bg-green-950/40 px-4 py-2 text-sm font-medium text-green-100 transition hover:bg-green-900/50 disabled:opacity-60"
                >
                  {isUndoingBulkEdit ? 'Undoing...' : 'Undo last bulk edit'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {bookmarkNotice ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            {bookmarkNotice}
          </div>
        ) : null}

        {activityNotice ? (
          <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-6 text-amber-200">
            {activityNotice}
          </div>
        ) : null}

        {recentChanges.length > 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Recent changes</p>
                <p className="mt-2 text-sm text-slate-400">
                  A quick session log of the latest module and document actions.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={recentChangeActionFilter}
                  onChange={(event) => setRecentChangeActionFilter(event.target.value)}
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">All actions</option>
                  {recentChangeActionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={recentChangeSearchQuery}
                  onChange={(event) => setRecentChangeSearchQuery(event.target.value)}
                  placeholder="Search history"
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={recentChangeAdminQuery}
                  onChange={(event) => setRecentChangeAdminQuery(event.target.value)}
                  placeholder="Filter by admin"
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRecentChanges([]);
                    clearLocalAdminActivityLog(selectedSubjectId);
                  }}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
                >
                  Clear log
                </button>
              </div>
            </div>
            {filteredRecentChanges.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-6 text-sm text-slate-400">
                No recent changes match the current filters.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {groupedRecentChanges.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{group.actorLabel}</p>
                        <p className="text-xs text-slate-500">
                          {group.items.length} change{group.items.length === 1 ? '' : 's'} in this session
                        </p>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>{group.dateLabel}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDocumentDate(group.startedAt)}</span>
                        {group.startedAt !== group.endedAt ? (
                          <>
                            <span className="mx-2">to</span>
                            <span>{formatDocumentDate(group.endedAt)}</span>
                          </>
                        ) : null}
                      </div>
                      {group.items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => toggleRecentChangeGroup(group.id)}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                        >
                          {isRecentChangeGroupExpanded(group)
                            ? 'Collapse session'
                            : `Show ${group.items.length - 1} more`}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-3">
                      {(isRecentChangeGroupExpanded(group) ? group.items : group.items.slice(0, 1)).map((change) => {
                        const changeInsights = getRecentChangeInsights(change);
                        return (
                    <div
                      key={change.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{change.label}</p>
                          <p className="mt-1 text-sm text-slate-400">{change.details}</p>
                          {change.actorName || change.actorEmail ? (
                            <p className="mt-1 text-xs text-slate-500">
                              by {change.actorName ?? change.actorEmail}
                            </p>
                          ) : null}
                          {changeInsights.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {changeInsights.map((insight) => (
                                <span
                                  key={insight}
                                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                                >
                                  {insight}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedRecentChange(change)}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                          >
                            Details
                          </button>
                          {change.documentId || change.moduleId ? (
                            <button
                              type="button"
                              onClick={() => focusRecentChangeTarget(change)}
                              disabled={!hasRecentChangeTarget(change)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              View
                            </button>
                          ) : null}
                          <span className="text-xs text-slate-500">
                            {formatDocumentDate(change.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Subject selector */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <label className="block">
            <span className="text-sm text-slate-400">Select Subject</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setShowModuleForm(false);
                setShowDocForm(false);
              }}
              disabled={isLoadingSubjects}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-500 md:max-w-sm"
            >
              <option value="">
                {isLoadingSubjects ? 'Loading subjects...' : '— Choose a subject —'}
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </label>

          {subjectLoadNotice ? (
            <div className="mt-4 rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">
              {subjectLoadNotice}
            </div>
          ) : null}
        </div>

        {selectedSubjectId && (
          <>
            {isLoadingResources ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-slate-400">
                Loading resources...
              </div>
            ) : (
              <>
                {/* Modules section */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-brand-400" />
                      <h2 className="text-xl font-semibold text-white">Modules</h2>
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                        {modules.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModuleForm((v) => !v)}
                      className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                    >
                      <Plus className="h-4 w-4" />
                      Add Module
                    </button>
                  </div>

                  {showModuleForm && (
                    <form onSubmit={handleCreateModule} className="mb-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-5">
                      <h3 className="text-sm font-semibold text-white">New Module</h3>
                      {moduleFormError && (
                        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                          {moduleFormError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <label className="block">
                            <span className="text-xs text-slate-400">Title *</span>
                            <input
                              type="text"
                              value={moduleForm.title}
                              onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))}
                              required
                              placeholder="Module 1: Fundamentals"
                              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            />
                          </label>
                        </div>
                        <div>
                          <label className="block">
                            <span className="text-xs text-slate-400">Order</span>
                            <input
                              type="number"
                              value={moduleForm.order}
                              onChange={(e) => setModuleForm((p) => ({ ...p, order: parseInt(e.target.value) || 1 }))}
                              min={1}
                              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            />
                          </label>
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs text-slate-400">Description</span>
                        <input
                          type="text"
                          value={moduleForm.description ?? ''}
                          onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Brief module description..."
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={isSubmittingModule}
                          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                        >
                          {isSubmittingModule ? 'Saving...' : 'Save Module'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowModuleForm(false); setModuleFormError(null); }}
                          className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {modules.length === 0 ? (
                    <p className="text-slate-400">No modules yet. Add one above.</p>
                  ) : (
                    <div className="space-y-2">
                      {modules.map((mod) => (
                        editingModuleId === mod.id ? (
                          <div
                            key={mod.id}
                            className="rounded-xl border border-brand-700 bg-slate-950/70 p-4"
                          >
                            {moduleEditError && (
                              <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                                {moduleEditError}
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              <label className="block md:col-span-2">
                                <span className="text-xs text-slate-400">Title *</span>
                                <input
                                  type="text"
                                  value={moduleEditForm.title}
                                  onChange={(e) => setModuleEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs text-slate-400">Order</span>
                                <input
                                  type="number"
                                  value={moduleEditForm.order}
                                  onChange={(e) => setModuleEditForm((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 1 }))}
                                  min={1}
                                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                                />
                              </label>
                            </div>
                            <label className="mt-4 block">
                              <span className="text-xs text-slate-400">Description</span>
                              <input
                                type="text"
                                value={moduleEditForm.description ?? ''}
                                onChange={(e) => setModuleEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                              />
                            </label>
                            <div className="mt-4 flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleSaveModuleEdit(mod.id)}
                                disabled={isSavingModuleEdit}
                                className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                              >
                                {isSavingModuleEdit ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditingModule}
                                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={mod.id}
                            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3"
                          >
                            <div>
                              <span className="text-xs text-slate-500">#{mod.order} </span>
                              <span className="font-medium text-slate-100">{mod.title}</span>
                              {mod.description && (
                                <p className="mt-0.5 text-sm text-slate-500">{mod.description}</p>
                              )}
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingModule(mod)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                title="Edit module"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteModule(mod.id)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950/50 hover:text-red-400"
                                title="Delete module"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents section */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-brand-400" />
                      <h2 className="text-xl font-semibold text-white">Documents</h2>
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                        {documents.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDocForm((v) => !v)}
                      disabled={modules.length === 0}
                      className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                      title={modules.length === 0 ? 'Add a module first' : undefined}
                    >
                      <Plus className="h-4 w-4" />
                      Add Document
                    </button>
                  </div>

                  {documents.length > 0 ? (
                    <div className="mb-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total saves</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{totalDocumentSaves}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Total student bookmarks across this subject&apos;s documents.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Zero-save docs</p>
                        <p className="mt-3 text-3xl font-semibold text-white">{zeroSaveDocuments.length}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Published resources that students have not saved yet.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Top saved doc</p>
                        <p className="mt-3 text-lg font-semibold text-white">
                          {topSavedDocument?.title ?? 'No document data yet'}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {topSavedDocument
                            ? `${documentBookmarkCounts[topSavedDocument.id] ?? 0} saves`
                            : 'Add documents to start tracking usage'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {documents.length > 0 && zeroSaveDocuments.length > 0 ? (
                    <div className="mb-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
                      <p className="text-sm font-semibold text-amber-200">
                        Attention: {zeroSaveDocuments.length} resource{zeroSaveDocuments.length === 1 ? '' : 's'} have zero saves
                      </p>
                      <p className="mt-2 text-sm text-amber-100/80">
                        Consider improving titles, module placement, or adding clearer summary text to make these resources easier to discover and save.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {zeroSaveDocuments.slice(0, 5).map((document) => (
                          <button
                            type="button"
                            key={document.id}
                            onClick={() => {
                              setDocumentInsightFilter('zero_saves');
                              setDocumentSearchQuery(document.title);
                            }}
                            className="rounded-full border border-amber-700 bg-amber-950/60 px-3 py-1 text-xs text-amber-100"
                          >
                            {document.title}
                          </button>
                        ))}
                        {zeroSaveDocuments.length > 5 ? (
                          <span className="rounded-full border border-amber-700 bg-amber-950/60 px-3 py-1 text-xs text-amber-100">
                            +{zeroSaveDocuments.length - 5} more
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-amber-800/70 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Add context</p>
                          <p className="mt-2 text-sm text-slate-200">
                            {fileOnlyZeroSaveDocuments.length} file-only resource
                            {fileOnlyZeroSaveDocuments.length === 1 ? '' : 's'} have no inline summary.
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Add 2-3 lines explaining what the upload contains so students know why it is worth saving.
                          </p>
                          {fileOnlyZeroSaveDocuments.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentInsightFilter('file_only');
                                setDocumentSearchQuery('');
                                setDocumentTypeFilter('all');
                              }}
                              className="mt-3 rounded-full border border-amber-700 bg-amber-950/50 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-900/60"
                            >
                              Filter these resources
                            </button>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-amber-800/70 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Check placement</p>
                          <p className="mt-2 text-sm text-slate-200">
                            {uncategorizedZeroSaveDocuments.length} zero-save resource
                            {uncategorizedZeroSaveDocuments.length === 1 ? '' : 's'} are not clearly tied to a module.
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Move them into the right module so they appear where students expect them.
                          </p>
                          {uncategorizedZeroSaveDocuments.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentInsightFilter('zero_saves');
                                setDocumentSearchQuery('');
                              }}
                              className="mt-3 rounded-full border border-amber-700 bg-amber-950/50 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-900/60"
                            >
                              Review zero-save docs
                            </button>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-amber-800/70 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Improve summaries</p>
                          <p className="mt-2 text-sm text-slate-200">
                            {thinSummaryDocuments.length} zero-save resource
                            {thinSummaryDocuments.length === 1 ? '' : 's'} have very short descriptions.
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Make the title and summary more specific about marks, topic coverage, or exam value.
                          </p>
                          {thinSummaryDocuments.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentInsightFilter('short_summary');
                                setDocumentSearchQuery('');
                                setDocumentTypeFilter('all');
                              }}
                              className="mt-3 rounded-full border border-amber-700 bg-amber-950/50 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-900/60"
                            >
                              Filter short summaries
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showDocForm && (
                    <form onSubmit={handleCreateDocument} className="mb-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-5">
                      <h3 className="text-sm font-semibold text-white">New Document</h3>
                      {docFormError && (
                        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                          {docFormError}
                        </div>
                      )}
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                        {storageUploadsEnabled
                          ? `Upload a file directly to the "${getStorageBucketName()}" bucket or paste an external file URL.`
                          : 'Direct uploads are unavailable until Supabase storage is configured. You can still paste a file URL below.'}
                      </div>
                      {isUploadingDocFile ? (
                        <div className="rounded-lg border border-brand-800 bg-brand-950/30 p-3 text-sm text-brand-200">
                          Uploading file to Supabase Storage. Keep this tab open until the save finishes.
                        </div>
                      ) : null}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs text-slate-400">Module *</span>
                          <select
                            value={docForm.module_id}
                            onChange={(e) => setDocForm((p) => ({ ...p, module_id: e.target.value }))}
                            required
                            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                          >
                            <option value="">Select module</option>
                            {modules.map((m) => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-400">Type *</span>
                          <select
                            value={docForm.type}
                            onChange={(e) => setDocForm((p) => ({ ...p, type: e.target.value as SubjectDocumentType }))}
                            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                          >
                            {DOCUMENT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs text-slate-400">Title *</span>
                        <input
                          type="text"
                          value={docForm.title}
                          onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                          required
                          placeholder="Module 1 Quick Notes"
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Content</span>
                        <textarea
                          value={docForm.content ?? ''}
                          onChange={(e) => setDocForm((p) => ({ ...p, content: e.target.value }))}
                          rows={4}
                          placeholder="Write notes, questions, or answers here..."
                          className="mt-1.5 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Upload File</span>
                        <input
                          type="file"
                          onChange={(e) => setDocUploadFile(e.target.files?.[0] ?? null)}
                          disabled={!storageUploadsEnabled || isSubmittingDoc}
                          className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {docUploadFile
                            ? `Selected: ${docUploadFile.name}`
                            : 'Optional. If uploaded, its public URL will be saved automatically.'}
                        </p>
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">File URL</span>
                        <input
                          type="url"
                          value={docForm.file_url ?? ''}
                          onChange={(e) => setDocForm((p) => ({ ...p, file_url: e.target.value }))}
                          placeholder="https://example.com/module-1-notes.pdf"
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={isSubmittingDoc}
                          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                        >
                          {isUploadingDocFile
                            ? 'Uploading file...'
                            : isSubmittingDoc
                              ? 'Saving...'
                              : 'Save Document'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDocForm(false);
                            setDocFormError(null);
                            setDocUploadFile(null);
                          }}
                          className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {documents.length > 0 ? (
                    <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 md:grid-cols-4">
                      <label className="block">
                        <span className="text-xs text-slate-400">Search Documents</span>
                        <input
                          type="text"
                          value={documentSearchQuery}
                          onChange={(e) => setDocumentSearchQuery(e.target.value)}
                          placeholder="Search by title, content, module, or filename"
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Filter by Type</span>
                        <select
                          value={documentTypeFilter}
                          onChange={(e) => setDocumentTypeFilter(e.target.value as 'all' | SubjectDocumentType)}
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        >
                          <option value="all">All document types</option>
                          {DOCUMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Insight Filter</span>
                        <select
                          value={documentInsightFilter}
                          onChange={(e) =>
                            setDocumentInsightFilter(
                              e.target.value as 'all' | 'zero_saves' | 'file_only' | 'short_summary'
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        >
                          <option value="all">All documents</option>
                          <option value="zero_saves">Zero saves only</option>
                          <option value="file_only">File-only with no summary</option>
                          <option value="short_summary">Short summaries</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Sort Documents</span>
                        <select
                          value={documentSortOrder}
                          onChange={(e) =>
                            setDocumentSortOrder(
                              e.target.value as 'updated_desc' | 'updated_asc' | 'title_asc' | 'bookmarks_desc'
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                        >
                          <option value="bookmarks_desc">Most saved first</option>
                          <option value="updated_desc">Newest updated first</option>
                          <option value="updated_asc">Oldest updated first</option>
                          <option value="title_asc">Title A-Z</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {selectedDocumentIds.length > 0 ? (
                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-800 bg-brand-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-brand-100">
                          {selectedDocumentIds.length} document{selectedDocumentIds.length === 1 ? '' : 's'} selected for bulk actions.
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <label className="block md:col-span-2 xl:col-span-2">
                            <span className="text-xs uppercase tracking-[0.2em] text-brand-200/80">
                              Prepend summary note
                            </span>
                            <textarea
                              value={bulkSummaryText}
                              onChange={(event) => setBulkSummaryText(event.target.value)}
                              rows={3}
                              placeholder="Example: Covers repeated 10-mark questions from Modules 2 and 3 with quick revision diagrams."
                              className="mt-2 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            />
                          </label>

                          <div className="md:col-span-2 xl:col-span-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs uppercase tracking-[0.2em] text-brand-200/80">
                                Quick templates
                              </span>
                              {suggestedBulkTemplateId ? (
                                <span className="rounded-full border border-brand-700 bg-brand-950/40 px-2.5 py-0.5 text-[11px] text-brand-100">
                                  Suggested: {BULK_SUMMARY_TEMPLATES.find((template) => template.id === suggestedBulkTemplateId)?.label}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {BULK_SUMMARY_TEMPLATES.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => {
                                    setBulkSummaryTemplate(template.id);
                                    setBulkSummaryText(template.content);
                                  }}
                                  className={
                                    bulkSummaryTemplate === template.id
                                      ? 'rounded-full border border-brand-500 bg-brand-500/15 px-3 py-1.5 text-xs font-medium text-white'
                                      : 'rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand-500 hover:text-white'
                                  }
                                >
                                  {template.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkSummaryTemplate('');
                                  setBulkSummaryText('');
                                }}
                                className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
                              >
                                Clear summary
                              </button>
                              <button
                                type="button"
                                onClick={handleGenerateBulkSummary}
                                disabled={!canGenerateBulkSuggestion}
                                className="rounded-full border border-brand-700 bg-brand-950/40 px-3 py-1.5 text-xs font-medium text-brand-100 transition hover:bg-brand-900/60 disabled:opacity-60"
                              >
                                Generate suggestion
                              </button>
                              {suggestedBulkTemplateId && bulkSummaryTemplate !== suggestedBulkTemplateId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const template = BULK_SUMMARY_TEMPLATES.find(
                                      (item) => item.id === suggestedBulkTemplateId
                                    );
                                    if (!template) {
                                      return;
                                    }
                                    setBulkSummaryTemplate(template.id);
                                    setBulkSummaryText(template.content);
                                  }}
                                  className="rounded-full border border-amber-700 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-900/60"
                                >
                                  Use suggested template
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.2em] text-brand-200/80">
                              Move to module
                            </span>
                            <select
                              value={bulkEditModuleId}
                              onChange={(event) => setBulkEditModuleId(event.target.value)}
                              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            >
                              <option value="">Keep current modules</option>
                              {modules.map((module) => (
                                <option key={module.id} value={module.id}>
                                  {module.title}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs uppercase tracking-[0.2em] text-brand-200/80">
                              Change type
                            </span>
                            <select
                              value={bulkEditType}
                              onChange={(event) =>
                                setBulkEditType(event.target.value as 'keep' | SubjectDocumentType)
                              }
                              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                            >
                              <option value="keep">Keep current types</option>
                              {DOCUMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleBulkUpdateDocuments}
                              disabled={isBulkSavingDocuments}
                              className="w-full rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
                            >
                              {isBulkSavingDocuments ? 'Applying...' : 'Apply bulk edit'}
                            </button>
                          </div>
                        </div>

                        {hasBulkPreviewChanges ? (
                          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">Bulk edit preview</p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Showing {Math.min(bulkPreviewItems.length, 3)} of {selectedDocuments.length} selected
                                </p>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Module</p>
                                  <p className="mt-1 text-sm font-semibold text-white">
                                    {bulkPreviewStats.moduleChanges} change{bulkPreviewStats.moduleChanges === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Type</p>
                                  <p className="mt-1 text-sm font-semibold text-white">
                                    {bulkPreviewStats.typeChanges} change{bulkPreviewStats.typeChanges === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Summary</p>
                                  <p className="mt-1 text-sm font-semibold text-white">
                                    {bulkPreviewStats.summaryChanges} change{bulkPreviewStats.summaryChanges === 1 ? '' : 's'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 space-y-3">
                              {bulkPreviewItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                                >
                                  <p className="text-sm font-semibold text-white">{item.title}</p>
                                  <div className="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                                    <p>
                                      Module: <span className="text-slate-300">{item.currentModuleTitle}</span> {'->'}{' '}
                                      <span className="text-brand-200">{item.nextModuleTitle}</span>
                                    </p>
                                    <p>
                                      Type: <span className="text-slate-300">{TYPE_LABEL[item.currentType] ?? item.currentType}</span> {'->'}{' '}
                                      <span className="text-brand-200">{TYPE_LABEL[item.nextType] ?? item.nextType}</span>
                                    </p>
                                  </div>
                                  {bulkSummaryText.trim() ? (
                                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                        Summary preview
                                      </p>
                                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs text-slate-300">
                                        {item.nextSummary}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocumentIds([]);
                            setBulkEditModuleId('');
                            setBulkEditType('keep');
                            setBulkSummaryText('');
                            setBulkSummaryTemplate('');
                          }}
                          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
                        >
                          Clear selection
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteDocuments}
                          disabled={isBulkDeletingDocuments}
                          className="rounded-full border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/50 disabled:opacity-60"
                        >
                          {isBulkDeletingDocuments ? 'Deleting...' : 'Delete selected'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {documents.length === 0 ? (
                    <p className="text-slate-400">No documents yet. Add one above.</p>
                  ) : sortedDocuments.length === 0 ? (
                    <p className="text-slate-400">No documents match your current filters.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedDocuments.map((doc) => (
                        editingDocId === doc.id ? (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-brand-700 bg-slate-950/70 p-4"
                          >
                            {docEditError && (
                              <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                                {docEditError}
                              </div>
                            )}
                            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                              {storageUploadsEnabled
                                ? `Upload a replacement file to the "${getStorageBucketName()}" bucket or keep using the existing URL.`
                                : 'Direct uploads are unavailable until Supabase storage is configured. You can still update the file URL manually.'}
                            </div>
                            {isUploadingReplacementFile ? (
                              <div className="mb-4 rounded-lg border border-brand-800 bg-brand-950/30 p-3 text-sm text-brand-200">
                                Uploading replacement file to Supabase Storage. Keep this tab open until the save finishes.
                              </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <label className="block">
                                <span className="text-xs text-slate-400">Module *</span>
                                <select
                                  value={docEditForm.module_id}
                                  onChange={(e) => setDocEditForm((prev) => ({ ...prev, module_id: e.target.value }))}
                                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                                >
                                  <option value="">Select module</option>
                                  {modules.map((module) => (
                                    <option key={module.id} value={module.id}>
                                      {module.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-slate-400">Type *</span>
                                <select
                                  value={docEditForm.type}
                                  onChange={(e) => setDocEditForm((prev) => ({ ...prev, type: e.target.value as SubjectDocumentType }))}
                                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                                >
                                  {DOCUMENT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <label className="mt-4 block">
                              <span className="text-xs text-slate-400">Title *</span>
                              <input
                                type="text"
                                value={docEditForm.title}
                                onChange={(e) => setDocEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                              />
                            </label>
                            <label className="mt-4 block">
                              <span className="text-xs text-slate-400">Content</span>
                              <textarea
                                value={docEditForm.content ?? ''}
                                onChange={(e) => setDocEditForm((prev) => ({ ...prev, content: e.target.value }))}
                                rows={4}
                                className="mt-1.5 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                              />
                            </label>
                            <label className="mt-4 block">
                              <span className="text-xs text-slate-400">Replace File</span>
                              <input
                                type="file"
                                onChange={(e) => setDocEditUploadFile(e.target.files?.[0] ?? null)}
                                disabled={!storageUploadsEnabled || isSavingDocEdit}
                                className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              />
                              <p className="mt-1 text-xs text-slate-500">
                                {docEditUploadFile
                                  ? `Selected: ${docEditUploadFile.name}`
                                  : 'Optional. Uploading a new file replaces the saved file URL.'}
                              </p>
                            </label>
                            <label className="mt-4 block">
                              <span className="text-xs text-slate-400">File URL</span>
                              <input
                                type="url"
                                value={docEditForm.file_url ?? ''}
                                onChange={(e) => setDocEditForm((prev) => ({ ...prev, file_url: e.target.value }))}
                                placeholder="https://example.com/module-1-notes.pdf"
                                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
                              />
                            </label>
                            <div className="mt-4 flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleSaveDocumentEdit(doc.id)}
                                disabled={isSavingDocEdit}
                                className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                              >
                                {isUploadingReplacementFile
                                  ? 'Uploading file...'
                                  : isSavingDocEdit
                                    ? 'Saving...'
                                    : 'Save Changes'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditingDocument}
                                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={doc.id}
                            className="flex items-start justify-between rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3"
                          >
                            <div className="flex min-w-0 flex-1 gap-3">
                              <label className="mt-1">
                                <input
                                  type="checkbox"
                                  checked={selectedDocumentIds.includes(doc.id)}
                                  onChange={() => handleToggleDocumentSelection(doc.id)}
                                  className="rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
                                />
                              </label>
                              <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_BADGE[doc.type] ?? 'bg-slate-800 border-slate-700 text-slate-300'}`}
                                >
                                  {TYPE_LABEL[doc.type] ?? doc.type}
                                </span>
                                <span className="font-medium text-slate-100">{doc.title}</span>
                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-300">
                                  {documentBookmarkCounts[doc.id] ?? 0} saves
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {getModuleTitle(doc.module_id)}
                              </p>
                              {doc.content && (
                                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{doc.content}</p>
                              )}
                              {doc.file_url && (
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                                    {getFileLabel(doc.file_url)}
                                  </span>
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex text-sm font-medium text-brand-300 transition hover:text-brand-200"
                                  >
                                    Open attached file
                                  </a>
                                </div>
                              )}
                              </div>
                            </div>
                            <div className="ml-4 flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewDocument(doc)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                title="Preview document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditingDocument(doc)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                                title="Edit document"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950/50 hover:text-red-400"
                                title="Delete document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {previewDocument ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_BADGE[previewDocument.type] ?? 'bg-slate-800 border-slate-700 text-slate-300'}`}
                    >
                      {TYPE_LABEL[previewDocument.type] ?? previewDocument.type}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                      {getModuleTitle(previewDocument.module_id)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white">{previewDocument.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Created {formatDocumentDate(previewDocument.created_at)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Last updated {formatDocumentDate(previewDocument.updated_at ?? previewDocument.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {previewDocument.file_url ? (
                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attached file</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                      {getFileLabel(previewDocument.file_url)}
                    </span>
                    <a
                      href={previewDocument.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-brand-300 transition hover:text-brand-200"
                    >
                      Open attached file
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Content preview</p>
                {previewDocument.content ? (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {previewDocument.content}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    No inline content was added for this document. Use the attached file link if this resource lives in a PDF or external file.
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDocument(null);
                    startEditingDocument(previewDocument);
                  }}
                  className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  Edit Document
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedRecentChange ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-300">
                    Change details
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold text-white">
                    {selectedRecentChange.label}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedRecentChange.details}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecentChange(null)}
                  className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
                  title="Close change details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">When</p>
                  <p className="mt-3 text-sm text-slate-200">
                    {formatDocumentDate(selectedRecentChange.createdAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Who</p>
                  <p className="mt-3 text-sm text-slate-200">
                    {selectedRecentChange.actorName ??
                      selectedRecentChange.actorEmail ??
                      'Unknown admin'}
                  </p>
                  {selectedRecentChange.actorName && selectedRecentChange.actorEmail ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedRecentChange.actorEmail}
                    </p>
                  ) : null}
                </div>
              </div>

              {getRecentChangeTargetLabel(selectedRecentChange) ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Related item
                  </p>
                  <p className="mt-3 text-sm text-slate-200">
                    {getRecentChangeTargetLabel(selectedRecentChange)}
                  </p>
                </div>
              ) : null}

              {getRecentChangeInsights(selectedRecentChange).length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Summary
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getRecentChangeInsights(selectedRecentChange).map((insight) => (
                      <span
                        key={insight}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                      >
                        {insight}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {getRecentChangeMetadataRows(selectedRecentChange).length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Metadata
                  </p>
                  <div className="mt-3 grid gap-3">
                    {getRecentChangeMetadataRows(selectedRecentChange).map((row) => (
                      <div
                        key={`${row.label}-${row.value}`}
                        className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {row.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-200">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {hasRecentChangeTarget(selectedRecentChange) ? (
                  <button
                    type="button"
                    onClick={() => {
                      focusRecentChangeTarget(selectedRecentChange);
                      setSelectedRecentChange(null);
                    }}
                    className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                  >
                    Open related item
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedRecentChange(null)}
                  className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
