import Link from 'next/link';
import AppShell from './AppShell';

const adminLinks = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/departments', label: 'Departments' },
  { href: '/admin/resources', label: 'Resources' },
];

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-md border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Admin
          </h2>

          <nav className="space-y-2">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </AppShell>
  );
}
