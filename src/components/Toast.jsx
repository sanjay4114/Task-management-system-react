import { useState, useEffect } from 'react';
import './Toast.css';

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handleAddToast(e) {
      const newToast = {
        id: Date.now() + Math.random(),
        message: e.detail.message,
        type: e.detail.type || 'info'
      };
      setToasts(prev => [...prev, newToast]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    }

    window.addEventListener('add-toast', handleAddToast);
    return () => window.removeEventListener('add-toast', handleAddToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-${t.type} flex items-center p-4 rounded shadow-lg animate-slide-in`}>
          <div className="toast-icon mr-3">
            {t.type === 'error' ? '❌' : t.type === 'success' ? '✅' : 'ℹ️'}
          </div>
          <div className="toast-message text-sm font-medium">{t.message}</div>
          <button className="ml-4 opacity-70 hover:opacity-100" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}
