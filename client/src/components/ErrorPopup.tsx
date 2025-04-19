import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorPopupProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorPopup({ message, onDismiss }: ErrorPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
          <button 
            onClick={handleDismiss} 
            className="text-red-500 hover:text-red-700 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
        <button 
          onClick={handleDismiss}
          className="ml-auto pl-3 text-red-500 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
