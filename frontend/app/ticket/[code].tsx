import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Registration } from "@/src/api/client";
import { theme } from "@/src/theme";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function TicketQRScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [reg, setReg] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Registration>(`/tickets/${code}`)
      .then(setReg)
      .catch((e) => setError(e?.detail || "Failed to load ticket"))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>;
  }
  if (error || !reg) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={{ color: theme.colors.error }}>{error || "Ticket not found"}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={{ color: theme.colors.brand }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const ev = reg.event;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="ticket-back-button">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Ticket</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.eventName}>{ev?.title || "Event"}</Text>
            <Text style={styles.eventCat}>{ev?.category.toUpperCase()}</Text>
          </View>

          <View style={styles.qrBox} testID="ticket-qr-container">
            <QRCode
              value={reg.ticket_code}
              size={240}
              backgroundColor="#ffffff"
              color={theme.colors.onSurface}
            />
          </View>

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{ev ? fmtDate(ev.starts_at) : "—"}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{ev?.location || "TBA"}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Ticket ID</Text>
              <Text style={styles.metaValue}>{reg.ticket_code}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, reg.status === "checked_in" ? styles.statusOk : styles.statusPending]}>
            <Ionicons
              name={reg.status === "checked_in" ? "checkmark-circle" : "time-outline"}
              size={16}
              color={reg.status === "checked_in" ? theme.colors.success : theme.colors.brand}
            />
            <Text style={{ fontWeight: "700", color: reg.status === "checked_in" ? theme.colors.success : theme.colors.brand }}>
              {reg.status === "checked_in" ? "Checked in" : "Ready for entry"}
            </Text>
          </View>
        </View>

        <Text style={styles.footNote}>Present this QR at the entrance for scanning.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceInverse },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceInverse },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scroll: { padding: theme.spacing.lg, paddingTop: 0, alignItems: "center" },
  card: {
    width: "100%", backgroundColor: "#fff", borderRadius: theme.radius.lg,
    padding: theme.spacing.xl, alignItems: "center", gap: theme.spacing.md,
  },
  cardTop: { alignItems: "center", gap: 4 },
  eventName: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface, textAlign: "center" },
  eventCat: { color: theme.colors.brand, fontWeight: "700", fontSize: 11, letterSpacing: 0.8 },
  qrBox: {
    padding: 20, backgroundColor: "#fff", borderRadius: theme.radius.md,
    borderWidth: 2, borderColor: theme.colors.brandTertiary,
  },
  metaRow: {
    width: "100%", paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  metaLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  metaValue: { fontSize: 14, color: theme.colors.onSurface, marginTop: 3, fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill },
  statusPending: { backgroundColor: theme.colors.brandTertiary },
  statusOk: { backgroundColor: "#D1E7DA" },
  footNote: { color: "#DDD9D2", fontSize: 12, marginTop: theme.spacing.lg, textAlign: "center" },
});
