
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add global unhandled rejection handler for debugging
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection detected:');
  console.error('Reason:', event.reason);
  console.error('Promise:', event.promise);
  console.error('Stack trace:', event.reason?.stack || 'No stack trace available');
  // Don't prevent the default behavior, just log it
});

// Add global error handler as well
window.addEventListener('error', (event) => {
  console.error('🚨 Global error detected:');
  console.error('Message:', event.message);
  console.error('Source:', event.filename);
  console.error('Line:', event.lineno);
  console.error('Column:', event.colno);
  console.error('Error object:', event.error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
