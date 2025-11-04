"use client";

import { HeroUIProvider } from "@heroui/react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/lib/store";
import AuthListener from "@/components/providers/AuthListener";
import { ToastProvider } from "@/components/ui/toast";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <HeroUIProvider>
        <ToastProvider>
          {children}
          <AuthListener />
        </ToastProvider>
      </HeroUIProvider>
    </ReduxProvider>
  );
}


