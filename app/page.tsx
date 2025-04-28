export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-6">FC SUPPORT</h1>
          <p className="text-xl text-blue-100 mb-8">Football Club Information & Support Platform</p>
          <div className="flex justify-center gap-4">
            <button className="btn-primary">
              시작하기
            </button>
            <button className="btn-secondary">
              더 알아보기
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/10 backdrop-blur-sm py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">클럽 정보</h3>
              <p className="text-blue-100">다양한 축구 클럽의 상세 정보를 확인하세요</p>
            </div>
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">경기 일정</h3>
              <p className="text-blue-100">실시간 경기 일정과 결과를 확인하세요</p>
            </div>
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">커뮤니티</h3>
              <p className="text-blue-100">팬들과 소통하고 정보를 공유하세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-900/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-200">© 2024 FC SUPPORT. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
} 