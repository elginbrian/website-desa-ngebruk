"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, getUserProfile, UserProfile } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);

      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || "",
              name: user.displayName || user.email?.split('@')[0] || "Pengguna",
              role: "pending",
              createdAt: new Date(),
            };
            
            try {
              const { setDoc, doc } = await import("firebase/firestore");
              const { db } = await import("@/lib/firebase");
              await setDoc(doc(db, "users", user.uid), newProfile);
            } catch (firestoreError) {
              console.error("Error saving new profile to Firestore:", firestoreError);
            }
            
            setProfile(newProfile);
          }
        } catch (error) {
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || user.email?.split('@')[0] || "Pengguna",
            role: "pending",
            createdAt: new Date(),
          };
          setProfile(fallbackProfile);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted]);

  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (error) {}
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

