import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { StoreProvider } from './context/StoreContext';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <StoreProvider>
        <BrowserRouter><App/></BrowserRouter>
      </StoreProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
