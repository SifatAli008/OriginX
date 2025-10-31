"use client";

import { HeroUIProvider } from "@heroui/react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/lib/store";
import AuthListener from "@/components/providers/AuthListener";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <HeroUIProvider>
        {children}
        <AuthListener />
      </HeroUIProvider>
    </ReduxProvider>
  );
}


