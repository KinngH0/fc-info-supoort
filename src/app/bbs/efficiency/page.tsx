// src/app/bbs/efficiency/page.tsx
'use client';

import { useState } from 'react';

interface MatchResult {
  nickname: string;
  date: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  winRate: number;
  earnedFc: number;
  hasMore: boolean;
  lastOffset: number;
}

export default function EfficiencyPage() {
  const [nickname, setNickname] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMatches = async (offset: number = 0, accumulate: boolean = false) => {
    try {
      const res = await fetch('/api/efficiency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, date, offset }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '데이터를 가져오는데 실패했습니다.');
      }

      if (accumulate && result) {
        // 기존 결과와 새로운 결과를 합산
        setResult({
          ...data,
          played: result.played + data.played,
          win: result.win + data.win,
          draw: result.draw + data.draw,
          loss: result.loss + data.loss,
          winRate: Math.round(((result.win + data.win) / (result.played + data.played)) * 100),
          earnedFc: (result.win + data.win) * 15,
        });
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');

    try {
      await fetchMatches();
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!result || !result.hasMore || loadingMore) return;
    
    setLoadingMore(true);
    try {
      await fetchMatches(result.lastOffset, true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative pt-24">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="text-white text-center px-4">
            <svg
              className="animate-spin h-8 w-8 mb-4 mx-auto text-white"
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
            <p className="text-lg">데이터를 불러오는 중입니다...</p>
          </div>
        </div>
      )}

      <h1 className="title-main mb-4">⚡ 효율 조회</h1>
      <p className="text-sub mb-6">특정 날짜에 획득한 예상 FC를 조회합니다.</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-10 space-y-4"
      >
        <div>
          <label className="block mb-1 font-medium">닉네임</label>
          <input
            type="text"
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            placeholder="FC 온라인 닉네임"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">날짜</label>
          <input
            type="date"
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          disabled={loading}
        >
          조회하기
        </button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">
            📊 {result.nickname}님의 {result.date} 경기 요약
          </h2>
          <div className="space-y-2">
            <p>총 경기수: {result.played}경기</p>
            <p>
              승: {result.win}, 무: {result.draw}, 패: {result.loss} (승률:{' '}
              {result.winRate}%)
            </p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              획득 FC: {result.earnedFc}FC
            </p>
          </div>

          {result.hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded flex items-center justify-center w-full"
            >
              {loadingMore ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
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
                  더 불러오는 중...
                </>
              ) : (
                '더 불러오기'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}