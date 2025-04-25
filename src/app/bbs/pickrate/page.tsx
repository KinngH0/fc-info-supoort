'use client';

import { useState, useCallback } from 'react';

export default function PickratePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});
  const [rankCount, setRankCount] = useState<string>('100');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [topCount, setTopCount] = useState<string>('5');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pickrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rankCount: parseInt(rankCount),
          teamFilter,
          topCount: parseInt(topCount)
        })
      });

      const responseData = await response.json();
      if (responseData.error) {
        setError(responseData.error);
      } else {
        setData(responseData);
      }
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = useCallback((positionGroup: string, key: string) => {
    setSortStates(prev => ({
      ...prev,
      [positionGroup]: {
        key,
        asc: prev[positionGroup]?.key === key ? !prev[positionGroup]?.asc : true
      }
    }));
  }, []);

  const sortedPlayers = useCallback((playerList: any[], positionGroup: string) => {
    const sortState = sortStates[positionGroup];
    if (!sortState?.key) return playerList;
    
    return [...playerList].sort((a, b) => {
      const aVal = a[sortState.key];
      const bVal = b[sortState.key];
      if (typeof aVal === 'string') {
        return sortState.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortState.asc ? aVal - bVal : bVal - aVal;
    });
  }, [sortStates]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#171B26] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">픽률 조회</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          상위 랭커들의 팀컬러별 선수 픽률을 조회합니다.
        </p>
        
        <div className="bg-white dark:bg-[#1E2330] rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="rankCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                조회 랭커 수 (예: 100)
              </label>
              <input
                type="text"
                id="rankCount"
                value={rankCount}
                onChange={(e) => setRankCount(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A303C] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="teamFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                팀컬러 필터 (예: 리버풀 / all)
              </label>
              <input
                type="text"
                id="teamFilter"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A303C] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="topCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                포지션별 상위 선수 수 (예: 5)
              </label>
              <input
                type="text"
                id="topCount"
                value={topCount}
                onChange={(e) => setTopCount(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2A303C] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
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
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {data && (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-[#1E2330]">
                    <tr>
                      {Object.entries(data.summary).map(([positionGroup]) => (
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
                    {Object.entries(data.summary).map(([positionGroup]) => (
                      sortedPlayers(data.summary[positionGroup] as any[], positionGroup).map((p: any, idx: number) => {
                        const percent = ((p.count / data.userCount) * 100).toFixed(1);
                        return (
                          <tr key={`${positionGroup}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-[#2A303C] transition-colors duration-150">
                            {Object.entries(data.summary).map(([col]) => (
                              <td
                                key={`${positionGroup}-${idx}-${col}`}
                                className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700 truncate"
                                style={{ width: getColumnWidth(col) }}
                              >
                                {col === 'rank' && (idx + 1).toString()}
                                {col === 'name' && p.name}
                                {col === 'season' && p.season}
                                {col === 'grade' && p.grade}
                                {col === 'count' && `${percent}% (${p.count}명)`}
                                {col === 'users' && p.users.slice(0, 3).join(', ')}{p.users.length > 3 ? ` 외 ${p.users.length - 3}명` : ''}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    ))}
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
