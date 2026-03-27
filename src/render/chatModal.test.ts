// @vitest-environment jsdom
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { createChatModal } from './chatModal';

const makeCallbacks = () => ({
  onSend: vi.fn(),
  onClose: vi.fn(),
});

const openModal = (container: HTMLElement, callbacks = makeCallbacks()) => {
  const handle = createChatModal(container, callbacks);
  handle.open('actor-1', 'Guard', []);
  return { handle, callbacks };
};

describe('createChatModal', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('close button', () => {
    it('calls the onClose callback when the close button is clicked', () => {
      const { callbacks } = openModal(container);

      const closeBtn = container.querySelector<HTMLButtonElement>('.chat-modal-close-btn');
      closeBtn?.click();

      expect(callbacks.onClose).toHaveBeenCalledOnce();
    });

    it('hides the modal after close button click', () => {
      const { handle } = openModal(container);

      const closeBtn = container.querySelector<HTMLButtonElement>('.chat-modal-close-btn');
      closeBtn?.click();

      expect(handle.isOpen()).toBe(false);
    });
  });

  describe('Escape key', () => {
    it('calls the onClose callback when Escape is pressed', () => {
      const { callbacks } = openModal(container);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(callbacks.onClose).toHaveBeenCalledOnce();
    });

    it('hides the modal after Escape is pressed', () => {
      const { handle } = openModal(container);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(handle.isOpen()).toBe(false);
    });

    it('does not call onClose for other keys', () => {
      const { callbacks } = openModal(container);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(callbacks.onClose).not.toHaveBeenCalled();
    });

    it('does not fire Escape listener when modal is closed', () => {
      const { callbacks } = openModal(container);
      // Close via close button first.
      const closeBtn = container.querySelector<HTMLButtonElement>('.chat-modal-close-btn');
      closeBtn?.click();
      callbacks.onClose.mockClear();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(callbacks.onClose).not.toHaveBeenCalled();
    });
  });
});
