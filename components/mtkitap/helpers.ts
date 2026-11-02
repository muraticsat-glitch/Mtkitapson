import type { Achievement, Book, ReadingEntry } from "./types";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string) {
  const date = new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function readingPagesForDate(entries: ReadingEntry[], date: string) {
  return entries
    .filter((entry) => entry.readAt.slice(0, 10) === date)
    .reduce((sum, entry) => sum + Math.max(0, entry.pages), 0);
}

export function readingPagesByDate(entries: ReadingEntry[]) {
  const totals = new Map<string, number>();
  entries.forEach((entry) => {
    const date = entry.readAt.slice(0, 10);
    totals.set(date, (totals.get(date) ?? 0) + Math.max(0, entry.pages));
  });
  return Array.from(totals.entries())
    .map(([date, pages]) => ({ date, pages }))
    .sort((first, second) => second.date.localeCompare(first.date));
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function pagesByDate(entries: ReadingEntry[]) {
  const totals = new Map<string, number>();
  entries.forEach((entry) => totals.set(entry.readAt.slice(0, 10), (totals.get(entry.readAt.slice(0, 10)) ?? 0) + Math.max(0, entry.pages)));
  return totals;
}

export function recentDailyReading(entries: ReadingEntry[], days = 7) {
  const totals = pagesByDate(entries);
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - (days - 1 - index));
    const dateKey = localDateKey(date);
    return { date: dateKey, label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date).replace(".", ""), pages: totals.get(dateKey) ?? 0 };
  });
}

export function recentWeeklyReading(entries: ReadingEntry[], weeks = 8) {
  const totals = pagesByDate(entries);
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: weeks }, (_, index) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeks - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    let pages = 0;
    totals.forEach((value, date) => { const parsed = new Date(`${date}T12:00:00`); if (parsed >= start && parsed < end) pages += value; });
    return { date: localDateKey(start), label: `${start.getDate()} ${new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(start).replace(".", "")}`, pages };
  });
}

export function readingStreak(entries: ReadingEntry[]) {
  const dates = new Set(entries.map((entry) => entry.readAt.slice(0, 10)));
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    if (!dates.has(localDateKey(date))) break;
    streak += 1;
  }
  return streak;
}

export function achievements(books: Book[], entries: ReadingEntry[]): Achievement[] {
  const totalPages = entries.reduce((sum, entry) => sum + Math.max(0, entry.pages), 0);
  const readingDays = new Set(entries.map((entry) => entry.readAt.slice(0, 10))).size;
  const completedBooks = books.filter((book) => Boolean(book.completedAt)).length;
  const streak = readingStreak(entries);
  const make = (id: string, title: string, description: string, icon: string, accent: string, progress: number, goal: number): Achievement => ({ id, title, description, icon, accent, unlocked: progress >= goal, progress: Math.min(progress, goal), goal });
  return [
    make("first-page", "İlk adım", "İlk okuma kaydını oluşturdun.", "footsteps", "#35B9A7", totalPages, 1),
    make("page-100", "Yüz sayfa", "Toplamda 100 sayfa okudun.", "book", "#F5A524", totalPages, 100),
    make("page-500", "Sayfa avcısı", "Toplamda 500 sayfaya ulaştın.", "library", "#EE6C4D", totalPages, 500),
    make("page-1000", "Binlik kulüp", "Toplamda 1.000 sayfayı geride bıraktın.", "rocket", "#7C5CFC", totalPages, 1000),
    make("three-days", "Ritmi yakaladın", "Üç gün üst üste okuma yaptın.", "flame", "#F5A524", streak, 3),
    make("seven-days", "Haftalık seri", "Yedi gün üst üste okuma yaptın.", "calendar", "#35B9A7", streak, 7),
    make("fourteen-days", "İki haftalık güç", "On dört gün üst üste okuma yaptın.", "flash", "#7C5CFC", streak, 14),
    make("five-days", "Düzenli okuyucu", "Beş farklı günde okuma yaptın.", "time", "#627D98", readingDays, 5),
    make("thirty-days", "Ayın okuyucusu", "Otuz farklı günde okuma yaptın.", "calendar-outline", "#35B9A7", readingDays, 30),
    make("first-book", "İlk kitap", "Bir kitabı tamamladın.", "trophy", "#F5A524", completedBooks, 1),
    make("three-books", "Kitap kurdu", "Üç kitabı tamamladın.", "ribbon", "#EE6C4D", completedBooks, 3),
    make("five-books", "Usta okuyucu", "Beş kitabı tamamladın.", "medal", "#7C5CFC", completedBooks, 5),
  ];
}

export function readingLevel(unlockedBadges: number) {
  if (unlockedBadges >= 11) return { title: "Efsane okuyucu", nextGoal: null };
  if (unlockedBadges >= 8) return { title: "Usta okuyucu", nextGoal: 11 };
  if (unlockedBadges >= 5) return { title: "Düzenli okuyucu", nextGoal: 8 };
  if (unlockedBadges >= 2) return { title: "Kitap kaşifi", nextGoal: 5 };
  return { title: "Yeni okuyucu", nextGoal: 2 };
}

export function pagesRead(bookId: string, entries: ReadingEntry[], cycle?: number) {
  const bookEntries = entries.filter((entry) => entry.bookId === bookId);
  const currentCycle = cycle ?? Math.max(...bookEntries.map((entry) => entry.cycle ?? 0), 0);
  const cycleEntries = bookEntries.filter((entry) => (entry.cycle ?? 0) === currentCycle);
  const reachedPages = cycleEntries.filter((entry) => typeof entry.currentPage === "number").map((entry) => entry.currentPage as number);
  if (reachedPages.length > 0) return Math.max(...reachedPages);
  return cycleEntries.reduce((sum, entry) => sum + entry.pages, 0);
}

export function previousPage(bookId: string, entries: ReadingEntry[], excludeEntryId?: string) {
  return pagesRead(bookId, entries.filter((entry) => entry.id !== excludeEntryId));
}

export function progressFor(book: Book, entries: ReadingEntry[]) {
  const read = Math.min(pagesRead(book.id, entries, book.readingCycle ?? 0), book.totalPages);
  const percentage = book.totalPages > 0 ? Math.round((read / book.totalPages) * 100) : 0;
  return { read, percentage: Math.min(100, percentage) };
}

export function completionDays(book: Book, entries: ReadingEntry[]) {
  if (!book.completedAt) return null;

  const firstReading = entries
    .filter((entry) => entry.bookId === book.id)
    .map((entry) => entry.readAt)
    .sort()[0];
  const startDate = new Date(`${(firstReading ?? book.acquiredAt).slice(0, 10)}T12:00:00`);
  const endDate = new Date(`${book.completedAt.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const elapsedDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return Math.max(1, elapsedDays);
}

export function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
