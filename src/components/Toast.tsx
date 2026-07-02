import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import "./Toast.css";

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      <button className="toast__close" onClick={onDismiss}><MdClose size={14} /></button>
    </div>
  );
}
