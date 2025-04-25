'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="flex items-center space-x-2 text-xl font-bold text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                aria-label="홈으로 이동"
              >
                <Image
                  src="/img/logo.png"
                  alt="FC INFO SUPPORT 로고"
                  width={180}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/bbs/pickrate"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/bbs/pickrate'
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                aria-current={pathname === '/bbs/pickrate' ? 'page' : undefined}
              >
                픽률 조회
              </Link>
              <Link
                href="/bbs/teamcolor"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/bbs/teamcolor'
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                aria-current={pathname === '/bbs/teamcolor' ? 'page' : undefined}
              >
                팀컬러 분석
              </Link>
              <Link
                href="/bbs/efficiency"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/bbs/efficiency'
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                aria-current={pathname === '/bbs/efficiency' ? 'page' : undefined}
              >
                효율 조회
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <DarkModeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
