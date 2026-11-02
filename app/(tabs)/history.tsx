import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandMark } from "@/components/mtkitap/brand-mark";
import { useMtkitap } from "@/components/mtkitap/data-context";
import { formatDate, progressFor, recentDailyReading, recentWeeklyReading, readingPagesByDate } from "@/components/mtkitap/helpers";
import { palette, type Book, type ReadingEntry } from "@/components/mtkitap/types";
import { ScreenContainer } from "@/components/screen-container";

const kindLabel: Record<string, string> = { kitap: "Kitap", okuma: "Okuma", tur: "Tür", geri_yukleme: "Geri yükleme" };
const kindColor: Record<string, string> = { kitap: palette.amber, okuma: palette.teal, tur: palette.coral, geri_yukleme: palette.ink };

function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") { if (window.confirm(message)) onConfirm(); return; }
  Alert.alert("Emin misin?", message, [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: onConfirm }]);
}

export default function HistoryScreen() {
  const { data, restoreHistory, deleteHistory, updateHistory, restoreBookToLibrary } = useMtkitap();
  const [editing, setEditing] = useState<{ id: string; title: string; detail: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const completedBooks = data.books.filter((book) => Boolean(book.completedAt)).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const dailyReading = readingPagesByDate(data.readingEntries);
  const dailyStats = recentDailyReading(data.readingEntries);
  const weeklyStats = recentWeeklyReading(data.readingEntries);

  return (
    <ScreenContainer safeAreaClassName="bg-[#F5F7F8]">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>KAYIT DEFTERİ</Text>
        <Text style={styles.title}>Geçmiş</Text>
        <Text style={styles.subtitle}>Okuma kayıtların ve tamamladığın kitaplar burada.</Text>
        <View style={styles.summary}>
          <View><Text style={styles.summaryNumber}>{data.history.length}</Text><Text style={styles.summaryLabel}>işlem kaydı</Text></View>
          <View style={styles.summaryDivider} />
          <View><Text style={styles.summaryNumber}>{completedBooks.length}</Text><Text style={styles.summaryLabel}>okunan kitap</Text></View>
        </View>

        <View style={styles.statsSection}><View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>OKUMA İSTATİSTİKLERİ</Text><Text style={styles.sectionTitle}>Ritmini gör</Text></View><Ionicons name="stats-chart" size={24} color={palette.teal} /></View><StatsChart title="Son 7 gün" data={dailyStats} /><StatsChart title="Son 8 hafta" data={weeklyStats} /></View>

        {completedBooks.length > 0 ? <View style={styles.completedSection}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>TAMAMLANANLAR</Text><Text style={styles.sectionTitle}>Okunan kitaplar</Text></View><Ionicons name="checkmark-done-circle" size={25} color={palette.teal} /></View>
          {completedBooks.map((book) => <CompletedBookCard key={book.id} book={book} genres={data.genres} entries={data.readingEntries} onRestore={() => restoreBookToLibrary(book.id)} />)}
        </View> : null}

        {completedBooks.length > 0 ? <Pressable style={{ marginTop: 14, minHeight: 44, borderRadius: 14, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}><Ionicons name="chevron-down" size={18} color={palette.teal} /><Text style={{ color: palette.teal, fontSize: 12, fontWeight: "900" }}>Okuma geçmişine git</Text></Pressable> : null}

        {dailyReading.length > 0 ? <View style={styles.dailySection}><View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>OKUMA GÜNLÜĞÜ</Text><Text style={styles.sectionTitle}>Günlük toplamlar</Text></View><Ionicons name="bar-chart-outline" size={24} color={palette.teal} /></View>{dailyReading.map((item) => <View key={item.date} style={styles.dailyRow}><View><Text style={styles.dailyDate}>{formatDate(item.date)}</Text><Text style={styles.dailyCaption}>o gün toplam okuma</Text></View><Text style={styles.dailyPages}>{item.pages} <Text style={styles.dailyUnit}>sayfa</Text></Text></View>)}</View> : null}

        <View style={styles.historyHeading}><Text style={styles.sectionKicker}>ZAMAN AKIŞI</Text><Text style={styles.sectionTitle}>Tüm değişiklikler</Text></View>
        {data.history.length === 0 ? <View style={styles.empty}><Ionicons name="time-outline" size={34} color={palette.amber} /><Text style={styles.emptyTitle}>{completedBooks.length ? "Henüz işlem kaydı yok" : "Henüz bir geçmiş kaydı yok"}</Text><Text style={styles.emptyText}>Kitap eklediğinde veya okuma ilerlettiğinde burada göreceksin.</Text></View> : data.history.map((item) => <View key={item.id} style={styles.item}><View style={[styles.dot, { backgroundColor: kindColor[item.kind] ?? palette.amber }]} /><View style={styles.itemBody}><View style={styles.itemTop}><Text style={styles.itemKind}>{kindLabel[item.kind] ?? "Kayıt"}</Text><Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text></View><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemDetail}>{item.detail}</Text><View style={styles.actions}><Pressable onPress={() => restoreHistory(item.id)} style={styles.action}><Ionicons name="return-down-back-outline" size={16} color={palette.teal} /><Text style={styles.actionText}>Geri yükle</Text></Pressable><Pressable onPress={() => setEditing({ id: item.id, title: item.title, detail: item.detail })} style={styles.action}><Ionicons name="create-outline" size={16} color={palette.ink} /><Text style={styles.actionText}>Düzenle</Text></Pressable><Pressable onPress={() => confirmAction("Bu geçmiş kaydı silinsin mi?", () => deleteHistory(item.id))} style={styles.action}><Ionicons name="trash-outline" size={16} color={palette.coral} /><Text style={[styles.actionText, { color: palette.coral }]}>Sil</Text></Pressable></View></View></View>)}
      </ScrollView></KeyboardAvoidingView>
      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Geçmiş kaydını düzenle</Text><Text style={styles.label}>Başlık</Text><TextInput value={editing?.title} onChangeText={(title) => setEditing((value) => value ? { ...value, title } : value)} style={styles.input} /><Text style={styles.label}>Açıklama</Text><TextInput value={editing?.detail} onChangeText={(detail) => setEditing((value) => value ? { ...value, detail } : value)} style={[styles.input, { minHeight: 80 }]} multiline /><Pressable style={styles.primaryButton} onPress={() => { if (editing) updateHistory(editing.id, editing.title, editing.detail); setEditing(null); }}><Text style={styles.primaryText}>Kaydet</Text></Pressable></View></View></KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function CompletedBookCard({ book, genres, entries, onRestore }: { book: Book; genres: { id: string; name: string }[]; entries: ReadingEntry[]; onRestore: () => void }) {
  const progress = progressFor(book, entries);
  const genre = genres.find((item) => item.id === book.genreId);
  return <View style={styles.completedCard}><View style={styles.completedCover}>{book.coverUri ? <Image source={{ uri: book.coverUri }} style={styles.coverImage} contentFit="cover" /> : <View style={styles.coverPlaceholder}><BrandMark size={33} /><Text style={styles.coverLabel}>mtkitap</Text></View>}</View><View style={styles.completedCopy}><View style={styles.readBadge}><Ionicons name="checkmark" size={13} color={palette.teal} /><Text style={styles.readBadgeText}>OKUNDU</Text></View><Text style={styles.completedTitle}>{book.title}</Text>{book.author ? <Text style={styles.completedMeta}>{book.author}</Text> : null}<Text style={styles.completedMeta}>{genre?.name ?? "Tür yok"} · Alındı {formatDate(book.acquiredAt)}</Text><Text style={styles.completedMeta}>{progress.read} / {book.totalPages} sayfa</Text>{book.rating ? <View style={{ flexDirection: "row", gap: 2, marginTop: 5 }}>{Array.from({ length: 5 }, (_, index) => <Ionicons key={index} name={index < book.rating! ? "star" : "star-outline"} size={12} color={index < book.rating! ? palette.amber : palette.line} />)}</View> : null}{book.note ? <Text style={styles.completedMeta} numberOfLines={2}>“{book.note}”</Text> : null}<Text style={styles.completedDate}>Okundu: {formatDate(book.completedAt ?? "")}</Text><Pressable onPress={onRestore} style={{ marginTop: 9, alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 }}><Ionicons name="book-outline" size={14} color={palette.ink} /><Text style={{ color: palette.ink, fontSize: 11, fontWeight: "900" }}>Kütüphaneye ekle</Text></Pressable></View></View>;
}

function StatsChart({ title, data }: { title: string; data: { date: string; label: string; pages: number }[] }) {
  const maximum = Math.max(...data.map((item) => item.pages), 1);
  return <View style={styles.chartCard}><Text style={styles.chartTitle}>{title}</Text><View style={styles.chartBars}>{data.map((item) => <View key={item.date} style={styles.chartColumn}><Text style={styles.chartValue}>{item.pages > 0 ? item.pages : ""}</Text><View style={styles.barTrack}><View style={[styles.barFill, { height: `${Math.max(item.pages > 0 ? (item.pages / maximum) * 100 : 2, 2)}%` }]} /></View><Text style={styles.chartLabel}>{item.label}</Text></View>)}</View><Text style={styles.chartHint}>Okunan sayfa</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: palette.teal, fontSize: 11, letterSpacing: 2, fontWeight: "900", marginTop: 8 },
  title: { color: palette.ink, fontSize: 34, fontWeight: "900", marginTop: 6 },
  subtitle: { color: palette.slate, fontSize: 14, marginTop: 5 },
  summary: { marginTop: 22, backgroundColor: palette.ink, borderRadius: 21, padding: 18, flexDirection: "row", alignItems: "center", gap: 22 },
  summaryNumber: { color: palette.white, fontSize: 28, fontWeight: "900" }, summaryLabel: { color: "#B8C9D9", fontSize: 12, marginTop: 3 }, summaryDivider: { width: 1, height: 42, backgroundColor: "#46627B" },
  statsSection: { marginTop: 25 }, chartCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: "#E9EEF2", padding: 15, marginTop: 10 }, chartTitle: { color: palette.ink, fontSize: 14, fontWeight: "900" }, chartBars: { height: 145, flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 12 }, chartColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" }, chartValue: { color: palette.teal, fontSize: 9, fontWeight: "900", height: 14 }, barTrack: { width: "100%", maxWidth: 25, height: 105, borderRadius: 8, justifyContent: "flex-end", backgroundColor: "#EAF5F3", overflow: "hidden" }, barFill: { width: "100%", borderRadius: 8, backgroundColor: palette.teal }, chartLabel: { color: palette.slate, fontSize: 9, marginTop: 7 }, chartHint: { color: palette.slate, fontSize: 10, marginTop: 8 }, completedSection: { marginTop: 24 }, dailySection: { marginTop: 25 }, historyHeading: { marginTop: 25 }, sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, sectionKicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.6, fontWeight: "900" }, sectionTitle: { color: palette.ink, fontSize: 20, fontWeight: "900", marginTop: 3 }, dailyRow: { backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: "#E9EEF2", paddingHorizontal: 15, paddingVertical: 12, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dailyDate: { color: palette.ink, fontSize: 14, fontWeight: "900" }, dailyCaption: { color: palette.slate, fontSize: 11, marginTop: 3 }, dailyPages: { color: palette.teal, fontSize: 20, fontWeight: "900" }, dailyUnit: { fontSize: 11, fontWeight: "800" },
  completedCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: "#E9EEF2", padding: 13, flexDirection: "row", gap: 12, marginTop: 10 }, completedCover: { width: 61, height: 79, borderRadius: 11, overflow: "hidden", backgroundColor: palette.ink }, coverImage: { width: "100%", height: "100%" }, coverPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" }, coverLabel: { color: palette.white, fontSize: 8, fontWeight: "900", marginTop: 3 }, completedCopy: { flex: 1 }, readBadge: { alignSelf: "flex-start", backgroundColor: palette.tealSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }, readBadgeText: { color: palette.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, completedTitle: { color: palette.ink, fontSize: 16, fontWeight: "900", marginTop: 6 }, completedMeta: { color: palette.slate, fontSize: 11, marginTop: 5 }, completedDate: { color: palette.teal, fontSize: 11, fontWeight: "800", marginTop: 4 },
  item: { flexDirection: "row", gap: 12, backgroundColor: palette.white, borderRadius: 18, padding: 15, marginTop: 12, borderWidth: 1, borderColor: "#E9EEF2" }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 }, itemBody: { flex: 1 }, itemTop: { flexDirection: "row", justifyContent: "space-between" }, itemKind: { color: palette.slate, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }, itemDate: { color: palette.slate, fontSize: 11 }, itemTitle: { color: palette.ink, fontSize: 16, fontWeight: "900", marginTop: 8 }, itemDetail: { color: palette.slate, fontSize: 12, lineHeight: 18, marginTop: 4 }, actions: { flexDirection: "row", gap: 14, marginTop: 13 }, action: { flexDirection: "row", alignItems: "center", gap: 4 }, actionText: { color: palette.ink, fontSize: 11, fontWeight: "900" }, empty: { alignItems: "center", padding: 45 }, emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "900", marginTop: 12 }, emptyText: { color: palette.slate, textAlign: "center", lineHeight: 19, marginTop: 6 }, modalBackdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(16,42,67,0.35)" }, modal: { backgroundColor: palette.paper, borderRadius: 24, padding: 20 }, modalTitle: { color: palette.ink, fontSize: 20, fontWeight: "900", marginBottom: 12 }, label: { color: palette.inkSoft, fontSize: 12, fontWeight: "900", marginTop: 10, marginBottom: 6 }, input: { borderWidth: 1, borderColor: palette.line, borderRadius: 13, padding: 12, color: palette.ink, backgroundColor: palette.white }, primaryButton: { marginTop: 18, minHeight: 48, borderRadius: 14, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" }, primaryText: { color: palette.white, fontWeight: "900" },
});
