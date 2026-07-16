"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {getSupabaseBrowser} from "../lib/supabase-browser";
import "./home-engagement.css";

const builtInEssays = [
  { slug: "beyond-the-algorithm", title: "Beyond the Algorithm", tag: "Technology · Media", topics: ["Technology", "Media"], date: "July 2026", blurb: "Are we really informed, or do we only know ‘the truth’ we are given? A personal essay on social media, misinformation, and learning to question the feed.", readMinutes: 7 },
];

const topics = ["All", "Democracy", "Elections", "Congress", "Supreme Court", "Media", "International", "Technology", "Texas Politics"];

type ReportingItem = { id: number; title: string; description: string; status: string; expected: string; color: string; votes: number };

type EssayIdea = { id: number; title: string; stage: string; overview: string };

type ReaderQuestion = { id: number; question: string; context: string; display_name: string; votes: number };
type PublicationSettings = {about_heading: string; about_body: string; about_photo_url?: string | null};
type UploadedEssay = {slug: string; title: string; dek: string; topics: string[]; published_at: string; read_minutes: number};

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted] = useState<string[]>([]);
  const [ideaQuestions, setIdeaQuestions] = useState<Record<string, string>>({});
  const [ideaSent, setIdeaSent] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ReaderQuestion[]>([]);
  const [reporting, setReporting] = useState<ReportingItem[]>([]);
  const [essayIdeas, setEssayIdeas] = useState<EssayIdea[]>([]);
  const [settings, setSettings] = useState<PublicationSettings | null>(null);
  const [uploadedEssays, setUploadedEssays] = useState<UploadedEssay[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [signedInName, setSignedInName] = useState("");
  const [questionError, setQuestionError] = useState("");
  const loadQuestions = useCallback(async () => { try { const response = await fetch("/api/questions", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setQuestions(data.questions || []); setQuestionError(""); } catch { setQuestionError("Questions are temporarily unavailable."); } }, []);
  const loadPublication = useCallback(async () => {try {const response = await fetch("/api/publication", {cache: "no-store"}); const data = await response.json(); if (!response.ok) throw new Error(); setReporting(data.reporting || []); setEssayIdeas(data.ideas || []); setSettings(data.settings || null);} catch {}}, []);
  const loadEssays = useCallback(async () => {try {const response = await fetch("/api/works", {cache: "no-store"}); const data = await response.json(); if (!response.ok) throw new Error(); setUploadedEssays(data.essays || []);} catch {}}, []);
  useEffect(() => {
    const refreshContent = () => {
      if (document.visibilityState !== "visible") return;
      loadQuestions();
      loadPublication();
      loadEssays();
    };
    refreshContent();
    window.addEventListener("focus", refreshContent);
    document.addEventListener("visibilitychange", refreshContent);
    const supabase = getSupabaseBrowser();
    supabase?.auth.getSession().then(async ({data}) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/profile", {headers: {authorization: `Bearer ${token}`}});
      if (response.ok) {
        const profile = await response.json();
        setSignedInName(profile.username || "Reader");
      }
    });
    return () => {
      window.removeEventListener("focus", refreshContent);
      document.removeEventListener("visibilitychange", refreshContent);
    };
  }, [loadQuestions, loadPublication, loadEssays]);
  const essays = useMemo(() => {
    const uploaded = uploadedEssays.map((essay) => ({slug: essay.slug, title: essay.title, tag: essay.topics.join(" · "), topics: essay.topics, date: new Date(essay.published_at).toLocaleDateString("en-US", {month: "long", year: "numeric"}), blurb: essay.dek, readMinutes: essay.read_minutes}));
    const uploadedSlugs = new Set(uploaded.map((essay) => essay.slug));
    return [...uploaded, ...builtInEssays.filter((essay) => !uploadedSlugs.has(essay.slug))];
  }, [uploadedEssays]);
  const latestEssay = essays[0];
  const filtered = useMemo(() => filter === "All" ? essays : essays.filter((essay) => essay.topics.includes(filter)), [filter, essays]);

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    const response = await fetch("/api/questions", { method: "POST", headers: await requestHeaders(), body: JSON.stringify({ question, context: "standalone", anonymous }) });
    const data = await response.json();
    if (response.ok) { setSubmitted(true); setQuestion(""); setQuestionError(""); await loadQuestions(); } else { setQuestionError(data.error || "Your question could not be posted. Please try again."); }
  }

  async function submitIdeaQuestion(event: FormEvent, idea: string) {
    event.preventDefault();
    const value = ideaQuestions[idea]?.trim();
    if (!value) return;
    const response = await fetch("/api/questions", { method: "POST", headers: await requestHeaders(), body: JSON.stringify({ question: value, context: idea, anonymous }) });
    if (response.ok) { setIdeaSent((current) => [...current, idea]); setIdeaQuestions((current) => ({ ...current, [idea]: "" })); }
  }

  async function toggleVote(item: ReportingItem) {
    let voterKey = window.localStorage.getItem("briley-voter-key");
    if (!voterKey) {voterKey = crypto.randomUUID(); window.localStorage.setItem("briley-voter-key", voterKey);}
    const key = `reporting-${item.id}`;
    const active = !voted.includes(key);
    const response = await fetch(`/api/reporting/${item.id}/vote`, {method: "POST", headers: await requestHeaders(), body: JSON.stringify({voterKey, active})});
    if (response.ok) {const data = await response.json(); setVoted((current) => active ? [...current, key] : current.filter((value) => value !== key)); setReporting((current) => current.map((story) => story.id === item.id ? {...story, votes: data.votes} : story));} else setQuestionError("Your vote could not be saved. Please try again.");
  }
  async function toggleQuestionVote(item: ReaderQuestion) {
    let voterKey = window.localStorage.getItem("briley-voter-key");
    if (!voterKey) { voterKey = crypto.randomUUID(); window.localStorage.setItem("briley-voter-key", voterKey); }
    const key = `question-${item.id}`;
    const active = !voted.includes(key);
    const response = await fetch(`/api/questions/${item.id}/vote`, { method: "POST", headers: await requestHeaders(), body: JSON.stringify({ voterKey, active }) });
    if (response.ok) { const data = await response.json(); setVoted((current) => active ? [...current, key] : current.filter((value) => value !== key)); setQuestions((current) => current.map((question) => question.id === item.id ? { ...question, votes: data.votes } : question)); }
  }

  return (
    <main>
      <div className="topline"><span>Independent political journalism</span><span>Spring, Texas · Sunday, July 12, 2026</span></div>
      <header className="masthead" id="home">
        <a className="brand" href="#home">Briley Castille</a>
        <p>Political Journalist <i>·</i> Writer <i>·</i> Student</p>
      </header>
      <nav className="nav" aria-label="Main navigation">
        <a href="#home">Home</a><a href="#essays">Essays</a><a href="#progress">In progress</a><a href="#ideas">Essay ideas</a><a href="#ask">Question box</a><a href="/discussion">Discussion</a><a href="#about">About</a><a href="/account">Sign in</a>
      </nav>

      <section className="hero wrap">
        <p className="eyebrow">A publication for the politically curious</p>
        <h1>Understanding politics shouldn’t require <em>picking a side.</em></h1>
        <p className="dek">Clear reporting and thoughtful essays about the systems, decisions, and people shaping public life, without assuming what you believe.</p>
        <a className="text-link" href="#essays">Start reading <span>→</span></a>
      </section>

      <section className="latest wrap" aria-labelledby="latest-title">
        <div className="section-rule"><span>Latest essay</span><small>{latestEssay.tag} · {latestEssay.readMinutes} min read</small></div>
        <div className="latest-grid">
          <div className="cover-art" aria-hidden="true"><span>01</span><div className="orbit orbit-one"/><div className="orbit orbit-two"/><b>{latestEssay.title.toUpperCase()}</b></div>
          <article>
            <p className="eyebrow">{latestEssay.tag}</p>
            <h2 id="latest-title">{latestEssay.title}</h2>
            <p className="lead">{latestEssay.blurb}</p>
            <a className="button" href={`/essays/${latestEssay.slug}`}>Read the essay <span>→</span></a>
          </article>
        </div>
      </section>

      <section className="essays-section wrap" id="essays">
        <div className="section-heading"><div><p className="eyebrow">The archive</p><h2>Essays & explainers</h2></div><p>Reporting and analysis designed to make complicated issues easier to enter and harder to oversimplify.</p></div>
        <div className="filters" id="topics" role="group" aria-label="Filter essays by topic">
          {topics.map((topic) => <button key={topic} className={filter === topic ? "active" : ""} onClick={() => setFilter(topic)}>{topic}</button>)}
        </div>
        <div className="essay-grid">
          {filtered.map((essay, index) => <article className="essay-card" key={essay.title}>
            <div className="card-meta"><span>{essay.tag}</span><span>{essay.date}</span></div>
            <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
            <h3>{essay.title}</h3><p>{essay.blurb}</p><a href={`/essays/${essay.slug}`} aria-label={`Read ${essay.title}`}>Read <span>→</span></a>
          </article>)}
        </div>
      </section>

      <section className="progress-section" id="progress"><div className="wrap">
        <div className="section-heading light"><div><p className="eyebrow">Behind the reporting</p><h2>In progress</h2></div><p>Journalism takes time. Follow the research, interviews, and drafting behind the next stories.</p></div>
        <div className="progress-list">
          {reporting.length === 0 && <p className="empty-state">No reporting updates yet. Briley will post one here when the work begins.</p>}
          {reporting.map((story) => <article className="progress-card" key={story.id}>
            <div className="status-line"><span className={`dot ${story.color}`}/><span>{story.status}</span></div>
            <div className="progress-copy"><h3>{story.title}</h3><p>{story.description}</p></div><div className="expected"><small>Expected</small><strong>{story.expected}</strong></div>
            <button className={voted.includes(`reporting-${story.id}`) ? "voted" : ""} onClick={() => toggleVote(story)}><span>↑</span> {voted.includes(`reporting-${story.id}`) ? "You’re excited" : "I’m excited for this story"} · {story.votes}</button>
          </article>)}
        </div>
      </div></section>

      <section className="ideas-section wrap" id="ideas">
        <div className="section-heading"><div><p className="eyebrow">The editorial notebook</p><h2>Essay ideas</h2></div><p>See what Briley is considering before the reporting is finished. Your questions can shape what gets investigated and may be answered in the final essay.</p></div>
        <div className="ideas-grid">
          {essayIdeas.length === 0 && <p className="empty-state">No upcoming essay ideas have been posted yet.</p>}
          {essayIdeas.map((idea, index) => <article className="idea-card" key={idea.id}>
            <div className="idea-top"><span>Idea {String(index + 1).padStart(2, "0")}</span><small>{idea.stage}</small></div>
            <h3>{idea.title}</h3><p>{idea.overview}</p>
            <form onSubmit={(event) => submitIdeaQuestion(event, idea.title)}><label htmlFor={`idea-${index}`}>What should this essay answer?</label><div><input id={`idea-${index}`} value={ideaQuestions[idea.title] || ""} onChange={(event) => setIdeaQuestions((current) => ({...current, [idea.title]: event.target.value}))} placeholder="Ask a question about this idea…"/><button type="submit" aria-label={`Send a question about ${idea.title}`}>→</button></div>{ideaSent.includes(idea.title) && <small className="success">Sent to Briley’s reporting notebook.</small>}</form>
          </article>)}
        </div>
      </section>

      <section className="ask-section wrap" id="ask">
        <div className="ask-intro"><p className="eyebrow">Question box</p><h2>Ask Briley</h2><p className="ask-big">What political question do you want explained?</p><p>The best questions become full reported articles, not quick takes. Ask what you’ve always wanted someone to explain clearly.</p></div>
        <form className="question-form" onSubmit={submitQuestion}>
          <label htmlFor="question">Your question</label><textarea id="question" minLength={3} maxLength={500} required value={question} onChange={(e) => {setQuestion(e.target.value);setSubmitted(false);setQuestionError("")}} placeholder="Why does Congress never get anything done?" rows={5}/>
          <label className="anonymous-choice"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)}/>{signedInName ? `Post anonymously instead of as ${signedInName}` : "Post anonymously"}</label>
          <small className="posting-limit">Each account or guest identity may ask up to five questions in 24 hours.</small>
          <div><span>{question.length}/500</span><button className="button" type="submit">Submit question <span>→</span></button></div>
          {submitted && <p className="success" role="status">Question received. Thank you for being curious.</p>}{questionError && <p role="alert">{questionError}</p>}
        </form>
        <div className="reader-questions"><div className="section-rule"><span>Readers are asking</span><small>Vote for what Briley explains next</small></div>
          {questions.length === 0 && <p className="empty-state">No reader questions have been published yet.</p>}
          {questions.map((item, i) => <article key={item.id}><button onClick={() => toggleQuestionVote(item)} className={voted.includes(`question-${item.id}`) ? "voted" : ""} aria-label={`Vote for ${item.question}`}><span>↑</span>{item.votes}</button><span className="rank">{String(i + 1).padStart(2, "0")}</span><div><small>{item.context === "standalone" ? "Reader question" : item.context} | {item.display_name}</small><h3><a href={`/discussion#question-${item.id}`}>{item.question}</a></h3><a href={`/discussion#question-${item.id}`}>Read and reply</a></div></article>)}
        </div>
      </section>

      <section className="briefing"><div className="wrap briefing-grid"><div><p className="eyebrow">Coming soon</p><h2>The Weekly Briefing</h2><p>The email briefing is being built. No addresses are being collected yet, and nothing will be sent until the mailing system is ready.</p></div><div><p><strong>Planned format</strong></p><p>One essay. One recommendation. One statistic. One question from readers.</p></div></div></section>

      <section className="about wrap" id="about"><div className={settings?.about_photo_url ? "portrait has-photo" : "portrait"} aria-label="Portrait of Briley">{settings?.about_photo_url ? <img src={settings.about_photo_url} alt="Briley Castille"/> : <span>BC</span>}</div><article><p className="eyebrow">About the publication</p><h2>{settings?.about_heading || "I’ve always been fascinated by the questions behind the headlines."}</h2><p>{settings?.about_body || "I’m Briley Castille, a political writer from Spring, Texas. I am currently a freshman at Texas A&M University-Corpus Christi and participating in Texas A&M’s Program for System Admission, commonly known as PSA. I plan to continue my education in College Station."}</p><p>I started this publication because too much political coverage assumes you already know the rules or already chose a team. I want to slow the news down, explain where institutions came from, show why reasonable people disagree, and examine what a decision actually means for the people living with it. This is where I am learning to report in public, one careful question at a time.</p><a className="text-link" href="mailto:brileycastille@gmail.com">Say hello <span>→</span></a></article></section>

      <footer id="contact"><div className="wrap footer-grid"><div><a className="brand" href="#home">Briley Castille</a><p>Political journalism for the curious.</p></div><div><small>Explore</small><a href="#essays">Essays</a><a href="#progress">In progress</a><a href="#ask">Question box</a></div><div><small>Contact</small><a href="mailto:brileycastille@gmail.com">brileycastille@gmail.com</a><span>Spring, Texas</span></div></div><div className="wrap copyright"><span>© 2026 Briley Castille</span><span>Independent. Curious. Clear.</span><a href="/account?creator=1">Creator access</a></div></footer>
    </main>
  );
}

  async function requestHeaders() {
    const headers: Record<string, string> = {"content-type": "application/json"};
    const supabase = getSupabaseBrowser();
    let session = (await supabase?.auth.getSession())?.data.session || null;
    if (!session && supabase) session = (await supabase.auth.signInAnonymously()).data.session;
    if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
    return headers;
  }
