"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {getSupabaseBrowser} from "../../lib/supabase-browser";
import "./discussion.css";

type Question = { id: number; question: string; context: string; display_name: string; votes: number; created_at: string };
type Comment = { id: number; paragraph_id: string | null; parent_id: number | null; display_name: string; body: string; is_creator_reply: boolean; created_at: string };

export default function DiscussionPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [publicName, setPublicName] = useState("");
  const [anonymous, setAnonymous] = useState<Record<number, boolean>>({});
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [questionResponse, commentResponse] = await Promise.all([
        fetch("/api/questions", { cache: "no-store" }),
        fetch("/api/comments?essay_slug=question-box", { cache: "no-store" }),
      ]);
      const questionData = await questionResponse.json();
      const commentData = await commentResponse.json();
      if (!questionResponse.ok || !commentResponse.ok) throw new Error();
      setQuestions(questionData.questions || []);
      setComments(commentData.comments || []);
    } catch {
      setMessage("The discussion is temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    load();
    const supabase = getSupabaseBrowser();
    supabase?.auth.getSession().then(async ({data}) => {if (!data.session?.access_token) return; const response = await fetch("/api/profile", {headers: {authorization: `Bearer ${data.session.access_token}`}}); if(response.ok){const profile = await response.json(); setPublicName(profile.username || "Reader");}});
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function reply(event: FormEvent, questionId: number) {
    event.preventDefault();
    const body = replies[questionId]?.trim();
    if (!body) return;
    const supabase = getSupabaseBrowser();
    const session = (await supabase?.auth.getSession())?.data.session;
    const headers: Record<string, string> = {"content-type": "application/json"};
    if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers,
      body: JSON.stringify({ essay_slug: "question-box", paragraph_id: `question-${questionId}`, body, anonymous: anonymous[questionId] !== false }),
    });
    if (response.ok) {
      setReplies((current) => ({ ...current, [questionId]: "" }));
      setMessage("Your reply is now public.");
      await load();
    } else setMessage("Your reply could not be posted. Please try again.");
  }

  return <main className="discussion-page">
    <header><a className="brand" href="/">Briley Castille</a><nav><a href="/">Publication</a><a href="/account">Sign in</a></nav></header>
    <section className="discussion-intro"><p className="eyebrow">Reader conversation</p><h1>Open Discussion</h1><p>Read the questions people are asking, add your perspective, or help make the question clearer. Replies are public. You may use your name or remain anonymous.</p><a className="button" href="/#ask">Ask a new question</a></section>
    <section className="discussion-list">
      {message && <p className="discussion-message" role="status">{message}</p>}
      {questions.length === 0 && <div className="discussion-empty"><h2>No questions yet.</h2><p>Be the first person to ask something Briley should explain.</p></div>}
      {questions.map((question) => {
        const thread = comments.filter((comment) => comment.paragraph_id === `question-${question.id}`);
        return <article className="discussion-thread" id={`question-${question.id}`} key={question.id}>
          <div className="question-heading"><span>{question.votes} votes</span><div><small>{question.context === "standalone" ? "Reader question" : question.context} | {question.display_name}</small><h2>{question.question}</h2></div></div>
          <div className="thread-replies">{thread.length === 0 && <p>No replies yet.</p>}{thread.map((comment) => <div className={comment.is_creator_reply ? "thread-reply creator" : "thread-reply"} key={comment.id}><div><strong>{comment.display_name}</strong>{comment.is_creator_reply && <span>Creator</span>}<time>{new Date(comment.created_at).toLocaleDateString()}</time></div><p>{comment.body}</p></div>)}</div>
          <form onSubmit={(event) => reply(event, question.id)}><label>Join this discussion</label><p>{publicName ? `Posting as ${anonymous[question.id] === false ? publicName : "Anonymous"}` : "Posting as Anonymous. Sign in to use a protected public name."}</p>{publicName && <label className="identity-choice"><input type="checkbox" checked={anonymous[question.id] !== false} onChange={(event) => setAnonymous((current) => ({...current, [question.id]: event.target.checked}))}/>Post anonymously</label>}<textarea required rows={3} value={replies[question.id] || ""} onChange={(event) => setReplies((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Write a public reply"/><button type="submit">Post reply</button></form>
        </article>;
      })}
    </section>
  </main>;
}
