'use client';

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
      bgColor: 'bg-[#2196f3]',
    },
    {
      title: '📊 팀컬러 분석',
      description: '상위 랭커들의 팀컬러 픽률을 조회합니다.',
      href: '/bbs/teamcolor',
      bgColor: 'bg-[#e040fb]',
    },
    {
      title: '⚡ 효율 조회',
      description: '특정 날짜에 획득한 예상 FC를 조회합니다.',
      href: '/bbs/efficiency',
      bgColor: 'bg-[#ff9800]',
    },
  ];

  return (
    <main className="min-h-screen px-4 py-10 pt-24 bg-[#171B26]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#2196f3] mb-4">
            FC INFO SUPPORT
          </h1>
          <p className="text-lg text-gray-300">
            FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.
          </p>
        </div>
        
        {/* 상단 광고 */}
        <div className="mb-12 text-center p-4 bg-[#1E2330] rounded-lg">
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="서비스 메뉴"
        >
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className={`block p-6 rounded-xl transition-transform duration-200 hover:-translate-y-1 ${feature.bgColor}`}
              aria-label={`${feature.title} 페이지로 이동`}
            >
              <h2 className="text-xl font-bold text-white mb-2">
                {feature.title}
              </h2>
              <p className="text-white/90">
                {feature.description}
              </p>
            </Link>
          ))}
        </section>

        {/* 하단 광고 */}
        <div className="mt-12 text-center p-4 bg-[#1E2330] rounded-lg">
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
