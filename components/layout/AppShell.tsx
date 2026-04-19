import Navbar from './Navbar';

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen text-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
