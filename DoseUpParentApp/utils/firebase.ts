import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  ConfirmationResult,
  ApplicationVerifier,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Type definitions
export interface ParentData {
  parentId: string;
  phoneNumber: string;
  adminId: string;
  name?: string;
}

export interface Medicine {
  id: string;
  name: string;
  parentId: string;
  doseTimes: string[];
  reminderInterval?: number;
  lastTakenAt?: string;
  dosage?: string;
  notes?: string;
}

export interface DoseHistory {
  takenAt: string;
  medicineId: string;
}

// Store confirmation result for OTP verification
let confirmationResult: ConfirmationResult | null = null;

/**
 * Send OTP to phone number
 * Note: For Expo Go, you'll need to use a custom recaptcha solution
 * or test with Firebase Auth Emulator
 */
export const sendOTP = async (
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<ConfirmationResult> => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (code: string): Promise<any> => {
  try {
    if (!confirmationResult) {
      throw new Error('No confirmation result found. Please request OTP first.');
    }
    const result = await confirmationResult.confirm(code);
    return result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Sign out user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    confirmationResult = null;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Find parent by phone number across all admin users
 */
export const findParentByPhone = async (phoneNumber: string): Promise<ParentData | null> => {
  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // Get all users (admins)
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    for (const userDoc of usersSnapshot.docs) {
      const adminId = userDoc.id;
      const parentsRef = collection(db, 'users', adminId, 'parents');
      
      // Query for parent with matching phone number
      const q = query(parentsRef, where('phoneNumber', '==', phoneNumber));
      const parentsSnapshot = await getDocs(q);
      
      if (!parentsSnapshot.empty) {
        const parentDoc = parentsSnapshot.docs[0];
        return {
          parentId: parentDoc.id,
          phoneNumber: parentDoc.data().phoneNumber,
          adminId: adminId,
          name: parentDoc.data().name,
        };
      }
      
      // Also try with formatted phone
      const q2 = query(parentsRef, where('phoneNumber', '==', formattedPhone));
      const parentsSnapshot2 = await getDocs(q2);
      
      if (!parentsSnapshot2.empty) {
        const parentDoc = parentsSnapshot2.docs[0];
        return {
          parentId: parentDoc.id,
          phoneNumber: parentDoc.data().phoneNumber,
          adminId: adminId,
          name: parentDoc.data().name,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding parent:', error);
    throw error;
  }
};

/**
 * Get medicines for a parent (one-time fetch)
 */
export const getMedicinesForParent = async (
  adminId: string,
  parentId: string
): Promise<Medicine[]> => {
  try {
    const medicinesRef = collection(db, 'users', adminId, 'medicines');
    const q = query(medicinesRef, where('parentId', '==', parentId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Medicine));
  } catch (error) {
    console.error('Error fetching medicines:', error);
    throw error;
  }
};

/**
 * Subscribe to medicines for a parent (real-time updates)
 */
export const subscribeMedicines = (
  adminId: string,
  parentId: string,
  onUpdate: (medicines: Medicine[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const medicinesRef = collection(db, 'users', adminId, 'medicines');
  const q = query(medicinesRef, where('parentId', '==', parentId));
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const medicines: Medicine[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Medicine));
      onUpdate(medicines);
    },
    (error) => {
      console.error('Error in medicines subscription:', error);
      onError(error);
    }
  );
};

/**
 * Mark medicine as taken
 */
export const markMedicineAsTaken = async (
  adminId: string,
  medicineId: string
): Promise<void> => {
  try {
    const medicineRef = doc(db, 'users', adminId, 'medicines', medicineId);
    await updateDoc(medicineRef, {
      lastTakenAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking medicine as taken:', error);
    throw error;
  }
};

/**
 * Get a single medicine by ID
 */
export const getMedicineById = async (
  adminId: string,
  medicineId: string
): Promise<Medicine | null> => {
  try {
    const medicinesRef = collection(db, 'users', adminId, 'medicines');
    const q = query(medicinesRef);
    const snapshot = await getDocs(q);
    
    const medicineDoc = snapshot.docs.find((doc) => doc.id === medicineId);
    
    if (medicineDoc) {
      return {
        id: medicineDoc.id,
        ...medicineDoc.data(),
      } as Medicine;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching medicine:', error);
    throw error;
  }
};

export { app, auth, db };
