import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'FC INFO SUPPORT',
  description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
  keywords: ['FC 온라인', '픽률', '팀컬러', '통계', '분석'],
  authors: [{ name: 'FC INFO SUPPORT' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://fc-info-support.vercel.app',
    siteName: 'FC INFO SUPPORT',
    title: 'FC INFO SUPPORT',
    description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FC INFO SUPPORT',
    description: 'FC 온라인의 다양한 통계와 정보를 제공하는 서비스입니다.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      }
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1436343908093854" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-100 dark:bg-[#171B26] text-gray-900 dark:text-white`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <footer className="py-6 text-center text-gray-600 dark:text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} FC INFO SUPPORT. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
