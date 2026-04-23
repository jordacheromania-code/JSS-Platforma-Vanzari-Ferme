import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Tractor, Warehouse } from 'lucide-react';
import { signInWithGoogle, getGoogleRedirectResult, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface LoginProps {
  onAuthComplete: (user: any) => void;
}

export default function Login({ onAuthComplete }: LoginProps) {
  const [isLoggingIn, setIsLoggingIn] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        console.log("Checking for redirect result...");
        const user = await getGoogleRedirectResult();
        if (user) {
          console.log("Redirect user found:", user.email);
          let storedRole = localStorage.getItem('intendedRole');
          
          // If localStorage was cleared or is blocked in iframe, try to guess or use a default
          if (!storedRole) {
            console.warn("intendedRole not found in localStorage, defaulting to farmer");
            storedRole = 'farmer';
          }
          
          await finalizeLogin(user, storedRole as 'admin' | 'farmer');
          localStorage.removeItem('intendedRole');
        } else {
          console.log("No redirect user found.");
        }
      } catch (error: any) {
        console.error("Redirect login check failed:", error);
        if (error.code === 'auth/unauthorized-domain') {
          alert("Eroare domain neautorizat. Contactați administratorul pentru a adăuga acest domeniu în Firebase Console.");
        }
      }
    };
    // Give a small delay for Firebase auth to be ready
    const timeout = setTimeout(() => {
      checkRedirectResult();
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  const finalizeLogin = async (user: any, intendedRole: 'admin' | 'farmer') => {
    setIsLoggingIn(intendedRole);
    try {
      // Special case for admin restriction
      const adminEmail = 'jordache.romania@gmail.com';
      if (intendedRole === 'admin' && user.email !== adminEmail) {
        setIsLoggingIn(null);
        alert(`Acces Refuzat: Doar adresa de email ${adminEmail} are privilegii de administrator.`);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      let userData: any;
      if (!userDoc.exists()) {
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: intendedRole,
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, userData);
      } else {
        userData = userDoc.data();
      }
      
      onAuthComplete(userData);
    } catch (error: any) {
      console.error("Login finalization failed:", error);
      alert(`Eroare la finalizarea conectării: ${error.message}`);
    } finally {
      setIsLoggingIn(null);
    }
  };

  const handleLogin = async (intendedRole: 'admin' | 'farmer') => {
    setIsLoggingIn(intendedRole);
    try {
      console.log(`Starting login for ${intendedRole}...`);
      localStorage.setItem('intendedRole', intendedRole);
      const user = await signInWithGoogle();
      if (!user) return;
      await finalizeLogin(user, intendedRole);
    } catch (error: any) {
      console.error("Login failed:", error);
      let message = `Eroare la conectare: ${error.message || 'Eroare necunoscută'}`;
      if (error.code === 'auth/popup-blocked') {
        message = "Pop-up-ul a fost blocat de browser. Te rugăm să permiți ferestrele de tip pop-up pentru acest site sau să încerci să deschizi aplicația într-un browser standard (Chrome/Safari).";
      }
      alert(message);
    } finally {
      setIsLoggingIn(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-y-auto font-sans bg-jss-beige text-jss-text">
      {/* Admin Section - Dark Green */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full md:w-1/2 min-h-[50vh] md:h-full bg-jss-green-dark text-white flex flex-col p-8 md:p-12 relative border-b-4 md:border-b-0 md:border-r-4 border-jss-green-primary"
      >
        <div className="mb-8 md:mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-jss-green-light">JSS</h1>
          <p className="text-jss-muted uppercase tracking-widest text-xs font-semibold mt-2">
            Departamentul de Vânzări
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="mb-8 border-l-4 border-jss-green-light pl-6">
            <h2 className="text-3xl font-serif mb-2">Administrator</h2>
            <p className="text-jss-green-light font-bold text-lg">Secțiune dedicată Departamentului de Vânzări JSS</p>
            <p className="text-jss-muted text-sm mt-4 italic opacity-80">Acces securizat pentru gestionarea ecosistemului de parteneriate și fluxuri comerciale.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-8 text-center shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => handleLogin('admin')}
              disabled={!!isLoggingIn}
              className={`login-btn w-full justify-center !py-4 shadow-xl active:scale-95 transition-all ${isLoggingIn === 'admin' ? 'opacity-50 cursor-wait' : 'hover:bg-jss-green-light hover:text-jss-green-dark'}`}
            >
              {isLoggingIn === 'admin' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-jss-green-light border-t-transparent rounded-full animate-spin"></div>
                  Conectare...
                </div>
              ) : (
                <>
                  <LogIn size={20} />
                  Conectare
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-[10px] text-jss-green-primary mt-auto flex justify-between uppercase tracking-tighter font-bold opacity-60">
          <span>© 2024 JSS Romania - Logistică & Distribuție</span>
          <span>v1.0.4 - Enterprise Edition</span>
        </div>
      </motion.div>

      {/* Farmer Section - Warm Beige */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full md:w-1/2 min-h-[50vh] md:h-full flex flex-col p-8 md:p-12 relative bg-white"
      >
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-jss-green-primary text-white p-2 rounded-lg">
                <Tractor size={24} />
              </div>
              <h2 className="text-3xl font-serif font-bold text-jss-green-primary">Portal Fermier</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-jss-muted mb-3 italic">Ce înseamnă Departamentul de Vânzări JSS pentru tine?</p>
                <p className="text-jss-text text-[15px] leading-relaxed border-l-2 border-jss-green-light pl-4 py-1">
                  Suntem partenerul tău strategic care se ocupă de tot ce ține de piață: identificăm magazinele potrivite, negociem prețurile corecte și asigurăm un flux constant de comenzi, astfel încât tu să te poți concentra pe ceea ce știi mai bine – producția de calitate.
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-jss-muted mb-3 italic">Beneficiile platformei JSS</p>
                <ul className="grid grid-cols-1 gap-3">
                  {[
                    "Acces direct la o rețea premium de magazine și carmangerii",
                    "Transparență totală asupra livrărilor și statusului plăților",
                    "Gestiune digitală simplificată a stocurilor și ofertelor",
                    "Eliminarea birocrației în relația cu magazinele partenere"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-jss-text">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-jss-green-primary shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-jss-beige/30 border border-jss-green-primary/10 rounded-2xl p-8 mb-8 shadow-sm">
            <button
              onClick={() => handleLogin('farmer')}
              disabled={!!isLoggingIn}
              className={`login-btn w-full justify-center !py-4 shadow-lg active:scale-95 transition-all ${isLoggingIn === 'farmer' ? 'opacity-50 cursor-wait' : 'bg-jss-green-primary hover:bg-jss-green-dark text-white'}`}
            >
              {isLoggingIn === 'farmer' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Conectare...
                </div>
              ) : (
                <>
                  <LogIn size={20} />
                  Conectare
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-jss-muted mt-4 font-medium uppercase tracking-tight">Access securizat bazat pe profilul de producător aprobat</p>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          <div className="flex gap-6">
            <span className="hover:text-jss-green-primary cursor-pointer transition-colors">Termeni de utilizare</span>
            <span className="hover:text-jss-green-primary cursor-pointer transition-colors">Suport Tehnic JSS</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-jss-green-light rounded-full animate-pulse"></div>
             <span>Sistem Activ</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
