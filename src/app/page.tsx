import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FC 정보 지원 - 메인',
  description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
  openGraph: {
    title: 'FC 정보 지원',
    description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
    type: 'website',
  },
};

export default function Home() {
  const features = [
    {
      title: '🎯 픽률 조회',
      description: '상위 랭커들의 팀컬러별 선수 픽률을 조회합니다.',
      href: '/bbs/pickrate',
    },
    {
      title: '📊 팀컬러 분석',
      description: '상위 랭커들의 팀컬러 픽률을 조회합니다.',
      href: '/bbs/teamcolor',
    },
    {
      title: '⚡ 효율 조회',
      description: '특정 날짜에 획득한 예상 FC를 조회합니다.',
      href: '/bbs/efficiency',
    },
  ];

  return (
    <main className="min-h-screen px-4 py-10 pt-24">
      <div className="max-w-5xl mx-auto">
        <h1 className="sr-only">FC 정보 지원 메인 페이지</h1>
        <section 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="서비스 메뉴"
        >
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="card cursor-pointer block p-6 transition-all duration-200 hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg bg-white dark:bg-gray-800"
              aria-label={`${feature.title} 페이지로 이동`}
            >
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {feature.title}
              </h2>
              <p className="text-sub text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
