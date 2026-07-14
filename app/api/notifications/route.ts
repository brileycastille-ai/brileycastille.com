import {getSupabaseAdmin} from "../../../lib/supabase-server";

async function signedInUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const {data} = await getSupabaseAdmin().auth.getUser(token);
  return data.user || null;
}

export async function GET(request: Request) {
  try {
    const user = await signedInUser(request);
    if (!user || user.is_anonymous) return Response.json({error: "Reader sign-in required."}, {status: 401});
    const {data, error} = await getSupabaseAdmin().from("notifications").select("id,kind,title,message,href,read_at,created_at").eq("user_id", user.id).order("created_at", {ascending: false}).limit(50);
    if (error) throw error;
    return Response.json({notifications: data || []});
  } catch {
    return Response.json({error: "Notifications could not be loaded."}, {status: 503});
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await signedInUser(request);
    if (!user || user.is_anonymous) return Response.json({error: "Reader sign-in required."}, {status: 401});
    const payload = await request.json() as {id?: number; all?: boolean};
    let query = getSupabaseAdmin().from("notifications").update({read_at: new Date().toISOString()}).eq("user_id", user.id);
    if (!payload.all) query = query.eq("id", Number(payload.id));
    const {error} = await query;
    if (error) throw error;
    return Response.json({ok: true});
  } catch {
    return Response.json({error: "Notifications could not be updated."}, {status: 503});
  }
}
