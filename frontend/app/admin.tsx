import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, AdminStats, User } from "@/src/api/client";
import { useAuth } from "@/src/context/auth";
import { theme } from "@/src/theme";

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([
        api.get<AdminStats>("/admin/stats"),
        api.get<User[]>("/admin/users"),
      ]);
      setStats(s); setUsers(u);
    } catch { setStats(null); setUsers([]); }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const remove = async (id: string) => {
    try { await api.del(`/admin/users/${id}`); await load(); } catch {}
  };

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={styles.centerFull} edges={["top"]}>
        <Text>Admin access only</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={{ color: theme.colors.brand }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="admin-back-button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Admin dashboard</Text>
          <Text style={styles.subtitle}>Overview and management</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        >
          <View style={styles.grid}>
            <Metric icon="people" label="Users" value={stats?.total_users ?? 0} />
            <Metric icon="megaphone" label="Organizers" value={stats?.total_organizers ?? 0} />
            <Metric icon="calendar" label="Events" value={stats?.total_events ?? 0} />
            <Metric icon="ticket" label="Tickets sold" value={stats?.total_registrations ?? 0} />
            <Metric icon="star" label="Reviews" value={stats?.total_reviews ?? 0} />
            <Metric icon="cash" label="Revenue" value={`$${(stats?.total_revenue ?? 0).toFixed(2)}`} />
          </View>

          <Text style={styles.sectionTitle}>Recent events</Text>
          {(stats?.recent_events || []).map((e) => (
            <TouchableOpacity
              key={e.id}
              testID={`admin-event-${e.id}`}
              style={styles.row}
              onPress={() => router.push(`/event/${e.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{e.title}</Text>
                <Text style={styles.rowSub}>{e.category} · {e.registered_count}/{e.capacity} · by {e.organizer_name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>All users</Text>
          {users.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{u.name}</Text>
                <Text style={styles.rowSub}>{u.email} · {u.role}</Text>
              </View>
              {u.id !== user?.id && (
                <TouchableOpacity
                  testID={`admin-delete-user-${u.id}`}
                  onPress={() => remove(u.id)}
                  style={styles.delBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({ icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={theme.colors.brand} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  centerFull: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface },
  subtitle: { fontSize: 12, color: theme.colors.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: theme.spacing.lg },
  metric: {
    width: "48%", padding: theme.spacing.md, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brandTertiary, gap: 4,
  },
  metricValue: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface },
  metricLabel: { fontSize: 12, color: theme.colors.brand, fontWeight: "600", letterSpacing: 0.4 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: theme.colors.onSurfaceSecondary, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md, marginBottom: 6,
  },
  rowTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.onSurface },
  rowSub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  userAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: theme.colors.onBrandPrimary, fontWeight: "700" },
  delBtn: { padding: 8, borderRadius: 8, backgroundColor: "#F8D7DA" },
});
