
import React, { useState, useEffect } from 'react';
import GlassCard from '../GlassCard';
import GlassToast from '../GlassToast';
import { MOCK_FILES } from '../../constants';
import { UserProfile, FileMetadata } from '../../types';
import { ClientCrypto } from '@/lib/security/crypto/ClientCrypto';
import { addWatermark } from '@/lib/security/WatermarkService'; // Import Watermark Service

import {
  Upload,
  FileText,
  Download,
  Share2,
  MoreVertical,
  Search,
  Plus,
  CheckCircle,
  Inbox,
  ArrowDownToLine,
  MailCheck,
  ShieldCheck,
  Lock,
  Stamp,
  RefreshCcw,
  X,
  Bug,
  ShieldAlert,
  Ban,
  UserCheck,
  Building,
  KeyRound,
  Send,
  Trash2,
  Bell
} from 'lucide-react';

type UploadStep = 'IDLE' | 'SCANNING' | 'ENCRYPTING' | 'WATERMARKING' | 'UPLOADING' | 'COMPLETE' | 'ERROR';

interface SessionLog {
  id: string;
  fileName: string;
  status: 'Clean' | 'Infected';
  timestamp: string;
}

const UserDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [acknowledgedFiles, setAcknowledgedFiles] = useState<Set<string>>(new Set());
  const [receivedFiles, setReceivedFiles] = useState<Set<string>>(new Set());

  const keyInputRef = React.useRef<HTMLInputElement>(null); // Ref for key upload input

  // Local state for files to support deletion and addition
  const [files, setFiles] = useState<FileMetadata[]>(MOCK_FILES);

  // Upload Wizard State
  const [uploadStep, setUploadStep] = useState<UploadStep>('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [simulateInfection, setSimulateInfection] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);

  // Notification State
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileMetadata | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ isVisible: boolean, message: string, type: 'success' | 'error' | 'info' | 'warning', details?: string }>({
    isVisible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning', details?: string) => {
    setToast({ isVisible: true, message, type, details });
  };

  const [shareFormData, setShareFormData] = useState({
    orgId: '',
    receiverOrgId: '',
    userId: '',
    encryptionText: ''
  });

  // Demo Key State
  const [demoPrivateKey, setDemoPrivateKey] = useState<string | null>(null);

  // Fetch files function (reusable)
  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/list-files?userId=${user.id}&orgId=${user.orgId || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          const userFiles: FileMetadata[] = data.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            size: f.size || 0,
            type: f.name.split('.').pop() || 'unknown',
            uploaderId: f.uploaderId || user.id, // Use API returned sender ID
            uploaderName: f.uploaderName || f.uploaderId || user.name,
            timestamp: f.timestamp,
            status: f.status || 'active',
            permissions: [user.id],
            scanStatus: 'clean',
            encryptionLevel: 'AES-128 + RSA',
            watermarked: true
          }));

          setFiles(prev => {
            // Merge logic: ensure we don't lose mock files if we want them, 
            // but for "Shared with Me" fixing, let's prioritize API data.
            // If API returns shared files, they will have correct uploaderId.

            // Simple approach: Use API files mostly, but keep mocks if needed.
            // Let's just USE API files + Mocks for now, distinct by ID.
            const apiIds = new Set(userFiles.map(u => u.id));
            const existingMocks = MOCK_FILES.filter(m => !apiIds.has(m.id));
            return [...userFiles, ...existingMocks];
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchFiles();
  }, [user.id, user.orgId]);

  // --- NOTIFICATION SYSTEM ---
  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          // Sort by timestamp desc
          const sorted = data.notifications.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setNotifications(sorted);

          const newNotifs = sorted.filter((n: any) => !n.read);
          setUnreadCount(newNotifs.length);

          // Check if we have new SHARED files to trigger refresh
          const hasNewShares = newNotifs.some((n: any) => n.type === 'FILE_SHARED');
          if (hasNewShares) {
            // Refresh file list to show new shared file
            fetchFiles();
          }
        }
      } catch (e) {
        console.error("Notification polling error", e);
      }
    };

    pollNotifications(); // Initial poll
    const interval = setInterval(pollNotifications, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [user.id]);
  // ---------------------------

  // File Input Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // NOTE: We rely on the `simulateInfection` state, but React state updates might be async.
      // However, `simulateInfection` is set via checkbox beforehand, so it's stable.
      processUpload(file);
      e.target.value = ''; // Reset input to allow re-uploading same file if needed
    }
  };

  const processUpload = async (file: File) => {
    // 1. Initialize State
    setUploadStep('SCANNING'); // Start with Scanning phase
    setUploadProgress(10);

    try {
      // 2. Prepare FormData for Secure Upload API
      const formData = new FormData();

      if (simulateInfection) {
        // Create a new File with EICAR string appended
        const eicarString = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
        const newBlob = new Blob([file, eicarString], { type: file.type });
        formData.append('file', new File([newBlob], file.name, { type: file.type }));
      } else {
        formData.append('file', file);
      }

      // Use actual user ID and Name
      formData.append('senderId', user.id);
      formData.append('receiverId', user.id); // Uploading to self (Personal Vault)
      formData.append('orgBucket', 'securesphere-quarantine');
      formData.append('orgId', user.orgId || 'org_unknown');

      // Simulate progress for UI feedback while waiting for server
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      // 3. Call Secure Upload API
      // This API handles: Virus Scan -> AES Encryption -> RSA Encryption of Key -> S3 Upload
      const response = await fetch('/api/secure-upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        // Handle Malware specific error (406)
        if (response.status === 406) {
          throw new Error(`Security Violation: ${errorData.error}`);
        }
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log("Secure Upload Success:", result);

      // 4. Update UI Success State
      setUploadProgress(100);
      setUploadStep('COMPLETE');
      setSessionLogs(prev => [{
        id: Math.random().toString(36),
        fileName: file.name,
        status: 'Clean',
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
      showToast('File Uploaded Securely', 'success', `File: ${file.name}\nKey: ${result.path}\nEncryption: AES-128 + RSA`);

      // Add file to the list
      const newFile: FileMetadata = {
        id: result.path || `f-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop() || 'unknown',
        uploaderId: user.id,
        uploaderName: user.name,
        timestamp: new Date().toISOString(),
        status: 'active',
        permissions: [user.id], // Owner has permission
        scanStatus: 'clean',
        encryptionLevel: 'AES-128 + RSA',
        watermarked: true
      };
      setFiles(prev => [newFile, ...prev]);

    } catch (error: any) {
      console.error("Upload failed", error);

      setUploadStep('ERROR');
      setUploadProgress(100);

      // Determine if it was a virus or other error for the log
      const isVirus = error.message.includes("Security Violation") || error.message.includes("Virus");

      setSessionLogs(prev => [{
        id: Math.random().toString(36),
        fileName: file.name,
        status: isVirus ? 'Infected' : 'Clean', // Just to match type, logic implies infected if virus
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);

      if (!isVirus) {
        showToast('Upload Error', 'error', error.message);
      } else {
        showToast('Infection Blocked', 'error', error.message);
      }
    }
  };

  const pollStatus = async (fileId: string, file: File) => {
    // FALLBACK SIMULATION:
    // Since we cannot verify if your Real AWS Lambdas are deployed and running,
    // we will simulate the successful pipeline steps so you can see the UI flow.

    // Step 1: Scanning (Real upload finished, now "processing")
    setUploadStep('SCANNING');

    setTimeout(() => {
      // Step 2: Clean -> Encrypting
      setUploadProgress(60);
      setUploadStep('ENCRYPTING');
    }, 2500);

    setTimeout(() => {
      // Step 3: Encrypted -> Watermarking
      setUploadProgress(80);
      setUploadStep('WATERMARKING');
    }, 5000);

    setTimeout(() => {
      // Step 4: Ready/Complete
      setUploadProgress(100);
      setUploadStep('COMPLETE');
      setSessionLogs(prev => [{
        id: fileId,
        fileName: file.name,
        status: 'Clean', // Simulated Success
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
    }, 7500);
  };



  const handleReceive = async (file: FileMetadata) => {
    try {
      // 1. Update File Status in S3 Metadata
      const res = await fetch('/api/update-file-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          status: 'received',
          userId: user.id,
          orgId: user.orgId
        })
      });

      if (!res.ok) throw new Error('Failed to update status');

      // 2. Notify Sender
      if (file.uploaderId) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: file.uploaderId, // Ensure this is the SENDER ID not self
            fromUserId: user.id,
            fromOrgId: user.orgId,
            type: 'FILE_RECEIVED',
            fileId: file.id,
            fileName: file.name,
            message: `File '${file.name}' has been marked as RECEIVED by ${user.name}.`
          })
        });
      }

      showToast('File Received', 'success', 'Sender has been notified.');
      // Update local state to reflect change immediately
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'received' } : f));

    } catch (err: any) {
      console.error("Receive Error:", err);
      showToast('Error', 'error', err.message);
    }
  };

  const handleAcknowledge = async (file: FileMetadata) => {
    try {
      // 1. Update File Status
      const res = await fetch('/api/update-file-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          status: 'acknowledged',
          userId: user.id,
          orgId: user.orgId
        })
      });

      if (!res.ok) throw new Error('Failed to update status');

      // 2. Notify Sender
      if (file.uploaderId) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: file.uploaderId,
            fromUserId: user.id,
            fromOrgId: user.orgId,
            type: 'FILE_ACKNOWLEDGED',
            fileId: file.id,
            fileName: file.name,
            message: `File '${file.name}' has been ACKNOWLEDGED by ${user.name}.`
          })
        });
      }

      showToast('File Acknowledged', 'success', 'Acknowledgement sent to sender.');
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'acknowledged' } : f));

    } catch (err: any) {
      console.error("Acknowledge Error:", err);
      showToast('Error', 'error', err.message);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file from your secure vault?')) {
      // Find the file to get its S3 key (which we mapped to 'id' or 'encryptedKeyPath')
      // In our listing logic, we set id = obj.Key. So fileId IS the S3 Key.
      // Wait, for mock files, id is 'f1'. For real files, id is 'username/file.enc'.
      if (!fileId.includes('/')) {
        // It's a mock file, just remove from UI
        setFiles(prev => prev.filter(f => f.id !== fileId));
        showToast('File Deleted', 'warning', `Mock file ${fileId} removed from UI.`);
        return;
      }

      try {
        const res = await fetch(`/api/delete-file?key=${encodeURIComponent(fileId)}&userId=${user.id}&orgId=${user.orgId || ''}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setFiles(prev => prev.filter(f => f.id !== fileId));
          showToast('File Deleted', 'warning', `File ID: ${fileId} removed from secure vault.`);
        } else {
          const data = await res.json();
          showToast('Delete Failed', 'error', data.error || 'Could not delete file');
        }
      } catch (err: any) {
        showToast('Delete Failed', 'error', err.message);
      }
    }
  };

  // Filter for "My Files"
  const myFiles = files.filter(f =>
    f.uploaderId === user.id &&
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter for "Shared with Me"
  // Shows files where permissions includes user.id or 'all', AND user is NOT the uploader
  const sharedFiles = files.filter(f =>
    ((f.permissions && (f.permissions.includes(user.id) || f.permissions.includes('all'))) || false) &&
    f.uploaderId !== user.id
  );



  // --- SECURE DOWNLOAD LOGIC ---
  /* State for User's Private Key (Uploaded) */
  const [userPrivateKey, setUserPrivateKey] = useState<string>('');

  const handleKeyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content.includes('BEGIN RSA PRIVATE KEY') || content.includes('BEGIN PRIVATE KEY')) {
        setUserPrivateKey(content);
        showToast('Private Key Loaded', 'success', 'You can now decrypt and download files.');
      } else {
        showToast('Invalid Key File', 'error', 'Please upload a valid PEM Private Key.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      if (!fileId.includes('/') && !fileId.startsWith('organisations')) {
        showToast('Download Not Available', 'info', "Cannot download mock files. Please upload a real file to test download.");
        return;
      }

      // Check if Private Key is loaded
      if (!userPrivateKey) {
        showToast('Decryption Key Missing', 'error', 'Please "Load Private Key" (top right) to decrypt this file.');
        // Trigger the file input click
        const fileInput = document.getElementById('privateKeyInput');
        fileInput?.click();
        return;
      }

      showToast('Initiating Secure Download', 'info', 'Fetching encrypted bundle from server...');

      // 1. Fetch Encrypted Bundle
      const response = await fetch(`/api/download-file?key=${encodeURIComponent(fileId)}&userId=${user.id}&orgId=${user.orgId || ''}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Download failed');

      showToast('Decrypting', 'info', 'Decrypting content locally with your Private Key...');

      // 2. Client-Side Decryption
      const decryptedBlob = await ClientCrypto.decryptFile(
        data.encryptedFile,
        data.encryptedKey,
        data.encryptedIv,
        data.authTag,
        userPrivateKey
      );

      // 3. Apply Watermark (Client-Side)
      const watermarkedBlob = await addWatermark(
        decryptedBlob,
        user.id, // User Unique ID
        data.fileName || fileName
      );

      // 4. Trigger Download of Watermarked Content
      const url = window.URL.createObjectURL(watermarkedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.fileName || fileName; // Use clean name from server or fallback
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      showToast('Download Complete', 'success', 'File decrypted, watermarked, and saved successfully.');

      // Notify user (Local Log Update)
      setSessionLogs(prev => [{
        id: Math.random().toString(36),
        fileName: fileName,
        status: 'Clean',
        timestamp: new Date().toLocaleTimeString() + ' (Decrypted & Watermarked)'
      }, ...prev]);

    } catch (err: any) {
      console.error("Secure Download/Decryption Error:", err);
      showToast('Decryption Failed', 'error', err.message || "Failed to decrypt. Check your key.");
    }
  };

  const handleShare = (file: FileMetadata) => {
    setSelectedFileForShare(file);
    // Pre-fill sender info
    setShareFormData({ orgId: user.orgId || '', receiverOrgId: '', userId: '', encryptionText: '' });
    setShowShareModal(true);
  };

  const submitShare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFileForShare) {
      showToast('Share Failed', 'error', 'No file selected for sharing.');
      return;
    }

    try {
      showToast('Initiating Secure Share', 'info', 'Re-encrypting AES keys for receiver...');

      const response = await fetch('/api/secure-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedFileForShare.id, // Using S3 key as ID
          senderUserId: user.id,
          senderOrgId: user.orgId,
          receiverUserId: shareFormData.userId,
          receiverOrgId: shareFormData.receiverOrgId,
          encryptionText: shareFormData.encryptionText
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Share failed');
      }

      setShowShareModal(false);
      showToast('File Shared Successfully', 'success', `File: ${selectedFileForShare.name}\nReceiver: ${shareFormData.userId}\nNew Path: ${result.newPath}`);

      // Clear form
      setShareFormData({ orgId: '', receiverOrgId: '', userId: '', encryptionText: '' });

      // Send Notification to Receiver
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: shareFormData.userId,
          fromUserId: user.id,
          fromOrgId: user.orgId,
          type: 'FILE_SHARED',
          fileId: selectedFileForShare.id,
          fileName: selectedFileForShare.name,
          message: `You have received a file from ${user.organization || user.orgId} - ${user.name}.`
        })
      });

    } catch (err: any) {
      console.error("Share error:", err);
      showToast('Share Failed', 'error', err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Hidden Input for Private Key Upload */}
      <input
        type="file"
        ref={keyInputRef}
        onChange={handleKeyUpload}
        accept=".pem,.key,.txt"
        className="hidden"
      />
      {/* Upload Wizard Modal */}
      {uploadStep !== 'IDLE' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <GlassCard className={`max-w-md w-full p-8 transition-all duration-500 shadow-2xl ${uploadStep === 'ERROR' ? 'border-rose-500/50 shadow-rose-500/10' : 'border-indigo-500/30 shadow-indigo-500/10'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${uploadStep === 'ERROR' ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {uploadStep === 'ERROR' ? <ShieldAlert size={20} /> : <RefreshCcw size={20} className="animate-spin" />}
                </div >
                <h3 className="text-xl font-bold">Security Pipeline</h3>
              </div >
              {(uploadStep === 'COMPLETE' || uploadStep === 'ERROR') && (
                <button onClick={() => setUploadStep('IDLE')} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              )}
            </div >

            <div className="space-y-6 relative">
              <div className="absolute left-5 top-5 bottom-5 w-[1px] bg-white/5 z-0" />

              {/* Step 1: Scan */}
              <div className={`flex items-center gap-4 relative z-10 transition-all ${uploadStep === 'SCANNING' ? 'scale-105' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${uploadStep === 'SCANNING' ? 'bg-indigo-500 border-indigo-400 animate-pulse' :
                  (['ENCRYPTING', 'WATERMARKING', 'UPLOADING', 'COMPLETE'].includes(uploadStep) ? 'bg-emerald-500 border-emerald-400' :
                    (uploadStep === 'ERROR' ? 'bg-rose-500 border-rose-400' : 'bg-white/5 border-white/10 opacity-40'))
                  }`}>
                  {uploadStep === 'ERROR' ? <Bug size={20} /> : (['ENCRYPTING', 'WATERMARKING', 'UPLOADING', 'COMPLETE'].includes(uploadStep) ? <CheckCircle size={20} /> : <ShieldCheck size={20} />)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${uploadStep === 'ERROR' ? 'text-rose-400' : 'text-white'}`}>1. Malware Analysis</p>
                  <p className="text-xs opacity-50">GuardDuty & ClamAV Engine</p>
                </div>
              </div>

              {/* Sequential blocking logic */}
              <div className={`flex items-center gap-4 relative z-10 transition-all ${uploadStep === 'ERROR' ? 'opacity-20 grayscale' : (uploadStep === 'ENCRYPTING' ? 'scale-105' : 'opacity-40')}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${uploadStep === 'ENCRYPTING' ? 'bg-indigo-500 border-indigo-400 animate-pulse opacity-100' :
                  (['WATERMARKING', 'UPLOADING', 'COMPLETE'].includes(uploadStep) ? 'bg-emerald-500 border-emerald-400 opacity-100' : 'bg-white/5 border-white/10')
                  }`}>
                  {['WATERMARKING', 'UPLOADING', 'COMPLETE'].includes(uploadStep) ? <CheckCircle size={20} /> : <Lock size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">2. AES-128 + RSA Vault</p>
                  <p className="text-xs opacity-50">Cryptographic Locking</p>
                </div>
                {uploadStep === 'ERROR' && <Ban size={16} className="text-rose-500 ml-auto" />}
              </div>

              <div className={`flex items-center gap-4 relative z-10 transition-all ${uploadStep === 'ERROR' ? 'opacity-20 grayscale' : (uploadStep === 'WATERMARKING' ? 'scale-105' : 'opacity-40')}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${uploadStep === 'WATERMARKING' ? 'bg-indigo-500 border-indigo-400 animate-pulse opacity-100' :
                  (['UPLOADING', 'COMPLETE'].includes(uploadStep) ? 'bg-emerald-500 border-emerald-400 opacity-100' : 'bg-white/5 border-white/10')
                  }`}>
                  {['UPLOADING', 'COMPLETE'].includes(uploadStep) ? <CheckCircle size={20} /> : <Stamp size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">3. Ownership Stamp</p>
                  <p className="text-xs opacity-50">Dynamic Org Watermark</p>
                </div>
                {uploadStep === 'ERROR' && <Ban size={16} className="text-rose-500 ml-auto" />}
              </div>

              <div className={`flex items-center gap-4 relative z-10 transition-all ${uploadStep === 'ERROR' ? 'opacity-20 grayscale' : (uploadStep === 'UPLOADING' ? 'scale-105' : 'opacity-40')}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${uploadStep === 'UPLOADING' ? 'bg-indigo-500 border-indigo-400 animate-pulse opacity-100' :
                  (uploadStep === 'COMPLETE' ? 'bg-emerald-500 border-emerald-400 opacity-100' : 'bg-white/5 border-white/10')
                  }`}>
                  {uploadStep === 'COMPLETE' ? <CheckCircle size={20} /> : <Upload size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">4. Cloud Finalization</p>
                  <p className="text-xs opacity-50">Storage in Isolated S3</p>
                </div>
                {uploadStep === 'ERROR' && <Ban size={16} className="text-rose-500 ml-auto" />}
              </div>
            </div >

            <div className="mt-10">
              <div className={`w-full h-2 rounded-full overflow-hidden ${uploadStep === 'ERROR' ? 'bg-rose-900/20' : 'bg-white/10'}`}>
                <div
                  className={`h-full transition-all duration-300 ease-linear ${uploadStep === 'ERROR' ? 'bg-rose-500 w-full' : 'bg-indigo-500'}`}
                  style={{ width: uploadStep === 'COMPLETE' || uploadStep === 'ERROR' ? '100%' : `${uploadProgress}%` }}
                />
              </div >
              <div className="flex items-center justify-center gap-2 mt-4">
                {uploadStep === 'ERROR' && <ShieldAlert size={14} className="text-rose-400" />}
                <p className={`text-xs uppercase font-black tracking-widest text-center ${uploadStep === 'ERROR' ? 'text-rose-400' : 'text-indigo-400'}`}>
                  {uploadStep === 'COMPLETE' ? 'Secure Transfer Successful' :
                    uploadStep === 'ERROR' ? 'Infection Blocked - Access Denied' :
                      `Step ${['SCANNING', 'ENCRYPTING', 'WATERMARKING', 'UPLOADING'].indexOf(uploadStep) + 1} In Progress...`}
                </p >
              </div >
            </div >

            {(uploadStep === 'COMPLETE' || uploadStep === 'ERROR') && (
              <button
                onClick={() => setUploadStep('IDLE')}
                className={`w-full mt-8 py-4 rounded-2xl text-white font-bold transition-all shadow-xl active:scale-95 ${uploadStep === 'ERROR' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                  }`}
              >
                {uploadStep === 'ERROR' ? 'Discard Malicious File' : 'Continue to Workspace'}
              </button>
            )}
          </GlassCard >
        </div >
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <GlassCard className="max-w-md w-full p-8 border-purple-500/30 shadow-2xl shadow-purple-500/10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Secure Share</h3>
                  <p className="text-xs opacity-50">Encrypting: {selectedFileForShare?.name || '...'}</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={submitShare} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Org ID</label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                  <input
                    required
                    type="text"
                    placeholder="Source Organization ID"
                    value={shareFormData.orgId}
                    onChange={e => setShareFormData({ ...shareFormData, orgId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Receiver Org ID</label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                  <input
                    required
                    type="text"
                    placeholder="Target Organization ID"
                    value={shareFormData.receiverOrgId}
                    onChange={e => setShareFormData({ ...shareFormData, receiverOrgId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">User ID</label>
                <div className="relative">
                  <UserCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                  <input
                    required
                    type="text"
                    placeholder="Recipient User ID"
                    value={shareFormData.userId}
                    onChange={e => setShareFormData({ ...shareFormData, userId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">Encryption Key / Note</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-3 opacity-30" />
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter custom encryption key or secure note..."
                    value={shareFormData.encryptionText}
                    onChange={e => setShareFormData({ ...shareFormData, encryptionText: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-purple-500/50 transition-all text-sm resize-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-white/10">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1 mb-2">Cryptographic Envelope Details</p>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50">AES-128 Key Status:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Lock size={10} /> Encrypted for Receiver</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50">Watermark ID:</span>
                    <span className="text-purple-400 font-bold">{user.id} → {shareFormData.userId || '...'}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-xl shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={18} /> Encrypt & Share
              </button>
            </form>
          </GlassCard>
        </div>
      )}
      {/* DEMO KEY DISPLAY */}
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Secure Workspace: <span className="text-indigo-400">{user.role} Sector</span></h2>
          <p className="opacity-40 text-sm">Centralized vault for {user.organization} operations.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 rounded-xl glass border border-white/10 hover:bg-white/10 transition-all relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center p-3 border-b border-white/5 mb-2">
                  <h4 className="text-sm font-bold">Notifications</h4>
                  <button onClick={() => setShowNotifications(false)} className="text-xs opacity-50 hover:opacity-100"><X size={14} /></button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-center text-xs opacity-40 py-8">No notifications</p>
                ) : (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className={`p-3 rounded-xl mb-2 transition-colors ${notif.read ? 'bg-white/5 opacity-60' : 'bg-indigo-500/10 border border-indigo-500/30'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${notif.type === 'FILE_RECEIVED' ? 'text-emerald-400' : 'text-indigo-400'}`}>{notif.type.replace('FILE_', '')}</span>
                        <span className="text-[10px] opacity-30">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer glass px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
            <input
              type="checkbox"
              checked={simulateInfection}
              onChange={() => setSimulateInfection(!simulateInfection)}
              className="w-4 h-4 rounded border-white/20 bg-black/40 text-rose-500 focus:ring-rose-500/30"
            />
            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
              <Bug size={14} className={simulateInfection ? 'text-rose-500' : 'text-inherit'} />
              Simulate Infection
            </span>
          </label>
          <button
            onClick={() => keyInputRef.current?.click()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${userPrivateKey ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <KeyRound size={16} />
            {userPrivateKey ? 'Key Loaded' : 'Load Private Key'}
          </button>
          <button
            onClick={startUpload}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={20} /> Safe Upload
          </button>
        </div >
      </div >

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar */}
          <div className="flex items-center gap-4 glass px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <Search className="opacity-40" size={20} />
            <input
              type="text"
              placeholder="Search in vault..."
              className="bg-transparent border-none outline-none w-full py-2 placeholder:opacity-20 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div >

          {/* Shared with Me Section */}
          < GlassCard title="Shared with Me" className="border-indigo-500/20" >
            <div className="space-y-4">
              {sharedFiles.length === 0 ? (
                <div className="py-8 text-center text-white/20 italic">No files shared with you.</div>
              ) : (
                sharedFiles.map((file) => (
                  <div key={file.id} className="p-4 rounded-2xl glass border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center gap-4 group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                        <Inbox size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold truncate text-sm">{file.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="opacity-40 text-xs uppercase tracking-tighter font-bold">From: {file.uploaderName}</p>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-black">
                            <Lock size={10} /> AES-128 + RSA
                          </span >
                        </div >
                      </div >
                    </div >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReceive(file)}
                        disabled={file.status === 'received' || file.status === 'acknowledged'}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${file.status === 'received' || file.status === 'acknowledged' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 opacity-50 cursor-not-allowed' : 'bg-white/5 border border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10'}`}
                      >
                        {(file.status === 'received' || file.status === 'acknowledged') ? <MailCheck size={14} /> : <ArrowDownToLine size={14} />}
                        {(file.status === 'received' || file.status === 'acknowledged') ? 'Received' : 'Receive'}
                      </button>
                      <button
                        onClick={() => handleAcknowledge(file)}
                        disabled={file.status !== 'received'}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${file.status === 'acknowledged' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 opacity-50 cursor-not-allowed' : (file.status === 'received' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white/5 border border-white/10 opacity-30 cursor-not-allowed')}`}
                      >
                        {file.status === 'acknowledged' ? <CheckCircle size={14} /> : <UserCheck size={14} />}
                        {file.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                      <button
                        onClick={() => handleShare(file)}
                        className="p-2 hover:bg-purple-500/20 rounded-xl text-purple-400 transition-colors" title="Forward/Share within Team">
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDownload(file.id, file.name)}
                        className="p-2 hover:bg-indigo-500/20 rounded-xl text-indigo-500 transition-colors" title="Download Decrypted Asset">
                        <Download size={18} />
                      </button>
                    </div >
                  </div >
                ))
              )}
            </div >
          </GlassCard >

          {/* My Files Section */}
          < GlassCard title="My File Library (Safe Library)" >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myFiles.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-white/20 italic">No files in your library.</div>
              ) : (
                myFiles.map((file) => (
                  <div key={file.id} className="p-4 rounded-2xl glass border border-white/5 hover:border-white/20 transition-all group flex items-start gap-4 shadow-sm relative">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 relative group-hover:bg-indigo-500/20 transition-colors">
                      <FileText size={24} />
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-slate-900 shadow-lg">
                        <CheckCircle size={10} />
                      </div >
                    </div >
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="font-semibold truncate text-sm">{file.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="opacity-30 text-[10px] uppercase font-bold tracking-tighter">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.encryptionLevel || 'AES-128 + RSA'}
                        </p>
                        {file.watermarked && (
                          <span className="text-[9px] text-purple-400 border border-purple-400/30 px-1 rounded uppercase font-black">Watermarked</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleShare(file)}
                        className="p-2 hover:bg-white/10 rounded-lg text-purple-400" title="Share with Team">
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(file.id, file.name)}
                        className="p-2 hover:bg-white/10 rounded-lg text-indigo-400" title="Secure Download">
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500" title="Delete File">
                        <Trash2 size={16} />
                      </button>
                    </div >
                  </div >
                ))
              )}
            </div >
          </GlassCard >

          {/* Session Security Logs */}
          < GlassCard title="Security Transmission Logs" >
            <div className="space-y-3">
              {sessionLogs.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <p className="text-sm opacity-20 italic">No recent upload activity in this session.</p>
                </div>
              ) : (
                sessionLogs.map(log => (
                  <div key={log.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${log.status === 'Infected' ? 'bg-rose-500/5 border-rose-500/20 shadow-lg shadow-rose-500/5' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${log.status === 'Infected' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {log.status === 'Infected' ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
                      </div >
                      <div>
                        <p className="text-sm font-bold">{log.fileName}</p>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">{log.timestamp} • Outcome: {log.status}</p>
                      </div>
                    </div >
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${log.status === 'Infected' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {log.status === 'Infected' ? 'Upload Rejected' : 'Storage Verified'}
                    </span>
                  </div >
                ))
              )}
            </div >
          </GlassCard >
        </div >

        {/* Sidebar Widgets */}
        < div className="space-y-8" >
          <GlassCard title="System Integrity">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                  <ShieldCheck size={20} />
                </div >
                <div>
                  <p className="text-sm font-bold">Endpoint Scan</p>
                  <p className="text-[10px] opacity-40 uppercase font-black">Active Guard Active</p>
                </div>
              </div >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Lock size={20} />
                </div >
                <div>
                  <p className="text-sm font-bold">Stream Lock</p>
                  <p className="text-[10px] opacity-40 uppercase font-black">AES-128 + RSA Handshake</p>
                </div>
              </div >
            </div >
          </GlassCard >

          <GlassCard title="Vault Status">
            <div className="space-y-4 mt-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                <span className="opacity-40">Bucket Integrity</span>
                <span className="text-emerald-400">99.9% Optimal</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-emerald-500 w-[100%] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <p className="text-[10px] opacity-30 italic leading-relaxed">Cross-region backup enabled. Deleted files are retained in the vault for 90 days for auditing purposes.</p>
            </div>
          </GlassCard>
        </div >
      </div >
      <GlassToast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        details={toast.details}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div >
  );
};

export default UserDashboard;
