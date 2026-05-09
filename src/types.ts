export interface Product {
  id: string;
  name: string;
  cat: string;
}

export type InventoryType = "IN" | "OUT";

export interface InventoryTransaction {
  pid: string;
  type: InventoryType;
  qty: number;
  person: string;
  date: string;
}

export type CashTransactionType = "INCOME" | "EXPENSE";

export interface CashTransaction {
  id: string;
  amount: number;
  type: CashTransactionType;
  note: string;
  date: string;
}

export interface AppData {
  products: Product[];
  transactions: InventoryTransaction[];
  cashTransactions: CashTransaction[];
}
