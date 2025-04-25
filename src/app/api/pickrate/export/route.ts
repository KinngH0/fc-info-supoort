// 📄 /src/app/api/pickrate/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
  const { summary, userCount, teamColor } = await req.json();

  // 📊 Excel 문서 생성
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('픽률 리포트');

  sheet.addRow(['조회 팀컬러', teamColor]);
  sheet.addRow(['분석 유저 수', `${userCount}명`]);
  sheet.addRow([]);

  for (const [position, players] of Object.entries(summary)) {
    sheet.addRow([position]);
    sheet.addRow(['순위', '선수명', '등장 횟수', '사용자']);

    (players as any[]).forEach((player, index) => {
      const preview =
        player.users.slice(0, 3).join(', ') +
        (player.users.length > 3 ? ` 외 ${player.users.length - 3}명` : '');
      sheet.addRow([`${index + 1}위`, player.name, `${player.count}명`, preview]);
    });

    sheet.addRow([]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pickrate_report.xlsx"`,
    },
  });
}
