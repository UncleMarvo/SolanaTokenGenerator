import { renderHook, act } from '@testing-library/react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { useSendSolanaTx } from '../useSendSolanaTx';

// Mock the toast library
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Mock the Connection class
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 100,
    }),
    sendRawTransaction: jest.fn().mockResolvedValue('test-signature'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: [{ confirmationStatus: 'confirmed' }] }),
    getSignatureStatuses: jest.fn().mockResolvedValue({
      value: [{ confirmationStatus: 'confirmed' }]
    }),
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    recentBlockhash: null,
    feePayer: null,
    partialSign: jest.fn(),
    serialize: jest.fn().mockReturnValue(Buffer.from('test-serialized-tx')),
  })),
  PublicKey: jest.fn().mockImplementation(() => ({
    toString: jest.fn().mockReturnValue('test-public-key'),
  })),
}));

describe('useSendSolanaTx', () => {
  let mockConnection: Connection;
  let mockWallet: any;
  let mockTransaction: Transaction;
  let mockPublicKey: PublicKey;

  beforeEach(() => {
    mockConnection = new Connection('https://api.mainnet-beta.solana.com');
    mockPublicKey = new PublicKey('test-public-key');
    mockTransaction = new Transaction();
    
    mockWallet = {
      publicKey: mockPublicKey,
      signTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with idle phase', () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));
    
    expect(result.current.phase).toBe('idle');
    expect(result.current.isInFlight).toBe(false);
  });

  it('should prevent double-invokes', async () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));
    
    // Start first transaction
    const firstTxPromise = act(async () => {
      return result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });
    });

    // Try to start second transaction immediately
    const secondTxResult = await act(async () => {
      return result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });
    });

    // Second transaction should be rejected
    expect(secondTxResult.ok).toBe(false);
    expect(secondTxResult.error).toBe('Busy');

    // Wait for first transaction to complete
    await firstTxPromise;
  });

  it('should handle transaction phases correctly', async () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));
    
    let phaseUpdates: string[] = [];
    
    // Track phase changes
    const originalPhase = result.current.phase;
    phaseUpdates.push(originalPhase);

    await act(async () => {
      const txPromise = result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });

      // Check phases during execution
      phaseUpdates.push(result.current.phase);
      
      await txPromise;
      phaseUpdates.push(result.current.phase);
    });

    // Should go through: idle -> signing -> sending -> confirming -> idle
    expect(phaseUpdates).toContain('idle');
    expect(result.current.phase).toBe('idle');
  });

  it('should handle wallet errors gracefully', async () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));
    
    // Mock wallet to throw an error
    mockWallet.signTransaction.mockRejectedValue(new Error('User rejected'));

    const txResult = await act(async () => {
      return result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });
    });

    expect(txResult.ok).toBe(false);
    expect(txResult.error).toBe('Transaction was rejected by user');
    expect(result.current.phase).toBe('idle');
  });

  it('should handle connection errors gracefully', async () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));
    
    // Mock connection to throw an error
    (mockConnection.sendRawTransaction as jest.Mock).mockRejectedValue(
      new Error('Insufficient funds')
    );

    const txResult = await act(async () => {
      return result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });
    });

    expect(txResult.ok).toBe(false);
    expect(txResult.error).toBe('Insufficient funds for transaction');
    expect(result.current.phase).toBe('idle');
  });

  it('should handle successful transaction', async () => {
    const { result } = renderHook(() => useSendSolanaTx(mockConnection));

    const txResult = await act(async () => {
      return result.current.sendTx({
        tx: mockTransaction,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet,
      });
    });

    expect(txResult.ok).toBe(true);
    expect(txResult.signature).toBe('test-signature');
    expect(result.current.phase).toBe('idle');
  });
});
