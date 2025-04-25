'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function PickratePage() {
  const [rankLimit, setRankLimit] = useState(100);
  const [teamColor, setTeamColor] = useState('all');
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});
  const [cacheKey, setCacheKey] = useState<string>('');
  const [startRank, setStartRank] = useState<number>(1);
  const [endRank, setEndRank] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);

  // 캐시된 결과를 가져오는 함수
  const getCachedResult = useCallback(async () => {
    const key = `${rankLimit}-${teamColor}-${topN}`;
    if (key === cacheKey && result) return result;

    const cached = localStorage.getItem(`pickrate-${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // 1시간 이내의 캐시만 사용
      if (Date.now() - timestamp < 3600000) {
        setResult(data);
        setCacheKey(key);
        return data;
      }
    }
    return null;
  }, [rankLimit, teamColor, topN, cacheKey, result]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 캐시된 결과 확인
    const cached = await getCachedResult();
    if (cached) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const jobRes = await fetch('/api/pickrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankLimit, teamColor, topN })
      });

      const { jobId } = await jobRes.json();

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pickrate?jobId=${jobId}`);
          const data = await res.json();

          if (data.progress !== undefined) setProgress(data.progress);
          if (data.done) {
            clearInterval(interval);
            setResult(data.result);
            setLoading(false);
            
            // 결과 캐싱
            const key = `${rankLimit}-${teamColor}-${topN}`;
            localStorage.setItem(`pickrate-${key}`, JSON.stringify({
              data: data.result,
              timestamp: Date.now()
            }));
            setCacheKey(key);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
          clearInterval(interval);
          setLoading(false);
        }
      }, 2000); // 3초에서 2초로 간격 줄임
    } catch (error) {
      console.error('Error submitting job:', error);
      setLoading(false);
    }
  }, [rankLimit, teamColor, topN, getCachedResult]);

  const handleExport = useCallback(async () => {
    if (!result) return;
    try {
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
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [result, teamColor]);

  const toggleSort = useCallback((positionGroup: string, key: string) => {
    setSortStates(prev => ({
      ...prev,
      [positionGroup]: {
        key,
        asc: prev[positionGroup]?.key === key ? !prev[positionGroup]?.asc : true
      }
    }));
  }, []);

  const sortedPlayers = useCallback((players: any[], positionGroup: string) => {
    const sortState = sortStates[positionGroup];
    if (!sortState?.key) return players;
    
    return [...players].sort((a, b) => {
      const aVal = a[sortState.key];
      const bVal = b[sortState.key];
      if (typeof aVal === 'string') {
        return sortState.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortState.asc ? aVal - bVal : bVal - aVal;
    });
  }, [sortStates]);

  // 폼 입력값 변경 핸들러
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, setter: (value: any) => void) => {
    setter(e.target.value);
  }, []);

  const handleStartRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setStartRank(isNaN(value) ? 1 : value);
  };

  const handleEndRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setEndRank(isNaN(value) ? 100 : value);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#171B26] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">픽률 조회</h1>
        
        <div className="bg-white dark:bg-[#1E2330] rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startRank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  시작 순위
                </label>
                <input
                  type="number"
                  id="startRank"
                  value={startRank}
                  onChange={handleStartRankChange}
                  className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A303C] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="시작 순위 입력"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="endRank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  종료 순위
                </label>
                <input
                  type="number"
                  id="endRank"
                  value={endRank}
                  onChange={handleEndRankChange}
                  className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A303C] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="종료 순위 입력"
                  min="1"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? '조회 중...' : '조회하기'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {result && (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-[#1E2330]">
                    <tr>
                      {Object.entries(result.summary).map(([positionGroup, players]) => (
                        <th
                          key={positionGroup}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-x border-gray-200 dark:border-gray-700"
                          style={{ width: getColumnWidth(positionGroup) }}
                        >
                          <button
                            onClick={() => toggleSort(positionGroup, positionGroup)}
                            className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100"
                          >
                            <span>{positionGroup}</span>
                            {sortStates[positionGroup]?.key === positionGroup && (
                              <span>{sortStates[positionGroup]?.asc ? '↑' : '↓'}</span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1E2330] divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlayers(players as any[], '').map((p, idx) => {
                      const percent = ((p.count / result.userCount) * 100).toFixed(1);
                      return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#2A303C] transition-colors duration-150">
                          {Object.entries(result.summary).map(([positionGroup, players]) => (
                            <td
                              key={positionGroup}
                              className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700 truncate"
                              style={{ width: getColumnWidth(positionGroup) }}
                            >
                              {positionGroup === 'rank' && (idx + 1).toString()}
                              {positionGroup === 'name' && p.name}
                              {positionGroup === 'season' && p.season}
                              {positionGroup === 'grade' && p.grade}
                              {positionGroup === 'count' && `${percent}% (${p.count}명)`}
                              {positionGroup === 'users' && p.users.slice(0, 3).join(', ')}{p.users.length > 3 ? ` 외 ${p.users.length - 3}명` : ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getColumnWidth(key: string): string {
  switch (key) {
    case 'rank': return '80px';
    case 'name': return '150px';
    case 'season': return '120px';
    case 'grade': return '100px';
    case 'count': return '120px';
    case 'users': return '200px';
    default: return 'auto';
  }
}
