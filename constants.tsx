
import { UserRole, FileMetadata, ActivityLog, UserProfile, OrganizationInfo } from './types';

export const MOCK_ORGS: OrganizationInfo[] = [
  { id: 'ORG-8921-SCG', name: 'SecureCorp Global', industry: 'Financial Services', status: 'active', onboardedDate: '2024-01-10', totalUsers: 45, totalFiles: 1200 },
  { id: 'ORG-4452-TNI', name: 'TechNode Industries', industry: 'Tech & Engineering', status: 'active', onboardedDate: '2024-02-15', totalUsers: 28, totalFiles: 850 },
  { id: 'ORG-7713-CDS', name: 'CyberDyne Systems', industry: 'Healthcare / Pharma', status: 'pending', onboardedDate: '2024-03-22', totalUsers: 5, totalFiles: 12 },
];

export const MOCK_USERS: UserProfile[] = [
  { id: 'USR-ADMIN-01', name: 'Platform Master', email: 'admin@securesphere.com', role: UserRole.SUPER_ADMIN, organization: 'SecureSphere Platform', orgId: 'ORG-ADMIN-PLATFORM' },
  { id: 'USR-MGR-01', name: 'Sarah Manager', email: 'sarah@org.com', role: UserRole.MANAGER, organization: 'SecureCorp Global', orgId: 'ORG-8921-SCG' },
  { id: 'USR-DEV-01', name: 'John Dev', email: 'john@org.com', role: UserRole.DEVELOPER, organization: 'SecureCorp Global', orgId: 'ORG-8921-SCG' },
  { id: 'USR-AUD-01', name: 'Alice Auditor', email: 'alice@security.com', role: UserRole.AUDITOR, organization: 'SecureCorp Global', orgId: 'ORG-8921-SCG' },
  { id: 'USR-TEST-01', name: 'Tom Tester', email: 'tom@org.com', role: UserRole.TESTER, organization: 'SecureCorp Global', orgId: 'ORG-8921-SCG' },
  { id: 'USR-DES-01', name: 'Diana Designer', email: 'diana@org.com', role: UserRole.DESIGNER, organization: 'SecureCorp Global', orgId: 'ORG-8921-SCG' },

  // TechNode Industries
  { id: 'USR-MGR-02', name: 'Mike Manager', email: 'mike@technode.com', role: UserRole.MANAGER, organization: 'TechNode Industries', orgId: 'ORG-4452-TNI' },
  { id: 'USR-AUD-02', name: 'Arthur Auditor', email: 'arthur@technode.com', role: UserRole.AUDITOR, organization: 'TechNode Industries', orgId: 'ORG-4452-TNI' },
  { id: 'USR-TNI-01', name: 'TechNode Dev', email: 'technode@org.com', role: UserRole.DEVELOPER, organization: 'TechNode Industries', orgId: 'ORG-4452-TNI' }, // Updated to Dev role

  // CyberDyne Systems
  { id: 'USR-MGR-03', name: 'Cynthia Manager', email: 'cynthia@cyberdyne.com', role: UserRole.MANAGER, organization: 'CyberDyne Systems', orgId: 'ORG-7713-CDS' },
  { id: 'USR-AUD-03', name: 'Alex Auditor', email: 'alex@cyberdyne.com', role: UserRole.AUDITOR, organization: 'CyberDyne Systems', orgId: 'ORG-7713-CDS' },
];

export const MOCK_FILES: FileMetadata[] = [
  {
    id: 'f1', name: 'Project_Alpha_Spec.pdf', size: 1024 * 1024 * 2.5, type: 'pdf',
    uploaderId: 'USR-DEV-01', uploaderName: 'John Dev', timestamp: '2024-03-20T10:30:00Z',
    status: 'active', permissions: ['USR-DEV-01', 'USR-AUD-01'],
    scanStatus: 'clean', encryptionLevel: 'AES-256-GCM', watermarked: true
  },
  {
    id: 'f2', name: 'Annual_Report_2023.xlsx', size: 1024 * 512, type: 'xlsx',
    uploaderId: 'USR-MGR-01', uploaderName: 'Sarah Manager', timestamp: '2024-03-19T14:20:00Z',
    status: 'active', permissions: ['all'],
    scanStatus: 'clean', encryptionLevel: 'AES-256-GCM', watermarked: true
  }
];

export const MOCK_LOGS: ActivityLog[] = [
  { id: 'l1', userId: 'USR-MGR-01', userName: 'Sarah Manager', action: 'LOGIN', timestamp: '2024-03-21T08:00:00Z', details: 'User logged in from IP 192.168.1.1', severity: 'low', orgId: 'ORG-8921-SCG' },
  { id: 'l7', userId: 'USR-DEV-01', userName: 'John Dev', action: 'SECURITY_SCAN', fileName: 'Project_Alpha_Spec.pdf', timestamp: '2024-03-20T10:28:00Z', details: 'GuardDuty Malware Scan: Passed', severity: 'low', orgId: 'ORG-8921-SCG' },
  { id: 'l2', userId: 'USR-DEV-01', userName: 'John Dev', action: 'UPLOAD', fileId: 'f1', fileName: 'Project_Alpha_Spec.pdf', timestamp: '2024-03-20T10:30:00Z', details: 'AES-256-GCM Encrypted file stored in S3', severity: 'low', orgId: 'ORG-8921-SCG' },
  { id: 'l9', userId: 'u9', userName: 'Marcus Chief', action: 'SECURITY_REJECTION', fileName: 'Suspicious_File.exe', timestamp: '2024-03-22T11:45:00Z', details: 'Infection detected in org: TechNode. Process blocked.', severity: 'high', orgId: 'ORG-4452-TNI' },
];
