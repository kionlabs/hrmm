'use client';

import { Fragment, useMemo, useRef, useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/erp-ui';
import { changedFields, parseTeamWorkbook, type ComparedTeamRow, type ImportStatus } from '@/lib/team-import';

const statusMeta: Record<ImportStatus, { label: string; tone: 'green' | 'blue' | 'gray' | 'amber' | 'red' }> = {
  new: { label: '신규', tone: 'green' }, changed: { label: '변경', tone: 'blue' }, same: { label: '동일', tone: 'gray' },
  duplicate: { label: '중복 후보', tone: 'amber' }, review: { label: '확인 필요', tone: 'red' },
};
const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : String(value);
const percent = (value: number | null | undefined) => value == null ? '-' : `${(value * 100).toFixed(value * 100 % 1 ? 1 : 0)}%`;
const formatDiff = (label: string, value: unknown) => label === '수수료율' ? percent(value as number | null) : label === '전기사용량' && value != null ? `${value}kW` : display(value);

export default function TeamsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ComparedTeamRow[]>([]);
  const [baseline, setBaseline] = useState({ teams: 0, members: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ImportStatus>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const summary = useMemo(() => ({
    all: rows.length, new: rows.filter((row) => row.status === 'new').length,
    changed: rows.filter((row) => row.status === 'changed').length, same: rows.filter((row) => row.status === 'same').length,
    duplicate: rows.filter((row) => row.status === 'duplicate').length, review: rows.filter((row) => row.status === 'review').length,
  }), [rows]);
  const filteredRows = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter);

  const resetImport = () => {
    setRows([]); setBaseline({ teams: 0, members: 0 }); setFileName(''); setStatusFilter('all');
    setExpandedRow(null); setNotice(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xlsm'].includes(extension || '')) { setError('.xlsx 또는 .xlsm 파일만 업로드할 수 있습니다.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('파일 크기는 20MB 이하여야 합니다.'); return; }
    setProcessing(true); setError(null); setNotice(null); setExpandedRow(null);
    try {
      const parsed = await parseTeamWorkbook(file);
      const response = await fetch('/api/teams/compare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ rows: parsed }),
      });
      const result = await response.json() as { rows?: ComparedTeamRow[]; baseline?: { teams: number; members: number }; error?: string };
      if (!response.ok || !result.rows || !result.baseline) throw new Error(result.error || '기준 데이터 비교에 실패했습니다.');
      setRows(result.rows); setBaseline(result.baseline); setFileName(file.name);
      setNotice(`${result.rows.length}개 행을 파싱하고 DB 기준 데이터와 비교했습니다. 원본 파일과 비교 결과는 저장하지 않습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Excel 처리 중 오류가 발생했습니다.');
    } finally { setProcessing(false); }
  };

  return <div>
    <PageHeader eyebrow="OPERATIONS" title="팀 관리" description="최신 행사관리 Excel을 기준 팀 데이터와 비교하고 변경사항을 검토합니다." />
    {error && <div className="mb-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div className="mb-4 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}

    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <Metric label="기준 등록 팀" value={baseline.teams ? `${baseline.teams}개` : '-'} />
      <Metric label="기준 담당자 행" value={baseline.members ? `${baseline.members}건` : '-'} />
      <Metric label="중복/확인 필요" value={`${summary.duplicate + summary.review}건`} warning={summary.duplicate + summary.review > 0} />
    </section>

    <section className="mb-6 border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="font-bold text-gray-950">최신 행사관리 Excel 업로드</h2><p className="mt-1 text-sm text-gray-500">브라우저에서 `팀리스트`만 읽고, 필요한 업무 필드만 서버 비교 API로 전달합니다. 매크로는 실행하지 않습니다.</p></div>
        <div className="flex flex-wrap gap-2">{rows.length > 0 && <button type="button" onClick={resetImport} className="border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700">결과 닫기</button>}<label className={`inline-flex cursor-pointer items-center bg-emerald-700 px-4 py-2 text-sm font-bold text-white ${processing ? 'pointer-events-none opacity-60' : ''}`}>{processing ? '파싱 및 비교 중...' : 'Excel 파일 선택'}<input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} /></label></div>
      </div>
      <div className="grid gap-3 p-5 text-sm md:grid-cols-3"><FlowStep number="1" title="업로드·파싱" description="팀리스트와 허용 필드만 추출" /><FlowStep number="2" title="DB 기준 비교" description="복합 식별값으로 자동 매칭" /><FlowStep number="3" title="변경 검토" description="상태와 필드별 차이 확인" /></div>
    </section>

    {rows.length > 0 && <section>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-bold">실제 비교 결과</h2><p className="text-xs text-gray-500">{fileName} · 변경 행을 누르면 달라진 필드만 확인할 수 있습니다.</p></div><div className="text-right"><button type="button" disabled title="관리자 로그인 적용 후 사용 가능" className="bg-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600">DB 반영</button><p className="mt-1 text-xs font-medium text-amber-700">관리자 로그인 적용 후 사용 가능</p></div></div>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="전체" value={summary.all} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <SummaryCard label="신규" value={summary.new} active={statusFilter === 'new'} onClick={() => setStatusFilter('new')} />
        <SummaryCard label="변경" value={summary.changed} active={statusFilter === 'changed'} onClick={() => setStatusFilter('changed')} />
        <SummaryCard label="동일" value={summary.same} active={statusFilter === 'same'} onClick={() => setStatusFilter('same')} />
        <SummaryCard label="중복 후보" value={summary.duplicate} active={statusFilter === 'duplicate'} onClick={() => setStatusFilter('duplicate')} />
        <SummaryCard label="확인 필요" value={summary.review} active={statusFilter === 'review'} onClick={() => setStatusFilter('review')} />
      </div>
      <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[980px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-4 py-3">상태</th><th className="px-4 py-3">팀명</th><th className="px-4 py-3">분류</th><th className="px-4 py-3">담당자</th><th className="px-4 py-3">연락처</th><th className="px-4 py-3">업체명</th><th className="px-4 py-3">수수료율</th><th className="px-4 py-3">전기사용량</th><th className="px-4 py-3">검토</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredRows.map((row) => {
        const changes = changedFields(row); const expanded = expandedRow === row.rowNumber;
        return <Fragment key={row.rowNumber}><tr className={row.status === 'changed' ? 'cursor-pointer hover:bg-blue-50' : ''} onClick={() => row.status === 'changed' && setExpandedRow(expanded ? null : row.rowNumber)}><td className="px-4 py-3"><StatusBadge tone={statusMeta[row.status].tone}>{statusMeta[row.status].label}</StatusBadge><span className="ml-2 text-[11px] text-gray-400">{row.rowNumber}행</span></td><td className="px-4 py-3 font-bold">{display(row.teamName)}</td><td className="px-4 py-3">{display(row.category)}</td><td className="px-4 py-3">{display(row.memberName)}</td><td className="px-4 py-3">{display(row.contact)}</td><td className="px-4 py-3">{display(row.companyName)}</td><td className="px-4 py-3">{percent(row.commissionRate)}</td><td className="px-4 py-3">{row.powerUsageKw == null ? '-' : `${row.powerUsageKw}kW`}</td><td className="px-4 py-3 text-xs">{row.status === 'changed' ? <button type="button" className="font-bold text-blue-700">{changes.length}개 필드 {expanded ? '닫기' : '보기'}</button> : <span className={row.reason ? 'text-amber-800' : 'text-gray-400'}>{row.reason || '-'}</span>}</td></tr>{expanded && <tr className="bg-blue-50/70"><td colSpan={9} className="px-5 py-4"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{changes.map(([label, before, after]) => <div key={label} className="border border-blue-200 bg-white p-3"><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-sm"><span className="text-red-600 line-through">{formatDiff(label, before)}</span><span className="mx-2 text-gray-400">→</span><strong className="text-emerald-700">{formatDiff(label, after)}</strong></p></div>)}</div></td></tr>}</Fragment>;
      })}{filteredRows.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-gray-500">해당 상태의 행이 없습니다.</td></tr>}</tbody></table></div>
      <div className="mt-4 border border-gray-200 bg-white p-4 text-xs text-gray-500"><strong className="text-gray-700">처리 범위:</strong> 원본 파일은 업로드하거나 저장하지 않습니다. 팀명, 분류, 성명, 연락처, 업체명, 수수료율, 전기사용량만 비교하며 은행·전자팩스 정보는 읽거나 전송하지 않습니다.</div>
    </section>}
  </div>;
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className="border border-gray-200 bg-white p-4"><p className="text-xs font-bold text-gray-500">{label}</p><p className={`mt-2 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-gray-950'}`}>{value}</p></div>; }
function FlowStep({ number, title, description }: { number: string; title: string; description: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center bg-emerald-100 text-sm font-bold text-emerald-800">{number}</span><div><p className="font-bold">{title}</p><p className="mt-0.5 text-xs text-gray-500">{description}</p></div></div>; }
function SummaryCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`border p-4 text-left ${active ? 'border-emerald-700 bg-emerald-50' : 'border-gray-200 bg-white'}`}><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-xl font-bold">{value}건</p></button>; }
