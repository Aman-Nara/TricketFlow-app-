import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Event, Registration } from "@/src/api/client";
import { theme } from "@/src/theme";

export default function ScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const ev = await api.get<Event>(`/events/${id}`);
      setEvent(ev);
    } catch {}
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const checkin = async () => {
    setResult(null);
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await api.post<Registration>(`/tickets/${code.trim()}/checkin`);
      setResult({ ok: true, message: `Checked in! Ticket ${r.ticket_code.slice(0, 8)}…` });
      setRegs((prev) => [r, ...prev.filter((x) => x.ticket_code !== r.ticket_code)]);
      setCode("");
    } catch (e: any) {
      setResult({ ok: false, message: e?.detail || "Invalid ticket" });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="scan-back-button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{event?.title || ""}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.box}>
          <Text style={styles.label}>Enter ticket code</Text>
          <TextInput
            testID="scan-code-input"
            value={code} onChangeText={setCode}
            placeholder="Paste ticket code" placeholderTextColor={theme.colors.muted}
            style={styles.input} autoCapitalize="none" autoCorrect={false}
          />
          <TouchableOpacity
            testID="scan-checkin-button"
            onPress={checkin} disabled={busy || !code.trim()}
            style={[styles.btn, (busy || !code.trim()) && { opacity: 0.7 }]}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
              <Text style={styles.btnText}>Check in</Text>}
          </TouchableOpacity>
          {result && (
            <View style={[styles.result, result.ok ? styles.resultOk : styles.resultErr]}>
              <Ionicons name={result.ok ? "checkmark-circle" : "close-circle"} size={18} color={result.ok ? theme.colors.success : theme.colors.error} />
              <Text style={{ color: result.ok ? theme.colors.success : theme.colors.error, fontWeight: "700" }}>{result.message}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Recent check-ins</Text>
        {regs.length === 0 ? (
          <Text style={{ color: theme.colors.muted, padding: 12 }}>No check-ins yet.</Text>
        ) : regs.map((r) => (
          <View key={r.ticket_code} style={styles.regRow}>
            <Ionicons name="checkmark-done-circle" size={22} color={theme.colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.regCode}>{r.ticket_code.slice(0, 12)}…</Text>
              <Text style={styles.regTime}>{new Date(r.created_at).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface },
  subtitle: { fontSize: 12, color: theme.colors.muted },
  box: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: 10 },
  label: { fontSize: 11, fontWeight: "700", color: theme.colors.onSurfaceSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  btn: { backgroundColor: theme.colors.brand, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: "center" },
  btnText: { color: theme.colors.onBrandPrimary, fontWeight: "700" },
  result: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: theme.radius.md },
  resultOk: { backgroundColor: "#D1E7DA" },
  resultErr: { backgroundColor: "#F8D7DA" },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: theme.colors.onSurfaceSecondary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  regRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, marginBottom: 6 },
  regCode: { fontSize: 14, fontWeight: "600", color: theme.colors.onSurface },
  regTime: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
});
