import { useEffect } from "react";
import { Redirect, router } from "expo-router";
import { auth } from "./config/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Index() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(tabs)");
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
} 