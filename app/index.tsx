import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, Platform } from "react-native";

import { BrandMark } from "@/components/mtkitap/brand-mark";
import { CompletedModal } from "@/components/mtkitap/completed-modal";
import { cardDetailStyles } from "@/components/mtkitap/card-details-styles";
import { useMtkitap } from "@/components/mtkitap/data-context";
import { completionDays, formatDate, progressFor, todayInput } from "@/components/mtkitap/helpers";
import { ProgressBar } from "@/components/mtkitap/progress-bar";
import { palette, type Book, type ReadingEntry } from "@/components/mtkitap/types";
import { ScreenContainer } from "@/components/screen-container";

function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") { if (window.confirm(message)) onConfirm(); return; }
  Alert.alert("Emin misin?", message, [{ text: "Vazgeç", style: "cancel" }, { text: "Devam et", style: "destructive", onPress: onConfirm }]);
}

const popularBooks = [
  { title: "Roma'nın Beş Günü", author: "Ahmet Ümit", pages: 512, rank: 1, cover: "https://img.kitapyurdu.com/v1/getImage/fn:12291630/mh:1000/wh:fd7299f1f", url: "https://www.kitapyurdu.com/kitap/romanin-bes-gunu/767268.html" },
  { title: "Vatanın Kalbi", author: "Metin Özdamarlar", pages: 192, rank: 2, cover: "https://img.kitapyurdu.com/v1/getImage/fn:12315818/mh:1000/wh:8aa945fb3", url: "https://www.kitapyurdu.com/kitap/vatanin-kalbi/763173.html" },
  { title: "Gizli Dedektifler Okulu", author: "Eyüp Hayta", pages: 160, rank: 3, cover: "https://img.kitapyurdu.com/v1/getImage/fn:12242001/mh:1000/wh:0b08cf797", url: "https://www.kitapyurdu.com/kitap/gizli-dedektifler-okulu/757375.html" },
  { title: "Algernon'a Çiçekler", author: "Daniel Keyes", pages: 325, rank: 4, cover: "https://img.kitapyurdu.com/v1/getImage/fn:1013537/mh:1000/wh:217db6962", url: "https://www.kitapyurdu.com/kitap/algernona-cicekler/363597.html" },
  { title: "Muhabbet", author: "Virginia Evans", pages: 344, rank: 5, cover: "https://img.kitapyurdu.com/v1/getImage/fn:12259308/mh:1000/wh:9c65211fb", url: "https://www.kitapyurdu.com/kitap/muhabbet/755129.html" },
  { title: "Taş Kağıt Makas", author: "Alice Feeney", pages: 305, rank: 6, cover: "https://img.kitapyurdu.com/v1/getImage/fn:11799807/mh:1000/wh:f1537f63f", url: "https://www.kitapyurdu.com/kitap/tas-kagit-makas/643859.html" },
];

type PopularBook = {
  title: string;
  author?: string;
  pages?: number;
  rank: number;
  cover?: string;
  url: string;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

async function fetchKitapyurduPopularBooks(): Promise<PopularBook[] | null> {
  try {
    const response = await fetch("https://www.kitapyurdu.com/cok-satan-kitaplar/haftalik/1.html");
    if (!response.ok) return null;
    const html = await response.text();
    const knownByUrl = new Map<string, PopularBook>(popularBooks.map((book) => [book.url, book]));
    const matches = [...html.matchAll(/href=["'](https?:\/\/www\.kitapyurdu\.com)?(\/kitap\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const result: PopularBook[] = [];
    const seen = new Set<string>();
    for (const match of matches) {
      const url = `https://www.kitapyurdu.com${match[2]}`;
      const title = stripHtml(match[3]);
      if (!title || title.length > 90 || seen.has(url) || /^(İncele|Sepete Ekle)$/i.test(title)) continue;
      seen.add(url);
      const known = knownByUrl.get(url);
      result.push({ title: known?.title ?? title, author: known?.author, pages: known?.pages, rank: result.length + 1, cover: known?.cover, url });
      if (result.length === 6) break;
    }
    return result.length >= 3 ? result : null;
  } catch {
    return null;
  }
}

export default function LibraryScreen() {
  const { data, hydrated, addBook, updateBook, deleteBook, addReadingEntry, startReadingBook, rereadBook } = useMtkitap();
  const [bookModal, setBookModal] = useState(false);
  const [readingModal, setReadingModal] = useState<Book | null>(null);
  const [completedModal, setCompletedModal] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [featuredBookId, setFeaturedBookId] = useState<string | null>(null);
  const [onlinePopularBooks, setOnlinePopularBooks] = useState<PopularBook[]>(popularBooks);
  const [lastPopularUpdate, setLastPopularUpdate] = useState<Date | null>(null);
  const featuredBookIdRef = useRef<string | null>(null);
  const libraryScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    fetchKitapyurduPopularBooks().then((books) => { if (active && books) { setOnlinePopularBooks(books); setLastPopularUpdate(new Date()); } });
    return () => { active = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    const libraryBooks = data.books.filter((book) => book.shelf !== "reading");
    if (libraryBooks.length === 0) { featuredBookIdRef.current = null; setFeaturedBookId(null); return; }
    const choices = libraryBooks.length > 1 ? libraryBooks.filter((book) => book.id !== featuredBookIdRef.current) : libraryBooks;
    const nextBookId = choices[Math.floor(Math.random() * choices.length)]?.id ?? libraryBooks[0].id;
    featuredBookIdRef.current = nextBookId;
    setFeaturedBookId(nextBookId);
  }, [data.books]));

  useFocusEffect(useCallback(() => () => {
    setSearch("");
    setGenreFilter("all");
  }, []));

  const visibleBooks = useMemo(() => data.books.filter((book) => book.shelf !== "reading").filter((book) => {
    const query = search.toLocaleLowerCase("tr").trim();
    const matchesSearch = book.title.toLocaleLowerCase("tr").includes(query) || (book.author ?? "").toLocaleLowerCase("tr").includes(query);
    return matchesSearch && (genreFilter === "all" || book.genreId === genreFilter);
  }).sort((first, second) => {
    const firstProgress = progressFor(first, data.readingEntries);
    const secondProgress = progressFor(second, data.readingEntries);
    const shelfRank = (book: Book, percentage: number) => book.completedAt ? 2 : percentage === 0 ? 0 : 1;
    const rankDifference = shelfRank(first, firstProgress.percentage) - shelfRank(second, secondProgress.percentage);
    if (rankDifference !== 0) return rankDifference;
    if (firstProgress.percentage === 0 && secondProgress.percentage === 0) return second.createdAt.localeCompare(first.createdAt);
    if (firstProgress.percentage !== secondProgress.percentage) return firstProgress.percentage - secondProgress.percentage;
    return second.updatedAt.localeCompare(first.updatedAt);
  }), [data.books, data.readingEntries, genreFilter, search]);
  const featuredBook = data.books.find((book) => book.id === featuredBookId && book.shelf !== "reading");
  const featuredProgress = featuredBook ? progressFor(featuredBook, data.readingEntries) : null;

  const openNewBook = () => { setEditingBook(null); setBookModal(true); };
  const openEditBook = (book: Book) => { setEditingBook(book); setBookModal(true); };

  return (
    <ScreenContainer safeAreaClassName="bg-[#F5F7F8]" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><ScrollView ref={libraryScrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandRow}><View style={styles.brandIcon}><BrandMark size={36} /></View><View><Text style={styles.eyebrow}>KİTAPLIĞIM</Text><Text style={styles.brand}>mtkitap</Text></View></View>
          <Pressable style={styles.addHeaderButton} onPress={openNewBook}><Ionicons name="add" size={22} color={palette.ink} /><Text style={styles.addHeaderText}>Kitap</Text></Pressable>
        </View>
        <Pressable style={styles.hero} onPress={() => { if (featuredBook) { setSearch(featuredBook.title); setTimeout(() => libraryScrollRef.current?.scrollTo({ y: 340, animated: true }), 80); } }}><View style={styles.heroCopy}><Text style={styles.heroKicker}>Bugünün sayfası</Text><Text style={styles.heroTitle} textBreakStrategy="highQuality" android_hyphenationFrequency="none">{featuredBook ? featuredBook.title : "Okumaya devam et."}</Text>{featuredBook?.author ? <Text style={styles.heroAuthor} numberOfLines={2}>{featuredBook.author}</Text> : null}<Text style={styles.heroText}>{featuredBook ? `${featuredProgress?.percentage ?? 0}% okundu · ${featuredBook.totalPages} sayfa` : `${data.books.length} kitaplık rafında kendi ritmini tut.`}</Text>{featuredBook ? <Text style={styles.heroAction}>İncele</Text> : null}</View><View style={styles.heroMark}>{featuredBook?.coverUri ? <Image source={{ uri: featuredBook.coverUri }} style={styles.heroCover} contentFit="cover" /> : <BrandMark size={74} inverse />}</View></Pressable>
        <View style={popularStyles.popularSection}><View style={popularStyles.popularHeader}><View><Text style={popularStyles.popularTitle}>İnternette çok okunanlar</Text><Text style={popularStyles.popularSource}>Kitapyurdu · Haftalık liste</Text>{lastPopularUpdate ? <Text style={popularStyles.popularUpdated}>Son güncelleme: {lastPopularUpdate.toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text> : <Text style={popularStyles.popularUpdated}>İnternetten güncel liste yükleniyor…</Text>}</View><Ionicons name="trending-up" size={21} color={palette.coral} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={popularStyles.popularList}>{onlinePopularBooks.map((item) => <Pressable key={item.url} style={popularStyles.popularCard} onPress={() => Linking.openURL(item.url)}><View style={popularStyles.popularCover}><>{item.cover ? <Image source={{ uri: item.cover }} style={popularStyles.popularCoverImage} contentFit="cover" /> : <View style={popularStyles.popularCoverPlaceholder}><BrandMark size={34} inverse /></View>}</><View style={popularStyles.popularRank}><Text style={popularStyles.popularRankText}>{item.rank}</Text></View></View><View style={popularStyles.popularInfo}><Text style={popularStyles.popularBookTitle} numberOfLines={2}>{item.title}</Text><Text style={popularStyles.popularAuthor} numberOfLines={1}>{item.author}</Text><Text style={popularStyles.popularMeta}>{item.pages ? `${item.pages} sayfa · ` : ""}Kitapyurdu’nda incele</Text></View></Pressable>)}</ScrollView></View>
        <View style={styles.searchBox}><Ionicons name="search" size={19} color={palette.slate} /><TextInput placeholder="Kitap veya yazar ara" placeholderTextColor={palette.slate} value={search} onChangeText={setSearch} style={styles.searchInput} returnKeyType="search" />{search.length > 0 ? <Pressable onPress={() => setSearch("")} hitSlop={8} style={styles.clearSearchButton}><Ionicons name="close-circle" size={20} color={palette.slate} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pressable style={[styles.filter, genreFilter === "all" && styles.filterActive]} onPress={() => setGenreFilter("all")}><Text style={[styles.filterText, genreFilter === "all" && styles.filterTextActive]}>Tümü</Text></Pressable>
          {data.genres.map((genre) => <Pressable key={genre.id} style={[styles.filter, genreFilter === genre.id && styles.filterActive]} onPress={() => setGenreFilter(genre.id)}><View style={[styles.filterDot, { backgroundColor: genre.color }]} /><Text style={[styles.filterText, genreFilter === genre.id && styles.filterTextActive]}>{genre.name}</Text></Pressable>)}
        </ScrollView>
        {!hydrated ? <View style={styles.empty}><Text style={styles.emptyTitle}>Kitaplığın hazırlanıyor…</Text></View> : visibleBooks.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Kitaplığın boş</Text><Text style={styles.emptyText}>Yeni kitap ekle veya Okuyorum sekmesinden bir kitabı okunmak üzere kitaplığa kaldır.</Text><Pressable style={styles.primaryButton} onPress={openNewBook}><Text style={styles.primaryButtonText}>Kitap ekle</Text></Pressable></View> : visibleBooks.map((book) => <BookCard key={book.id} book={book} genres={data.genres} entries={data.readingEntries} isCompleted={Boolean(book.completedAt)} readLabel={book.completedAt ? "Tekrar oku" : data.readingEntries.some((entry) => entry.bookId === book.id) ? "Okumaya devam et" : "Okumaya başla"} onRead={() => { if (book.completedAt) { rereadBook(book.id); } else startReadingBook(book.id); }} onComplete={() => setCompletedModal(book)} onEdit={() => openEditBook(book)} onDelete={() => confirmAction("Bu kitabı ve okuma kayıtlarını silmek istediğine emin misin?", () => deleteBook(book.id))} />)}
      </ScrollView></KeyboardAvoidingView>
      {bookModal ? <BookModal key={`${editingBook?.id ?? "new"}-${bookModal}`} visible={bookModal} book={editingBook} genres={data.genres} onClose={() => setBookModal(false)} onSave={(input) => { if (editingBook) updateBook(editingBook.id, input); else addBook(input); setBookModal(false); }} /> : null}
      <ReadingModal book={readingModal} currentPage={readingModal ? progressFor(readingModal, data.readingEntries).read : 0} remainingPages={readingModal ? Math.max(readingModal.totalPages - progressFor(readingModal, data.readingEntries).read, 0) : 0} onClose={() => setReadingModal(null)} onSave={(currentPage, pages, readAt) => { if (readingModal) addReadingEntry({ bookId: readingModal.id, currentPage, pages, cycle: readingModal.readingCycle ?? 0, readAt }); setReadingModal(null); }} />
      <CompletedModal book={completedModal} onClose={() => setCompletedModal(null)} onSave={(completedAt) => { if (completedModal) updateBook(completedModal.id, { completedAt }); setCompletedModal(null); }} />
    </ScreenContainer>
  );
}

export function BookCard({ book, genres, entries, isCompleted = false, readLabel = "Okuma ekle", onRead, onComplete, onMoveToLibrary, onEditEntry, onDeleteEntry, onEdit, onDelete }: { book: Book; genres: { id: string; name: string; color: string }[]; entries: ReadingEntry[]; isCompleted?: boolean; readLabel?: string; onRead: () => void; onComplete: () => void; onMoveToLibrary?: () => void; onEditEntry?: (entry: ReadingEntry) => void; onDeleteEntry?: (entry: ReadingEntry) => void; onEdit: () => void; onDelete: () => void }) {
  const genre = genres.find((item) => item.id === book.genreId);
  const progress = progressFor(book, entries);
  const bookEntries = entries.filter((entry) => entry.bookId === book.id).sort((a, b) => b.readAt.localeCompare(a.readAt));
  const lastEntry = bookEntries[0];
  const finishedInDays = completionDays(book, entries);
  return <View style={[styles.card, isCompleted && styles.finishedCard]}>
    {isCompleted ? <View style={[styles.finishedBanner, completionStyles.finishedBanner]}><View style={completionStyles.finishedBannerCopy}><Ionicons name="checkmark-circle" size={15} color={palette.teal} /><Text style={styles.finishedBannerText}>OKUNDU · KİTAPLIKTA</Text></View>{finishedInDays ? <View style={completionStyles.completionDaysBadge}><Text style={completionStyles.completionDaysNumber}>{finishedInDays}</Text><Text style={completionStyles.completionDaysLabel}>gün</Text></View> : null}</View> : null}<View style={styles.cardTop}><View style={styles.cover}>{book.coverUri ? <Image source={{ uri: book.coverUri }} style={styles.coverImage} contentFit="cover" /> : <View style={styles.coverPlaceholder}><BrandMark size={38} /><Text style={styles.coverPlaceholderText}>mtkitap</Text></View>}</View><View style={styles.cardInfo}><View style={styles.cardMetaRow}><View style={[styles.genrePill, { backgroundColor: `${genre?.color ?? palette.amber}20` }]}><View style={[styles.filterDot, { backgroundColor: genre?.color ?? palette.amber }]} /><Text style={[styles.genreText, { color: genre?.color ?? palette.ink }]}>{genre?.name ?? "Tür yok"}</Text></View><Pressable onPress={onEdit}><Ionicons name="ellipsis-horizontal" size={20} color={palette.slate} /></Pressable></View><Text style={styles.cardTitle}>{book.title}</Text>{book.author ? <Text style={styles.authorText} numberOfLines={1}>{book.author}</Text> : null}<Text style={styles.cardDetail}>{book.totalPages} sayfa · Alındı {formatDate(book.acquiredAt)}</Text><Text style={styles.cardLast}>{lastEntry ? `Son okuma: ${formatDate(lastEntry.readAt)}` : "Henüz okuma kaydı yok"}</Text>{book.rating ? <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 7 }}>{Array.from({ length: 5 }, (_, index) => <Ionicons key={index} name={index < book.rating! ? "star" : "star-outline"} size={13} color={index < book.rating! ? palette.amber : palette.line} />)}<Text style={{ color: palette.slate, fontSize: 10, marginLeft: 4 }}>{book.rating}/5</Text></View> : null}{book.note ? <Text style={{ color: palette.slate, fontSize: 11, lineHeight: 16, marginTop: 6 }} numberOfLines={2}>“{book.note}”</Text> : null}</View></View>
    <View style={styles.progressHeader}><Text style={styles.progressLabel}>{progress.read} / {book.totalPages} sayfa</Text><Text style={[styles.progressLabel, { color: progress.percentage >= 100 ? palette.teal : palette.slate }]}>{Math.max(book.totalPages - progress.read, 0)} sayfa kaldı</Text><Text style={[styles.progressPercent, progress.percentage >= 100 && styles.doneText]}>{progress.percentage}%</Text></View><ProgressBar value={progress.percentage} />
    {bookEntries.length > 0 ? <View style={cardDetailStyles.readingLog}><Text style={cardDetailStyles.readingLogTitle}>Okuma kayıtları</Text>{bookEntries.map((entry) => <View key={entry.id} style={cardDetailStyles.readingLogRow}><Text style={cardDetailStyles.readingLogPages}>{entry.pages} sayfa okundu{entry.currentPage ? ` · ${entry.currentPage}. sayfa` : ""}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={cardDetailStyles.readingLogDate}>{formatDate(entry.readAt)}</Text>{onEditEntry ? <Pressable onPress={() => onEditEntry(entry)} hitSlop={5}><Ionicons name="create-outline" size={15} color={palette.teal} /></Pressable> : null}{onDeleteEntry ? <Pressable onPress={() => onDeleteEntry(entry)} hitSlop={5}><Ionicons name="trash-outline" size={15} color={palette.coral} /></Pressable> : null}</View></View>)}</View> : null}
    {book.completedAt ? <View style={cardDetailStyles.completedPill}><Ionicons name="checkmark-circle" size={17} color={palette.teal} /><Text style={cardDetailStyles.completedPillText}>Okundu · {formatDate(book.completedAt)}</Text></View> : progress.percentage >= 100 ? <Pressable style={cardDetailStyles.completedButton} onPress={onComplete}><Ionicons name="checkmark-circle-outline" size={18} color={palette.teal} /><Text style={cardDetailStyles.completedButtonText}>Okundu olarak işaretle</Text></Pressable> : null}
    {onMoveToLibrary ? <Pressable style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.line, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }} onPress={onMoveToLibrary}><Ionicons name="archive-outline" size={16} color={palette.ink} /><Text style={{ color: palette.ink, fontSize: 12, fontWeight: "900" }}>Okunmak üzere kitaplığa kaldır</Text></Pressable> : null}
    <View style={styles.cardActions}><Pressable style={styles.readButton} onPress={onRead}><Ionicons name="book-outline" size={18} color={palette.ink} /><Text style={styles.readButtonText}>{readLabel}</Text></Pressable><Pressable style={styles.deleteButton} onPress={onDelete}><Ionicons name="trash-outline" size={18} color={palette.coral} /></Pressable></View>
  </View>;
}

type BookInput = Omit<Book, "id" | "createdAt" | "updatedAt">;
function BookModal({ visible, book, genres, onClose, onSave }: { visible: boolean; book: Book | null; genres: { id: string; name: string }[]; onClose: () => void; onSave: (input: BookInput) => void }) {
  const [title, setTitle] = useState(book?.title ?? ""); const [author, setAuthor] = useState(book?.author ?? ""); const [genreId, setGenreId] = useState(book?.genreId ?? genres[0]?.id ?? ""); const [acquiredAt, setAcquiredAt] = useState(book?.acquiredAt ?? todayInput()); const [totalPages, setTotalPages] = useState(book ? String(book.totalPages) : ""); const [coverUri, setCoverUri] = useState<string | undefined>(book?.coverUri); const [rating, setRating] = useState(book?.rating ?? 0); const [note, setNote] = useState(book?.note ?? "");
  const selectCoverResult = (result: ImagePicker.ImagePickerResult) => { if (!result.canceled) setCoverUri(result.assets[0].uri); };
  const chooseCoverFromGallery = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [3, 4], quality: 0.8 }); selectCoverResult(result); };
  const takeCoverPhoto = async () => { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { Alert.alert("Kamera izni gerekli", "Kitap kapağı çekebilmek için kamera iznine izin vermelisin."); return; } const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [3, 4], quality: 0.8 }); selectCoverResult(result); };
  const save = () => { const pages = Number(totalPages); if (!title.trim() || !genreId || !Number.isFinite(pages) || pages < 1) { Alert.alert("Eksik bilgi", "Kitap adı, tür ve geçerli sayfa sayısı gerekli."); return; } onSave({ title: title.trim(), author: author.trim() || undefined, genreId, acquiredAt, totalPages: Math.round(pages), coverUri, rating: rating || undefined, note: note.trim() || undefined }); };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetKicker}>{book ? "KİTABI DÜZENLE" : "YENİ KİTAP"}</Text><Text style={styles.sheetTitle}>{book ? "Rafını güncelle" : "Rafına bir kitap ekle"}</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={25} color={palette.ink} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Text style={styles.fieldLabel}>Kitap adı</Text><TextInput value={title} onChangeText={setTitle} placeholder="Örn. Simyacı" placeholderTextColor={palette.slate} style={styles.input} /><Text style={styles.fieldLabel}>Yazar adı</Text><TextInput value={author} onChangeText={setAuthor} placeholder="Örn. Sabahattin Ali" placeholderTextColor={palette.slate} style={styles.input} /><Text style={styles.fieldLabel}>Tür</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>{genres.map((genre) => <Pressable key={genre.id} style={[styles.modalChip, genreId === genre.id && styles.modalChipActive]} onPress={() => setGenreId(genre.id)}><Text style={[styles.modalChipText, genreId === genre.id && styles.modalChipTextActive]}>{genre.name}</Text></Pressable>)}</ScrollView><Text style={styles.fieldLabel}>Toplam sayfa</Text><TextInput value={totalPages} onChangeText={setTotalPages} placeholder="Örn. 240" placeholderTextColor={palette.slate} keyboardType="number-pad" style={styles.input} /><Text style={styles.fieldLabel}>Alınma tarihi</Text><TextInput value={acquiredAt} onChangeText={setAcquiredAt} placeholder="YYYY-AA-GG" placeholderTextColor={palette.slate} style={styles.input} /><Text style={styles.fieldLabel}>Değerlendirmen (5 yıldız)</Text><View style={{ flexDirection: "row", gap: 8, marginBottom: 3 }}>{Array.from({ length: 5 }, (_, index) => <Pressable key={index} onPress={() => setRating(index + 1)} hitSlop={6}><Ionicons name={index < rating ? "star" : "star-outline"} size={30} color={index < rating ? palette.amber : palette.line} /></Pressable>)}<Pressable onPress={() => setRating(0)} style={{ justifyContent: "center", marginLeft: 4 }}><Text style={{ color: palette.slate, fontSize: 11 }}>Temizle</Text></Pressable></View><Text style={styles.fieldLabel}>Açıklama / yorum</Text><TextInput value={note} onChangeText={setNote} placeholder="Kitapla ilgili notunu veya yorumunu yaz…" placeholderTextColor={palette.slate} style={[styles.input, { minHeight: 88, paddingTop: 13, textAlignVertical: "top" }]} multiline /><View style={styles.coverPicker}><Ionicons name="image-outline" size={22} color={palette.teal} /><View style={{ flex: 1 }}><Text style={styles.coverPickerTitle}>{coverUri ? "Kapak seçildi" : "Kapak görseli ekle"}</Text><Text style={styles.coverPickerText}>Galeriden seç veya kamerayla yeni fotoğraf çek.</Text><View style={styles.coverActions}><Pressable style={styles.coverAction} onPress={chooseCoverFromGallery}><Ionicons name="images-outline" size={16} color={palette.ink} /><Text style={styles.coverActionText}>Galeri</Text></Pressable><Pressable style={styles.coverAction} onPress={takeCoverPhoto}><Ionicons name="camera-outline" size={16} color={palette.ink} /><Text style={styles.coverActionText}>Kamera</Text></Pressable></View></View></View><Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>{book ? "Değişiklikleri kaydet" : "Kitabı ekle"}</Text></Pressable></ScrollView></View></View></KeyboardAvoidingView></Modal>;
}

export function ReadingModal({ book, currentPage, remainingPages, onClose, onSave }: { book: Book | null; currentPage: number; remainingPages: number; onClose: () => void; onSave: (currentPage: number, pages: number, readAt: string) => void }) {
  const [pageReached, setPageReached] = useState(""); const [readAt, setReadAt] = useState(todayInput());
  if (!book) return null;
  const save = () => { const value = Number(pageReached); const delta = value - currentPage; if (!Number.isFinite(value) || value < 0 || value > book.totalPages) { Alert.alert("Geçersiz sayfa", `0 ile ${book.totalPages} arasında geldiğin sayfayı gir.`); return; } if (delta <= 0) { Alert.alert("İlerleme yok", `Son kayıt ${currentPage}. sayfadaydı. Daha ileride bir sayfa gir.`); return; } onSave(Math.round(value), Math.round(delta), readAt); setPageReached(""); };
  return <Modal visible={Boolean(book)} animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetKicker}>OKUMA KAYDI</Text><Text style={styles.sheetTitle}>{book.title}</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={25} color={palette.ink} /></Pressable></View><View style={{ borderRadius: 14, backgroundColor: palette.tealSoft, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 4 }}><Text style={{ color: palette.teal, fontSize: 13, fontWeight: "900" }}>Son ulaşılan sayfa: {currentPage}</Text><Text style={{ color: palette.slate, fontSize: 11, marginTop: 3 }}>Bu kitapta {remainingPages} sayfa kaldı. Ulaştığın son sayfayı gir; günlük okuduğun sayfayı biz hesaplayalım.</Text></View><Text style={styles.fieldLabel}>Şimdi hangi sayfaya geldin?</Text><TextInput autoFocus value={pageReached} onChangeText={setPageReached} placeholder={`Örn. ${Math.min(currentPage + 20, book.totalPages)}`} placeholderTextColor={palette.slate} keyboardType="number-pad" style={styles.bigInput} /><Text style={styles.fieldLabel}>Okuma tarihi</Text><TextInput value={readAt} onChangeText={setReadAt} placeholder="YYYY-AA-GG" placeholderTextColor={palette.slate} style={styles.input} /><Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Günlük okumayı kaydet</Text></Pressable></View></View></KeyboardAvoidingView></Modal>;
}

const completionStyles = StyleSheet.create({
  finishedBanner: { justifyContent: "space-between" },
  finishedBannerCopy: { flexDirection: "row", alignItems: "center", gap: 6 },
  completionDaysBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.white, borderWidth: 1, borderColor: "#A7E5D9", alignItems: "center", justifyContent: "center" },
  completionDaysNumber: { color: palette.teal, fontSize: 14, fontWeight: "900", lineHeight: 16 },
  completionDaysLabel: { color: palette.teal, fontSize: 8, fontWeight: "900", lineHeight: 10 },
});

const popularStyles = StyleSheet.create({
  popularSection: { marginBottom: 4 },
  popularHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  popularTitle: { color: palette.ink, fontSize: 17, fontWeight: "900" },
  popularSource: { color: palette.slate, fontSize: 11, marginTop: 3 },
  popularList: { gap: 10, paddingBottom: 7 },
  popularCard: { width: 174, backgroundColor: palette.white, borderRadius: 17, borderWidth: 1, borderColor: palette.line, padding: 9 },
  popularCover: { height: 145, borderRadius: 11, overflow: "hidden", backgroundColor: palette.ink, position: "relative" },
  popularCoverImage: { width: "100%", height: "100%" },
  popularCoverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.ink },
  popularRank: { position: "absolute", left: 7, top: 7, width: 27, height: 27, borderRadius: 14, backgroundColor: palette.amber, alignItems: "center", justifyContent: "center" },
  popularRankText: { color: palette.ink, fontSize: 13, fontWeight: "900" },
  popularInfo: { paddingTop: 9 },
  popularBookTitle: { color: palette.ink, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  popularAuthor: { color: palette.inkSoft, fontSize: 11, fontWeight: "800", marginTop: 5 },
  popularMeta: { color: palette.slate, fontSize: 10, lineHeight: 14, marginTop: 6 },
});

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 10 }, brandIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" }, eyebrow: { fontSize: 10, letterSpacing: 2, color: palette.slate, fontWeight: "800" }, brand: { fontSize: 25, fontWeight: "900", color: palette.ink, letterSpacing: -1 }, addHeaderButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.amberSoft, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14 }, addHeaderText: { fontWeight: "800", color: palette.ink }, hero: { minHeight: 152, borderRadius: 26, backgroundColor: palette.ink, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden", marginBottom: 18 }, heroCopy: { flex: 1, paddingRight: 8 }, heroKicker: { color: palette.amber, fontSize: 11, letterSpacing: 1.6, fontWeight: "800", marginBottom: 8 }, heroTitle: { color: palette.white, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 }, heroAuthor: { color: "#D7E4EC", fontSize: 14, fontWeight: "800", marginTop: 5 }, heroText: { color: "#B8C9D9", fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 220 }, heroAction: { color: palette.amber, fontSize: 12, fontWeight: "900", marginTop: 8 }, heroMark: { width: 96, height: 96, borderRadius: 48, backgroundColor: palette.inkSoft, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }, heroCover: { width: "100%", height: "100%", borderRadius: 48 }, searchBox: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, color: palette.ink, fontSize: 15 }, clearSearchButton: { alignItems: "center", justifyContent: "center", paddingLeft: 4 }, filters: { gap: 8, paddingVertical: 14 }, filter: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 99, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 13, paddingVertical: 9 }, filterActive: { backgroundColor: palette.ink, borderColor: palette.ink }, filterDot: { width: 7, height: 7, borderRadius: 4 }, filterText: { color: palette.slate, fontSize: 13, fontWeight: "700" }, filterTextActive: { color: palette.white }, card: { backgroundColor: palette.white, borderRadius: 22, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: "#E9EEF2" }, finishedCard: { backgroundColor: "#F0FBF8", borderColor: "#A7E5D9" }, finishedBanner: { marginBottom: 11, borderRadius: 10, backgroundColor: palette.tealSoft, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 }, finishedBannerText: { color: palette.teal, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, cardTop: { flexDirection: "row", gap: 14 }, cover: { width: 83, height: 111, borderRadius: 14, overflow: "hidden", backgroundColor: palette.ink }, coverImage: { width: "100%", height: "100%" }, coverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 5 }, coverPlaceholderText: { color: palette.white, fontSize: 10, fontWeight: "800", marginTop: 4 }, cardInfo: { flex: 1 }, cardMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, genrePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 }, genreText: { fontSize: 11, fontWeight: "800" }, cardTitle: { color: palette.ink, fontSize: 19, fontWeight: "900", marginTop: 10, lineHeight: 23 }, authorText: { color: palette.inkSoft, fontSize: 12, fontWeight: "800", marginTop: 4 }, cardDetail: { color: palette.slate, fontSize: 12, marginTop: 7 }, cardLast: { color: palette.teal, fontSize: 11, fontWeight: "700", marginTop: 7 }, progressHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 7 }, progressLabel: { color: palette.slate, fontSize: 12, fontWeight: "700" }, progressPercent: { color: palette.ink, fontSize: 12, fontWeight: "900" }, doneText: { color: palette.teal }, cardActions: { flexDirection: "row", gap: 8, marginTop: 14 }, readButton: { flex: 1, height: 42, borderRadius: 13, backgroundColor: palette.amberSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, readButtonText: { color: palette.ink, fontWeight: "900", fontSize: 13 }, deleteButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.coralSoft, alignItems: "center", justifyContent: "center" }, empty: { alignItems: "center", padding: 40 }, emptyIcon: { fontSize: 34, color: palette.amber }, emptyTitle: { color: palette.ink, fontSize: 19, fontWeight: "900", marginTop: 10 }, emptyText: { color: palette.slate, textAlign: "center", lineHeight: 20, marginTop: 7, marginBottom: 18 }, primaryButton: { marginTop: 20, minHeight: 48, borderRadius: 15, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }, primaryButtonText: { color: palette.white, fontWeight: "900", fontSize: 14 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(16,42,67,0.32)", justifyContent: "flex-end" }, sheet: { backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: "92%" }, sheetHandle: { width: 42, height: 4, backgroundColor: palette.line, borderRadius: 4, alignSelf: "center", marginBottom: 18 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }, sheetKicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: "900" }, sheetTitle: { color: palette.ink, fontSize: 24, fontWeight: "900", marginTop: 5, maxWidth: 280 }, fieldLabel: { color: palette.inkSoft, fontSize: 12, fontWeight: "900", marginTop: 15, marginBottom: 8 }, input: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, color: palette.ink, fontSize: 15 }, bigInput: { borderWidth: 1, borderColor: palette.amber, backgroundColor: palette.amberSoft, minHeight: 76, borderRadius: 18, paddingHorizontal: 16, color: palette.ink, fontSize: 30, fontWeight: "900" }, modalChips: { gap: 8 }, modalChip: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }, modalChipActive: { borderColor: palette.ink, backgroundColor: palette.ink }, modalChipText: { color: palette.slate, fontWeight: "800" }, modalChipTextActive: { color: palette.white }, coverPicker: { marginTop: 16, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }, coverPickerTitle: { color: palette.ink, fontWeight: "900" }, coverPickerText: { color: palette.slate, fontSize: 11, marginTop: 3 }, coverActions: { flexDirection: "row", gap: 8, marginTop: 10 }, coverAction: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: palette.white }, coverActionText: { color: palette.ink, fontSize: 12, fontWeight: "800" },
});
