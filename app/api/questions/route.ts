import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {getPublicIdentity} from "../../../lib/public-identity";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [{data: questions, error: questionError}, {data: votes, error: voteError}] = await Promise.all([
      supabase.from("questions").select("id,question,context,display_name,is_anonymous,created_at").order("created_at", {ascending: false}).limit(50),
      supabase.from("question_votes").select("question_id"),
    ]);
    if (questionError || voteError) throw questionError || voteError;
    const totals = new Map<number, number>();
    for (const vote of votes || []) totals.set(Number(vote.question_id), (totals.get(Number(vote.question_id)) || 0) + 1);
    return Response.json({questions: (questions || []).map((item) => ({...item, votes: totals.get(Number(item.id)) || 0}))});
  } catch {
    return Response.json({error: "Question service is not configured yet."}, {status: 503});
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {question?: string; context?: string; anonymous?: boolean};
    const question = payload.question?.trim() || "";
    if (question.length < 3 || question.length > 500) return Response.json({error: "Question must be 3 to 500 characters."}, {status: 400});
    const identity = await getPublicIdentity(request, payload.anonymous === true);
    if (!identity.userId) return Response.json({error: "Sign in or continue as a guest before posting a question."}, {status: 401});
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const {count, error: countError} = await getSupabaseAdmin().from("questions").select("*", {count: "exact", head: true}).eq("user_id", identity.userId).gte("created_at", since);
    if (countError) throw countError;
    if ((count || 0) >= 5) return Response.json({error: "You have reached the limit of five questions in 24 hours. Please try again later."}, {status: 429});
    const {error} = await getSupabaseAdmin().from("questions").insert({question, context: payload.context?.slice(0, 160) || "standalone", user_id: identity.userId, display_name: identity.displayName, is_anonymous: identity.displayName === "Anonymous"});
    if (error) throw error;
    return Response.json({ok: true}, {status: 201});
  } catch {
    return Response.json({error: "The question could not be saved. Please try again."}, {status: 503});
  }
}
