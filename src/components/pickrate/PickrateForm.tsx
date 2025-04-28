'use client';

import { useState } from 'react';

export function PickrateForm() {
  const [rankLimit, setRankLimit] = useState<number>(100);
  const [teamColor, setTeamColor] = useState<string>('all');
  const [topN, setTopN] = useState<number>(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API 연동
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">랭크 제한</label>
        <input
          type="number"
          value={rankLimit}
          onChange={(e) => setRankLimit(Number(e.target.value))}
          className="w-full p-2 border rounded"
          min="1"
          max="1000"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">팀 컬러</label>
        <select
          value={teamColor}
          onChange={(e) => setTeamColor(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="all">전체</option>
          <option value="premier">프리미어 리그</option>
          <option value="la_liga">라 리가</option>
          <option value="bundesliga">분데스리가</option>
          <option value="serie_a">세리에 A</option>
          <option value="ligue_1">리그 1</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">상위 N개</label>
        <input
          type="number"
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="w-full p-2 border rounded"
          min="1"
          max="100"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        분석 시작
      </button>
    </form>
  );
} 