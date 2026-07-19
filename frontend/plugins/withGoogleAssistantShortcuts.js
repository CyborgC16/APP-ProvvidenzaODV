const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ARRAY_NAMES = new Set([
  "assistant_feature_synonyms",
  "new_service_feature_synonyms",
  "shifts_feature_synonyms",
]);

const stringItems = [
  ["shortcut_assistant_short", "Assistente"],
  ["shortcut_assistant_long", "Apri Assistente Provvidenza"],
  ["shortcut_service_short", "Nuovo servizio"],
  ["shortcut_service_long", "Crea rapidamente un servizio"],
  ["shortcut_shift_short", "Turno di domani"],
  ["shortcut_shift_long", "Chiedi il turno di domani"],
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveMainActivityClass(packageName, activityName) {
  if (!activityName || activityName === ".MainActivity") {
    return `${packageName}.MainActivity`;
  }

  if (activityName.startsWith(".")) {
    return `${packageName}${activityName}`;
  }

  if (activityName.includes(".")) {
    return activityName;
  }

  return `${packageName}.${activityName}`;
}

function buildShortcutsXml(packageName, targetClass) {
  const pkg = escapeXml(packageName);
  const activity = escapeXml(targetClass);

  return `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="provvidenza_assistente"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_assistant_short"
    android:shortcutLongLabel="@string/shortcut_assistant_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${pkg}"
      android:targetClass="${activity}"
      android:data="laprovvidenza://assistente" />
    <categories android:name="android.shortcut.conversation" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE">
      <parameter-binding
        android:key="feature"
        android:value="@array/assistant_feature_synonyms" />
    </capability-binding>
  </shortcut>

  <shortcut
    android:shortcutId="provvidenza_nuovo_servizio"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_service_short"
    android:shortcutLongLabel="@string/shortcut_service_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${pkg}"
      android:targetClass="${activity}"
      android:data="laprovvidenza://assistente?prompt=Aggiungi%20un%20servizio" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE">
      <parameter-binding
        android:key="feature"
        android:value="@array/new_service_feature_synonyms" />
    </capability-binding>
  </shortcut>

  <shortcut
    android:shortcutId="provvidenza_turni"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_shift_short"
    android:shortcutLongLabel="@string/shortcut_shift_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${pkg}"
      android:targetClass="${activity}"
      android:data="laprovvidenza://assistente?prompt=Che%20turno%20faccio%20domani%3F" />
    <capability-binding android:key="actions.intent.OPEN_APP_FEATURE">
      <parameter-binding
        android:key="feature"
        android:value="@array/shifts_feature_synonyms" />
    </capability-binding>
  </shortcut>

  <capability android:name="actions.intent.OPEN_APP_FEATURE">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${pkg}"
      android:targetClass="${activity}">
      <parameter android:name="feature" android:key="feature" />
    </intent>
  </capability>
</shortcuts>
`;
}

const ARRAYS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string-array name="assistant_feature_synonyms">
    <item>assistente</item>
    <item>assistente provvidenza</item>
    <item>chat</item>
  </string-array>

  <string-array name="new_service_feature_synonyms">
    <item>nuovo servizio</item>
    <item>crea servizio</item>
    <item>aggiungi servizio</item>
    <item>prenota servizio</item>
  </string-array>

  <string-array name="shifts_feature_synonyms">
    <item>turni</item>
    <item>il mio turno</item>
    <item>turno di domani</item>
  </string-array>
</resources>
`;

function removeShortcutArraysFromParsedResources(resources) {
  const arrays = resources["string-array"];
  if (!Array.isArray(arrays)) {
    return;
  }

  resources["string-array"] = arrays.filter(
    (item) => !ARRAY_NAMES.has(item?.$?.name)
  );

  if (resources["string-array"].length === 0) {
    delete resources["string-array"];
  }
}

function removeShortcutArraysFromXml(xml) {
  let result = xml;

  for (const name of ARRAY_NAMES) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    result = result.replace(
      new RegExp(
        `\\s*<string-array\\b[^>]*\\bname\\s*=\\s*["']${escapedName}["'][^>]*>[\\s\\S]*?<\\/string-array>\\s*`,
        "gi"
      ),
      "\n"
    );

    result = result.replace(
      new RegExp(
        `\\s*<string-array\\b[^>]*\\bname\\s*=\\s*["']${escapedName}["'][^>]*/>\\s*`,
        "gi"
      ),
      "\n"
    );
  }

  return result.replace(/\n{3,}/g, "\n\n");
}

function withShortcutStrings(config) {
  return withStringsXml(config, (mod) => {
    const resources = mod.modResults.resources;

    removeShortcutArraysFromParsedResources(resources);

    resources.string = resources.string || [];

    for (const [name, value] of stringItems) {
      const existing = resources.string.find(
        (item) => item?.$?.name === name
      );

      if (existing) {
        existing._ = value;
      } else {
        resources.string.push({
          $: { name },
          _: value,
        });
      }
    }

    return mod;
  });
}

function withShortcutManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      mod.modResults
    );

    const metadata = mainActivity["meta-data"] || [];

    mainActivity["meta-data"] = metadata.filter(
      (item) => item?.$?.["android:name"] !== "android.app.shortcuts"
    );

    mainActivity["meta-data"].push({
      $: {
        "android:name": "android.app.shortcuts",
        "android:resource": "@xml/shortcuts",
      },
    });

    return mod;
  });
}

function withShortcutFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const packageName =
        mod.modRequest.projectRoot &&
        mod.modRequest.projectRoot.length > 0
          ? mod.android?.package || config.android?.package
          : config.android?.package;

      if (!packageName) {
        throw new Error(
          "withGoogleAssistantShortcuts: android.package non configurato."
        );
      }

      const manifestPath = path.join(
        mod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "AndroidManifest.xml"
      );

      let activityName = ".MainActivity";

      if (fs.existsSync(manifestPath)) {
        const manifestText = fs.readFileSync(manifestPath, "utf8");
        const activityMatch = manifestText.match(
          /<activity\b[^>]*android:name\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<intent-filter\b[\s\S]*?android\.intent\.action\.MAIN[\s\S]*?<\/intent-filter>[\s\S]*?<\/activity>/i
        );

        if (activityMatch?.[1]) {
          activityName = activityMatch[1];
        }
      }

      const targetClass = resolveMainActivityClass(
        packageName,
        activityName
      );

      const resDir = path.join(
        mod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res"
      );
      const xmlDir = path.join(resDir, "xml");
      const valuesDir = path.join(resDir, "values");

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });

      fs.writeFileSync(
        path.join(xmlDir, "shortcuts.xml"),
        buildShortcutsXml(packageName, targetClass),
        "utf8"
      );

      fs.writeFileSync(
        path.join(valuesDir, "assistant_shortcut_arrays.xml"),
        ARRAYS_XML,
        "utf8"
      );

      const stringsPath = path.join(valuesDir, "strings.xml");

      if (fs.existsSync(stringsPath)) {
        const currentStrings = fs.readFileSync(stringsPath, "utf8");
        const cleanedStrings =
          removeShortcutArraysFromXml(currentStrings);

        if (cleanedStrings !== currentStrings) {
          fs.writeFileSync(stringsPath, cleanedStrings, "utf8");
        }
      }

      return mod;
    },
  ]);
}

module.exports = function withGoogleAssistantShortcuts(config) {
  config = withShortcutStrings(config);
  config = withShortcutManifest(config);
  config = withShortcutFiles(config);
  return config;
};
