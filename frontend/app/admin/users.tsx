import { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, UserPublic } from "@/src/api";
import { useAuth } from "@/src/auth";

export default function UsersAdmin() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newPwModal, setNewPwModal] = useState<{ username: string; pw: string } | null>(null);
  const [editing, setEditing] = useState<UserPublic | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [u, setU] = useState({ username: "", full_name: "", email: "", role: "servizio_civile" as "servizio_civile" | "admin" | "master", photo_b64: "" });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listUsers();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user || (user.role !== "master" && user.role !== "admin")) {
        router.replace("/(tabs)/account");
        return;
      }
      load();
    }, [load, user, router]),
  );

  const createUser = async () => {
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await api.createUser({
        username: u.username.trim(),
        full_name: u.full_name.trim(),
        email: u.email.trim() || undefined,
        role: u.role,
        photo_b64: u.photo_b64 || undefined,
      });
      setShowCreate(false);
      if (res.generated_password) {
        setNewPwModal({ username: res.user.username, pw: res.generated_password });
      }
      setU({ username: "", full_name: "", email: "", role: "servizio_civile", photo_b64: "" });
      load();
    } catch (e: any) {
      setCreateErr(e.message || "Errore");
    } finally {
      setCreating(false);
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setU((p) => ({ ...p, photo_b64: `data:image/jpeg;base64,${res.assets[0].base64}` }));
    }
  };

  const openEdit = (usr: UserPublic) => {
    setEditing(usr);
    setEditFullName(usr.full_name);
    setEditEmail(usr.email || "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await api.updateUser(editing.id, {
        full_name: editFullName.trim(),
        email: editEmail.trim() || null,
      });
      setEditing(null);
      load();
    } catch (e: any) {
      Alert.alert("Errore", e.message || "Errore aggiornamento");
    } finally {
      setSavingEdit(false);
    }
  };

  const resetPw = async (id: string, username: string) => {
    const r = await api.resetPassword(id);
    setNewPwModal({ username, pw: r.new_password });
  };

  const remove = async (id: string, name: string) => {
    Alert.alert("Conferma eliminazione", `Eliminare l'utente ${name}?`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: async () => { await api.deleteUser(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} testID="admin-users-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back-btn">
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestione Utenti</Text>
        <Pressable onPress={() => setShowCreate(true)} hitSlop={10} testID="open-create-user">
          <Ionicons name="person-add" size={22} color={COLORS.brand} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          {users.map((usr) => (
            <View key={usr.id} style={styles.userCard} testID={`user-${usr.id}`}>
              {usr.photo_b64 ? (
                <Image source={{ uri: usr.photo_b64 }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Text style={styles.avatarInit}>{usr.full_name.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{usr.full_name}</Text>
                <Text style={styles.userMeta}>
                  @{usr.username} · {usr.role === "admin" ? "Volontario" : usr.role === "master" ? "Master" : "Servizio Civile"}
                </Text>
                {usr.email ? <Text style={styles.userMeta}>{usr.email}</Text> : null}
              </View>
              <Pressable onPress={() => openEdit(usr)} hitSlop={6} testID={`edit-${usr.id}`} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color={COLORS.navy} />
              </Pressable>
              <Pressable onPress={() => resetPw(usr.id, usr.username)} hitSlop={6} testID={`reset-${usr.id}`} style={styles.actionBtn}>
                <Ionicons name="key" size={18} color={COLORS.brand} />
              </Pressable>
              <Pressable onPress={() => remove(usr.id, usr.full_name)} hitSlop={6} testID={`remove-${usr.id}`} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </Pressable>
            </View>
          ))}
          {users.length === 0 && <Text style={styles.empty}>Nessun utente. Creane uno con il pulsante in alto.</Text>}
        </ScrollView>
      )}

      {/* Create user modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuovo Utente</Text>
            {createErr ? <Text style={styles.modalErr}>{createErr}</Text> : null}

            <Pressable onPress={pickPhoto} style={styles.photoPicker} testID="pick-photo-create">
              {u.photo_b64 ? (
                <Image source={{ uri: u.photo_b64 }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={26} color={COLORS.brand} />
                  <Text style={styles.photoHint}>Aggiungi foto</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              testID="new-user-username"
              value={u.username}
              onChangeText={(v) => setU((p) => ({ ...p, username: v }))}
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Nome Completo</Text>
            <TextInput
              testID="new-user-fullname"
              value={u.full_name}
              onChangeText={(v) => setU((p) => ({ ...p, full_name: v }))}
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Email (opzionale)</Text>
            <TextInput
              testID="new-user-email"
              value={u.email}
              onChangeText={(v) => setU((p) => ({ ...p, email: v }))}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Ruolo</Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: "wrap" }}>
              <Pressable
                testID="role-sc"
                onPress={() => setU((p) => ({ ...p, role: "servizio_civile" }))}
                style={[styles.roleChip, u.role === "servizio_civile" && styles.roleChipSel]}
              >
                <Text style={[styles.roleChipText, u.role === "servizio_civile" && { color: COLORS.white }]}>
                  Servizio Civile
                </Text>
              </Pressable>
              <Pressable
                testID="role-vol"
                onPress={() => setU((p) => ({ ...p, role: "admin" }))}
                style={[styles.roleChip, u.role === "admin" && styles.roleChipSel]}
              >
                <Text style={[styles.roleChipText, u.role === "admin" && { color: COLORS.white }]}>Volontario</Text>
              </Pressable>
              {user?.role === "master" && (
                <Pressable
                  testID="role-master"
                  onPress={() => setU((p) => ({ ...p, role: "master" }))}
                  style={[styles.roleChip, u.role === "master" && styles.roleChipSel]}
                >
                  <Text style={[styles.roleChipText, u.role === "master" && { color: COLORS.white }]}>Master</Text>
                </Pressable>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Pressable onPress={() => setShowCreate(false)} style={[styles.btn, styles.btnSec]}>
                <Text style={styles.btnSecText}>Annulla</Text>
              </Pressable>
              <Pressable
                testID="submit-create-user"
                disabled={creating || !u.username || !u.full_name}
                onPress={createUser}
                style={[styles.btn, styles.btnPri, (!u.username || !u.full_name) && { opacity: 0.5 }]}
              >
                {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Crea</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit user modal */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modalCard} testID="edit-user-modal">
            <Text style={styles.modalTitle}>Modifica Utente</Text>
            <Text style={styles.fieldLabel}>Nome Completo</Text>
            <TextInput
              testID="edit-fullname"
              value={editFullName}
              onChangeText={setEditFullName}
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              testID="edit-email"
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="opzionale"
            />
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable onPress={() => setEditing(null)} style={[styles.btn, styles.btnSec]}>
                <Text style={styles.btnSecText}>Annulla</Text>
              </Pressable>
              <Pressable onPress={saveEdit} disabled={savingEdit || !editFullName.trim()} style={[styles.btn, styles.btnPri, !editFullName.trim() && { opacity: 0.5 }]} testID="save-edit-user">
                {savingEdit ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Salva</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New password modal */}
      <Modal visible={!!newPwModal} animationType="fade" transparent onRequestClose={() => setNewPwModal(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard} testID="new-password-modal">
            <Ionicons name="key" size={40} color={COLORS.brand} style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>Password Generata</Text>
            <Text style={styles.modalBody}>
              Comunica all&apos;utente <Text style={{ fontWeight: "700" }}>{newPwModal?.username}</Text> la
              password sottostante. Non sarà più visibile.
            </Text>
            <View style={styles.pwBox}>
              <Text style={styles.pwText} testID="generated-password">{newPwModal?.pw}</Text>
            </View>
            <Pressable onPress={() => setNewPwModal(null)} style={[styles.btn, styles.btnPri]} testID="close-pw-modal">
              <Text style={styles.btnPriText}>Ho preso nota</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  userName: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  userMeta: { fontSize: 12, color: COLORS.onSurfaceMuted },
  actionBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xxl },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm, textAlign: "center" },
  modalBody: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center", marginVertical: SPACING.sm, lineHeight: 19 },
  modalErr: { color: COLORS.error, marginBottom: SPACING.sm, textAlign: "center" },
  fieldLabel: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  roleChipSel: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  roleChipText: { fontWeight: "600", color: COLORS.navy, fontSize: 13 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700" },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600" },
  pwBox: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  pwText: { fontSize: 22, fontWeight: "800", color: COLORS.brand, letterSpacing: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  avatarInit: { fontSize: 16, fontWeight: "800", color: COLORS.brand },
  photoPicker: { alignSelf: "center", marginBottom: SPACING.md },
  photoPreview: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.brand },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoHint: { fontSize: 10, color: COLORS.brand, fontWeight: "600" },
});
