import mammoth from "mammoth";
import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {notifySubscribers} from "../../../lib/notifications";
import {ESSAY_TOPICS} from "../../../lib/essay-topics";

const CREATOR = "brileycastille@gmail.com";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutRepeatedTitle(html: string, title: string) {
  const firstBlock = html.match(/^\s*<(h[1-6]|p)(?:\s[^>]*)?>([\s\S]*?)<\/\1>\s*/i);
  if (!firstBlock || plainText(firstBlock[2]).toLowerCase() !== title.trim().toLowerCase()) return html;
  return html.slice(firstBlock[0].length);
}

function normalizeEssayTypography(html: string) {
  return html
    .replace(/\sstyle=("[^"]*"|'[^']*')/gi, "")
    .replace(/<\/?font(?:\s[^>]*)?>/gi, "");
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const slug = new URL(request.url).searchParams.get("slug")?.trim();
    if (slug) {
      const {data, error} = await supabase.from("essays").select("slug,title,dek,topics,content_html,published_at").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({error: "Essay not found."}, {status: 404});
      return Response.json({essay: data});
    }
    const {data, error} = await supabase.from("essays").select("slug,title,dek,topics,published_at,content_html").eq("status", "published").order("published_at", {ascending: false});
    if (error) throw error;
    const essays = (data || []).map((essay) => ({
      slug: essay.slug,
      title: essay.title,
      dek: essay.dek || plainText(essay.content_html || "").slice(0, 240),
      topics: Array.isArray(essay.topics) && essay.topics.length ? essay.topics : ["Essay"],
      published_at: essay.published_at,
      read_minutes: Math.max(1, Math.ceil(plainText(essay.content_html || "").split(/\s+/).filter(Boolean).length / 220)),
    }));
    return Response.json({essays});
  } catch (error) {
    console.error("Could not load essays", error);
    return Response.json({error: "Essays are temporarily unavailable."}, {status: 503});
  }
}

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
    const description = String(form.get("description") || "").trim();
    const requestedTopics = JSON.parse(String(form.get("topics") || "[]")) as string[];
    const topics = [...new Set(requestedTopics.filter((topic) => ESSAY_TOPICS.includes(topic as (typeof ESSAY_TOPICS)[number])))];
    if (!(file instanceof File) || !title) return Response.json({error: "A title and Word document are required."}, {status: 400});
    if (!topics.length) return Response.json({error: "Choose at least one publication topic."}, {status: 400});
    if (!file.name.toLowerCase().endsWith(".docx")) return Response.json({error: "Please choose a Word document ending in .docx."}, {status: 400});
    if (file.size > MAX_FILE_SIZE) return Response.json({error: "The Word document must be smaller than 8 MB."}, {status: 400});
    const buffer = Buffer.from(await file.arrayBuffer());
    const conversion = await mammoth.convertToHtml({buffer});
    const value = normalizeEssayTypography(withoutRepeatedTitle(conversion.value, title));
    if (!plainText(value)) return Response.json({error: "The Word document does not contain readable essay text."}, {status: 400});
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return Response.json({error: "Please enter a title containing letters or numbers."}, {status: 400});
    if (description.length > 500) return Response.json({error: "The essay description must be 500 characters or fewer."}, {status: 400});
    const dek = description || plainText(value).slice(0, 240);
    const {error} = await supabase.from("essays").upsert({slug, title, dek, topics, content_html: value, status: "published", published_at: new Date().toISOString(), created_by: data.user.id}, {onConflict: "slug"});
    if (error) throw error;
    await notifySubscribers(supabase, "notify_new_work", {kind: "new_work", title: `New essay: ${title}`, message: "Briley has published a new work.", href: `/essays/${slug}`});
    return Response.json({ok: true, slug});
  } catch (error) {
    console.error("Could not publish work", error);
    return Response.json({error: "The work could not be published."}, {status: 503});
  }
}

export async function PATCH(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({error: "Sign in required."}, {status: 401});
    const supabase = getSupabaseAdmin();
    const {data} = await supabase.auth.getUser(token);
    if (data.user?.email?.toLowerCase() !== CREATOR) return Response.json({error: "Creator access only."}, {status: 403});
    const payload = await request.json() as {slug?: string; description?: string; topics?: string[]};
    const slug = payload.slug?.trim() || "";
    const description = payload.description?.trim() || "";
    const topics = [...new Set((payload.topics || []).filter((topic) => ESSAY_TOPICS.includes(topic as (typeof ESSAY_TOPICS)[number])))];
    if (!slug || !description || !topics.length) return Response.json({error: "A description and at least one topic are required."}, {status: 400});
    if (description.length > 500) return Response.json({error: "The essay description must be 500 characters or fewer."}, {status: 400});
    const {error} = await supabase.from("essays").update({dek: description, topics}).eq("slug", slug);
    if (error) throw error;
    return Response.json({ok: true});
  } catch (error) {
    console.error("Could not update essay details", error);
    return Response.json({error: "The essay details could not be updated."}, {status: 503});
  }
}
import mammoth from "mammoth";
import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {notifySubscribers} from "../../../lib/notifications";

const CREATOR = "brileycastille@gmail.com";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutRepeatedTitle(html: string, title: string) {
  const firstBlock = html.match(/^\s*<(h[1-6]|p)(?:\s[^>]*)?>([\s\S]*?)<\/\1>\s*/i);
  if (!firstBlock || plainText(firstBlock[2]).toLowerCase() !== title.trim().toLowerCase()) return html;
  return html.slice(firstBlock[0].length);
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const slug = new URL(request.url).searchParams.get("slug")?.trim();
    if (slug) {
      const {data, error} = await supabase.from("essays").select("slug,title,dek,content_html,published_at").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({error: "Essay not found."}, {status: 404});
      return Response.json({essay: data});
    }
    const {data, error} = await supabase.from("essays").select("slug,title,dek,published_at,content_html").eq("status", "published").order("published_at", {ascending: false});
    if (error) throw error;
    const essays = (data || []).map((essay) => ({
      slug: essay.slug,
      title: essay.title,
      dek: essay.dek || plainText(essay.content_html || "").slice(0, 240),
      published_at: essay.published_at,
      read_minutes: Math.max(1, Math.ceil(plainText(essay.content_html || "").split(/\s+/).filter(Boolean).length / 220)),
    }));
    return Response.json({essays});
  } catch (error) {
    console.error("Could not load essays", error);
    return Response.json({error: "Essays are temporarily unavailable."}, {status: 503});
  }
}

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
    const description = String(form.get("description") || "").trim();
    if (!(file instanceof File) || !title) return Response.json({error: "A title and Word document are required."}, {status: 400});
    if (!file.name.toLowerCase().endsWith(".docx")) return Response.json({error: "Please choose a Word document ending in .docx."}, {status: 400});
    if (file.size > MAX_FILE_SIZE) return Response.json({error: "The Word document must be smaller than 8 MB."}, {status: 400});
    const buffer = Buffer.from(await file.arrayBuffer());
    const conversion = await mammoth.convertToHtml({buffer});
    const value = withoutRepeatedTitle(conversion.value, title);
    if (!plainText(value)) return Response.json({error: "The Word document does not contain readable essay text."}, {status: 400});
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return Response.json({error: "Please enter a title containing letters or numbers."}, {status: 400});
    if (description.length > 500) return Response.json({error: "The essay description must be 500 characters or fewer."}, {status: 400});
    const dek = description || plainText(value).slice(0, 240);
    const {error} = await supabase.from("essays").upsert({slug, title, dek, content_html: value, status: "published", published_at: new Date().toISOString(), created_by: data.user.id}, {onConflict: "slug"});
    if (error) throw error;
    await notifySubscribers(supabase, "notify_new_work", {kind: "new_work", title: `New essay: ${title}`, message: "Briley has published a new work.", href: `/essays/${slug}`});
    return Response.json({ok: true, slug});
  } catch (error) {
    console.error("Could not publish work", error);
    return Response.json({error: "The work could not be published."}, {status: 503});
  }
}
