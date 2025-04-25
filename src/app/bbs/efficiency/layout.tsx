import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FC INFO SUPPORT - 효율 조회',
  description: '특정 날짜에 획득한 예상 FC를 조회합니다.',
};

export default function EfficiencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 