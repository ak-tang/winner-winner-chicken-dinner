'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        pathname === href
          ? 'bg-green-50 text-green-800'
          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-green-900 text-lg tracking-tight">
          🐔 Winner Winner
        </Link>
        <nav className="flex items-center gap-1">
          {link('/', 'Plan a Menu')}
          {link('/history', 'Menu History')}
        </nav>
      </div>
    </header>
  );
}
