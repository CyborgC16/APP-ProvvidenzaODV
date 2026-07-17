import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY, UserPublic } from "@/src/api";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_USERNAME_KEY = "biometric_username";
const BIOMETRIC_PASSWORD_KEY = "biometric_password";

type AuthContextValue = {
  user: UserPublic | null;
  loading: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (username: string, password: string) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  enableBiometric: (username: string, password: string) => Promise<boolean>;
  biometricLogin: () => Promise<UserPublic>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const refreshBiometricState = useCallback(async () => {
    if (Platform.OS === "web") {
      setBiometricAvailable(false);
      setBiometricEnabled(false);
      return;
    }

    const [hardware, enrolled, enabled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync().catch(() => false),
      LocalAuthentication.isEnrolledAsync().catch(() => false),
      storage.secureGet<boolean>(BIOMETRIC_ENABLED_KEY, false),
    ]);

    setBiometricAvailable(Boolean(hardware && enrolled));
    setBiometricEnabled(Boolean(hardware && enrolled && enabled));
  }, []);

  const refresh = useCallback(async () => {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // Il token può essere scaduto: conserviamo l'eventuale accesso biometrico,
      // così l'utente può autenticarsi senza reinserire le credenziali.
      await storage.secureRemove(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([refresh(), refreshBiometricState()]);
  }, [refresh, refreshBiometricState]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const beat = async () => {
      try {
        if (active) await api.presenceHeartbeat();
      } catch {
        // Il prossimo heartbeat riproverà automaticamente.
      }
    };
    void beat();
    const timer = setInterval(() => void beat(), 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    await storage.secureSet(TOKEN_KEY, res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const enableBiometric = useCallback(async (username: string, password: string) => {
    if (Platform.OS === "web") return false;

    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync().catch(() => false),
      LocalAuthentication.isEnrolledAsync().catch(() => false),
    ]);
    if (!hardware || !enrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Attiva l'accesso biometrico",
      cancelLabel: "Annulla",
      disableDeviceFallback: false,
    });
    if (!result.success) return false;

    const saved = await Promise.all([
      storage.secureSet(BIOMETRIC_USERNAME_KEY, username),
      storage.secureSet(BIOMETRIC_PASSWORD_KEY, password),
      storage.secureSet(BIOMETRIC_ENABLED_KEY, true),
    ]);
    const ok = saved.every(Boolean);
    setBiometricEnabled(ok);
    return ok;
  }, []);

  const biometricLogin = useCallback(async () => {
    if (!biometricAvailable || !biometricEnabled) {
      throw new Error("Accesso biometrico non disponibile");
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Accedi a La Provvidenza ODV",
      cancelLabel: "Annulla",
      disableDeviceFallback: false,
    });
    if (!result.success) throw new Error("Autenticazione biometrica annullata");

    const [username, password] = await Promise.all([
      storage.secureGet<string>(BIOMETRIC_USERNAME_KEY, ""),
      storage.secureGet<string>(BIOMETRIC_PASSWORD_KEY, ""),
    ]);
    if (!username || !password) {
      throw new Error("Credenziali biometriche non disponibili");
    }

    const res = await api.login(username, password);
    await storage.secureSet(TOKEN_KEY, res.token);
    setUser(res.user);
    return res.user;
  }, [biometricAvailable, biometricEnabled]);

  const logout = useCallback(async () => {
    await Promise.all([
      storage.secureRemove(TOKEN_KEY),
      storage.secureRemove(BIOMETRIC_USERNAME_KEY),
      storage.secureRemove(BIOMETRIC_PASSWORD_KEY),
      storage.secureRemove(BIOMETRIC_ENABLED_KEY),
    ]);
    setBiometricEnabled(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricAvailable,
        biometricEnabled,
        login,
        logout,
        refresh,
        enableBiometric,
        biometricLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
