export type ActionModalAction = 'chat' | 'inventory';

export interface ActionModalCallbacks {
  onActionSelected(action: ActionModalAction): void;
  onClose(): void;
}

export interface ActionModalHandle {
  open(targetDisplayName: string): void;
  close(): void;
}

export const createActionModal = (
  hostElement: HTMLElement,
  callbacks: ActionModalCallbacks,
): ActionModalHandle => {
  let overlayElement: HTMLDivElement | null = null;
  let escapeHandler: ((event: KeyboardEvent) => void) | null = null;
  let actionButtons: HTMLButtonElement[] = [];
  let focusedButtonIndex = 0;

  const close = (): void => {
    if (overlayElement && overlayElement.parentElement === hostElement) {
      hostElement.removeChild(overlayElement);
    }
    overlayElement = null;
    actionButtons = [];
    focusedButtonIndex = 0;

    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler, true);
      escapeHandler = null;
    }
  };

  const buildButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-modal-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  };

  return {
    open(targetDisplayName: string): void {
      close();

      const overlay = document.createElement('div');
      overlay.className = 'action-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', `Interact with ${targetDisplayName}`);

      const modal = document.createElement('div');
      modal.className = 'action-modal';

      const title = document.createElement('h2');
      title.className = 'action-modal-title';
      title.textContent = `Interact with ${targetDisplayName}`;

      const actions = document.createElement('div');
      actions.className = 'action-modal-actions';

      const chatButton = buildButton('Chat', () => {
        callbacks.onActionSelected('chat');
      });
      const inventoryButton = buildButton('Inventory', () => {
        callbacks.onActionSelected('inventory');
      });
      const backButton = buildButton('Back', () => {
        callbacks.onClose();
      });

      actionButtons = [chatButton, inventoryButton, backButton];
      actionButtons.forEach((button, index) => {
        button.addEventListener('focus', () => {
          focusedButtonIndex = index;
        });
        actions.appendChild(button);
      });

      modal.appendChild(title);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      hostElement.appendChild(overlay);

      focusedButtonIndex = 0;
      actionButtons[focusedButtonIndex]?.focus();

      escapeHandler = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          callbacks.onClose();
          return;
        }

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
          event.preventDefault();
          focusedButtonIndex = (focusedButtonIndex + 1) % actionButtons.length;
          actionButtons[focusedButtonIndex]?.focus();
          return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
          event.preventDefault();
          focusedButtonIndex = (focusedButtonIndex - 1 + actionButtons.length) % actionButtons.length;
          actionButtons[focusedButtonIndex]?.focus();
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          actionButtons[focusedButtonIndex]?.click();
        }
      };

      document.addEventListener('keydown', escapeHandler, true);
      overlayElement = overlay;
    },

    close,
  };
};
