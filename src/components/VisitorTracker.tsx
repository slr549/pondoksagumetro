import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "visitor_session_id";

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getDeviceType(ua: string): string {
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export default function VisitorTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const ua = navigator.userAgent || "";
    const payload = {
      path,
      referrer: document.referrer || null,
      session_id: getSessionId(),
      user_agent: ua,
      device_type: getDeviceType(ua),
    };

    supabase.auth.getUser().then(({ data }) => {
      supabase.from("page_visits").insert({
        ...payload,
        user_id: data.user?.id ?? null,
      }).then(() => {});
    });
  }, [location.pathname]);

  return null;
}