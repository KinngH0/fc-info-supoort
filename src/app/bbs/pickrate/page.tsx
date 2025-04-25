'use client';

import { useState } from 'react';

export default function PickratePage() {
  const [rankLimit, setRankLimit] = useState(100);
  const [teamColor, setTeamColor] = useState('all');
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setResult(null);

    const jobRes = await fetch('/api/pickrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankLimit, teamColor, topN })
    });

    const { jobId } = await jobRes.json();

    const interval = setInterval(async () => {
      const res = await fetch(`/api/pickrate?jobId=${jobId}`);
      const data = await res.json();

      if (data.progress !== undefined) setProgress(data.progress);
      if (data.done) {
        clearInterval(interval);
        setResult(data.result);
        setLoading(false);
      }
    }, 3000);
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

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedPlayers = (players: any[]) => {
    if (!sortKey) return players;
    return [...players].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative pt-24">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 text-white px-6">
          <svg className="animate-spin h-8 w-8 mb-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-lg font-semibold mb-4">조회 중입니다. 잠시만 기다려주세요...</p>
          <div className="w-full max-w-sm h-4 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="mt-2 text-sm text-gray-300">{progress}% 완료</p>
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
              <div key={positionGroup} className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{positionGroup}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        {['순위', '선수명', '시즌', '강화단계', '픽률'].map((label, index) => {
                          const keys = ['rank', 'name', 'season', 'grade', 'count'];
                          return (
                            <th
                              key={index}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                              onClick={() => toggleSort(keys[index])}
                            >
                              {label}
                              {sortKey === keys[index] && (sortAsc ? ' 🔼' : ' 🔽')}
                            </th>
                          );
                        })}
                        <th className="px-3 py-2">사용자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers(players as any[]).map((p, idx) => {
                        const percent = ((p.count / result.userCount) * 100).toFixed(1);
                        return (
                          <tr key={idx} className="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 py-2">{idx + 1}위</td>
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2">{p.season}</td>
                            <td className="px-3 py-2">{p.grade}</td>
                            <td className="px-3 py-2">{percent}% ({p.count}명)</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                              {p.users.slice(0, 3).join(', ')}{p.users.length > 3 ? ` 외 ${p.users.length - 3}명` : ''}
                            </td>
                          </tr>
                        );
                      })}
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
