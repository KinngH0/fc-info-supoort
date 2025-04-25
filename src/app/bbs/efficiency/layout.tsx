import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FC 온라인 효율 조회',
  description: 'FC 온라인의 특정 날짜 경기 기록과 획득한 FC를 조회합니다.',
};

export default function EfficiencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 