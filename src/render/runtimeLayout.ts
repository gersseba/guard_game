export const getRuntimeLayoutMarkup = (): string => {
  return `
  <div class="guard-game-shell">
    <header class="guard-game-header">
      <h1>Guard Game</h1>
      <p>Deterministic runtime bootstrap</p>
    </header>
    <main class="guard-game-main">
      <section class="guard-game-primary" aria-label="Gameplay and interaction">
        <section class="guard-game-panel guard-game-panel-viewport">
          <h2>Viewport</h2>
          <div id="viewport" class="guard-game-viewport"></div>
        </section>
        <section class="guard-game-panel guard-game-panel-briefing">
          <h2>Level Briefing</h2>
          <div id="level-briefing" class="guard-game-level-briefing"></div>
        </section>
      </section>
      <section class="guard-game-secondary" aria-label="Level controls and world state diagnostics">
        <section class="guard-game-panel">
          <h2>Level Controls</h2>
          <div id="level-controls" class="guard-game-level-controls"></div>
        </section>
        <section class="guard-game-panel">
          <h2>World State</h2>
          <pre id="world-state" class="guard-game-world-state"></pre>
        </section>
      </section>
    </main>
  </div>
  <div id="chat-modal-host"></div>
  <div id="outcome-overlay-host"></div>
`;
};