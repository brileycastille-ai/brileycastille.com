import {getSupabaseAdmin} from "./supabase-server";

export const CREATOR_EMAIL = "brileycastille@gmail.com";

export async function requireCreator(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const {data} = await supabase.auth.getUser(token);
  if (data.user?.email?.toLowerCase() !== CREATOR_EMAIL) return null;
  return {supabase, user: data.user};
}
