export function formatTeamValue(value: number): string {
  const 조 = Math.floor(value / 100_000_000_000_000);
  const 억 = Math.floor((value % 100_000_000_000_000) / 100_000_000);
  if (조 > 0) {
    return `${조}조 ${억.toLocaleString()}억`;
  } else {
    return `${억.toLocaleString()}억`;
  }
} 