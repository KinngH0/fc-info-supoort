import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '픽률 조회',
  description: '상위 랭커들의 팀컬러별 선수 픽률을 조회합니다.',
};

export default function PickrateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 