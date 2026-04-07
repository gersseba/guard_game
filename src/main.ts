import './style.css';
import { createRuntimeApp } from './runtime/createRuntimeApp';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Expected #app root element.');
}

const runtimeApp = createRuntimeApp(appElement);
void runtimeApp.start();
