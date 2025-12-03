import { ensureUserProfile, supabase } from "@/lib/supabase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setHasSession(!!data.session);
        
        // If user has a session, ensure they have a profile
        if (data.session?.user) {
          await ensureUserProfile(data.session.user.id);
        }
        
        setChecking(false);
      })
      .catch((e) => console.log("SESSION ERROR:", e));
    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) return null;
  return <Redirect href={hasSession ? "/(tabs)/challenges" : "/auth"} />;
}
