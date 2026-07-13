import {requireCreator} from "../../../lib/creator-auth";

export async function GET(request: Request) {
  try {
    const creator = await requireCreator(request);
    if (!creator) return Response.json({error: "Creator access only."}, {status: 403});
    const [{data: questions, error: questionError}, {data: comments, error: commentError}, {data: ideas, error: ideaError}, {data: reporting, error: reportingError}, {data: settings, error: settingsError}, usersResult] = await Promise.all([
      creator.supabase.from("questions").select("id,question,context,display_name,created_at,answered_in_slug").order("created_at", {ascending: false}),
      creator.supabase.from("comments").select("id,essay_slug,paragraph_id,display_name,guest_email,body,created_at,parent_id,is_creator_reply").order("created_at", {ascending: false}),
      creator.supabase.from("essay_ideas").select("id,title,overview,stage,created_at").order("created_at", {ascending: false}),
      creator.supabase.from("reporting").select("id,title,description,status,expected,color,created_at").order("created_at", {ascending: false}),
      creator.supabase.from("publication_settings").select("about_heading,about_body,about_photo_url").eq("id", "main").maybeSingle(),
      creator.supabase.auth.admin.listUsers({page: 1, perPage: 200}),
    ]);
    if (questionError || commentError || ideaError || reportingError || settingsError || usersResult.error) throw questionError || commentError || ideaError || reportingError || settingsError || usersResult.error;
    const users = usersResult.data.users.filter((user) => !user.is_anonymous).map((user) => ({id: user.id, email: user.email, created_at: user.created_at, confirmed_at: user.email_confirmed_at}));
    return Response.json({questions: questions || [], comments: comments || [], ideas: ideas || [], reporting: reporting || [], settings: settings || null, users});
  } catch {
    return Response.json({error: "Creator Studio could not load."}, {status: 503});
  }
}
