'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import MediaUpload from '@/components/MediaUpload';

interface PlanItem {
  month: string; // 예: "2026-08"
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

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 상태
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [longTermPlan, setLongTermPlan] = useState<PlanItem[]>([]);

  // 오늘 기준 향후 6개월 목록 미리 생성
  const [targetMonths, setTargetMonths] = useState<string[]>([]);

  useEffect(() => {
    // 향후 6개월 목록 생성
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      date.setMonth(date.getMonth() + 1);
    }
    setTargetMonths(months);

    fetchStaff();
  }, [id]);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('staffs')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (data) {
        setStaff(data);
        setName(data.name);
        setContact(data.contact);
        setAdminNotes(data.admin_notes || '');
        setVideoUrl(data.video_url || '');
        
        // long_term_plan 파싱 및 초기화
        const parsedPlan = Array.isArray(data.long_term_plan) ? data.long_term_plan : [];
        setLongTermPlan(parsedPlan);
      }
    } catch (err: any) {
      console.error('Error fetching staff detail:', err);
      setError('직원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 특정 월의 계획 텍스트 찾기 및 변경
  const getPlanForMonth = (month: string) => {
    const item = longTermPlan.find((p) => p.month === month);
    return item ? item.plan : '';
  };

  const handlePlanChange = (month: string, planText: string) => {
    setLongTermPlan((prev) => {
      const filtered = prev.filter((p) => p.month !== month);
      return [...filtered, { month, plan: planText }].sort((a, b) =>
        a.month.localeCompare(b.month)
      );
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact) {
      alert('이름과 연락처는 필수 항목입니다.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('staffs')
        .update({
          name,
          contact,
          admin_notes: adminNotes || null,
          video_url: videoUrl || null,
          long_term_plan: longTermPlan,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      alert('직원 프로필이 정상적으로 수정되었습니다.');
      fetchStaff();
    } catch (err: any) {
      console.error('Error updating staff:', err);
      alert(`수정 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 직원을 삭제하시겠습니까? 관련 스케줄도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('staffs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      alert('삭제되었습니다.');
      router.push('/staffs');
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      alert(`삭제 실패: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">직원 정보를 불러오고 있습니다...</p>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <p className="text-sm text-red-700">{error || '직원 정보를 찾을 수 없습니다.'}</p>
        <Link href="/staffs" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          &larr; 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <Link href="/staffs" className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            &larr; 직원 목록
          </Link>
          <h1 className="text-2xl font-bold text-blue-600">{staff.name} 프로필 상세</h1>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
        >
          직원 삭제
        </button>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 편집 */}
        <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">기본 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">활동 증빙 영상</label>
            {videoUrl && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">현재 동영상:</p>
                <video src={videoUrl} controls className="max-w-xs w-full rounded border bg-black" />
              </div>
            )}
            <MediaUpload
              onUploadComplete={(url) => setVideoUrl(url)}
              accept="video/*"
              maxDurationSeconds={12}
              label="새 활동 증빙 영상으로 교체 (최대 10초 내외)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              관리자 특이사항 (비공개)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="예: 전라도 지역 선호, 주말 근무 기피 등 특이사항 기록"
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 6개월 장기 일정 계획 */}
        <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">6개월 장기 일정 계획</h2>
          
          <div className="space-y-4">
            {targetMonths.map((month) => (
              <div key={month} className="border-b pb-3 last:border-b-0 last:pb-0">
                <label className="block text-xs font-bold text-blue-600 mb-1">{month}</label>
                <input
                  type="text"
                  value={getPlanForMonth(month)}
                  onChange={(e) => handlePlanChange(month, e.target.value)}
                  placeholder="예정된 큰 일정 또는 계획"
                  className="w-full border rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 하단 제어 버튼 */}
        <div className="lg:col-span-3 flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/staffs"
            className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50 bg-white"
          >
            목록으로
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '변경 사항 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
