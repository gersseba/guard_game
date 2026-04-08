export const createBodyContainer = (): HTMLDivElement => {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
};

export const createBodyElement = (tagName: string): HTMLElement => {
  document.body.innerHTML = '';
  const element = document.createElement(tagName);
  document.body.appendChild(element);
  return element;
};