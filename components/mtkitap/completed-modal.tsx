import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { formatDate, todayInput } from "./helpers";
import { palette, type Book } from "./types";

type CompletedModalProps = {
  book: Book | null;
  onClose: () => void;
  onSave: (completedAt: string) => void;
};

export function CompletedModal({ book, onClose, onSave }: CompletedModalProps) {
  const [completedAt, setCompletedAt] = useState(todayInput());
  if (!book) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.icon}><Ionicons name="checkmark-circle" size={26} color={palette.teal} /></View>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={palette.ink} /></Pressable>
          </View>
          <Text style={styles.kicker}>KİTAP TAMAMLANDI</Text>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.text}>Bu kitabı Geçmiş sekmesinde okundu olarak göstermek için bitirdiğin tarihi gir.</Text>
          <Text style={styles.label}>Okundu tarihi</Text>
          <TextInput value={completedAt} onChangeText={setCompletedAt} placeholder="YYYY-AA-GG" placeholderTextColor={palette.slate} style={styles.input} />
          <Text style={styles.hint}>Örnek: {formatDate(todayInput())}</Text>
          <Pressable style={styles.button} onPress={() => onSave(completedAt)}><Ionicons name="archive-outline" size={18} color={palette.white} /><Text style={styles.buttonText}>Okundu olarak kaydet</Text></Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,42,67,0.34)" },
  sheet: { backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  handle: { width: 42, height: 4, borderRadius: 4, backgroundColor: palette.line, alignSelf: "center", marginBottom: 17 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  icon: { width: 50, height: 50, borderRadius: 16, backgroundColor: palette.tealSoft, alignItems: "center", justifyContent: "center" },
  kicker: { color: palette.teal, fontSize: 10, letterSpacing: 1.6, fontWeight: "900", marginTop: 16 },
  title: { color: palette.ink, fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 5 },
  text: { color: palette.slate, fontSize: 13, lineHeight: 20, marginTop: 7 },
  label: { color: palette.inkSoft, fontSize: 12, fontWeight: "900", marginTop: 20, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: palette.teal, borderRadius: 15, backgroundColor: palette.white, paddingHorizontal: 14, color: palette.ink, fontSize: 16, fontWeight: "700" },
  hint: { color: palette.slate, fontSize: 11, marginTop: 6 },
  button: { minHeight: 50, marginTop: 20, borderRadius: 15, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { color: palette.white, fontWeight: "900" },
});
