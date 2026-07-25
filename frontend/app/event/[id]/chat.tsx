import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Message } from "@/src/api/client";
import { useAuth } from "@/src/context/auth";
import { theme } from "@/src/theme";

function timeFmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.get<Message[]>(`/events/${id}/messages`);
        if (!cancelled) setMessages(data);
      } catch { if (!cancelled) setMessages([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [id]);

  useEffect(() => {
    if (messages.length && listRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async () => {
    const v = text.trim();
    if (!v) return;
    setSending(true);
    try {
      const m = await api.post<Message>(`/events/${id}/messages`, { text: v });
      setMessages((prev) => [...prev, m]);
      setText("");
    } catch {} finally { setSending(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="chat-back-button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Event chat</Text>
          <Text style={styles.subtitle}>{messages.length} messages</Text>
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : (
          <FlatList
            ref={listRef}
            testID="chat-messages-list"
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: theme.spacing.lg, gap: 8 }}
            renderItem={({ item }) => {
              const mine = item.user_id === user?.id;
              return (
                <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && <Text style={styles.bubbleName}>{item.user_name}</Text>}
                    <Text style={[styles.bubbleText, mine && { color: theme.colors.onBrandPrimary }]}>{item.text}</Text>
                    <Text style={[styles.bubbleTime, mine && { color: "#FFDBCE" }]}>{timeFmt(item.created_at)}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.muted} />
                <Text style={styles.emptyText}>Say hello!</Text>
                <Text style={styles.emptySub}>Start the conversation with other attendees.</Text>
              </View>
            }
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            value={text} onChangeText={setText}
            placeholder="Type a message…" placeholderTextColor={theme.colors.muted}
            style={styles.input} multiline
          />
          <TouchableOpacity
            testID="chat-send-button"
            style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}
            onPress={send} disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color={theme.colors.onBrandPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.onSurface },
  subtitle: { fontSize: 12, color: theme.colors.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: 40, gap: 6 },
  emptyText: { fontSize: 15, fontWeight: "700", color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 12, color: theme.colors.muted },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 14 },
  bubbleMine: { backgroundColor: theme.colors.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: theme.colors.surfaceSecondary, borderBottomLeftRadius: 4 },
  bubbleName: { fontSize: 11, fontWeight: "700", color: theme.colors.brand, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: theme.colors.onSurface, lineHeight: 19 },
  bubbleTime: { fontSize: 10, color: theme.colors.muted, marginTop: 4, alignSelf: "flex-end" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: theme.colors.onSurface,
    maxHeight: 100, minHeight: 40,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.brand,
    alignItems: "center", justifyContent: "center",
  },
});
