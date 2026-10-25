// Shared page behavior.
// iOS Safari only applies :active (pressed feedback) when a touch listener exists.
document.addEventListener("touchstart", () => {}, { passive: true });
