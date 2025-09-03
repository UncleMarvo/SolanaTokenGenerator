/**
 * Action logging utility for CLMM operations
 * Logs lightweight action summaries to console or file based on environment flags
 */

export interface ActionLog {
  timestamp: string;
  action: string;
  dex: string;
  tokenMint: string;
  amount: string;
  status: 'success' | 'error' | 'pending';
  errorCode?: string;
  errorMessage?: string;
  txSignature?: string;
  duration?: number;
  retryCount?: number;
}

/**
 * Log an action summary
 */
export function logAction(log: ActionLog): void {
  // Check if detailed logging is enabled
  const isDetailedLogging = process.env.NODE_ENV === 'development' || 
                           process.env.NEXT_PUBLIC_ENABLE_ACTION_LOGGING === 'true';
  
  if (isDetailedLogging) {
    // Detailed logging for development/debugging
    console.group(`🔍 CLMM Action: ${log.action}`);
    console.log(`⏰ Time: ${log.timestamp}`);
    console.log(`🏦 DEX: ${log.dex}`);
    console.log(`🪙 Token: ${log.tokenMint.slice(0, 8)}...${log.tokenMint.slice(-8)}`);
    console.log(`💰 Amount: ${log.amount}`);
    console.log(`📊 Status: ${log.status}`);
    
    if (log.errorCode) {
      console.log(`❌ Error Code: ${log.errorCode}`);
      console.log(`💬 Error Message: ${log.errorMessage}`);
    }
    
    if (log.txSignature) {
      console.log(`✅ TX: ${log.txSignature.slice(0, 8)}...${log.txSignature.slice(-8)}`);
    }
    
    if (log.duration) {
      console.log(`⏱️ Duration: ${log.duration}ms`);
    }
    
    if (log.retryCount && log.retryCount > 0) {
      console.log(`🔄 Retries: ${log.retryCount}`);
    }
    
    console.groupEnd();
  } else {
    // Lightweight logging for production
    const statusIcon = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏳';
    console.log(`${statusIcon} ${log.action} - ${log.dex} - ${log.status}`);
    
    if (log.errorCode) {
      console.log(`   Error: ${log.errorCode} - ${log.errorMessage}`);
    }
  }
  
  // Log to file if enabled (for production monitoring)
  if (process.env.NEXT_PUBLIC_ENABLE_FILE_LOGGING === 'true') {
    logToFile(log);
  }
}

/**
 * Log to file (simplified - in production you'd use a proper logging service)
 */
function logToFile(log: ActionLog): void {
  try {
    // In a real implementation, you'd send this to a logging service
    // For now, we'll just log to console with a special prefix
    console.log(`📁 FILE_LOG: ${JSON.stringify(log)}`);
  } catch (error) {
    console.warn('Failed to log to file:', error);
  }
}

/**
 * Log successful action
 */
export function logSuccess(params: {
  action: string;
  dex: string;
  tokenMint: string;
  amount: string;
  txSignature: string;
  duration: number;
  retryCount?: number;
}): void {
  logAction({
    timestamp: new Date().toISOString(),
    ...params,
    status: 'success'
  });
}

/**
 * Log failed action
 */
export function logError(params: {
  action: string;
  dex: string;
  tokenMint: string;
  amount: string;
  errorCode: string;
  errorMessage: string;
  duration: number;
  retryCount?: number;
}): void {
  logAction({
    timestamp: new Date().toISOString(),
    ...params,
    status: 'error'
  });
}

/**
 * Log pending action
 */
export function logPending(params: {
  action: string;
  dex: string;
  tokenMint: string;
  amount: string;
}): void {
  logAction({
    timestamp: new Date().toISOString(),
    ...params,
    status: 'pending'
  });
}

/**
 * Get action summary for analytics
 */
export function getActionSummary(): {
  totalActions: number;
  successRate: number;
  commonErrors: Record<string, number>;
} {
  // This would typically query a logging database
  // For now, return mock data
  return {
    totalActions: 0,
    successRate: 0,
    commonErrors: {}
  };
}
