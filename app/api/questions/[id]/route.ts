import {getSupabaseAdmin} from "../../../../lib/supabase-server";

const CREATOR = "brileycastille@gmail.com";

export async function DELETE(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({error: "Sign in required."}, {status: 401});
    const supabase = getSupabaseAdmin();
    const {data} = await supabase.auth.getUser(token);
    if (data.user?.email?.toLowerCase() !== CREATOR) return Response.json({error: "Creator access only."}, {status: 403});
    const {id} = await context.params;
    const questionId = Number(id);
    if (!Number.isInteger(questionId)) return Response.json({error: "Invalid question."}, {status: 400});
    const {error: commentError} = await supabase.from("comments").delete().eq("essay_slug", "question-box").eq("paragraph_id", `question-${questionId}`);
    if (commentError) throw commentError;
    const {error} = await supabase.from("questions").delete().eq("id", questionId);
    if (error) throw error;
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "The question could not be deleted."}, {status: 503});
  }
}
