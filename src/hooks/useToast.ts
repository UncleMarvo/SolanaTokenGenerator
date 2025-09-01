import { useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 3000) => {
    // Simple toast implementation - you can replace this with your preferred toast library
    const toastId = `toast-${Date.now()}`;
    
    // Create toast element
    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
      type === "success" ? "bg-success text-success-content" :
      type === "error" ? "bg-error text-error-content" :
      type === "warning" ? "bg-warning text-warning-content" :
      "bg-info text-info-content"
    }`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove("translate-x-full");
    }, 100);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.add("translate-x-full");
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
    
    return toastId;
  }, []);

  return { showToast };
};
