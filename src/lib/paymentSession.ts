/**
 * Session-based payment validation for per-token Pro access
 * Replaces wallet-based Pro status with session-based payment tracking
 */

export interface PaymentSession {
  paymentConfirmed: boolean;
  txSignature: string;
  timestamp: number;
  amount: number;
  tokenType: 'pro';
}

/**
 * Validate if a payment session is valid for Pro token creation
 * @param sessionData - Payment session data
 * @returns boolean - True if payment is valid and recent
 */
export function validateProPayment(sessionData: PaymentSession): boolean {
  if (!sessionData.paymentConfirmed || !sessionData.txSignature) {
    return false;
  }

  // Check if payment was made recently (within last 10 minutes)
  const now = Date.now();
  const sessionAge = now - sessionData.timestamp;
  const maxSessionAge = 10 * 60 * 1000; // 10 minutes in milliseconds

  if (sessionAge > maxSessionAge) {
    console.warn('Payment session expired:', { sessionAge, maxSessionAge });
    return false;
  }

  // Validate payment amount (should be 0.1 SOL for Pro tokens)
  if (sessionData.amount !== 0.1) {
    console.warn('Invalid payment amount:', sessionData.amount);
    return false;
  }

  return true;
}

/**
 * Create a payment session after successful payment
 * @param txSignature - Solana transaction signature
 * @param amount - Payment amount in SOL
 * @returns PaymentSession - Valid payment session
 */
export function createPaymentSession(txSignature: string, amount: number): PaymentSession {
  return {
    paymentConfirmed: true,
    txSignature,
    timestamp: Date.now(),
    amount,
    tokenType: 'pro'
  };
}

/**
 * Store payment session in localStorage (temporary storage)
 * In production, consider using more secure session storage
 * @param session - Payment session to store
 */
export function storePaymentSession(session: PaymentSession): void {
  try {
    localStorage.setItem('pro_token_payment', JSON.stringify(session));
  } catch (error) {
    console.error('Failed to store payment session:', error);
  }
}

/**
 * Retrieve payment session from localStorage
 * @returns PaymentSession | null - Stored session or null if not found
 */
export function getPaymentSession(): PaymentSession | null {
  try {
    const stored = localStorage.getItem('pro_token_payment');
    if (!stored) return null;
    
    const session = JSON.parse(stored) as PaymentSession;
    
    // Validate session is still fresh
    if (validateProPayment(session)) {
      return session;
    } else {
      // Session expired, remove it
      clearPaymentSession();
      return null;
    }
  } catch (error) {
    console.error('Failed to retrieve payment session:', error);
    return null;
  }
}

/**
 * Clear payment session from storage
 */
export function clearPaymentSession(): void {
  try {
    localStorage.removeItem('pro_token_payment');
  } catch (error) {
    console.error('Failed to clear payment session:', error);
  }
}

/**
 * Check if current session has valid Pro payment
 * @returns boolean - True if valid Pro payment exists
 */
export function hasValidProPayment(): boolean {
  const session = getPaymentSession();
  return session !== null && validateProPayment(session);
}
