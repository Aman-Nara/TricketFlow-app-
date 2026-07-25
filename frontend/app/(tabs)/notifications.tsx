import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Notification } from "@/src/api/client";
import { theme } from "@/src/theme";

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>("/notifications");
      setItems(data);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const markAll = async () => { try { await api.post("/notifications/read-all"); await load(); } catch {} };

  const onPress = async (n: Notification) => {
    if (!n.read) { try { await api.post(`/notifications/${n.id}/read`); } catch {} }
    if (n.event_id) router.push(`/event/${n.event_id}`);
    load();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {items.some((i) => !i.read) && (
          <TouchableOpacity testID="mark-all-read-button" onPress={markAll} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : (
        <FlatList
          testID="notifications-list"
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.muted} />
              <Text style={styles.emptyText}>You&apos;re all caught up</Text>
              <Text style={styles.emptySub}>New activity for your events will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`notification-${item.id}`}
              onPress={() => onPress(item)}
              style={[styles.card, !item.read && styles.cardUnread]}
            >
              <View style={[styles.dot, item.read && { backgroundColor: theme.colors.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.onSurface },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.pill },
  headerBtnText: { fontSize: 13, color: theme.colors.brand, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 13, color: theme.colors.muted, textAlign: "center" },
  card: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: theme.colors.surface, padding: theme.spacing.lg,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardUnread: { backgroundColor: theme.colors.brandTertiary, borderColor: theme.colors.brandTertiary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.brand, marginTop: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.onSurface },
  cardBody: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 3 },
  cardTime: { fontSize: 11, color: theme.colors.muted, marginTop: 6 },
});
