'use client';
import { useState } from 'react';
import Link from 'next/link';
import { DemoNotice, PageHeader, StatusBadge, WorkflowNav } from '@/components/erp-ui';
const steps = ['파일 선택', '형식 확인', '행사 자동 매칭', '일매출 등록'];
const previewRows = [
  ['2026-10-05', '홈플러스 강남점', 'A팀', '1,240,000원', '자동 매칭 성공', 'green'],
  ['2026-10-05', '이마트 홍대점', 'B팀', '980,000원', '확인 필요', 'amber'],
  ['2026-10-06', '홈플러스 강남점', 'A팀', '1,240,000원', '중복 의심', 'blue'],
  ['2026-10-06', '마트명 미확인', '-', '760,000원', '매칭 실패', 'red'],
] as const;
const summary = [['전체 건수', '24건', 'gray'], ['자동매칭', '15건', 'green'], ['확인필요', '5건', 'amber'], ['중복', '2건', 'blue'], ['실패', '2건', 'red']] as const;
export default function RevenuesPage() {
  const [file, setFile] = useState<File | null>(null); const [step, setStep] = useState(0);
  return <div><PageHeader eyebrow="REVENUE" title="매출 관리" description="마트 매출 Excel을 행사 일정과 연결하는 표준 흐름을 준비했습니다." />
    <DemoNotice>Excel 파일은 서버로 전송되지 않습니다. 이번 MVP에서는 업로드 흐름과 검증 화면만 제공합니다.</DemoNotice>
    <WorkflowNav current="매출" />
    <div className="mb-6 grid grid-cols-2 border border-gray-200 bg-white md:grid-cols-4">{steps.map((label, index) => <div key={label} className={`border-r border-gray-200 p-4 ${index <= step ? 'bg-emerald-50' : ''}`}><span className="text-xs font-bold text-gray-400">0{index + 1}</span><p className={`mt-1 text-sm font-bold ${index <= step ? 'text-emerald-800' : 'text-gray-500'}`}>{label}</p></div>)}</div>
    <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><div className="border border-gray-200 bg-white p-6"><h2 className="font-bold">Excel 업로드</h2><p className="mt-1 text-sm text-gray-500">서로 다른 마트 양식도 향후 매핑 규칙으로 관리합니다.</p><label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center"><span className="text-3xl text-emerald-700">⇧</span><span className="mt-2 text-sm font-bold">.xlsx 또는 .xls 파일 선택</span><span className="mt-1 max-w-xs truncate text-xs text-gray-500">{file?.name || '선택된 파일 없음'}</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setStep(0); }} /></label><button disabled={!file} onClick={() => file && setStep(1)} className="mt-4 w-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-300">파일 형식 확인</button></div>
      <div className="min-w-0 border border-gray-200 bg-white"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-bold">매칭 결과 예시</h2><p className="text-xs text-gray-500">실제 처리 결과가 아닌 시연용 데이터</p></div><StatusBadge tone="amber">예시 화면</StatusBadge></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-4 py-3">날짜</th><th className="px-4 py-3">마트</th><th className="px-4 py-3">행사팀</th><th className="px-4 py-3">매출액</th><th className="px-4 py-3">매칭 상태</th></tr></thead><tbody className="divide-y divide-gray-100">{previewRows.map((row) => <tr key={`${row[0]}-${row[4]}`}><td className="px-4 py-3">{row[0]}</td><td className="px-4 py-3">{row[1]}</td><td className="px-4 py-3">{row[2]}</td><td className="px-4 py-3 font-semibold">{row[3]}</td><td className="px-4 py-3"><StatusBadge tone={row[5]}>{row[4]}</StatusBadge></td></tr>)}</tbody></table></div></div>
    </section>
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">업로드 처리 요약 예시</h2><p className="text-xs text-gray-500">샘플 파일 검토 후 실제 집계 로직을 연결할 예정입니다.</p></div><Link href="/settlements" className="text-sm font-bold text-emerald-700">정산 화면으로 →</Link></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summary.map(([label, value, tone]) => <div key={label} className="border border-gray-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-gray-500">{label}</p><StatusBadge tone={tone}>{label}</StatusBadge></div><p className="mt-2 text-xl font-bold">{value}</p><p className="mt-1 text-[11px] text-amber-700">시연용 예시</p></div>)}</div></section>
  </div>;
}
