"use client";

import { useState } from "react";

export default function TeamcolorPage() {
  const [rankLimit, setRankLimit] = useState("100");
  const [topN, setTopN] = useState("5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/teamcolor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankLimit: Number(rankLimit), topN: Number(topN) })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ 에러 응답: ${res.status}`, errorText);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("✅ 서버에서 받은 응답:", data);
      setResult(data);
    } catch (error) {
      console.error("❌ 클로마이언트 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">팀여리 분석 <span className="text-sm text-zinc-400">(TOP 랭커 기준)</span>
      </h1>
      <p className="text-sm mb-6">상위 랭커들의 팀컬러 분포와 평균 구단가치, 등수, 포메이션 분포 등을 분석합니다.</p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-10">
        <div>
          <label className="block text-sm mb-1">조회 랭커 수</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-zinc-700 text-white"
            value={rankLimit}
            onChange={(e) => setRankLimit(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">상위 N개 팀컬러</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-zinc-700 text-white"
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          {loading ? "분석 중..." : "조회하기"}
        </button>
      </form>

      {result?.result?.length > 0 && (
        <div className="space-y-10">
          {result.result.map((item: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-zinc-800 p-5 rounded shadow">
              <h2 className="text-lg font-bold mb-2">{item.rank}위 - {item.teamColor}</h2>
              <p>총 인원: {item.count}명 ({item.percentage}%)</p>
              <p>평균 구단가치: {item.averageValue}</p>
              <p>최고 가치: {item.maxValue.display} - {item.maxValue.nickname}</p>
              <p>최저 가치: {item.minValue.display} - {item.minValue.nickname}</p>
              <p>평균 랭크: {item.avgRank}위, 평균 점수: {item.avgScore}점</p>
              <div className="mt-3">
                <p className="font-semibold">상위 포메이션:</p>
                <ul className="list-disc ml-5">
                  {item.topFormations.map((form: any, fIdx: number) => (
                    <li key={fIdx}>{form.form} - {form.percent}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}