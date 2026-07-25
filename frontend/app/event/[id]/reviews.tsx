import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Review } from "@/src/api/client";
import { useAuth } from "@/src/context/auth";
import { theme } from "@/src/theme";

export default function ReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Review[]>(`/events/${id}/reviews`);
      setReviews(r);
      const mine = r.find((x) => x.user_id === user?.id);
      if (mine) { setRating(mine.rating); setComment(mine.comment); }
    } catch { setReviews([]); }
  }, [id, user?.id]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/events/${id}/reviews`, { rating, comment: comment.trim() });
      await load();
    } catch {} finally { setBusy(false); }
  };

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="reviews-back-button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Reviews</Text>
          <Text style={styles.subtitle}>{reviews.length ? `${avg.toFixed(1)} · ${reviews.length} reviews` : "No reviews yet"}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.writeBox}>
          <Text style={styles.label}>Your rating</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                testID={`rating-star-${n}`}
                onPress={() => setRating(n)}
              >
                <Ionicons name={n <= rating ? "star" : "star-outline"} size={30} color={theme.colors.brand} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            testID="review-comment-input"
            value={comment} onChangeText={setComment}
            placeholder="Share your experience…" placeholderTextColor={theme.colors.muted}
            style={styles.input} multiline
          />
          <TouchableOpacity
            testID="submit-review-button"
            style={[styles.btn, busy && { opacity: 0.7 }]}
            onPress={submit} disabled={busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
              <Text style={styles.btnText}>Submit review</Text>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : (
          <FlatList
            testID="reviews-list"
            data={reviews}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: theme.spacing.md, gap: 8, paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.empty}>Be the first to review this event.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{item.user_name}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name="star" size={13} color={n <= item.rating ? theme.colors.brand : theme.colors.border} />
                    ))}
                  </View>
                </View>
                {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: theme.spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: theme.colors.onSurface },
  subtitle: { fontSize: 12, color: theme.colors.muted },
  writeBox: {
    margin: theme.spacing.md, padding: theme.spacing.md, gap: 10,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
  },
  label: { fontSize: 11, fontWeight: "700", color: theme.colors.onSurfaceSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border, minHeight: 70, textAlignVertical: "top",
  },
  btn: { backgroundColor: theme.colors.brand, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: "center" },
  btnText: { color: theme.colors.onBrandPrimary, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: theme.colors.muted, textAlign: "center", padding: 30 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 14, fontWeight: "700", color: theme.colors.onSurface },
  comment: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 6, lineHeight: 19 },
});
