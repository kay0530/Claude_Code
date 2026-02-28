export function formatDateJa(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTimeJa(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTimeJa(dateStr) {
  return `${formatDateJa(dateStr)} ${formatTimeJa(dateStr)}`;
}

export function toISODate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get week dates starting from Sunday.
 * @param {Date} baseDate - Any date within the desired week
 * @returns {Date[]} Array of 7 dates from Sunday to Saturday
 */
export function getWeekDatesSundayStart(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'];

export function getDayNameJa(date) {
  return DAY_NAMES_JA[new Date(date).getDay()];
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
