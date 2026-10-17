import './engine/polyfill';
import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { music } from './ui/music';
// Load the track list and the hero file first, so every offer binds to the real file's SHA-256 (falls back to the demo tone after 8 s).
Promise.race([music.load(), new Promise(r => setTimeout(r, 8000))]).finally(() => createRoot(document.getElementById('root')!).render(<App />));
