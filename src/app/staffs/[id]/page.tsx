'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import MediaUpload from '@/components/MediaUpload';

interface PlanItem {
  month: string; // 예: "2026-09"
  plan: string;  // 해당 월의 계획 텍스트
}

interface Staff {
  id: string;
  name: string;
  contact: string;
  long_term_plan: PlanItem[];
  admin_notes?: string;
  video_url?: string;
  created_at: string;
}

interface Market {
  id: string;
  market_name: string;
}

interface StaffScheduleItem {
  id: string;
  schedule_date: string;
  business_type: string;
  market_id: string;
  market_name: string;
}

// PromiseLike 지원 5초 타임아웃 헬퍼
const fetchWithTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs = 5000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('네트워크 연결 시간 초과 (Supabase 응답 없음)'));
    }, timeoutMs);

    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
};

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기본 정보 편집 상태
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [longTermPlan, setLongTermPlan] = useState<PlanItem[]>([]);

  // 달력 뷰 연월 상태 (기본값: 현재 연월)
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0 ~ 11

  // 향후 6개월 대상 목록 (YYYY-MM)
  const [targetMonths, setTargetMonths] = useState<string[]>([]);

  // 일정 등록 & 기간 설정 모달 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [modalDateStr, setModalDateStr] = useState('');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalMarketId, setModalMarketId] = useState('');
  const [modalBusinessType, setModalBusinessType] = useState('땅콩빵');
  const [modalSaving, setModalSaving] = useState(false);

  // 날짜 포맷 (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    // 향후 6개월 목록 생성
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
      date.setMonth(date.getMonth() + 1);
    }
    setTargetMonths(months);

    fetchStaffData();
  }, [id]);

  const fetchStaffData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 직원 기본 프로필 조회
      const staffPromise = supabase
        .from('staffs')
        .select('*')
        .eq('id', id)
        .single();

      // 2. 전체 마트 목록 조회
      const marketsPromise = supabase
        .from('markets')
        .select('id, market_name');

      // 3. 직원의 배정 스케줄 목록 조회 (마트 조인)
      const schedulesPromise = supabase
        .from('schedules')
        .select(`
          id,
          schedule_date,
          business_type,
          market_id,
          markets (
            market_name
          )
        `)
        .eq('staff_id', id);

      const [staffRes, marketsRes, schedulesRes] = await Promise.all([
        fetchWithTimeout(staffPromise),
        fetchWithTimeout(marketsPromise),
        fetchWithTimeout(schedulesPromise),
      ]);

      if (staffRes.error) throw staffRes.error;

      if (staffRes.data) {
        const data = staffRes.data;
        setStaff(data);
        setName(data.name);
        setContact(data.contact);
        setAdminNotes(data.admin_notes || '');
        setVideoUrl(data.video_url || '');

        const parsedPlan = Array.isArray(data.long_term_plan) ? data.long_term_plan : [];
        setLongTermPlan(parsedPlan);
      }

      if (marketsRes.data) {
        setMarkets(marketsRes.data || []);
        if (marketsRes.data.length > 0 && !modalMarketId) {
          setModalMarketId(marketsRes.data[0].id);
        }
      }

      // 스케줄 데이터 파싱
      if (schedulesRes.data) {
        const formatted: StaffScheduleItem[] = (schedulesRes.data || []).map((s: any) => ({
          id: s.id,
          schedule_date: s.schedule_date,
          business_type: s.business_type,
          market_id: s.market_id,
          market_name: Array.isArray(s.markets)
            ? s.markets[0]?.market_name || '마트'
            : s.markets?.market_name || '마트',
        }));
        setStaffSchedules(formatted);
      }
    } catch (err: any) {
      console.error('Error fetching staff detail:', err);
      setError('직원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 장기 일정 플랜 변경 헬퍼
  const getPlanForMonth = (monthStr: string) => {
    const item = longTermPlan.find((p) => p.month === monthStr);
    return item ? item.plan : '';
  };

  const handlePlanChange = (monthStr: string, planText: string) => {
    setLongTermPlan((prev) => {
      const filtered = prev.filter((p) => p.month !== monthStr);
      return [...filtered, { month: monthStr, plan: planText }].sort((a, b) =>
        a.month.localeCompare(b.month)
      );
    });
  };

  // 프로필 및 장기 계획 저장
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact) {
      alert('이름과 연락처는 필수 항목입니다.');
      return;
    }

    setSaving(true);
    try {
      const updatePromise = supabase
        .from('staffs')
        .update({
          name,
          contact,
          admin_notes: adminNotes || null,
          video_url: videoUrl || null,
          long_term_plan: longTermPlan,
        })
        .eq('id', id);

      const { error: updateError } = await fetchWithTimeout(updatePromise, 5000);
      if (updateError) throw updateError;

      alert('직원 프로필 및 장기 일정이 정상적으로 수정 저장되었습니다.');
      fetchStaffData();
    } catch (err: any) {
      console.error('Error updating staff:', err);
      alert(`저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 직원 삭제
  const handleDelete = async () => {
    if (!window.confirm('정말로 이 직원을 삭제하시겠습니까? 관련 스케줄 정보도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const deletePromise = supabase
        .from('staffs')
        .delete()
        .eq('id', id);

      const { error: deleteError } = await fetchWithTimeout(deletePromise, 5000);
      if (deleteError) throw deleteError;

      alert('성공적으로 삭제되었습니다.');
      router.push('/staffs');
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      alert(`삭제 실패: ${err.message}`);
    }
  };

  // 달력 날짜 클릭 시 일정 등록 모달 열기
  const handleDayCellClick = (dateStr: string) => {
    setModalDateStr(dateStr);
    setModalStartDate(dateStr);
    setModalEndDate(dateStr);
    if (markets.length > 0 && !modalMarketId) {
      setModalMarketId(markets[0].id);
    }
    setIsScheduleModalOpen(true);
  };

  // 기간 기반 일정 일괄 배정 생성 (Batch Insert)
  const handleCreateScheduleBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMarketId || !modalStartDate || !modalEndDate) {
      alert('마트와 기간(시작일/종료일)을 정확히 입력해 주세요.');
      return;
    }

    const start = new Date(modalStartDate);
    const end = new Date(modalEndDate);
    if (start > end) {
      alert('종료일은 시작일보다 이전일 수 없습니다.');
      return;
    }

    // 시작일부터 종료일까지 매일 스케줄 행 생성
    const insertRows = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = formatDate(curr);
      insertRows.push({
        staff_id: id,
        market_id: modalMarketId,
        schedule_date: dateStr,
        business_type: modalBusinessType,
      });
      curr.setDate(curr.getDate() + 1);
    }

    setModalSaving(true);
    try {
      const insertPromise = supabase.from('schedules').insert(insertRows);
      const { error: insertError } = await fetchWithTimeout(insertPromise, 5000);
      if (insertError) throw insertError;

      alert(`총 ${insertRows.length}일간의 마트 근무 일정이 정상적으로 등록 및 배정되었습니다!`);
      setIsScheduleModalOpen(false);
      fetchStaffData();
    } catch (err: any) {
      console.error('Batch schedule create error:', err);
      alert(`일정 등록 실패: ${err.message}`);
    } finally {
      setModalSaving(false);
    }
  };

  // 기존 일정 개별 삭제 (배정 취소)
  const handleUnassignSchedule = async (scheduleId: string) => {
    if (!window.confirm('이 마트 근무 스케줄을 삭제하시겠습니까?')) return;

    try {
      const deletePromise = supabase.from('schedules').delete().eq('id', scheduleId);
      const { error: deleteError } = await fetchWithTimeout(deletePromise, 5000);
      if (deleteError) throw deleteError;

      fetchStaffData();
    } catch (err: any) {
      console.error('Error unassigning schedule:', err);
      alert(`삭제 실패: ${err.message}`);
    }
  };

  // 달력 연월 이동
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleTodayMonth = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // 달력 그리드 일자 연산
  const getCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0(일) ~ 6(토)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const currentViewMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">직원 상세 정보 및 달력 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <p className="text-sm text-red-700 font-semibold">{error || '직원 정보를 찾을 수 없습니다.'}</p>
        <Link href="/staffs" className="text-sm text-blue-600 hover:underline mt-2 inline-block font-semibold">
          &larr; 직원 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 선택한 날짜에 이미 배정된 스케줄 목록 (모달용)
  const selectedDateSchedules = staffSchedules.filter((s) => s.schedule_date === modalDateStr);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 상단 헤더 영역 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-4 gap-4">
        <div>
          <Link href="/staffs" className="text-xs font-semibold text-blue-600 hover:underline mb-1 inline-block">
            &larr; 직원 목록으로
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-blue-600">{staff.name} 프로필 & 일정 달력</h1>
            <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full">
              총 {staffSchedules.length}건 배정 완료
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-2 border border-red-300 rounded-md text-xs font-semibold text-red-700 bg-white hover:bg-red-50 cursor-pointer shadow-sm"
          >
            직원 삭제
          </button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================= */}
        {/* [좌측 2단 영역 (lg:col-span-2)]: 시각적 달력 & 6개월 장기 일정 */}
        {/* ========================================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. 시각적 달력 (Interactive Calendar Grid - 색상 음영 구분 적용) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>📅</span> 근무 배정 및 일정 달력
                </h2>
                <div className="flex items-center space-x-3 mt-1 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                    <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
                    일이 있는 일정 (빨간색 음영)
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                    <span className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></span>
                    일이 없는 일정 (파란색 음영)
                  </span>
                </div>
              </div>

              {/* 월 조작 버튼 */}
              <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-white rounded cursor-pointer transition-colors"
                >
                  &larr; 이전 달
                </button>
                <span className="text-xs font-extrabold text-blue-700 px-2">
                  {viewYear}년 {viewMonth + 1}월
                </span>
                <button
                  type="button"
                  onClick={handleTodayMonth}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-white rounded cursor-pointer transition-colors"
                >
                  다음 달 &rarr;
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              💡 **날짜 칸을 클릭**하면 팝업에서 마트를 선택하고 일하는 기간을 설정해 일정을 등록할 수 있습니다.
            </p>

            {/* 달력 그리드 테이블 */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-600 bg-gray-50 p-2 rounded-t-lg border border-gray-200">
                  <span className="text-red-500">일</span>
                  <span>월</span>
                  <span>화</span>
                  <span>수</span>
                  <span>목</span>
                  <span>금</span>
                  <span className="text-blue-600">토</span>
                </div>

                {/* 날짜 셀 그리드 (일이 있는 날: 빨간 음영 / 일이 없는 날: 파란 음영) */}
                <div className="grid grid-cols-7 gap-1 border-x border-b border-gray-200 p-1 bg-gray-100/50 rounded-b-lg">
                  {calendarDays.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return <div key={`empty-${idx}`} className="h-24 bg-gray-50/50 rounded border border-transparent"></div>;
                    }

                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const daySchedules = staffSchedules.filter((s) => s.schedule_date === dateStr);
                    const hasWork = daySchedules.length > 0;
                    const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const dayOfWeekIdx = idx % 7;
                    const isSun = dayOfWeekIdx === 0;
                    const isSat = dayOfWeekIdx === 6;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayCellClick(dateStr)}
                        className={`h-24 p-1.5 rounded border flex flex-col justify-between transition-all select-none cursor-pointer ${
                          hasWork
                            ? 'bg-red-50/80 border-2 border-red-300 hover:bg-red-100/90 shadow-2xs'
                            : 'bg-blue-50/40 border border-blue-100 hover:bg-blue-100/50'
                        } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 font-extrabold' : ''}`}
                        title="클릭하여 마트 일정 배정 및 기간 설정"
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-xs font-bold ${
                              isToday
                                ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center'
                                : hasWork
                                ? 'text-red-700 font-extrabold'
                                : isSun
                                ? 'text-red-500'
                                : isSat
                                ? 'text-blue-600'
                                : 'text-gray-700'
                            }`}
                          >
                            {dayNum}
                          </span>
                          {hasWork ? (
                            <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                              근무 {daySchedules.length}건
                            </span>
                          ) : (
                            <span className="text-[8px] text-blue-400 opacity-60">
                              +등록
                            </span>
                          )}
                        </div>

                        {/* 배정된 마트 스케줄 뱃지 (빨간색 강조) */}
                        <div className="space-y-1 overflow-y-auto max-h-16 my-0.5">
                          {daySchedules.map((sch) => (
                            <div
                              key={sch.id}
                              className="text-[9px] bg-white border border-red-200 text-red-950 rounded p-1 font-bold leading-tight shadow-2xs truncate"
                              title={`${sch.market_name} (${sch.business_type})`}
                            >
                              🏪 {sch.market_name}
                              <div className="text-[8px] text-red-700 font-normal">{sch.business_type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 현재 월 장기 계획 요약 알림 */}
            {getPlanForMonth(currentViewMonthStr) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <span className="font-bold">{currentViewMonthStr}월 장기 일정 메모: </span>
                  <span>{getPlanForMonth(currentViewMonthStr)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. 향후 6개월 장기 일정 계획 통합 폼 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>📝</span> 향후 6개월 장기 일정 및 근무 희망계획
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                직원의 장기 근무 가능 지역, 희망 휴무일 또는 특이 스케줄을 월별로 입력해 관리합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targetMonths.map((monthStr) => (
                <div key={monthStr} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-blue-700">{monthStr} 월간 계획</label>
                    <span className="text-[10px] text-gray-400">
                      {monthStr === currentViewMonthStr ? '● 현재 조회 중' : ''}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={getPlanForMonth(monthStr)}
                    onChange={(e) => handlePlanChange(monthStr, e.target.value)}
                    placeholder="예: 서울 서초 선호, 셋째주 주말 휴무 희망 등"
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* [우측 1단 영역 (lg:col-span-1)]: 직원 프로필 기본 정보 편집 */}
        {/* ========================================================= */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
              <span>👤</span> 직원 프로필 기본 정보
            </h2>

            {/* 이름 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">성명</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">연락처</label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 활동 증빙 영상 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">활동 증빙 영상 첨부</label>
              {videoUrl ? (
                <div className="mb-3 space-y-1">
                  <p className="text-[11px] font-semibold text-blue-700">현재 등록된 동영상:</p>
                  <video src={videoUrl} controls className="w-full max-h-48 rounded-lg border bg-black object-cover" />
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 mb-2">등록된 동영상이 없습니다.</p>
              )}
              <MediaUpload
                onUploadComplete={(url) => setVideoUrl(url)}
                accept="video/*"
                maxDurationSeconds={12}
                theme="blue"
                label="새 활동 동영상 업로드 (최대 10초)"
              />
            </div>

            {/* 관리자 특이사항 (비공개) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                관리자 특이사항 메모 <span className="text-red-500 font-normal">(비공개)</span>
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="예: 시간 약속 철저함, 숙련자, 특정 마트 선호 등 관리자 전용 메모"
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 변경 사항 저장 버튼 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-md shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? '프로필 저장 중...' : '프로필 & 일정 저장'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ========================================================= */}
      {/* 📅 마트 일정 배정 및 일하는 기간 설정 모달 팝업 */}
      {/* ========================================================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-blue-600 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-blue-700 flex items-center gap-1.5">
                <span>📅</span> [{staff.name}] 마트 일정 등록 & 기간 설정
              </h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* 기존 배정 내역이 있을 경우 표시 */}
            {selectedDateSchedules.length > 0 && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-900">
                  📍 선택한 날짜 ({modalDateStr}) 기존 배정 내역:
                </p>
                <div className="space-y-1.5">
                  {selectedDateSchedules.map((sch) => (
                    <div key={sch.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-200 text-xs">
                      <div>
                        <span className="font-bold text-red-950">🏪 {sch.market_name}</span>
                        <span className="ml-2 text-red-700">({sch.business_type})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnassignSchedule(sch.id)}
                        className="text-[10px] bg-red-100 hover:bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold cursor-pointer"
                      >
                        배정 취소
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새로운 근무 일정 배정 & 기간 설정 폼 */}
            <form onSubmit={handleCreateScheduleBatch} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  배정 마트 선택
                </label>
                <select
                  value={modalMarketId}
                  onChange={(e) => setModalMarketId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.market_name}
                    </option>
                  ))}
                  {markets.length === 0 && <option value="">등록된 마트가 없습니다</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  업종 선택
                </label>
                <select
                  value={modalBusinessType}
                  onChange={(e) => setModalBusinessType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="땅콩빵">땅콩빵</option>
                  <option value="붕어빵">붕어빵</option>
                  <option value="만두">만두</option>
                  <option value="와플">와플</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 일하는 기간 설정 (Start ~ End) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    근무 시작일
                  </label>
                  <input
                    type="date"
                    required
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    근무 종료일
                  </label>
                  <input
                    type="date"
                    required
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                * 시작일부터 종료일까지 매일 일괄 근무 일정이 자동 생성 및 배정됩니다.
              </p>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  disabled={modalSaving}
                  className="px-3.5 py-1.5 border rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-4 py-1.5 border border-transparent rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {modalSaving ? '등록 중...' : '일정 등록 및 일괄 배정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
