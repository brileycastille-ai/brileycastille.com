import {requireCreator} from "../../../../../lib/creator-auth";
import {notifyReader} from "../../../../../lib/notifications";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const creator = await requireCreator(request);
    if (!creator) return Response.json({error: "Creator access only."}, {status: 403});
    const {id} = await params;
    const questionId = Number(id);
    const payload = await request.json() as {slug?: string};
    const slug = payload.slug?.trim().replace(/^\/essays\//, "") || "";
    if (!Number.isInteger(questionId) || questionId < 1 || !/^[a-z0-9-]+$/.test(slug)) return Response.json({error: "Enter the essay address name, such as beyond-the-algorithm."}, {status: 400});
    const {data: question, error: questionError} = await creator.supabase.from("questions").select("question,user_id").eq("id", questionId).maybeSingle();
    if (questionError || !question) return Response.json({error: "Question not found."}, {status: 404});
    const {error} = await creator.supabase.from("questions").update({answered_in_slug: slug}).eq("id", questionId);
    if (error) throw error;
    await notifyReader(creator.supabase, question.user_id, "notify_question_answered", {kind: "question_answered", title: "Your question was answered", message: question.question, href: `/essays/${slug}`});
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "The question could not be marked as answered."}, {status: 503});
  }
}
