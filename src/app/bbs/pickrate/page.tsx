import { PickrateForm } from '@/components/pickrate/PickrateForm';
import { PickrateResults } from '@/components/pickrate/PickrateResults';

export default function PickratePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">픽률 분석</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">분석 조건</h2>
          <PickrateForm />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">분석 결과</h2>
          <PickrateResults />
        </div>
      </div>
    </div>
  );
}
