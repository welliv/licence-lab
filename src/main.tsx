import './engine/polyfill';
import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
createRoot(document.getElementById('root')!).render(<App />);
