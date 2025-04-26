'use client';

import { useState, useCallback, useEffect } from 'react';
import { FormationStat } from '@/types/pickrate';

export default function PickratePage() {
  const [rankLimit, setRankLimit] = useState('');
  const [teamColor, setTeamColor] = useState('');
  const [topN, setTopN] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});
  const [cacheKey, setCacheKey] = useState<string>('');
  const [teamColorSuggestions, setTeamColorSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 팀 컬러 목록 가져오기
  useEffect(() => {
    const fetchTeamColors = async () => {
      try {
        const response = await fetch('/api/pickrate');
        const data = await response.json();
        if (data.teamColors) {
          setTeamColorSuggestions(data.teamColors);
        }
      } catch (error) {
        console.error('팀 컬러 목록을 가져오는 데 실패했습니다:', error);
      }
    };
    fetchTeamColors();
  }, []);

  // 팀 컬러 입력 핸들러
  const handleTeamColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTeamColor(value);
    setShowSuggestions(true);
  };

  // 팀 컬러 선택 핸들러
  const handleTeamColorSelect = (color: string) => {
    setTeamColor(color);
    setShowSuggestions(false);
  };

  // 입력창 클릭 시 초기화 핸들러
  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setShowSuggestions(input.name === 'teamColor');
    
    // 각 입력창의 상태값 초기화
    if (input.name === 'rankLimit') {
      setRankLimit('');
    } else if (input.name === 'teamColor') {
      setTeamColor('');
    } else if (input.name === 'topN') {
      setTopN('');
    }
  }, []);

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
    setProgressMessage('');
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

          if (data.progress !== undefined) {
            setProgress(data.progress);
            setProgressMessage(data.message || '데이터 수집 중');
          }
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

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative pt-24">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 text-white px-6">
          <svg className="animate-spin h-8 w-8 mb-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-lg font-semibold mb-4">데이터를 조회하고 있습니다. 잠시만 기다려 주세요...</p>
          <div className="w-full max-w-sm h-4 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="mt-2 text-sm text-gray-300">{progress}% - {progressMessage}</p>
        </div>
      )}

      <h1 className="title-main mb-4">🎯 픽률 조회</h1>
      <p className="text-sub mb-6">상위 랭커들의 팀 컬러별 선수 픽률을 조회합니다.</p>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-10 space-y-4">
        <div>
          <label className="block mb-1 font-medium">조회할 랭커 수</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={rankLimit}
            onChange={(e) => handleInputChange(e, setRankLimit)}
            placeholder="몇 위까지 조회할지 범위 지정"
            onClick={handleInputClick}
            name="rankLimit"
            required
            min="1"
            max="1000"
          />
        </div>

        <div className="relative">
          <label className="block mb-1 font-medium">팀 컬러 필터</label>
          <input
            type="text"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={teamColor}
            onChange={handleTeamColorChange}
            onClick={handleInputClick}
            placeholder="조회할 팀컬러 지정"
            name="teamColor"
            required
          />
          {showSuggestions && teamColorSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border rounded-b shadow-lg max-h-60 overflow-y-auto">
              {teamColorSuggestions
                .filter(color => color.toLowerCase().includes(teamColor.toLowerCase()))
                .map((color, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleTeamColorSelect(color)}
                  >
                    {color}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium">포지션별 상위 선수 수</label>
          <input
            type="number"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={topN}
            onChange={(e) => handleInputChange(e, setTopN)}
            placeholder="포지션별 몇 위까지 출력할지 지정"
            onClick={handleInputClick}
            name="topN"
            required
            min="1"
            max="20"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? '조회 중입니다...' : '조회하기'}
        </button>
      </form>

      {result && (
        <>
          <button
            onClick={handleExport}
            className="mb-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            엑셀 파일로 저장
          </button>

          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h2 className="text-lg font-bold mb-4">팀 정보 요약</h2>
              
              {/* 최고 랭커 정보 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">최고 랭커</h3>
                <p>닉네임: <span className="font-medium">{result.topRanker.nickname}</span> ({result.topRanker.rank}위)</p>
                <p>포메이션: {result.topRanker.formation}</p>
                <p>구단가치: {result.topRanker.teamValue.toLocaleString()}억</p>
              </div>

              {/* 포메이션 통계 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">포메이션 통계</h3>
                <div className="grid grid-cols-2 gap-4">
                  {result.formations.slice(0, 6).map((f: FormationStat, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{f.formation}</span>
                      <span>{f.percentage}% ({f.count}명)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 구단가치 통계 */}
              <div>
                <h3 className="font-semibold mb-2">구단가치 통계</h3>
                <p>평균: {result.teamValue.average.toLocaleString()}억</p>
                <p>최고: {result.teamValue.max.value.toLocaleString()}억 ({result.teamValue.max.nickname})</p>
                <p>최저: {result.teamValue.min.value.toLocaleString()}억 ({result.teamValue.min.nickname})</p>
              </div>
            </div>

            <p className="text-sub text-sm">총 분석된 인원: <strong>{result.userCount}</strong>명</p>

            {Object.entries(result.summary).map(([positionGroup, players]) => (
              <div key={positionGroup} className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{positionGroup}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 w-20" onClick={() => toggleSort(positionGroup, 'rank')}>
                          순위 {sortStates[positionGroup]?.key === 'rank' && (sortStates[positionGroup]?.asc ? ' 🔼' : ' 🔽')}
                        </th>
                        <th className="px-3 py-2 w-32" onClick={() => toggleSort(positionGroup, 'name')}>
                          선수명 {sortStates[positionGroup]?.key === 'name' && (sortStates[positionGroup]?.asc ? ' 🔼' : ' 🔽')}
                        </th>
                        <th className="px-3 py-2 w-32" onClick={() => toggleSort(positionGroup, 'season')}>
                          시즌 {sortStates[positionGroup]?.key === 'season' && (sortStates[positionGroup]?.asc ? ' 🔼' : ' 🔽')}
                        </th>
                        <th className="px-3 py-2 w-24" onClick={() => toggleSort(positionGroup, 'grade')}>
                          강화단계 {sortStates[positionGroup]?.key === 'grade' && (sortStates[positionGroup]?.asc ? ' 🔼' : ' 🔽')}
                        </th>
                        <th className="px-3 py-2 w-32" onClick={() => toggleSort(positionGroup, 'count')}>
                          픽률 {sortStates[positionGroup]?.key === 'count' && (sortStates[positionGroup]?.asc ? ' 🔼' : ' 🔽')}
                        </th>
                        <th className="px-3 py-2">사용자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers(players as any[], positionGroup).map((p, idx) => {
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
