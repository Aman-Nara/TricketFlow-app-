import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Event, Registration, Review } from "@/src/api/client";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

function fmtLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [myReg, setMyReg] = useState<Registration | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"about" | "gallery" | "reviews">("about");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ev, tickets, revs] = await Promise.all([
        api.get<Event>(`/events/${id}`),
        api.get<Registration[]>(`/my/tickets`).catch(() => []),
        api.get<Review[]>(`/events/${id}/reviews`).catch(() => []),
      ]);
      setEvent(ev);
      setMyReg(tickets.find((t) => t.event_id === id) || null);
      setReviews(revs);
    } catch (e) {
      setEvent(null);
    }
  }, [id]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const doRegister = async () => {
    setBusy(true);
    try {
      const reg = await api.post<Registration>(`/events/${id}/register`);
      setMyReg(reg);
      router.push(`/ticket/${reg.ticket_code}`);
    } catch (e: any) {
      // fallback if alert unavailable
      // eslint-disable-next-line no-console
      console.warn(e?.detail || "Failed to register");
    } finally { setBusy(false); }
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      await api.del(`/events/${id}/register`);
      setMyReg(null);
      await load();
    } catch {} finally { setBusy(false); }
  };

  if (loading) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator color={theme.colors.brand} size="large" />
      </View>
    );
  }
  if (!event) {
    return (
      <SafeAreaView style={styles.centerFull} edges={["top"]}>
        <Text>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={{ color: theme.colors.brand }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const isOwner = user?.id === event.organizer_id || user?.role === "admin";

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} bounces>
        <View style={styles.hero}>
          <Image source={event.cover_image} style={StyleSheet.absoluteFill as any} contentFit="cover" />
          <LinearGradient colors={["rgba(28,27,26,0.4)", "transparent", "rgba(28,27,26,0.9)"]} style={StyleSheet.absoluteFill as any} />
          <SafeAreaView edges={["top"]} style={styles.heroBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="event-back-button">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </SafeAreaView>
          <View style={styles.heroFooter}>
            <Text style={styles.heroCat}>{event.category.toUpperCase()}</Text>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="#F5D3C8" />
              <Text style={styles.heroMeta}>{fmtLong(event.starts_at)}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={14} color="#F5D3C8" />
              <Text style={styles.heroMeta}>{event.location || "TBA"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.statsRow}>
            <Stat icon="people-outline" label="Registered" value={`${event.registered_count}/${event.capacity}`} />
            <Stat icon="pricetag-outline" label="Price" value={event.price > 0 ? `$${event.price.toFixed(2)}` : "Free"} />
            <Stat icon="star" label="Rating" value={reviews.length ? `${avg.toFixed(1)} (${reviews.length})` : "—"} />
          </View>

          <View style={styles.tabRow}>
            {(["about", "gallery", "reviews"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                testID={`tab-${t}`}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t[0].toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "about" && (
            <View>
              <Text style={styles.description}>{event.description || "No description provided."}</Text>
              <View style={styles.organizerBox}>
                <View style={styles.orgAvatar}>
                  <Text style={styles.orgAvatarText}>{(event.organizer_name || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgLabel}>Organized by</Text>
                  <Text style={styles.orgName}>{event.organizer_name}</Text>
                </View>
              </View>
              <TouchableOpacity
                testID="open-chat-button"
                style={styles.linkRow}
                onPress={() => router.push(`/event/${event.id}/chat`)}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.brand} />
                <Text style={styles.linkText}>Open event chat</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  testID="scan-tickets-button"
                  style={styles.linkRow}
                  onPress={() => router.push(`/event/${event.id}/scan`)}
                >
                  <Ionicons name="scan-outline" size={20} color={theme.colors.brand} />
                  <Text style={styles.linkText}>Manage attendees</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {tab === "gallery" && (
            <GalleryInline eventId={event.id} />
          )}

          {tab === "reviews" && (
            <ReviewsInline eventId={event.id} reviews={reviews} onChange={load} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 12 }]}>
        {myReg ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              testID="view-ticket-button"
              style={styles.primaryCta}
              onPress={() => router.push(`/ticket/${myReg.ticket_code}`)}
            >
              <Ionicons name="qr-code" size={18} color={theme.colors.onBrandPrimary} />
              <Text style={styles.primaryCtaText}>View QR ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cancel-registration-button"
              style={styles.secondaryCta}
              onPress={doCancel} disabled={busy}
            >
              <Text style={styles.secondaryCtaText}>{busy ? "…" : "Cancel"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            testID="register-button"
            style={[styles.primaryCta, busy && { opacity: 0.7 }]}
            onPress={doRegister} disabled={busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
              <>
                <Ionicons name="ticket" size={18} color={theme.colors.onBrandPrimary} />
                <Text style={styles.primaryCtaText}>
                  {event.price > 0 ? `Register · $${event.price.toFixed(2)}` : "Register free"}
                </Text>
              </>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={theme.colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---- inline gallery + reviews components ----

function GalleryInline({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/events/${eventId}/gallery`).then(setItems).catch(() => setItems([]));
  }, [eventId]);

  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <TouchableOpacity testID="open-gallery-button" onPress={() => router.push(`/event/${eventId}/gallery`)}>
          <Text style={{ color: theme.colors.brand, fontWeight: "700" }}>Manage</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <Text style={styles.emptyInline}>No photos yet. Be the first to add one.</Text>
      ) : (
        <View style={styles.grid}>
          {items.slice(0, 6).map((g) => (
            <Image key={g.id} source={g.image} style={styles.gridItem} contentFit="cover" />
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewsInline({ eventId, reviews, onChange }: { eventId: string; reviews: Review[]; onChange: () => void }) {
  const router = useRouter();
  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <TouchableOpacity testID="write-review-button" onPress={() => router.push(`/event/${eventId}/reviews`)}>
          <Text style={{ color: theme.colors.brand, fontWeight: "700" }}>Write a review</Text>
        </TouchableOpacity>
      </View>
      {reviews.length === 0 ? (
        <Text style={styles.emptyInline}>No reviews yet.</Text>
      ) : reviews.slice(0, 5).map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.reviewName}>{r.user_name}</Text>
            <View style={{ flexDirection: "row" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons key={n} name="star" size={12} color={n <= r.rating ? theme.colors.brand : theme.colors.border} />
              ))}
            </View>
          </View>
          {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  centerFull: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  hero: { height: 320, backgroundColor: theme.colors.surfaceSecondary },
  heroBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", padding: theme.spacing.md },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  heroFooter: { position: "absolute", left: 20, right: 20, bottom: 20 },
  heroCat: { color: theme.colors.brandTertiary, fontWeight: "700", fontSize: 12, letterSpacing: 1, marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "700", lineHeight: 32, marginBottom: 8 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  heroMeta: { color: "#F5D3C8", fontSize: 13 },

  body: { padding: theme.spacing.lg },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: theme.spacing.lg },
  stat: {
    flex: 1, alignItems: "center", padding: 14,
    backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.md, gap: 4,
  },
  statValue: { fontSize: 15, fontWeight: "700", color: theme.colors.onSurface },
  statLabel: { fontSize: 11, color: theme.colors.brand, fontWeight: "600", letterSpacing: 0.4 },

  tabRow: {
    flexDirection: "row", backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.pill, padding: 4, marginBottom: theme.spacing.lg,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: theme.radius.pill },
  tabActive: { backgroundColor: theme.colors.surface, ...theme.shadow.card },
  tabText: { color: theme.colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: theme.colors.onSurface },

  description: { fontSize: 15, color: theme.colors.onSurface, lineHeight: 23 },
  organizerBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginTop: theme.spacing.lg, padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
  },
  orgAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  orgAvatarText: { color: theme.colors.onBrandPrimary, fontWeight: "700", fontSize: 18 },
  orgLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  orgName: { fontSize: 15, color: theme.colors.onSurface, fontWeight: "700" },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginTop: theme.spacing.md, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  linkText: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.colors.onSurface },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.onSurface, marginBottom: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  emptyInline: { color: theme.colors.muted, fontSize: 13, paddingVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: "32%", aspectRatio: 1, borderRadius: 8, backgroundColor: theme.colors.surfaceSecondary },
  reviewCard: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: 8 },
  reviewName: { fontSize: 14, fontWeight: "700", color: theme.colors.onSurface },
  reviewText: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 4 },

  stickyCta: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: theme.colors.surface, padding: theme.spacing.lg,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  primaryCta: {
    flex: 1, backgroundColor: theme.colors.brand, borderRadius: theme.radius.md,
    paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryCtaText: { color: theme.colors.onBrandPrimary, fontWeight: "700", fontSize: 15 },
  secondaryCta: {
    paddingHorizontal: 18, paddingVertical: 15, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  secondaryCtaText: { color: theme.colors.error, fontWeight: "700", fontSize: 14 },
});
