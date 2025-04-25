import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });
const jobStore = new Map<string, any>();

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const id = Date.now().toString();
  jobStore.set(id, { status: 'processing', data: null, progress: 0 });

  const { rankLimit, topN } = await req.json();

  processTeamColorData(id, rankLimit, topN);

  return NextResponse.json({ jobId: id });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId || !jobStore.has(jobId)) {
    return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
  }

  const result = jobStore.get(jobId);
  return NextResponse.json(result);
}

async function processTeamColorData(jobId: string, rankLimit: number, topN: number) {
  try {
    const totalPages = Math.ceil(rankLimit / 20);
    const allUsers: any[] = [];

    for (let page = 1; page <= totalPages; page++) {
      await delay(200); // 딜레이 추가로 Vercel 타임아웃 방지

      const url = `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        httpsAgent: agent,
      });

      const dom = new JSDOM(res.data);
      const trs = dom.window.document.querySelectorAll('.tbody .tr');

      trs.forEach((tr: any) => {
        const nickname = tr.querySelector('.rank_coach .name')?.textContent?.trim() || '';
        const teamColor = tr.querySelector('.td.team_color .name .inner')?.textContent?.replace(/\(.*?\)/g, '').trim() || '';
        const valueRaw = tr.querySelector('.rank_coach .price')?.getAttribute('title') || '0';
        const formation = tr.querySelector('.td.formation')?.textContent?.trim() || '';
        const rankText = tr.querySelector('.rank_no')?.textContent?.trim() || '0';
        const scoreText = tr.querySelector('.td.rank_r_win_point')?.textContent?.trim() || '0';

        allUsers.push({
          nickname,
          teamColor,
          value: parseInt(valueRaw.replace(/,/g, '')) || 0,
          rank: parseInt(rankText) || 0,
          score: parseInt(scoreText) || 0,
          formation,
        });
      });

      // ✅ 진행률 저장
      const progress = Math.min(100, Math.round((page / totalPages) * 100));
      const prev = jobStore.get(jobId);
      if (prev) {
        jobStore.set(jobId, { ...prev, progress });
      }

      if (allUsers.length >= rankLimit) break;
    }

    const limitedUsers = allUsers.slice(0, rankLimit);
    const grouped = limitedUsers.reduce((acc: Record<string, any[]>, user) => {
      const key = user.teamColor || '기타';
      acc[key] = acc[key] || [];
      acc[key].push(user);
      return acc;
    }, {});

    const sorted = Object.entries(grouped)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, topN)
      .map(([teamColor, users], idx) => {
        const average = (key: 'value' | 'rank' | 'score') =>
          Math.round(users.reduce((sum, u) => sum + u[key], 0) / users.length);

        const formations = users.reduce((acc: Record<string, number>, u) => {
          acc[u.formation] = (acc[u.formation] || 0) + 1;
          return acc;
        }, {});

        const topFormations = Object.entries(formations)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([form, count]) => ({
            form,
            percent: `${((count / users.length) * 100).toFixed(1)}%(${count}명)`
          }));

        const maxValue = Math.max(...users.map((u) => u.value));
        const minValue = Math.min(...users.map((u) => u.value));
        const maxUser = users.find((u) => u.value === maxValue);
        const minUser = users.find((u) => u.value === minValue);

        return {
          rank: idx + 1,
          teamColor,
          count: users.length,
          percentage: ((users.length / limitedUsers.length) * 100).toFixed(1),
          averageValue: `${(average('value') / 1e8).toFixed(1)}억`,
          avgRank: average('rank'),
          avgScore: average('score'),
          maxValue: {
            display: `${(maxValue / 1e8).toFixed(1)}억`,
            nickname: maxUser?.nickname || '',
          },
          minValue: {
            display: `${(minValue / 1e8).toFixed(1)}억`,
            nickname: minUser?.nickname || '',
          },
          topFormations,
        };
      });

    jobStore.set(jobId, { status: 'completed', result: sorted, progress: 100 });
  } catch (err: any) {
    jobStore.set(jobId, { status: 'error', message: err.message, progress: 0 });
  }
}
