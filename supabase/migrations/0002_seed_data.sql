-- 1. 가상 직원 데이터 삽입
INSERT INTO hrmm.staffs (id, name, contact, long_term_plan, admin_notes, video_url)
VALUES 
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '김철수',
    '010-1234-5678',
    '[{"month": "2026-08", "plan": "서울 서초 지역 지원 선호"}, {"month": "2026-09", "plan": "개인 사정으로 주말만 가능"}]'::jsonb,
    '성실하고 시간 약속 철저함. 전라도 선호 성향 있음.',
    NULL
  ),
  (
    'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e',
    '이영희',
    '010-9876-5432',
    '[{"month": "2026-08", "plan": "평일 전시간대 근무 가능"}]'::jsonb,
    '고객 친화적이고 성격 좋음. 만두 행사 유경험자.',
    NULL
  ),
  (
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    '박민수',
    '010-5555-4444',
    '[]'::jsonb,
    '땅콩빵 전문 숙련자. 주중에는 본업으로 주말만 배정 바람.',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 2. 가상 마트 데이터 삽입
INSERT INTO hrmm.markets (id, market_name, history, owner_notes, media_urls)
VALUES
  (
    'd4e5f6a1-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
    '홈플러스 강남점',
    '["2026-03: 입점 최초 개시", "2026-05: 땅콩빵 행사 매출 우수"]'::jsonb,
    '점주 성격 꼼꼼함. 위생 점검 철저히 요구함.',
    '[]'::jsonb
  ),
  (
    'e5f6a1b2-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
    '이마트 홍대점',
    '["2026-04: 와플 입점 개시"]'::jsonb,
    '점주 젊고 유연함. 새로운 업종(예: 붕어빵) 추가 시도 원함.',
    '[]'::jsonb
  ),
  (
    'f6a1b2c3-7d8e-9f0a-1b2c-3d4e5f6a7b8c',
    '롯데마트 송파점',
    '[]'::jsonb,
    '행사 매대 위치가 좋으나 임대료가 다소 높음.',
    '[]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 3. 가상 배정 스케줄 데이터 삽입
-- (테스트를 위해 현재 주차의 날짜를 지정해야 하므로, 이 SQL은 정적인 기본 일정을 임의의 2026년 8월 날짜로 기록합니다.
-- 프론트엔드의 원클릭 시더 버튼은 동적으로 이번 주 날짜를 계산해 삽입합니다.)
INSERT INTO hrmm.schedules (staff_id, market_id, schedule_date, business_type, weekly_revenue)
VALUES
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', -- 김철수
    'd4e5f6a1-7b8c-9d0e-1f2a-3b4c5d6e7f8a', -- 홈플러스 강남점
    '2026-08-24', -- 월요일
    '땅콩빵',
    1200000
  ),
  (
    'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', -- 이영희
    'e5f6a1b2-7c8d-9e0f-1a2b-3c4d5e6f7a8b', -- 이마트 홍대점
    '2026-08-25', -- 화요일
    '만두',
    1500000
  ),
  (
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', -- 박민수
    'd4e5f6a1-7b8c-9d0e-1f2a-3b4c5d6e7f8a', -- 홈플러스 강남점
    '2026-08-26', -- 수요일
    '붕어빵',
    980000
  )
ON CONFLICT DO NOTHING;
