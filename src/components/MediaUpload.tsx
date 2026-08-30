'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface MediaUploadProps {
  onUploadComplete: (url: string) => void;
  bucketName?: string;
  accept?: string;
  maxDurationSeconds?: number; // 동영상인 경우 초 단위 제한
  label?: string;
  theme?: 'blue' | 'green' | 'purple' | 'amber';
}

const themeClasses = {
  blue: {
    btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    progress: 'bg-blue-600',
  },
  green: {
    btn: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    progress: 'bg-green-600',
  },
  purple: {
    btn: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
    progress: 'bg-purple-600',
  },
  amber: {
    btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    progress: 'bg-amber-600',
  },
};

export default function MediaUpload({
  onUploadComplete,
  bucketName = 'media-bucket',
  accept = 'video/*',
  maxDurationSeconds = 12, // 기본 대략 10초 내외 제한
  label = '미디어 파일 업로드',
  theme = 'blue',
}: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTheme = themeClasses[theme];

  // 동영상 재생 길이 검증
  const checkVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(true); // 동영상이 아니면 패스
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (maxDurationSeconds && video.duration > maxDurationSeconds) {
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(false);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setUploadedUrl(null);
    setProgress(0);

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 동영상 시간 제한 체크
    if (selectedFile.type.startsWith('video/')) {
      const isValidDuration = await checkVideoDuration(selectedFile);
      if (!isValidDuration) {
        setError(`동영상 길이는 최대 ${maxDurationSeconds}초까지만 업로드 가능합니다.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('업로드할 파일을 선택해 주세요.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10); // 가짜 프로그레스 시작

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(30);

      // Supabase Storage 업로드
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(80);

      // 공개 URL 획득
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setProgress(100);
      setUploadedUrl(publicUrl);
      onUploadComplete(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`업로드 실패: ${err.message || '알 수 없는 에러가 발생했습니다.'}`);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center">
      <span className="text-sm font-medium text-gray-700 mb-2">{label}</span>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />

      <div className="flex space-x-3 mb-4">
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={uploading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {file ? '파일 변경' : '파일 선택'}
        </button>

        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 ${activeTheme.btn}`}
          >
            {uploading ? '업로드 중...' : '업로드 시작'}
          </button>
        )}
      </div>

      {file && (
        <p className="text-xs text-gray-500 mb-2">
          선택된 파일: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}

      {uploading && (
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${activeTheme.progress}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1 font-semibold">{error}</p>}
      
      {uploadedUrl && (
        <div className="mt-2 text-center">
          <p className="text-xs text-green-600 font-semibold mb-1">✓ 업로드 완료!</p>
          {accept.includes('video') ? (
            <video src={uploadedUrl} controls className="w-48 h-28 rounded border bg-black" />
          ) : (
            <img src={uploadedUrl} alt="Uploaded preview" className="w-48 h-28 object-cover rounded border" />
          )}
        </div>
      )}
    </div>
  );
}
