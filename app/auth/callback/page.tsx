"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {getSupabaseBrowser} from "../../../lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function confirm() {
      const supabase = getSupabaseBrowser();
      if (!supabase) return setMessage("The verification service is temporarily unavailable.");
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const {error} = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setMessage(error.message);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const {data, error} = await supabase.auth.getSession();
        if (error || !data.session) return setMessage("This verification link is invalid or has expired. Return to sign in and request a new one.");
      }
      router.replace("/account?verified=1");
    }
    confirm();
  }, [router]);

  return <main className="account-page"><a href="/" className="account-brand">Briley Castille</a><section><p className="eyebrow">Email verification</p><h1>{message}</h1><p><a href="/account">Return to sign in</a></p></section></main>;
}
