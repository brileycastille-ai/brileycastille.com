import {getSupabaseAdmin} from "../../../lib/supabase-server";
import {requireCreator} from "../../../lib/creator-auth";
import {notifySubscribers} from "../../../lib/notifications";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [{data: ideas, error: ideasError}, {data: reporting, error: reportingError}, {data: votes, error: votesError}, {data: settings, error: settingsError}] = await Promise.all([
      supabase.from("essay_ideas").select("id,title,overview,stage,created_at").order("created_at", {ascending: false}),
      supabase.from("reporting").select("id,title,description,status,expected,color,created_at").order("created_at", {ascending: false}),
      supabase.from("progress_votes").select("reporting_id"),
      supabase.from("publication_settings").select("about_heading,about_body,about_photo_url").eq("id", "main").maybeSingle(),
    ]);
    if (ideasError || reportingError || votesError || settingsError) throw ideasError || reportingError || votesError || settingsError;
    const totals = new Map<number, number>();
    for (const vote of votes || []) totals.set(Number(vote.reporting_id), (totals.get(Number(vote.reporting_id)) || 0) + 1);
    return Response.json({
      ideas: ideas || [],
      reporting: (reporting || []).map((item) => ({...item, votes: totals.get(Number(item.id)) || 0})),
      settings: settings || null,
    });
  } catch {
    return Response.json({error: "Publication updates are temporarily unavailable."}, {status: 503});
  }
}

export async function POST(request: Request) {
  try {
    const creator = await requireCreator(request);
    if (!creator) return Response.json({error: "Creator access only."}, {status: 403});
    const payload = await request.json() as Record<string, string>;
    if (payload.type === "idea") {
      const title = payload.title?.trim();
      const overview = payload.description?.trim();
      if (!title || !overview) return Response.json({error: "A title and description are required."}, {status: 400});
      const {error} = await creator.supabase.from("essay_ideas").insert({title, overview, stage: payload.stage?.trim() || "Idea"});
      if (error) throw error;
      await notifySubscribers(creator.supabase, "notify_new_idea", {kind: "new_idea", title: `New essay idea: ${title}`, message: overview, href: "/#ideas"});
    } else if (payload.type === "reporting" || payload.type === "reporting_update") {
      const title = payload.title?.trim();
      const description = payload.description?.trim();
      if (!title || !description) return Response.json({error: "A title and description are required."}, {status: 400});
      const values = {title, description, status: payload.status?.trim() || "Planning", expected: payload.expected?.trim() || "To be announced", color: payload.color === "green" ? "green" : "amber"};
      const id = Number(payload.id);
      if (payload.type === "reporting_update" && (!Number.isInteger(id) || id < 1)) return Response.json({error: "Choose a valid in-progress story to edit."}, {status: 400});
      const request = payload.type === "reporting_update" ? creator.supabase.from("reporting").update(values).eq("id", id) : creator.supabase.from("reporting").insert(values);
      const {error} = await request;
      if (error) throw error;
      if (payload.type === "reporting") await notifySubscribers(creator.supabase, "notify_new_idea", {kind: "new_idea", title: `New story in progress: ${title}`, message: description, href: "/#progress"});
    } else if (payload.type === "about") {
      const about_heading = payload.heading?.trim();
      const about_body = payload.body?.trim();
      if (!about_heading || !about_body) return Response.json({error: "The About heading and introduction are required."}, {status: 400});
      const {error} = await creator.supabase.from("publication_settings").upsert({id: "main", about_heading, about_body, about_photo_url: payload.photoUrl || null, updated_at: new Date().toISOString()}, {onConflict: "id"});
      if (error) throw error;
    } else return Response.json({error: "Unknown publication update."}, {status: 400});
    return Response.json({ok: true}, {status: 201});
  } catch {
    return Response.json({error: "The publication update could not be saved."}, {status: 503});
  }
}

export async function DELETE(request: Request) {
  try {
    const creator = await requireCreator(request);
    if (!creator) return Response.json({error: "Creator access only."}, {status: 403});
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1 || !["idea", "reporting"].includes(type || "")) return Response.json({error: "Invalid item."}, {status: 400});
    const table = type === "idea" ? "essay_ideas" : "reporting";
    const {error} = await creator.supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "The item could not be deleted."}, {status: 503});
  }
}
