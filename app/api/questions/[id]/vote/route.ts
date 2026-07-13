import {getSupabaseAdmin} from "../../../../../lib/supabase-server";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const questionId = Number(id);
    const payload = await request.json() as {voterKey?: string; active?: boolean};
    const supabase = getSupabaseAdmin();
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    let voterKey = payload.voterKey?.trim() || "";
    if (token) {
      const {data} = await supabase.auth.getUser(token);
      if (data.user) voterKey = `user:${data.user.id}`;
    }
    if (!Number.isInteger(questionId) || questionId < 1 || voterKey.length < 16 || voterKey.length > 100) return Response.json({error: "Invalid vote."}, {status: 400});
    if (payload.active) {
      const {error} = await supabase.from("question_votes").upsert({question_id: questionId, voter_key: voterKey}, {onConflict: "question_id,voter_key"});
      if (error) throw error;
    } else {
      const {error} = await supabase.from("question_votes").delete().eq("question_id", questionId).eq("voter_key", voterKey);
      if (error) throw error;
    }
    const {count, error} = await supabase.from("question_votes").select("*", {count: "exact", head: true}).eq("question_id", questionId);
    if (error) throw error;
    return Response.json({votes: count || 0});
  } catch {
    return Response.json({error: "Voting could not be saved. Please try again."}, {status: 503});
  }
}
