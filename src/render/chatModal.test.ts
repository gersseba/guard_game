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

  it('is hidden by default before open is called', () => {
    createChatModal(container, makeCallbacks());

    const overlay = container.querySelector<HTMLDivElement>('.chat-modal-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.hidden).toBe(true);
    expect(overlay?.style.display).toBe('none');
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

    it('removes modal focus after the close button ends the conversation', () => {
      openModal(container);

      const closeBtn = container.querySelector<HTMLButtonElement>('.chat-modal-close-btn');
      closeBtn?.focus();

      expect(document.activeElement).toBe(closeBtn);

      closeBtn?.click();

      expect(document.activeElement).toBe(document.body);
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

    it('removes modal focus after Escape ends the conversation', () => {
      openModal(container);

      const input = container.querySelector<HTMLInputElement>('.chat-modal-input');
      expect(document.activeElement).toBe(input);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(document.activeElement).toBe(document.body);
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

  describe('backdrop click', () => {
    it('closes the modal when the backdrop is clicked', () => {
      const { callbacks, handle } = openModal(container);

      const overlay = container.querySelector<HTMLDivElement>('.chat-modal-overlay');
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(callbacks.onClose).toHaveBeenCalledOnce();
      expect(handle.isOpen()).toBe(false);
    });
  });

  describe('status slot states', () => {
    it('shows error text in the loading/status slot when setError is called', () => {
      const { handle } = openModal(container);

      handle.setError('Request failed. Please try again.');

      const status = container.querySelector<HTMLDivElement>('.chat-modal-loading');
      expect(status?.hidden).toBe(false);
      expect(status?.textContent).toBe('Request failed. Please try again.');
      expect(status?.getAttribute('aria-label')).toBe('Error');
    });

    it('hides the loading/status slot when setError is called with null', () => {
      const { handle } = openModal(container);
      handle.setError('Request failed. Please try again.');

      handle.setError(null);

      const status = container.querySelector<HTMLDivElement>('.chat-modal-loading');
      expect(status?.hidden).toBe(true);
    });

    it('clears visible error state when loading starts', () => {
      const { handle } = openModal(container);
      handle.setError('Request failed. Please try again.');

      handle.setLoading(true);

      const status = container.querySelector<HTMLDivElement>('.chat-modal-loading');
      expect(status?.hidden).toBe(false);
      expect(status?.textContent).toBe('…');
      expect(status?.getAttribute('aria-label')).toBe('Waiting for response');
    });

    it('replaces loading indicator with error text when setError is called', () => {
      const { handle } = openModal(container);
      handle.setLoading(true);

      handle.setError('Request failed. Please try again.');

      const status = container.querySelector<HTMLDivElement>('.chat-modal-loading');
      expect(status?.hidden).toBe(false);
      expect(status?.textContent).toBe('Request failed. Please try again.');
      expect(status?.getAttribute('aria-label')).toBe('Error');
    });

    it('clears prior error state when the modal is reopened', () => {
      const callbacks = makeCallbacks();
      const handle = createChatModal(container, callbacks);
      handle.open('actor-1', 'Guard', []);
      handle.setError('Request failed. Please try again.');
      handle.close();

      handle.open('actor-1', 'Guard', []);

      const status = container.querySelector<HTMLDivElement>('.chat-modal-loading');
      expect(status?.hidden).toBe(true);
      expect(status?.textContent).toBe('…');
      expect(status?.getAttribute('aria-label')).toBe('Waiting for response');
    });
  });
});
