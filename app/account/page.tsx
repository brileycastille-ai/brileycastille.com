"use client";

import {FormEvent, useEffect, useState} from "react";
import {getSupabaseBrowser} from "../../lib/supabase-browser";
import "./account.css";
import "./account-extra.css";
import "./account-profile.css";

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
  const [publicName, setPublicName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [prefs, setPrefs] = useState<Record<string, boolean>>(Object.fromEntries(choices.map(([key]) => [key, true])));

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("creator") === "1") {
      setMode("creator");
      setEmail(CREATOR_EMAIL);
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => {setSignedInEmail(data.session?.user.email || (data.session?.user ? "Guest account" : "")); setAccessToken(data.session?.access_token || ""); if(data.session?.access_token) loadProfile(data.session.access_token);});
    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {setSignedInEmail(session?.user.email || (session?.user ? "Guest account" : "")); setAccessToken(session?.access_token || ""); if(session?.access_token) loadProfile(session.access_token);});
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(token: string) {
    const response = await fetch("/api/profile", {headers: {authorization: `Bearer ${token}`}, cache: "no-store"});
    if (response.ok) {const data = await response.json(); setPublicName(data.username || "");}
  }

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
      if (!publicName.trim()) return setMessage("Choose a public name first.");
      const {error} = await supabase.auth.signUp({email, password, options: {emailRedirectTo: `${window.location.origin}/auth/callback`, data: {preferences: prefs, display_name: publicName.trim()}}});
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

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail("");
    setAccessToken("");
    setMessage("You are signed out.");
  }

  async function savePublicName(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    const response = await fetch("/api/profile", {method: "PUT", headers: {"content-type": "application/json", authorization: `Bearer ${accessToken}`}, body: JSON.stringify({username: publicName})});
    const data = await response.json();
    setMessage(response.ok ? "Your public name has been saved." : data.error || "Your public name could not be saved.");
  }

  const isCreator = signedInEmail.toLowerCase() === CREATOR_EMAIL;

  return <main className="account-page">
    <a href="/" className="account-brand">Briley Castille</a>
    <section>
      <p className="eyebrow">Account access</p>
      <h1>Choose how you follow the work.</h1>
      <p>Readers can use an email account or continue anonymously. Briley has a separate protected creator sign-in.</p>
      {signedInEmail && <><div className="signed-in-card"><strong>Signed in as {signedInEmail}</strong><div>{isCreator && <a href="/studio">Open Creator Studio</a>}<button type="button" onClick={signOut}>Sign out</button></div></div>{!isCreator && signedInEmail !== "Guest account" && <form className="profile-form" onSubmit={savePublicName}><label>Public name<input required minLength={3} maxLength={30} value={publicName} onChange={(event) => setPublicName(event.target.value)} placeholder="How your name appears publicly"/></label><small>This name appears on your questions and comments unless you choose Anonymous when posting.</small><button className="button" type="submit">Save public name</button></form>}</>}
      {!signedInEmail && <>
        {mode !== "creator" && <div className="account-tabs"><button onClick={() => changeMode("signin")} className={mode === "signin" ? "active" : ""}>Reader sign in</button><button onClick={() => changeMode("signup")} className={mode === "signup" ? "active" : ""}>Create account</button></div>}
        {mode === "creator" && <p className="eyebrow">Creator sign in</p>}
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={email} readOnly={mode === "creator"} onChange={(event) => setEmail(event.target.value)}/></label>
          <label>Password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)}/></label>
          {mode === "signup" && <label>Public name<input required minLength={3} maxLength={30} value={publicName} onChange={(event) => setPublicName(event.target.value)} placeholder="How your name appears publicly"/></label>}
          {mode === "signup" && <fieldset><legend>Tell me when</legend>{choices.map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={prefs[key]} onChange={(event) => setPrefs({...prefs, [key]: event.target.checked})}/>{label}</label>)}</fieldset>}
          <button className="button" type="submit">{mode === "signup" ? "Create my account" : mode === "creator" ? "Sign in as Briley" : "Sign in"}</button>
        </form>
        {mode === "signup" && <button className="resend" type="button" onClick={resendConfirmation}>Resend verification email</button>}
        {mode !== "creator" && <div className="guest"><span>or</span><button type="button" onClick={continueAsGuest}>Continue anonymously</button><small>No email or password is required. Anonymous accounts cannot receive email updates.</small></div>}
      </>}
      {message && <p className="account-message" role="status">{message}</p>}
    </section>
  </main>;
}
