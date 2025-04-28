'use client';

import { PickrateResponse } from '@/types/pickrate';

interface PickrateResultsProps {
  formations: PickrateResponse['formations'];
  teamValues: PickrateResponse['teamValues'];
  positions: PickrateResponse['positions'];
}

export function PickrateResults({ formations, teamValues, positions }: PickrateResultsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">포메이션 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(formations).map(([formation, stats]) => (
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
          <p>평균: {teamValues.average}억</p>
          <p>최소: {teamValues.min}억</p>
          <p>최대: {teamValues.max}억</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">포지션별 통계</h2>
        <div className="space-y-6">
          {Object.entries(positions).map(([position, players]) => (
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
  );
} 