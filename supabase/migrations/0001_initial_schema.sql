-- 0. hrmm 커스텀 스키마 생성
CREATE SCHEMA IF NOT EXISTS hrmm;

-- 1. hrmm.staffs (직원 프로필 테이블)
CREATE TABLE IF NOT EXISTS hrmm.staffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    long_term_plan JSONB DEFAULT '[]'::jsonb, -- 향후 6개월간 장기 일정 계획 (배열 또는 객체 구조)
    admin_notes TEXT,                          -- 관리자 전용 특이사항 (예: 선호 지역, 성격 등)
    video_url TEXT,                           -- 활동 증빙 동영상 Storage 경로 또는 URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. hrmm.markets (마트 프로필 테이블)
CREATE TABLE IF NOT EXISTS hrmm.markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_name TEXT NOT NULL,
    history JSONB DEFAULT '[]'::jsonb,        -- 입점 역사 기록
    owner_notes TEXT,                         -- 점주 성향 및 비공개 메모
    media_urls JSONB DEFAULT '[]'::jsonb,      -- 현장 사진 및 5~10초 영상 URL 목록 (배열 구조)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. hrmm.schedules (스케줄 매핑 테이블 - 병렬 데이터 구조)
CREATE TABLE IF NOT EXISTS hrmm.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES hrmm.staffs(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES hrmm.markets(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,              -- 배정된 날짜 (하루 단위 관리를 위해 DATE 타입 사용)
    business_type TEXT NOT NULL,              -- 업종 (예: 땅콩빵, 붕어빵, 만두 등)
    weekly_revenue INTEGER,                   -- 주간 매출 (목~금 정산용)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_staff_id ON hrmm.schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_schedules_market_id ON hrmm.schedules(market_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON hrmm.schedules(schedule_date);
