"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Listens for Supabase auth state changes and sets Sentry user context.
 * Mount once in root layout alongside PostHogProvider.
 */
export function SentryUserProvider() {
  useEffect(() => {
    const supabase = createClient();

    // Set initial user context (page refresh with existing session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
