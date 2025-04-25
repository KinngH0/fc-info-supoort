'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function TeamColorPage() {
  const [rankLimit, setRankLimit] = useState(10000);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobId, setJobId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    setProgress(0);

    const id = uuidv4();
    setJobId(id);

    const res = await fetch('/api/teamcolor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankLimit, topN, jobId: id }),
    });

    if (!res.ok) {
      setLoading(false);
      setError('작업 시작 실패');
      return;
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/teamcolor?jobId=${jobId}`);
      const data = await res.json();

      if (data.status === 'completed') {
        setResult(data.result);
        setLoading(false);
        setProgress(100);
        clearInterval(interval);
      } else if (data.status === 'error') {
        setError('데이터 처리 실패: ' + (data.message || ''));
        setLoading(false);
        clearInterval(interval);
      } else {
        if (data.progress) setProgress(data.progress);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative pt-24">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 text-white px-6">
          <svg
            className="animate-spin h-8 w-8 mb-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          <p className="text-lg font-semibold mb-4">팀컬러 분석 중입니다...</p>

          {/* ✅ 진행률 바 */}
          <div className="w-full max-w-sm h-4 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-300">{progress}% 완료</p>
        </div>
      )}

      <h1 className="title-main mb-4">📊 팀컬러 분석</h1>
      <p className="text-sub mb-6">랭커의 팀컬러 사용 비율과 스쿼드 통계를 분석합니다.</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-10 space-y-4"
      >
        <div>
          <label className="block mb-1 font-medium">조회 랭커 수 (예: 10000)</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={rankLimit}
            onChange={(e) => setRankLimit(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">상위 팀컬러 수 (예: 5)</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          분석 시작
        </button>
      </form>

      {error && <p className="text-red-600 font-medium">❌ {error}</p>}

      {result && (
        <div className="space-y-10">
          {result.map((item: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded shadow">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {item.rank}위: {item.teamColor} ({item.count}명, {item.percentage}%)
              </h2>
              <p className="text-sm">평균 스쿼드 가치: {item.averageValue}</p>
              <p className="text-sm">평균 랭크: {item.avgRank}</p>
              <p className="text-sm">평균 점수: {item.avgScore}</p>
              <p className="text-sm mt-1">최고가: {item.maxValue.display} ({item.maxValue.nickname})</p>
              <p className="text-sm">최저가: {item.minValue.display} ({item.minValue.nickname})</p>
              <div className="mt-2">
                <p className="font-semibold">상위 포메이션:</p>
                <ul className="list-disc list-inside">
                  {item.topFormations.map((f: any, i: number) => (
                    <li key={i}>{f.form} - {f.percent}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
