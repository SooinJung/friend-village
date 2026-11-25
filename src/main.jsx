import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './app.css';

// The screens were written against the global THREE build (r149), so expose it the same way.
window.THREE = THREE;

createRoot(document.getElementById('root')).render(<App />);
