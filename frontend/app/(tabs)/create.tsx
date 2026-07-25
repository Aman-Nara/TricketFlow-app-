import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const CATEGORIES = ["Music", "Business", "Wellness", "Arts", "Sports", "Food", "Tech", "General"];
const SAMPLE_IMAGES = [
  "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=940",
];

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Music");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("100");
  const [daysAhead, setDaysAhead] = useState("7");
  const [cover, setCover] = useState(SAMPLE_IMAGES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError("Title is required"); return; }
    setBusy(true);
    try {
      const starts = new Date();
      starts.setDate(starts.getDate() + (parseInt(daysAhead || "1", 10) || 1));
      const ev = await api.post("/events", {
        title: title.trim(),
        description: description.trim(),
        category, location: location.trim(),
        starts_at: starts.toISOString(),
        price: parseFloat(price || "0") || 0,
        capacity: parseInt(capacity || "100", 10) || 100,
        cover_image: cover,
      });
      router.replace(`/event/${ev.id}`);
    } catch (e: any) {
      setError(e?.detail || "Failed to create event");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Create event</Text>
        <Text style={styles.subtitle}>Fill in details to publish your event.</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Cover image</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {SAMPLE_IMAGES.map((img) => {
              const active = cover === img;
              return (
                <TouchableOpacity
                  key={img}
                  testID={`cover-option-${SAMPLE_IMAGES.indexOf(img)}`}
                  onPress={() => setCover(img)}
                  style={[styles.imgOpt, active && styles.imgOptActive]}
                >
                  <View style={{ width: 90, height: 60, borderRadius: 8, overflow: "hidden", backgroundColor: theme.colors.surfaceSecondary }}>
                    <ImageThumb url={img} />
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand} style={styles.imgCheck} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Field label="Title">
            <TextInput
              testID="create-title-input"
              value={title} onChangeText={setTitle} style={styles.input}
              placeholder="e.g. Sunset Jazz Night" placeholderTextColor={theme.colors.muted}
            />
          </Field>
          <Field label="Description">
            <TextInput
              testID="create-description-input"
              value={description} onChangeText={setDescription} style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              multiline placeholder="What's happening?" placeholderTextColor={theme.colors.muted}
            />
          </Field>

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <TouchableOpacity
                  key={c} onPress={() => setCategory(c)}
                  testID={`cat-chip-${c.toLowerCase()}`}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label="Location">
            <TextInput
              testID="create-location-input"
              value={location} onChangeText={setLocation} style={styles.input}
              placeholder="Venue address" placeholderTextColor={theme.colors.muted}
            />
          </Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Days ahead">
                <TextInput
                  testID="create-days-input"
                  value={daysAhead} onChangeText={setDaysAhead} keyboardType="numeric" style={styles.input}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price ($)">
                <TextInput
                  testID="create-price-input"
                  value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Capacity">
                <TextInput
                  testID="create-capacity-input"
                  value={capacity} onChangeText={setCapacity} keyboardType="numeric" style={styles.input}
                />
              </Field>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            testID="create-submit-button"
            onPress={submit} disabled={busy}
            style={[styles.primary, busy && { opacity: 0.7 }]}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Publish event</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ImageThumb({ url }: { url: string }) {
  return <Image source={url} style={{ width: "100%", height: "100%" }} contentFit="cover" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.onSurface },
  subtitle: { fontSize: 14, color: theme.colors.onSurfaceSecondary, marginTop: 4 },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  label: { color: theme.colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 8 },
  input: {
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.onSurface, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: theme.colors.onBrandPrimary },
  imgOpt: { padding: 4, borderRadius: 10, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 2, borderColor: "transparent" },
  imgOptActive: { borderColor: theme.colors.brand },
  imgCheck: { position: "absolute", top: 2, right: 2 },
  error: { color: theme.colors.error, marginTop: theme.spacing.md },
  primary: {
    marginTop: theme.spacing.xl, backgroundColor: theme.colors.brand,
    paddingVertical: 16, borderRadius: theme.radius.md, alignItems: "center",
  },
  primaryText: { color: theme.colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
});
