export interface OpenElectiveSubject {
  code: string;
  name: string;
  slug: string;
  offeredBy: string;
  semester: string;
  semesterNumber: 5 | 6 | 7;
  scheme: string;
  category: 'Open Elective';
  /**
   * Supabase subject UUID. Set this after creating the subject in the admin panel.
   * Once set, the detail page will fetch modules, notes, PYQs, etc. from Supabase.
   */
  supabaseSubjectId?: string;
}

export const openElectives5thSem: OpenElectiveSubject[] = [];

export const openElectives6thSem: OpenElectiveSubject[] = [
  {
    code: 'BRA654C',
    name: 'Fundamentals of Robotics & Applications',
    slug: 'bra654c-fundamentals-of-robotics',
    offeredBy: 'Robotics and Automation',
    semester: '6th Sem',
    semesterNumber: 6,
    scheme: '2022 Scheme',
    category: 'Open Elective',
  },
];

export const openElectives7thSem: OpenElectiveSubject[] = [];

export const allOpenElectives = [
  ...openElectives5thSem,
  ...openElectives6thSem,
  ...openElectives7thSem,
];
