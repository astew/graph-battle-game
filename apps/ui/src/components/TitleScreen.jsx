import React from 'react';

export default function TitleScreen({ onNewGame }) {
  return (
    <section className="title-screen card">
      <p className="eyebrow">Mode Select</p>
      <h2>Welcome to Graph Battle</h2>
      <p className="lede">
        Launch a new 5-player match on a procedurally carved grid to explore the core rule set.
      </p>
      <button type="button" className="primary-button" onClick={onNewGame}>
        New Game
      </button>
    </section>
  );
}
