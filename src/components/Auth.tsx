import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Tractor, Warehouse } from 'lucide-react';
import { signInWithGoogle, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface LoginProps {
  onAuthComplete: (user: any) => void;
}

export default function Login({ onAuthComplete }: LoginProps) {
  const handleLogin = async (intendedRole: 'admin' | 'farmer') => {
    try {
      const user = await signInWithGoogle();
      if (!user) return;

      // Special case for admin restriction
      const authorizedAdmins = ['jordache.romania@gmail.com', 'jordache.genetics@gmail.com'];
      if (intendedRole === 'admin' && !authorizedAdmins.includes(user.email || '')) {
        alert("Acces Refuzat: Doar administratorul autorizat se poate conecta în această secțiune.");
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New user setup
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: intendedRole,
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, userData);
        onAuthComplete(userData);
      } else {
        const existingData = userDoc.data();
        // Check if role matches intended (except for admin who can be admin)
        if (intendedRole === 'admin' && existingData.role !== 'admin') {
           // Should not happen with the email check but good to have
           console.log("Existing user redirected to admin role based on intended login or email");
        }
        onAuthComplete(existingData);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden font-sans bg-jss-beige text-jss-text">
      {/* Admin Section - Dark Green */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-1/2 h-full bg-jss-green-dark text-white flex flex-col p-12 relative border-r-4 border-jss-green-primary"
      >
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-jss-green-light">JSS</h1>
          <p className="text-jss-muted uppercase tracking-widest text-xs font-semibold mt-2">
            Platforma de Vanzari Produse din Ferme
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-3xl font-serif mb-2">Administrator JSS</h2>
            <p className="text-jss-muted text-sm italic">Gestionare sistem, magazine partener și fluxuri de plată.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
            <p className="text-xs text-jss-muted mb-4 italic text-center">Acces securizat pentru administratorii JSS</p>
            <button
              onClick={() => handleLogin('admin')}
              className="login-btn"
            >
              <LogIn size={20} />
              Conectare Administrator
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 opacity-40 grayscale pointer-events-none">
            <div className="bg-white/5 p-3 rounded">
              <div className="data-tag text-white/60">Module</div>
              <div className="text-xs">Nume Ferma / Produse</div>
            </div>
            <div className="bg-white/5 p-3 rounded">
              <div className="data-tag text-white/60">Parteneri</div>
              <div className="text-xs">Magazin / Cantitati</div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-jss-green-primary mt-auto flex justify-between">
          <span>© 2024 JSS Romania</span>
          <span>v1.0.4 - Enterprise</span>
        </div>
      </motion.div>

      {/* Farmer Section - Warm Beige */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-1/2 h-full flex flex-col p-12 relative"
      >
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-3xl font-serif mb-2 text-jss-green-primary">Fermier</h2>
            <p className="text-slate-500 text-sm">Gestionează-ți stocurile, prețurile și urmărește încasările din magazine.</p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
            <p className="text-xs text-slate-400 mb-4">Intră în platformă pentru a actualiza oferta de produse.</p>
            <button
              onClick={() => handleLogin('farmer')}
              className="login-btn"
            >
              <LogIn size={20} />
              Conectare Fermier
            </button>
          </div>

          <div className="space-y-4 opacity-50 grayscale pointer-events-none">
            <div className="border-l-2 border-jss-green-light pl-3">
              <div className="data-tag">Magazin Potential</div>
              <div className="text-sm font-medium">Carmangerii & Lactate București</div>
              <div className="text-[10px] text-slate-400">Lista magazine specializate</div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-white p-3 rounded border border-slate-100">
                <div className="data-tag italic">Categorii</div>
                <div className="text-[10px] flex gap-1"><span>Tip</span>•<span>Kg</span>•<span>Pret</span></div>
              </div>
              <div className="flex-1 bg-white p-3 rounded border border-slate-100">
                <div className="data-tag italic">Financiar</div>
                <div className="text-[10px] flex gap-1"><span>Plata</span>•<span>Incasat</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex justify-between items-center text-[11px] text-slate-400 font-medium">
          <div className="flex gap-4">
            <span>Termeni și Condiții</span>
            <span>Asistență Fermieri</span>
          </div>
          <div className="w-2 h-2 bg-jss-green-light rounded-full"></div>
        </div>
      </motion.div>
    </div>
  );
}
