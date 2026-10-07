"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";

import { setAdminToken } from "@/lib/adminAuth";

export function SecretAdminListener() {
  const router = useRouter();
  const bufferRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showToast, setShowToast] = useState(false);
  const secretCodes = ["cinenova", "admincine"];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        e.key.length !== 1
      ) {
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = "";
      }, 3000);

      bufferRef.current += e.key.toLowerCase();

      const matched = secretCodes.some((code) => bufferRef.current.endsWith(code));
      if (matched) {
        bufferRef.current = "";
        setAdminToken(`adm_${Date.now()}`);
        setShowToast(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cinenova_trigger_preloader", {
              detail: { subtitle: "CineNova Management Portal", duration: 1100 },
            })
          );
        }
        router.push("/admin");
        setTimeout(() => {
          setShowToast(false);
        }, 1500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  if (!showToast) return null;

  return (
    <div className="secret-toast">
      <div
        style={{
          background: "rgba(229, 9, 20, 0.2)",
          padding: 8,
          borderRadius: 10,
          color: "#e50914",
        }}
      >
        <ShieldCheck size={24} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
          <span>Access Code Verified</span>
          <Sparkles size={16} color="#f59e0b" />
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Opening CineNova Admin Portal...
        </div>
      </div>
    </div>
  );
}
