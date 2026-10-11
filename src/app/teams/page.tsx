'use client';

import { useMemo, useRef, useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/erp-ui';
import {
  compareTeamRows, parseTeamWorkbook,
  type ComparedTeamRow, type ImportStatus, type MemberRecord, type ParsedTeamRow, type TeamRecord,
} from '@/lib/team-import';

type TeamMemberDb = {
  id: string; team_id: string; source_key: string; member_name: string | null; normalized_name: string | null;
  contact: string | null; normalized_phone: string | null; category: string | null; company_name: string | null;
  commission_rate: number | null; power_usage_kw: number | null;
};
type TeamWithMembers = TeamRecord & { team_members: TeamMemberDb[] };
const NO_TEAMS: TeamWithMembers[] = [];
const statusMeta: Record<ImportStatus, { label: string; tone: 'green' | 'blue' | 'gray' | 'amber' | 'red' }> = {
  new: { label: '신규', tone: 'green' }, changed: { label: '변경', tone: 'blue' }, same: { label: '동일', tone: 'gray' },
  duplicate: { label: '중복 후보', tone: 'amber' }, review: { label: '확인 필요', tone: 'red' },
};
const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : String(value);
const percent = (value: number | null | undefined) => value == null ? '-' : `${(value * 100).toFixed(value * 100 % 1 ? 1 : 0)}%`;

export default function TeamsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const teams = NO_TEAMS;
  const [rows, setRows] = useState<ComparedTeamRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ImportStatus>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [detailTeam, setDetailTeam] = useState<TeamWithMembers | null>(null);
  const databaseLocked = true;

  const dbMembers = useMemo<MemberRecord[]>(() => teams.flatMap((team) => team.team_members.map((member) => ({
    id: member.id, team_id: member.team_id, source_key: member.source_key,
    rowNumber: 0, teamName: team.team_name, category: member.category || '', memberName: member.member_name || '', contact: member.contact || '',
    companyName: member.company_name || '', commissionRate: member.commission_rate, powerUsageKw: member.power_usage_kw,
    normalized_name: member.normalized_name, normalized_phone: member.normalized_phone, team,
  }))), [teams]);

  const categories = useMemo(() => Array.from(new Set(dbMembers.map((member) => member.category).filter(Boolean))).sort(), [dbMembers]);
  const filteredTeams = useMemo(() => teams.filter((team) => {
    const text = `${team.team_name} ${team.team_members.map((member) => `${member.member_name || ''} ${member.contact || ''} ${member.company_name || ''}`).join(' ')}`;
    const categoryMatch = category === 'all' || team.team_members.some((member) => member.category === category);
    return text.toLowerCase().includes(query.trim().toLowerCase()) && categoryMatch;
  }), [teams, query, category]);

  const summary = useMemo(() => ({
    all: rows.length,
    new: rows.filter((row) => row.status === 'new').length,
    changed: rows.filter((row) => row.status === 'changed').length,
    same: rows.filter((row) => row.status === 'same').length,
    duplicate: rows.filter((row) => row.status === 'duplicate').length,
    review: rows.filter((row) => row.status === 'review').length,
  }), [rows]);
  const selectedCount = rows.filter((row) => row.selected && (row.status === 'new' || row.status === 'changed')).length;
  const filteredRows = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter);

  const resetImport = () => {
    setRows([]); setFileName(''); setStatusFilter('all'); setNotice(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xlsm'].includes(extension || '')) { setError('.xlsx 또는 .xlsm 파일만 업로드할 수 있습니다.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('파일 크기는 20MB 이하여야 합니다.'); return; }
    setProcessing(true); setError(null); setNotice(null);
    try {
      const parsed = await parseTeamWorkbook(file);
      const compared = compareTeamRows(parsed, teams, dbMembers);
      setRows(compared); setFileName(file.name);
      setNotice(databaseLocked
        ? `${compared.length}개 행을 파싱했습니다. 로그인 전에는 DB를 조회하지 않으며, 파일 내부 중복과 필수값을 기준으로 검토 결과를 만들었습니다.`
        : `${compared.length}개 행을 파싱하고 접근 가능한 기존 팀 데이터와 비교했습니다. 원본 파일과 결과는 저장하지 않았습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Excel 처리 중 오류가 발생했습니다.');
    } finally { setProcessing(false); }
  };

  const toggleRow = (rowNumber: number) => setRows((current) => current.map((row) => row.rowNumber === rowNumber ? { ...row, selected: !row.selected } : row));
  const selectActionable = (checked: boolean) => setRows((current) => current.map((row) => ({ ...row, selected: ['new', 'changed'].includes(row.status) ? checked : false })));

  return <div>
    <PageHeader eyebrow="OPERATIONS" title="팀 관리" description="행사관리 Excel의 팀리스트를 검토하고 승인한 항목만 팀 데이터에 반영합니다." />

    {error && <div className="mb-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {notice && <div className="mb-4 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}

    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <Metric label="현재 등록 팀" value={databaseLocked ? '로그인 필요' : `${teams.length}개`} />
      <Metric label="담당자" value={databaseLocked ? '로그인 필요' : `${dbMembers.length}명`} />
      <Metric label="중복/확인 필요" value={`${summary.duplicate + summary.review}건`} warning={summary.duplicate + summary.review > 0} />
    </section>

    <section className="mb-6 border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="font-bold text-gray-950">최신 행사관리 Excel 업로드</h2><p className="mt-1 text-sm text-gray-500">파일은 브라우저에서 읽고 `팀리스트` 시트만 처리합니다. 매크로는 실행되지 않습니다.</p></div>
        <div className="flex flex-wrap gap-2">
          {rows.length > 0 && <button type="button" onClick={resetImport} className="border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700">결과 닫기</button>}
          <label className={`inline-flex cursor-pointer items-center bg-emerald-700 px-4 py-2 text-sm font-bold text-white ${processing ? 'pointer-events-none opacity-60' : ''}`}>
            {processing ? '파싱 및 비교 중...' : 'Excel 파일 선택'}
            <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
        </div>
      </div>
      <div className="grid gap-3 p-5 text-sm md:grid-cols-3">
        <FlowStep number="1" title="업로드·파싱" description="팀리스트의 업무 필드만 추출" />
        <FlowStep number="2" title="비교·검토" description="신규, 변경, 동일, 중복, 확인 필요 분류" />
        <FlowStep number="3" title="승인 후 반영" description="선택한 신규·변경 항목만 저장" />
      </div>
    </section>

    {rows.length > 0 && <section className="mb-6">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-bold">비교 결과</h2><p className="text-xs text-gray-500">{fileName} · 중복 후보와 확인 필요 항목은 자동 반영되지 않습니다.</p></div><div className="text-right"><button type="button" disabled title="직원 로그인 및 관리자 권한 적용 후 사용할 수 있습니다." className="bg-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600">선택 {selectedCount}건 DB 반영</button><p className="mt-1 text-xs font-medium text-amber-700">직원 로그인 및 관리자 권한 적용 후 사용할 수 있습니다.</p></div></div>
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <SummaryCard label="전체" value={summary.all} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <SummaryCard label="신규" value={summary.new} active={statusFilter === 'new'} onClick={() => setStatusFilter('new')} />
        <SummaryCard label="변경" value={summary.changed} active={statusFilter === 'changed'} onClick={() => setStatusFilter('changed')} />
        <SummaryCard label="중복 후보" value={summary.duplicate} active={statusFilter === 'duplicate'} onClick={() => setStatusFilter('duplicate')} />
        <SummaryCard label="확인 필요" value={summary.review} active={statusFilter === 'review'} onClick={() => setStatusFilter('review')} />
      </div>
      <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="w-12 px-4 py-3"><input aria-label="반영 가능한 전체 선택" type="checkbox" checked={selectedCount > 0 && selectedCount === summary.new + summary.changed} onChange={(event) => selectActionable(event.target.checked)} /></th><th className="px-4 py-3">상태</th><th className="px-4 py-3">팀명</th><th className="px-4 py-3">분류</th><th className="px-4 py-3">담당자</th><th className="px-4 py-3">연락처</th><th className="px-4 py-3">업체명</th><th className="px-4 py-3">수수료율</th><th className="px-4 py-3">전기사용량</th><th className="px-4 py-3">기존 값과 차이</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredRows.map((row) => <tr key={row.rowNumber} className={row.selected ? 'bg-emerald-50/60' : ''}><td className="px-4 py-3"><input aria-label={`${row.rowNumber}행 승인`} type="checkbox" disabled={!['new', 'changed'].includes(row.status)} checked={row.selected} onChange={() => toggleRow(row.rowNumber)} /></td><td className="px-4 py-3"><StatusBadge tone={statusMeta[row.status].tone}>{statusMeta[row.status].label}</StatusBadge><span className="ml-2 text-[11px] text-gray-400">{row.rowNumber}행</span></td><td className="px-4 py-3 font-bold">{display(row.teamName)}</td><td className="px-4 py-3">{display(row.category)}</td><td className="px-4 py-3">{display(row.memberName)}</td><td className="px-4 py-3">{display(row.contact)}</td><td className="px-4 py-3">{display(row.companyName)}</td><td className="px-4 py-3">{percent(row.commissionRate)}</td><td className="px-4 py-3">{row.powerUsageKw == null ? '-' : `${row.powerUsageKw}kW`}</td><td className="max-w-72 px-4 py-3 text-xs">{row.status === 'changed' ? <DiffText oldValue={row.existing} nextValue={row} /> : <span className={row.reason ? 'text-amber-800' : 'text-gray-400'}>{row.reason || '-'}</span>}</td></tr>)}{filteredRows.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-gray-500">해당 상태의 행이 없습니다.</td></tr>}</tbody></table></div>
      {summary.same > 0 && <button type="button" onClick={() => setStatusFilter('same')} className="mt-2 text-xs font-bold text-gray-500 hover:text-emerald-800">동일 {summary.same}건 보기</button>}
    </section>}

    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-bold">등록 팀 목록</h2><p className="text-xs text-gray-500">팀과 담당자를 별도 업무 데이터로 관리합니다.</p></div><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="팀명, 담당자, 연락처 검색" className="h-10 min-w-0 border border-gray-300 px-3 text-sm" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 border border-gray-300 bg-white px-3 text-sm"><option value="all">전체 분류</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>
        <div className="overflow-x-auto border border-gray-200 bg-white"><table className="w-full min-w-[700px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-5 py-3">팀명</th><th className="px-5 py-3">분류</th><th className="px-5 py-3">담당자</th><th className="px-5 py-3">업체명</th><th className="px-5 py-3">관리</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredTeams.map((team) => <tr key={team.id}><td className="px-5 py-4 font-bold">{team.team_name}</td><td className="px-5 py-4">{Array.from(new Set(team.team_members.map((member) => member.category).filter(Boolean))).join(', ') || '-'}</td><td className="px-5 py-4">{team.team_members.length}명</td><td className="px-5 py-4">{Array.from(new Set(team.team_members.map((member) => member.company_name).filter(Boolean))).join(', ') || '-'}</td><td className="px-5 py-4"><button type="button" onClick={() => setDetailTeam(team)} className="font-bold text-emerald-700">상세 보기</button></td></tr>)}{filteredTeams.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500">직원 로그인 및 관리자 권한 적용 후 등록 팀을 조회할 수 있습니다.</td></tr>}</tbody></table></div>
      </div>
      <aside className="border border-gray-200 bg-white p-5"><h2 className="font-bold">현재 검토 파일</h2>{rows.length ? <div className="mt-4"><div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-sm font-bold" title={fileName}>{fileName}</p><StatusBadge tone="amber">메모리 처리</StatusBadge></div><p className="mt-2 text-xs text-gray-500">전체 {summary.all}건 · 신규 {summary.new} · 변경 {summary.changed}</p><p className="mt-1 text-xs text-gray-500">동일 {summary.same} · 중복 {summary.duplicate} · 확인 {summary.review}</p><p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">원본 파일과 분석 결과는 서버나 DB에 저장되지 않습니다. 화면을 닫거나 새로고침하면 사라집니다.</p></div> : <p className="mt-4 text-sm text-gray-500">선택된 파일이 없습니다.</p>}</aside>
    </section>

    {detailTeam && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"><div className="flex items-start justify-between border-b border-gray-200 pb-4"><div><p className="text-xs font-bold text-emerald-700">TEAM DETAIL</p><h2 className="text-xl font-bold">{detailTeam.team_name}</h2></div><button type="button" aria-label="상세 닫기" onClick={() => setDetailTeam(null)} className="h-9 w-9 text-2xl text-gray-500">×</button></div><div className="mt-5 space-y-3">{detailTeam.team_members.map((member) => <div key={member.id} className="border border-gray-200 p-4"><div className="flex items-center justify-between"><strong>{member.member_name || '담당자 미지정'}</strong><StatusBadge tone="gray">{member.category || '분류 없음'}</StatusBadge></div><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-gray-500">연락처</dt><dd>{display(member.contact)}</dd></div><div><dt className="text-xs text-gray-500">업체명</dt><dd>{display(member.company_name)}</dd></div><div><dt className="text-xs text-gray-500">수수료율</dt><dd>{percent(member.commission_rate)}</dd></div><div><dt className="text-xs text-gray-500">전기사용량</dt><dd>{member.power_usage_kw == null ? '-' : `${member.power_usage_kw}kW`}</dd></div></dl></div>)}</div></div></div>}

  </div>;
}
function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className="border border-gray-200 bg-white p-4"><p className="text-xs font-bold text-gray-500">{label}</p><p className={`mt-2 text-2xl font-bold ${warning ? 'text-amber-700' : 'text-gray-950'}`}>{value}</p></div>; }
function FlowStep({ number, title, description }: { number: string; title: string; description: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center bg-emerald-100 text-sm font-bold text-emerald-800">{number}</span><div><p className="font-bold">{title}</p><p className="mt-0.5 text-xs text-gray-500">{description}</p></div></div>; }
function SummaryCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`border p-4 text-left ${active ? 'border-emerald-700 bg-emerald-50' : 'border-gray-200 bg-white'}`}><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-xl font-bold">{value}건</p></button>; }
function DiffText({ oldValue, nextValue }: { oldValue?: Partial<ParsedTeamRow>; nextValue: ParsedTeamRow }) {
  if (!oldValue) return <span className="text-gray-400">기존 값 없음</span>;
  const pairs = [
    ['분류', oldValue.category, nextValue.category], ['담당자', oldValue.memberName, nextValue.memberName], ['연락처', oldValue.contact, nextValue.contact],
    ['업체명', oldValue.companyName, nextValue.companyName], ['수수료율', percent(oldValue.commissionRate), percent(nextValue.commissionRate)],
    ['전기사용량', oldValue.powerUsageKw, nextValue.powerUsageKw],
  ].filter(([, before, after]) => String(before ?? '') !== String(after ?? ''));
  return <div className="space-y-1">{pairs.map(([label, before, after]) => <p key={String(label)}><strong>{label}:</strong> <span className="text-red-600 line-through">{display(before)}</span> → <span className="text-emerald-700">{display(after)}</span></p>)}</div>;
}
