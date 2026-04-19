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
        <aside className="glass-panel rounded-3xl p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-brand-200">
            Admin
          </h2>

          <nav className="space-y-2">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
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
