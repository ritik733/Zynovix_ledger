'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, ArrowLeftRight, Users, Plus } from 'lucide-react';
import { useStore } from '@/lib/store-context';

interface MobileNavProps {
  onOpenAddModal?: () => void;
}

export function MobileNav({ onOpenAddModal }: MobileNavProps = {}) {
  const pathname = usePathname();
  const { openAddModal } = useStore();

  const links = [
    { href: '/', label: 'Balance', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/transactions', label: 'Ledger', icon: ArrowLeftRight },
    { href: '/people', label: 'People', icon: Users },
  ];

  const handleClickAdd = () => {
    if (onOpenAddModal) {
      onOpenAddModal();
    } else {
      openAddModal('expense');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg">
      <div className="flex items-center justify-around relative">
        {/* First two links */}
        {links.slice(0, 2).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Center Floating Add Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={handleClickAdd}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-4 border-white active:scale-95 transition-all"
            aria-label="Add Transaction"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Last two links */}
        {links.slice(2, 4).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
