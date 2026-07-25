import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Event } from "@/src/api/client";
import { useAuth } from "@/src/context/auth";
import { theme } from "@/src/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    if (user.role === "organizer" || user.role === "admin") {
      try {
        const data = await api.get<Event[]>("/my/events");
        setMyEvents(data);
      } catch { setMyEvents([]); }
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name} testID="profile-name">{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {user?.role === "admin" && (
          <TouchableOpacity
            testID="admin-dashboard-link"
            style={styles.tile}
            onPress={() => router.push("/admin")}
          >
            <Ionicons name="analytics-outline" size={22} color={theme.colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>Admin dashboard</Text>
              <Text style={styles.tileSub}>Metrics, users, events</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        )}

        {(user?.role === "organizer" || user?.role === "admin") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Events</Text>
            {myEvents.length === 0 ? (
              <Text style={styles.empty}>You haven&apos;t created events yet.</Text>
            ) : myEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                testID={`organizer-event-${e.id}`}
                style={styles.eventRow}
                onPress={() => router.push(`/event/${e.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventMeta}>{e.registered_count}/{e.capacity} registered · {e.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity testID="logout-button" style={styles.logout} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: { alignItems: "center", padding: theme.spacing.xl },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: theme.colors.onBrandPrimary, fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface },
  email: { fontSize: 14, color: theme.colors.onSurfaceSecondary, marginTop: 2 },
  rolePill: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.pill },
  roleText: { color: theme.colors.brand, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  tile: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, padding: theme.spacing.lg,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  tileTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.onSurface },
  tileSub: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 2 },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionTitle: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  empty: { fontSize: 13, color: theme.colors.muted, padding: 12 },
  eventRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, marginBottom: 8,
  },
  eventTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.onSurface },
  eventMeta: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 2 },
  logout: {
    flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center",
    paddingVertical: 14, backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  logoutText: { color: theme.colors.error, fontWeight: "700", fontSize: 15 },
});
