// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createActionModal } from './actionModal';

describe('action modal', () => {
  it('closes immediately on Escape', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);

    const callbacks = {
      onActionSelected: vi.fn(),
      onClose: vi.fn(),
    };

    const modal = createActionModal(hostElement, callbacks);
    modal.open('Guard One');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    hostElement.remove();
  });

  it('activates the focused action button with Enter', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);

    const callbacks = {
      onActionSelected: vi.fn(),
      onClose: vi.fn(),
    };

    const modal = createActionModal(hostElement, callbacks);
    modal.open('Guard One');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(callbacks.onActionSelected).toHaveBeenCalledWith('inventory');
    hostElement.remove();
  });

  it('routes keyboard focus to Back and closes on Enter', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);

    const callbacks = {
      onActionSelected: vi.fn(),
      onClose: vi.fn(),
    };

    const modal = createActionModal(hostElement, callbacks);
    modal.open('Guard One');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    hostElement.remove();
  });
});