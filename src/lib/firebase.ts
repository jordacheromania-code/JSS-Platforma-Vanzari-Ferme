import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log("Firebase App initialized for project:", firebaseConfig.projectId);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'farmer';
  farmName?: string;
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  farmerId: string;
  farmName: string;
  type: string;
  quantity: number; // Weekly quantity
  pricePerKg: number; // Min price
  deliveryFrequency: 'zilnic' | 'saptamanal' | 'la comanda';
  minOrderQuantity: number;
  packagingType: 'vrac' | 'portionat' | 'vidat' | 'altceva';
  shelfLife: string;
  certification: 'bio' | 'traditional' | 'fara';
  deliveryTerms?: string;
  paymentTerms?: string;
  paymentReceived?: boolean;
  partnerStoreId?: string;
  createdAt: Timestamp;
}

export interface PartnerStore {
  id: string;
  name: string;
  type: 'carmangerie' | 'lactate' | 'mixt';
  website?: string;
  cui?: string;
  regCom?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  addedByFarmerId?: string; // Track who added it
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  productName: string;
  quantity: number;
  pricePerKg: number;
  totalAmount: number;
  deliveryDate: Timestamp;
  paymentMethod: 'cash' | 'termen';
  dueDate?: Timestamp;
  paid: boolean;
  observations?: string;
  storeId: string;
  farmerId: string;
  farmName: string;
  createdAt: Timestamp;
}

export interface PotentialPartner {
  id: string;
  name: string;
  type: 'carmangerie' | 'lactate' | 'mixt';
  website: string;
  city: string;
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Helper to handle Firestore error formatting
export const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
  const authUser = auth.currentUser;
  const errorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo: authUser ? {
      userId: authUser.uid,
      email: authUser.email || '',
      emailVerified: authUser.emailVerified,
      isAnonymous: authUser.isAnonymous,
      providerInfo: authUser.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    } : null
  };
  console.error("Firestore Error:", JSON.stringify(errorInfo, null, 2));
  throw error;
};
