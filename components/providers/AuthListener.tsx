"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAppDispatch } from "@/lib/store";
import { setUser, setLoading } from "@/lib/store/authSlice";
import { getUserDocument, createOrUpdateUserDocument, updateLastLogin } from "@/lib/firebase/firestore";
import type { ExtendedAuthUser } from "@/lib/types/user";

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
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { uid, email, displayName, photoURL } = firebaseUser;
        
        try {
          // Fetch user document from Firestore
          let userDoc = await getUserDocument(uid);
          
          // If user document doesn't exist, create it
          if (!userDoc) {
            // Check if this is the admin user
            const isAdmin = email === "admin@originx.com";
            await createOrUpdateUserDocument(uid, {
              email: email || "",
              displayName: displayName || (isAdmin ? "Admin" : null),
              photoURL: photoURL,
              role: isAdmin ? "admin" : "sme", // Admin role for admin email, default to sme
              status: isAdmin ? "active" : "pending", // Admin is always active, others pending until company registration
              mfaEnabled: false,
            });
            userDoc = await getUserDocument(uid);
          } else {
            // Update last login
            await updateLastLogin(uid);
          }
          
          if (userDoc) {
            const extendedUser: ExtendedAuthUser = {
              uid,
              email,
              displayName,
              photoURL,
              role: userDoc.role,
              orgId: userDoc.orgId,
              orgName: userDoc.orgName,
              mfaEnabled: userDoc.mfaEnabled,
              status: userDoc.status,
            };
            dispatch(setUser(extendedUser));
          } else {
            // Fallback to basic user data if Firestore fails - but keep status as pending for new users
            dispatch(setUser({
              uid,
              email,
              displayName,
              photoURL,
              role: "sme",
              orgId: null,
              mfaEnabled: false,
              status: "pending", // New users should be pending until they register company
            }));
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          // Fallback to basic user data - but keep status as pending for new users
          dispatch(setUser({
            uid,
            email,
            displayName,
            photoURL,
            role: "sme",
            orgId: null,
            mfaEnabled: false,
            status: "pending", // New users should be pending until they register company
          }));
        }
      } else {
        dispatch(setUser(null));
      }
    });
    return () => unsub();
  }, [dispatch]);
  return null;
}


