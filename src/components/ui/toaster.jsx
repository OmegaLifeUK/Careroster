
// Compatibility export for cached imports
export { ToastProvider, useToast } from './toast';

// Default export for backwards compatibility
import { ToastProvider } from './toast';
export default ToastProvider;

// Named export that cached files might be looking for
export const Toaster = ToastProvider;
