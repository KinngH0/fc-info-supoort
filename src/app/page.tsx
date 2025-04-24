export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 pt-24">
      <div className="max-w-5xl mx-auto">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 🎯 픽률 조회 */}
          <a href="/bbs/pickrate" className="card cursor-pointer block">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">🎯 픽률 조회</h2>
            <p className="text-sub">상위 랭커들의 팀컬러별 선수 픽률을 조회합니다.</p>
          </a>

          {/* 📊 팀컬러 분석 */}
          <a href="/bbs/teamcolor" className="card cursor-pointer block">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">📊 팀컬러 분석</h2>
            <p className="text-sub">상위 랭커들의 팀컬러 픽률을 조회합니다.</p>
          </a>

          {/* ⚡ 효율 조회 */}
          <a href="/bbs/efficiency" className="card cursor-pointer block">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">⚡ 효율 조회</h2>
            <p className="text-sub">특정 날짜에 획득한 예상 FC를 조회합니다.</p>
          </a>
        </section>
      </div>
    </main>
  );
}
