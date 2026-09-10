-- 1. hrmm.waiting_pools 테이블 생성 (주차별 인력 풀 및 상태 관리)
CREATE TABLE IF NOT EXISTS hrmm.waiting_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES hrmm.staffs(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,              -- 해당 주차 월요일 날짜 (YYYY-MM-DD)
    status TEXT NOT NULL DEFAULT 'waiting',     -- 'waiting' | 'assigned' | 'completed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(staff_id, week_start_date)
);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_waiting_pools_staff_id ON hrmm.waiting_pools(staff_id);
CREATE INDEX IF NOT EXISTS idx_waiting_pools_week_start ON hrmm.waiting_pools(week_start_date);
CREATE INDEX IF NOT EXISTS idx_waiting_pools_status ON hrmm.waiting_pools(status);

-- 2. hrmm.schedules 테이블에 status 컬럼 호환 추가 (없을 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'hrmm' AND table_name = 'schedules' AND column_name = 'status'
    ) THEN
        ALTER TABLE hrmm.schedules ADD COLUMN status TEXT DEFAULT 'assigned';
    END IF;
END $$;
