import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Registration } from "@/src/api/client";
import { theme } from "@/src/theme";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function TicketsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Registration[]>("/my/tickets");
      setItems(data);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : (
        <FlatList
          testID="tickets-list"
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={48} color={theme.colors.muted} />
              <Text style={styles.emptyText}>No tickets yet</Text>
              <Text style={styles.emptySub}>Register for an event to see your QR ticket here.</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)")} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Discover events</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const ev = item.event;
            if (!ev) return null;
            return (
              <TouchableOpacity
                testID={`ticket-card-${item.ticket_code}`}
                style={styles.card}
                onPress={() => router.push(`/ticket/${item.ticket_code}`)}
              >
                <Image source={ev.cover_image} style={styles.cardImage} contentFit="cover" />
                <View style={styles.cardBody}>
                  <Text style={styles.cardCat}>{ev.category.toUpperCase()}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{ev.title}</Text>
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={13} color={theme.colors.muted} />
                    <Text style={styles.meta}>{fmtDate(ev.starts_at)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={13} color={theme.colors.muted} />
                    <Text style={styles.meta} numberOfLines={1}>{ev.location || "TBA"}</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusPill, item.status === "checked_in" && styles.statusOk]}>
                      <Text style={[styles.statusText, item.status === "checked_in" && styles.statusTextOk]}>
                        {item.status === "checked_in" ? "Checked in" : "Confirmed"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="qr-code" size={20} color={theme.colors.brand} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 13, color: theme.colors.muted, textAlign: "center" },
  emptyBtn: { marginTop: 16, backgroundColor: theme.colors.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: theme.radius.pill },
  emptyBtnText: { color: theme.colors.onBrandPrimary, fontWeight: "700" },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border,
    overflow: "hidden", ...theme.shadow.card,
  },
  cardImage: { width: "100%", height: 140 },
  cardBody: { padding: theme.spacing.lg, gap: 6 },
  cardCat: { color: theme.colors.brand, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  cardTitle: { color: theme.colors.onSurface, fontSize: 17, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { color: theme.colors.onSurfaceSecondary, fontSize: 13, flex: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: theme.spacing.sm },
  statusPill: { backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
  statusText: { color: theme.colors.brand, fontWeight: "700", fontSize: 11 },
  statusOk: { backgroundColor: "#D1E7DA" },
  statusTextOk: { color: theme.colors.success },
});
