'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/crm', label: 'Contacts', exact: true },
  { href: '/admin/crm/pipeline', label: 'Pipeline' },
  { href: '/admin/crm/tasks', label: 'Tasks' },
];

/** Sub-navigation shared across the CRM section. */
export default function CrmTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-6 border-b border-gray-200">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              active
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-brand-700'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
