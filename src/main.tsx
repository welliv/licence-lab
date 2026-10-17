import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './one/one.css';
import { App } from './one/App';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
// Warm the engine (crypto and checks) once the page is idle, so the first tap is instant. It is never needed for first paint.
const warm = () => { void import('./one/actions').then(m => m.loadEngine()); };
addEventListener('pointerdown', warm, { once: true, capture: true }); addEventListener('keydown', warm, { once: true, capture: true });
