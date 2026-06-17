import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import './styles/01-tokens.css';
import './styles/02-buttons.css';
import './styles/03-nav.css';
import './styles/04-hero.css';
import './styles/05-hero2.css';
import './styles/06-sections.css';
import './styles/07-blog.css';
import './styles/08-misc.css';
import './styles/09-scene.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
