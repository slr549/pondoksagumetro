// Midtrans Snap frontend helper.
// Replace with your real client key (publishable, safe to expose).
// Use the sandbox client key while testing, the production key when going live.
export const MIDTRANS_CLIENT_KEY = "SB-Mid-client-XXXXXXXXXXXXXXXX";

// Sandbox snap.js. Switch to "https://app.midtrans.com/snap/snap.js" for production.
const SNAP_SCRIPT_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

let loadingPromise: Promise<void> | null = null;

export function loadSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.snap) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Midtrans Snap"));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export interface SnapResult {
  status: "success" | "pending" | "error" | "closed";
  data?: unknown;
}

export async function openSnap(token: string): Promise<SnapResult> {
  await loadSnap();
  return new Promise((resolve) => {
    if (!window.snap) {
      resolve({ status: "error", data: "Snap not loaded" });
      return;
    }
    window.snap.pay(token, {
      onSuccess: (data) => resolve({ status: "success", data }),
      onPending: (data) => resolve({ status: "pending", data }),
      onError: (data) => resolve({ status: "error", data }),
      onClose: () => resolve({ status: "closed" }),
    });
  });
}