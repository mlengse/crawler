## 2024-05-23 - Status Updates Accessibility
**Learning:** React state updates for status messages (loading/success/error) are often silent for screen reader users unless explicitly marked with `role="status"` and `aria-live`.
**Action:** Always wrap dynamic status text components in a container with `role="status"` and `aria-live="polite"` (or "assertive" for critical errors).
