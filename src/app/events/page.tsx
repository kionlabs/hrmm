'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatusBadge } from '@/components/erp-ui';

type EventRow = { id: string; schedule_date?: string; start_date?: string; end_date?: string; business_type: string; status?: string; staffs?: { name?: string } | { name?: string }[]; markets?: { market_name?: string } | { market_name?: string }[] };
const relation = <T,>(value: T | T[] | null | undefined) => Array.isArray(value) ? value[0] : value;

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState('');
  useEffect(() => { supabase.from('schedules').select('id, schedule_date, start_date, end_date, business_type, status, staffs(name), markets(market_name)').order('schedule_date').then(({ data }) => { setRows((data || []) as EventRow[]); setLoading(false); }); }, []);
  const filtered = rows.filter((row) => `${relation(row.markets)?.market_name || ''} ${relation(row.staffs)?.name || ''} ${row.business_type}`.includes(query));
  return <div><PageHeader eyebrow="OPERATIONS" title="행사 관리" description="기존 스케줄을 행사 단위 목록으로 확인합니다. 신규 등록과 변경은 통합 일정에서 처리되어 모든 화면에 같은 데이터가 반영됩니다." action={<Link href="/schedules" className="bg-emerald-700 px-4 py-2 text-sm font-bold text-white">일정에서 행사 등록</Link>} />
    <div className="mb-4 flex flex-col gap-3 border border-gray-200 bg-white p-4 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="마트, 담당자, 업종 검색" className="h-10 flex-1 border border-gray-300 px-3 text-sm" /><select className="h-10 border border-gray-300 bg-white px-3 text-sm"><option>전체 상태</option><option>예정</option><option>확정</option><option>진행</option><option>완료</option></select></div>
    <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-5 py-3">행사기간</th><th className="px-5 py-3">마트</th><th className="px-5 py-3">행사팀/담당자</th><th className="px-5 py-3">업종</th><th className="px-5 py-3">상태</th><th className="px-5 py-3">관리</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((row) => <tr key={row.id}><td className="px-5 py-4 font-medium">{row.start_date || row.schedule_date || '-'}{row.end_date && row.end_date !== row.start_date ? ` ~ ${row.end_date}` : ''}</td><td className="px-5 py-4">{relation(row.markets)?.market_name || '-'}</td><td className="px-5 py-4">{relation(row.staffs)?.name || '미지정'}</td><td className="px-5 py-4">{row.business_type}</td><td className="px-5 py-4"><StatusBadge tone={row.status === 'completed' ? 'gray' : 'green'}>{row.status === 'completed' ? '완료' : '확정'}</StatusBadge></td><td className="px-5 py-4"><Link href="/schedules" className="font-bold text-emerald-700">일정 열기</Link></td></tr>)}{!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-500">표시할 행사가 없습니다.</td></tr>}</tbody></table></div>
  </div>;
}
