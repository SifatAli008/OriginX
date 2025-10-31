"use client";

import React from "react";
import SimpleBar from "simplebar-react";

type ClientViewportProps = {
  children: React.ReactNode;
};

export default function ClientViewport({ children }: ClientViewportProps) {
  return (
    <div style={{ height: "100dvh", minHeight: "100vh" }}>
      <SimpleBar autoHide={false} scrollbarMaxSize={128} style={{ maxHeight: "100%", height: "100%" }}>
        {children}
      </SimpleBar>
    </div>
  );
}


