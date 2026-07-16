"use client";

import {FormEvent, useCallback, useEffect, useState} from "react";
import {getSupabaseBrowser} from "../../lib/supabase-browser";
import {ESSAY_TOPICS} from "../../lib/essay-topics";
import "./studio.css";
import "./moderation.css";

type Question = {id: number; question: string; context: string; display_name: string; created_at: string};
type Comment = {id: number; essay_slug: string; paragraph_id: string | null; display_name: string; body: string; created_at: string; parent_id?: number | null; is_creator_reply?: boolean};
type Idea = {id: number; title: string; overview: string; stage: string};
type PublishedEssay = {slug: string; title: string; dek: string; topics: string[]; published_at: string};
type Reporting = {id: number; title: string; description: string; status: string; expected: string; color: string};
type Reader = {id: string; email: string; created_at: string; confirmed_at?: string | null};
type Settings = {about_heading: string; about_body: string; about_photo_url?: string | null};

export default function Studio() {
  const [title, setTitle] = useState("");
  const [essayDescription, setEssayDescription] = useState("");
  const [essayTopics, setEssayTopics] = useState<string[]>([]);
  const [editingEssaySlug, setEditingEssaySlug] = useState("");
  const [editingEssayDescription, setEditingEssayDescription] = useState("");
  const [editingEssayTopics, setEditingEssayTopics] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [publishedEssays, setPublishedEssays] = useState<PublishedEssay[]>([]);
  const [reporting, setReporting] = useState<Reporting[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [settings, setSettings] = useState<Settings>({about_heading: "", about_body: "", about_photo_url: null});
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaStage, setIdeaStage] = useState("Idea");
  const [progressTitle, setProgressTitle] = useState("");
  const [progressDescription, setProgressDescription] = useState("");
  const [progressStatus, setProgressStatus] = useState("Planning");
  const [progressExpected, setProgressExpected] = useState("To be announced");
  const [editingProgressId, setEditingProgressId] = useState<number | null>(null);
  const [aboutPhoto, setAboutPhoto] = useState<File | null>(null);
  const [answerSlugs, setAnswerSlugs] = useState<Record<number, string>>({});

  const loadStudio = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/creator", {headers: {authorization: `Bearer ${accessToken}`}, cache: "no-store"});
    const data = await response.json();
    if (response.ok) {
      setQuestions(data.questions || []);
      setComments(data.comments || []);
      setIdeas(data.ideas || []);
      setPublishedEssays(data.essays || []);
      setReporting(data.reporting || []);
      setReaders(data.users || []);
      setSettings(data.settings || {about_heading: "", about_body: "", about_photo_url: null});
      setAuthorized(true);
      setMessage("");
    } else {
      setAuthorized(false);
      setMessage(data.error || "Creator access could not be confirmed.");
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return setMessage("The sign-in service is temporarily unavailable.");
    supabase.auth.getSession().then(({data}) => {
      const accessToken = data.session?.access_token;
      if (!accessToken) return setMessage("Sign in with the creator account first.");
      setToken(accessToken);
      loadStudio(accessToken);
    });
  }, [loadStudio]);

  async function creatorRequest(body: Record<string, string>) {
    const response = await fetch("/api/publication", {method: "POST", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The update could not be saved.");
    await loadStudio(token);
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!token || !authorized) return setMessage("Creator sign-in is required.");
    if (!file) return setMessage("Choose a Word document first.");
    if (!essayTopics.length) return setMessage("Choose at least one publication topic.");
    if (file.size > 8 * 1024 * 1024) return setMessage("The Word document must be smaller than 8 MB.");
    setPublishing(true);
    setMessage("Publishing your essay...");
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("description", essayDescription);
      form.set("topics", JSON.stringify(essayTopics));
      form.set("file", file);
      const response = await fetch("/api/works", {method: "POST", headers: {authorization: `Bearer ${token}`}, body: form});
      const data = await response.json().catch(() => ({error: "The publishing service returned an unreadable response."}));
      if (!response.ok) return setMessage(data.error || "The essay could not be published.");
      setMessage(`Published. Your essay is live at /essays/${data.slug}`);
      setTitle("");
      setEssayDescription("");
      setEssayTopics([]);
      setFile(null);
      setUploadKey((current) => current + 1);
    } catch {
      setMessage("The upload was interrupted. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function addIdea(event: FormEvent) {
    event.preventDefault();
    try {await creatorRequest({type: "idea", title: ideaTitle, description: ideaDescription, stage: ideaStage}); setIdeaTitle(""); setIdeaDescription(""); setMessage("Essay idea posted.");} catch (error) {setMessage(error instanceof Error ? error.message : "The idea could not be posted.");}
  }

  function editEssayDetails(essay: PublishedEssay) {
    setEditingEssaySlug(essay.slug);
    setEditingEssayDescription(essay.dek || "");
    setEditingEssayTopics(essay.topics || []);
    setMessage(`Editing topics for ${essay.title}.`);
  }

  function cancelEssayEdit() {
    setEditingEssaySlug("");
    setEditingEssayDescription("");
    setEditingEssayTopics([]);
    setMessage("");
  }

  async function saveEssayDetails(event: FormEvent) {
    event.preventDefault();
    if (!editingEssaySlug || !editingEssayTopics.length) return setMessage("Choose at least one publication topic.");
    const response = await fetch("/api/works", {method: "PATCH", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify({slug: editingEssaySlug, description: editingEssayDescription, topics: editingEssayTopics})});
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "The essay details could not be updated.");
    await loadStudio(token);
    setEditingEssaySlug(""); setEditingEssayDescription(""); setEditingEssayTopics([]);
    setMessage("Essay topics and description updated.");
  }

  async function addProgress(event: FormEvent) {
    event.preventDefault();
    try {
      await creatorRequest({type: editingProgressId ? "reporting_update" : "reporting", id: editingProgressId ? String(editingProgressId) : "", title: progressTitle, description: progressDescription, status: progressStatus, expected: progressExpected});
      setProgressTitle(""); setProgressDescription(""); setProgressStatus("Planning"); setProgressExpected("To be announced"); setEditingProgressId(null);
      setMessage(editingProgressId ? "In-progress story updated." : "In-progress story posted.");
    } catch (error) {setMessage(error instanceof Error ? error.message : "The progress item could not be saved.");}
  }

  function editProgress(item: Reporting) {
    setEditingProgressId(item.id);
    setProgressTitle(item.title);
    setProgressDescription(item.description);
    setProgressStatus(item.status);
    setProgressExpected(item.expected);
    setMessage("Editing the selected in-progress story.");
  }

  function cancelProgressEdit() {
    setEditingProgressId(null);
    setProgressTitle("");
    setProgressDescription("");
    setProgressStatus("Planning");
    setProgressExpected("To be announced");
    setMessage("");
  }

  async function saveAbout(event: FormEvent) {
    event.preventDefault();
    try {
      let photoUrl = settings.about_photo_url || "";
      if (aboutPhoto) {
        const form = new FormData();
        form.set("file", aboutPhoto);
        const upload = await fetch("/api/media", {method: "POST", headers: {authorization: `Bearer ${token}`}, body: form});
        const data = await upload.json();
        if (!upload.ok) throw new Error(data.error || "The photo could not be uploaded.");
        photoUrl = data.url;
      }
      await creatorRequest({type: "about", heading: settings.about_heading, body: settings.about_body, photoUrl});
      setAboutPhoto(null);
      setMessage("About section updated.");
    } catch (error) {setMessage(error instanceof Error ? error.message : "The About section could not be saved.");}
  }

  async function removeItem(type: "idea" | "reporting", id: number) {
    if (!window.confirm("Remove this item from the publication?")) return;
    const response = await fetch(`/api/publication?type=${type}&id=${id}`, {method: "DELETE", headers: {authorization: `Bearer ${token}`}});
    const data = await response.json();
    setMessage(response.ok ? "Item removed." : data.error);
    if (response.ok) await loadStudio(token);
  }

  async function reply(comment: Comment) {
    const body = replies[comment.id]?.trim();
    if (!body || !token) return;
    const response = await fetch("/api/comments", {method: "POST", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify({essay_slug: comment.essay_slug, paragraph_id: comment.paragraph_id, parent_id: comment.id, body})});
    if (response.ok) {setReplies((current) => ({...current, [comment.id]: ""})); await loadStudio(token);} else setMessage("Your reply could not be posted.");
  }

  async function deleteQuestion(question: Question) {
    if (!token || !window.confirm("Delete this question and its discussion replies?")) return;
    const response = await fetch(`/api/questions/${question.id}`, {method: "DELETE", headers: {authorization: `Bearer ${token}`}});
    const data = await response.json();
    if (response.ok) {setMessage("Question deleted."); await loadStudio(token);} else setMessage(data.error || "The question could not be deleted.");
  }

  async function deleteComment(comment: Comment) {
    if (!token || !window.confirm("Delete this comment and any replies beneath it?")) return;
    const response = await fetch(`/api/comments/${comment.id}`, {method: "DELETE", headers: {authorization: `Bearer ${token}`}});
    const data = await response.json();
    if (response.ok) {setMessage("Comment deleted."); await loadStudio(token);} else setMessage(data.error || "The comment could not be deleted.");
  }

  async function markAnswered(question: Question) {
    const slug = answerSlugs[question.id]?.trim();
    if (!slug) return setMessage("Enter the essay address name first.");
    const response = await fetch(`/api/questions/${question.id}/answer`, {method: "POST", headers: {"content-type": "application/json", authorization: `Bearer ${token}`}, body: JSON.stringify({slug})});
    const data = await response.json();
    setMessage(response.ok ? "The reader was notified that their question was answered." : data.error || "The question could not be updated.");
    if (response.ok) await loadStudio(token);
  }

  return <main className="studio"><a href="/">Back to publication</a><section><p className="eyebrow">Private newsroom</p><h1>Creator Studio</h1><p>Only <strong>brileycastille@gmail.com</strong> can publish, edit the publication, reply as Briley, or remove content.</p>{message && <p className="studio-message" role="status">{message}</p>}{!authorized && <p><a className="button" href="/account?creator=1">Go to Creator sign in</a></p>}{authorized && <>
    <div className="studio-panel"><h2>Publish a new work</h2><p>Enter the title here. You do not need to repeat the title inside the Word document. The website formats it automatically.</p><form onSubmit={publish}><label>Essay title<input required value={title} onChange={(event) => setTitle(event.target.value)}/></label><label>Short description<textarea required maxLength={500} rows={4} value={essayDescription} onChange={(event) => setEssayDescription(event.target.value)} placeholder="A short summary that will appear on the homepage and essay archive."/></label><small>{essayDescription.length}/500 characters</small><fieldset><legend>Publication topics</legend><p>Choose every topic that applies. The first selected topic is treated as the main theme.</p>{ESSAY_TOPICS.map((topic) => <label key={topic}><input type="checkbox" checked={essayTopics.includes(topic)} onChange={(event) => setEssayTopics((current) => event.target.checked ? [...current, topic] : current.filter((value) => value !== topic))}/>{topic}</label>)}</fieldset><label>Word document<input key={uploadKey} required type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)}/></label><small>Use a .docx file smaller than 8 MB.</small><button className="button" type="submit" disabled={publishing}>{publishing ? "Publishing..." : "Publish essay"}</button></form></div>
    <div className="studio-panel"><h2>Published essays</h2><p>Change an essay’s description or topics at any time without uploading the document again.</p>{publishedEssays.length === 0 ? <p>No uploaded essays yet.</p> : publishedEssays.map((essay) => <article key={essay.slug}><small>{(essay.topics || []).join(" | ") || "No topics selected"}</small><h3>{essay.title}</h3><p>{essay.dek}</p><button type="button" onClick={() => editEssayDetails(essay)}>Edit topics and description</button>{editingEssaySlug === essay.slug && <form onSubmit={saveEssayDetails}><label>Description<textarea required maxLength={500} rows={4} value={editingEssayDescription} onChange={(event) => setEditingEssayDescription(event.target.value)}/></label><fieldset><legend>Publication topics</legend>{ESSAY_TOPICS.map((topic) => <label key={topic}><input type="checkbox" checked={editingEssayTopics.includes(topic)} onChange={(event) => setEditingEssayTopics((current) => event.target.checked ? [...current, topic] : current.filter((value) => value !== topic))}/>{topic}</label>)}</fieldset><div className="moderation-actions"><button className="button" type="submit">Save essay details</button><button type="button" onClick={cancelEssayEdit}>Cancel</button></div></form>}</article>)}</div>
    <div className="studio-panel"><h2>Post an essay idea</h2><p>Add the working title and a description of what the essay may contain.</p><form onSubmit={addIdea}><label>Title<input required value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)}/></label><label>Description<textarea required rows={5} value={ideaDescription} onChange={(event) => setIdeaDescription(event.target.value)}/></label><label>Stage<input value={ideaStage} onChange={(event) => setIdeaStage(event.target.value)}/></label><button className="button" type="submit">Post essay idea</button></form>{ideas.map((idea) => <article key={idea.id}><small>{idea.stage}</small><h3>{idea.title}</h3><p>{idea.overview}</p><button className="danger" type="button" onClick={() => removeItem("idea", idea.id)}>Remove idea</button></article>)}</div>
    <div className="studio-panel"><h2>{editingProgressId ? "Edit an in-progress story" : "Post an in-progress story"}</h2><p>Update the status whenever your work changes. Votes stay attached to the same story.</p><form onSubmit={addProgress}><label>Title<input required value={progressTitle} onChange={(event) => setProgressTitle(event.target.value)}/></label><label>Description<textarea required rows={5} value={progressDescription} onChange={(event) => setProgressDescription(event.target.value)}/></label><label>Current status<input required value={progressStatus} onChange={(event) => setProgressStatus(event.target.value)} placeholder="First draft underway"/></label><label>Expected date<input value={progressExpected} onChange={(event) => setProgressExpected(event.target.value)}/></label><div className="moderation-actions"><button className="button" type="submit">{editingProgressId ? "Save changes" : "Post in progress"}</button>{editingProgressId && <button type="button" onClick={cancelProgressEdit}>Cancel edit</button>}</div></form>{reporting.map((item) => <article key={item.id}><small>{item.status} | {item.expected}</small><h3>{item.title}</h3><p>{item.description}</p><div className="moderation-actions"><button type="button" onClick={() => editProgress(item)}>Edit</button><button className="danger" type="button" onClick={() => removeItem("reporting", item.id)}>Remove item</button></div></article>)}</div>
    <div className="studio-panel"><h2>Edit About Briley</h2><form onSubmit={saveAbout}><label>About heading<input required value={settings.about_heading} onChange={(event) => setSettings((current) => ({...current, about_heading: event.target.value}))}/></label><label>Introduction<textarea required rows={8} value={settings.about_body} onChange={(event) => setSettings((current) => ({...current, about_body: event.target.value}))}/></label><label>About photo<input type="file" accept="image/*" onChange={(event) => setAboutPhoto(event.target.files?.[0] || null)}/></label>{settings.about_photo_url && <img className="studio-photo" src={settings.about_photo_url} alt="Current About photo"/>}<button className="button" type="submit">Save About section</button></form></div>
    <div className="studio-panel"><h2>Reader accounts</h2><p>This private list shows email accounts that registered. Anonymous guest sessions are not listed.</p>{readers.length === 0 ? <p>No registered readers yet.</p> : readers.map((reader) => <article key={reader.id}><strong>{reader.email}</strong><p>{reader.confirmed_at ? "Email verified" : "Waiting for email verification"} | Joined {new Date(reader.created_at).toLocaleDateString()}</p></article>)}</div>
    <div className="studio-panel"><h2>Standalone questions</h2>{questions.length === 0 ? <p>No reader questions yet.</p> : questions.map((question) => <article key={question.id}><small>{question.context} | {question.display_name}</small><p>{question.question}</p><label>Essay address name<input value={answerSlugs[question.id] || ""} onChange={(event) => setAnswerSlugs((current) => ({...current, [question.id]: event.target.value}))} placeholder="beyond-the-algorithm"/></label><div className="moderation-actions"><button type="button" onClick={() => markAnswered(question)}>Mark answered and notify reader</button><button className="danger" type="button" onClick={() => deleteQuestion(question)}>Delete question</button></div></article>)}</div>
    <div className="studio-panel"><h2>Comments and replies</h2><p>Use Delete to remove spam, harassment, or offensive content from the public website.</p>{comments.length === 0 ? <p>No comments yet.</p> : comments.map((comment) => <article key={comment.id}><small>{comment.essay_slug}{comment.paragraph_id && comment.paragraph_id !== "end" ? ` | ${comment.paragraph_id}` : " | whole essay"}</small><h3>{comment.display_name}</h3><p>{comment.body}</p><div className="moderation-actions"><button className="danger" type="button" onClick={() => deleteComment(comment)}>Delete comment</button></div><textarea rows={3} value={replies[comment.id] || ""} onChange={(event) => setReplies((current) => ({...current, [comment.id]: event.target.value}))} placeholder="Reply as Briley"/><button type="button" onClick={() => reply(comment)}>Post creator reply</button></article>)}</div>
  </>}</section></main>;
}
