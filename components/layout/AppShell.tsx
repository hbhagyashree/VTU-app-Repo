import Navbar from './Navbar';

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-white/10 bg-slate-950/55 px-4 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>VTU SmartPrep</p>
          <a
            href="https://www.linkedin.com/in/bhagyashree-hosmani-95644117b/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200 transition hover:border-brand-300/50 hover:text-white"
          >
            Created by Bhagyashree Hosmani
          </a>
        </div>
      </footer>
    </div>
  );
}
