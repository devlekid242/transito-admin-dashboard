import { Injectable, signal } from '@angular/core';

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type KycStatus = 'MISSING' | 'PENDING' | 'VERIFIED';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';
export type UserRole = 'CLIENT' | 'AGENT' | 'ADMIN';
export type RefundStatus = 'REFUND_PENDING' | 'REFUNDED' | 'BLOCKED';
export type AdminRole = 'SUPER_ADMIN' | 'FINANCE' | 'MODERATION' | 'SUPPORT';

export interface Withdrawal {
  id: string;
  agency: string;
  date: string;
  amount: number;
  remainingBalance: number;
  status: WithdrawalStatus;
  note?: string;
}

export interface AgencyWallet {
  id: string;
  agency: string;
  agencyId: string;
  available: number;
  reserved: number;
  currency: string;
  lastTransaction: string;
  frozen: boolean;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'RESERVATION' | 'WITHDRAWAL' | 'REFUND' | 'COMMISSION' | 'TOPUP';
  label: string;
  amount: number;
  date: string;
  balanceAfter: number;
}

export type TransactionType = 'PAYMENT' | 'WITHDRAWAL' | 'REFUND' | 'COMMISSION' | 'TOPUP';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface Transaction {
  id: string;
  type: TransactionType;
  label: string;
  amount: number;
  date: string;
  agency: string;
  user?: string;
  method?: string;
  status: TransactionStatus;
}

export type ReservationStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Reservation {
  id: string;
  ref: string;
  passenger: string;
  agency: string;
  route: string;
  date: string;
  departure: string;
  seats: number;
  amount: number;
  status: ReservationStatus;
  paymentMethod: string;
}

export interface Refund {
  id: string;
  ticketRef: string;
  passenger: string;
  agency: string;
  amount: number;
  date: string;
  status: RefundStatus;
  insufficientFunds: boolean;
}

export interface Agency {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  kyc: KycStatus;
  account: AccountStatus;
  createdAt: string;
  city: string;
  description: string;
}

export interface AgencyTrip {
  id: string;
  agencyId: string;
  route: string;
  departure: string;
  arrival: string;
  price: number;
  duration: string;
  busType: string;
  seats: number;
  days: string[];
  active: boolean;
}

export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';

export interface ManifestPassenger {
  id: string;
  name: string;
  phone: string;
  seat: string;
  ticketRef: string;
  boardingPoint: string;
  paymentMethod: string;
  amount: number;
  status: 'BOARDING' | 'BOARDED' | 'NO_SHOW';
  checkedIn: boolean;
}

export interface TripStop {
  city: string;
  time: string;
  type: 'BOARDING' | 'DROPOFF';
  address: string;
}

export interface Trip {
  id: string;
  ref: string;
  route: string;
  agency: string;
  agencyId: string;
  date: string;
  departure: string;
  arrival: string;
  duration: string;
  busType: string;
  busPlate: string;
  driver: string;
  driverPhone: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  price: number;
  revenue: number;
  commission: number;
  status: TripStatus;
  fillRate: number;
  boardingPoints: string[];
  stops: TripStop[];
  manifest: ManifestPassenger[];
}

export interface BoardingPoint {
  id: string;
  agencyId: string;
  name: string;
  address: string;
  city: string;
  departureTime: string;
}

export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ApplicationDocument {
  name: string;
  type: 'RCCM' | 'NINEA' | 'ASSURANCE' | 'CARTE_GRISE' | 'CONTRAT' | 'AUTRE';
  size: string;
  uploadedAt: string;
  url: string;
}

export interface Application {
  id: string;
  ref: string;
  agencyName: string;
  legalRepresentative: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  fleetSize: number;
  routesPlanned: string[];
  description: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  rejectionReason?: string;
  documents: ApplicationDocument[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  agency?: string;
  status: AccountStatus;
  cancellations: number;
  avatarColor: string;
  joinedAt: string;
  reservations: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  user: string;
  agency?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  date: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  time: string;
}

export interface SupportConversation {
  id: string;
  ticketId: string;
  subject: string;
  user: string;
  userAvatarColor: string;
  agency?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastActive: string;
  avatarColor: string;
  permissions: string[];
}

export interface AuditLog {
  id: string;
  admin: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'FINANCE' | 'MODERATION' | 'SETTINGS' | 'AUTH';
}

export interface Alert {
  id: string;
  type: 'withdrawal' | 'kyc' | 'refund';
  label: string;
  description: string;
  amount?: number;
  agency: string;
  severity: 'warning' | 'danger';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'broadcast' | 'targeted';
  target?: string;
  sentAt: string;
  recipients: number;
  readCount: number;
}

const FCFA = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  readonly fcfa = FCFA;

  readonly withdrawals = signal<Withdrawal[]>([
    { id: 'W-1042', agency: 'Express Voyage', date: '24/07/2026 08:12', amount: 150000, remainingBalance: 420000, status: 'PENDING' },
    { id: 'W-1041', agency: 'Sahel Transport', date: '24/07/2026 07:45', amount: 320000, remainingBalance: 89000, status: 'PENDING' },
    { id: 'W-1040', agency: 'Baobab Lines', date: '23/07/2026 18:30', amount: 540000, remainingBalance: 1200000, status: 'PENDING' },
    { id: 'W-1039', agency: 'Express Voyage', date: '23/07/2026 14:02', amount: 200000, remainingBalance: 570000, status: 'APPROVED' },
    { id: 'W-1038', agency: 'Delta Bus', date: '22/07/2026 11:20', amount: 95000, remainingBalance: 310000, status: 'APPROVED' },
    { id: 'W-1037', agency: 'Sahel Transport', date: '21/07/2026 09:15', amount: 410000, remainingBalance: 50000, status: 'REJECTED', note: 'Solde insuffisant après prélèvement commission.' },
    { id: 'W-1036', agency: 'Baobab Lines', date: '20/07/2026 16:48', amount: 280000, remainingBalance: 920000, status: 'APPROVED' },
    { id: 'W-1035', agency: 'Delta Bus', date: '19/07/2026 10:05', amount: 175000, remainingBalance: 230000, status: 'REJECTED', note: 'Document justificatif manquant.' },
  ]);

  readonly wallets = signal<AgencyWallet[]>([
    { id: 'WL-01', agency: 'Express Voyage', agencyId: 'AG-01', available: 570000, reserved: 320000, currency: 'FCFA', lastTransaction: '24/07/2026 08:12', frozen: false },
    { id: 'WL-02', agency: 'Sahel Transport', agencyId: 'AG-02', available: 89000, reserved: 410000, currency: 'FCFA', lastTransaction: '24/07/2026 07:45', frozen: false },
    { id: 'WL-03', agency: 'Baobab Lines', agencyId: 'AG-03', available: 1200000, reserved: 680000, currency: 'FCFA', lastTransaction: '23/07/2026 18:30', frozen: false },
    { id: 'WL-04', agency: 'Delta Bus', agencyId: 'AG-04', available: 310000, reserved: 145000, currency: 'FCFA', lastTransaction: '22/07/2026 11:20', frozen: true },
    { id: 'WL-05', agency: 'Caravane Voyage', agencyId: 'AG-05', available: 740000, reserved: 220000, currency: 'FCFA', lastTransaction: '21/07/2026 15:00', frozen: false },
  ]);

  readonly walletTransactions = signal<WalletTransaction[]>([
    { id: 'WT-001', walletId: 'WL-01', type: 'RESERVATION', label: 'Réservation TKT-55210 · Dakar → Touba', amount: 12500, date: '24/07/2026 08:12', balanceAfter: 570000 },
    { id: 'WT-002', walletId: 'WL-01', type: 'COMMISSION', label: 'Commission plateforme · TKT-55210', amount: -350, date: '24/07/2026 08:12', balanceAfter: 569650 },
    { id: 'WT-003', walletId: 'WL-01', type: 'WITHDRAWAL', label: 'Retrait W-1039', amount: -200000, date: '23/07/2026 14:02', balanceAfter: 770000 },
    { id: 'WT-004', walletId: 'WL-01', type: 'RESERVATION', label: 'Réservation TKT-55198 · Dakar → Saint-Louis', amount: 18000, date: '23/07/2026 10:30', balanceAfter: 970000 },
    { id: 'WT-005', walletId: 'WL-01', type: 'REFUND', label: 'Remboursement TKT-55180', amount: -15000, date: '22/07/2026 16:45', balanceAfter: 952000 },
    { id: 'WT-006', walletId: 'WL-01', type: 'TOPUP', label: 'Recharge Orange Money', amount: 500000, date: '21/07/2026 09:00', balanceAfter: 967000 },
    { id: 'WT-007', walletId: 'WL-02', type: 'WITHDRAWAL', label: 'Retrait W-1041', amount: -320000, date: '24/07/2026 07:45', balanceAfter: 89000 },
    { id: 'WT-008', walletId: 'WL-02', type: 'RESERVATION', label: 'Réservation TKT-55190 · Dakar → Saint-Louis', amount: 6000, date: '23/07/2026 18:00', balanceAfter: 409000 },
    { id: 'WT-009', walletId: 'WL-02', type: 'REFUND', label: 'Remboursement TKT-55160', amount: -15000, date: '21/07/2026 12:00', balanceAfter: 403000 },
    { id: 'WT-010', walletId: 'WL-03', type: 'RESERVATION', label: 'Réservation TKT-55187 · Dakar → Thiès', amount: 9500, date: '23/07/2026 18:30', balanceAfter: 1200000 },
    { id: 'WT-011', walletId: 'WL-03', type: 'WITHDRAWAL', label: 'Retrait W-1036', amount: -280000, date: '20/07/2026 16:48', balanceAfter: 1480000 },
    { id: 'WT-012', walletId: 'WL-03', type: 'COMMISSION', label: 'Commission plateforme · TKT-55187', amount: -350, date: '23/07/2026 18:30', balanceAfter: 1199650 },
    { id: 'WT-013', walletId: 'WL-04', type: 'WITHDRAWAL', label: 'Retrait W-1038', amount: -95000, date: '22/07/2026 11:20', balanceAfter: 310000 },
    { id: 'WT-014', walletId: 'WL-04', type: 'RESERVATION', label: 'Réservation TKT-55170 · Dakar → Kaolack', amount: 4000, date: '21/07/2026 14:00', balanceAfter: 405000 },
    { id: 'WT-015', walletId: 'WL-05', type: 'TOPUP', label: 'Recharge Wave', amount: 300000, date: '21/07/2026 15:00', balanceAfter: 740000 },
    { id: 'WT-016', walletId: 'WL-05', type: 'RESERVATION', label: 'Réservation TKT-55165 · Dakar → Kaolack', amount: 8000, date: '20/07/2026 10:00', balanceAfter: 448000 },
  ]);

  readonly transactions = signal<Transaction[]>([
    { id: 'TX-9001', type: 'PAYMENT', label: 'Paiement réservation TKT-55210', amount: 12500, date: '24/07/2026 08:12', agency: 'Express Voyage', user: 'Aminata Diallo', method: 'Wave', status: 'SUCCESS' },
    { id: 'TX-9002', type: 'WITHDRAWAL', label: 'Retrait W-1042', amount: -150000, date: '24/07/2026 08:12', agency: 'Express Voyage', status: 'PENDING' },
    { id: 'TX-9003', type: 'PAYMENT', label: 'Paiement réservation TKT-55209', amount: 7500, date: '24/07/2026 07:30', agency: 'Express Voyage', user: 'Ousmane Ba', method: 'Orange Money', status: 'SUCCESS' },
    { id: 'TX-9004', type: 'WITHDRAWAL', label: 'Retrait W-1041', amount: -320000, date: '24/07/2026 07:45', agency: 'Sahel Transport', status: 'PENDING' },
    { id: 'TX-9005', type: 'REFUND', label: 'Remboursement TKT-55180', amount: -15000, date: '23/07/2026 16:45', agency: 'Express Voyage', user: 'Kofi Mensah', method: 'Wave', status: 'SUCCESS' },
    { id: 'TX-9006', type: 'COMMISSION', label: 'Commission TKT-55210', amount: 350, date: '24/07/2026 08:12', agency: 'Express Voyage', status: 'SUCCESS' },
    { id: 'TX-9007', type: 'PAYMENT', label: 'Paiement réservation TKT-55198', amount: 18000, date: '23/07/2026 10:30', agency: 'Express Voyage', user: 'Kofi Mensah', method: 'Carte bancaire', status: 'SUCCESS' },
    { id: 'TX-9008', type: 'PAYMENT', label: 'Paiement réservation TKT-55190', amount: 6000, date: '23/07/2026 18:00', agency: 'Sahel Transport', user: 'Fatou Ndiaye', method: 'Orange Money', status: 'SUCCESS' },
    { id: 'TX-9009', type: 'REFUND', label: 'Remboursement TKT-55160', amount: -15000, date: '21/07/2026 12:00', agency: 'Sahel Transport', user: 'Mariam Cissé', method: 'Wave', status: 'FAILED' },
    { id: 'TX-9010', type: 'WITHDRAWAL', label: 'Retrait W-1039', amount: -200000, date: '23/07/2026 14:02', agency: 'Express Voyage', status: 'SUCCESS' },
    { id: 'TX-9011', type: 'TOPUP', label: 'Recharge Orange Money', amount: 500000, date: '21/07/2026 09:00', agency: 'Express Voyage', method: 'Orange Money', status: 'SUCCESS' },
    { id: 'TX-9012', type: 'PAYMENT', label: 'Paiement réservation TKT-55187', amount: 9500, date: '23/07/2026 18:30', agency: 'Baobab Lines', user: 'Fatou Ndiaye', method: 'Wave', status: 'SUCCESS' },
    { id: 'TX-9013', type: 'COMMISSION', label: 'Commission TKT-55198', amount: 350, date: '23/07/2026 10:30', agency: 'Express Voyage', status: 'SUCCESS' },
    { id: 'TX-9014', type: 'WITHDRAWAL', label: 'Retrait W-1040', amount: -540000, date: '23/07/2026 18:30', agency: 'Baobab Lines', status: 'PENDING' },
    { id: 'TX-9015', type: 'PAYMENT', label: 'Paiement réservation TKT-55170', amount: 4000, date: '21/07/2026 14:00', agency: 'Delta Bus', user: 'Ibrahim Touré', method: 'Orange Money', status: 'SUCCESS' },
    { id: 'TX-9016', type: 'TOPUP', label: 'Recharge Wave', amount: 300000, date: '21/07/2026 15:00', agency: 'Caravane Voyage', method: 'Wave', status: 'SUCCESS' },
    { id: 'TX-9017', type: 'REFUND', label: 'Remboursement TKT-55176', amount: -22000, date: '22/07/2026 11:00', agency: 'Delta Bus', user: 'Ibrahim Touré', method: 'Orange Money', status: 'SUCCESS' },
    { id: 'TX-9018', type: 'WITHDRAWAL', label: 'Retrait W-1038', amount: -95000, date: '22/07/2026 11:20', agency: 'Delta Bus', status: 'SUCCESS' },
    { id: 'TX-9019', type: 'PAYMENT', label: 'Paiement réservation TKT-55165', amount: 8000, date: '20/07/2026 10:00', agency: 'Caravane Voyage', user: 'Ousmane Ba', method: 'Wave', status: 'SUCCESS' },
    { id: 'TX-9020', type: 'COMMISSION', label: 'Commission TKT-55187', amount: 350, date: '23/07/2026 18:30', agency: 'Baobab Lines', status: 'SUCCESS' },
  ]);

  readonly reservations = signal<Reservation[]>([
    { id: 'R-1001', ref: 'TKT-55210', passenger: 'Aminata Diallo', agency: 'Express Voyage', route: 'Dakar → Touba', date: '24/07/2026', departure: '08:00', seats: 1, amount: 12500, status: 'CONFIRMED', paymentMethod: 'Wave' },
    { id: 'R-1002', ref: 'TKT-55209', passenger: 'Ousmana Ba', agency: 'Express Voyage', route: 'Dakar → Saint-Louis', date: '24/07/2026', departure: '06:30', seats: 1, amount: 7500, status: 'CONFIRMED', paymentMethod: 'Orange Money' },
    { id: 'R-1003', ref: 'TKT-55208', passenger: 'Fatou Ndiaye', agency: 'Baobab Lines', route: 'Dakar → Thiès', date: '24/07/2026', departure: '06:00', seats: 2, amount: 4000, status: 'PENDING', paymentMethod: 'Wave' },
    { id: 'R-1004', ref: 'TKT-55207', passenger: 'Kofi Mensah', agency: 'Express Voyage', route: 'Dakar → Touba', date: '23/07/2026', departure: '08:00', seats: 1, amount: 12500, status: 'COMPLETED', paymentMethod: 'Carte bancaire' },
    { id: 'R-1005', ref: 'TKT-55206', passenger: 'Mariam Cissé', agency: 'Sahel Transport', route: 'Dakar → Saint-Louis', date: '23/07/2026', departure: '09:00', seats: 1, amount: 6000, status: 'CANCELLED', paymentMethod: 'Wave' },
    { id: 'R-1006', ref: 'TKT-55205', passenger: 'Ibrahim Touré', agency: 'Delta Bus', route: 'Dakar → Kaolack', date: '23/07/2026', departure: '07:30', seats: 3, amount: 12000, status: 'COMPLETED', paymentMethod: 'Orange Money' },
    { id: 'R-1007', ref: 'TKT-55204', passenger: 'Aminata Diallo', agency: 'Express Voyage', route: 'Dakar → Thiès', date: '22/07/2026', departure: '07:00', seats: 1, amount: 2500, status: 'COMPLETED', paymentMethod: 'Wave' },
    { id: 'R-1008', ref: 'TKT-55203', passenger: 'Ousmana Ba', agency: 'Caravane Voyage', route: 'Dakar → Kaolack', date: '22/07/2026', departure: '07:30', seats: 1, amount: 4000, status: 'NO_SHOW', paymentMethod: 'Orange Money' },
    { id: 'R-1009', ref: 'TKT-55202', passenger: 'Fatou Ndiaye', agency: 'Baobab Lines', route: 'Thiès → Mbour', date: '22/07/2026', departure: '10:00', seats: 2, amount: 3000, status: 'COMPLETED', paymentMethod: 'Wave' },
    { id: 'R-1010', ref: 'TKT-55201', passenger: 'Kofi Mensah', agency: 'Express Voyage', route: 'Dakar → Saint-Louis', date: '21/07/2026', departure: '06:30', seats: 1, amount: 7500, status: 'CANCELLED', paymentMethod: 'Carte bancaire' },
    { id: 'R-1011', ref: 'TKT-55200', passenger: 'Mariam Cissé', agency: 'Sahel Transport', route: 'Dakar → Podor', date: '21/07/2026', departure: '05:30', seats: 1, amount: 9000, status: 'CANCELLED', paymentMethod: 'Wave' },
    { id: 'R-1012', ref: 'TKT-55199', passenger: 'Ibrahim Touré', agency: 'Delta Bus', route: 'Dakar → Kaolack', date: '21/07/2026', departure: '07:30', seats: 2, amount: 8000, status: 'COMPLETED', paymentMethod: 'Orange Money' },
    { id: 'R-1013', ref: 'TKT-55198', passenger: 'Kofi Mensah', agency: 'Express Voyage', route: 'Dakar → Saint-Louis', date: '23/07/2026', departure: '06:30', seats: 1, amount: 7500, status: 'CONFIRMED', paymentMethod: 'Carte bancaire' },
    { id: 'R-1014', ref: 'TKT-55197', passenger: 'Aminata Diallo', agency: 'Express Voyage', route: 'Dakar → Touba', date: '20/07/2026', departure: '08:00', seats: 1, amount: 12500, status: 'COMPLETED', paymentMethod: 'Wave' },
    { id: 'R-1015', ref: 'TKT-55196', passenger: 'Ousmana Ba', agency: 'Caravane Voyage', route: 'Dakar → Kaolack', date: '20/07/2026', departure: '07:30', seats: 1, amount: 4000, status: 'COMPLETED', paymentMethod: 'Wave' },
  ]);

  readonly refunds = signal<Refund[]>([
    { id: 'R-301', ticketRef: 'TKT-55210', passenger: 'Aminata Diallo', agency: 'Sahel Transport', amount: 12500, date: '24/07/2026', status: 'REFUND_PENDING', insufficientFunds: true },
    { id: 'R-302', ticketRef: 'TKT-55198', passenger: 'Kofi Mensah', agency: 'Express Voyage', amount: 18000, date: '23/07/2026', status: 'REFUND_PENDING', insufficientFunds: false },
    { id: 'R-303', ticketRef: 'TKT-55187', passenger: 'Fatou Ndiaye', agency: 'Baobab Lines', amount: 9500, date: '23/07/2026', status: 'REFUND_PENDING', insufficientFunds: false },
    { id: 'R-304', ticketRef: 'TKT-55176', passenger: 'Ibrahim Touré', agency: 'Delta Bus', amount: 22000, date: '22/07/2026', status: 'REFUNDED', insufficientFunds: false },
    { id: 'R-305', ticketRef: 'TKT-55160', passenger: 'Mariam Cissé', agency: 'Sahel Transport', amount: 15000, date: '21/07/2026', status: 'BLOCKED', insufficientFunds: true },
  ]);

  readonly agencies = signal<Agency[]>([
    { id: 'AG-01', name: 'Express Voyage', contact: 'Mamadou Sow', email: 'contact@expressvoyage.sn', phone: '+221 77 123 45 67', kyc: 'VERIFIED', account: 'ACTIVE', createdAt: '12/01/2026', city: 'Dakar', description: 'Transport interurbain premium avec bus climatisés et service à bord.' },
    { id: 'AG-02', name: 'Sahel Transport', contact: 'Awa Bamba', email: 'info@saheltransport.com', phone: '+221 76 987 65 43', kyc: 'PENDING', account: 'ACTIVE', createdAt: '03/03/2026', city: 'Saint-Louis', description: 'Liaisons régulières entre Dakar et les villes du nord.' },
    { id: 'AG-03', name: 'Baobab Lines', contact: 'Cheikh Fall', email: 'booking@baobablines.com', phone: '+221 70 222 33 44', kyc: 'VERIFIED', account: 'ACTIVE', createdAt: '20/11/2025', city: 'Thiès', description: 'Réseau couvrant toute la région de Thiès avec bus modernes.' },
    { id: 'AG-04', name: 'Delta Bus', contact: 'Aïssatou Barry', email: 'support@deltabus.net', phone: '+221 78 555 66 77', kyc: 'MISSING', account: 'SUSPENDED', createdAt: '15/06/2026', city: 'Kaolack', description: 'Transport régional Kaolack et centres.' },
    { id: 'AG-05', name: 'Caravane Voyage', contact: 'Ousmane Diop', email: 'contact@caravanevoyage.com', phone: '+221 77 444 55 66', kyc: 'PENDING', account: 'ACTIVE', createdAt: '08/02/2026', city: 'Dakar', description: 'Voyages longue distance avec confort et sécurité.' },
  ]);

  readonly agencyTrips = signal<AgencyTrip[]>([
    { id: 'T-001', agencyId: 'AG-01', route: 'Dakar → Touba', departure: '08:00', arrival: '11:30', price: 5000, duration: '3h30', busType: 'Climatisé', seats: 55, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], active: true },
    { id: 'T-002', agencyId: 'AG-01', route: 'Dakar → Saint-Louis', departure: '06:30', arrival: '10:00', price: 7500, duration: '3h30', busType: 'Premium', seats: 45, days: ['Lun', 'Mer', 'Ven', 'Dim'], active: true },
    { id: 'T-003', agencyId: 'AG-01', route: 'Dakar → Thiès', departure: '07:00', arrival: '08:30', price: 2500, duration: '1h30', busType: 'Standard', seats: 60, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'], active: true },
    { id: 'T-004', agencyId: 'AG-02', route: 'Dakar → Saint-Louis', departure: '09:00', arrival: '12:30', price: 6000, duration: '3h30', busType: 'Climatisé', seats: 50, days: ['Mar', 'Jeu', 'Sam', 'Dim'], active: true },
    { id: 'T-005', agencyId: 'AG-02', route: 'Dakar → Podor', departure: '05:30', arrival: '11:00', price: 9000, duration: '5h30', busType: 'Standard', seats: 40, days: ['Lun', 'Jeu'], active: false },
    { id: 'T-006', agencyId: 'AG-03', route: 'Dakar → Thiès', departure: '06:00', arrival: '07:30', price: 2000, duration: '1h30', busType: 'Climatisé', seats: 55, days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], active: true },
    { id: 'T-007', agencyId: 'AG-03', route: 'Thiès → Mbour', departure: '10:00', arrival: '11:00', price: 1500, duration: '1h00', busType: 'Standard', seats: 48, days: ['Lun', 'Mer', 'Ven'], active: true },
    { id: 'T-008', agencyId: 'AG-05', route: 'Dakar → Kaolack', departure: '07:30', arrival: '10:30', price: 4000, duration: '3h00', busType: 'Premium', seats: 50, days: ['Mar', 'Jeu', 'Sam', 'Dim'], active: true },
  ]);

  readonly boardingPoints = signal<BoardingPoint[]>([
    { id: 'BP-01', agencyId: 'AG-01', name: 'Gare Pompiers', address: 'Avenue Léopold S. Senghor, Dakar', city: 'Dakar', departureTime: '07:45' },
    { id: 'BP-02', agencyId: 'AG-01', name: 'Arrêt Petersen', address: 'Boulevard Général de Gaulle, Dakar', city: 'Dakar', departureTime: '07:30' },
    { id: 'BP-03', agencyId: 'AG-01', name: 'Gare Routière de Pikine', address: 'Pikine, Dakar', city: 'Pikine', departureTime: '08:00' },
    { id: 'BP-04', agencyId: 'AG-02', name: 'Gare de Saint-Louis', address: 'Centre-ville, Saint-Louis', city: 'Saint-Louis', departureTime: '08:45' },
    { id: 'BP-05', agencyId: 'AG-03', name: 'Gare de Thiès', address: 'Marché central, Thiès', city: 'Thiès', departureTime: '05:45' },
    { id: 'BP-06', agencyId: 'AG-05', name: 'Gare Colobane', address: 'Médina, Dakar', city: 'Dakar', departureTime: '07:15' },
  ]);

  readonly trips = signal<Trip[]>([
    {
      id: 'TR-001', ref: 'TRJ-2026-0001', route: 'Dakar → Touba', agency: 'Baobab Lines', agencyId: 'AG-03',
      date: '25/07/2026', departure: '08:00', arrival: '11:30', duration: '3h30',
      busType: 'Climatisé Premium', busPlate: 'DK-2026-AA', driver: 'Cheikh Fall', driverPhone: '+221 70 222 33 44',
      totalSeats: 55, bookedSeats: 51, availableSeats: 4, price: 5000, revenue: 255000, commission: 25500,
      status: 'SCHEDULED', fillRate: 93,
      boardingPoints: ['Gare Pompiers', 'Arrêt Petersen', 'Gare Routière de Pikine'],
      stops: [
        { city: 'Dakar', time: '08:00', type: 'BOARDING', address: 'Gare Pompiers, Avenue L.S. Senghor' },
        { city: 'Thiès', time: '09:15', type: 'DROPOFF', address: 'Arrêt Thiès, Marché central' },
        { city: 'Touba', time: '11:30', type: 'DROPOFF', address: 'Gare de Touba, Avenue Fallou' },
      ],
      manifest: [
        { id: 'P1', name: 'Aminata Diallo', phone: '+221 77 111 22 33', seat: '1A', ticketRef: 'TKT-9001', boardingPoint: 'Gare Pompiers', paymentMethod: 'Wave', amount: 5000, status: 'BOARDED', checkedIn: true },
        { id: 'P2', name: 'Mamadou Sow', phone: '+221 77 123 45 67', seat: '1B', ticketRef: 'TKT-9002', boardingPoint: 'Gare Pompiers', paymentMethod: 'Orange Money', amount: 5000, status: 'BOARDED', checkedIn: true },
        { id: 'P3', name: 'Fatou Ndiaye', phone: '+221 76 333 44 55', seat: '2A', ticketRef: 'TKT-9003', boardingPoint: 'Arrêt Petersen', paymentMethod: 'Carte', amount: 5000, status: 'BOARDING', checkedIn: false },
        { id: 'P4', name: 'Ibrahim Touré', phone: '+225 07 888 99 00', seat: '2B', ticketRef: 'TKT-9004', boardingPoint: 'Gare Routière de Pikine', paymentMethod: 'Wave', amount: 5000, status: 'BOARDING', checkedIn: false },
        { id: 'P5', name: 'Mariam Cissé', phone: '+221 78 444 55 66', seat: '3A', ticketRef: 'TKT-9005', boardingPoint: 'Gare Pompiers', paymentMethod: 'Espèces', amount: 5000, status: 'NO_SHOW', checkedIn: false },
      ],
    },
    {
      id: 'TR-002', ref: 'TRJ-2026-0002', route: 'Dakar → Saint-Louis', agency: 'Express Voyage', agencyId: 'AG-01',
      date: '25/07/2026', departure: '06:30', arrival: '10:00', duration: '3h30',
      busType: 'Premium', busPlate: 'DK-1158-BB', driver: 'Mamadou Sow', driverPhone: '+221 77 123 45 67',
      totalSeats: 45, bookedSeats: 38, availableSeats: 7, price: 7500, revenue: 285000, commission: 28500,
      status: 'IN_PROGRESS', fillRate: 84,
      boardingPoints: ['Gare Pompiers', 'Arrêt Petersen'],
      stops: [
        { city: 'Dakar', time: '06:30', type: 'BOARDING', address: 'Gare Pompiers' },
        { city: 'Saint-Louis', time: '10:00', type: 'DROPOFF', address: 'Gare de Saint-Louis, Centre-ville' },
      ],
      manifest: [
        { id: 'P1', name: 'Kofi Mensah', phone: '+233 24 555 88 99', seat: '1A', ticketRef: 'TKT-9101', boardingPoint: 'Gare Pompiers', paymentMethod: 'Wave', amount: 7500, status: 'BOARDED', checkedIn: true },
        { id: 'P2', name: 'Ousmane Ba', phone: '+221 77 888 99 00', seat: '1B', ticketRef: 'TKT-9102', boardingPoint: 'Gare Pompiers', paymentMethod: 'Orange Money', amount: 7500, status: 'BOARDED', checkedIn: true },
        { id: 'P3', name: 'Aïssatou Barry', phone: '+221 78 555 66 77', seat: '2A', ticketRef: 'TKT-9103', boardingPoint: 'Arrêt Petersen', paymentMethod: 'Carte', amount: 7500, status: 'BOARDED', checkedIn: true },
      ],
    },
    {
      id: 'TR-003', ref: 'TRJ-2026-0003', route: 'Dakar → Thiès', agency: 'Baobab Lines', agencyId: 'AG-03',
      date: '25/07/2026', departure: '07:00', arrival: '08:30', duration: '1h30',
      busType: 'Standard', busPlate: 'DK-3344-CC', driver: 'Cheikh Fall', driverPhone: '+221 70 222 33 44',
      totalSeats: 60, bookedSeats: 60, availableSeats: 0, price: 2500, revenue: 150000, commission: 15000,
      status: 'COMPLETED', fillRate: 100,
      boardingPoints: ['Gare Pompiers', 'Gare Routière de Pikine'],
      stops: [
        { city: 'Dakar', time: '07:00', type: 'BOARDING', address: 'Gare Pompiers' },
        { city: 'Thiès', time: '08:30', type: 'DROPOFF', address: 'Marché central, Thiès' },
      ],
      manifest: [
        { id: 'P1', name: 'Aminata Diallo', phone: '+221 77 111 22 33', seat: '1A', ticketRef: 'TKT-9201', boardingPoint: 'Gare Pompiers', paymentMethod: 'Wave', amount: 2500, status: 'BOARDED', checkedIn: true },
        { id: 'P2', name: 'Fatou Ndiaye', phone: '+221 76 333 44 55', seat: '1B', ticketRef: 'TKT-9202', boardingPoint: 'Gare Routière de Pikine', paymentMethod: 'Orange Money', amount: 2500, status: 'BOARDED', checkedIn: true },
        { id: 'P3', name: 'Mariam Cissé', phone: '+221 78 444 55 66', seat: '2A', ticketRef: 'TKT-9203', boardingPoint: 'Gare Pompiers', paymentMethod: 'Espèces', amount: 2500, status: 'NO_SHOW', checkedIn: false },
      ],
    },
    {
      id: 'TR-004', ref: 'TRJ-2026-0004', route: 'Dakar → Saint-Louis', agency: 'Sahel Transport', agencyId: 'AG-02',
      date: '25/07/2026', departure: '09:00', arrival: '12:30', duration: '3h30',
      busType: 'Climatisé', busPlate: 'DK-7788-DD', driver: 'Awa Bamba', driverPhone: '+221 76 987 65 43',
      totalSeats: 50, bookedSeats: 22, availableSeats: 28, price: 6000, revenue: 132000, commission: 13200,
      status: 'DELAYED', fillRate: 44,
      boardingPoints: ['Gare de Saint-Louis'],
      stops: [
        { city: 'Dakar', time: '09:00', type: 'BOARDING', address: 'Gare Colobane, Médina' },
        { city: 'Saint-Louis', time: '12:30', type: 'DROPOFF', address: 'Gare de Saint-Louis' },
      ],
      manifest: [
        { id: 'P1', name: 'Ibrahim Touré', phone: '+225 07 888 99 00', seat: '1A', ticketRef: 'TKT-9301', boardingPoint: 'Gare Colobane', paymentMethod: 'Wave', amount: 6000, status: 'BOARDING', checkedIn: false },
        { id: 'P2', name: 'Ousmane Ba', phone: '+221 77 888 99 00', seat: '1B', ticketRef: 'TKT-9302', boardingPoint: 'Gare de Saint-Louis', paymentMethod: 'Orange Money', amount: 6000, status: 'BOARDING', checkedIn: false },
      ],
    },
    {
      id: 'TR-005', ref: 'TRJ-2026-0005', route: 'Dakar → Kaolack', agency: 'Caravane Voyage', agencyId: 'AG-05',
      date: '25/07/2026', departure: '07:30', arrival: '10:30', duration: '3h00',
      busType: 'Premium', busPlate: 'DK-5566-EE', driver: 'Aïssatou Barry', driverPhone: '+221 78 555 66 77',
      totalSeats: 50, bookedSeats: 35, availableSeats: 15, price: 4000, revenue: 140000, commission: 14000,
      status: 'SCHEDULED', fillRate: 70,
      boardingPoints: ['Gare Colobane'],
      stops: [
        { city: 'Dakar', time: '07:30', type: 'BOARDING', address: 'Gare Colobane, Médina' },
        { city: 'Kaolack', time: '10:30', type: 'DROPOFF', address: 'Gare de Kaolack' },
      ],
      manifest: [
        { id: 'P1', name: 'Aminata Diallo', phone: '+221 77 111 22 33', seat: '1A', ticketRef: 'TKT-9401', boardingPoint: 'Gare Colobane', paymentMethod: 'Wave', amount: 4000, status: 'BOARDED', checkedIn: true },
        { id: 'P2', name: 'Kofi Mensah', phone: '+233 24 555 88 99', seat: '1B', ticketRef: 'TKT-9402', boardingPoint: 'Gare Colobane', paymentMethod: 'Orange Money', amount: 4000, status: 'BOARDING', checkedIn: false },
      ],
    },
    {
      id: 'TR-006', ref: 'TRJ-2026-0006', route: 'Thiès → Mbour', agency: 'Baobab Lines', agencyId: 'AG-03',
      date: '24/07/2026', departure: '10:00', arrival: '11:00', duration: '1h00',
      busType: 'Standard', busPlate: 'DK-3344-CC', driver: 'Cheikh Fall', driverPhone: '+221 70 222 33 44',
      totalSeats: 48, bookedSeats: 12, availableSeats: 36, price: 1500, revenue: 18000, commission: 1800,
      status: 'CANCELLED', fillRate: 25,
      boardingPoints: ['Gare de Thiès'],
      stops: [
        { city: 'Thiès', time: '10:00', type: 'BOARDING', address: 'Marché central, Thiès' },
        { city: 'Mbour', time: '11:00', type: 'DROPOFF', address: 'Gare de Mbour' },
      ],
      manifest: [
        { id: 'P1', name: 'Fatou Ndiaye', phone: '+221 76 333 44 55', seat: '1A', ticketRef: 'TKT-9501', boardingPoint: 'Gare de Thiès', paymentMethod: 'Wave', amount: 1500, status: 'NO_SHOW', checkedIn: false },
      ],
    },
  ]);

  readonly applications = signal<Application[]>([
    {
      id: 'APP-001', ref: 'CAND-2026-0001', agencyName: 'Transport Ndiambour', legalRepresentative: 'Modou Ndiaye',
      email: 'contact@ndiambour.sn', phone: '+221 77 111 22 33', city: 'Thiès', address: 'Avenue Léopold S. Senghor, Thiès',
      fleetSize: 12, routesPlanned: ['Thiès → Dakar', 'Thiès → Saint-Louis', 'Thiès → Touba'],
      description: 'Société de transport interurbain basée à Thiès depuis 2015. Nous disposons d\'une flotte de bus climatisés et souhaitons étendre notre réseau via la plateforme Tansico.',
      status: 'PENDING', submittedAt: '22/07/2026',
      documents: [
        { name: 'RCCM.pdf', type: 'RCCM', size: '1.2 Mo', uploadedAt: '22/07/2026', url: '#' },
        { name: 'NINEA.pdf', type: 'NINEA', size: '850 Ko', uploadedAt: '22/07/2026', url: '#' },
        { name: 'Assurance_flotte.pdf', type: 'ASSURANCE', size: '2.1 Mo', uploadedAt: '22/07/2026', url: '#' },
        { name: 'Carte_grise_bus1.pdf', type: 'CARTE_GRISE', size: '640 Ko', uploadedAt: '22/07/2026', url: '#' },
      ],
    },
    {
      id: 'APP-002', ref: 'CAND-2026-0002', agencyName: 'Sahel Mobility', legalRepresentative: 'Aminata Sow',
      email: 'info@sahelmobility.sn', phone: '+221 76 444 55 66', city: 'Saint-Louis', address: 'Route de Rosso, Saint-Louis',
      fleetSize: 8, routesPlanned: ['Saint-Louis → Dakar', 'Saint-Louis → Rosso'],
      description: 'Nouvelle agence de transport dans le nord du Sénégal. Nous visons une clientèle premium avec des bus de moins de 3 ans.',
      status: 'UNDER_REVIEW', submittedAt: '18/07/2026', reviewedAt: '20/07/2026', reviewer: 'Admin Tansico',
      documents: [
        { name: 'RCCM.pdf', type: 'RCCM', size: '980 Ko', uploadedAt: '18/07/2026', url: '#' },
        { name: 'NINEA.pdf', type: 'NINEA', size: '720 Ko', uploadedAt: '18/07/2026', url: '#' },
        { name: 'Contrat_social.pdf', type: 'CONTRAT', size: '1.5 Mo', uploadedAt: '18/07/2026', url: '#' },
      ],
    },
    {
      id: 'APP-003', ref: 'CAND-2026-0003', agencyName: 'Casamance Express', legalRepresentative: 'Boubacar Diatta',
      email: 'casamance.express@gmail.com', phone: '+221 78 999 00 11', city: 'Ziguinchor', address: 'Avenue Cheikh Anta Diop, Ziguinchor',
      fleetSize: 15, routesPlanned: ['Ziguinchor → Dakar', 'Ziguinchor → Kolda', 'Ziguinchor → Cap Skirring'],
      description: 'Transporteur historique de Casamance avec 20 ans d\'expérience. Nous voulons digitaliser notre vente de billets.',
      status: 'APPROVED', submittedAt: '10/07/2026', reviewedAt: '15/07/2026', reviewer: 'Admin Tansico',
      documents: [
        { name: 'RCCM.pdf', type: 'RCCM', size: '1.1 Mo', uploadedAt: '10/07/2026', url: '#' },
        { name: 'NINEA.pdf', type: 'NINEA', size: '680 Ko', uploadedAt: '10/07/2026', url: '#' },
        { name: 'Assurance.pdf', type: 'ASSURANCE', size: '1.8 Mo', uploadedAt: '10/07/2026', url: '#' },
        { name: 'Carte_grise_x5.pdf', type: 'CARTE_GRISE', size: '3.2 Mo', uploadedAt: '10/07/2026', url: '#' },
        { name: 'Contrat.pdf', type: 'CONTRAT', size: '2.0 Mo', uploadedAt: '10/07/2026', url: '#' },
      ],
    },
    {
      id: 'APP-004', ref: 'CAND-2026-0004', agencyName: 'RapidLines Dakar', legalRepresentative: 'Cheikh Ba',
      email: 'rapidlines@gmail.com', phone: '+221 77 555 66 77', city: 'Dakar', address: 'Médina, Rue 10',
      fleetSize: 5, routesPlanned: ['Dakar → Thiès'],
      description: 'Petite agence de transport urbain et interurbain.',
      status: 'REJECTED', submittedAt: '05/07/2026', reviewedAt: '08/07/2026', reviewer: 'Admin Tansico',
      rejectionReason: 'Dossier incomplet : assurance non valide et nombre de bus insuffisant (minimum 8 requis).',
      documents: [
        { name: 'RCCM.pdf', type: 'RCCM', size: '900 Ko', uploadedAt: '05/07/2026', url: '#' },
      ],
    },
    {
      id: 'APP-005', ref: 'CAND-2026-0005', agencyName: 'Teranga Voyages', legalRepresentative: 'Fatou Mbaye',
      email: 'teranga.voyages@sn.com', phone: '+221 70 333 44 55', city: 'Mbour', address: 'Route de Saly, Mbour',
      fleetSize: 10, routesPlanned: ['Mbour → Dakar', 'Mbour → Saly', 'Mbour → Thiès'],
      description: 'Agence de transport touristique desservant la Petite Côte. Nous proposons des trajets confort pour les visiteurs.',
      status: 'PENDING', submittedAt: '24/07/2026',
      documents: [
        { name: 'RCCM.pdf', type: 'RCCM', size: '1.0 Mo', uploadedAt: '24/07/2026', url: '#' },
        { name: 'NINEA.pdf', type: 'NINEA', size: '750 Ko', uploadedAt: '24/07/2026', url: '#' },
        { name: 'Assurance.pdf', type: 'ASSURANCE', size: '1.4 Mo', uploadedAt: '24/07/2026', url: '#' },
      ],
    },
  ]);

  readonly users = signal<User[]>([
    { id: 'U-1001', name: 'Aminata Diallo', email: 'aminata.diallo@email.com', phone: '+221 77 111 22 33', role: 'CLIENT', status: 'ACTIVE', cancellations: 2, avatarColor: 'bg-rose-500', joinedAt: '15/01/2026', reservations: 14 },
    { id: 'U-1002', name: 'Kofi Mensah', email: 'kofi.mensah@email.com', phone: '+233 24 555 88 99', role: 'CLIENT', status: 'ACTIVE', cancellations: 0, avatarColor: 'bg-green-500', joinedAt: '22/02/2026', reservations: 7 },
    { id: 'U-1003', name: 'Mamadou Sow', email: 'm.sow@expressvoyage.sn', phone: '+221 77 123 45 67', role: 'AGENT', agency: 'Express Voyage', status: 'ACTIVE', cancellations: 1, avatarColor: 'bg-emerald-500', joinedAt: '12/01/2026', reservations: 0 },
    { id: 'U-1004', name: 'Fatou Ndiaye', email: 'fatou.ndiaye@email.com', phone: '+221 76 333 44 55', role: 'CLIENT', status: 'ACTIVE', cancellations: 5, avatarColor: 'bg-amber-500', joinedAt: '03/04/2026', reservations: 22 },
    { id: 'U-1005', name: 'Awa Bamba', email: 'a.bamba@saheltransport.com', phone: '+221 76 987 65 43', role: 'AGENT', agency: 'Sahel Transport', status: 'SUSPENDED', cancellations: 3, avatarColor: 'bg-violet-500', joinedAt: '03/03/2026', reservations: 0 },
    { id: 'U-1006', name: 'Ibrahim Touré', email: 'ibrahim.toure@email.com', phone: '+225 07 888 99 00', role: 'CLIENT', status: 'ACTIVE', cancellations: 1, avatarColor: 'bg-cyan-500', joinedAt: '18/05/2026', reservations: 9 },
    { id: 'U-1007', name: 'Cheikh Fall', email: 'c.fall@baobablines.com', phone: '+221 70 222 33 44', role: 'AGENT', agency: 'Baobab Lines', status: 'ACTIVE', cancellations: 0, avatarColor: 'bg-teal-500', joinedAt: '20/11/2025', reservations: 0 },
    { id: 'U-1008', name: 'Mariam Cissé', email: 'mariam.cisse@email.com', phone: '+221 78 444 55 66', role: 'CLIENT', status: 'SUSPENDED', cancellations: 8, avatarColor: 'bg-pink-500', joinedAt: '10/06/2026', reservations: 3 },
    { id: 'U-1009', name: 'Ousmane Ba', email: 'ousmane.ba@email.com', phone: '+221 77 888 99 00', role: 'CLIENT', status: 'ACTIVE', cancellations: 0, avatarColor: 'bg-indigo-500', joinedAt: '05/07/2026', reservations: 5 },
    { id: 'U-1010', name: 'Aïssatou Barry', email: 'a.barry@deltabus.net', phone: '+221 78 555 66 77', role: 'AGENT', agency: 'Delta Bus', status: 'SUSPENDED', cancellations: 2, avatarColor: 'bg-orange-500', joinedAt: '15/06/2026', reservations: 0 },
  ]);

  readonly tickets = signal<SupportTicket[]>([
    { id: 'T-501', subject: 'Paiement débité mais billet non reçu', user: 'Aminata Diallo', agency: 'Express Voyage', priority: 'HIGH', status: 'OPEN', date: '24/07/2026 09:20', message: 'Bonjour, j\'ai payé 12500 FCFA via Wave mais je n\'ai pas reçu mon billet. Merci d\'aide.' },
    { id: 'T-502', subject: 'Demande de remboursement - annulation', user: 'Kofi Mensah', priority: 'MEDIUM', status: 'ANSWERED', date: '23/07/2026 16:45', message: 'Mon bus a été annulé par l\'agence, je souhaite être remboursé.' },
    { id: 'T-503', subject: 'Impossible de modifier ma réservation', user: 'Fatou Ndiaye', agency: 'Baobab Lines', priority: 'LOW', status: 'OPEN', date: '23/07/2026 11:10', message: 'L\'application ne me laisse pas changer la date de mon trajet.' },
    { id: 'T-504', subject: 'Bus en retard de 3 heures', user: 'Ibrahim Touré', agency: 'Delta Bus', priority: 'HIGH', status: 'OPEN', date: '22/07/2026 20:30', message: 'Le bus prévu à 14h n\'est toujours pas arrivé à 17h.' },
    { id: 'T-505', subject: 'Compte agent bloqué', user: 'Awa Bamba', agency: 'Sahel Transport', priority: 'MEDIUM', status: 'CLOSED', date: '20/07/2026 08:00', message: 'Je ne peux plus me connecter à mon compte agent depuis ce matin.' },
  ]);

  readonly conversations = signal<SupportConversation[]>([
    {
      id: 'C-501', ticketId: 'T-501', subject: 'Paiement débité mais billet non reçu', user: 'Aminata Diallo', userAvatarColor: 'bg-rose-500', agency: 'Express Voyage', priority: 'HIGH', status: 'OPEN', lastMessage: 'Merci, j\'attends votre confirmation.', lastTime: '09:42', unread: 2,
      messages: [
        { id: 'M1', sender: 'user', text: 'Bonjour, j\'ai payé 12500 FCFA via Wave mais je n\'ai pas reçu mon billet. Merci d\'aider.', time: '09:20' },
        { id: 'M2', sender: 'admin', text: 'Bonjour Aminata, nous vérifions votre transaction. Pouvez-vous nous communiquer l\'ID de transaction Wave ?', time: '09:25' },
        { id: 'M3', sender: 'user', text: 'Oui, le voici: WVE-2026-0724-8841', time: '09:30' },
        { id: 'M4', sender: 'admin', text: 'Merci. Nous avons localisé le paiement. Le billet va être réémis dans quelques minutes.', time: '09:38' },
        { id: 'M5', sender: 'user', text: 'Merci, j\'attends votre confirmation.', time: '09:42' },
      ],
    },
    {
      id: 'C-502', ticketId: 'T-502', subject: 'Demande de remboursement - annulation', user: 'Kofi Mensah', userAvatarColor: 'bg-green-500', priority: 'MEDIUM', status: 'ANSWERED', lastMessage: 'Le remboursement a été traité sous 48h.', lastTime: 'Hier', unread: 0,
      messages: [
        { id: 'M1', sender: 'user', text: 'Mon bus a été annulé par l\'agence, je souhaite être remboursé.', time: '16:45' },
        { id: 'M2', sender: 'admin', text: 'Bonjour Kofi, nous avons bien reçu votre demande. Le remboursement sera traité sous 48h.', time: '17:00' },
        { id: 'M3', sender: 'user', text: 'Le remboursement a été traité sous 48h.', time: '17:05' },
      ],
    },
    {
      id: 'C-503', ticketId: 'T-503', subject: 'Impossible de modifier ma réservation', user: 'Fatou Ndiaye', userAvatarColor: 'bg-amber-500', agency: 'Baobab Lines', priority: 'LOW', status: 'OPEN', lastMessage: 'Je n\'arrive pas à changer la date.', lastTime: '11:10', unread: 1,
      messages: [
        { id: 'M1', sender: 'user', text: 'L\'application ne me laisse pas changer la date de mon trajet.', time: '11:10' },
      ],
    },
    {
      id: 'C-504', ticketId: 'T-504', subject: 'Bus en retard de 3 heures', user: 'Ibrahim Touré', userAvatarColor: 'bg-cyan-500', agency: 'Delta Bus', priority: 'HIGH', status: 'OPEN', lastMessage: 'Le bus prévu à 14h n\'est toujours pas là.', lastTime: '20:30', unread: 1,
      messages: [
        { id: 'M1', sender: 'user', text: 'Le bus prévu à 14h n\'est toujours pas arrivé à 17h.', time: '20:30' },
      ],
    },
    {
      id: 'C-505', ticketId: 'T-505', subject: 'Compte agent bloqué', user: 'Awa Bamba', userAvatarColor: 'bg-violet-500', agency: 'Sahel Transport', priority: 'MEDIUM', status: 'CLOSED', lastMessage: 'Problème résolu, merci.', lastTime: '08:15', unread: 0,
      messages: [
        { id: 'M1', sender: 'user', text: 'Je ne peux plus me connecter à mon compte agent depuis ce matin.', time: '08:00' },
        { id: 'M2', sender: 'admin', text: 'Bonjour Awa, votre compte a été réactivé. Vous pouvez vous connecter maintenant.', time: '08:10' },
        { id: 'M3', sender: 'user', text: 'Problème résolu, merci.', time: '08:15' },
      ],
    },
  ]);

  readonly admins = signal<AdminUser[]>([
    { id: 'A-1', name: 'Super Admin', email: 'admin@tansico.com', role: 'SUPER_ADMIN', lastActive: 'En ligne', avatarColor: 'bg-green-600', permissions: ['Toutes les permissions'] },
    { id: 'A-2', name: 'Aïcha Mbacké', email: 'aicha@tansico.com', role: 'FINANCE', lastActive: 'Il y a 2 h', avatarColor: 'bg-emerald-600', permissions: ['Voir finances', 'Valider retraits', 'Forcer remboursements'] },
    { id: 'A-3', name: 'Modou Kane', email: 'modou@tansico.com', role: 'MODERATION', lastActive: 'Hier', avatarColor: 'bg-amber-600', permissions: ['Gérer agences', 'Valider KYC', 'Gérer utilisateurs'] },
    { id: 'A-4', name: 'Fatou Sarr', email: 'fatou@tansico.com', role: 'SUPPORT', lastActive: 'Il y a 15 min', avatarColor: 'bg-cyan-600', permissions: ['Répondre tickets', 'Voir utilisateurs'] },
  ]);

  readonly auditLogs = signal<AuditLog[]>([
    { id: 'L-901', admin: 'Super Admin', action: 'a approuvé le retrait', target: 'W-1039 (Express Voyage, 200 000 FCFA)', timestamp: '24/07/2026 10:15', type: 'FINANCE' },
    { id: 'L-900', admin: 'Aïcha Mbacké', action: 'a forcé le remboursement', target: 'R-304 (Ibrahim Touré, 22 000 FCFA)', timestamp: '24/07/2026 09:40', type: 'FINANCE' },
    { id: 'L-899', admin: 'Modou Kane', action: 'a validé le KYC de', target: 'Baobab Lines', timestamp: '23/07/2026 17:22', type: 'MODERATION' },
    { id: 'L-898', admin: 'Super Admin', action: 'a suspendu l\'agence', target: 'Delta Bus', timestamp: '23/07/2026 14:05', type: 'MODERATION' },
    { id: 'L-897', admin: 'Super Admin', action: 'a modifié la commission plateforme à', target: '350 FCFA', timestamp: '22/07/2026 11:30', type: 'SETTINGS' },
    { id: 'L-896', admin: 'Aïcha Mbacké', action: 's\'est connectée depuis', target: '192.168.1.45', timestamp: '22/07/2026 08:02', type: 'AUTH' },
    { id: 'L-895', admin: 'Modou Kane', action: 'a bloqué l\'utilisateur', target: 'Mariam Cissé (U-1008)', timestamp: '21/07/2026 16:20', type: 'MODERATION' },
    { id: 'L-894', admin: 'Super Admin', action: 'a ajouté l\'admin', target: 'Fatou Sarr (Support)', timestamp: '20/07/2026 10:00', type: 'SETTINGS' },
  ]);

  readonly notifications = signal<Notification[]>([
    { id: 'N-01', title: 'Maintenance prévue', message: 'Une maintenance est prévue le 26/07 de 02h à 04h. Le service sera indisponible.', type: 'broadcast', sentAt: '24/07/2026 08:00', recipients: 12480, readCount: 8420 },
    { id: 'N-02', title: 'Nouvelle fonctionnalité', message: 'Le paiement par Orange Money est désormais disponible !', type: 'broadcast', sentAt: '20/07/2026 14:00', recipients: 12480, readCount: 11200 },
    { id: 'N-03', title: 'Avertissement annulations', message: 'Votre compte présente un taux d\'annulation élevé. Merci de contacter le support.', type: 'targeted', target: 'Fatou Ndiaye (U-1004)', sentAt: '23/07/2026 10:00', recipients: 1, readCount: 1 },
    { id: 'N-04', title: 'KYC à compléter', message: 'Veuillez soumettre vos documents pour validation de votre compte agence.', type: 'targeted', target: 'Sahel Transport (AG-02)', sentAt: '22/07/2026 09:00', recipients: 1, readCount: 0 },
  ]);

  readonly alerts = signal<Alert[]>([
    { id: 'AL-1', type: 'withdrawal', label: 'Retrait urgent', description: 'Sahel Transport - solde restant faible après retrait', amount: 320000, agency: 'Sahel Transport', severity: 'danger' },
    { id: 'AL-2', type: 'kyc', label: 'KYC à valider', description: '2 agences en attente de validation de documents', agency: 'Sahel Transport, Caravane Voyage', severity: 'warning' },
    { id: 'AL-3', type: 'refund', label: 'Remboursement bloqué', description: 'Agence sans fonds suffisants pour rembourser', amount: 12500, agency: 'Sahel Transport', severity: 'danger' },
    { id: 'AL-4', type: 'kyc', label: 'Documents manquants', description: 'Delta Bus n\'a pas soumis tous les documents requis', agency: 'Delta Bus', severity: 'warning' },
  ]);

  readonly kpis = {
    activeAgencies: 4,
    totalAgencies: 5,
    reservationsToday: 128,
    reservationsWeek: 842,
    reservationsMonth: 3412,
    totalBalance: 2919000,
    pendingRefunds: 52000,
    pendingWithdrawals: 1010000,
    totalUsers: 12480,
    newUsersThisWeek: 312,
    totalAgents: 47,
    totalClients: 12433,
    activeClientsToday: 89,
    platformRevenue: 3840000,
    avgTicketPrice: 14500,
    fillRate: 78,
    cancellationRate: 3.2,
    completionRate: 96.8,
    blockedUsers: 2,
    activeUsers: 12431,
    newUsersToday: 47,
    newUsersThisMonth: 520,
  };

  // Financial KPIs
  readonly financialKpis = {
    chiffreAffaires: 3840000,
    chiffreAffairesMoisPrecedent: 3120000,
    benefice: 1190000,
    beneficeMoisPrecedent: 890000,
    commissions: 384000,
    commissionsMoisPrecedent: 312000,
    remboursements: 52000,
    retraits: 1010000,
    soldePlateforme: 2919000,
    marge: 31,
    panierMoyen: 14500,
    volumeTransactions: 265,
  };

  // Revenue chart data (last 8 months)
  readonly revenueSeries = [1.2, 1.8, 1.5, 2.4, 2.1, 2.9, 3.4, 3.8];
  readonly revenueLabels = ['Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'];
  // Withdrawals: requested vs approved (last 8 months)
  readonly withdrawalsRequested = [8, 12, 10, 15, 13, 18, 21, 24];
  readonly withdrawalsApproved = [6, 10, 9, 12, 11, 15, 18, 20];
  // Reservations trend (last 7 days)
  readonly reservationsSeries = [142, 98, 156, 134, 178, 128, 128];
  readonly reservationsLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  // New users trend (last 8 months)
  readonly newUsersSeries = [180, 240, 210, 320, 290, 410, 480, 520];
  // User distribution for donut chart
  readonly userDistribution = [
    { label: 'Clients', value: 12433, color: '#16a34a' },
    { label: 'Agents', value: 47, color: '#16a34a' },
  ];
  // Agency KYC distribution
  readonly kycDistribution = [
    { label: 'Vérifié', value: 2, color: '#16a34a' },
    { label: 'En attente', value: 2, color: '#f59e0b' },
    { label: 'Manquant', value: 1, color: '#ef4444' },
  ];
  // Payment methods distribution
  readonly paymentDistribution = [
    { label: 'Mobile Money', value: 68, color: '#f59e0b' },
    { label: 'Carte bancaire', value: 32, color: '#16a34a' },
  ];
  // Top routes
  readonly topRoutes = [
    { route: 'Dakar → Touba', bookings: 412, revenue: 5974000, fillRate: 92 },
    { route: 'Dakar → Saint-Louis', bookings: 318, revenue: 3816000, fillRate: 85 },
    { route: 'Dakar → Thiès', bookings: 286, revenue: 2002000, fillRate: 88 },
    { route: 'Abidjan → Bouaké', bookings: 194, revenue: 3104000, fillRate: 71 },
    { route: 'Dakar → Kaolack', bookings: 152, revenue: 1368000, fillRate: 76 },
  ];
  // Recent activity feed
  readonly recentActivity = [
    { id: 'A-1', icon: 'fa-ticket', iconBg: 'bg-green-100', iconColor: 'text-green-600', text: 'Nouvelle réservation', detail: 'Aminata D. · Dakar → Touba · 12 500 FCFA', time: 'Il y a 3 min' },
    { id: 'A-2', icon: 'fa-user-plus', iconBg: 'bg-green-100', iconColor: 'text-green-600', text: 'Nouvel utilisateur inscrit', detail: 'Ibrahim T. · Client', time: 'Il y a 12 min' },
    { id: 'A-3', icon: 'fa-hand-holding-dollar', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', text: 'Demande de retrait', detail: 'Express Voyage · 150 000 FCFA', time: 'Il y a 18 min' },
    { id: 'A-4', icon: 'fa-rotate-left', iconBg: 'bg-red-100', iconColor: 'text-red-600', text: 'Ticket annulé', detail: 'Kofi M. · Baobab Lines · 18 000 FCFA', time: 'Il y a 32 min' },
    { id: 'A-5', icon: 'fa-building', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', text: 'Nouvelle agence inscrite', detail: 'Caravane Voyage · KYC en attente', time: 'Il y a 1 h' },
    { id: 'A-6', icon: 'fa-headset', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', text: 'Ticket de support ouvert', detail: 'Fatou N. · "Impossible de modifier ma réservation"', time: 'Il y a 2 h' },
  ];

  // Financial analysis data
  readonly caSeries = [2.8, 3.1, 2.9, 3.4, 3.2, 3.6, 3.8, 3.84];
  readonly beneficeSeries = [0.7, 0.9, 0.8, 1.1, 1.0, 1.2, 1.15, 1.19];
  readonly commissionsSeries = [0.28, 0.31, 0.29, 0.34, 0.32, 0.36, 0.38, 0.384];
  readonly remboursementsSeries = [0.03, 0.04, 0.05, 0.04, 0.06, 0.05, 0.04, 0.052];

  // Revenue by agency
  readonly revenueByAgency = [
    { agency: 'Baobab Lines', revenue: 980000, color: '#16a34a' },
    { agency: 'Express Voyage', revenue: 745000, color: '#16a34a' },
    { agency: 'Caravane Voyage', revenue: 560000, color: '#f59e0b' },
    { agency: 'Sahel Transport', revenue: 420000, color: '#0891b2' },
    { agency: 'Delta Bus', revenue: 215000, color: '#dc2626' },
  ];

  // Revenue by route (top 5)
  readonly revenueByRoute = [
    { route: 'Dakar → Touba', revenue: 5974000 },
    { route: 'Dakar → Saint-Louis', revenue: 3816000 },
    { route: 'Dakar → Thiès', revenue: 2002000 },
    { route: 'Abidjan → Bouaké', revenue: 3104000 },
    { route: 'Dakar → Kaolack', revenue: 1368000 },
  ];

  // Agency stats for agency stats page
  getAgencyStats(agencyId: string) {
    const statsMap: Record<string, {
      reservations: number;
      revenue: number;
      fillRate: number;
      activeTrips: number;
      rating: number;
      cancellations: number;
      monthlyReservations: number[];
    }> = {
      'AG-01': { reservations: 521, revenue: 745000, fillRate: 79, activeTrips: 3, rating: 4.6, cancellations: 18, monthlyReservations: [42, 55, 48, 61, 58, 72, 85, 100] },
      'AG-02': { reservations: 294, revenue: 420000, fillRate: 65, activeTrips: 1, rating: 3.9, cancellations: 22, monthlyReservations: [28, 32, 30, 38, 35, 42, 48, 51] },
      'AG-03': { reservations: 642, revenue: 980000, fillRate: 84, activeTrips: 2, rating: 4.8, cancellations: 12, monthlyReservations: [55, 68, 62, 75, 70, 88, 102, 122] },
      'AG-04': { reservations: 156, revenue: 215000, fillRate: 58, activeTrips: 0, rating: 3.2, cancellations: 15, monthlyReservations: [18, 22, 20, 25, 22, 28, 25, 26] },
      'AG-05': { reservations: 388, revenue: 560000, fillRate: 72, activeTrips: 1, rating: 4.3, cancellations: 9, monthlyReservations: [32, 40, 38, 45, 42, 52, 60, 79] },
    };
    return statsMap[agencyId] || statsMap['AG-01'];
  }

  // User profile detail data
  getUserProfile(userId: string) {
    const user = this.users().find(u => u.id === userId);
    if (!user) return null;
    const userReservations = this.reservations().filter(r => r.passenger === user.name);
    const userTransactions = this.transactions().filter(t => t.user === user.name);
    return {
      user,
      reservations: userReservations,
      transactions: userTransactions,
      stats: {
        totalReservations: userReservations.length,
        completed: userReservations.filter(r => r.status === 'COMPLETED').length,
        cancelled: userReservations.filter(r => r.status === 'CANCELLED').length,
        noShow: userReservations.filter(r => r.status === 'NO_SHOW').length,
        totalSpent: userReservations.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + r.amount, 0),
        avgTicket: userReservations.length ? Math.round(userReservations.reduce((s, r) => s + r.amount, 0) / userReservations.length) : 0,
        favoriteRoute: this.favoriteRoute(userReservations),
      },
    };
  }

  private favoriteRoute(reservations: Reservation[]): string {
    if (!reservations.length) return '—';
    const counts: Record<string, number> = {};
    reservations.forEach(r => { counts[r.route] = (counts[r.route] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Reservation stats for finance pages
  readonly reservationStats = {
    total: 3412,
    confirmed: 2890,
    completed: 2654,
    cancelled: 412,
    noShow: 66,
    today: 128,
    week: 842,
    month: 3412,
    year: 28560,
    cancellationRate: 12.1,
    completionRate: 77.8,
  };

  // Transaction type KPIs
  readonly transactionTypeStats = {
    payment: { count: 265, volume: 3840000, label: 'Paiements' },
    withdrawal: { count: 24, volume: 1010000, label: 'Retraits' },
    refund: { count: 18, volume: 52000, label: 'Remboursements' },
    commission: { count: 265, volume: 384000, label: 'Commissions' },
    topup: { count: 32, volume: 1200000, label: 'Recharges' },
  };

  // Moderation stats (users & agencies)
  readonly moderationStats = {
    users: {
      total: 12480,
      active: 12431,
      blocked: 2,
      newThisWeek: 312,
      newThisMonth: 520,
      clients: 12433,
      agents: 47,
      avgReservationsPerUser: 3.2,
      cancellationRate: 3.2,
    },
    agencies: {
      total: 5,
      active: 4,
      suspended: 1,
      kycVerified: 2,
      kycPending: 2,
      kycMissing: 1,
      avgReservationsPerAgency: 682,
      avgFillRate: 72,
    },
    reservationsByStatus: [
      { label: 'Confirmées', value: 2890, color: '#16a34a' },
      { label: 'Terminées', value: 2654, color: '#16a34a' },
      { label: 'Annulées', value: 412, color: '#ef4444' },
      { label: 'No-show', value: 66, color: '#f59e0b' },
    ],
    usersByType: [
      { label: 'Clients', value: 12433, color: '#16a34a' },
      { label: 'Agents', value: 47, color: '#16a34a' },
    ],
    monthlyNewUsers: [180, 240, 210, 320, 290, 410, 480, 520],
    monthlyReservations: [2200, 2400, 2100, 2800, 2600, 3100, 3200, 3412],
  };

  // Wallet detail KPIs (computed per wallet)
  getWalletDetail(walletId: string) {
    const wallet = this.wallets().find(w => w.id === walletId);
    if (!wallet) return null;
    const txns = this.walletTransactions().filter(t => t.walletId === walletId);
    const agencyWithdrawals = this.withdrawals().filter(w => w.agency === wallet.agency);
    const totalIn = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = Math.abs(txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const platformCommission = txns.filter(t => t.type === 'COMMISSION').reduce((s, t) => s + Math.abs(t.amount), 0);
    const agencyRevenue = txns.filter(t => t.type === 'RESERVATION').reduce((s, t) => s + t.amount, 0);
    const refundTotal = Math.abs(txns.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0));
    return {
      wallet,
      transactions: txns,
      withdrawals: agencyWithdrawals,
      kpis: {
        totalIn,
        totalOut,
        agencyRevenue,
        platformCommission,
        refundTotal,
        netBalance: wallet.available + wallet.reserved,
        transactionCount: txns.length,
        withdrawalCount: agencyWithdrawals.length,
      },
    };
  }
}
