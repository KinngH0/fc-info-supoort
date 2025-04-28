'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchTeamColors } from '@/lib/api/pickrate';
import { useEffect, useState } from 'react';

const schema = z.object({
  rankLimit: z.number().min(1).max(1000),
  teamColor: z.string(),
  topN: z.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

interface PickrateFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

export function PickrateForm({ onSubmit, isLoading }: PickrateFormProps) {
  const [teamColors, setTeamColors] = useState<string[]>([]);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rankLimit: 100,
      teamColor: 'all',
      topN: 5,
    },
  });

  useEffect(() => {
    fetchTeamColors().then(setTeamColors).catch(console.error);
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8">
      <div>
        <label className="block text-sm font-medium mb-1">랭킹 범위</label>
        <input
          type="number"
          {...register('rankLimit', { valueAsNumber: true })}
          className="w-full p-2 border rounded"
          min={1}
          max={1000}
        />
        {errors.rankLimit && (
          <p className="text-red-500 text-sm">{errors.rankLimit.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">팀 컬러</label>
        <select
          {...register('teamColor')}
          className="w-full p-2 border rounded"
        >
          <option value="all">전체</option>
          {teamColors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        {errors.teamColor && (
          <p className="text-red-500 text-sm">{errors.teamColor.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">상위 선수 수</label>
        <input
          type="number"
          {...register('topN', { valueAsNumber: true })}
          className="w-full p-2 border rounded"
          min={1}
          max={10}
        />
        {errors.topN && (
          <p className="text-red-500 text-sm">{errors.topN.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isLoading ? '처리 중...' : '조회 시작'}
      </button>
    </form>
  );
} 