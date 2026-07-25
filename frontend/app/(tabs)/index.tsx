import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ScrollView, ActivityIndicator, TextInput,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Event } from "@/src/api/client";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

const CATEGORIES = ["All", "Music", "Business", "Wellness", "Arts", "Sports", "Food", "Tech"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const params: string[] = [];
      if (category !== "All") params.push(`category=${encodeURIComponent(category)}`);
      if (query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const data = await api.get<Event[]>(`/events${qs}`);
      setEvents(data);
    } catch (e) {
      setEvents([]);
    }
  }, [category, query]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const featured = events[0];
  const rest = events.slice(1);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hello, {user?.name?.split(" ")[0] || "there"}</Text>
          <Text style={styles.title}>Discover events</Text>
        </View>
        <TouchableOpacity
          testID="header-notifications-button"
          onPress={() => router.push("/(tabs)/notifications")}
          style={styles.bell}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <TextInput
          testID="search-events-input"
          placeholder="Search events…"
          placeholderTextColor={theme.colors.muted}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <View style={{ height: 56 }}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                testID={`category-chip-${c.toLowerCase()}`}
                onPress={() => setCategory(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.brand} size="large" /></View>
      ) : (
        <FlatList
          testID="events-list"
          data={rest}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={featured ? <FeaturedCard event={featured} onPress={() => router.push(`/event/${featured.id}`)} /> : null}
          ListEmptyComponent={
            !featured ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.muted} />
                <Text style={styles.emptyText}>No events found</Text>
                <Text style={styles.emptySub}>Try adjusting filters or check back soon.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
          )}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        />
      )}
    </SafeAreaView>
  );
}

function FeaturedCard({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <TouchableOpacity testID={`featured-event-${event.id}`} activeOpacity={0.9} onPress={onPress} style={styles.featured}>
      <Image source={event.cover_image} style={StyleSheet.absoluteFill as any} contentFit="cover" />
      <LinearGradient colors={["transparent", "rgba(28,27,26,0.9)"]} style={StyleSheet.absoluteFill as any} />
      <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>Featured</Text></View>
      <View style={styles.featuredFooter}>
        <Text style={styles.featuredCat}>{event.category.toUpperCase()}</Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.featuredMeta}>
          <Ionicons name="calendar-outline" size={14} color="#fff" />
          <Text style={styles.featuredMetaText}>{formatDate(event.starts_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <TouchableOpacity testID={`event-card-${event.id}`} activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <Image source={event.cover_image} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardCat}>{event.category.toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.cardMetaRow}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.muted} />
          <Text style={styles.cardMeta}>{formatDate(event.starts_at)}</Text>
        </View>
        <View style={styles.cardMetaRow}>
          <Ionicons name="location-outline" size={13} color={theme.colors.muted} />
          <Text style={styles.cardMeta} numberOfLines={1}>{event.location || "TBA"}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            {event.price > 0 ? `$${event.price.toFixed(2)}` : "Free"}
          </Text>
          <Text style={styles.cardCount}>{event.registered_count}/{event.capacity} going</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
  },
  hello: { fontSize: 13, color: theme.colors.onSurfaceSecondary },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.onSurface, marginTop: 2 },
  bell: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm,
    paddingHorizontal: 14, backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: theme.colors.onSurface, fontSize: 15 },
  chipRow: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, gap: 8, alignItems: "center" },
  chip: {
    flexShrink: 0, height: 36, paddingHorizontal: 16, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.onSurface, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: theme.colors.onBrandPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 13, color: theme.colors.muted },
  featured: {
    height: 260, borderRadius: theme.radius.lg, overflow: "hidden",
    marginBottom: theme.spacing.lg, backgroundColor: theme.colors.surfaceSecondary,
  },
  featuredBadge: {
    position: "absolute", top: 14, left: 14, backgroundColor: theme.colors.brand,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.radius.pill,
  },
  featuredBadgeText: { color: theme.colors.onBrandPrimary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  featuredFooter: { position: "absolute", left: 16, right: 16, bottom: 16 },
  featuredCat: { color: theme.colors.brandTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  featuredTitle: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 28 },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  featuredMetaText: { color: "#F5D3C8", fontSize: 13 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border,
    overflow: "hidden", ...theme.shadow.card,
  },
  cardImage: { width: "100%", height: 170 },
  cardBody: { padding: theme.spacing.lg, gap: 6 },
  cardCat: { color: theme.colors.brand, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  cardTitle: { color: theme.colors.onSurface, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMeta: { color: theme.colors.onSurfaceSecondary, fontSize: 13, flex: 1 },
  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  cardPrice: { color: theme.colors.onSurface, fontWeight: "700", fontSize: 16 },
  cardCount: { color: theme.colors.onSurfaceSecondary, fontSize: 12 },
});
