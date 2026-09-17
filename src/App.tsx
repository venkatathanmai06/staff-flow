import React, { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { 
  Building2, Users, CalendarDays, FileText, Settings, ShieldAlert, 
  Bell, Menu, X, LogOut, CheckCircle, Clock, AlertCircle, Plus, 
  PieChart, ArrowRight, Loader2, Search, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, XCircle, Check, Mail, Smartphone,
  MoreVertical, Edit, Trash2, Filter, Upload, Image as ImageIcon,
  User, Link as LinkIcon, Download, Info
} from 'lucide-react';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Ambient declarations for optional runtime variables
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

// ============================================================================
// FIREBASE CONFIGURATION
// PASTE YOUR FIREBASE WEB APP CONFIGURATION OBJECT BELOW
// You can find this in your Firebase Console -> Project Settings -> General -> Your apps
// ============================================================================
const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAk7otfJwbIjnNHxVj33tiN-UEUdDUfijc",
  authDomain: "staff-flow-6e2e0.firebaseapp.com",
  projectId: "staff-flow-6e2e0",
  storageBucket: "staff-flow-6e2e0.firebasestorage.app",
  messagingSenderId: "454212743067",
  appId: "1:454212743067:web:53e49f1e0d74dc8a413b3e",
  measurementId: "G-YRXQBGDB5P"
};

// Initialize Firebase (Safely handles environment variables or manual config)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : MANUAL_FIREBASE_CONFIG;
let app: any, auth: any, db: any;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase initialization skipped. Please update MANUAL_FIREBASE_CONFIG.", e);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'staffflow-app';

// User-friendly error message parser for Firebase authentication
const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return "An unexpected error occurred during authentication.";
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/configuration-not-found' || message.toLowerCase().includes('configuration')) {
    return "Firebase Authentication configuration not found. Please verify your Firebase project setup in the Firebase Console.";
  }
  if (code === 'auth/operation-not-allowed') {
    return "This sign-in method is not enabled in Firebase Console. Please enable Google Sign-In or Email Link (Passwordless) in Authentication > Sign-in method.";
  }
  if (code === 'auth/unauthorized-domain') {
    return "This domain is not authorized in Firebase Authentication. Please add this domain to Firebase Console > Authentication > Settings > Authorized Domains.";
  }
  if (code === 'auth/popup-blocked') {
    return "The sign-in popup was blocked by your browser. Please allow popups for this site and try again.";
  }
  if (code === 'auth/popup-closed-by-user') {
    return "Sign-in was cancelled before completion. Please try again.";
  }
  if (code === 'auth/invalid-email') {
    return "Please enter a valid administrative email address.";
  }
  if (code === 'auth/expired-action-code') {
    return "The sign-in link has expired. Please request a new sign-in link.";
  }
  if (code === 'auth/invalid-action-code') {
    return "The sign-in link is invalid or has already been used. Please request a new link.";
  }
  if (code === 'auth/user-disabled') {
    return "This account has been disabled. Please contact your institution administrator.";
  }
  return error.message || "Failed to authenticate with Firebase. Please check your network connection and try again.";
};

// --- Types ---
type Role = 'PRINCIPAL' | 'HOD' | 'EMPLOYEE';

type DemoDepartment = { id: string; name: string; code: string; hodUid: string; active: boolean };

type DemoEmployee = {
  uid: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: string;
  role: Role;
  status: 'Active' | 'Inactive';
  clUsedThisYear: number;
  clUsedThisMonth: Record<string, number>; // YYYY-MM -> used count
  cclEarned: number;
  cclUsed: number;
  slUsed: number;
  joiningDate: string;
  photoUrl: string | null;
};

type DemoLeaveRequest = {
  id: string;
  employeeUid: string;
  employeeName: string;
  departmentId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
  isEmergency?: boolean;
};

type DemoAnnouncement = {
  id: string;
  title: string;
  description: string;
  category: string;
  publishDate: string;
  target: 'All Staff' | 'Department' | 'Specific Employee';
  targetId?: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  link?: string;
  archived?: boolean;
};

type DemoNotification = {
  id: string;
  targetUid: string | 'ALL_ADMINS';
  message: string;
  read: boolean;
  time: string;
  actionUrl: string;
};

type DemoSchedule = {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  target: 'All Staff' | 'Department' | 'Specific Employee';
  targetId?: string;
};

type DemoCalendarEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  target: 'All Staff' | 'Department' | 'Specific Employee';
  targetId?: string;
  relatedId?: string;
};

// --- Contexts ---
interface DemoContextType {
  departments: DemoDepartment[];
  employees: DemoEmployee[];
  leaveRequests: DemoLeaveRequest[];
  announcements: DemoAnnouncement[];
  notifications: DemoNotification[];
  schedules: DemoSchedule[];
  calendarEvents: DemoCalendarEvent[];
  
  addDepartment: (dept: Partial<DemoDepartment>) => void;
  updateDepartment: (id: string, updates: Partial<DemoDepartment>) => void;
  addEmployee: (emp: Partial<DemoEmployee>) => void;
  updateEmployee: (id: string, updates: Partial<DemoEmployee>) => void;
  addLeaveRequest: (req: Omit<DemoLeaveRequest, 'id' | 'status' | 'submittedAt'>) => void;
  approveLeaveRequest: (id: string) => void;
  rejectLeaveRequest: (id: string) => void;
  addAnnouncement: (ann: Omit<DemoAnnouncement, 'id' | 'archived'>) => void;
  archiveAnnouncement: (id: string) => void;
  addSchedule: (sched: Omit<DemoSchedule, 'id'>) => void;
  updateSchedule: (id: string, updates: Partial<DemoSchedule>) => void;
  deleteSchedule: (id: string) => void;
  addCalendarEvent: (event: Omit<DemoCalendarEvent, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (targetUid: string) => void;
}

const DemoStateContext = createContext<DemoContextType>({} as DemoContextType);
export const useDemoState = () => useContext(DemoStateContext);

export const DemoProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [departments, setDepartments] = useState<DemoDepartment[]>([
    { id: 'dept-1', name: 'CSE', code: 'CS', hodUid: 'hod-1', active: true },
    { id: 'dept-2', name: 'ECE', code: 'EC', hodUid: 'emp-2', active: true },
    { id: 'dept-3', name: 'EEE', code: 'EE', hodUid: 'emp-4', active: true },
    { id: 'dept-4', name: 'AI & DS', code: 'AD', hodUid: '', active: true },
  ]);

  const [employees, setEmployees] = useState<DemoEmployee[]>([
    { uid: 'admin-1', empId: 'ADMIN-001', name: 'Dr. Meera Sharma', email: 'meera@demo.local', phone: '+91 9876543210', departmentId: 'dept-1', designation: 'Principal', role: 'PRINCIPAL', status: 'Active', clUsedThisYear: 0, clUsedThisMonth: {}, cclEarned: 0, cclUsed: 0, slUsed: 0, joiningDate: '2020-01-15', photoUrl: null },
    { uid: 'hod-1', empId: 'MY-1000', name: 'Dr. Arjun Rao', email: 'arjun@demo.local', phone: '+91 9876543211', departmentId: 'dept-1', designation: 'HOD', role: 'HOD', status: 'Active', clUsedThisYear: 1, clUsedThisMonth: {'2026-09': 1}, cclEarned: 2, cclUsed: 0, slUsed: 0, joiningDate: '2021-06-01', photoUrl: null },
    { uid: 'emp-1', empId: 'MY-1001', name: 'Anita Rao', email: 'anita@demo.local', phone: '+91 9876543212', departmentId: 'dept-1', designation: 'Asst. Professor', role: 'EMPLOYEE', status: 'Active', clUsedThisYear: 2, clUsedThisMonth: {'2026-08': 1, '2026-09': 1}, cclEarned: 1, cclUsed: 0, slUsed: 1, joiningDate: '2022-08-10', photoUrl: null },
    { uid: 'emp-2', empId: 'MY-1002', name: 'Rahul Kumar', email: 'rahul@demo.local', phone: '+91 9876543213', departmentId: 'dept-2', designation: 'Professor', role: 'EMPLOYEE', status: 'Active', clUsedThisYear: 5, clUsedThisMonth: {}, cclEarned: 0, cclUsed: 0, slUsed: 0, joiningDate: '2019-07-22', photoUrl: null },
    { uid: 'emp-3', empId: 'MY-1003', name: 'Priya Singh', email: 'priya@demo.local', phone: '+91 9876543214', departmentId: 'dept-1', designation: 'Lecturer', role: 'EMPLOYEE', status: 'Active', clUsedThisYear: 0, clUsedThisMonth: {}, cclEarned: 0, cclUsed: 0, slUsed: 0, joiningDate: '2023-01-10', photoUrl: null },
    { uid: 'emp-4', empId: 'MY-1004', name: 'Vikram Reddy', email: 'vikram@demo.local', phone: '+91 9876543215', departmentId: 'dept-3', designation: 'Asst. Professor', role: 'EMPLOYEE', status: 'Active', clUsedThisYear: 8, clUsedThisMonth: {}, cclEarned: 0, cclUsed: 0, slUsed: 0, joiningDate: '2018-09-01', photoUrl: null },
  ]);

  const [leaveRequests, setLeaveRequests] = useState<DemoLeaveRequest[]>([
    { id: 'lr-1', employeeUid: 'emp-1', employeeName: 'Anita Rao', departmentId: 'dept-1', type: 'CL', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], days: 1, reason: 'Personal work', status: 'PENDING', submittedAt: new Date().toISOString() },
    { id: 'lr-2', employeeUid: 'emp-2', employeeName: 'Rahul Kumar', departmentId: 'dept-2', type: 'CCL_WORKED', startDate: '2026-09-12', endDate: '2026-09-12', days: 1, reason: 'Exam Duty', status: 'PENDING', submittedAt: new Date().toISOString() },
    { id: 'lr-3', employeeUid: 'emp-3', employeeName: 'Priya Singh', departmentId: 'dept-1', type: 'NO_PAY_LEAVE', startDate: '2026-09-24', endDate: '2026-09-25', days: 2, reason: 'Family Emergency', status: 'APPROVED', submittedAt: new Date(Date.now() - 86400000).toISOString() }
  ]);

  const [announcements, setAnnouncements] = useState<DemoAnnouncement[]>([
    { id: 'a-1', title: 'Welcome to StaffFlow Demo', description: 'This is a fully interactive demonstration environment.', category: 'General', publishDate: new Date().toISOString(), target: 'All Staff', priority: 'Normal' }
  ]);

  const [notifications, setNotifications] = useState<DemoNotification[]>([
    { id: 'n-1', targetUid: 'ALL_ADMINS', message: 'New CL request from Anita Rao', read: false, time: new Date().toISOString(), actionUrl: '/admin/requests?status=PENDING' },
    { id: 'n-2', targetUid: 'ALL_ADMINS', message: 'New CCL Worked request from Rahul Kumar', read: false, time: new Date().toISOString(), actionUrl: '/admin/ccl?status=PENDING' }
  ]);

  const [schedules, setSchedules] = useState<DemoSchedule[]>([
    { id: 's-1', title: 'Staff Meeting', description: 'Monthly review and institution planning session.', date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '15:00', target: 'All Staff' },
    { id: 's-2', title: 'CSE Department Review', description: 'Curriculum syllabus and laboratory readiness check.', date: new Date().toISOString().split('T')[0], startTime: '10:30', endTime: '11:30', target: 'Department', targetId: 'dept-1' },
    { id: 's-3', title: 'Faculty Development Seminar', description: 'Emerging trends in AI, machine learning and research grant proposals.', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], startTime: '15:30', endTime: '16:30', target: 'All Staff' }
  ]);

  const [calendarEvents, setCalendarEvents] = useState<DemoCalendarEvent[]>([
    { id: 'ce-1', title: 'NO_PAY_LEAVE - Priya Singh', type: 'NO_PAY_LEAVE', date: '2026-09-24', target: 'Specific Employee', targetId: 'emp-3', relatedId: 'lr-3' },
    { id: 'ce-2', title: 'NO_PAY_LEAVE - Priya Singh', type: 'NO_PAY_LEAVE', date: '2026-09-25', target: 'Specific Employee', targetId: 'emp-3', relatedId: 'lr-3' }
  ]);

  // Actions
  const addDepartment = (dept: Partial<DemoDepartment>) => {
    setDepartments(prev => [{ ...dept, id: `dept-${Date.now()}`, active: true } as DemoDepartment, ...prev]);
  };

  const updateDepartment = (id: string, updates: Partial<DemoDepartment>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const addEmployee = (emp: Partial<DemoEmployee>) => {
    const newEmp = { ...emp, uid: `emp-${Date.now()}`, status: 'Active', clUsedThisYear: 0, clUsedThisMonth: {}, cclEarned: 0, cclUsed: 0, slUsed: 0 } as DemoEmployee;
    setEmployees(prev => [newEmp, ...prev]);
  };

  const updateEmployee = (id: string, updates: Partial<DemoEmployee>) => {
    setEmployees(prev => prev.map(e => e.uid === id ? { ...e, ...updates } : e));
  };

  const addLeaveRequest = (req: Omit<DemoLeaveRequest, 'id' | 'status' | 'submittedAt'>) => {
    const newReq: DemoLeaveRequest = { ...req, id: `lr-${Date.now()}`, status: 'PENDING', submittedAt: new Date().toISOString() };
    setLeaveRequests(prev => [newReq, ...prev]);
    
    // Notify Admin
    let actionUrl = '/admin/requests';
    if(req.type === 'CCL_WORKED' || req.type === 'CCL_USED') actionUrl = '/admin/ccl';
    setNotifications(prev => [{ id: `n-${Date.now()}`, targetUid: 'ALL_ADMINS', message: `New ${req.type} request from ${req.employeeName}`, read: false, time: new Date().toISOString(), actionUrl }, ...prev]);
  };

  const approveLeaveRequest = (id: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;
    
    setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    
    setEmployees(prev => prev.map(e => {
        if (e.uid === req.employeeUid) {
          if (req.type === 'CL') {
             const monthKey = req.startDate.substring(0, 7);
             const currentMonthUsage = e.clUsedThisMonth[monthKey] || 0;
             return { ...e, clUsedThisYear: e.clUsedThisYear + req.days, clUsedThisMonth: {...e.clUsedThisMonth, [monthKey]: currentMonthUsage + req.days} };
          }
          if (req.type === 'SL') return { ...e, slUsed: e.slUsed + req.days };
          if (req.type === 'CCL_USED') return { ...e, cclUsed: e.cclUsed + req.days };
          if (req.type === 'CCL_WORKED') return { ...e, cclEarned: e.cclEarned + req.days };
          // NO_PAY_LEAVE intentionally does not modify CL/CCL balances
        }
        return e;
    }));

    setNotifications(prev => [{ id: `n-${Date.now()}`, targetUid: req.employeeUid, message: `Your ${req.type} request was approved.`, read: false, time: new Date().toISOString(), actionUrl: '/employee/my-requests' }, ...prev]);
    
    // Add to calendar - handle multi-day
    const startDate = new Date(req.startDate);
    const endDate = new Date(req.endDate);
    const newEvents: DemoCalendarEvent[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        newEvents.push({ 
            id: `ce-${Date.now()}-${d.getTime()}`, 
            title: `${req.type} - ${req.employeeName}`, 
            type: req.type, 
            date: d.toISOString().split('T')[0], 
            target: 'Specific Employee', 
            targetId: req.employeeUid, 
            relatedId: req.id 
        });
    }
    setCalendarEvents(prev => [...prev, ...newEvents]);
  };

  const rejectLeaveRequest = (id: string) => {
    setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    const req = leaveRequests.find(r => r.id === id);
    if (req) {
      setNotifications(prev => [{ id: `n-${Date.now()}`, targetUid: req.employeeUid, message: `Your ${req.type} request was rejected.`, read: false, time: new Date().toISOString(), actionUrl: '/employee/my-requests' }, ...prev]);
    }
  };

  const addAnnouncement = (ann: Omit<DemoAnnouncement, 'id' | 'archived'>) => {
    const id = `a-${Date.now()}`;
    setAnnouncements(prev => [{ ...ann, id, archived: false }, ...prev]);
    setNotifications(prev => [{ id: `n-${Date.now()}`, targetUid: ann.target === 'All Staff' ? 'ALL_STAFF' : (ann.target === 'Specific Employee' ? ann.targetId! : 'DEPT_'+ann.targetId), message: `New Announcement: ${ann.title}`, read: false, time: new Date().toISOString(), actionUrl: '/employee/announcements' }, ...prev]);
  };

  const archiveAnnouncement = (id: string) => {
      setAnnouncements(prev => prev.map(a => a.id === id ? {...a, archived: true} : a));
  };

  const addSchedule = (sched: Omit<DemoSchedule, 'id'>) => {
    setSchedules(prev => [{ ...sched, id: `s-${Date.now()}` }, ...prev]);
    setNotifications(prev => [{ id: `n-${Date.now()}`, targetUid: sched.target === 'All Staff' ? 'ALL_STAFF' : (sched.target === 'Specific Employee' ? sched.targetId! : 'DEPT_'+sched.targetId), message: `New Schedule: ${sched.title}`, read: false, time: new Date().toISOString(), actionUrl: '/employee/schedule' }, ...prev]);
  };

  const updateSchedule = (id: string, updates: Partial<DemoSchedule>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const addCalendarEvent = (event: Omit<DemoCalendarEvent, 'id'>) => {
    setCalendarEvents(prev => [{ ...event, id: `ce-${Date.now()}` }, ...prev]);
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsRead = (targetUid: string) => setNotifications(prev => prev.map(n => (n.targetUid === targetUid || (targetUid === 'ALL_ADMINS' && n.targetUid === 'ALL_ADMINS') || n.targetUid === 'ALL_STAFF') ? { ...n, read: true } : n));

  return (
    <DemoStateContext.Provider value={{
      departments, employees, leaveRequests, announcements, notifications, schedules, calendarEvents,
      addDepartment, updateDepartment, addEmployee, updateEmployee, addLeaveRequest, approveLeaveRequest, rejectLeaveRequest, addAnnouncement, archiveAnnouncement, addSchedule, updateSchedule, deleteSchedule, addCalendarEvent, markNotificationRead, markAllNotificationsRead
    }}>
      {children}
    </DemoStateContext.Provider>
  );
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface UserProfile { 
  uid: string; 
  role: Role; 
  displayName: string; 
  email: string; 
  departmentId: string; 
  photoUrl: string | null; 
}

interface AuthContextType { 
  profile: UserProfile | null; 
  loginAsDemo: (role: Role) => void; 
  logout: () => Promise<void>; 
  refreshProfile: () => void; 
  firebaseUser: any; 
  authStatus: AuthStatus;
  isAuthLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  loginWithGoogle: () => Promise<any>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  updateProfileDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  profile: null, 
  loginAsDemo: () => {}, 
  logout: async () => {}, 
  refreshProfile: () => {}, 
  firebaseUser: null,
  authStatus: 'loading',
  isAuthLoading: true,
  authError: null,
  setAuthError: () => {},
  loginWithGoogle: async () => {},
  sendEmailSignInLink: async () => {},
  updateProfileDisplayName: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const { employees } = useDemoState();

  // Firebase Authentication & Email Link Listener
  useEffect(() => {
    if (!auth) {
      setAuthStatus('unauthenticated');
      return;
    }

    // 1. Check if user landed from a passwordless Email Sign-in Link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('staffflow_email_for_signin');
      if (!email) {
        email = window.prompt('Please confirm your administrative email address to complete sign in:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('staffflow_email_for_signin');
            // Clean url params
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((error) => {
            console.error("Firebase Email Link sign-in error:", error);
            setAuthError(getFriendlyErrorMessage(error));
          });
      }
    }

    // 2. Real-time Firebase Authentication State Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // Check if user matches an existing employee
        const matchedEmp = employees.find(e => e.email.toLowerCase() === user.email?.toLowerCase());
        if (matchedEmp) {
          setProfile({
            uid: user.uid,
            role: matchedEmp.role,
            displayName: matchedEmp.name || user.displayName || 'Staff Member',
            email: user.email || matchedEmp.email,
            departmentId: matchedEmp.departmentId,
            photoUrl: user.photoURL || matchedEmp.photoUrl || null
          });
        } else {
          // Default to Administrator (Principal) for admin auth / registration
          setProfile(prev => ({
            uid: user.uid,
            role: prev?.role || 'PRINCIPAL',
            displayName: user.displayName || prev?.displayName || user.email?.split('@')[0] || 'Administrator',
            email: user.email || '',
            departmentId: prev?.departmentId || '',
            photoUrl: user.photoURL || prev?.photoUrl || null
          }));
        }
        setAuthStatus('authenticated');
      } else {
        // If not logged into Firebase, check if demo mode user is active
        setProfile(prev => {
          if (prev && (prev.uid === 'emp-1' || prev.uid === 'emp-2' || prev.uid === 'emp-3' || prev.uid.startsWith('demo-'))) {
            setAuthStatus('authenticated');
            return prev;
          }
          setAuthStatus('unauthenticated');
          return null;
        });
      }
    }, (error) => {
      console.error("Firebase onAuthStateChanged error:", error);
      setAuthError(getFriendlyErrorMessage(error));
      setAuthStatus('unauthenticated');
    });

    return () => unsubscribe();
  }, [employees]);

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error("Firebase Authentication is not available. Please verify configuration.");
    }
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  };

  const sendEmailSignInLink = async (email: string) => {
    if (!auth) {
      throw new Error("Firebase Authentication is not available. Please verify configuration.");
    }
    setAuthError(null);
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
    window.localStorage.setItem('staffflow_email_for_signin', email.trim());
  };

  const loginAsDemo = (role: Role) => {
    const emp = employees.find(e => e.role === role);
    if (emp) {
      setProfile({
        uid: emp.uid,
        role: emp.role,
        displayName: emp.name,
        email: emp.email,
        departmentId: emp.departmentId,
        photoUrl: emp.photoUrl
      });
      setAuthStatus('authenticated');
    }
  };
  
  const refreshProfile = () => {
    if (!profile) return;
    const emp = employees.find(e => e.uid === profile.uid);
    if (emp) {
      setProfile({
        uid: emp.uid,
        role: emp.role,
        displayName: emp.name,
        email: emp.email,
        departmentId: emp.departmentId,
        photoUrl: emp.photoUrl
      });
    }
  };

  const updateProfileDisplayName = (name: string) => {
    setProfile(prev => prev ? { ...prev, displayName: name } : null);
  };

  const logout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("SignOut error:", e);
      }
    }
    setProfile(null);
    setFirebaseUser(null);
    setAuthStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ 
      profile, 
      loginAsDemo, 
      logout, 
      refreshProfile, 
      firebaseUser,
      authStatus,
      isAuthLoading: authStatus === 'loading',
      authError,
      setAuthError,
      loginWithGoogle,
      sendEmailSignInLink,
      updateProfileDisplayName
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const RouterContext = createContext<{ currentPath: string; navigate: (p: string) => void }>({ currentPath: '/', navigate: () => {} });
export const useRouter = () => useContext(RouterContext);

// --- Shared Components ---
const Card: React.FC<{children: ReactNode, className?: string, onClick?: () => void, id?: string}> = ({ children, className = '', onClick, id }) => (
  <div id={id} onClick={onClick} className={`bg-white rounded-xl border border-[#E5E5EA] shadow-sm overflow-hidden ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:border-[#D96C8A]' : ''}`}>{children}</div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg', fullWidth?: boolean }> = ({ children, variant = 'primary', size = 'md', fullWidth, className = '', ...props }) => {
  const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = { primary: "bg-[#D96C8A] text-white hover:bg-[#c25a77] focus:ring-[#D96C8A]", secondary: "bg-[#2D2D32] text-white hover:bg-black focus:ring-[#2D2D32]", outline: "border border-[#E5E5EA] text-[#2D2D32] hover:border-[#D96C8A] hover:text-[#D96C8A] focus:ring-[#D96C8A] bg-transparent", ghost: "text-[#6B6B73] hover:text-[#2D2D32] hover:bg-gray-100 focus:ring-gray-200" };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-3 text-lg" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>{children}</button>;
};

const Modal: React.FC<{isOpen: boolean, onClose: () => void, title: string, children: ReactNode, maxWidth?: string}> = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-[#E5E5EA] bg-gray-50 shrink-0">
          <h3 className="font-bold text-[#2D2D32] text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{status: string}> = ({ status }) => {
  const s = status.toLowerCase();
  let color = 'bg-gray-100 text-gray-700';
  if (['approved', 'active'].includes(s)) color = 'bg-green-100 text-green-700';
  if (['pending'].includes(s)) color = 'bg-yellow-100 text-yellow-700';
  if (['rejected', 'inactive', 'cancelled'].includes(s)) color = 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>;
};

const StatCard: React.FC<{title: string, value: string | number, icon: any, colorClass: string, onClick?: () => void, id?: string}> = ({ title, value, icon: Icon, colorClass, onClick, id }) => (
  <Card id={id} className="p-4 flex items-center gap-4" onClick={onClick}>
     <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-6 h-6" /></div>
     <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#6B6B73] truncate">{title}</p>
        <h3 className="text-2xl font-bold text-[#2D2D32]">{value}</h3>
     </div>
  </Card>
);

const UserAvatar: React.FC<{ url?: string | null, name: string, className?: string }> = ({ url, name, className="w-10 h-10" }) => {
   if(url) return <img src={url} alt={name} className={`${className} rounded-full object-cover`} />;
   return <div className={`${className} rounded-full bg-[#D96C8A] text-white flex items-center justify-center font-bold text-sm shrink-0`}>{name?.charAt(0) || 'U'}</div>;
};

// --- Layout & Navigation ---
const AppLayout: React.FC<{children: ReactNode, navItems: any[]}> = ({ children, navItems }) => {
  const { currentPath, navigate } = useRouter();
  const { profile, logout } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDemoState();
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const myNotifs = notifications.filter(n => n.targetUid === profile?.uid || (profile?.role === 'PRINCIPAL' && n.targetUid === 'ALL_ADMINS') || n.targetUid === 'ALL_STAFF' || n.targetUid === `DEPT_${profile?.departmentId}`);
  const unreadCount = myNotifs.filter(n => !n.read).length;

  const handleNotifClick = (n: DemoNotification) => {
    markNotificationRead(n.id);
    setShowNotifs(false);
    navigate(n.actionUrl);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar for Desktop and Mobile Drawer */}
      <aside className={`
        fixed md:sticky top-0 h-screen z-50 md:z-auto
        w-64 bg-white border-r border-[#E5E5EA] flex flex-col shrink-0
        transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between text-[#D96C8A] font-bold text-2xl">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
            <Building2 className="w-7 h-7" /> StaffFlow
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="md:hidden text-gray-400 hover:text-gray-700 p-1 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pb-4">
          <div 
            onClick={() => { navigate(profile?.role === 'PRINCIPAL' ? '/admin/profile' : '/employee/profile'); setMobileMenuOpen(false); }} 
            className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-[#D96C8A] transition-colors"
          >
            <UserAvatar url={profile?.photoUrl} name={profile?.displayName || 'User'} />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-[#2D2D32] truncate">{profile?.displayName}</p>
              <p className="text-xs text-[#6B6B73] uppercase">{profile?.role}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button 
              key={item.path} 
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${currentPath.startsWith(item.path) && item.path !== '/' && item.path !== '/admin' && item.path !== '/employee' ? 'bg-pink-50 text-[#D96C8A] font-medium' : currentPath === item.path ? 'bg-pink-50 text-[#D96C8A] font-medium' : 'text-[#6B6B73] hover:bg-gray-100 hover:text-[#2D2D32]'}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#E5E5EA]">
          <button 
            onClick={() => { logout(); navigate('/'); setMobileMenuOpen(false); }} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B6B73] hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E5EA] flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="md:hidden p-2 -ml-1 text-[#6B6B73] hover:text-[#2D2D32] hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-semibold text-[#2D2D32] text-base md:text-lg truncate max-w-[200px] sm:max-w-none">
              {navItems.find(i => currentPath.startsWith(i.path) && i.path !== '/' && i.path !== '/admin' && i.path !== '/employee')?.label || 'Dashboard'}
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifs(!showNotifs)} 
              className="text-[#6B6B73] hover:text-[#2D2D32] relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D96C8A] rounded-full border-2 border-white"></span>}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-[#E5E5EA] overflow-hidden z-50">
                <div className="p-4 border-b border-[#E5E5EA] flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-[#2D2D32]">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllNotificationsRead(profile?.role === 'PRINCIPAL' ? 'ALL_ADMINS' : profile?.uid || '')} 
                      className="text-xs text-[#D96C8A] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {myNotifs.length === 0 ? (
                    <div className="p-6 text-center text-[#6B6B73] text-sm">No new notifications.</div>
                  ) : (
                    <div className="divide-y divide-[#E5E5EA]">
                      {myNotifs.map(n => (
                        <div key={n.id} onClick={() => handleNotifClick(n)} className={`p-4 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? 'bg-white' : 'bg-pink-50/30'}`}>
                          <p className="text-[#2D2D32] font-medium">{n.message}</p>
                          <p className="text-xs text-[#6B6B73] mt-1">{new Date(n.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

// --- Landing & Auth Pages ---
const LandingPage = () => {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="px-6 md:px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-[#D96C8A] font-extrabold text-2xl"><Building2 className="w-8 h-8" /> StaffFlow</div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#2D2D32] leading-tight mb-6">Manage staff leave, schedules and approvals in <span className="text-[#D96C8A]">one secure platform.</span></h1>
        <p className="text-base sm:text-lg md:text-xl text-[#6B6B73] mb-10 max-w-2xl leading-relaxed">StaffFlow simplifies CL, CCL, scheduling and the entire approval hierarchy from HODs to the Principal's office.</p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
          <Button size="lg" className="px-8 sm:px-12 text-lg shadow-md" onClick={() => navigate('/login?type=employee')}>Employee Login</Button>
          <Button size="lg" variant="secondary" className="px-8 sm:px-12 text-lg" onClick={() => navigate('/login?type=admin')}>Administrator Access</Button>
        </div>
        <button onClick={() => navigate('/register')} className="text-[#6B6B73] hover:text-[#D96C8A] font-medium transition-colors flex items-center gap-2 group">New Institution? Register Here <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
      </main>
    </div>
  );
};

const LoginPage = ({ type }: { type: 'admin' | 'employee' }) => {
  const { navigate } = useRouter();
  const { loginAsDemo, loginWithGoogle, sendEmailSignInLink, profile, authStatus } = useAuth();
  const { employees } = useDemoState();
  const [email, setEmail] = useState('');
  const [empIdInput, setEmpIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated as Administrator, navigate to admin dashboard
  useEffect(() => {
    if (authStatus === 'authenticated' && profile?.role === 'PRINCIPAL' && type === 'admin') {
      navigate('/admin');
    }
  }, [authStatus, profile, type, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingProvider('google');
    try {
      await loginWithGoogle();
      navigate('/admin');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid administrative email address.');
      return;
    }
    setError(null);
    setLoadingProvider('email');
    try {
      await sendEmailSignInLink(email);
      setEmailSent(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const matched = employees.find(
      emp => emp.empId.toLowerCase() === empIdInput.trim().toLowerCase() || 
             emp.email.toLowerCase() === empIdInput.trim().toLowerCase()
    );
    if (matched) {
      loginAsDemo(matched.role);
      navigate('/employee');
    } else {
      setError('Staff record not found for the entered ID/Email. You can use Demo Employee Login below.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col font-sans items-center justify-center px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-[#D96C8A] font-extrabold text-2xl cursor-pointer" onClick={() => navigate('/')}>
        <Building2 className="w-8 h-8" /> StaffFlow
      </div>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[#2D2D32] mb-2 text-center">
          {type === 'admin' ? 'Administrator Access' : 'Employee Login'}
        </h1>
        <p className="text-[#6B6B73] text-center mb-6">
          {type === 'admin' ? 'Sign in to manage your institution.' : 'Sign in to your account.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold text-xs uppercase tracking-wider">Authentication Notice</p>
              <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {type === 'admin' ? (
          <div className="space-y-4">
            {!showEmailInput ? (
              <div className="space-y-3">
                <Button 
                  fullWidth 
                  variant="outline" 
                  className="justify-start gap-3 h-11 border-[#E5E5EA] text-[#2D2D32] hover:border-[#D96C8A]"
                  disabled={loadingProvider !== null}
                  onClick={handleGoogleSignIn}
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#D96C8A]" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>{loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </Button>

                <Button 
                  fullWidth 
                  variant="outline" 
                  className="justify-start gap-3 h-11 border-[#E5E5EA] text-[#2D2D32] hover:border-[#D96C8A]"
                  disabled={loadingProvider !== null}
                  onClick={() => { setError(null); setShowEmailInput(true); }}
                >
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span>Continue with Email</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emailSent ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2D2D32] text-base">Check your email for the secure StaffFlow sign-in link.</h3>
                      <p className="text-xs text-[#6B6B73] mt-2 leading-relaxed">
                        We sent a passwordless sign-in link to <span className="font-semibold text-[#2D2D32]">{email}</span>. Click the link in your email on this browser to sign in instantly.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          setError(null);
                          setLoadingProvider('email');
                          try {
                            await sendEmailSignInLink(email);
                            alert('A fresh sign-in link has been sent to your email.');
                          } catch (err: any) {
                            setError(getFriendlyErrorMessage(err));
                          } finally {
                            setLoadingProvider(null);
                          }
                        }}
                        disabled={loadingProvider !== null}
                      >
                        Resend Sign-in Link
                      </Button>
                      <button 
                        onClick={() => { setEmailSent(false); setShowEmailInput(false); }} 
                        className="text-xs text-[#6B6B73] hover:text-[#D96C8A] transition-colors"
                      >
                        ← Back to sign-in options
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEmailLinkSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1 text-gray-700">Administrator Email</label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="principal@institution.edu" 
                        className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
                        autoFocus
                      />
                    </div>
                    <Button fullWidth type="submit" disabled={loadingProvider !== null}>
                      {loadingProvider === 'email' ? 'Sending Link...' : 'Send Sign-in Link'}
                    </Button>
                    <button 
                      type="button" 
                      onClick={() => { setShowEmailInput(false); setError(null); }} 
                      className="w-full text-center text-xs text-[#6B6B73] hover:text-[#D96C8A] transition-colors py-1"
                    >
                      ← Back to sign-in options
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-[#E5E5EA]">
              <div className="p-4 bg-pink-50 border border-pink-100 rounded-lg text-sm text-[#2D2D32] text-center mb-4">
                <strong>DEMO MODE ACTIVE</strong><br/>Click below to bypass login with local demo state.
              </div>
              <Button fullWidth variant="outline" onClick={() => { loginAsDemo('PRINCIPAL'); navigate('/admin'); }}>
                Demo Admin Login
              </Button>
            </div>
            <div className="text-center mt-4">
              <button onClick={() => navigate('/register')} className="text-sm text-[#6B6B73] hover:text-[#D96C8A] font-medium transition-colors">
                New Institution? Register Here
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#2D2D32]">ID / Email</label>
                <input 
                  type="text" 
                  value={empIdInput}
                  onChange={e => setEmpIdInput(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#E5E5EA] px-3 focus:outline-none focus:border-[#D96C8A]" 
                  placeholder="Enter Employee ID (e.g. EMP-001) or Email" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#2D2D32]">Password</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#E5E5EA] px-3 focus:outline-none focus:border-[#D96C8A]" 
                  placeholder="Enter Password" 
                />
              </div>
              <Button fullWidth type="submit">Login</Button>
            </form>
            <div className="pt-4 mt-4 border-t border-[#E5E5EA]">
              <div className="p-4 bg-pink-50 border border-pink-100 rounded-lg text-sm text-[#2D2D32] text-center mb-4">
                <strong>DEMO MODE ACTIVE</strong><br/>Click below to bypass login with local demo state.
              </div>
              <Button fullWidth variant="outline" onClick={() => { loginAsDemo('EMPLOYEE'); navigate('/employee'); }}>
                Demo Employee Login
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const RegisterPage = () => {
  const { navigate } = useRouter();
  const { loginWithGoogle, sendEmailSignInLink, profile, updateProfileDisplayName, authStatus } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Institution Form fields
  const [institutionName, setInstitutionName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [cutoffTime, setCutoffTime] = useState('09:00');

  // If already authenticated via Firebase or Demo, can advance to Step 2
  useEffect(() => {
    if (authStatus === 'authenticated' && profile) {
      if (step === 1) {
        setStep(2);
        if (profile.displayName && !principalName) {
          setPrincipalName(profile.displayName);
        }
      }
    }
  }, [authStatus, profile]);

  const handleGoogleRegister = async () => {
    setError(null);
    setLoadingProvider('google');
    try {
      const user = await loginWithGoogle();
      if (user?.displayName) setPrincipalName(user.displayName);
      setStep(2);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailLinkRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid administrative email address.');
      return;
    }
    setError(null);
    setLoadingProvider('email');
    try {
      await sendEmailSignInLink(email);
      setEmailSent(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCompleteSetup = () => {
    if (!institutionName.trim()) {
      alert('Please enter your Institution Name.');
      return;
    }
    if (principalName.trim()) {
      updateProfileDisplayName(principalName.trim());
    }
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col font-sans items-center justify-center px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-[#D96C8A] font-extrabold text-2xl cursor-pointer" onClick={() => navigate('/')}>
        <Building2 className="w-8 h-8" /> StaffFlow
      </div>
      <Card className="w-full max-w-md p-6 sm:p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold text-xs uppercase tracking-wider">Authentication Notice</p>
              <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-[#2D2D32] mb-2 text-center">Create Your Institution</h1>
            <p className="text-xs text-[#6B6B73] text-center mb-6">Authenticate administrator identity to proceed.</p>

            {!showEmailInput ? (
              <div className="space-y-3">
                <Button 
                  fullWidth 
                  variant="outline" 
                  className="justify-start gap-3 h-11 border-[#E5E5EA] text-[#2D2D32] hover:border-[#D96C8A]" 
                  disabled={loadingProvider !== null}
                  onClick={handleGoogleRegister}
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#D96C8A]" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>{loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </Button>

                <Button 
                  fullWidth 
                  variant="outline" 
                  className="justify-start gap-3 h-11 border-[#E5E5EA] text-[#2D2D32] hover:border-[#D96C8A]" 
                  disabled={loadingProvider !== null}
                  onClick={() => { setError(null); setShowEmailInput(true); }}
                >
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span>Continue with Email</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emailSent ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2D2D32] text-base">Check your email for the secure StaffFlow sign-in link.</h3>
                      <p className="text-xs text-[#6B6B73] mt-2 leading-relaxed">
                        We sent a passwordless sign-in link to <span className="font-semibold text-[#2D2D32]">{email}</span>. Click the link in your email on this browser to authenticate and continue institution registration.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          setError(null);
                          setLoadingProvider('email');
                          try {
                            await sendEmailSignInLink(email);
                            alert('A fresh sign-in link has been sent to your email.');
                          } catch (err: any) {
                            setError(getFriendlyErrorMessage(err));
                          } finally {
                            setLoadingProvider(null);
                          }
                        }}
                        disabled={loadingProvider !== null}
                      >
                        Resend Sign-in Link
                      </Button>
                      <button 
                        onClick={() => { setEmailSent(false); setShowEmailInput(false); }} 
                        className="text-xs text-[#6B6B73] hover:text-[#D96C8A] transition-colors"
                      >
                        ← Back to registration options
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEmailLinkRegister} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1 text-gray-700">Administrator Email</label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="principal@institution.edu" 
                        className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
                        autoFocus
                      />
                    </div>
                    <Button fullWidth type="submit" disabled={loadingProvider !== null}>
                      {loadingProvider === 'email' ? 'Sending Link...' : 'Send Sign-in Link'}
                    </Button>
                    <button 
                      type="button" 
                      onClick={() => { setShowEmailInput(false); setError(null); }} 
                      className="w-full text-center text-xs text-[#6B6B73] hover:text-[#D96C8A] transition-colors py-1"
                    >
                      ← Back to registration options
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="text-center mt-6 pt-4 border-t border-[#E5E5EA]">
              <button onClick={() => navigate('/login?type=admin')} className="text-sm text-[#6B6B73] hover:text-[#D96C8A] font-medium transition-colors">
                Already registered? Login Here
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#2D2D32] mb-2 text-center">Institution Details</h1>
            <p className="text-xs text-[#6B6B73] text-center mb-6">Complete institution profile to finish setup.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1 text-gray-700">Institution Name *</label>
                <input 
                  className="w-full h-10 rounded-md border px-3 text-sm focus:border-[#D96C8A] outline-none" 
                  placeholder="e.g. Apex Institute of Technology" 
                  value={institutionName}
                  onChange={e => setInstitutionName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1 text-gray-700">Principal / Administrator Name</label>
                <input 
                  className="w-full h-10 rounded-md border px-3 text-sm focus:border-[#D96C8A] outline-none" 
                  placeholder="e.g. Dr. S. Ramanathan" 
                  value={principalName}
                  onChange={e => setPrincipalName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-gray-700">Official Start Time</label>
                  <input 
                    className="w-full h-10 rounded-md border px-3 text-sm focus:border-[#D96C8A] outline-none" 
                    placeholder="09:30" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1 text-gray-700">Cutoff / Late Time</label>
                  <input 
                    className="w-full h-10 rounded-md border px-3 text-sm focus:border-[#D96C8A] outline-none" 
                    placeholder="09:00" 
                    value={cutoffTime}
                    onChange={e => setCutoffTime(e.target.value)}
                  />
                </div>
              </div>
              <Button fullWidth onClick={handleCompleteSetup}>Complete Setup & Enter StaffFlow</Button>
              <div className="text-center">
                <button onClick={() => setStep(1)} className="text-xs text-[#6B6B73] hover:text-[#D96C8A]">
                  ← Back to identity authentication
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

// --- Shared Detail Views ---
const BalanceModal: React.FC<{isOpen: boolean, onClose: () => void, type: 'CL'|'CCL', employee: DemoEmployee}> = ({isOpen, onClose, type, employee}) => {
   const [date, setDate] = useState(new Date());
   const { leaveRequests } = useDemoState();
   
   const monthFilter = (r: DemoLeaveRequest) => new Date(r.startDate).getMonth() === date.getMonth() && new Date(r.startDate).getFullYear() === date.getFullYear() && r.employeeUid === employee.uid && r.status === 'APPROVED';
   
   let history: DemoLeaveRequest[] = [];
   let allocated = 0;
   let used = 0;

   if(type === 'CL') {
       history = leaveRequests.filter(r => r.type === 'CL' && monthFilter(r));
       allocated = 1; // 1 CL Per Month Policy
       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
       used = employee.clUsedThisMonth[monthKey] || 0;
   } else {
       history = leaveRequests.filter(r => (r.type === 'CCL_WORKED' || r.type === 'CCL_USED') && monthFilter(r));
   }

   return (
       <Modal isOpen={isOpen} onClose={onClose} title={`${type} Details - ${date.toLocaleString('default', {month:'long', year:'numeric'})}`}>
           <div className="flex justify-between items-center mb-6">
              <Button variant="outline" size="sm" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4"/></Button>
              <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4"/></Button>
           </div>
           
           {type === 'CL' && (
               <div className="grid grid-cols-3 gap-2 mb-6">
                   <div className="bg-gray-50 p-3 text-center rounded"><p className="text-xs text-gray-500">Monthly Allocation</p><p className="font-bold text-lg">{allocated}</p></div>
                   <div className="bg-gray-50 p-3 text-center rounded"><p className="text-xs text-gray-500">Used (Month)</p><p className="font-bold text-lg">{used}</p></div>
                   <div className="bg-pink-50 p-3 text-center rounded"><p className="text-xs text-[#D96C8A]">Remaining (Month)</p><p className="font-bold text-lg text-[#D96C8A]">{Math.max(0, allocated - used)}</p></div>
               </div>
           )}

           <div className="space-y-2">
               <h4 className="font-semibold text-sm">Transaction History</h4>
               {history.length === 0 ? <p className="text-sm text-gray-500">No transactions this month.</p> : history.map(h => (
                   <div key={h.id} className="p-3 border rounded-lg flex justify-between items-center text-sm">
                       <div><p className="font-medium">{h.type}</p><p className="text-xs text-gray-500">{h.startDate}</p></div>
                       <div className="font-bold">{h.type === 'CCL_WORKED' ? '+' : '-'}{h.days}</div>
                   </div>
               ))}
           </div>
       </Modal>
   );
};

const RequestDetailModal: React.FC<{isOpen: boolean, onClose: () => void, request: DemoLeaveRequest | null, onApprove?: (id:string)=>void, onReject?: (id:string)=>void}> = ({isOpen, onClose, request, onApprove, onReject}) => {
    const { employees, departments } = useDemoState();
    if(!request || !isOpen) return null;
    const emp = employees.find(e => e.uid === request.employeeUid);
    const dept = departments.find(d => d.id === request.departmentId);

    const monthKey = request.startDate.substring(0, 7);
    const clRemainingMonth = emp ? Math.max(0, 1 - (emp.clUsedThisMonth[monthKey] || 0)) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request Details">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E5EA]">
                <UserAvatar url={emp?.photoUrl} name={emp?.name || 'User'} className="w-12 h-12" />
                <div>
                    <h3 className="font-bold text-[#2D2D32]">{emp?.name}</h3>
                    <p className="text-sm text-[#6B6B73]">{emp?.empId} • {dept?.name}</p>
                </div>
                <div className="ml-auto"><StatusBadge status={request.status} /></div>
            </div>
            <div className="space-y-4 mb-6 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[#6B6B73] block mb-1">Type</span><span className="font-semibold">{request.type}</span></div>
                    <div><span className="text-[#6B6B73] block mb-1">Dates</span><span className="font-semibold">{request.startDate} {request.startDate !== request.endDate && `to ${request.endDate}`} ({request.days}d)</span></div>
                    <div><span className="text-[#6B6B73] block mb-1">Submitted</span><span>{new Date(request.submittedAt).toLocaleString()}</span></div>
                </div>
                <div><span className="text-[#6B6B73] block mb-1">Reason</span><p className="bg-gray-50 p-3 rounded border text-[#2D2D32]">{request.reason}</p></div>
                {emp && request.type !== 'NO_PAY_LEAVE' && (
                    <div className="bg-blue-50 p-3 rounded-lg flex justify-between">
                         <span className="text-blue-800 font-medium">Current Balances:</span>
                         <span className="text-blue-800">CL (Month): {clRemainingMonth} | CCL: {emp.cclEarned - emp.cclUsed}</span>
                    </div>
                )}
            </div>
            {request.status === 'PENDING' && onApprove && onReject && (
                <div className="flex gap-3">
                    <Button fullWidth onClick={() => { onApprove(request.id); onClose(); }} className="bg-green-600 hover:bg-green-700">Approve Request</Button>
                    <Button fullWidth variant="outline" onClick={() => { onReject(request.id); onClose(); }} className="text-red-600 hover:border-red-600 hover:bg-red-50">Reject</Button>
                </div>
            )}
        </Modal>
    );
};

// --- Dashboards ---
const GenericDashboard = ({ role }: { role: Role }) => {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const { employees, leaveRequests, announcements, schedules } = useDemoState();
  const [balanceModal, setBalanceModal] = useState<{show: boolean, type: 'CL'|'CCL'}>({show: false, type: 'CL'});

  const totalStaff = employees.length;
  const pending = leaveRequests.filter(r => r.status === 'PENDING' && r.type !== 'CCL_WORKED').length;
  const cclPending = leaveRequests.filter(r => r.status === 'PENDING' && (r.type === 'CCL_WORKED' || r.type === 'CCL_USED')).length;
  const onLeaveToday = leaveRequests.filter(r => r.status === 'APPROVED' && r.startDate <= new Date().toISOString().split('T')[0] && r.endDate >= new Date().toISOString().split('T')[0]).length;
  
  const myEmpData = employees.find(e => e.uid === profile?.uid);
  const myPending = leaveRequests.filter(r => r.employeeUid === profile?.uid && r.status === 'PENDING').length;

  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const myCLRemainingMonth = myEmpData ? Math.max(0, 1 - (myEmpData.clUsedThisMonth[currentMonthKey] || 0)) : 0;
  
  // Calculate NPL this month for employee dashboard
  const myNPLThisMonth = leaveRequests.filter(r => r.employeeUid === profile?.uid && r.status === 'APPROVED' && r.type === 'NO_PAY_LEAVE' && r.startDate.startsWith(currentMonthKey)).reduce((sum, r) => sum + r.days, 0);

  const visibleAnnouncements = announcements.filter(a => !a.archived && (a.target === 'All Staff' || (a.target === 'Department' && a.targetId === profile?.departmentId) || (a.target === 'Specific Employee' && a.targetId === profile?.uid)));

  return (
    <>
      <div><h1 className="text-2xl font-bold text-[#2D2D32]">Dashboard</h1><p className="text-[#6B6B73]">Welcome back, {profile?.displayName}</p></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'PRINCIPAL' ? (
          <>
            <StatCard onClick={() => navigate('/admin/employees')} title="Total Staff" value={totalStaff} icon={Users} colorClass="bg-blue-100 text-blue-600" />
            <StatCard onClick={() => navigate('/admin/calendar')} title="On Leave Today" value={onLeaveToday} icon={CalendarDays} colorClass="bg-pink-100 text-[#D96C8A]" />
            <StatCard onClick={() => navigate('/admin/requests')} title="Pending Requests" value={pending} icon={FileText} colorClass="bg-yellow-100 text-yellow-600" />
            <StatCard onClick={() => navigate('/admin/ccl')} title="CCL Pending" value={cclPending} icon={Clock} colorClass="bg-green-100 text-green-600" />
          </>
        ) : (
          <>
            <StatCard onClick={() => setBalanceModal({show: true, type: 'CL'})} title="CL Remaining (Month)" value={myCLRemainingMonth} icon={FileText} colorClass="bg-pink-100 text-[#D96C8A]" />
            <StatCard onClick={() => setBalanceModal({show: true, type: 'CCL'})} title="CCL Available" value={((myEmpData?.cclEarned || 0) - (myEmpData?.cclUsed || 0))} icon={Clock} colorClass="bg-green-100 text-green-600" />
            <StatCard onClick={() => navigate('/employee/my-requests')} title="Pending Requests" value={myPending} icon={AlertCircle} colorClass="bg-yellow-100 text-yellow-600" />
            <StatCard onClick={() => {}} title="No Pay Leave (Month)" value={myNPLThisMonth} icon={CalendarDays} colorClass="bg-gray-100 text-gray-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#2D2D32]">Today's Schedule</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate(role === 'PRINCIPAL' ? '/admin/schedule' : '/employee/schedule')}>View All</Button>
          </div>
          <div className="space-y-3">
             {schedules.filter(s => s.date === new Date().toISOString().split('T')[0] && (role === 'PRINCIPAL' || s.target === 'All Staff' || (s.target === 'Department' && s.targetId === profile?.departmentId) || (s.target === 'Specific Employee' && s.targetId === profile?.uid))).map(s => (
                <div key={s.id} onClick={() => navigate(role === 'PRINCIPAL' ? '/admin/schedule' : '/employee/schedule')} className="p-3 bg-gray-50 rounded-lg border border-[#E5E5EA] flex justify-between items-center hover:border-blue-300 transition-colors cursor-pointer">
                   <div><p className="font-semibold text-[#2D2D32]">{s.title}</p><p className="text-xs text-[#6B6B73]">{s.startTime} - {s.endTime}</p></div>
                   <CalendarIcon className="w-5 h-5 text-blue-500"/>
                </div>
             ))}
             {schedules.filter(s => s.date === new Date().toISOString().split('T')[0] && (role === 'PRINCIPAL' || s.target === 'All Staff' || (s.target === 'Department' && s.targetId === profile?.departmentId) || (s.target === 'Specific Employee' && s.targetId === profile?.uid))).length === 0 && <div className="p-8 text-center text-gray-400 border border-dashed rounded-lg">No schedules for today.</div>}
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#2D2D32]">Announcements</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate(role === 'PRINCIPAL' ? '/admin/announcements' : '/employee/announcements')}>View All</Button>
          </div>
          <div className="space-y-3">
             {visibleAnnouncements.slice(0, 3).map(ann => (
                <div key={ann.id} onClick={() => navigate(role === 'PRINCIPAL' ? '/admin/announcements' : '/employee/announcements')} className="p-3 bg-pink-50/50 rounded-lg border border-pink-100 cursor-pointer hover:bg-pink-50 transition-colors">
                   <div className="flex justify-between items-start"><p className="font-semibold text-[#2D2D32]">{ann.title}</p>{ann.priority === 'Urgent' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Urgent</span>}</div>
                   <p className="text-xs text-[#6B6B73] mt-1 line-clamp-1">{ann.description}</p>
                </div>
             ))}
             {visibleAnnouncements.length === 0 && <div className="p-8 text-center text-gray-400 border border-dashed rounded-lg">No recent announcements.</div>}
          </div>
        </Card>
      </div>
      
      {myEmpData && <BalanceModal isOpen={balanceModal.show} onClose={() => setBalanceModal({...balanceModal, show: false})} type={balanceModal.type} employee={myEmpData} />}
    </>
  );
};

// --- Profiles ---
const ProfileEditor: React.FC<{ employee: DemoEmployee | null, isPrincipal: boolean }> = ({ employee, isPrincipal }) => {
    const { updateEmployee } = useDemoState();
    const { refreshProfile } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    
    useEffect(() => {
        if(employee) setFormData({ name: employee.name, phone: employee.phone || '', email: employee.email || '' });
    }, [employee]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && employee) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                updateEmployee(employee.uid, { photoUrl: url });
                refreshProfile();
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSave = () => {
        if(employee) {
            updateEmployee(employee.uid, formData);
            refreshProfile();
            setEditMode(false);
        }
    };

    if(!employee) return <div className="p-8 text-center">Loading Profile...</div>;
    
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    const clRemainingMonth = Math.max(0, 1 - (employee.clUsedThisMonth[currentMonthKey] || 0));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[#2D2D32]">My Profile</h1>
            <Card className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="flex flex-col items-center gap-4 shrink-0">
                        <UserAvatar url={employee.photoUrl} name={employee.name} className="w-28 h-28 md:w-32 md:h-32 text-3xl" />
                        <label className="cursor-pointer text-sm font-medium text-[#D96C8A] hover:text-[#c25a77] flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-lg">
                            <Upload className="w-4 h-4" /> Change Photo
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </label>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold border-b pb-2 w-full">Personal Information</h2>
                            <Button variant="ghost" size="sm" onClick={() => editMode ? handleSave() : setEditMode(true)} className="ml-4 shrink-0 border border-gray-200">
                                {editMode ? <><Check className="w-4 h-4 mr-2"/> Save</> : <><Edit className="w-4 h-4 mr-2"/> Edit</>}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Full Name</label>
                                {editMode ? <input className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /> : <p className="font-medium text-[#2D2D32]">{employee.name}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Employee ID</label>
                                <p className="font-medium text-[#6B6B73]">{employee.empId} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">Non-editable</span></p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
                                {editMode ? <input type="email" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /> : <p className="font-medium text-[#2D2D32]">{employee.email}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Phone</label>
                                {editMode ? <input className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /> : <p className="font-medium text-[#2D2D32]">{employee.phone || 'Not provided'}</p>}
                            </div>
                            
                            {!isPrincipal && (
                                <>
                                    <div className="col-span-full mt-4"><h2 className="text-xl font-bold border-b pb-2 w-full">Employment Details</h2></div>
                                    <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Designation</label><p className="font-medium text-[#2D2D32]">{employee.designation}</p></div>
                                    <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Role</label><p className="font-medium text-[#2D2D32]">{employee.role}</p></div>
                                    <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Joining Date</label><p className="font-medium text-[#2D2D32]">{employee.joiningDate}</p></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
            {!isPrincipal && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Card className="p-6 bg-pink-50 border-pink-100 flex justify-between items-center"><p className="font-medium text-pink-800">Available CL (Month)</p><p className="text-2xl font-bold text-pink-900">{clRemainingMonth}</p></Card>
                     <Card className="p-6 bg-green-50 border-green-100 flex justify-between items-center"><p className="font-medium text-green-800">Available CCL</p><p className="text-2xl font-bold text-green-900">{employee.cclEarned - employee.cclUsed}</p></Card>
                 </div>
            )}
        </div>
    );
};

const ProfilePageWrapper = () => {
    const { profile } = useAuth();
    const { employees } = useDemoState();
    let emp = employees.find(e => e.uid === profile?.uid) || null;
    if (!emp && profile) {
      // Dynamic profile representation for Firebase authenticated user
      emp = {
        uid: profile.uid,
        name: profile.displayName || 'Administrator',
        empId: 'ADMIN-001',
        departmentId: profile.departmentId || 'dept-1',
        designation: profile.role === 'PRINCIPAL' ? 'Principal & Administrator' : 'Staff Member',
        role: profile.role,
        email: profile.email || '',
        phone: '',
        joiningDate: new Date().toISOString().split('T')[0],
        clUsedThisMonth: {},
        cclEarned: 0,
        cclUsed: 0,
        photoUrl: profile.photoUrl
      };
    }
    return <ProfileEditor employee={emp} isPrincipal={profile?.role === 'PRINCIPAL'} />;
};


// --- Admin Views ---
const AdminEmployees = () => {
  const { employees, departments, addEmployee } = useDemoState();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', empId: '', departmentId: departments[0]?.id || '', designation: '', role: 'EMPLOYEE' as Role, email: '', phone: '' });

  const filtered = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.empId.toLowerCase().includes(search.toLowerCase()) || e.designation.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept ? e.departmentId === filterDept : true;
    return matchesSearch && matchesDept;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee(newEmp);
    setShowAdd(false);
    setNewEmp({ name: '', empId: '', departmentId: departments[0]?.id || '', designation: '', role: 'EMPLOYEE', email: '', phone: '' });
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#2D2D32]">Staff Management</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4"/> Add Employee</Button>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Employee (Demo)">
         <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Name</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.name} onChange={e=>setNewEmp({...newEmp, name: e.target.value})}/></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Emp ID</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.empId} onChange={e=>setNewEmp({...newEmp, empId: e.target.value})}/></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Email</label><input type="email" required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.email} onChange={e=>setNewEmp({...newEmp, email: e.target.value})}/></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.phone} onChange={e=>setNewEmp({...newEmp, phone: e.target.value})}/></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Designation</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.designation} onChange={e=>setNewEmp({...newEmp, designation: e.target.value})}/></div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Department</label>
                  <select className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.departmentId} onChange={e=>setNewEmp({...newEmp, departmentId: e.target.value})}>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-700 mb-1 block">Role</label>
                  <select className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newEmp.role} onChange={e=>setNewEmp({...newEmp, role: e.target.value as Role})}>
                    <option value="EMPLOYEE">Employee</option><option value="HOD">HOD</option><option value="PRINCIPAL">Principal</option>
                  </select>
                </div>
            </div>
            <Button type="submit" fullWidth className="mt-4">Save Employee</Button>
          </form>
      </Modal>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 bg-[#F7F7F8]">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Search staff by name, ID, designation..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full pl-10 pr-3 rounded-md border border-[#E5E5EA] text-sm focus:outline-none focus:border-[#D96C8A]" />
        </div>
        <div className="flex items-center gap-2">
           <Filter className="w-5 h-5 text-gray-400" />
           <select className="h-10 w-full sm:w-auto rounded-md border border-[#E5E5EA] px-3 text-sm focus:outline-none" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
             <option value="">All Departments</option>
             {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-xs font-semibold border-b border-[#E5E5EA]">
            <tr><th className="px-4 py-3">Profile</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Dept</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5EA]">
            {filtered.map(row => (
              <tr key={row.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><UserAvatar url={row.photoUrl} name={row.name} className="w-8 h-8 text-xs"/></td>
                <td className="px-4 py-3 font-medium">{row.empId}</td>
                <td className="px-4 py-3">{row.name}<br/><span className="text-xs text-gray-500">{row.designation}</span></td>
                <td className="px-4 py-3">{getDeptName(row.departmentId)}</td>
                <td className="px-4 py-3 text-xs">{row.role}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No employees match your search.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
};

const AdminDepartments = () => {
  const { departments, employees, addDepartment } = useDemoState();
  const [showAdd, setShowAdd] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '', hodUid: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addDepartment(newDept);
    setShowAdd(false);
    setNewDept({ name: '', code: '', hodUid: '' });
  };

  const getHodName = (uid: string) => employees.find(e => e.uid === uid)?.name || 'Not Assigned';

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#2D2D32]">Departments</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4"/> Add Department</Button>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Department">
         <form onSubmit={handleAdd} className="space-y-4">
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">Name</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newDept.name} onChange={e=>setNewDept({...newDept, name: e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">Code</label><input required className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newDept.code} onChange={e=>setNewDept({...newDept, code: e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">Assign HOD</label>
              <select className="w-full h-10 border rounded-md px-3 text-sm focus:border-[#D96C8A]" value={newDept.hodUid} onChange={e=>setNewDept({...newDept, hodUid: e.target.value})}>
                <option value="">Select HOD...</option>
                {employees.filter(e => e.role === 'HOD').map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}
              </select>
            </div>
            <Button type="submit" fullWidth>Save Department</Button>
          </form>
      </Modal>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-xs font-semibold border-b border-[#E5E5EA]">
            <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">HOD</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5EA]">
            {departments.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{row.code}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{getHodName(row.hodUid)}</td>
                <td className="px-4 py-3"><StatusBadge status={row.active ? 'Active' : 'Inactive'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
};

const AdminLeaveRequests = () => {
  const { leaveRequests, departments, approveLeaveRequest, rejectLeaveRequest } = useDemoState();
  const [search, setSearch] = useState('');
  const [selectedReq, setSelectedReq] = useState<DemoLeaveRequest | null>(null);
  
  const filtered = leaveRequests.filter(r => (r.type !== 'CCL_WORKED' && r.type !== 'CCL_USED') && (r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.status.toLowerCase().includes(search.toLowerCase())));
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  return (
    <>
      <h1 className="text-2xl font-bold text-[#2D2D32]">Leave Requests</h1>
      <Card className="p-4 flex gap-4 bg-[#F7F7F8]">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="Search by name or status..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full pl-10 pr-3 rounded-md border border-[#E5E5EA] text-sm focus:outline-none focus:border-[#D96C8A]" />
          </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-xs font-semibold border-b border-[#E5E5EA]">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5EA]">
            {filtered.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{row.employeeName} <span className="block text-xs text-gray-500">{getDeptName(row.departmentId)}</span></td>
                <td className="px-4 py-3 font-semibold">{row.type}</td>
                <td className="px-4 py-3">{row.startDate} to {row.endDate} ({row.days}d)</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReq(row)}>View Details</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No requests found.</td></tr>}
          </tbody>
        </table>
      </Card>
      <RequestDetailModal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} request={selectedReq} onApprove={approveLeaveRequest} onReject={rejectLeaveRequest} />
    </>
  );
};

const AdminCCL = () => {
   const { leaveRequests, departments, approveLeaveRequest, rejectLeaveRequest } = useDemoState();
   const [tab, setTab] = useState<'WORKED'|'USED'>('WORKED');
   const [selectedReq, setSelectedReq] = useState<DemoLeaveRequest | null>(null);

   const filtered = leaveRequests.filter(r => r.type === (tab === 'WORKED' ? 'CCL_WORKED' : 'CCL_USED'));
   const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

   return (
       <>
         <h1 className="text-2xl font-bold text-[#2D2D32]">CCL Management</h1>
         <div className="flex border-b border-[#E5E5EA] space-x-4 mb-4">
             <button onClick={() => setTab('WORKED')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'WORKED' ? 'border-[#D96C8A] text-[#D96C8A]' : 'border-transparent text-[#6B6B73] hover:text-[#2D2D32]'}`}>CCL Worked Requests</button>
             <button onClick={() => setTab('USED')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'USED' ? 'border-[#D96C8A] text-[#D96C8A]' : 'border-transparent text-[#6B6B73] hover:text-[#2D2D32]'}`}>CCL Used Requests</button>
         </div>

         <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-xs font-semibold border-b border-[#E5E5EA]">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5EA]">
            {filtered.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{row.employeeName} <span className="block text-xs text-gray-500">{getDeptName(row.departmentId)}</span></td>
                <td className="px-4 py-3">{row.startDate}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{row.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReq(row)}>View Details</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No requests found.</td></tr>}
          </tbody>
        </table>
      </Card>
      <RequestDetailModal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} request={selectedReq} onApprove={approveLeaveRequest} onReject={rejectLeaveRequest} />
       </>
   );
};

const DynamicCalendar = ({ viewRole }: { viewRole: Role }) => {
  const { leaveRequests, calendarEvents, addCalendarEvent, employees } = useDemoState();
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getEvents = (dayNum: number) => {
    const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    let leaves = leaveRequests.filter(r => r.status === 'APPROVED' && r.startDate <= dStr && r.endDate >= dStr);
    let calEvents = calendarEvents.filter(e => e.date === dStr);

    if (viewRole === 'EMPLOYEE') {
        leaves = leaves.filter(r => r.employeeUid === profile?.uid);
        calEvents = calEvents.filter(e => e.target === 'All Staff' || (e.target === 'Department' && e.targetId === profile?.departmentId) || (e.target === 'Specific Employee' && e.targetId === profile?.uid));
    }
    return { leaves, calEvents, dateStr: dStr };
  };

  const selectedData = selectedDateStr ? (() => {
      const parts = selectedDateStr.split('-');
      return getEvents(parseInt(parts[2]));
  })() : { leaves: [], calEvents: [], dateStr: '' };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h1 className="text-2xl font-bold text-[#2D2D32]">{viewRole === 'EMPLOYEE' ? 'My Calendar' : 'Institution Calendar'}</h1>
         {viewRole === 'PRINCIPAL' && <Button onClick={() => setShowAddEvent(true)} size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-1"/> Add Event</Button>}
      </div>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-[#2D2D32]">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4"/></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>This Month</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4"/></Button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm font-semibold text-[#6B6B73] mb-2">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] bg-gray-50/50 rounded-lg"></div>)}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const dayNum = i + 1;
                const { leaves, calEvents, dateStr } = getEvents(dayNum);
                const isToday = new Date().getDate() === dayNum && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                
                return (
                  <div key={dayNum} onClick={() => setSelectedDateStr(dateStr)} className={`min-h-[80px] sm:min-h-[100px] border border-[#E5E5EA] rounded-lg p-1.5 sm:p-2 bg-white relative cursor-pointer hover:border-[#D96C8A] transition-colors`}>
                    <span className={`text-xs sm:text-sm font-medium ${isToday ? 'bg-[#D96C8A] text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center' : 'text-[#2D2D32]'}`}>{dayNum}</span>
                    <div className="mt-1 space-y-1 overflow-hidden h-12 sm:h-16">
                      {calEvents.map((ev, idx) => <div key={`c-${idx}`} className="text-[9px] sm:text-[10px] p-0.5 sm:p-1 rounded font-medium truncate bg-gray-100 text-gray-700">{ev.title}</div>)}
                      {leaves.map((ev, idx) => (
                        <div key={`l-${idx}`} className={`text-[9px] sm:text-[10px] p-0.5 sm:p-1 rounded font-medium truncate ${ev.type === 'NO_PAY_LEAVE' ? 'bg-gray-100 text-gray-600' : (ev.type.includes('CCL') ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700')}`}>
                          {ev.type} - {ev.employeeName.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Modal isOpen={!!selectedDateStr} onClose={() => setSelectedDateStr(null)} title={`Events for ${selectedDateStr}`}>
          <div className="space-y-4">
             {selectedData.calEvents.length === 0 && selectedData.leaves.length === 0 && <div className="p-8 text-center text-gray-500 border border-dashed rounded">No events scheduled.</div>}
             {selectedData.calEvents.map(e => (
                 <div key={e.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200"><p className="font-bold text-sm text-[#2D2D32]">{e.title}</p><p className="text-xs text-gray-500 mt-1">Target: {e.target}</p></div>
             ))}
             {selectedData.leaves.map(l => (
                 <div key={l.id} className={`p-3 rounded-lg border ${l.type === 'NO_PAY_LEAVE' ? 'bg-gray-50 border-gray-200' : (l.type.includes('CCL') ? 'bg-green-50 border-green-100' : 'bg-pink-50 border-pink-100')}`}>
                     <div className="flex justify-between items-center"><p className="font-bold text-sm">{l.employeeName} ({l.type})</p><StatusBadge status={l.status}/></div>
                     <p className="text-xs mt-1 text-gray-700">{l.reason}</p>
                 </div>
             ))}
          </div>
      </Modal>

      <Modal isOpen={showAddEvent} onClose={() => setShowAddEvent(false)} title="Add Calendar Event">
         <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addCalendarEvent({ title: fd.get('title') as string, type: 'OTHER', date: fd.get('date') as string, target: fd.get('target') as any }); setShowAddEvent(false); }} className="space-y-4">
             <div><label className="text-xs font-medium block mb-1">Event Title</label><input name="title" required className="w-full h-10 border rounded px-3 focus:border-[#D96C8A]" /></div>
             <div><label className="text-xs font-medium block mb-1">Date</label><input type="date" name="date" required className="w-full h-10 border rounded px-3 focus:border-[#D96C8A]" /></div>
             <div><label className="text-xs font-medium block mb-1">Audience</label><select name="target" className="w-full h-10 border rounded px-3 focus:border-[#D96C8A]"><option>All Staff</option><option>Department</option><option>Specific Employee</option></select></div>
             <Button fullWidth type="submit" className="mt-4">Save Event</Button>
         </form>
      </Modal>
    </>
  );
};

const AdminAnnouncements = () => {
    const { announcements, addAnnouncement, archiveAnnouncement, departments } = useDemoState();
    const [showAdd, setShowAdd] = useState(false);
    const activeAnns = announcements.filter(a => !a.archived);

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-[#2D2D32]">Announcements</h1>
                <Button onClick={() => setShowAdd(true)} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4"/> New Announcement</Button>
            </div>
            
            <div className="space-y-4">
                {activeAnns.map(ann => (
                    <Card key={ann.id} className="p-4 sm:p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-[#2D2D32]">{ann.title}</h3>
                                    {ann.priority === 'Urgent' && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium">Urgent</span>}
                                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{ann.category}</span>
                                </div>
                                <p className="text-sm text-[#6B6B73] mb-4">Target: {ann.target} • Published: {new Date(ann.publishDate).toLocaleDateString()}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => archiveAnnouncement(ann.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                        <p className="text-[#2D2D32] whitespace-pre-wrap">{ann.description}</p>
                        {ann.link && <a href={ann.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-[#D96C8A] hover:underline text-sm"><LinkIcon className="w-4 h-4"/> {ann.link}</a>}
                    </Card>
                ))}
                {activeAnns.length === 0 && <div className="p-12 text-center text-gray-400 border border-dashed rounded-xl bg-gray-50">No active announcements.</div>}
            </div>

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Publish Announcement" maxWidth="max-w-2xl">
                <form onSubmit={e => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    addAnnouncement({
                        title: fd.get('title') as string,
                        description: fd.get('desc') as string,
                        category: fd.get('category') as string,
                        priority: fd.get('priority') as any,
                        target: fd.get('target') as any,
                        targetId: fd.get('targetId') as string,
                        publishDate: new Date().toISOString(),
                        link: fd.get('link') as string
                    });
                    setShowAdd(false);
                }} className="space-y-4">
                    <input name="title" required placeholder="Announcement Title" className="w-full h-10 border rounded px-3 text-sm font-medium focus:border-[#D96C8A]"/>
                    <textarea name="desc" required rows={4} placeholder="Detailed description..." className="w-full border rounded px-3 py-2 text-sm focus:border-[#D96C8A]"></textarea>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="text-xs block mb-1 text-gray-500 font-semibold">Category</label><select name="category" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]"><option>General</option><option>Meeting</option><option>Holiday</option></select></div>
                        <div><label className="text-xs block mb-1 text-gray-500 font-semibold">Priority</label><select name="priority" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]"><option>Normal</option><option>Important</option><option>Urgent</option></select></div>
                        <div><label className="text-xs block mb-1 text-gray-500 font-semibold">Audience</label><select name="target" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]"><option>All Staff</option><option>Department</option></select></div>
                        <div><label className="text-xs block mb-1 text-gray-500 font-semibold">Target Specific (If Applicable)</label><select name="targetId" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]"><option value="">N/A</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                    </div>
                    <input name="link" placeholder="Optional URL Link" className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]"/>
                    <div className="pt-4 flex gap-3"><Button type="submit" fullWidth>Publish Now</Button><Button type="button" variant="outline" fullWidth onClick={()=>setShowAdd(false)}>Cancel</Button></div>
                </form>
            </Modal>
        </>
    );
};

// --- Schedule Management Components ---
const ScheduleForm: React.FC<{
  initialData?: DemoSchedule;
  departments: DemoDepartment[];
  employees: DemoEmployee[];
  onSubmit: (data: Omit<DemoSchedule, 'id'>) => void;
  onCancel: () => void;
  submitLabel: string;
}> = ({ initialData, departments, employees, onSubmit, onCancel, submitLabel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const [target, setTarget] = useState<'All Staff' | 'Department' | 'Specific Employee'>(initialData?.target || 'All Staff');
  const [targetId, setTargetId] = useState(initialData?.targetId || (target === 'Department' ? departments[0]?.id : employees[0]?.uid) || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      date,
      startTime,
      endTime,
      target,
      targetId: target === 'All Staff' ? undefined : targetId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold block mb-1 text-gray-700">Schedule Title *</label>
        <input 
          required 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="e.g. Staff Briefing, Exam Invigilation" 
          className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1 text-gray-700">Date *</label>
          <input 
            type="date" 
            required 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1 text-gray-700">Start Time *</label>
          <input 
            type="time" 
            required 
            value={startTime} 
            onChange={e => setStartTime(e.target.value)} 
            className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1 text-gray-700">End Time *</label>
          <input 
            type="time" 
            required 
            value={endTime} 
            onChange={e => setEndTime(e.target.value)} 
            className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold block mb-1 text-gray-700">Target Audience *</label>
          <select 
            value={target} 
            onChange={e => {
              const newTarget = e.target.value as any;
              setTarget(newTarget);
              if (newTarget === 'Department') setTargetId(departments[0]?.id || '');
              if (newTarget === 'Specific Employee') setTargetId(employees[0]?.uid || '');
            }} 
            className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none bg-white"
          >
            <option value="All Staff">All Staff</option>
            <option value="Department">Specific Department</option>
            <option value="Specific Employee">Specific Employee</option>
          </select>
        </div>

        {target === 'Department' && (
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">Select Department *</label>
            <select 
              value={targetId} 
              onChange={e => setTargetId(e.target.value)} 
              className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none bg-white"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        )}

        {target === 'Specific Employee' && (
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">Select Employee *</label>
            <select 
              value={targetId} 
              onChange={e => setTargetId(e.target.value)} 
              className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A] outline-none bg-white"
            >
              {employees.map(emp => (
                <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.empId})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold block mb-1 text-gray-700">Description / Details</label>
        <textarea 
          rows={3} 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="Session details, agenda, venue, or instructions..." 
          className="w-full border rounded px-3 py-2 text-sm focus:border-[#D96C8A] outline-none"
        />
      </div>

      <div className="pt-2 flex gap-3">
        <Button type="submit" fullWidth>{submitLabel}</Button>
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
};

const AdminSchedule = () => {
  const { schedules, addSchedule, updateSchedule, deleteSchedule, departments, employees } = useDemoState();
  const [showAdd, setShowAdd] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DemoSchedule | null>(null);
  const [targetFilter, setTargetFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredSchedules = schedules.filter(s => {
    if (targetFilter !== 'ALL' && s.target !== targetFilter) return false;
    if (dateFilter && s.date !== dateFilter) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const getTargetLabel = (s: DemoSchedule) => {
    if (s.target === 'All Staff') return 'All Staff';
    if (s.target === 'Department') {
      const dept = departments.find(d => d.id === s.targetId);
      return dept ? `Department: ${dept.name} (${dept.code})` : 'Department';
    }
    if (s.target === 'Specific Employee') {
      const emp = employees.find(e => e.uid === s.targetId);
      return emp ? `Staff: ${emp.name} (${emp.empId})` : 'Specific Employee';
    }
    return s.target;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D32]">Institution Schedules</h1>
          <p className="text-sm text-[#6B6B73]">Manage and assign work schedules, meetings, and faculty duties.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-[#E5E5EA]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#6B6B73]">Audience:</span>
          <select 
            value={targetFilter} 
            onChange={e => setTargetFilter(e.target.value)} 
            className="h-9 text-xs border rounded-md px-2.5 bg-white focus:border-[#D96C8A] outline-none"
          >
            <option value="ALL">All Audiences</option>
            <option value="All Staff">All Staff</option>
            <option value="Department">Departments</option>
            <option value="Specific Employee">Specific Employees</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#6B6B73]">Date:</span>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="h-9 text-xs border rounded-md px-2.5 bg-white focus:border-[#D96C8A] outline-none"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs text-[#D96C8A] hover:underline font-medium">
              Clear
            </button>
          )}
        </div>
        
        <div className="ml-auto text-xs text-[#6B6B73]">
          Showing {filteredSchedules.length} {filteredSchedules.length === 1 ? 'schedule' : 'schedules'}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSchedules.map(s => (
          <Card key={s.id} className="p-4 sm:p-6 hover:border-[#D96C8A]/30 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-[#2D2D32]">{s.title}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {s.startTime} - {s.endTime}
                  </span>
                  <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> {s.date}
                  </span>
                </div>
                <div className="text-xs text-[#6B6B73] font-medium">
                  Audience: <span className="text-[#2D2D32] font-semibold">{getTargetLabel(s)}</span>
                </div>
                {s.description && (
                  <p className="text-sm text-[#2D2D32] whitespace-pre-wrap leading-relaxed pt-1">
                    {s.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingSchedule(s)} 
                  className="gap-1 text-xs"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { if (confirm('Are you sure you want to delete this schedule?')) deleteSchedule(s.id); }} 
                  className="text-gray-400 hover:text-red-600 p-2"
                  aria-label="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredSchedules.length === 0 && (
          <div className="p-12 text-center text-gray-400 border border-dashed rounded-xl bg-gray-50">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-600">No schedules found.</p>
            <p className="text-xs text-gray-400 mt-1">Create a new schedule or clear filters to view schedules.</p>
          </div>
        )}
      </div>

      {/* Add Schedule Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create New Schedule" maxWidth="max-w-xl">
        <ScheduleForm 
          departments={departments}
          employees={employees}
          onSubmit={(data) => {
            addSchedule(data);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
          submitLabel="Create Schedule"
        />
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal isOpen={!!editingSchedule} onClose={() => setEditingSchedule(null)} title="Edit Schedule" maxWidth="max-w-xl">
        {editingSchedule && (
          <ScheduleForm 
            initialData={editingSchedule}
            departments={departments}
            employees={employees}
            onSubmit={(data) => {
              updateSchedule(editingSchedule.id, data);
              setEditingSchedule(null);
            }}
            onCancel={() => setEditingSchedule(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>
    </>
  );
};

const EmployeeSchedule = () => {
  const { schedules, departments } = useDemoState();
  const { profile } = useAuth();
  const [dateFilter, setDateFilter] = useState('');

  const mySchedules = schedules.filter(s => {
    const isAssigned = s.target === 'All Staff' || 
      (s.target === 'Department' && s.targetId === profile?.departmentId) || 
      (s.target === 'Specific Employee' && s.targetId === profile?.uid);
    if (!isAssigned) return false;
    if (dateFilter && s.date !== dateFilter) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const dept = departments.find(d => d.id === profile?.departmentId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D32]">My Assigned Schedule</h1>
          <p className="text-sm text-[#6B6B73]">View your assigned institution schedules, meetings, and department duties.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#6B6B73]">Filter Date:</span>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="h-9 text-xs border rounded-md px-2.5 bg-white focus:border-[#D96C8A] outline-none"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs text-[#D96C8A] hover:underline font-medium">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {mySchedules.map(s => (
          <Card key={s.id} className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[#2D2D32]">{s.title}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {s.startTime} - {s.endTime}
                </span>
                <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> {s.date}
                </span>
                <span className="bg-pink-50 text-[#D96C8A] text-xs px-2 py-0.5 rounded font-medium">
                  {s.target === 'All Staff' ? 'All Staff' : (s.target === 'Department' ? `${dept?.name || 'Department'} Schedule` : 'Direct Assignment')}
                </span>
              </div>
              {s.description && (
                <p className="text-sm text-[#2D2D32] whitespace-pre-wrap leading-relaxed pt-1">
                  {s.description}
                </p>
              )}
            </div>
          </Card>
        ))}

        {mySchedules.length === 0 && (
          <div className="p-12 text-center text-gray-400 border border-dashed rounded-xl bg-gray-50">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-600">No schedules assigned to you.</p>
            <p className="text-xs text-gray-400 mt-1">Check back later or contact administration for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MonthlyAttendanceSummary = () => {
    const { employees, departments, leaveRequests } = useDemoState();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [filterDept, setFilterDept] = useState('');

    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    // Working days calculation: assuming Mon-Fri are working days, subtracting weekends.
    let workingDays = 0;
    for(let d = 1; d <= daysInMonth; d++) {
        const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), d);
        if(date.getDay() !== 0 && date.getDay() !== 6) workingDays++;
    }

    const filteredEmployees = employees.filter(e => filterDept === '' || e.departmentId === filterDept);

    return (
        <>
            <h1 className="text-2xl font-bold text-[#2D2D32]">Monthly Staff Attendance Summary</h1>
            
            <Card className="p-4 flex flex-col md:flex-row gap-4 bg-[#F7F7F8] justify-between items-center">
                <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4"/></Button>
                    <span className="font-bold w-32 text-center">{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4"/></Button>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-5 h-5 text-gray-400 shrink-0" />
                    <select className="h-10 w-full rounded-md border border-[#E5E5EA] px-3 text-sm focus:outline-none" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </Card>

            <Card className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-[10px] font-bold border-b border-[#E5E5EA]">
                        <tr>
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-4 py-3 text-center border-l">Working Days</th>
                            <th className="px-4 py-3 text-center">Days Worked</th>
                            <th className="px-4 py-3 text-center text-pink-600 border-l bg-pink-50/30">CL</th>
                            <th className="px-4 py-3 text-center text-pink-600 bg-pink-50/30">SL</th>
                            <th className="px-4 py-3 text-center text-green-600 bg-green-50/30">CCL Used</th>
                            <th className="px-4 py-3 text-center text-gray-600 bg-gray-50">No Pay</th>
                            <th className="px-4 py-3 text-center border-l font-extrabold">Total Paid Leave</th>
                            <th className="px-4 py-3 text-center font-extrabold text-red-600">Total Unpaid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                        {filteredEmployees.map(emp => {
                            // Calculate leaves strictly for this month that are APPROVED
                            const empLeaves = leaveRequests.filter(r => r.employeeUid === emp.uid && r.status === 'APPROVED' && r.startDate.startsWith(monthKey));
                            
                            const clDays = empLeaves.filter(r => r.type === 'CL').reduce((s, r) => s + r.days, 0);
                            const slDays = empLeaves.filter(r => r.type === 'SL').reduce((s, r) => s + r.days, 0);
                            const cclUsed = empLeaves.filter(r => r.type === 'CCL_USED').reduce((s, r) => s + r.days, 0);
                            const noPayDays = empLeaves.filter(r => r.type === 'NO_PAY_LEAVE').reduce((s, r) => s + r.days, 0);
                            const emergencyDays = empLeaves.filter(r => r.type === 'EMERGENCY').reduce((s, r) => s + r.days, 0);

                            const totalPaid = clDays + slDays + cclUsed + emergencyDays;
                            const totalUnpaid = noPayDays;
                            const daysWorked = workingDays - (totalPaid + totalUnpaid);

                            return (
                                <tr key={emp.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-[#2D2D32]">{emp.name}</p>
                                        <p className="text-[10px] text-gray-500">{emp.empId} • {departments.find(d=>d.id===emp.departmentId)?.name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center border-l bg-gray-50 font-medium">{workingDays}</td>
                                    <td className="px-4 py-3 text-center bg-gray-50 font-bold">{Math.max(0, daysWorked)}</td>
                                    
                                    <td className="px-4 py-3 text-center border-l">{clDays}</td>
                                    <td className="px-4 py-3 text-center">{slDays}</td>
                                    <td className="px-4 py-3 text-center">{cclUsed}</td>
                                    <td className="px-4 py-3 text-center">{noPayDays}</td>

                                    <td className="px-4 py-3 text-center border-l bg-blue-50/30 font-bold text-blue-700">{totalPaid}</td>
                                    <td className="px-4 py-3 text-center bg-red-50/30 font-bold text-red-600">{totalUnpaid}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
        </>
    );
};

// --- Employee Views ---
const EmployeeApplyLeave = () => {
  const { profile, refreshProfile } = useAuth();
  const { employees, addLeaveRequest } = useDemoState();
  const [formData, setFormData] = useState({ type: 'CL', startDate: '', endDate: '', reason: '' });
  const [success, setSuccess] = useState(false);

  const myData = employees.find(e => e.uid === profile?.uid);
  
  // Enforce 1 CL Per Month Policy
  const currentMonthKey = formData.startDate ? formData.startDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  const clAvailMonth = myData ? Math.max(0, 1 - (myData.clUsedThisMonth[currentMonthKey] || 0)) : 0;
  
  const cclAvail = (myData?.cclEarned || 0) - (myData?.cclUsed || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) return;
    const days = Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 3600 * 24)) + 1;
    
    if (formData.type === 'CL') {
        if (days > 1) { alert("CL Policy restricts usage to 1 day per month."); return; }
        if (days > clAvailMonth) { alert(`Insufficient CL balance for ${currentMonthKey}.`); return; }
    }
    if (formData.type === 'CCL_USED' && days > cclAvail) { alert("Insufficient CCL balance."); return; }
    
    // Check Emergency Cutoff if applying for today
    let isEmergency = false;
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.startDate === todayStr) {
        const now = new Date();
        if (now.getHours() >= 9) { // 09:00 AM cutoff
            isEmergency = true;
            if(!window.confirm("It is past 09:00 AM. This will be marked as a Late Submission / Emergency Request. Continue?")) return;
        }
    }

    addLeaveRequest({
      employeeUid: profile?.uid || '', employeeName: profile?.displayName || '', departmentId: profile?.departmentId || '',
      type: formData.type, startDate: formData.startDate, endDate: formData.endDate, days, reason: formData.reason,
      isEmergency
    });
    setSuccess(true);
    refreshProfile();
    setFormData({ type: 'CL', startDate: '', endDate: '', reason: '' });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#2D2D32]">Apply for Leave / CCL</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <Card className="p-4 bg-pink-50 border-pink-100"><p className="text-sm text-pink-700 font-medium">CL Available (Month)</p><p className="text-2xl font-bold text-pink-800">{clAvailMonth}</p></Card>
         <Card className="p-4 bg-green-50 border-green-100"><p className="text-sm text-green-700 font-medium">Available CCL</p><p className="text-2xl font-bold text-green-800">{cclAvail}</p></Card>
      </div>
      {success && <div className="p-4 bg-green-50 text-green-700 rounded-lg flex gap-3 text-sm border border-green-100"><CheckCircle className="w-5 h-5 shrink-0" /><p>Request submitted successfully to Admin.</p></div>}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
             <label className="text-sm font-medium text-[#2D2D32]">Request Type</label>
             <select className="w-full h-10 border rounded px-3 text-sm focus:outline-none focus:border-[#D96C8A]" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="CCL_USED">Use Available CCL (CCL Used)</option>
                <option value="CCL_WORKED">Submit Work for CCL Credit (CCL Worked)</option>
                <option value="NO_PAY_LEAVE">No Pay Leave (Unpaid)</option>
             </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-[#2D2D32]">Start Date</label><input type="date" required className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
            <div><label className="text-sm font-medium text-[#2D2D32]">End Date</label><input type="date" required className="w-full h-10 border rounded px-3 text-sm focus:border-[#D96C8A]" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} /></div>
          </div>
          <div className="space-y-1">
             <label className="text-sm font-medium text-[#2D2D32]">Reason / Work Details</label>
             <textarea required rows={3} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#D96C8A]" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
          </div>
          <Button fullWidth type="submit">Submit Request</Button>
        </form>
      </Card>
    </div>
  );
};

const EmployeeMyRequests = () => {
    const { leaveRequests } = useDemoState();
    const { profile } = useAuth();
    const [selectedReq, setSelectedReq] = useState<DemoLeaveRequest | null>(null);
    const filtered = leaveRequests.filter(r => r.employeeUid === profile?.uid).sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return (
        <>
            <h1 className="text-2xl font-bold text-[#2D2D32]">My Requests</h1>
            <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#F7F7F8] text-[#6B6B73] uppercase text-xs font-semibold border-b border-[#E5E5EA]">
                <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
                {filtered.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedReq(row)}>
                    <td className="px-4 py-3 font-semibold">
                        {row.type}
                        {row.isEmergency && <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded">Late</span>}
                    </td>
                    <td className="px-4 py-3">{row.startDate} {row.startDate !== row.endDate && `to ${row.endDate}`}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{row.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-400"><ChevronRight className="w-4 h-4 inline"/></td>
                </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">You have no requests.</td></tr>}
            </tbody>
            </table>
        </Card>
        <RequestDetailModal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} request={selectedReq} />
      </>
    );
};

const EmployeeAnnouncements = () => {
    const { announcements } = useDemoState();
    const { profile } = useAuth();
    
    const visible = announcements.filter(a => !a.archived && (a.target === 'All Staff' || (a.target === 'Department' && a.targetId === profile?.departmentId) || (a.target === 'Specific Employee' && a.targetId === profile?.uid)));

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-[#2D2D32] mb-6">Institution Announcements</h1>
            <div className="space-y-4">
                {visible.map(ann => (
                    <Card key={ann.id} className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-[#2D2D32]">{ann.title}</h3>
                            {ann.priority === 'Urgent' && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium">Urgent</span>}
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{ann.category}</span>
                        </div>
                        <p className="text-xs text-[#6B6B73] mb-4">Published: {new Date(ann.publishDate).toLocaleDateString()}</p>
                        <p className="text-[#2D2D32] whitespace-pre-wrap leading-relaxed">{ann.description}</p>
                        {ann.link && <a href={ann.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-[#D96C8A] hover:underline text-sm font-medium"><LinkIcon className="w-4 h-4"/> Access Link</a>}
                    </Card>
                ))}
                {visible.length === 0 && <div className="p-12 text-center text-gray-400 border border-dashed rounded-xl bg-gray-50">No announcements.</div>}
            </div>
        </div>
    );
};

// --- App Shell ---
const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard', icon: PieChart },
  { path: '/admin/calendar', label: 'Calendar View', icon: CalendarDays },
  { path: '/admin/schedule', label: 'Schedule', icon: CalendarIcon },
  { path: '/admin/employees', label: 'Staff Management', icon: Users },
  { path: '/admin/departments', label: 'Departments', icon: Building2 },
  { path: '/admin/attendance-summary', label: 'Monthly Summary', icon: FileText },
  { path: '/admin/requests', label: 'Leave Requests', icon: CheckCircle },
  { path: '/admin/ccl', label: 'CCL Management', icon: Clock },
  { path: '/admin/announcements', label: 'Announcements', icon: Bell },
];

const EMPLOYEE_NAV = [
  { path: '/employee', label: 'Dashboard', icon: PieChart },
  { path: '/employee/schedule', label: 'Schedule', icon: CalendarIcon },
  { path: '/employee/apply-leave', label: 'Apply Leave/CCL', icon: Plus },
  { path: '/employee/my-requests', label: 'My Requests', icon: FileText },
  { path: '/employee/calendar', label: 'My Calendar', icon: CalendarDays },
  { path: '/employee/announcements', label: 'Announcements', icon: Bell },
];

const AppRoutes = () => {
  const { currentPath, navigate } = useRouter();
  const { profile, authStatus } = useAuth();

  if (currentPath === '/') return <LandingPage />;
  if (currentPath === '/login?type=admin') return <LoginPage type="admin" />;
  if (currentPath === '/login?type=employee') return <LoginPage type="employee" />;
  if (currentPath === '/register') return <RegisterPage />;

  // Protected Admin Routes
  if (currentPath.startsWith('/admin')) {
    if (authStatus === 'loading') {
      return (
        <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#D96C8A] animate-spin" />
            <p className="text-sm font-medium text-[#6B6B73]">Verifying administrator authentication...</p>
          </div>
        </div>
      );
    }
    if (profile?.role !== 'PRINCIPAL') {
      return (
        <div className="min-h-screen bg-[#F7F7F8] flex flex-col items-center justify-center p-6 text-center font-sans">
          <AlertCircle className="w-12 h-12 text-[#D96C8A] mb-3" />
          <h2 className="text-xl font-bold text-[#2D2D32]">Administrator Access Required</h2>
          <p className="text-sm text-[#6B6B73] max-w-sm mt-1 mb-6">You must be authenticated as an institution administrator or use Demo Admin Mode to access this portal.</p>
          <Button onClick={() => navigate('/login?type=admin')}>Go to Administrator Login</Button>
        </div>
      );
    }
    let content = <GenericDashboard role="PRINCIPAL" />;
    if (currentPath === '/admin/schedule') content = <AdminSchedule />;
    if (currentPath === '/admin/employees') content = <AdminEmployees />;
    if (currentPath === '/admin/departments') content = <AdminDepartments />;
    if (currentPath === '/admin/attendance-summary') content = <MonthlyAttendanceSummary />;
    if (currentPath === '/admin/requests') content = <AdminLeaveRequests />;
    if (currentPath === '/admin/ccl') content = <AdminCCL />;
    if (currentPath === '/admin/calendar') content = <DynamicCalendar viewRole="PRINCIPAL" />;
    if (currentPath === '/admin/announcements') content = <AdminAnnouncements />;
    if (currentPath === '/admin/profile') content = <ProfilePageWrapper />;
    return <AppLayout navItems={ADMIN_NAV}>{content}</AppLayout>;
  }

  // Protected Employee Routes
  if (currentPath.startsWith('/employee')) {
    if (authStatus === 'loading') {
      return (
        <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#D96C8A] animate-spin" />
            <p className="text-sm font-medium text-[#6B6B73]">Verifying employee credentials...</p>
          </div>
        </div>
      );
    }
    if (profile?.role !== 'EMPLOYEE') {
      return (
        <div className="min-h-screen bg-[#F7F7F8] flex flex-col items-center justify-center p-6 text-center font-sans">
          <AlertCircle className="w-12 h-12 text-[#D96C8A] mb-3" />
          <h2 className="text-xl font-bold text-[#2D2D32]">Employee Access Required</h2>
          <p className="text-sm text-[#6B6B73] max-w-sm mt-1 mb-6">Please log in as an employee or use Demo Employee Login to view this section.</p>
          <Button onClick={() => navigate('/login?type=employee')}>Go to Employee Login</Button>
        </div>
      );
    }
    let content = <GenericDashboard role="EMPLOYEE" />;
    if (currentPath === '/employee/schedule') content = <EmployeeSchedule />;
    if (currentPath === '/employee/apply-leave') content = <EmployeeApplyLeave />;
    if (currentPath === '/employee/my-requests') content = <EmployeeMyRequests />;
    if (currentPath === '/employee/calendar') content = <DynamicCalendar viewRole="EMPLOYEE" />;
    if (currentPath === '/employee/announcements') content = <EmployeeAnnouncements />;
    if (currentPath === '/employee/profile') content = <ProfilePageWrapper />;
    return <AppLayout navItems={EMPLOYEE_NAV}>{content}</AppLayout>;
  }

  return <LandingPage />;
};

export default function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const navigate = (p: string) => { setCurrentPath(p); window.scrollTo(0, 0); };
  
  return (
    <DemoProvider>
      <AuthProvider>
        <RouterContext.Provider value={{ currentPath, navigate }}>
          <AppRoutes />
        </RouterContext.Provider>
      </AuthProvider>
    </DemoProvider>
  );
}
