"use client";

import { useEffect } from "react";

// Registra o service worker em produção — habilita a instalação como PWA.
export default function RegistroSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
  }, []);
  return null;
}
