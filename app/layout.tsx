import type { Metadata } from 'next';
import './globals.css';
import Navigation from './Navigation';

export const metadata: Metadata = {
  title: 'Risk-ACE System',
  description: 'Agentic Context Engine for Risk Classification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
