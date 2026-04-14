import type {
  CreateDepartmentInput,
  CreateDocumentInput,
  CreateModuleInput,
  CreateSemesterInput,
  Department,
  Document,
  Module,
  Semester,
  UpdateDocumentInput,
  UpdateModuleInput,
} from '@/types';

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const mockDepartments: Department[] = [
  {
    id: '1',
    name: 'Computer Science and Engineering',
    slug: 'cse',
    description: 'CSE department for VTU',
    created_at: new Date().toISOString(),
  },
];

const mockSemesters: Semester[] = [
  {
    id: '1',
    department_id: '1',
    number: 4,
    title: 'Semester 4',
    created_at: new Date().toISOString(),
  },
];

const mockModules: Module[] = [
  {
    id: 'm1',
    subject_id: '1',
    title: 'Overview and fundamentals',
    description: 'Core definitions, terminology, and foundational concepts.',
    order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'm2',
    subject_id: '1',
    title: 'Core concepts and diagrams',
    description: 'Key models, flow diagrams, and common exam topics.',
    order: 2,
    created_at: new Date().toISOString(),
  },
];

const mockDocuments: Document[] = [
  {
    id: 'd1',
    subject_id: '1',
    module_id: 'm1',
    type: 'notes',
    title: 'Module 1 quick notes',
    content: 'Important concepts and short revision points for Module 1.',
    file_url: 'https://example.com/resources/ada-module-1-notes.pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd2',
    subject_id: '1',
    module_id: 'm2',
    type: 'pyq',
    title: 'Repeated PYQ set',
    content: 'Frequently repeated questions with year-wise grouping.',
    file_url: 'https://example.com/resources/ada-pyq-set.pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd3',
    subject_id: '1',
    module_id: 'm2',
    type: 'solved-answer',
    title: 'Model solved answers',
    content: 'Answer outlines for common 5-mark and 10-mark questions.',
    file_url: 'https://example.com/resources/ada-solved-answers.pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function cloneDepartments(items: Department[]): Department[] {
  return items.map((item) => ({ ...item }));
}

function cloneSemesters(items: Semester[]): Semester[] {
  return items.map((item) => ({ ...item }));
}

function cloneModules(items: Module[]): Module[] {
  return items.map((item) => ({ ...item }));
}

function cloneDocuments(items: Document[]): Document[] {
  return items.map((item) => ({ ...item }));
}

async function loadDb() {
  const { db, supabase } = await import('@/lib/supabaseClient');

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  return db;
}

function shouldUseMockWrites(): boolean {
  return !hasSupabaseEnv;
}

export async function getDepartments(): Promise<{ data: Department[]; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.departments.getAll();

    if (error) {
      throw new Error(error.message);
    }

    return { data: data ?? [], fallback: false };
  } catch (error) {
    console.error('Failed to load departments:', error);
    return { data: cloneDepartments(mockDepartments), fallback: true };
  }
}

export async function getSemestersByDepartment(
  departmentId: string
): Promise<{ data: Semester[]; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.semesters.getByDepartment(departmentId);

    if (error) {
      throw new Error(error.message);
    }

    return { data: data ?? [], fallback: false };
  } catch (error) {
    console.error('Failed to load semesters:', error);
    return {
      data: cloneSemesters(
        mockSemesters.filter((semester) => semester.department_id === departmentId)
      ),
      fallback: true,
    };
  }
}

function buildMockModules(subjectId: string): Module[] {
  return cloneModules(
    mockModules
      .filter((module) => module.subject_id === subjectId || subjectId !== '1')
      .map((module, index) =>
        subjectId === '1'
          ? module
          : {
              ...module,
              id: `${module.id}-${subjectId}`,
              subject_id: subjectId,
              order: index + 1,
            }
      )
  );
}

function buildMockDocuments(subjectId: string, modules: Module[]): Document[] {
  const [firstModule, secondModule] = modules;

  return cloneDocuments(
    mockDocuments.map((document, index) => ({
      ...document,
      id: `${document.id}-${subjectId}-${index}`,
      subject_id: subjectId,
      module_id:
        document.type === 'notes'
          ? firstModule?.id ?? modules[0]?.id ?? document.module_id
          : secondModule?.id ?? modules[0]?.id ?? document.module_id,
    }))
  );
}

export async function getSubjectResources(
  subjectId: string
): Promise<{ modules: Module[]; documents: Document[]; fallback: boolean }> {
  try {
    const db = await loadDb();
    const [{ data: moduleData, error: moduleError }, { data: documentData, error: documentError }] =
      await Promise.all([db.modules.getBySubject(subjectId), db.documents.getBySubject(subjectId)]);

    if (moduleError) {
      throw new Error(moduleError.message);
    }

    if (documentError) {
      throw new Error(documentError.message);
    }

    return {
      modules: moduleData ?? [],
      documents: documentData ?? [],
      fallback: false,
    };
  } catch (error) {
    console.error('Failed to load subject resources:', error);
    const modules = buildMockModules(subjectId);
    return {
      modules,
      documents: buildMockDocuments(subjectId, modules),
      fallback: true,
    };
  }
}

export async function getAllSemesters(): Promise<{ data: Semester[]; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.semesters.getAll();
    if (error) throw new Error(error.message);
    return { data: data ?? [], fallback: false };
  } catch (error) {
    console.error('Failed to load all semesters:', error);
    return { data: cloneSemesters(mockSemesters), fallback: true };
  }
}

export async function createDepartment(
  input: CreateDepartmentInput
): Promise<{ data: Department; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.departments.create(input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Failed to create department');
    return { data: data as unknown as Department, fallback: false };
  } catch (error) {
    console.error('Failed to create department:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to create department');
    }
    const newDept: Department = {
      id: Date.now().toString(),
      name: input.name,
      slug: input.slug,
      description: input.description,
      created_at: new Date().toISOString(),
    };
    mockDepartments.push(newDept);
    return { data: { ...newDept }, fallback: true };
  }
}

export async function updateDepartment(
  id: string,
  input: Partial<CreateDepartmentInput>
): Promise<{ data: Department; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.departments.update(id, input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Department not found');
    return { data: data as unknown as Department, fallback: false };
  } catch (error) {
    console.error('Failed to update department:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to update department');
    }
    const index = mockDepartments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Department not found');
    mockDepartments[index] = { ...mockDepartments[index], ...input };
    return { data: { ...mockDepartments[index] }, fallback: true };
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  try {
    const db = await loadDb();
    const { error } = await db.departments.delete(id);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('Failed to delete department:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to delete department');
    }
    const index = mockDepartments.findIndex((d) => d.id === id);
    if (index !== -1) mockDepartments.splice(index, 1);
  }
}

export async function createSemester(
  input: CreateSemesterInput
): Promise<{ data: Semester; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.semesters.create(input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Failed to create semester');
    return { data: data as unknown as Semester, fallback: false };
  } catch (error) {
    console.error('Failed to create semester:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to create semester');
    }
    const newSem: Semester = {
      id: Date.now().toString(),
      department_id: input.department_id,
      number: input.number,
      title: input.title,
      created_at: new Date().toISOString(),
    };
    mockSemesters.push(newSem);
    return { data: { ...newSem }, fallback: true };
  }
}

export async function deleteSemester(id: string): Promise<void> {
  try {
    const db = await loadDb();
    const { error } = await db.semesters.delete(id);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('Failed to delete semester:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to delete semester');
    }
    const index = mockSemesters.findIndex((s) => s.id === id);
    if (index !== -1) mockSemesters.splice(index, 1);
  }
}

export async function createModule(
  input: CreateModuleInput
): Promise<{ data: Module; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.modules.create(input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Failed to create module');
    return { data: data as unknown as Module, fallback: false };
  } catch (error) {
    console.error('Failed to create module:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to create module');
    }
    const newModule: Module = {
      id: Date.now().toString(),
      subject_id: input.subject_id,
      title: input.title,
      description: input.description,
      order: input.order,
      created_at: new Date().toISOString(),
    };
    mockModules.push(newModule);
    return { data: { ...newModule }, fallback: true };
  }
}

export async function updateModule(
  id: string,
  input: UpdateModuleInput
): Promise<{ data: Module; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.modules.update(id, input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Module not found');
    return { data: data as unknown as Module, fallback: false };
  } catch (error) {
    console.error('Failed to update module:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to update module');
    }
    const index = mockModules.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Module not found');
    mockModules[index] = { ...mockModules[index], ...input };
    return { data: { ...mockModules[index] }, fallback: true };
  }
}

export async function deleteModule(id: string): Promise<void> {
  try {
    const db = await loadDb();
    const { error } = await db.modules.delete(id);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('Failed to delete module:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to delete module');
    }
    const index = mockModules.findIndex((m) => m.id === id);
    if (index !== -1) mockModules.splice(index, 1);
  }
}

export async function createDocument(
  input: CreateDocumentInput
): Promise<{ data: Document; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.documents.create(input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Failed to create document');
    return { data: data as unknown as Document, fallback: false };
  } catch (error) {
    console.error('Failed to create document:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to create document');
    }
    const newDoc: Document = {
      id: Date.now().toString(),
      subject_id: input.subject_id,
      module_id: input.module_id,
      type: input.type,
      title: input.title,
      content: input.content,
      file_url: input.file_url,
      metadata: input.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDocuments.push(newDoc);
    return { data: { ...newDoc }, fallback: true };
  }
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<{ data: Document; fallback: boolean }> {
  try {
    const db = await loadDb();
    const { data, error } = await db.documents.update(id, input as unknown as Record<string, unknown>);
    if (error || !data) throw new Error(error?.message ?? 'Document not found');
    return { data: data as unknown as Document, fallback: false };
  } catch (error) {
    console.error('Failed to update document:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to update document');
    }
    const index = mockDocuments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Document not found');
    mockDocuments[index] = { ...mockDocuments[index], ...input, updated_at: new Date().toISOString() };
    return { data: { ...mockDocuments[index] }, fallback: true };
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await loadDb();
    const { error } = await db.documents.delete(id);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error('Failed to delete document:', error);
    if (!shouldUseMockWrites()) {
      throw error instanceof Error ? error : new Error('Failed to delete document');
    }
    const index = mockDocuments.findIndex((d) => d.id === id);
    if (index !== -1) mockDocuments.splice(index, 1);
  }
}
