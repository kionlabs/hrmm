'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatusBadge } from '@/components/erp-ui';

type Schedule = { id: string; schedule_date?: string; start_date?: string; end_date?: string; business_type: string; weekly_revenue?: number; status?: string; staffs?: { name?: string } | { name?: string }[]; markets?: { market_name?: string } | { market_name?: string }[] };
const formatMoney = (value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const joinedName = (value: Schedule['staffs'], key: 'name') => Array.isArray(value) ? value[0]?.[key] : value?.[key];
const marketName = (value: Schedule['markets']) => Array.isArray(value) ? value[0]?.market_name : value?.market_name;

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [marketCount, setMarketCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  useEffect(() => { (async () => {
    try {
      const [staffs, markets, scheduleResult] = await Promise.all([
        supabase.from('staffs').select('id', { count: 'exact', head: true }),
        supabase.from('markets').select('id', { count: 'exact', head: true }),
        supabase.from('schedules').select('*, staffs(name), markets(market_name)').order('schedule_date'),
      ]);
      setStaffCount(staffs.count || 0); setMarketCount(markets.count || 0); setSchedules((scheduleResult.data || []) as Schedule[]);
      setConnected(!staffs.error && !markets.error && !scheduleResult.error);
    } catch { setConnected(false); } finally { setLoading(false); }
  })(); }, []);

  const metrics = useMemo(() => {
    const now = new Date(); const today = dateKey(now); const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7); const month = today.slice(0, 7);
    const active = schedules.filter((s) => { const start = s.start_date || s.schedule_date || ''; const end = s.end_date || s.schedule_date || start; return start <= today && end >= today; });
    const week = schedules.filter((s) => { const start = s.start_date || s.schedule_date || ''; return start >= today && start <= dateKey(weekEnd); });
    const monthRevenue = schedules.filter((s) => (s.start_date || s.schedule_date || '').startsWith(month)).reduce((sum, s) => sum + (s.weekly_revenue || 0), 0);
    return { active, week, monthRevenue };
  }, [schedules]);

  return <div>
    <PageHeader eyebrow="DAESAN OPERATIONS" title="대산유통 통합 ERP" description="행사 일정과 현장 운영 정보를 한 화면에서 확인합니다." action={<div className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="font-semibold text-gray-600">{connected ? '데이터 연결됨' : '연결 확인 필요'}</span></div>} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['이번 주 행사', `${metrics.week.length}건`, '예정 및 진행 일정', '/schedules'],
        ['진행 중 행사', `${metrics.active.length}건`, '오늘 기준', '/events'],
        ['이번 달 등록 매출', formatMoney(metrics.monthRevenue), '기존 일정 매출 기준', '/revenues'],
        ['정산 대기', '-', '정산 DB 연결 전', '/settlements'],
      ].map(([label, value, note, href]) => <Link href={href} key={label} className="border border-gray-200 bg-white p-5 hover:border-emerald-600">
        <p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-950">{loading ? '...' : value}</p><p className="mt-1 text-xs text-gray-500">{note}</p>
      </Link>)}
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
      <div className="min-w-0 border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-bold">오늘 및 예정 행사</h2><p className="text-xs text-gray-500">기존 스케줄 데이터와 연결</p></div><Link href="/schedules" className="text-sm font-bold text-emerald-700">전체 일정</Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-5 py-3">기간</th><th className="px-5 py-3">마트</th><th className="px-5 py-3">담당/팀</th><th className="px-5 py-3">업종</th><th className="px-5 py-3">상태</th></tr></thead><tbody className="divide-y divide-gray-100">
          {schedules.slice(0, 6).map((s) => <tr key={s.id}><td className="px-5 py-3 font-medium">{s.start_date || s.schedule_date}{s.end_date && s.end_date !== s.start_date ? ` ~ ${s.end_date}` : ''}</td><td className="px-5 py-3">{marketName(s.markets) || '-'}</td><td className="px-5 py-3">{joinedName(s.staffs, 'name') || '미지정'}</td><td className="px-5 py-3">{s.business_type}</td><td className="px-5 py-3"><StatusBadge tone="green">{s.status === 'completed' ? '완료' : '배정'}</StatusBadge></td></tr>)}
          {!loading && schedules.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">등록된 일정이 없습니다.</td></tr>}
        </tbody></table></div>
      </div>
      <div className="space-y-6">
        <div className="border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-bold">운영 현황</h2></div><div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
          <div className="p-5"><p className="text-xs text-gray-500">등록 직원</p><p className="mt-1 text-xl font-bold">{staffCount}명</p></div><div className="p-5"><p className="text-xs text-gray-500">등록 마트</p><p className="mt-1 text-xl font-bold">{marketCount}곳</p></div>
          <div className="p-5"><p className="text-xs text-gray-500">로그인/권한</p><p className="mt-1 text-sm font-bold text-amber-700">설계 필요</p></div><div className="p-5"><p className="text-xs text-gray-500">최근 동기화</p><p className="mt-1 text-sm font-bold">방금 전</p></div>
        </div></div>
        <div className="border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-bold">최근 알림</h2></div><div className="divide-y divide-gray-100 text-sm"><p className="px-5 py-4"><strong>매출 업로드</strong><span className="mt-1 block text-xs text-gray-500">Excel 자동 매칭은 MVP 검토 단계입니다.</span></p><p className="px-5 py-4"><strong>권한 안내</strong><span className="mt-1 block text-xs text-gray-500">현재 화면은 관리자 데모 모드입니다.</span></p></div></div>
      </div>
    </section>
  </div>;
}
