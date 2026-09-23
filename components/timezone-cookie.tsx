"use client";

import { useEffect } from "react";

export function TimeZoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const encoded = encodeURIComponent(tz);
    document.cookie = `sf_tz=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);
  return null;
}
