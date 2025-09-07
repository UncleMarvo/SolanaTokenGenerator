import React from 'react';
import Head from 'next/head';
import { TransactionTest } from '../components/TransactionTest';

/**
 * Test page for demonstrating the useSendSolanaTx hook functionality
 * This page allows manual testing of the double-invoke prevention and phase tracking
 */
const TestTransactionPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Transaction Hook Test - Solana Token Creator</title>
        <meta name="description" content="Test page for transaction sending hook" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <TransactionTest />
        </div>
      </div>
    </>
  );
};

export default TestTransactionPage;
