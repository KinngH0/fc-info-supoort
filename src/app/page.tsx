import Link from 'next/link';
import { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'FC INFO SUPPORT - 메인',
  description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
  openGraph: {
    title: 'FC INFO SUPPORT',
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
      gradient: 'from-blue-500 to-cyan-500',
      hoverGradient: 'hover:from-blue-600 hover:to-cyan-600',
    },
    {
      title: '📊 팀컬러 분석',
      description: '상위 랭커들의 팀컬러 픽률을 조회합니다.',
      href: '/bbs/teamcolor',
      gradient: 'from-purple-500 to-pink-500',
      hoverGradient: 'hover:from-purple-600 hover:to-pink-600',
    },
    {
      title: '⚡ 효율 조회',
      description: '특정 날짜에 획득한 예상 FC를 조회합니다.',
      href: '/bbs/efficiency',
      gradient: 'from-amber-500 to-orange-500',
      hoverGradient: 'hover:from-amber-600 hover:to-orange-600',
    },
  ];

  return (
    <main className="min-h-screen px-4 py-10 pt-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            FC INFO SUPPORT
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.
          </p>
        </div>
        
        {/* 상단 광고 */}
        <div className="mb-12 text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-1436343908093854"
            data-ad-slot="7891011121"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        <section 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          aria-label="서비스 메뉴"
        >
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-300
                bg-gradient-to-br ${feature.gradient}
                hover:shadow-2xl hover:scale-105 hover:-translate-y-1
                ${feature.hoverGradient}`}
              aria-label={`${feature.title} 페이지로 이동`}
            >
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3">
                  {feature.title}
                </h2>
                <p className="text-white/90">
                  {feature.description}
                </p>
              </div>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            </Link>
          ))}
        </section>

        {/* 하단 광고 */}
        <div className="mt-12 text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-1436343908093854"
            data-ad-slot="9012122232"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        {/* 광고 초기화 스크립트 */}
        <Script id="ad-init" strategy="afterInteractive">
          {`
            try {
              (adsbygoogle = window.adsbygoogle || []).push({});
              (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
              console.error('AdSense error:', error);
            }
          `}
        </Script>
      </div>
    </main>
  );
}
