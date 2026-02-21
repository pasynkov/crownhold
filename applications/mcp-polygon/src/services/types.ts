// Polygon Service Types

export type OperationMode = 'mock' | 'simulation' | 'production';

export interface BalanceResult {
  success: boolean;
  simulated?: boolean;
  data?: {
    address: string;
    usdc: string;
    matic: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface PriceResult {
  success: boolean;
  data?: {
    token: string;
    currency: string;
    price: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TransferResult {
  success: boolean;
  simulated?: boolean;
  data?: {
    transactionHash: string;
    from: string;
    to: string;
    amount: string;
    status: string;
    gasUsed?: string;
    realBalanceChecked?: boolean;
    gasEstimate?: string;
    warning?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TransactionStatusResult {
  success: boolean;
  data?: {
    transactionHash: string;
    status: string;
    confirmations: number;
    requiredConfirmations?: number;
    blockNumber?: number;
    from?: string;
    to?: string;
    amount?: string;
    gasUsed?: string;
    timestamp?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TransactionsResult {
  success: boolean;
  data?: {
    transactions: Array<{
      transactionHash: string;
      from: string;
      to: string;
      amount: string;
      status: string;
      confirmations: number;
      blockNumber?: number;
      timestamp: string;
    }>;
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GasEstimateResult {
  success: boolean;
  data?: {
    gasLimit: string;
    gasPrice: string;
    estimatedCost: string;
    estimatedCostUSD?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface IPolygonService {
  getBalance(): Promise<BalanceResult>;
  getTokenPrice(): Promise<PriceResult>;
  transferUSDC(recipient: string, amount: string): Promise<TransferResult>;
  getTransactionStatus(transactionHash: string): Promise<TransactionStatusResult>;
  getTransactions(limit?: number): Promise<TransactionsResult>;
  estimateGas(): Promise<GasEstimateResult>;
}
