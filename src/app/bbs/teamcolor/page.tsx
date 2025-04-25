'use client';

import { useState } from 'react';

export default function TeamColorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [rankCount, setRankCount] = useState<string>('100');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [topCount, setTopCount] = useState<string>('5');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teamcolor', {
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
    } catch (error) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#171B26] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">팀컬러 분석</h1>
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
                {loading ? '분석 중...' : '분석하기'}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-x border-gray-200 dark:border-gray-700">
                        순위
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-x border-gray-200 dark:border-gray-700">
                        팀
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-x border-gray-200 dark:border-gray-700">
                        사용 비율
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-x border-gray-200 dark:border-gray-700">
                        사용자
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1E2330] divide-y divide-gray-200 dark:divide-gray-700">
                    {data.teams?.map((team: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-[#2A303C] transition-colors duration-150">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700">
                          {team.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700">
                          {team.percentage}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-700">
                          {team.users}
                        </td>
                      </tr>
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
