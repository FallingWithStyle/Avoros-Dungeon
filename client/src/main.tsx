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
  console.log('🚨 Global error detected:');
  console.log('Message:', event.message);
  console.log('Source:', event.filename);
  console.log('Line:', event.lineno);
  console.log('Column:', event.colno);
  console.log('Error object:', event.error);

  // Prevent certain types of errors from crashing the app
  if (event.message && (
    event.message.includes('roomMapMini.set is not a function') ||
    event.message.includes('WebSocket')
  )) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.log('🚨 Unhandled promise rejection:');
  console.log('Reason:', event.reason);

  // Prevent WebSocket and map-related promise rejections from crashing
  if (event.reason && (
    String(event.reason).includes('WebSocket') ||
    String(event.reason).includes('roomMapMini')
  )) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);