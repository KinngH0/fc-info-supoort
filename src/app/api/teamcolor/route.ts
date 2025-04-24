// 📄 /src/app/api/teamcolor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { rankLimit, topN } = await req.json();
    const totalPages = Math.ceil(rankLimit / 20);

    const allUsers: any[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const url = `https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno=${page}`;

      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const $ = cheerio.load(res.data);

      $('.tbody .tr').each((_, el) => {
        const nickname = $(el).find('.rank_coach .name').text().trim();
        const teamColor = $(el)
          .find('.td.team_color .name .inner')
          .text()
          .replace(/\(.*?\)/g, '')
          .trim();
        const valueRaw = $(el).find('.rank_coach .price').attr('title') || '0';
        const rankText = $(el).find('.rank_no').text().trim();
        const scoreText = $(el).find('.td.rank_r_win_point').text().trim();
        const formation = $(el).find('.td.formation').text().trim();

        allUsers.push({
          nickname,
          teamColor,
          value: parseInt(valueRaw.replace(/,/g, '')) || 0,
          rank: parseInt(rankText) || 0,
          score: parseInt(scoreText) || 0,
          formation,
        });
      });

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
            percent: `${((count / users.length) * 100).toFixed(1)}%(${count}명)`,
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

    return NextResponse.json({
      total: limitedUsers.length,
      topN,
      result: sorted,
    });
  } catch (err: any) {
    console.error('❌ teamcolor route 오류:', err.message);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
