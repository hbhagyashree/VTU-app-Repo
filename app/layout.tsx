import '../styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VTU SmartPrep',
  description: 'VTU SmartPrep study platform created by Bhagyashree Hosmani.',
  authors: [{ name: 'Bhagyashree Hosmani', url: 'https://www.linkedin.com/in/bhagyashree-hosmani-95644117b/' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen bg-slate-950">
          {children}
        </div>
      </body>
    </html>
  );
}
