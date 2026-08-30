'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import MediaUpload from '@/components/MediaUpload';

interface Staff {
  id: string;
  name: string;
  contact: string;
  video_url?: string;
  created_at: string;
}

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

export default function StaffsPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 등록 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaffs();
  }, []);

  const fetchStaffs = async () => {
    setLoading(true);
    setError(null);
    try {
      // 5초 타임아웃 적용하여 Supabase 데이터 로드
      const fetchPromise = supabase
        .from('staffs')
        .select('id, name, contact, video_url, created_at')
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await fetchWithTimeout(fetchPromise, 5000);

      if (fetchError) throw fetchError;
      setStaffs(data || []);
    } catch (err: any) {
      console.error('Error fetching staffs:', err);
      setError(err.message || '직원 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact) {
      alert('이름과 연락처는 필수 항목입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const insertPromise = supabase
        .from('staffs')
        .insert([
          {
            name,
            contact,
            video_url: videoUrl || null,
          },
        ]);

      const { error: insertError } = await fetchWithTimeout(insertPromise, 5000);

      if (insertError) throw insertError;

      alert('직원이 등록되었습니다.');
      setIsModalOpen(false);
      setName('');
      setContact('');
      setVideoUrl('');
      fetchStaffs();
    } catch (err: any) {
      console.error('Error creating staff:', err);
      alert(`등록 실패: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">직원 관리</h1>
          <p className="text-sm text-gray-500">스케줄 배정을 위한 전체 직원 프로필을 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer"
        >
          직원 등록
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex justify-between items-center">
          <div>
            <p className="text-sm text-red-700 font-semibold">데이터 연결 경고</p>
            <p className="text-xs text-red-600">{error}</p>
            <p className="text-xs text-gray-500 mt-1">.env.local 설정 혹은 Supabase 대시보드를 확인해 주세요. (가상 모드로 작동 가능)</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setLoading(false);
            }}
            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
          >
            임시 닫기
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">데이터를 불러오는 중입니다...</p>
        </div>
      ) : staffs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">등록된 직원이 없습니다.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            첫 직원 등록하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffs.map((staff) => (
            <div
              key={staff.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{staff.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    등록 완료
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-700">연락처:</span> {staff.contact}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">동영상 유무:</span>{' '}
                    {staff.video_url ? (
                      <span className="text-green-600 font-medium">등록됨</span>
                    ) : (
                      <span className="text-red-500">미등록</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end">
                <Link
                  href={`/staffs/${staff.id}`}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  상세 보기 및 일정 설정 &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 직원 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">새 직원 등록</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="직원 이름 입력"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">동영상 첨부</label>
                <MediaUpload
                  onUploadComplete={(url) => setVideoUrl(url)}
                  accept="video/*"
                  maxDurationSeconds={12}
                  label="10초 내외 활동 증빙 영상 업로드"
                />
                {videoUrl && (
                  <p className="text-xs text-green-600 mt-1">
                    동영상이 정상적으로 첨부되었습니다.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
