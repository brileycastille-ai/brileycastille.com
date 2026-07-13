import {requireCreator} from "../../../lib/creator-auth";

export async function POST(request: Request) {
  try {
    const creator = await requireCreator(request);
    if (!creator) return Response.json({error: "Creator access only."}, {status: 403});
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8_000_000) return Response.json({error: "Choose an image smaller than 8 MB."}, {status: 400});
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `about/briley-${Date.now()}.${extension}`;
    const {error} = await creator.supabase.storage.from("publication-media").upload(path, file, {contentType: file.type, upsert: true});
    if (error) throw error;
    const {data} = creator.supabase.storage.from("publication-media").getPublicUrl(path);
    return Response.json({url: data.publicUrl});
  } catch {
    return Response.json({error: "The photo could not be uploaded."}, {status: 503});
  }
}
