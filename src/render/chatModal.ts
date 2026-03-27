import type { ConversationMessage } from '../world/types';

export interface ChatModalCallbacks {
  onSend(message: string): void;
  onClose(): void;
}

export interface ChatModalHandle {
  /** Open the panel for the given actor, rendering existing history. */
  open(actorId: string, displayName: string, history: ConversationMessage[]): void;
  /** Close the panel programmatically. */
  close(): void;
  /** Append a single message bubble to the thread. */
  appendMessage(role: 'player' | 'assistant', text: string): void;
  /** Show or hide the loading indicator; disables/enables input while loading. */
  setLoading(loading: boolean): void;
  /** Returns true when the panel is visible. */
  isOpen(): boolean;
}

/**
 * Creates a chat-style modal panel mounted inside `container`.
 * Pure DOM manipulation — no game logic. All side effects flow through callbacks.
 */
export function createChatModal(
  container: HTMLElement,
  callbacks: ChatModalCallbacks,
): ChatModalHandle {
  let open = false;

  // --- Build DOM skeleton ---
  const overlay = document.createElement('div');
  overlay.className = 'chat-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Conversation');
  overlay.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'chat-modal';

  const header = document.createElement('div');
  header.className = 'chat-modal-header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'chat-modal-title';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'chat-modal-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close chat');

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const thread = document.createElement('div');
  thread.className = 'chat-modal-thread';
  thread.setAttribute('aria-live', 'polite');

  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-modal-loading';
  loadingEl.textContent = '…';
  loadingEl.setAttribute('aria-label', 'Waiting for response');
  loadingEl.hidden = true;

  const inputArea = document.createElement('div');
  inputArea.className = 'chat-modal-input-area';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chat-modal-input';
  input.placeholder = 'Type a message…';
  input.setAttribute('autocomplete', 'off');

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'chat-modal-send-btn';
  sendBtn.textContent = 'Send';

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);

  modal.appendChild(header);
  modal.appendChild(thread);
  modal.appendChild(loadingEl);
  modal.appendChild(inputArea);
  overlay.appendChild(modal);
  container.appendChild(overlay);

  // --- Internal helpers ---

  function appendBubble(role: 'player' | 'assistant', text: string): void {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${role}`;

    const textEl = document.createElement('p');
    textEl.className = 'chat-bubble-text';
    textEl.textContent = text;

    bubble.appendChild(textEl);
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
  }

  function releaseModalFocus(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && overlay.contains(activeElement)) {
      activeElement.blur();
    }

    if (document.activeElement !== document.body) {
      document.body.focus();
    }
  }

  function closePanel(): void {
    open = false;
    overlay.hidden = true;
    document.removeEventListener('keydown', escapeListener);
    callbacks.onClose();
    releaseModalFocus();
  }

  const escapeListener = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closePanel();
    }
  };

  function submitMessage(): void {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    callbacks.onSend(text);
  }

  // --- Event wiring ---

  closeBtn.addEventListener('click', closePanel);
  sendBtn.addEventListener('click', submitMessage);

  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitMessage();
    }
    // Prevent movement keys from reaching the global keyboard handler.
    event.stopPropagation();
  });

  input.addEventListener('keyup', (event: KeyboardEvent) => {
    event.stopPropagation();
  });

  // --- Public API ---

  return {
    open(actorId: string, displayName: string, history: ConversationMessage[]): void {
      void actorId; // stored externally by caller; included here for traceability
      open = true;
      titleEl.textContent = displayName;

      // Clear previous thread content.
      while (thread.firstChild) {
        thread.removeChild(thread.firstChild);
      }

      for (const msg of history) {
        appendBubble(msg.role, msg.text);
      }

      overlay.hidden = false;
      document.addEventListener('keydown', escapeListener);
      input.disabled = false;
      sendBtn.disabled = false;
      loadingEl.hidden = true;
      input.value = '';
      input.focus();
    },

    close(): void {
      closePanel();
    },

    appendMessage(role: 'player' | 'assistant', text: string): void {
      appendBubble(role, text);
    },

    setLoading(loading: boolean): void {
      loadingEl.hidden = !loading;
      input.disabled = loading;
      sendBtn.disabled = loading;
      if (!loading) {
        input.focus();
      }
    },

    isOpen(): boolean {
      return open;
    },
  };
}
