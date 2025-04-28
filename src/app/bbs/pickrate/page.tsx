'use client';

import { useState, useCallback, useEffect } from 'react';
import { FormationStats, TeamValueStats, PositionStats } from './types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const schema = z.object({
  rankLimit: z.number().min(1).max(1000),
  teamColor: z.string(),
  topN: z.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

export default function PickratePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [teamColors, setTeamColors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    formations: FormationStats;
    teamValues: TeamValueStats;
    positions: PositionStats;
  } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rankLimit: 100,
      teamColor: 'all',
      topN: 5,
    },
  });

  // 팀 컬러 목록 로드
  useEffect(() => {
    const fetchTeamColors = async () => {
      try {
        const response = await fetch('/api/python/pickrate');
        if (!response.ok) throw new Error('팀 컬러 목록을 불러오는데 실패했습니다.');
        const data = await response.json();
        setTeamColors(data.teamColors);
      } catch (error) {
        console.error('팀 컬러 목록 로드 실패:', error);
      }
    };
    fetchTeamColors();
  }, []);

  const onSubmit = useCallback(async (data: FormData) => {
    if (!session?.user?.apiKey) {
      setError('API 키가 필요합니다. 설정에서 API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResult(null);

    try {
      // 작업 시작
      const startResponse = await fetch('/api/python/pickrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          apiKey: session.user.apiKey,
        }),
      });

      if (!startResponse.ok) {
        throw new Error('작업 시작에 실패했습니다.');
      }

      const { jobId } = await startResponse.json();

      // 작업 상태 폴링
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/python/pickrate?jobId=${jobId}`);
          if (!statusResponse.ok) {
            throw new Error('작업 상태 확인에 실패했습니다.');
          }

          const status = await statusResponse.json();

          if (status.error) {
            throw new Error(status.error);
          }

          if (status.done) {
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
  }, [session]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">픽률 조회</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">랭킹 범위</label>
          <input
            type="number"
            {...register('rankLimit', { valueAsNumber: true })}
            className="w-full p-2 border rounded"
            min={1}
            max={1000}
          />
          {errors.rankLimit && (
            <p className="text-red-500 text-sm">{errors.rankLimit.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">팀 컬러</label>
          <select
            {...register('teamColor')}
            className="w-full p-2 border rounded"
          >
            <option value="all">전체</option>
            {teamColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          {errors.teamColor && (
            <p className="text-red-500 text-sm">{errors.teamColor.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">상위 선수 수</label>
          <input
            type="number"
            {...register('topN', { valueAsNumber: true })}
            className="w-full p-2 border rounded"
            min={1}
            max={10}
          />
          {errors.topN && (
            <p className="text-red-500 text-sm">{errors.topN.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? '처리 중...' : '조회 시작'}
        </button>
      </form>

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
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-4">포메이션 통계</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.formations).map(([formation, stats]) => (
                <div
                  key={formation}
                  className="bg-white p-4 rounded-lg shadow"
                >
                  <h3 className="font-semibold">{formation}</h3>
                  <p>사용자 수: {stats.count}</p>
                  <p>사용률: {stats.percentage}%</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">구단 가치 통계</h2>
            <div className="bg-white p-4 rounded-lg shadow">
              <p>평균: {result.teamValues.average}억</p>
              <p>최소: {result.teamValues.min}억</p>
              <p>최대: {result.teamValues.max}억</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">포지션별 통계</h2>
            <div className="space-y-6">
              {Object.entries(result.positions).map(([position, players]) => (
                <div key={position} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">{position}</h3>
                  <div className="space-y-2">
                    {players.map((player, index) => (
                      <div key={index} className="flex justify-between">
                        <span>
                          {player.name} ({player.season}) {player.grade}강
                        </span>
                        <span>
                          {player.count}명 ({player.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
