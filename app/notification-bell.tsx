"use client";

import {useCallback, useEffect, useState} from "react";
import {getSupabaseBrowser} from "../lib/supabase-browser";
import "./notification-bell.css";

export default function NotificationBell() {
  const [visible, setVisible] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session || session.user.is_anonymous) {setVisible(false); setUnread(0); return;}
    setVisible(true);
    const response = await fetch("/api/notifications", {headers: {authorization: `Bearer ${session.access_token}`}, cache: "no-store"});
    if (!response.ok) return;
    const data = await response.json();
    setUnread((data.notifications || []).filter((item: {read_at: string | null}) => !item.read_at).length);
  }, []);

  useEffect(() => {
    refresh();
    const supabase = getSupabaseBrowser();
    const listener = supabase?.auth.onAuthStateChange(() => refresh());
    const timer = window.setInterval(refresh, 30000);
    return () => {window.clearInterval(timer); listener?.data.subscription.unsubscribe();};
  }, [refresh]);

  if (!visible) return null;
  return <a className="notification-bell" href="/notifications" aria-label={unread ? `${unread} unread notifications` : "Notifications"} title="Notifications"><span aria-hidden="true">●</span>{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}</a>;
}
