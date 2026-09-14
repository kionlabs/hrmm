'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

// PromiseLike(thenable)을 지원하는 5초 타임아웃 헬퍼 함수
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

export default function Home() {
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedData = async () => {
    if (!window.confirm('기존 데이터베이스에 테스트용 가상 데이터를 추가로 주입하시겠습니까?')) {
      return;
    }

    setSeeding(true);
    setSeedError(null);
    setSeedSuccess(false);

    try {
      // 1. 직원 샘플 데이터 주입
      const mockStaffs = [
        {
          name: '김철수',
          contact: '010-1234-5678',
          long_term_plan: [{ month: '2026-08', plan: '서울 서초 지역 지원 선호' }, { month: '2026-09', plan: '개인 사정으로 주말만 가능' }],
          admin_notes: '성실하고 시간 약속 철저함. 전라도 선호 성향 있음.',
        },
        {
          name: '이영희',
          contact: '010-9876-5432',
          long_term_plan: [{ month: '2026-08', plan: '평일 전시간대 근무 가능' }],
          admin_notes: '고객 친화적이고 성격 좋음. 만두 행사 유경험자.',
        },
        {
          name: '박민수',
          contact: '010-5555-4444',
          long_term_plan: [],
          admin_notes: '땅콩빵 전문 숙련자. 주중에는 본업으로 주말만 배정 바람.',
        },
      ];

      const staffPromise = supabase.from('staffs').insert(mockStaffs).select('id, name');
      const { data: insertedStaffs, error: staffError } = await fetchWithTimeout(staffPromise, 6000);

      if (staffError) throw staffError;

      // 2. 마트 샘플 데이터 주입
      const mockMarkets = [
        {
          market_name: '홈플러스 강남점',
          history: ['2026-03: 입점 최초 개시', '2026-05: 땅콩빵 행사 매출 우수'],
          owner_notes: '점주 성격 꼼꼼함. 위생 점검 철저히 요구함.',
          media_urls: [],
        },
        {
          market_name: '이마트 홍대점',
          history: ['2026-04: 와플 입점 개시'],
          owner_notes: '점주 젊고 유연함. 새로운 업종(예: 붕어빵) 추가 시도 원함.',
          media_urls: [],
        },
        {
          market_name: '롯데마트 송파점',
          history: [],
          owner_notes: '행사 매대 위치가 좋으나 임대료가 다소 높음.',
          media_urls: [],
        },
      ];

      const marketPromise = supabase.from('markets').insert(mockMarkets).select('id, market_name');
      const { data: insertedMarkets, error: marketError } = await fetchWithTimeout(marketPromise, 6000);

      if (marketError) throw marketError;

      // 3. 이번 주 월~수 요일 날짜 매핑해서 스케줄 생성
      const monday = new Date();
      const currentDay = monday.getDay();
      const distance = (currentDay === 0 ? 7 : currentDay) - 1;
      monday.setDate(monday.getDate() - distance); // 월요일로 설정

      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const getDayOffset = (offset: number) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + offset);
        return formatDate(d);
      };

      const cs = insertedStaffs?.find((s) => s.name === '김철수')?.id;
      const yh = insertedStaffs?.find((s) => s.name === '이영희')?.id;
      const ms = insertedStaffs?.find((s) => s.name === '박민수')?.id;

      const gn = insertedMarkets?.find((m) => m.market_name === '홈플러스 강남점')?.id;
      const hd = insertedMarkets?.find((m) => m.market_name === '이마트 홍대점')?.id;

      if (cs && yh && ms && gn && hd) {
        const mockSchedules = [
          {
            staff_id: cs,
            market_id: gn,
            schedule_date: getDayOffset(0), // 월요일
            business_type: '땅콩빵',
            weekly_revenue: 1200000,
          },
          {
            staff_id: yh,
            market_id: hd,
            schedule_date: getDayOffset(1), // 화요일
            business_type: '만두',
            weekly_revenue: 1500000,
          },
          {
            staff_id: ms,
            market_id: gn,
            schedule_date: getDayOffset(2), // 수요일
            business_type: '붕어빵',
            weekly_revenue: 980000,
          },
        ];

        const schedulePromise = supabase.from('schedules').insert(mockSchedules);
        const { error: scheduleError } = await fetchWithTimeout(schedulePromise, 6000);

        if (scheduleError) throw scheduleError;
      }

      setSeedSuccess(true);
      alert('가상 테스트용 데이터(직원 3명, 마트 3개, 이번 주 스케줄 3건) 주입에 성공하였습니다!');
    } catch (err: any) {
      console.error('Seeding error:', err);
      setSeedError(err.message || '데이터 세팅에 실패했습니다. 연결 설정을 확인하세요.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-10">
      <div className="text-center space-y-4">
        {/* (주)대산 메인 브랜드 대형 로고 */}
        <div className="flex justify-center mb-2">
          <img
            src="/logo.png"
            alt="(주)대산 로고"
            className="h-20 sm:h-28 md:h-32 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          HRMM 직원 관리 및 마트 스케줄링
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Supabase와 Next.js를 활용하여 직원 일정 계획과 전국의 마트 배정 스케줄링을 효율적으로 관리하세요.
        </p>

        {/* 원클릭 테스트 데이터 시더 배너 */}
        <div className="max-w-xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 text-sm text-blue-900 shadow-sm flex flex-col items-center gap-3">
          <div>
            <p className="font-bold">💡 1차 기능 동작 테스트 가이드</p>
            <p className="text-xs text-blue-700 mt-1">
              데이터가 완전히 비어있는 경우 아래 버튼을 누르면 테스트용 직원 정보, 지점 정보, 그리고 이번 주 가상 배정 스케줄이 자동으로 DB 테이블에 설정됩니다.
            </p>
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className={`px-4 py-2 rounded-md font-semibold text-white shadow-sm text-xs cursor-pointer ${
              seeding ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {seeding ? '데이터 주입 중...' : '테스트용 샘플 데이터 채우기'}
          </button>
          {seedError && <p className="text-xs text-red-600 font-semibold mt-1">{seedError}</p>}
          {seedSuccess && <p className="text-xs text-green-600 font-semibold mt-1">✓ 주입 성공! 각 메뉴에서 데이터를 확인하세요.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* 직원 관리 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl font-bold">
              👤
            </div>
            <h2 className="text-xl font-bold text-gray-900">직원 프로필 관리</h2>
            <p className="text-sm text-gray-500">
              전체 직원 목록 조회, 장기(6개월) 일정 계획 작성, 활동 증빙 영상 첨부 및 비공개 특이사항 마킹을 제어합니다.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/staffs"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
            >
              직원 관리 바로가기 &rarr;
            </Link>
          </div>
        </div>

        {/* 마트 관리 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl font-bold">
              🏪
            </div>
            <h2 className="text-xl font-bold text-gray-900">마트 지점 관리</h2>
            <p className="text-sm text-gray-500">
              마트 지점 정보, 입점 역사 기록, 비공개 점주 성향 메모 및 현장 실사 미디어 파일 목록을 관리합니다.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/markets"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm cursor-pointer"
            >
              마트 관리 바로가기 &rarr;
            </Link>
          </div>
        </div>

        {/* 실시간 스케줄러 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl font-bold">
              📅
            </div>
            <h2 className="text-xl font-bold text-gray-900">실시간 배정 스케줄러</h2>
            <p className="text-sm text-gray-500">
              대기 중인 직원 카드를 각 마트 날짜별 셀로 드래그 앤 드롭하여 배정하고, 업종 및 매출 목표치를 실시간으로 제어합니다.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/schedules"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 shadow-sm cursor-pointer"
            >
              스케줄러 바로가기 &rarr;
            </Link>
          </div>
        </div>

        {/* 공중 일정 공유판 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xl font-bold">
              📢
            </div>
            <h2 className="text-xl font-bold text-gray-900">통합 일정 공유판</h2>
            <p className="text-sm text-gray-500">
              전체 직원이 모바일 또는 PC로 접속해 현재 실시간 배정 스케줄을 열람하는 읽기 전용 판입니다.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/schedules/share"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 shadow-sm cursor-pointer"
            >
              공유판 바로가기 &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
