'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import MediaUpload from '@/components/MediaUpload';

interface Market {
  id: string;
  market_name: string;
  history: string[]; // JSONB 입점 역사 목록
  owner_notes?: string;
  media_urls: string[]; // JSONB 현장 사진 및 영상 URL 목록
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

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 등록 및 편집 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [marketName, setMarketName] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [historyText, setHistoryText] = useState(''); // 한 줄씩 이력 입력
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchPromise = supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await fetchWithTimeout(fetchPromise, 5000);

      if (fetchError) throw fetchError;
      
      const formattedData = (data || []).map((m: any) => ({
        ...m,
        history: Array.isArray(m.history) ? m.history : [],
        media_urls: Array.isArray(m.media_urls) ? m.media_urls : [],
      }));

      setMarkets(formattedData);
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      setError(err.message || '마트 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMarket(null);
    setMarketName('');
    setOwnerNotes('');
    setHistoryText('');
    setMediaUrls([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (market: Market) => {
    setEditingMarket(market);
    setMarketName(market.market_name);
    setOwnerNotes(market.owner_notes || '');
    setHistoryText(market.history.join('\n'));
    setMediaUrls(market.media_urls);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketName) {
      alert('마트 이름은 필수 항목입니다.');
      return;
    }

    setSubmitting(true);
    const historyArray = historyText
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item !== '');

    try {
      if (editingMarket) {
        // 수정 모드
        const updatePromise = supabase
          .from('markets')
          .update({
            market_name: marketName,
            owner_notes: ownerNotes || null,
            history: historyArray,
            media_urls: mediaUrls,
          })
          .eq('id', editingMarket.id);

        const { error: updateError } = await fetchWithTimeout(updatePromise, 5000);
        if (updateError) throw updateError;
        alert('마트 정보가 수정되었습니다.');
      } else {
        // 등록 모드
        const insertPromise = supabase
          .from('markets')
          .insert([
            {
              market_name: marketName,
              owner_notes: ownerNotes || null,
              history: historyArray,
              media_urls: mediaUrls,
            },
          ]);

        const { error: insertError } = await fetchWithTimeout(insertPromise, 5000);
        if (insertError) throw insertError;
        alert('마트가 등록되었습니다.');
      }

      setIsModalOpen(false);
      fetchMarkets();
    } catch (err: any) {
      console.error('Error saving market:', err);
      alert(`저장 실패: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMarket = async (id: string) => {
    if (!window.confirm('정말로 이 마트를 삭제하시겠습니까? 관련 스케줄도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const deletePromise = supabase
        .from('markets')
        .delete()
        .eq('id', id);

      const { error: deleteError } = await fetchWithTimeout(deletePromise, 5000);
      if (deleteError) throw deleteError;
      alert('삭제되었습니다.');
      fetchMarkets();
    } catch (err: any) {
      console.error('Error deleting market:', err);
      alert(`삭제 실패: ${err.message}`);
    }
  };

  const handleMediaUploadComplete = (url: string) => {
    setMediaUrls((prev) => [...prev, url]);
  };

  const handleRemoveMedia = (indexToRemove: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-green-600">마트 관리</h1>
          <p className="text-sm text-gray-500">지점 정보, 입점 이력, 비공개 점주 성향 메모를 구성합니다.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none cursor-pointer"
        >
          마트 등록
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">데이터를 불러오는 중입니다...</p>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">등록된 마트가 없습니다.</p>
          <button
            onClick={handleOpenAddModal}
            className="text-sm text-green-600 font-semibold hover:underline cursor-pointer"
          >
            첫 마트 등록하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {markets.map((market) => (
            <div
              key={market.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">{market.market_name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(market)}
                      className="text-xs text-green-600 hover:underline cursor-pointer"
                    >
                      편집
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      onClick={() => handleDeleteMarket(market.id)}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {market.owner_notes && (
                    <div className="bg-yellow-50/50 p-2.5 rounded border border-yellow-100">
                      <p className="text-xs font-bold text-yellow-800 mb-1">점주 성향 메모 (비공개)</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{market.owner_notes}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold text-gray-500 block mb-1">입점 역사</span>
                    {market.history.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                        {market.history.map((hist, idx) => (
                          <li key={idx}>{hist}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">등록된 입점 이력이 없습니다.</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-500 block mb-1">현장 사진/영상</span>
                    {market.media_urls.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {market.media_urls.map((url, idx) => (
                          <div key={idx} className="relative group">
                            {url.includes('.mp4') || url.includes('.webm') ? (
                              <video src={url} className="w-20 h-14 object-cover rounded border bg-black" />
                            ) : (
                              <img src={url} alt="Field preview" className="w-20 h-14 object-cover rounded border" />
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium rounded transition-opacity"
                            >
                              보기
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">등록된 미디어가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 마트 등록 및 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingMarket ? '마트 정보 편집' : '새 마트 등록'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">마트 이름</label>
                <input
                  type="text"
                  required
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  placeholder="예: 홈플러스 광주점"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  점주 성향 및 메모 (비공개)
                </label>
                <textarea
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder="점주 특이사항, 선호 업종, 비공개 특성 입력"
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  입점 역사 (한 줄에 하나씩 입력)
                </label>
                <textarea
                  value={historyText}
                  onChange={(e) => setHistoryText(e.target.value)}
                  placeholder="예:&#13;2026-03: 땅콩빵 입점&#13;2026-06: 만두 행사 진행"
                  rows={4}
                  className="w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현장 사진/영상 업로드
                </label>
                <MediaUpload
                  onUploadComplete={handleMediaUploadComplete}
                  accept="image/*,video/*"
                  label="사진 또는 현장 영상 추가 업로드"
                  theme="green"
                />
                
                {mediaUrls.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-bold text-gray-600 block mb-1">업로드된 파일 목록:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {mediaUrls.map((url, idx) => (
                        <div key={idx} className="relative group border rounded p-1 bg-gray-50 flex items-center justify-center">
                          {url.includes('.mp4') || url.includes('.webm') ? (
                            <video src={url} className="w-12 h-10 object-cover" />
                          ) : (
                            <img src={url} alt="Thumb" className="w-12 h-10 object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-sm"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
