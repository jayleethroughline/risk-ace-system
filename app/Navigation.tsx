'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getLinkClass = (path: string) => {
    const baseClass = "inline-flex items-center px-1 pt-1 text-sm font-medium";
    if (isActive(path)) {
      return `${baseClass} text-gray-900 border-b-2 border-blue-600`;
    }
    return `${baseClass} text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300`;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            <Link
              href="/"
              className={getLinkClass('/')}
            >
              Dashboard
            </Link>
            <Link
              href="/train"
              className={getLinkClass('/train')}
            >
              Train
            </Link>
            <Link
              href="/playbook"
              className={getLinkClass('/playbook')}
            >
              Playbook
            </Link>
            <Link
              href="/database"
              className={getLinkClass('/database')}
            >
              Database
            </Link>
          </div>
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">
              Risk-ACE
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
