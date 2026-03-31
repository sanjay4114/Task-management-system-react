export const toast = {
  success: (message) => {
    const event = new CustomEvent('add-toast', { detail: { message, type: 'success' } });
    window.dispatchEvent(event);
  },
  error: (message) => {
    const event = new CustomEvent('add-toast', { detail: { message, type: 'error' } });
    window.dispatchEvent(event);
  },
  info: (message) => {
    const event = new CustomEvent('add-toast', { detail: { message, type: 'info' } });
    window.dispatchEvent(event);
  }
};
