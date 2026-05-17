"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  api, 
  setTokens, 
  clearTokens, 
  getAccessToken 
} from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "patient" | "doctor" | "admin";
  is_verified?: boolean;
  specialization?: string;
  bmdc_number?: string;
  consultation_fee?: string;
  is_available?: boolean;
  verification_status?: "pending" | "approved" | "rejected" | "suspended";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string, otp?: string, method?: "password" | "otp") => Promise<void>;
  requestLoginOtp: (email: string) => Promise<void>;
  registerPatient: (data: any) => Promise<void>;
  registerDoctor: (data: any) => Promise<void>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchFreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<{ reset_token: string }>;
  confirmPasswordReset: (email: string, resetToken: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchFreshProfile = useCallback(async () => {
    try {
      const res = await api.get("api/v1/auth/profile");
      if (res.success && res.data) {
        // If data contains nested 'user' key (doctor response has 'user' field containing basic user data)
        const profileData = res.data.user 
          ? { ...res.data.user, ...res.data, user: undefined } 
          : res.data;
        setUser(profileData);
        localStorage.setItem("user", JSON.stringify(profileData));
      }
    } catch (err) {
      console.error("Failed to load user profile", err);
      // If unauthorized, clear everything
      if (getAccessToken()) {
        clearTokens();
        setUser(null);
      }
    }
  }, []);

  // Check storage and fetch fresh profile on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const storedUser = localStorage.getItem("user");
      
      if (token) {
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore
          }
        }
        await fetchFreshProfile();
      }
      setLoading(false);
    };
    initAuth();
  }, [fetchFreshProfile]);

  // Route protection rules
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/", "/auth"];
    const isPublic = publicRoutes.includes(pathname);

    if (!user && !isPublic) {
      router.push("/auth");
    } else if (user && pathname === "/auth") {
      if (user.role === "doctor") {
        router.push("/doctor-dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password?: string, otp?: string, method: "password" | "otp" = "password") => {
    setLoading(true);
    try {
      let res;
      if (method === "password") {
        res = await api.post("api/v1/auth/login", { email, password });
      } else {
        res = await api.post("api/v1/auth/verify-login-otp", { email, otp });
      }

      if (res.success && res.data) {
        const { tokens, user: userData } = res.data;
        setTokens(tokens.access, tokens.refresh);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Fetch full profile info in background
        await fetchFreshProfile();

        if (userData.role === "doctor") {
          router.push("/doctor-dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        throw new Error(res.message || "Login failed");
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestLoginOtp = async (email: string) => {
    try {
      const res = await api.post("api/v1/auth/request-login-otp", { email });
      if (!res.success) {
        throw new Error(res.message || "Failed to send OTP");
      }
    } catch (err) {
      throw err;
    }
  };

  const registerPatient = async (data: any) => {
    try {
      const res = await api.post("api/v1/auth/register/patient", data);
      if (!res.success) {
        throw new Error(res.message || "Patient registration failed");
      }
    } catch (err) {
      throw err;
    }
  };

  const registerDoctor = async (data: any) => {
    try {
      const res = await api.post("api/v1/auth/register/doctor", data);
      if (!res.success) {
        throw new Error(res.message || "Doctor registration failed");
      }
    } catch (err) {
      throw err;
    }
  };

  const verifyRegistrationOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const res = await api.post("api/v1/auth/verify-otp", { email, otp });
      if (res.success && res.data) {
        const { tokens, user: userData } = res.data;
        setTokens(tokens.access, tokens.refresh);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        await fetchFreshProfile();

        if (userData.role === "doctor") {
          router.push("/doctor-dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        throw new Error(res.message || "Verification failed");
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        await api.post("api/v1/auth/logout", { refresh }).catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
      setLoading(false);
      router.push("/");
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const res = await api.patch("api/v1/auth/profile", data);
      if (res.success && res.data) {
        const profileData = res.data.user 
          ? { ...res.data.user, ...res.data, user: undefined } 
          : res.data;
        setUser(profileData);
        localStorage.setItem("user", JSON.stringify(profileData));
      } else {
        throw new Error(res.message || "Failed to update profile");
      }
    } catch (err) {
      throw err;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await api.post("api/v1/auth/password-reset/request", { email });
      if (!res.success) {
        throw new Error(res.message || "Failed to request password reset");
      }
    } catch (err) {
      throw err;
    }
  };

  const verifyPasswordResetOtp = async (email: string, otp: string) => {
    try {
      const res = await api.post("api/v1/auth/password-reset/verify", { email, otp });
      if (res.success && res.data) {
        return res.data; // contains reset_token
      }
      throw new Error(res.message || "Failed to verify OTP");
    } catch (err) {
      throw err;
    }
  };

  const confirmPasswordReset = async (email: string, resetToken: string, newPassword: string) => {
    try {
      const res = await api.post("api/v1/auth/password-reset/confirm", {
        email,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: newPassword
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to confirm password reset");
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        requestLoginOtp,
        registerPatient,
        registerDoctor,
        verifyRegistrationOtp,
        logout,
        updateProfile,
        fetchFreshProfile,
        requestPasswordReset,
        verifyPasswordResetOtp,
        confirmPasswordReset
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
