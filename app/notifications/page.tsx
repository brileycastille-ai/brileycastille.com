"use client";

import {useCallback, useEffect, useState} from "react";
import {getSupabaseBrowser} from "../../lib/supabase-browser";
import "./notifications.css";

type Notice = {id: number; kind: string; title: string; message: string; href: string; read_at: string | null; created_at: string};

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Loading notifications...");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session || session.user.is_anonymous) {setMessage("Sign in with your reader account to see notifications."); return;}
    setToken(session.access_token);
    const response = await fetch("/api/notifications", {headers: {authorization: `Bearer ${session.access_token}`}, cache: "no-store"});
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Notifications could not be loaded.");
    setNotices(data.notifications || []);
    setMessage(data.notifications?.length ? "" : "You do not have any notifications yet.");
  }, []);

  useEffect(() => {load();}, [load]);

  async function openNotice(event: React.MouseEvent<HTMLAnchorElement>, notice: Notice) {
    event.preventDefault();
    if (!notice.read_at) await fetch("/api/notifications", {method: "PATCH", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify({id: notice.id})});
    window.location.assign(notice.href);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {method: "PATCH", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify({all: true})});
    await load();
  }

  return <main className="notifications-page"><header><a href="/" className="brand">Briley Castille</a><nav><a href="/">Publication</a><a href="/account">Account settings</a></nav></header><section><p className="eyebrow">Reader updates</p><div className="notifications-heading"><h1>Notifications</h1>{notices.some((notice) => !notice.read_at) && <button type="button" onClick={markAllRead}>Mark all as read</button>}</div>{message && <p className="notifications-message">{message}</p>}<div className="notifications-list">{notices.map((notice) => <a href={notice.href} onClick={(event) => openNotice(event, notice)} className={notice.read_at ? "notice read" : "notice unread"} key={notice.id}><small>{notice.kind.replaceAll("_", " ")} | {new Date(notice.created_at).toLocaleDateString()}</small><h2>{notice.title}</h2><p>{notice.message}</p><span>View update →</span></a>)}</div></section></main>;
}
