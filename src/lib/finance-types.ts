export type Company = "FAST" | "Broker" | "Skill" | "Danet";
export const COMPANIES: Company[] = ["FAST", "Broker", "Skill", "Danet"];

export type MoneyLocation =
  | "Cash in hand"
  | "Office Petty Cash"
  | "Du Monde Petty Cash"
  | "CBQ"
  | "FAST account"
  | "Broker account"
  | "Skill account"
  | "Danet account"
  | "Maryam Card"
  | "Yousef Card"
  | "Maha Petrol Card"
  | "Limit Card";

export const MONEY_LOCATIONS: MoneyLocation[] = [
  "Cash in hand",
  "Office Petty Cash",
  "Du Monde Petty Cash",
  "CBQ",
  "FAST account",
  "Broker account",
  "Skill account",
  "Danet account",
  "Maryam Card",
  "Yousef Card",
  "Maha Petrol Card",
  "Limit Card",
];

export type PettyCashTxn = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "received" | "paid";
  company?: Company;
  candidate?: string;
  receipt?: string;
  scope: "office" | "dumonde";
};

export type CardKey = "maryam" | "yousef" | "maha" | "limit";

export type CardTxn = {
  id: string;
  card: CardKey;
  date: string;
  description: string;
  category: string;
  amount: number;
  company?: Company;
  candidate?: string;
  receipt?: string;
  // Yousef specific
  expenseType?: "Visa" | "Visa cancellation" | "QVC" | "Medical" | "Government payments" | "Other";
  // Maha specific
  driver?: string;
  vehicle?: string;
  vehicleOwner?: Company;
  plateNumber?: string;
  station?: string;
  kmBefore?: number;
  kmAfter?: number;
  odo?: number;
  // Limit card branching
  limitBranch?: "personal" | "company" | "factory";
  person?: string;
  factoryCategory?: "Coffee beans" | "Milk" | "Cups" | "Syrups" | "Transport" | "Equipment" | "Other";
};

export type CandidateHolding = {
  id: string;
  date: string;
  candidateName: string;
  passport: string;
  nationality: string;
  sponsor: string;
  company: Company;
  purpose: "QVC" | "Visa" | "Medical" | "POLO Contract" | "Transportation" | "Penalty" | "Service Charge" | "Other";
  amount: number;
  paymentMethod: "Cash" | "CBQ" | "Company account" | "Card";
  currentLocation: MoneyLocation;
  status: "Pending payment" | "Paid" | "Completed";
  notes?: string;
};

export type SalaryHolding = {
  id: string;
  date: string;
  housemaidName: string;
  passport: string;
  previousSponsor: string;
  newSponsor?: string;
  amount: number;
  receivedFrom: string;
  currentLocation: "Cash" | "CBQ";
  status: "Holding" | "Partially released" | "Fully released";
  releases: {
    id: string;
    date: string;
    amount: number;
    receivedBy: string;
    newSponsorDetails?: string;
    proof?: string;
  }[];
};

export type SponsorReceivable = {
  id: string;
  sponsor: string;
  candidate: string;
  totalAmount: number;
  deposit: number;
  depositDate?: string;
  paymentMethod?: string;
  notes?: string;
};

export type CompanyTransfer = {
  id: string;
  date: string;
  company: Company;
  amountReceived: number;
  purpose: string;
  amountTransferred: number;
  transferDate?: string;
};

export type Voucher = {
  id: string;
  type: "RV" | "PV";
  number: string;
  date: string;
  company: Company;
  party: string; // received from / paid to
  candidate?: string;
  amount: number;
  paymentMethod: string;
  purpose: string;
  attachment?: string;
};

export const CARD_META: Record<CardKey, { name: string; last4: string; limit: number; purpose: string }> = {
  maryam: { name: "Maryam Card", last4: "5515", limit: 5000, purpose: "General company expenses" },
  yousef: { name: "Yousef Card", last4: "6921", limit: 5000, purpose: "Immigration payments" },
  maha: { name: "Maha Petrol Card", last4: "0552", limit: 5000, purpose: "Vehicle fuel" },
  limit: { name: "Limit Card", last4: "3852", limit: 1000, purpose: "Mixed - personal/company/factory" },
};
