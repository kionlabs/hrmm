import Link from 'next/link';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-300 pb-5 sm:flex-row sm:items-end">
    <div>{eyebrow && <p className="mb-1 text-xs font-bold text-emerald-700">{eyebrow}</p>}<h1 className="text-2xl font-bold text-gray-950">{title}</h1><p className="mt-1 max-w-3xl text-sm text-gray-600">{description}</p></div>{action}
  </div>;
}

export function StatusBadge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' | 'blue' | 'red' }) {
  const tones = { gray: 'bg-gray-100 text-gray-700', green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-700' };
  return <span className={`inline-flex px-2 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center"><p className="font-semibold text-gray-800">{title}</p><p className="mt-1 text-sm text-gray-500">{description}</p>{href && action && <Link href={href} className="mt-4 inline-flex bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">{action}</Link>}</div>;
}

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong className="mr-2 inline-flex bg-amber-200 px-2 py-0.5 text-xs">MVP · 연동 예정</strong>{children}</div>;
}

const workflowItems = [
  { label: '행사', href: '/events' },
  { label: '통합 일정', href: '/schedules' },
  { label: '매출', href: '/revenues' },
  { label: '정산', href: '/settlements' },
];

export function WorkflowNav({ current }: { current: '행사' | '통합 일정' | '매출' | '정산' }) {
  return <nav aria-label="ERP 업무 흐름" className="mb-5 flex flex-wrap items-center border border-gray-200 bg-white px-4 py-3">
    <span className="mr-4 text-xs font-bold text-gray-500">업무 흐름</span>
    {workflowItems.map((item, index) => <span key={item.href} className="flex items-center">
      {index > 0 && <span className="mx-2 text-gray-300">→</span>}
      <Link href={item.href} className={`px-2 py-1 text-sm font-bold ${current === item.label ? 'bg-emerald-800 text-white' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>{item.label}</Link>
    </span>)}
  </nav>;
}
