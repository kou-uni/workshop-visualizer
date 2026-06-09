// JST(UTC+9) の当日 YYYY-MM-DD（セッション日付の基準）
export function todayJST(): string {
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 10);
}
