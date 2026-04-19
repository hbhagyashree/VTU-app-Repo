import type { Department, Semester, Subject } from '@/types';

export interface SubjectOrderingContext {
  departments: Department[];
  semesters: Semester[];
}

export interface SubjectGroup {
  id: string;
  title: string;
  subjects: Subject[];
}

export interface SubjectFilterOptions {
  departmentId: string;
  semesterNumber: string;
}

function compareOptionalText(left?: string, right?: string): number {
  return (left ?? '').localeCompare(right ?? '');
}

function getSemesterNumber(subject: Subject, semesterById: Map<string, Semester>): number {
  return semesterById.get(subject.semester_id)?.number ?? Number.MAX_SAFE_INTEGER;
}

function getDepartmentName(
  subject: Subject,
  semesterById: Map<string, Semester>,
  departmentById: Map<string, Department>
): string {
  const semester = semesterById.get(subject.semester_id);
  return departmentById.get(semester?.department_id ?? subject.department_id)?.name ?? '';
}

export function sortSubjectsByAcademicOrder(
  subjects: Subject[],
  { departments, semesters }: SubjectOrderingContext
): Subject[] {
  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  return [...subjects].sort((left, right) =>
    compareSubjectsByAcademicOrder(left, right, semesterById, departmentById)
  );
}

export function compareSubjectsByAcademicOrder(
  left: Subject,
  right: Subject,
  semesterById: Map<string, Semester>,
  departmentById: Map<string, Department>
): number {
  const departmentCompare = getDepartmentName(left, semesterById, departmentById).localeCompare(
    getDepartmentName(right, semesterById, departmentById)
  );

  if (departmentCompare !== 0) {
    return departmentCompare;
  }

  const semesterCompare =
    getSemesterNumber(left, semesterById) - getSemesterNumber(right, semesterById);

  if (semesterCompare !== 0) {
    return semesterCompare;
  }

  return (
    compareOptionalText(left.code, right.code) ||
    left.name.localeCompare(right.name)
  );
}

export function groupSubjectsByAcademicOrder(
  subjects: Subject[],
  context: SubjectOrderingContext
): SubjectGroup[] {
  const sortedSubjects = sortSubjectsByAcademicOrder(subjects, context);
  const semesterById = new Map(context.semesters.map((semester) => [semester.id, semester]));
  const departmentById = new Map(context.departments.map((department) => [department.id, department]));
  const groups = new Map<string, SubjectGroup>();

  for (const subject of sortedSubjects) {
    const semester = semesterById.get(subject.semester_id);
    const department = departmentById.get(semester?.department_id ?? subject.department_id);
    const semesterNumber = semester?.number ?? 0;
    const groupId = `${department?.id ?? subject.department_id}-${semester?.id ?? subject.semester_id}`;
    const title = [
      department?.name ?? 'Department',
      semesterNumber ? `Semester ${semesterNumber}` : semester?.title,
    ]
      .filter(Boolean)
      .join(' - ');

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        title,
        subjects: [],
      });
    }

    groups.get(groupId)?.subjects.push(subject);
  }

  return [...groups.values()];
}

export function filterSubjectsByDepartmentAndSemester(
  subjects: Subject[],
  semesters: Semester[],
  { departmentId, semesterNumber }: SubjectFilterOptions
): Subject[] {
  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));

  return subjects.filter((subject) => {
    const semester = semesterById.get(subject.semester_id);

    if (departmentId && (semester?.department_id ?? subject.department_id) !== departmentId) {
      return false;
    }

    if (semesterNumber && String(semester?.number ?? '') !== semesterNumber) {
      return false;
    }

    return true;
  });
}

export function getAvailableSemesterNumbers(subjects: Subject[], semesters: Semester[]): number[] {
  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));
  const numbers = new Set<number>();

  for (const subject of subjects) {
    const semesterNumber = semesterById.get(subject.semester_id)?.number;

    if (semesterNumber) {
      numbers.add(semesterNumber);
    }
  }

  return [...numbers].sort((left, right) => left - right);
}
