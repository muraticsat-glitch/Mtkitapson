export type Genre = {
  id: string;
  name: string;
  color: string;
};

export type Book = {
  id: string;
  title: string;
  author?: string;
  genreId: string;
  acquiredAt: string;
  totalPages: number;
  coverUri?: string;
  rating?: number;
  note?: string;
  shelf?: "library" | "reading";
  completedAt?: string;
  readingCycle?: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadingEntry = {
  id: string;
  bookId: string;
  pages: number;
  currentPage?: number;
  cycle?: number;
  readAt: string;
  createdAt: string;
};

export type MtkSettings = {
  dailyGoal: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  reminderSound: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  unlocked: boolean;
  progress: number;
  goal: number;
};

export type DataSnapshot = {
  books: Book[];
  genres: Genre[];
  readingEntries: ReadingEntry[];
  settings: MtkSettings;
};

export type HistoryKind =
  | "kitap"
  | "okuma"
  | "tur"
  | "geri_yukleme";

export type HistoryItem = {
  id: string;
  kind: HistoryKind;
  title: string;
  detail: string;
  createdAt: string;
  snapshot: DataSnapshot;
};

export type MtkData = DataSnapshot & {
  history: HistoryItem[];
};

export const palette = {
  ink: "#102A43",
  inkSoft: "#243B53",
  mist: "#F5F7F8",
  paper: "#FFFDF8",
  amber: "#F5A524",
  amberSoft: "#FFF1C9",
  teal: "#35B9A7",
  tealSoft: "#DDF5F0",
  coral: "#EE6C4D",
  coralSoft: "#FDE8E2",
  slate: "#627D98",
  line: "#D9E2EC",
  white: "#FFFFFF",
};
