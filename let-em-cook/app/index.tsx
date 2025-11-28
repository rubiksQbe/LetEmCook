import { supabase } from "@/lib/supabase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setHasSession(!!data.session);
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
