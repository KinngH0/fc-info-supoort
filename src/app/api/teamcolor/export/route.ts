// 📄 /src/app/api/teamcolor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { rankLimit, topN } = await req.json();
    const totalPages = Math.ceil(rankLimit / 20);

    const fetchPage = async (page: number) => {
      const res = await axios.get(
        `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );
      const dom = new JSDOM(res.data);
      const document = dom.window.document;

      const rows = Array.from(document.querySelectorAll('.tbody .tr'));
      return rows.map((tr) => {
        const nickname = tr.querySelector('.rank_coach .name')?.textContent?.trim() || '';
        const teamColor = tr
          .querySelector('.td.team_color .name .inner')
          ?.textContent?.replace(/\(.*?\)/g, '')
          .trim() || '';
        const valueRaw = tr.querySelector('.rank_coach .price')?.getAttribute('title') || '0';
        const formation = tr.querySelector('.td.formation')?.textContent?.trim() || '';
        const rankText = tr.querySelector('.rank_no')?.textContent?.trim() || '0';
        const scoreText = tr.querySelector('.td.rank_r_win_point')?.textContent?.trim() || '0';

        return {
          nickname,
          teamColor,
          value: parseInt(valueRaw.replace(/,/g, ''), 10) || 0,
          rank: parseInt(rankText, 10) || 0,
          score: parseInt(scoreText, 10) || 0,
          formation,
        };
      });
    };

    const allUsers: any[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const users = await fetchPage(page);
      allUsers.push(...users);
      if (allUsers.length >= rankLimit) break;
    }

    const limitedUsers = allUsers.slice(0, rankLimit);
    const grouped = limitedUsers.reduce((acc: Record<string, any[]>, user) => {
      const team = user.teamColor || '기타';
      if (!acc[team]) acc[team] = [];
      acc[team].push(user);
      return acc;
    }, {});

    const sorted = Object.entries(grouped)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, topN)
      .map(([teamColor, users]) => ({
        teamColor,
        count: users.length,
        avgValue: Math.round(users.reduce((sum, u) => sum + u.value, 0) / users.length),
        avgRank: Math.round(users.reduce((sum, u) => sum + u.rank, 0) / users.length),
        avgScore: Math.round(users.reduce((sum, u) => sum + u.score, 0) / users.length),
        formations: Array.from(new Set(users.map((u) => u.formation))).slice(0, 3),
        users,
      }));

    return NextResponse.json({
      total: limitedUsers.length,
      topN,
      result: sorted,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
