"use client";

import {FormEvent, useEffect, useState} from "react";
import {getSupabaseBrowser} from "../../lib/supabase-browser";
import "./account.css";
import "./account-extra.css";

const CREATOR_EMAIL = "brileycastille@gmail.com";
const choices = [
  ["new_idea", "A new essay idea is posted"],
  ["new_work", "Briley publishes a new work"],
  ["comment_reply", "Someone replies to my comment"],
  ["creator_reply", "Briley replies to my comment"],
  ["question_answered", "My question is answered in an essay"],
];

export default function AccountPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "creator">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [prefs, setPrefs] = useState<Record<string, boolean>>(Object.fromEntries(choices.map(([key]) => [key, true])));

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({data}) => setSignedInEmail(data.user?.email || (data.user ? "Guest account" : "")));
    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => setSignedInEmail(session?.user.email || (session?.user ? "Guest account" : "")));
    return () => listener.subscription.unsubscribe();
  }, []);

  function changeMode(nextMode: "signin" | "signup" | "creator") {
    setMode(nextMode);
    setMessage("");
    if (nextMode === "creator") setEmail(CREATOR_EMAIL);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return setMessage("The sign-in service is temporarily unavailable.");
    if (mode === "creator" && email.toLowerCase() !== CREATOR_EMAIL) return setMessage("Creator access is limited to Briley's email address.");
    if (mode === "signup") {
      const {error} = await supabase.auth.signUp({email, password, options: {emailRedirectTo: `${window.location.origin}/auth/callback`, data: {preferences: prefs}}});
      setMessage(error?.message || "Check your email and click the verification link. It will return you to this website.");
      return;
    }
    const {error} = await supabase.auth.signInWithPassword({email, password});
    setMessage(error?.message || (mode === "creator" ? "Creator sign-in successful. You can open Creator Studio." : "You are signed in."));
  }

  async function continueAsGuest() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return setMessage("The guest sign-in service is temporarily unavailable.");
    const {error} = await supabase.auth.signInAnonymously();
    setMessage(error?.message || "You are continuing with an anonymous guest account on this device.");
  }

  async function resendConfirmation() {
    const supabase = getSupabaseBrowser();
    if (!supabase || !email) return setMessage("Enter your email address first.");
    const {error} = await supabase.auth.resend({type: "signup", email, options: {emailRedirectTo: `${window.location.origin}/auth/callback`}});
    setMessage(error?.message || "A new verification email has been sent.");
  }

  async function setUpCreatorAccount() {
    const supabase = getSupabaseBrowser();
    if (!supabase || password.length < 8) return setMessage("Enter a password with at least 8 characters first.");
    const {error} = await supabase.auth.signUp({email: CREATOR_EMAIL, password, options: {emailRedirectTo: `${window.location.origin}/auth/callback`}});
    setMessage(error?.message || "Check Briley's inbox and click the verification link to activate Creator Studio.");
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail("");
    setMessage("You are signed out.");
  }

  const isCreator = signedInEmail.toLowerCase() === CREATOR_EMAIL;

  return <main className="account-page">
    <a href="/" className="account-brand">Briley Castille</a>
    <section>
      <p className="eyebrow">Account access</p>
      <h1>Choose how you follow the work.</h1>
      <p>Readers can use an email account or continue anonymously. Briley has a separate protected creator sign-in.</p>
      {signedInEmail && <div className="signed-in-card"><strong>Signed in as {signedInEmail}</strong><div>{isCreator && <a href="/studio">Open Creator Studio</a>}<button type="button" onClick={signOut}>Sign out</button></div></div>}
      {!signedInEmail && <>
        <div className="account-tabs"><button onClick={() => changeMode("signin")} className={mode === "signin" ? "active" : ""}>Reader sign in</button><button onClick={() => changeMode("signup")} className={mode === "signup" ? "active" : ""}>Create account</button><button onClick={() => changeMode("creator")} className={mode === "creator" ? "active" : ""}>Creator sign in</button></div>
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={email} readOnly={mode === "creator"} onChange={(event) => setEmail(event.target.value)}/></label>
          <label>Password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)}/></label>
          {mode === "signup" && <fieldset><legend>Tell me when</legend>{choices.map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={prefs[key]} onChange={(event) => setPrefs({...prefs, [key]: event.target.checked})}/>{label}</label>)}</fieldset>}
          <button className="button" type="submit">{mode === "signup" ? "Create my account" : mode === "creator" ? "Sign in as Briley" : "Sign in"}</button>
        </form>
        {mode === "signup" && <button className="resend" type="button" onClick={resendConfirmation}>Resend verification email</button>}
        {mode === "creator" && <button className="resend" type="button" onClick={setUpCreatorAccount}>Set up or resend creator verification</button>}
        {mode !== "creator" && <div className="guest"><span>or</span><button type="button" onClick={continueAsGuest}>Continue anonymously</button><small>No email or password is required. Anonymous accounts cannot receive email updates.</small></div>}
      </>}
      {message && <p className="account-message" role="status">{message}</p>}
    </section>
  </main>;
}
