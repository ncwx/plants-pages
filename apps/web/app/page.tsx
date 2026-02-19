export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Plants & Pages</p>
        <h1>Grow a garden with every book you finish.</h1>
        <p className="subhead">
          Log reading sessions, earn seeds, and build a living bookshelf that
          blooms with your progress.
        </p>
      </section>
      <section className="grid">
        <div>
          <h2>Track</h2>
          <p>Capture reading minutes, pages, and streaks in seconds.</p>
        </div>
        <div>
          <h2>Plant</h2>
          <p>Convert XP into seeds to unlock lush, collectible plants.</p>
        </div>
        <div>
          <h2>Share</h2>
          <p>Visit friends' gardens and celebrate milestones together.</p>
        </div>
      </section>
    </main>
  );
}