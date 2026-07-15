function pad2(num: number) {
  return String(num).padStart(2, "0");
}

export function generateRechargeSerial(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `RC${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
}
