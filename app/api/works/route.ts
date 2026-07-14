import mammoth from "mammoth";
import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {notifySubscribers} from "../../../lib/notifications";

const CREATOR = "brileycastille@gmail.com";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({error: "Sign in required."}, {status: 401});
    const supabase = getSupabaseAdmin();
    const {data} = await supabase.auth.getUser(token);
    if (data.user?.email?.toLowerCase() !== CREATOR) return Response.json({error: "Creator access only."}, {status: 403});
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    if (!(file instanceof File) || !title) return Response.json({error: "A title and Word document are required."}, {status: 400});
    const buffer = Buffer.from(await file.arrayBuffer());
    const {value} = await mammoth.convertToHtml({buffer});
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const {error} = await supabase.from("essays").upsert({slug, title, content_html: value, status: "published", created_by: data.user.id}, {onConflict: "slug"});
    if (error) throw error;
    await notifySubscribers(supabase, "notify_new_work", {kind: "new_work", title: `New essay: ${title}`, message: "Briley has published a new work.", href: `/essays/${slug}`});
    return Response.json({ok: true, slug});
  } catch {
    return Response.json({error: "The work could not be published."}, {status: 503});
  }
}
