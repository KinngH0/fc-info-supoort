import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FC INFO SUPPORT - 팀컬러 분석',
  description: '상위 랭커들의 팀컬러 구성과 선수 조합을 분석합니다.',
};

export default function TeamColorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 