import { StyleSheet } from "react-native";

import { palette } from "./types";

export const cardDetailStyles = StyleSheet.create({
  readingLog: { marginTop: 13, borderTopWidth: 1, borderTopColor: "#EEF2F4", paddingTop: 10 },
  readingLogTitle: { color: palette.inkSoft, fontSize: 11, fontWeight: "900", marginBottom: 6 },
  readingLogRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  readingLogPages: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  readingLogDate: { color: palette.slate, fontSize: 12 },
  moreEntries: { color: palette.teal, fontSize: 11, fontWeight: "800", marginTop: 3 },
  completedPill: { marginTop: 13, borderRadius: 12, backgroundColor: palette.tealSoft, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  completedPillText: { color: palette.teal, fontSize: 12, fontWeight: "900" },
  completedButton: { marginTop: 13, borderRadius: 12, borderWidth: 1, borderColor: palette.teal, backgroundColor: palette.tealSoft, paddingHorizontal: 11, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  completedButtonText: { color: palette.teal, fontSize: 12, fontWeight: "900" },
});
