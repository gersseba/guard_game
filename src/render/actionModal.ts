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

  const close = (): void => {
    if (overlayElement && overlayElement.parentElement === hostElement) {
      hostElement.removeChild(overlayElement);
    }
    overlayElement = null;

    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
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

      actions.appendChild(
        buildButton('Chat', () => {
          callbacks.onActionSelected('chat');
        }),
      );

      actions.appendChild(
        buildButton('Inventory', () => {
          callbacks.onActionSelected('inventory');
        }),
      );

      actions.appendChild(
        buildButton('Back', () => {
          callbacks.onClose();
        }),
      );

      modal.appendChild(title);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      hostElement.appendChild(overlay);

      escapeHandler = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          callbacks.onClose();
        }
      };

      document.addEventListener('keydown', escapeHandler);
      overlayElement = overlay;
    },

    close,
  };
};
