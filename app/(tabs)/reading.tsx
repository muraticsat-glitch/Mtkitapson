import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BookCard, ReadingModal } from "@/app/(tabs)/index";
import { CompletedModal } from "@/components/mtkitap/completed-modal";
import { useMtkitap } from "@/components/mtkitap/data-context";
import { achievements, formatDate, previousPage, progressFor, readingLevel, readingPagesForDate, readingStreak, todayInput } from "@/components/mtkitap/helpers";
import { palette, type Achievement, type Book, type ReadingEntry } from "@/components/mtkitap/types";
import { ScreenContainer } from "@/components/screen-container";

function editNotice() {
  const message = "Kitap bilgilerini Kitaplık sekmesindeki kitap kartından düzenleyebilirsin.";
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Kitap bilgileri", message);
}

function confirmDeleteEntry(entry: ReadingEntry, onConfirm: () => void) {
  const message = `${entry.pages} sayfalık ${formatDate(entry.readAt)} okuma kaydını silmek istediğine emin misin?`;
  if (Platform.OS === "web") { if (window.confirm(message)) onConfirm(); return; }
  Alert.alert("Okuma kaydını sil", message, [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: onConfirm }]);
}

export default function ReadingScreen() {
  const { data, hydrated, addReadingEntry, updateReadingEntry, deleteReadingEntry, updateBook, deleteBook, moveBookToLibrary } = useMtkitap();
  const [readingModal, setReadingModal] = useState<Book | null>(null);
  const [completedModal, setCompletedModal] = useState<Book | null>(null);
  const [editingEntry, setEditingEntry] = useState<ReadingEntry | null>(null);
  const activeBooks = useMemo(() => data.books.filter((book) => book.shelf === "reading" && !book.completedAt), [data.books]);
  const todayRead = readingPagesForDate(data.readingEntries, todayInput());
  const totalRead = data.readingEntries.reduce((sum, entry) => sum + Math.max(0, entry.pages), 0);
  const dailyGoal = data.settings?.dailyGoal ?? 20;
  const goalProgress = Math.min(100, Math.round((todayRead / dailyGoal) * 100));
  const streak = readingStreak(data.readingEntries);
  const badges = useMemo(() => achievements(data.books, data.readingEntries), [data.books, data.readingEntries]);
  const unlockedBadges = badges.filter((badge) => badge.unlocked).length;
  const level = readingLevel(unlockedBadges);
  const previousUnlocked = useRef<Set<string> | null>(null);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  const badgeCelebrationScale = useRef(new Animated.Value(0.86)).current;
  const badgeCelebrationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hydrated) { previousUnlocked.current = null; return; }
    const unlocked = new Set(badges.filter((badge) => badge.unlocked).map((badge) => badge.id));
    if (!previousUnlocked.current) { previousUnlocked.current = unlocked; return; }
    const justUnlocked = badges.find((badge) => badge.unlocked && !previousUnlocked.current?.has(badge.id));
    previousUnlocked.current = unlocked;
    if (!justUnlocked) return;
    setNewBadge(justUnlocked);
    badgeCelebrationScale.setValue(0.86);
    badgeCelebrationOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(badgeCelebrationScale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(badgeCelebrationOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const timeout = setTimeout(() => {
      Animated.timing(badgeCelebrationOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setNewBadge(null));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [badges, badgeCelebrationOpacity, badgeCelebrationScale, hydrated]);
  const celebrationScale = useRef(new Animated.Value(0.92)).current;
  const celebrated = useRef(false);

  useEffect(() => {
    if (goalProgress >= 100 && !celebrated.current) {
      celebrated.current = true;
      Animated.sequence([Animated.spring(celebrationScale, { toValue: 1.04, useNativeDriver: true }), Animated.spring(celebrationScale, { toValue: 1, useNativeDriver: true })]).start();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else if (goalProgress < 100) {
      celebrated.current = false;
    }
  }, [celebrationScale, goalProgress]);

  return <ScreenContainer safeAreaClassName="bg-[#F5F7F8]" edges={["top", "left", "right"]}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>OKUMA MASASI</Text>
      <Text style={styles.title}>Okuyorum</Text>
      <Text style={styles.subtitle}>Şu anda devam ettiğin kitaplar burada.</Text>
      <View style={styles.summary}><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{activeBooks.length}</Text><Text style={styles.summaryLabel}>devam eden kitap</Text></View><View style={styles.divider} /><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{todayRead}</Text><Text style={styles.summaryLabel}>bugün okunan sayfa</Text></View><View style={styles.divider} /><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{totalRead}</Text><Text style={styles.summaryLabel}>geçmişten bugüne toplam</Text></View></View>
      <View style={styles.goalCard}><View style={styles.goalHeader}><View><Text style={styles.goalKicker}>BUGÜNÜN HEDEFİ</Text><Text style={styles.goalTitle}>{todayRead} / {dailyGoal} sayfa</Text></View><View style={styles.streakBadge}><Ionicons name="flame" size={16} color={palette.amber} /><Text style={styles.streakText}>{streak} gün seri</Text></View></View><View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${goalProgress}%` }]} /></View><Text style={styles.goalHint}>{goalProgress >= 100 ? "Hedef tamamlandı. Harika gidiyorsun!" : `Hedefe ${Math.max(dailyGoal - todayRead, 0)} sayfa kaldı.`}</Text></View>
      {goalProgress >= 100 ? <Animated.View style={[styles.celebration, { transform: [{ scale: celebrationScale }] }]}><View style={styles.celebrationIcon}><Ionicons name="sparkles" size={22} color={palette.amber} /></View><View style={styles.celebrationCopy}><Text style={styles.celebrationTitle}>Günlük hedef tamamlandı!</Text><Text style={styles.celebrationText}>Bugün {todayRead} sayfa okudun. Böyle devam et.</Text></View></Animated.View> : null}
      <View style={styles.badgesCard}><View style={styles.badgesHeader}><View><Text style={styles.badgesKicker}>OKUMA BAŞARILARI</Text><Text style={styles.badgesTitle}>Rozetlerin</Text></View><View style={styles.levelPill}><Ionicons name="sparkles" size={13} color={palette.amber} /><Text style={styles.levelText}>{level.title}</Text></View></View><View style={styles.badgesProgress}><View style={[styles.badgesProgressFill, { width: `${Math.min(100, Math.round((unlockedBadges / badges.length) * 100))}%` }]} /><Text style={styles.badgesCount}>{unlockedBadges}/{badges.length} rozet açıldı · {level.nextGoal ? `Sonraki seviye: ${level.nextGoal}` : "En üst seviyedesin"}</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesList}>{badges.map((badge) => <View key={badge.id} style={[styles.badge, !badge.unlocked && styles.badgeLocked]}><View style={[styles.badgeIcon, { backgroundColor: badge.unlocked ? `${badge.accent}22` : "#EEF2F4" }]}><Ionicons name={badge.icon as keyof typeof Ionicons.glyphMap} size={22} color={badge.unlocked ? badge.accent : palette.slate} /></View><Text style={styles.badgeTitle} numberOfLines={1}>{badge.title}</Text><Text style={styles.badgeDescription} numberOfLines={2}>{badge.unlocked ? badge.description : `${badge.progress}/${badge.goal} ilerleme`}</Text></View>)}</ScrollView></View>
      {newBadge ? <Animated.View style={[styles.badgeCelebration, { opacity: badgeCelebrationOpacity, transform: [{ scale: badgeCelebrationScale }] }]}><View style={[styles.badgeCelebrationIcon, { backgroundColor: `${newBadge.accent}22` }]}><Ionicons name="sparkles" size={24} color={newBadge.accent} /></View><View style={styles.badgeCelebrationCopy}><Text style={styles.badgeCelebrationKicker}>ROZET KAZANILDI</Text><Text style={styles.badgeCelebrationTitle}>{newBadge.title}</Text><Text style={styles.badgeCelebrationText}>{newBadge.description}</Text></View><Ionicons name="trophy" size={23} color={palette.amber} /></Animated.View> : null}
      {!hydrated ? <View style={styles.empty}><Text style={styles.emptyTitle}>Okuma listen hazırlanıyor…</Text></View> : activeBooks.length === 0 ? <View style={styles.empty}><Ionicons name="book-outline" size={40} color={palette.amber} /><Text style={styles.emptyTitle}>Şu anda okuduğun kitap yok</Text><Text style={styles.emptyText}>Kitaplık sekmesinden bir kitabı “Okumaya başla” diyerek buraya alabilirsin.</Text></View> : activeBooks.map((book) => <BookCard key={book.id} book={book} genres={data.genres} entries={data.readingEntries} onRead={() => setReadingModal(book)} onComplete={() => setCompletedModal(book)} onMoveToLibrary={() => moveBookToLibrary(book.id)} onEditEntry={setEditingEntry} onDeleteEntry={(entry) => confirmDeleteEntry(entry, () => deleteReadingEntry(entry.id))} onEdit={editNotice} onDelete={() => deleteBook(book.id)} />)}
    </ScrollView></KeyboardAvoidingView>
    <ReadingModal book={readingModal} currentPage={readingModal ? progressFor(readingModal, data.readingEntries).read : 0} remainingPages={readingModal ? Math.max(readingModal.totalPages - progressFor(readingModal, data.readingEntries).read, 0) : 0} onClose={() => setReadingModal(null)} onSave={(currentPage, pages, readAt) => { if (readingModal) addReadingEntry({ bookId: readingModal.id, currentPage, pages, cycle: readingModal.readingCycle ?? 0, readAt }); setReadingModal(null); }} />
    <CompletedModal book={completedModal} onClose={() => setCompletedModal(null)} onSave={(completedAt) => { if (completedModal) updateBook(completedModal.id, { completedAt }); setCompletedModal(null); }} />
    <ReadingEntryModal key={editingEntry?.id ?? "no-entry"} entry={editingEntry} previousPage={editingEntry ? previousPage(editingEntry.bookId, data.readingEntries, editingEntry.id) : 0} onClose={() => setEditingEntry(null)} onSave={(currentPage, pages, readAt) => { if (editingEntry) updateReadingEntry(editingEntry.id, { currentPage, pages, readAt }); setEditingEntry(null); }} />
  </ScreenContainer>;
}

function ReadingEntryModal({ entry, previousPage: startPage, onClose, onSave }: { entry: ReadingEntry | null; previousPage: number; onClose: () => void; onSave: (currentPage: number, pages: number, readAt: string) => void }) {
  const [pages, setPages] = useState(entry ? String(entry.currentPage ?? entry.pages) : "");
  const [readAt, setReadAt] = useState(entry?.readAt ?? "");
  if (!entry) return null;
  const save = () => { const value = Number(pages); const delta = value - startPage; if (!Number.isFinite(value) || value < 0 || !readAt.trim() || delta <= 0) { Alert.alert("Eksik bilgi", `Önceki sayfa ${startPage}. Daha ileride bir sayfa ve geçerli tarih gerekli.`); return; } onSave(Math.round(value), Math.round(delta), readAt.trim()); };
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.modalHeader}><View><Text style={styles.modalKicker}>OKUMA KAYDINI DÜZENLE</Text><Text style={styles.modalTitle}>Ulaşılan sayfa ve tarihi güncelle</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={25} color={palette.ink} /></Pressable></View><Text style={styles.label}>Bu kayıtta ulaşılan sayfa</Text><TextInput autoFocus value={pages} onChangeText={setPages} keyboardType="number-pad" style={styles.input} /><Text style={styles.label}>Okuma tarihi</Text><TextInput value={readAt} onChangeText={setReadAt} placeholder="YYYY-AA-GG" placeholderTextColor={palette.slate} style={styles.input} /><Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryText}>Kaydı güncelle</Text></Pressable></View></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 38 },
  eyebrow: { color: palette.teal, fontSize: 11, letterSpacing: 2, fontWeight: "900", marginTop: 8 },
  title: { color: palette.ink, fontSize: 34, fontWeight: "900", marginTop: 6 },
  subtitle: { color: palette.slate, fontSize: 14, marginTop: 5 },
  summary: { marginTop: 22, backgroundColor: palette.ink, borderRadius: 21, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  summaryItem: { flex: 1 },
  summaryNumber: { color: palette.white, fontSize: 28, fontWeight: "900" },
  summaryLabel: { color: "#B8C9D9", fontSize: 12, marginTop: 3 },
  divider: { width: 1, height: 42, backgroundColor: "#46627B" },
  goalCard: { marginTop: 12, backgroundColor: palette.white, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E9EEF2" },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalKicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  goalTitle: { color: palette.ink, fontSize: 19, fontWeight: "900", marginTop: 4 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.amberSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  streakText: { color: palette.inkSoft, fontSize: 11, fontWeight: "900" },
  goalTrack: { height: 9, borderRadius: 99, backgroundColor: "#E8F1F0", overflow: "hidden", marginTop: 13 },
  goalFill: { height: "100%", borderRadius: 99, backgroundColor: palette.teal },
  goalHint: { color: palette.slate, fontSize: 11, marginTop: 7 },
  celebration: { marginTop: 10, backgroundColor: palette.amberSoft, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#F8D98D" },
  celebrationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.white },
  celebrationCopy: { flex: 1 },
  celebrationTitle: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  celebrationText: { color: palette.inkSoft, fontSize: 11, marginTop: 3 },
  badgesCard: { marginTop: 14, backgroundColor: palette.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: "#E9EEF2" },
  badgesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgesKicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  badgesTitle: { color: palette.ink, fontSize: 20, fontWeight: "900", marginTop: 4 },
  badgesCount: { color: palette.slate, fontSize: 11, fontWeight: "800" },
  levelPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.ink, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  levelText: { color: palette.white, fontSize: 10, fontWeight: "900" },
  badgesProgress: { marginTop: 11 },
  badgesProgressFill: { height: 6, borderRadius: 99, backgroundColor: palette.amber, marginBottom: 6 },
  badgesList: { gap: 10, paddingTop: 13, paddingRight: 6 },
  badge: { width: 124, minHeight: 142, borderRadius: 16, padding: 11, backgroundColor: palette.paper, borderWidth: 1, borderColor: "#F0E8D2" },
  badgeLocked: { opacity: 0.62, borderColor: "#E9EEF2" },
  badgeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeTitle: { color: palette.ink, fontSize: 12, fontWeight: "900", marginTop: 10 },
  badgeDescription: { color: palette.slate, fontSize: 10, lineHeight: 14, marginTop: 4 },
  badgeCelebration: { marginTop: 10, backgroundColor: palette.ink, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: palette.ink, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  badgeCelebrationIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  badgeCelebrationCopy: { flex: 1 },
  badgeCelebrationKicker: { color: palette.amber, fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  badgeCelebrationTitle: { color: palette.white, fontSize: 16, fontWeight: "900", marginTop: 3 },
  badgeCelebrationText: { color: "#B8C9D9", fontSize: 11, marginTop: 3 },
  empty: { alignItems: "center", padding: 48 },
  emptyTitle: { color: palette.ink, fontSize: 18, fontWeight: "900", marginTop: 12, textAlign: "center" },
  emptyText: { color: palette.slate, textAlign: "center", lineHeight: 20, marginTop: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,42,67,0.32)", justifyContent: "flex-end" },
  sheet: { backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  handle: { width: 42, height: 4, backgroundColor: palette.line, borderRadius: 4, alignSelf: "center", marginBottom: 18 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  modalKicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: "900" },
  modalTitle: { color: palette.ink, fontSize: 23, fontWeight: "900", marginTop: 5 },
  label: { color: palette.inkSoft, fontSize: 12, fontWeight: "900", marginTop: 15, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, color: palette.ink, fontSize: 15 },
  primaryButton: { marginTop: 20, minHeight: 48, borderRadius: 15, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" },
  primaryText: { color: palette.white, fontWeight: "900", fontSize: 14 },
});
