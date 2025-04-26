import { Metadata } from 'next';
import MainPage from '../components/MainPage';

export const metadata: Metadata = {
  title: 'FC INFO SUPPORT - 메인',
};

export default function Home() {
  return <MainPage />;
}
