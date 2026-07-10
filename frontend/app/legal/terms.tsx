import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING } from "@/src/theme";

export default function Terms() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="terms-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Termini di Servizio</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={styles.h1}>Termini d&apos;Uso</Text>
        <Text style={styles.p}>
          Utilizzando l&apos;applicazione &quot;La Provvidenza ODV&quot; accetti integralmente i seguenti termini.
        </Text>

        <Text style={styles.h2}>1. Descrizione del servizio</Text>
        <Text style={styles.p}>
          L&apos;App consente ai cittadini di prenotare trasporti sanitari (ambulanza, furgone attrezzato per
          disabili) offerti gratuitamente da La Provvidenza ODV, e ai volontari e ragazzi del Servizio Civile
          di consultare i turni, i pazienti dializzati e le informazioni di servizio.
        </Text>

        <Text style={styles.h2}>2. Uso corretto</Text>
        <Text style={styles.p}>
          L&apos;utente si impegna a: (a) fornire dati veritieri nelle prenotazioni; (b) non usare l&apos;App
          per finalità diverse da quelle previste; (c) non tentare di accedere ad aree riservate senza
          autorizzazione.
        </Text>

        <Text style={styles.h2}>3. Prenotazioni</Text>
        <Text style={styles.p}>
          Le prenotazioni sono soggette a conferma da parte del centralino. In caso di emergenza chiamare
          sempre il <Text style={styles.b}>112</Text> o il <Text style={styles.b}>118</Text>.
        </Text>

        <Text style={styles.h2}>4. Account</Text>
        <Text style={styles.p}>
          Gli account volontari e servizio civile sono creati esclusivamente dagli amministratori. È vietato
          condividere le proprie credenziali. Ogni utente può eliminare il proprio account autonomamente da
          &quot;Impostazioni&quot;.
        </Text>

        <Text style={styles.h2}>5. Limitazione di responsabilità</Text>
        <Text style={styles.p}>
          Il servizio è offerto senza garanzia di disponibilità continua. L&apos;associazione non è responsabile
          per malfunzionamenti tecnici o ritardi dovuti a cause di forza maggiore.
        </Text>

        <Text style={styles.h2}>6. Modifiche</Text>
        <Text style={styles.p}>
          I presenti Termini possono essere aggiornati in ogni momento. L&apos;uso continuato dell&apos;App
          costituisce accettazione delle modifiche.
        </Text>

        <Text style={styles.h2}>7. Legge applicabile</Text>
        <Text style={styles.p}>
          I presenti Termini sono regolati dalla legge italiana. Foro competente: Marsala.
        </Text>

        <Text style={styles.footer}>Ultimo aggiornamento: Giugno 2026</Text>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  h1: { fontSize: 22, fontWeight: "800", color: COLORS.navy, marginBottom: SPACING.md },
  h2: { fontSize: 15, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  p: { fontSize: 14, lineHeight: 21, color: COLORS.onSurface },
  b: { fontWeight: "700", color: COLORS.brand },
  footer: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.xl, fontStyle: "italic" },
});
