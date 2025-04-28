'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PickrateForm } from '@/components/pickrate/PickrateForm';
import { PickrateResults } from '@/components/pickrate/PickrateResults';
import { startPickrateAnalysis, checkJobStatus } from '@/lib/api/pickrate';
import { PickrateResponse } from '@/types/pickrate';

export default function PickratePage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PickrateResponse | null>(null);

  const onSubmit = useCallback(async (data: { rankLimit: number; teamColor: string; topN: number }) => {
    if (!session?.user?.apiKey) {
      setError('API 키가 필요합니다. 설정에서 API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResult(null);

    try {
      const jobId = await startPickrateAnalysis(
        data.rankLimit,
        data.teamColor,
        data.topN,
        session.user.apiKey
      );

      const pollInterval = setInterval(async () => {
        try {
          const status = await checkJobStatus(jobId);

          if (status.error) {
            throw new Error(status.error);
          }

          if (status.done && status.result) {
            clearInterval(pollInterval);
            setIsLoading(false);
            setProgress(100);
            setResult(status.result);
            return;
          }

          setProgress(status.progress);
        } catch (error) {
          clearInterval(pollInterval);
          setIsLoading(false);
          setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        }
      }, 1000);

      // 5분 타임아웃
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isLoading) {
          setIsLoading(false);
          setError('작업 시간이 초과되었습니다.');
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      setIsLoading(false);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  }, [session, isLoading]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">픽률 조회</h1>

      <PickrateForm onSubmit={onSubmit} isLoading={isLoading} />

      {isLoading && (
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">진행률: {progress}%</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
          {error}
        </div>
      )}

      {result && (
        <PickrateResults
          formations={result.formations}
          teamValues={result.teamValues}
          positions={result.positions}
        />
      )}
    </div>
  );
} 