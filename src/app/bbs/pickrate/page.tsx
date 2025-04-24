'use client';

import { useState } from 'react';

export default function PickratePage() {
  const [rankLimit, setRankLimit] = useState(100);
  const [teamColor, setTeamColor] = useState('all');
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/pickrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankLimit, teamColor, topN })
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const handleExport = async () => {
    if (!result) return;

    const res = await fetch('/api/pickrate/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: result.summary,
        userCount: result.userCount,
        teamColor
      })
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pickrate_report.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative pt-24">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 text-white">
          <svg className="animate-spin h-8 w-8 mb-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-lg font-semibold">조회 중입니다. 잠시만 기다려주세요...</p>
        </div>
      )}

      <h1 className="title-main mb-4">🎯 픽률 조회</h1>
      <p className="text-sub mb-6">상위 랭커들의 팀컬러별 선수 픽률을 조회합니다.</p>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-10 space-y-4">
        <div>
          <label className="block mb-1 font-medium">조회 랭커 수 (예: 100)</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={rankLimit}
            onChange={(e) => setRankLimit(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">팀컬러 필터 (예: 리버풀 / all)</label>
          <input
            type="text"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={teamColor}
            onChange={(e) => setTeamColor(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">포지션별 상위 선수 수 (예: 5)</label>
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
          조회하기
        </button>
      </form>

      {result && (
        <>
          <button
            onClick={handleExport}
            className="mb-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            엑셀로 저장
          </button>

          <div className="space-y-8">
            <p className="text-sub text-sm">총 분석 인원: <strong>{result.userCount}</strong>명</p>

            {Object.entries(result.summary).map(([positionGroup, players]) => (
              <div key={positionGroup}>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{positionGroup}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2">순위</th>
                        <th className="px-3 py-2">선수명</th>
                        <th className="px-3 py-2">등장 횟수</th>
                        <th className="px-3 py-2">사용자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(players as any[]).map((p, idx) => (
                        <tr key={idx} className="border-t dark:border-gray-600">
                          <td className="px-3 py-2">{idx + 1}위</td>
                          <td className="px-3 py-2">{p.name}</td>
                          <td className="px-3 py-2">{p.count}명</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                            {p.users.slice(0, 3).join(', ')}{p.users.length > 3 ? ` 외 ${p.users.length - 3}명` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
