import { createRoot } from 'react-dom/client';
import App from './App';

// Create root element if it doesn't exist
let rootElement = document.getElementById('root');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// Create root and render app
const root = createRoot(rootElement);
root.render(<App />); 