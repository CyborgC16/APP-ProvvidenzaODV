import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS } from "@/src/theme";

export default function PrivacyPolicy() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="privacy-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={styles.h1}>Informativa Privacy</Text>
        <Text style={styles.p}>
          La presente Informativa illustra le modalità di trattamento dei dati personali degli utenti che
          utilizzano l&apos;applicazione &quot;La Provvidenza ODV&quot; (di seguito &quot;App&quot;), gestita dall&apos;associazione
          di volontariato La Provvidenza ODV, con sede a Marsala (TP), Italia, affiliata ANPAS.
        </Text>

        <Text style={styles.h2}>1. Titolare del trattamento</Text>
        <Text style={styles.p}>
          Il Titolare del trattamento è La Provvidenza ODV, e-mail:{" "}
          <Text style={styles.link} onPress={() => Linking.openURL("mailto:info@laprovvidenza.org")}>
            info@laprovvidenza.org
          </Text>
          .
        </Text>

        <Text style={styles.h2}>2. Dati raccolti</Text>
        <Text style={styles.p}>
          L&apos;App raccoglie i seguenti dati:{`\n\n`}
          • <Text style={styles.b}>Dati di prenotazione ospite:</Text> nome, cognome, numero di telefono,
          email (facoltativa), indirizzo di ritiro, informazioni sul paziente (nome, cognome, peso indicativo,
          piano, presenza di ascensore), eventuali note.{`\n`}
          • <Text style={styles.b}>Dati account volontari/servizio civile:</Text> username, nome completo,
          email (opzionale), ruolo, foto profilo (opzionale), bio (opzionale), età (opzionale).{`\n`}
          • <Text style={styles.b}>Dati di utilizzo:</Text> log tecnici di autenticazione (data/ora del login).
        </Text>

        <Text style={styles.h2}>3. Finalità</Text>
        <Text style={styles.p}>
          I dati vengono trattati per: (a) gestione delle prenotazioni di trasporto sanitario; (b) organizzazione
          dei turni e delle assegnazioni interne; (c) invio delle notifiche via email relative ai servizi
          prenotati; (d) adempimenti amministrativi dell&apos;associazione.
        </Text>

        <Text style={styles.h2}>4. Base giuridica</Text>
        <Text style={styles.p}>
          Il trattamento è basato sul consenso dell&apos;interessato (art. 6, par. 1, lett. a GDPR) e
          sull&apos;esecuzione di un servizio richiesto (art. 6, par. 1, lett. b GDPR).
        </Text>

        <Text style={styles.h2}>5. Conservazione</Text>
        <Text style={styles.p}>
          I dati di prenotazione sono conservati per 12 mesi ai fini di rendicontazione. I dati degli utenti
          registrati sono conservati fino alla richiesta di cancellazione dell&apos;account.
        </Text>

        <Text style={styles.h2}>6. Diritti dell&apos;interessato</Text>
        <Text style={styles.p}>
          L&apos;utente può in ogni momento: accedere ai propri dati, richiederne la rettifica, chiedere la
          cancellazione, opporsi al trattamento, richiedere la portabilità. L&apos;account utente può essere
          eliminato autonomamente dalla schermata &quot;Impostazioni &gt; Cancella il mio account&quot;.
        </Text>

        <Text style={styles.h2}>7. Sicurezza</Text>
        <Text style={styles.p}>
          I dati sono conservati su server sicuri, con accesso limitato al personale autorizzato. Le password
          sono conservate in forma cifrata (bcrypt).
        </Text>

        <Text style={styles.h2}>8. Contatti</Text>
        <Text style={styles.p}>
          Per esercitare i tuoi diritti o richiedere ulteriori informazioni:{" "}
          <Text style={styles.link} onPress={() => Linking.openURL("mailto:info@laprovvidenza.org")}>
            info@laprovvidenza.org
          </Text>
          .
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
  b: { fontWeight: "700", color: COLORS.navy },
  link: { color: COLORS.brand, fontWeight: "600", textDecorationLine: "underline" },
  footer: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.xl, fontStyle: "italic" },
});
