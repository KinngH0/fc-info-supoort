'use client';

export function PickrateResults() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">포메이션 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">4-3-3</h3>
            <p>사용자 수: 100명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">4-4-2</h3>
            <p>사용자 수: 80명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">4-2-3-1</h3>
            <p>사용자 수: 60명</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">팀 컬러 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">팀 컬러 1</h3>
            <p>사용자 수: 200명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">팀 컬러 2</h3>
            <p>사용자 수: 150명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">팀 컬러 3</h3>
            <p>사용자 수: 100명</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">포지션별 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">ST</h3>
            <p>사용자 수: 300명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">CM</h3>
            <p>사용자 수: 250명</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold">CB</h3>
            <p>사용자 수: 200명</p>
          </div>
        </div>
      </div>
    </div>
  );
} 