'use client';

import { Formation, TeamValue, Position } from '@/types/pickrate';

interface PickrateResultsProps {
  formations: Formation[];
  teamValues: TeamValue[];
  positions: Position[];
}

export function PickrateResults({ formations, teamValues, positions }: PickrateResultsProps) {
  const renderStatCard = (title: string, items: Array<{ name: string; count: number }>) => (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
          >
            <h3 className="font-semibold">{item.name}</h3>
            <p>사용자 수: {item.count.toLocaleString()}명</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderStatCard('포메이션 통계', formations)}
      {renderStatCard('팀 컬러 통계', teamValues)}
      {renderStatCard('포지션별 통계', positions)}
    </div>
  );
} 