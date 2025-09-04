import toast from "react-hot-toast";

/**
 * Display a friendly error toast with dark theme styling
 * @param msg - Error message to display
 */
export const toastError = (msg: string) => 
  toast.error(msg, { 
    style: { 
      background: "#1a1a1a", 
      color: "#fff", 
      border: "1px solid #ff3b3b55" 
    } 
  });

/**
 * Display a friendly success toast with dark theme styling
 * @param msg - Success message to display
 */
export const toastOk = (msg: string) => 
  toast.success(msg, { 
    style: { 
      background: "#111", 
      color: "#fff", 
      border: "1px solid #00e5ff55" 
    } 
  });
