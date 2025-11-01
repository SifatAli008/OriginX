"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAppDispatch } from "@/lib/store";
import { setUser, setLoading } from "@/lib/store/authSlice";

export default function AuthListener() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const auth = getFirebaseAuth();
    
    // If Firebase is not configured, just set user to null and stop loading
    if (!auth) {
      dispatch(setUser(null));
      dispatch(setLoading());
      return;
    }
    
    dispatch(setLoading());
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const { uid, email, displayName, photoURL } = firebaseUser;
        dispatch(setUser({ uid, email, displayName, photoURL }));
      } else {
        dispatch(setUser(null));
      }
    });
    return () => unsub();
  }, [dispatch]);
  return null;
}


