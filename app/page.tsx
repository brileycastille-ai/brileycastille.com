"use client";

import { FormEvent, useMemo, useState } from "react";

const essays = [
  { title: "Beyond the Algorithm", tag: "Technology", date: "July 2026", blurb: "Are we really informed, or do we only know ‘the truth’ we are given? A personal essay on social media, misinformation, and learning to question the feed.", featured: true },
];

const topics = ["All", "Democracy", "Elections", "Congress", "Supreme Court", "Media", "International", "Technology", "Texas Politics"];

const reporting = [
  { title: "Can Americans Still Agree on the Facts?", status: "Interviewing experts", expected: "Late July", color: "amber", votes: 128 },
  { title: "Should AI Fact-Check Politicians?", status: "Gathering research", expected: "Early August", color: "amber", votes: 94 },
  { title: "The Future of Local Journalism", status: "First draft finished", expected: "August", color: "green", votes: 76 },
];

const essayIdeas = [
  { title: "The Politics of Artificial Intelligence", stage: "Researching", overview: "Who should be responsible when an automated system makes a political decision, and what transparency should citizens be able to demand?" },
  { title: "Why America Doesn’t Trust the News", stage: "Planning interviews", overview: "A reported look at how trust fractured, what newsrooms misunderstand about skepticism, and whether credibility can be rebuilt." },
  { title: "What Actually Happens During Budget Negotiations", stage: "Building an outline", overview: "A plain-language trip through the deadlines, leverage, closed-door bargaining, and shutdown threats behind the federal budget." },
  { title: "Why Gen Z Gets Political News Differently", stage: "Collecting sources", overview: "How creators, clips, group chats, and algorithms changed not only where young people find politics, but what feels trustworthy." },
];

const questions = [
  { question: "Why does Congress never get anything done?", tag: "Congress", votes: 342 },
  { question: "Can the president actually lower gas prices?", tag: "Executive Power", votes: 281 },
  { question: "Why don’t third parties win?", tag: "Elections", votes: 219 },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [ideaQuestions, setIdeaQuestions] = useState<Record<string, string>>({});
  const [ideaSent, setIdeaSent] = useState<string[]>([]);
  const filtered = useMemo(() => filter === "All" ? essays : essays.filter((essay) => essay.tag === filter), [filter]);

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    const response = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, context: "standalone" }) });
    if (response.ok) { setSubmitted(true); setQuestion(""); }
  }

  async function submitIdeaQuestion(event: FormEvent, idea: string) {
    event.preventDefault();
    const value = ideaQuestions[idea]?.trim();
    if (!value) return;
    const response = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: value, context: idea }) });
    if (response.ok) { setIdeaSent((current) => [...current, idea]); setIdeaQuestions((current) => ({ ...current, [idea]: "" })); }
  }

  function toggleVote(title: string) {
    setVoted((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  return (
    <main>
      <div className="topline"><span>Independent political journalism</span><span>Spring, Texas · Sunday, July 12, 2026</span></div>
      <header className="masthead" id="home">
        <a className="brand" href="#home">Briley Castille</a>
        <p>Political Journalist <i>·</i> Writer <i>·</i> Student</p>
      </header>
      <nav className="nav" aria-label="Main navigation">
        <a href="#home">Home</a><a href="#essays">Essays</a><a href="#progress">In progress</a><a href="#ideas">Essay ideas</a><a href="#ask">Question box</a><a href="#about">About</a><a href="/account">Sign in</a>
      </nav>

      <section className="hero wrap">
        <p className="eyebrow">A publication for the politically curious</p>
        <h1>Understanding politics shouldn’t require <em>picking a side.</em></h1>
        <p className="dek">Clear reporting and thoughtful essays about the systems, decisions, and people shaping public life, without assuming what you believe.</p>
        <a className="text-link" href="#essays">Start reading <span>→</span></a>
      </section>

      <section className="latest wrap" aria-labelledby="latest-title">
        <div className="section-rule"><span>Latest essay</span><small>Technology · 7 min read</small></div>
        <div className="latest-grid">
          <div className="cover-art" aria-hidden="true"><span>01</span><div className="orbit orbit-one"/><div className="orbit orbit-two"/><b>THE<br/>FEED<br/>IS<br/>CHOOSING</b></div>
          <article>
            <p className="eyebrow">Technology & democracy</p>
            <h2 id="latest-title">Beyond the Algorithm</h2>
            <p className="lead">We like to think we choose what we read. But every scroll is shaped by a system deciding what deserves our attention and what disappears.</p>
            <p>Recommendation systems are now among the most powerful political editors in America. They have no newsroom, no front page, and almost no public accountability.</p>
            <a className="button" href="/essays/beyond-the-algorithm">Read the essay <span>→</span></a>
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
            <h3>{essay.title}</h3><p>{essay.blurb}</p><a href="/essays/beyond-the-algorithm" aria-label={`Read ${essay.title}`}>Read <span>→</span></a>
          </article>)}
        </div>
      </section>

      <section className="progress-section" id="progress"><div className="wrap">
        <div className="section-heading light"><div><p className="eyebrow">Behind the reporting</p><h2>In progress</h2></div><p>Journalism takes time. Follow the research, interviews, and drafting behind the next stories.</p></div>
        <div className="progress-list">
          {reporting.map((story) => <article className="progress-card" key={story.title}>
            <div className="status-line"><span className={`dot ${story.color}`}/><span>{story.status}</span></div>
            <h3>{story.title}</h3><div className="expected"><small>Expected</small><strong>{story.expected}</strong></div>
            <button className={voted.includes(story.title) ? "voted" : ""} onClick={() => toggleVote(story.title)}><span>↑</span> {voted.includes(story.title) ? "You’re excited" : "I’m excited for this story"} · {story.votes + (voted.includes(story.title) ? 1 : 0)}</button>
          </article>)}
        </div>
      </div></section>

      <section className="ideas-section wrap" id="ideas">
        <div className="section-heading"><div><p className="eyebrow">The editorial notebook</p><h2>Essay ideas</h2></div><p>See what Briley is considering before the reporting is finished. Your questions can shape what gets investigated and may be answered in the final essay.</p></div>
        <div className="ideas-grid">
          {essayIdeas.map((idea, index) => <article className="idea-card" key={idea.title}>
            <div className="idea-top"><span>Idea {String(index + 1).padStart(2, "0")}</span><small>{idea.stage}</small></div>
            <h3>{idea.title}</h3><p>{idea.overview}</p>
            <form onSubmit={(event) => submitIdeaQuestion(event, idea.title)}><label htmlFor={`idea-${index}`}>What should this essay answer?</label><div><input id={`idea-${index}`} value={ideaQuestions[idea.title] || ""} onChange={(event) => setIdeaQuestions((current) => ({...current, [idea.title]: event.target.value}))} placeholder="Ask a question about this idea…"/><button type="submit" aria-label={`Send a question about ${idea.title}`}>→</button></div>{ideaSent.includes(idea.title) && <small className="success">Sent to Briley’s reporting notebook.</small>}</form>
          </article>)}
        </div>
      </section>

      <section className="ask-section wrap" id="ask">
        <div className="ask-intro"><p className="eyebrow">Question box</p><h2>Ask Briley</h2><p className="ask-big">What political question do you want explained?</p><p>The best questions become full reported articles, not quick takes. Ask what you’ve always wanted someone to explain clearly.</p></div>
        <form className="question-form" onSubmit={submitQuestion}>
          <label htmlFor="question">Your question</label><textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why does Congress never get anything done?" rows={5}/>
          <div><span>{question.length}/240</span><button className="button" type="submit">Submit question <span>→</span></button></div>
          {submitted && <p className="success" role="status">Question received. Thank you for being curious.</p>}
        </form>
        <div className="reader-questions"><div className="section-rule"><span>Readers are asking</span><small>Vote for what Briley explains next</small></div>
          {questions.map((item, i) => <article key={item.question}><button onClick={() => toggleVote(item.question)} className={voted.includes(item.question) ? "voted" : ""} aria-label={`Vote for ${item.question}`}><span>↑</span>{item.votes + (voted.includes(item.question) ? 1 : 0)}</button><span className="rank">0{i + 1}</span><div><small>{item.tag}</small><h3>{item.question}</h3></div></article>)}
        </div>
      </section>

      <section className="briefing"><div className="wrap briefing-grid"><div><p className="eyebrow">Every Sunday morning</p><h2>The Weekly Briefing</h2><p>One essay. One recommendation. One statistic. One question from readers. A calmer way to keep up.</p></div><form onSubmit={(e) => {e.preventDefault(); if(email) setJoined(true)}}><label htmlFor="email">Email address</label><div><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/><button type="submit">Join the briefing →</button></div>{joined && <p role="status">You’re on the list. See you Sunday.</p>}</form></div></section>

      <section className="about wrap" id="about"><div className="portrait" aria-label="Portrait placeholder for Briley"><span>BC</span></div><article><p className="eyebrow">About the publication</p><h2>I’ve always been fascinated by the questions <em>behind</em> the headlines.</h2><p>I’m Briley Castille, a political writer from Spring, Texas. I am currently a freshman at Texas A&amp;M University-Corpus Christi and participating in Texas A&amp;M’s Program for System Admission, commonly known as PSA. I plan to continue my education in College Station.</p><p>I started this publication because too much political coverage assumes you already know the rules or already chose a team. I want to slow the news down, explain where institutions came from, show why reasonable people disagree, and examine what a decision actually means for the people living with it. This is where I am learning to report in public, one careful question at a time.</p><a className="text-link" href="mailto:brileycastille@gmail.com">Say hello <span>→</span></a></article></section>

      <footer id="contact"><div className="wrap footer-grid"><div><a className="brand" href="#home">Briley Castille</a><p>Political journalism for the curious.</p></div><div><small>Explore</small><a href="#essays">Essays</a><a href="#progress">In progress</a><a href="#ask">Question box</a></div><div><small>Contact</small><a href="mailto:brileycastille@gmail.com">brileycastille@gmail.com</a><span>Spring, Texas</span></div></div><div className="wrap copyright"><span>© 2026 Briley Castille</span><span>Independent. Curious. Clear.</span></div></footer>
    </main>
  );
}
