import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log("Firebase App initialized for project:", firebaseConfig.projectId);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
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
  additionalInfo?: string;
  // Sales Department fields
  autoLabels?: string[]; // 'se vinde bine', 'miscare lenta', 'necesita promovare', 'stoc mare', 'stoc mic'
  manualLabels?: string[]; // 'produs promovat', 'produs prioritar'
  stockAlert?: string; // 'stoc mic', 'stoc mare', 'risc de nevandut'
  recommendation?: string;
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
  // Sales Department fields
  relationshipStatus?: 'activ' | 'in negociere' | 'inactiv';
  priority?: 'high' | 'medium' | 'low';
  internalNotes?: string;
  lastContactedAt?: Timestamp;
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
  // Sales Department fields
  status: 'noua' | 'confirmata' | 'livrata' | 'finalizata';
}

export interface Opportunity {
  id: string;
  farmerId: string;
  storeName: string;
  storeType: string;
  status: 'Nou' | 'In discutie' | 'Oferta trimisa' | 'Castigat' | 'Pierdut';
  estimatedValue?: number;
  targetProducts: string[];
  lastAction?: string;
  nextStep?: string;
  note?: string;
  internalNotes?: string;
  nextFollowUpDate?: Timestamp;
  createdAt: Timestamp;
}

export interface TeamActivity {
  id: string;
  farmerId: string;
  type: 'call' | 'email' | 'visit' | 'offer' | 'acquisition';
  storeName: string;
  result: string;
  notes: string;
  createdAt: Timestamp;
}

export interface PotentialPartner {
  id: string;
  name: string;
  type: 'carmangerie' | 'lactate' | 'mixt';
  website: string;
  city: string;
}

export interface AppMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'farmer';
  receiverId: string; // 'admin' or farmer uid
  subject: string;
  body: string;
  attachments: {
    name: string;
    url: string;
    type: string;
  }[];
  createdAt: Timestamp;
  read: boolean;
}

export const signInWithGoogle = async () => {
  try {
    // For mobile devices, especially in-app browsers, use redirect
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const getGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Error getting redirect result:", error);
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
