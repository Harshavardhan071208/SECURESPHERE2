
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  AUDITOR = 'AUDITOR',
  TESTER = 'TESTER',
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  orgId?: string; // Organization ID for isolation
  publicKey?: string; // For hybrid encryption
}

export interface OrganizationInfo {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'pending' | 'suspended';
  onboardedDate: string;
  totalUsers: number;
  totalFiles: number;
  bucketName?: string; // S3 Bucket for the organization
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploaderId: string;
  uploaderName: string;
  timestamp: string;
  status: 'active' | 'deleted' | 'received' | 'acknowledged';
  permissions: string[];
  // Security Fields
  scanStatus: 'clean' | 'infected' | 'pending';
  encryptionLevel: 'AES-256-GCM' | 'AES-128 + RSA';
  watermarked: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: 'LOGIN' | 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'SHARE' | 'SECURITY_SCAN' | 'ENCRYPTION' | 'WATERMARK' | 'SECURITY_REJECTION';
  fileId?: string;
  fileName?: string;
  timestamp: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  orgId?: string; // Track which organization the log belongs to
}

export interface DashboardStats {
  totalFiles: number;
  activeUsers: number;
  storageUsed: string;
  securityAlerts: number;
}
