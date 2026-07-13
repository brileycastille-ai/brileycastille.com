import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {getPublicIdentity} from "../../../lib/public-identity";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("essay_slug");
    if (!slug) return Response.json({error: "Essay is required."}, {status: 400});
    const {data, error} = await getSupabaseAdmin().from("comments").select("id,essay_slug,paragraph_id,parent_id,display_name,body,is_creator_reply,created_at").eq("essay_slug", slug).order("created_at", {ascending: true});
    if (error) throw error;
    return Response.json({comments: data || []});
  } catch {
    return Response.json({error: "Comments are not connected yet."}, {status: 503});
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {essay_slug?: string; paragraph_id?: string; parent_id?: number | null; body?: string; anonymous?: boolean};
    if (!payload.essay_slug || !payload.body?.trim() || payload.body.length > 1500) return Response.json({error: "A comment of no more than 1,500 characters is required."}, {status: 400});
    const identity = await getPublicIdentity(request, payload.anonymous === true);
    const {error} = await getSupabaseAdmin().from("comments").insert({essay_slug: payload.essay_slug, paragraph_id: payload.paragraph_id || null, parent_id: payload.parent_id || null, body: payload.body.trim(), display_name: identity.displayName, user_id: identity.userId, is_creator_reply: identity.isCreator});
    if (error) throw error;
    return Response.json({ok: true}, {status: 201});
  } catch {
    return Response.json({error: "Your comment could not be posted. Please try again."}, {status: 503});
  }
}
