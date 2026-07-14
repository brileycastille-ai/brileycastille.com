import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {isReservedName} from "../../../lib/public-identity";

async function userFrom(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const {data} = await getSupabaseAdmin().auth.getUser(token);
  return data.user || null;
}

export async function GET(request: Request) {
  try {
    const user = await userFrom(request);
    if (!user) return Response.json({error: "Sign in required."}, {status: 401});
    const {data, error} = await getSupabaseAdmin().from("profiles").select("username,display_name,notify_new_idea,notify_new_work,notify_comment_reply,notify_creator_reply,notify_question_answered").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return Response.json({username: data?.username || data?.display_name || user.email?.split("@")[0] || "Reader", preferences: {new_idea: data?.notify_new_idea ?? true, new_work: data?.notify_new_work ?? true, comment_reply: data?.notify_comment_reply ?? true, creator_reply: data?.notify_creator_reply ?? true, question_answered: data?.notify_question_answered ?? true}});
  } catch {
    return Response.json({error: "Your public name could not be loaded."}, {status: 503});
  }
}

export async function PUT(request: Request) {
  try {
    const user = await userFrom(request);
    if (!user) return Response.json({error: "Sign in required."}, {status: 401});
    const payload = await request.json() as {username?: string; preferences?: Record<string, boolean>};
    const update: Record<string, string | boolean | undefined> = {id: user.id, email: user.email};
    if (payload.username !== undefined) {
      if (user.email?.toLowerCase() === "brileycastille@gmail.com") return Response.json({error: "The creator name is managed automatically."}, {status: 403});
      const username = payload.username.trim();
      if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{2,29}$/.test(username)) return Response.json({error: "Use 3 to 30 letters, numbers, spaces, periods, underscores, or hyphens."}, {status: 400});
      if (isReservedName(username)) return Response.json({error: "That name is reserved."}, {status: 400});
      update.username = username;
      update.display_name = username;
    }
    if (payload.preferences) {
      update.notify_new_idea = payload.preferences.new_idea !== false;
      update.notify_new_work = payload.preferences.new_work !== false;
      update.notify_comment_reply = payload.preferences.comment_reply !== false;
      update.notify_creator_reply = payload.preferences.creator_reply !== false;
      update.notify_question_answered = payload.preferences.question_answered !== false;
    }
    const {error} = await getSupabaseAdmin().from("profiles").upsert(update, {onConflict: "id"});
    if (error?.code === "23505") return Response.json({error: "That public name is already taken."}, {status: 409});
    if (error) throw error;
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "Your public name could not be saved."}, {status: 503});
  }
}
