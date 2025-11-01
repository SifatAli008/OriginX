import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ExtendedAuthUser, UserRole } from "@/lib/types/user";

export type AuthUser = ExtendedAuthUser;

type AuthState = {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error?: string | null;
};

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading(state) {
      state.status = "loading";
      state.error = null;
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "unauthenticated";
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) state.status = "unauthenticated";
    },
    signOutLocal(state) {
      state.user = null;
      state.status = "unauthenticated";
      state.error = null;
    },
  },
});

export const { setLoading, setUser, setError, signOutLocal } = authSlice.actions;
export default authSlice.reducer;


