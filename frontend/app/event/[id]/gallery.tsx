import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, GalleryItem } from "@/src/api/client";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

const SAMPLE_PHOTOS = [
  "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/1387174/pexels-photo-1387174.jpeg?auto=compress&cs=tinysrgb&w=940",
  "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg?auto=compress&cs=tinysrgb&w=940",
];

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState(SAMPLE_PHOTOS[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<GalleryItem[]>(`/events/${id}/gallery`);
      setItems(data);
    } catch { setItems([]); }
  }, [id]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const add = async () => {
    setBusy(true);
    try {
      await api.post(`/events/${id}/gallery`, { image: selected, caption: caption.trim() });
      setCaption("");
      await load();
    } catch {} finally { setBusy(false); }
  };

  const remove = async (itemId: string) => {
    try {
      await api.del(`/gallery/${itemId}`);
      await load();
    } catch {}
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="gallery-back-button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Gallery</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.addBox}>
          <Text style={styles.label}>Pick a photo to add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {SAMPLE_PHOTOS.map((p) => (
              <TouchableOpacity
                key={p}
                testID={`gallery-pick-${SAMPLE_PHOTOS.indexOf(p)}`}
                onPress={() => setSelected(p)}
                style={[styles.pick, selected === p && styles.pickActive]}
              >
                <Image source={p} style={{ width: 72, height: 60 }} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            testID="gallery-caption-input"
            value={caption} onChangeText={setCaption}
            placeholder="Caption (optional)" placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <TouchableOpacity
            testID="gallery-add-button"
            style={[styles.btn, busy && { opacity: 0.7 }]}
            onPress={add} disabled={busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.onBrandPrimary} /> :
              <Text style={styles.btnText}>Add to gallery</Text>}
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : (
          <FlatList
            testID="gallery-list"
            data={items} keyExtractor={(i) => i.id} numColumns={3}
            contentContainerStyle={{ padding: theme.spacing.md }}
            columnWrapperStyle={{ gap: 6 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No photos yet.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.tile}>
                <Image source={item.image} style={styles.tileImg} contentFit="cover" />
                {(item.user_id === user?.id || user?.role === "admin") && (
                  <TouchableOpacity
                    testID={`gallery-remove-${item.id}`}
                    onPress={() => remove(item.id)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
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
  addBox: {
    margin: theme.spacing.md, padding: theme.spacing.md, gap: 10,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
  },
  label: { fontSize: 11, fontWeight: "700", color: theme.colors.onSurfaceSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  pick: { borderRadius: 8, borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
  pickActive: { borderColor: theme.colors.brand },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.onSurface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  btn: { backgroundColor: theme.colors.brand, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: "center" },
  btnText: { color: theme.colors.onBrandPrimary, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 13, color: theme.colors.muted },
  tile: { flex: 1, aspectRatio: 1, borderRadius: 8, overflow: "hidden", backgroundColor: theme.colors.surfaceSecondary },
  tileImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
});
