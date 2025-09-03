import React, { useState } from 'react';
import { getErrorInfo, isRetryableError, getRetryMessage } from '../../utils/errorMapping';

interface ErrorDisplayProps {
  errorCode: string;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorCode,
  errorMessage,
  onRetry,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const errorInfo = getErrorInfo(errorCode);
  const isRetryable = isRetryableError(errorCode);
  const retryMessage = getRetryMessage(errorCode);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-error/20 border-error/30 text-error';
      case 'warning':
        return 'bg-warning/20 border-warning/30 text-warning';
      case 'info':
        return 'bg-info/20 border-info/30 text-info';
      default:
        return 'bg-muted/20 border-muted/30 text-muted';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`rounded-lg border p-4 ${getSeverityColor(errorInfo.severity)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-lg">{getSeverityIcon(errorInfo.severity)}</span>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{errorInfo.title}</h4>
              <p className="text-sm mb-2">
                {errorMessage || errorInfo.message}
              </p>
              
              {/* Solution Tooltip Trigger */}
              <div className="relative">
                <button
                  type="button"
                  className="text-xs underline hover:no-underline focus:outline-none"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                >
                  💡 How to fix this?
                </button>
                
                {/* Tooltip */}
                {showTooltip && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-bg/95 backdrop-blur-sm border border-muted/20 rounded-lg p-3 shadow-lg z-10">
                    <div className="text-xs text-fg">
                      <p className="font-semibold mb-1">Solution:</p>
                      <p>{errorInfo.solution}</p>
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-bg/95"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Retry Button */}
          {isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="bg-primary hover:bg-primary/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm ml-4"
            >
              Retry
            </button>
          )}
        </div>
        
        {/* Retry Message */}
        {retryMessage && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <p className="text-xs opacity-80">{retryMessage}</p>
          </div>
        )}
        
        {/* Error Code for Debugging */}
        <div className="mt-2 text-xs opacity-60 font-mono">
          Error Code: {errorCode}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
