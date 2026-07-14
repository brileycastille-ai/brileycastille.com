import type {SupabaseClient} from "@supabase/supabase-js";
import {Resend} from "resend";

export type NotificationPreference = "notify_new_idea" | "notify_new_work" | "notify_comment_reply" | "notify_creator_reply" | "notify_question_answered";

type Notice = {kind: string; title: string; message: string; href: string};

async function emailNotice(email: string | null, notice: Notice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from || !email) return;
  const url = new URL(notice.href, "https://brileycastille.com").toString();
  try {
    await new Resend(apiKey).emails.send({from, to: email, subject: notice.title, html: `<h1>${notice.title}</h1><p>${notice.message}</p><p><a href="${url}">View this update</a></p><p>You received this because this update is enabled in your Briley Castille publication preferences.</p>`});
  } catch {
    // The in-site notification remains available if email delivery is temporarily unavailable.
  }
}

export async function notifySubscribers(supabase: SupabaseClient, preference: NotificationPreference, notice: Notice) {
  const {data: profiles, error} = await supabase.from("profiles").select("id,email").eq(preference, true);
  if (error) throw error;
  if (!profiles?.length) return;
  const {error: insertError} = await supabase.from("notifications").insert(profiles.map((profile) => ({user_id: profile.id, ...notice})));
  if (insertError) throw insertError;
  await Promise.allSettled(profiles.map((profile) => emailNotice(profile.email, notice)));
}

export async function notifyReader(supabase: SupabaseClient, userId: string | null, preference: NotificationPreference, notice: Notice) {
  if (!userId) return;
  const {data: profile, error} = await supabase.from("profiles").select(`${preference},email`).eq("id", userId).maybeSingle();
  const profileData = profile as Record<string, unknown> | null;
  if (error || !profileData?.[preference]) return;
  const {error: insertError} = await supabase.from("notifications").insert({user_id: userId, ...notice});
  if (insertError) throw insertError;
  await emailNotice(typeof profileData.email === "string" ? profileData.email : null, notice);
}
