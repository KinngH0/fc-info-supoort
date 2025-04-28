export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-800">FC SUPPORT</h1>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            축구의 모든 것을 한눈에
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            실시간 경기 정보부터 클럽 소식까지, FC SUPPORT와 함께하세요
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            시작하기
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">클럽 정보</h3>
              <p className="text-gray-600">최신 클럽 소식과 선수 정보를 확인하세요</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">경기 일정</h3>
              <p className="text-gray-600">실시간 경기 일정과 결과를 한눈에 보세요</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">커뮤니티</h3>
              <p className="text-gray-600">다른 팬들과 함께 소통하고 정보를 나누세요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-6 py-4">
          <p className="text-center text-gray-600">© 2024 FC SUPPORT. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
} 