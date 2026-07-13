import {getSupabaseAdmin} from "./supabase-server";

const CREATOR_EMAIL = "brileycastille@gmail.com";
const RESERVED = ["briley", "briley castille", "creator", "briley creator"];

export type PublicIdentity = {
  userId: string | null;
  displayName: string;
  isCreator: boolean;
  authenticated: boolean;
};

export async function getPublicIdentity(request: Request, anonymous = false): Promise<PublicIdentity> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return {userId: null, displayName: "Anonymous", isCreator: false, authenticated: false};
  const supabase = getSupabaseAdmin();
  const {data} = await supabase.auth.getUser(token);
  const user = data.user;
  if (!user) return {userId: null, displayName: "Anonymous", isCreator: false, authenticated: false};
  const isCreator = user.email?.toLowerCase() === CREATOR_EMAIL;
  if (isCreator) return {userId: user.id, displayName: "Briley Castille", isCreator: true, authenticated: true};
  if (anonymous || user.is_anonymous) return {userId: user.id, displayName: "Anonymous", isCreator: false, authenticated: true};
  const {data: profile} = await supabase.from("profiles").select("username,display_name").eq("id", user.id).maybeSingle();
  const candidate = String(profile?.username || profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Reader").trim().slice(0, 40);
  const displayName = RESERVED.includes(candidate.toLowerCase()) ? "Reader" : candidate;
  return {userId: user.id, displayName, isCreator: false, authenticated: true};
}

export function isReservedName(value: string) {
  const normalized = value.trim().toLowerCase();
  return RESERVED.some((name) => normalized === name || normalized.startsWith("briley castille"));
}
