"use client";

import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {useParams} from "next/navigation";
import {getSupabaseBrowser} from "../../../lib/supabase-browser";
import "../beyond-the-algorithm/article.css";

type Essay = {slug: string; title: string; dek: string; content_html: string; published_at: string};
type Comment = {id: number; paragraph_id: string | null; parent_id: number | null; display_name: string; body: string; is_creator_reply: boolean; created_at: string};

export default function PublishedEssayPage() {
  const params = useParams<{slug: string}>();
  const slug = String(params?.slug || "");
  const [essay, setEssay] = useState<Essay | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [target, setTarget] = useState("end");
  const [parentId, setParentId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [publicName, setPublicName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("Loading essay...");

  const loadComments = useCallback(async () => {
    if (!slug) return;
    const response = await fetch(`/api/comments?essay_slug=${encodeURIComponent(slug)}`, {cache: "no-store"});
    const data = await response.json();
    if (response.ok) setComments(data.comments || []);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/works?slug=${encodeURIComponent(slug)}`, {cache: "no-store"}).then(async (response) => {
      const data = await response.json();
      if (!response.ok) return setMessage(data.error || "This essay could not be loaded.");
      setEssay(data.essay);
      setMessage("");
    }).catch(() => setMessage("This essay could not be loaded."));
    loadComments();
    const supabase = getSupabaseBrowser();
    supabase?.auth.getSession().then(async ({data}) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/profile", {headers: {authorization: `Bearer ${token}`}});
      if (response.ok) setPublicName((await response.json()).username || "Reader");
    });
  }, [slug, loadComments]);

  const blocks = useMemo(() => essay?.content_html.match(/<(p|h[1-6]|ul|ol|blockquote|table)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) || (essay?.content_html ? [essay.content_html] : []), [essay]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    const session = (await supabase?.auth.getSession())?.data.session;
    const headers: Record<string, string> = {"content-type": "application/json"};
    if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
    const response = await fetch("/api/comments", {method: "POST", headers, body: JSON.stringify({essay_slug: slug, paragraph_id: target, parent_id: parentId, body, anonymous: anonymous || !publicName})});
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Your question could not be posted.");
    setBody(""); setParentId(null); setMessage("Posted to the public discussion."); await loadComments();
  }

  if (!essay) return <main className="article-page"><header><a href="/" className="brand">Briley Castille</a></header><article><p>{message}</p></article></main>;

  return <main className="article-page"><header><a href="/" className="brand">Briley Castille</a><nav><a href="/">Publication</a><a href="/account">Sign in</a></nav></header><article><p className="eyebrow">Essay</p><h1>{essay.title}</h1><p className="article-dek">{essay.dek}</p><div className="byline">By Briley Castille <span>|</span> {new Date(essay.published_at).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"})}</div>{blocks.map((block, index) => <section key={index} id={`p-${index + 1}`}><div dangerouslySetInnerHTML={{__html: block}}/><button onClick={() => {setTarget(`p-${index + 1}`); setParentId(null); setMessage(""); document.querySelector(".comment-box")?.scrollIntoView({behavior: "smooth"});}}>Ask about this section</button></section>)}</article><aside className="comment-box"><p className="eyebrow">Reader conversation</p><h2>{target === "end" ? "Ask about the essay" : `Ask about section ${target.replace("p-", "")}`}</h2><p>{publicName ? `Posting as ${anonymous ? "Anonymous" : publicName}.` : "Posting as Anonymous. Sign in to use a protected public name."}</p><form onSubmit={submit}>{publicName && <label className="identity-choice"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)}/>Post anonymously</label>}<textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="Your question or comment"/><button className="button" type="submit">{parentId ? "Post reply" : "Post question"}</button>{message && <p role="status">{message}</p>}</form><div className="public-comments"><h2>Open discussion</h2>{comments.length === 0 ? <p>No questions yet.</p> : comments.map((comment) => <article key={comment.id} className={comment.parent_id ? "reply" : ""}><p><strong>{comment.display_name}</strong>{comment.is_creator_reply && <span> Briley, Creator</span>}</p><p>{comment.body}</p><small>{comment.paragraph_id && comment.paragraph_id !== "end" ? `Section ${comment.paragraph_id.replace("p-", "")}` : "Whole essay"}</small><button type="button" onClick={() => {setParentId(comment.id); setTarget(comment.paragraph_id || "end"); setMessage("");}}>Reply</button></article>)}</div></aside></main>;
}
