import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('runtime layout responsive styles', () => {
  it('defines a narrow-viewport media query that stacks primary panels', () => {
    const cssPath = new URL('../style.css', import.meta.url);
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
    expect(css).toMatch(/\.guard-game-main\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
    expect(css).toMatch(/\.guard-game-primary\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  });

  it('keeps level briefing section explicitly ordered for mobile reflow', () => {
    const cssPath = new URL('../style.css', import.meta.url);
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('.guard-game-panel-briefing');
    expect(css).toMatch(/\.guard-game-panel-briefing\s*\{[\s\S]*order:\s*2;/);
  });
});
