export function dismissPreloader() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cinenova_dismiss_preloader"));
  }
}

export function triggerPreloader(
  subtitle: string = "Cinematic Streaming Universe",
  maxDurationMs: number = 2500
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cinenova_trigger_preloader", {
        detail: { subtitle, duration: maxDurationMs },
      })
    );
  }
}
