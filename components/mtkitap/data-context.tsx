import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Platform } from "react-native";

import { makeId } from "./helpers";
import type { Book, DataSnapshot, Genre, HistoryItem, MtkData, ReadingEntry, HistoryKind } from "./types";

const STORAGE_KEY = "mtkitap:data:v1";
const defaultGenres: Genre[] = [
  { id: "genre_novel", name: "Roman", color: "#F5A524" },
  { id: "genre_science", name: "Bilim", color: "#35B9A7" },
  { id: "genre_biography", name: "Biyografi", color: "#EE6C4D" },
];

const seedBooks: Book[] = [
  {
    id: "book_demo_1",
    title: "Kürk Mantolu Madonna",
    genreId: "genre_novel",
    acquiredAt: "2026-09-12",
    totalPages: 160,
    coverUri: undefined,
    shelf: "reading",
    createdAt: "2026-09-12T10:00:00.000Z",
    updatedAt: "2026-09-12T10:00:00.000Z",
  },
  {
    id: "book_demo_2",
    title: "Sapiens",
    genreId: "genre_science",
    acquiredAt: "2026-08-28",
    totalPages: 412,
    coverUri: undefined,
    shelf: "reading",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
  },
];

const seedEntries: ReadingEntry[] = [
  { id: "entry_demo_1", bookId: "book_demo_1", pages: 92, readAt: "2026-10-18", createdAt: "2026-10-18T18:30:00.000Z" },
  { id: "entry_demo_2", bookId: "book_demo_2", pages: 138, readAt: "2026-10-17", createdAt: "2026-10-17T20:10:00.000Z" },
];

const defaultSettings = { dailyGoal: 20, reminderEnabled: false, reminderHour: 20, reminderMinute: 0, reminderSound: true };
const initialData: MtkData = { books: seedBooks, genres: defaultGenres, readingEntries: seedEntries, history: [], settings: defaultSettings };

type MtkContextValue = {
  data: MtkData;
  hydrated: boolean;
  addBook: (input: Omit<Book, "id" | "createdAt" | "updatedAt">) => void;
  updateBook: (id: string, input: Partial<Omit<Book, "id" | "createdAt" | "updatedAt">>) => void;
  startReadingBook: (id: string) => void;
  rereadBook: (id: string) => void;
  moveBookToLibrary: (id: string) => void;
  restoreBookToLibrary: (id: string) => void;
  deleteBook: (id: string) => void;
  addReadingEntry: (input: Omit<ReadingEntry, "id" | "createdAt">) => void;
  updateReadingEntry: (id: string, input: Partial<Omit<ReadingEntry, "id" | "createdAt">>) => void;
  deleteReadingEntry: (id: string) => void;
  addGenre: (name: string) => void;
  updateGenre: (id: string, name: string) => void;
  deleteGenre: (id: string) => void;
  setDailyGoal: (goal: number) => void;
  setReminderSettings: (settings: Partial<MtkData["settings"]>) => void;
  restoreHistory: (id: string) => void;
  deleteHistory: (id: string) => void;
  updateHistory: (id: string, title: string, detail: string) => void;
  exportData: () => Promise<void>;
  importData: () => Promise<void>;
};

const MtkContext = createContext<MtkContextValue | null>(null);

function cloneSnapshot(data: MtkData): DataSnapshot {
  return JSON.parse(JSON.stringify({ books: data.books, genres: data.genres, readingEntries: data.readingEntries, settings: data.settings }));
}

function validData(value: unknown): value is MtkData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MtkData>;
  return Array.isArray(candidate.books) && Array.isArray(candidate.genres) && Array.isArray(candidate.readingEntries) && Array.isArray(candidate.history);
}

function dateLabel() {
  return new Date().toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export function MtkProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MtkData>(initialData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (validData(parsed)) setData({ ...parsed, settings: { ...defaultSettings, ...(parsed.settings ?? {}) }, books: parsed.books.map((book) => ({ ...book, shelf: book.completedAt ? "library" : (book.shelf ?? (parsed.readingEntries.some((entry) => entry.bookId === book.id) ? "reading" : "library")) })) });
        } catch {
          // Keep the safe initial state when storage is corrupt.
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const commit = (kind: HistoryKind, title: string, detail: string, mutate: (draft: MtkData) => void) => {
    setData((current) => {
      const draft = JSON.parse(JSON.stringify(current)) as MtkData;
      mutate(draft);
      const historyItem: HistoryItem = { id: makeId("history"), kind, title, detail: `${detail} · ${dateLabel()}`, createdAt: new Date().toISOString(), snapshot: cloneSnapshot(current) };
      draft.history = [historyItem, ...draft.history];
      return draft;
    });
  };

  const value = useMemo<MtkContextValue>(() => ({
    data,
    hydrated,
    addBook: (input) => commit("kitap", "Yeni kitap eklendi", input.title, (draft) => { draft.books = [{ ...input, shelf: "library", id: makeId("book"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...draft.books]; }),
    updateBook: (id, input) => commit("kitap", input.completedAt ? "Kitap okundu olarak işaretlendi" : "Kitap güncellendi", input.completedAt ? `${data.books.find((book) => book.id === id)?.title ?? "Kitap"} · ${input.completedAt}` : (input.title ?? "Kitap bilgileri"), (draft) => { draft.books = draft.books.map((book) => book.id === id ? { ...book, ...input, ...(input.completedAt ? { shelf: "library" as const } : {}), updatedAt: new Date().toISOString() } : book); }),
    startReadingBook: (id) => commit("kitap", "Okumaya başlandı", data.books.find((book) => book.id === id)?.title ?? "Kitap", (draft) => { draft.books = draft.books.map((book) => book.id === id ? { ...book, shelf: "reading", updatedAt: new Date().toISOString() } : book); }),
    rereadBook: (id) => commit("kitap", "Kitap tekrar okunmaya başlandı", data.books.find((book) => book.id === id)?.title ?? "Kitap", (draft) => { draft.books = draft.books.map((book) => book.id === id ? { ...book, shelf: "reading", completedAt: undefined, readingCycle: (book.readingCycle ?? 0) + 1, updatedAt: new Date().toISOString() } : book); }),
    moveBookToLibrary: (id) => commit("kitap", "Kitap okunmak üzere kitaplığa kaldırıldı", data.books.find((book) => book.id === id)?.title ?? "Kitap", (draft) => { draft.books = draft.books.map((book) => book.id === id ? { ...book, shelf: "library", updatedAt: new Date().toISOString() } : book); }),
    restoreBookToLibrary: (id) => commit("kitap", "Kitap kütüphaneye eklendi", data.books.find((book) => book.id === id)?.title ?? "Kitap", (draft) => { draft.books = draft.books.map((book) => book.id === id ? { ...book, completedAt: undefined, updatedAt: new Date().toISOString() } : book); }),
    deleteBook: (id) => commit("kitap", "Kitap silindi", data.books.find((book) => book.id === id)?.title ?? "Kitap", (draft) => { draft.books = draft.books.filter((book) => book.id !== id); draft.readingEntries = draft.readingEntries.filter((entry) => entry.bookId !== id); }),
    addReadingEntry: (input) => commit("okuma", "Okuma kaydı eklendi", `${input.pages} sayfa okundu · ${input.currentPage ?? input.pages}. sayfaya gelindi`, (draft) => { draft.readingEntries = [{ ...input, id: makeId("entry"), createdAt: new Date().toISOString() }, ...draft.readingEntries]; }),
    updateReadingEntry: (id, input) => commit("okuma", "Okuma kaydı güncellendi", `${input.pages ?? ""} sayfa okundu · ${input.currentPage ?? ""}. sayfaya gelindi`, (draft) => { draft.readingEntries = draft.readingEntries.map((entry) => entry.id === id ? { ...entry, ...input } : entry); }),
    deleteReadingEntry: (id) => commit("okuma", "Okuma kaydı silindi", "Kayıt", (draft) => { draft.readingEntries = draft.readingEntries.filter((entry) => entry.id !== id); }),
    addGenre: (name) => commit("tur", "Tür eklendi", name, (draft) => { draft.genres = [...draft.genres, { id: makeId("genre"), name, color: ["#F5A524", "#35B9A7", "#EE6C4D"][draft.genres.length % 3] }]; }),
    updateGenre: (id, name) => commit("tur", "Tür güncellendi", name, (draft) => { draft.genres = draft.genres.map((genre) => genre.id === id ? { ...genre, name } : genre); }),
    deleteGenre: (id) => commit("tur", "Tür silindi", data.genres.find((genre) => genre.id === id)?.name ?? "Tür", (draft) => { draft.genres = draft.genres.filter((genre) => genre.id !== id); }),
    setDailyGoal: (goal) => setData((current) => ({ ...current, settings: { ...current.settings, dailyGoal: Math.max(1, Math.min(9999, Math.round(goal))) } })),
    setReminderSettings: (settings) => setData((current) => ({ ...current, settings: { ...current.settings, ...settings } })),
    restoreHistory: (id) => setData((current) => { const item = current.history.find((history) => history.id === id); if (!item) return current; return { ...item.snapshot, settings: item.snapshot.settings ?? current.settings, history: [{ id: makeId("history"), kind: "geri_yukleme", title: "Geçmiş geri yüklendi", detail: `${item.title} · ${dateLabel()}`, createdAt: new Date().toISOString(), snapshot: cloneSnapshot(current) }, ...current.history] }; }),
    deleteHistory: (id) => setData((current) => ({ ...current, history: current.history.filter((item) => item.id !== id) })),
    updateHistory: (id, title, detail) => setData((current) => ({ ...current, history: current.history.map((item) => item.id === id ? { ...item, title, detail } : item) })),
    exportData: async () => {
      const json = JSON.stringify({ ...data, exportedAt: new Date().toISOString(), app: "mtkitap" }, null, 2);
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = `mtkitap-yedek-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
        return;
      }
      const uri = `${FileSystem.cacheDirectory}mtkitap-yedek-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "mtkitap yedeğini paylaş" });
      else Alert.alert("Yedek hazır", uri);
    },
    importData: async () => {
      if (Platform.OS === "web") {
        const input = document.createElement("input"); input.type = "file"; input.accept = "application/json,.json";
        input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); if (!validData(parsed)) throw new Error("Geçersiz mtkitap dosyası"); setData({ books: parsed.books, genres: parsed.genres, readingEntries: parsed.readingEntries, history: parsed.history, settings: { ...defaultSettings, ...(parsed.settings ?? {}) } }); } catch { Alert.alert("İçe aktarma başarısız", "Bu dosya geçerli bir mtkitap yedeği değil."); } };
        input.click(); return;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (result.canceled) return;
      try { const json = await FileSystem.readAsStringAsync(result.assets[0].uri); const parsed = JSON.parse(json); if (!validData(parsed)) throw new Error("Geçersiz"); setData({ books: parsed.books, genres: parsed.genres, readingEntries: parsed.readingEntries, history: parsed.history, settings: { ...defaultSettings, ...(parsed.settings ?? {}) } }); Alert.alert("Yedek yüklendi", "Kitaplığın ve geçmişin geri yüklendi."); } catch { Alert.alert("İçe aktarma başarısız", "Bu dosya geçerli bir mtkitap yedeği değil. Mevcut verilerin korunuyor."); }
    },
  }), [data, hydrated]);

  return <MtkContext.Provider value={value}>{children}</MtkContext.Provider>;
}

export function useMtkitap() {
  const context = useContext(MtkContext);
  if (!context) throw new Error("useMtkitap must be used inside MtkProvider");
  return context;
}
