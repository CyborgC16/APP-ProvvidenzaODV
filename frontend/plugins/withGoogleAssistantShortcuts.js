const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut android:shortcutId="provvidenza_assistente" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_assistant_short" android:shortcutLongLabel="@string/shortcut_assistant_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="it.laprovvindenza.app" android:targetClass="it.laprovvindenza.app.MainActivity" android:data="laprovvidenza://assistente" />
    <categories android:name="android.shortcut.conversation" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE"><parameter-binding android:key="feature" android:value="@array/assistant_feature_synonyms" /></capability-binding>
  </shortcut>
  <shortcut android:shortcutId="provvidenza_nuovo_servizio" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_service_short" android:shortcutLongLabel="@string/shortcut_service_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="it.laprovvindenza.app" android:targetClass="it.laprovvindenza.app.MainActivity" android:data="laprovvidenza://assistente?prompt=Aggiungi%20un%20servizio" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE"><parameter-binding android:key="feature" android:value="@array/new_service_feature_synonyms" /></capability-binding>
  </shortcut>
  <shortcut android:shortcutId="provvidenza_turni" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_shift_short" android:shortcutLongLabel="@string/shortcut_shift_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="it.laprovvindenza.app" android:targetClass="it.laprovvindenza.app.MainActivity" android:data="laprovvidenza://assistente?prompt=Che%20turno%20faccio%20domani%3F" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE"><parameter-binding android:key="feature" android:value="@array/shifts_feature_synonyms" /></capability-binding>
  </shortcut>
  <capability android:name="actions.intent.OPEN_APP_FEATURE">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="it.laprovvindenza.app" android:targetClass="it.laprovvindenza.app.MainActivity"><parameter android:name="feature" android:key="feature" /></intent>
  </capability>
</shortcuts>`;

const stringItems = [
  ["shortcut_assistant_short", "Assistente"],
  ["shortcut_assistant_long", "Apri Assistente Provvidenza"],
  ["shortcut_service_short", "Nuovo servizio"],
  ["shortcut_service_long", "Crea rapidamente un servizio"],
  ["shortcut_shift_short", "Turno di domani"],
  ["shortcut_shift_long", "Chiedi il turno di domani"],
];

function withShortcutStrings(config) {
  return withStringsXml(config, (mod) => {
    mod.modResults.resources.string = mod.modResults.resources.string || [];
    for (const [name, value] of stringItems) {
      const existing = mod.modResults.resources.string.find((item) => item.$?.name === name);
      if (existing) existing._ = value;
      else mod.modResults.resources.string.push({ $: { name }, _: value });
    }
    // Arrays are written in the dangerous mod because withStringsXml only targets strings safely.
    return mod;
  });
}

function withShortcutManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    mainActivity["meta-data"] = mainActivity["meta-data"] || [];
    if (!mainActivity["meta-data"].some((item) => item.$?.["android:name"] === "android.app.shortcuts")) {
      mainActivity["meta-data"].push({
        $: {
          "android:name": "android.app.shortcuts",
          "android:resource": "@xml/shortcuts",
        },
      });
    }
    return mod;
  });
}

function withShortcutFiles(config) {
  return withDangerousMod(config, ["android", async (mod) => {
    const resDir = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res");
    const xmlDir = path.join(resDir, "xml");
    const valuesDir = path.join(resDir, "values");
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.writeFileSync(path.join(xmlDir, "shortcuts.xml"), SHORTCUTS_XML);

    const arraysPath = path.join(valuesDir, "assistant_shortcut_arrays.xml");
    fs.writeFileSync(arraysPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string-array name="assistant_feature_synonyms"><item>assistente</item><item>assistente provvidenza</item><item>chat</item></string-array>
  <string-array name="new_service_feature_synonyms"><item>nuovo servizio</item><item>crea servizio</item><item>aggiungi servizio</item><item>prenota servizio</item></string-array>
  <string-array name="shifts_feature_synonyms"><item>turni</item><item>il mio turno</item><item>turno di domani</item></string-array>
</resources>`);
    return mod;
  }]);
}

module.exports = function withGoogleAssistantShortcuts(config) {
  config = withShortcutStrings(config);
  config = withShortcutManifest(config);
  config = withShortcutFiles(config);
  return config;
};
