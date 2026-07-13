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
    const commentId = Number(id);
    if (!Number.isInteger(commentId)) return Response.json({error: "Invalid comment."}, {status: 400});
    const {error} = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "The comment could not be deleted."}, {status: 503});
  }
}
