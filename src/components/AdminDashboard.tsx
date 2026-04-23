import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Package, Store, Plus, Search, Trash2, CheckCircle, Clock, ExternalLink, LogOut, LayoutDashboard, MapPin, MessageSquare, ClipboardPaste, Star, Phone, Calendar, AlertTriangle } from 'lucide-react';
import { db, logout, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';

import { POTENTIAL_PARTNERS } from '../constants/potentialPartners';
import MessagingSystem from './MessagingSystem';

export default function AdminDashboard({ user }: { user: any }) {
  const [activeView, setActiveView] = useState<'overview' | 'partners' | 'potential' | 'farms' | 'messages' | 'opportunities' | 'team'>('overview');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [partnerStores, setPartnerStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [potentialStores, setPotentialStores] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Form State for new Partner Store
  const [newStore, setNewStore] = useState({
    name: '',
    type: 'mixt' as const,
    website: '',
    cui: '',
    regCom: '',
    address: '',
    phone: '',
  });

  // Form State for new Potential Partner
  const [isAddingPotential, setIsAddingPotential] = useState(false);
  const [newPotential, setNewPotential] = useState({
    name: '',
    type: 'mixt' as const,
    website: '',
    city: 'Bucuresti'
  });

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'products'));

    const unsubPartners = onSnapshot(collection(db, 'partnerStores'), (snapshot) => {
      setPartnerStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPotential = onSnapshot(collection(db, 'potentialPartners'), (snapshot) => {
      const stores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPotentialStores(stores);
    });

    const unsubFarmers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'farmer')), (snapshot) => {
      setFarmers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOpps = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      setOpportunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubActivities = onSnapshot(collection(db, 'teamActivities'), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubPartners();
      unsubPotential();
      unsubFarmers();
      unsubOrders();
      unsubOpps();
      unsubActivities();
    };
  }, []);

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    let addedCount = 0;

    for (const line of lines) {
      // Try to find a URL in the line
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
      const url = urlMatch ? urlMatch[0] : '';
      const name = line.replace(url, '').replace(/[-:]/g, ' ').trim();

      if (name) {
        try {
          await addDoc(collection(db, 'potentialPartners'), {
            name,
            website: url || '#',
            type: 'mixt',
            city: 'București',
            createdAt: serverTimestamp()
          });
          addedCount++;
        } catch (err) {
          console.error(err);
        }
      }
    }

    alert(`Am adăugat ${addedCount} oportunități noi.`);
    setBulkText('');
    setIsBulkAdding(false);
  };

  const handleTogglePayment = async (productId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', productId), { paymentReceived: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOrderPayment = async (orderId: string, currentPaid: boolean) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { paid: !currentPaid });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'partnerStores'), newStore);
      setIsAddingStore(false);
      setNewStore({ name: '', type: 'mixt', website: '', cui: '', regCom: '', address: '', phone: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPotential = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'potentialPartners'), newPotential);
      setIsAddingPotential(false);
      setNewPotential({ name: '', type: 'mixt', website: '', city: 'Bucuresti' });
    } catch (err) {
      console.error(err);
    }
  };

  const seedPotentialPartners = async () => {
    for (const partner of POTENTIAL_PARTNERS) {
      try {
        await addDoc(collection(db, 'potentialPartners'), partner);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredProducts = allProducts.filter(p => 
    p.farmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-jss-beige text-jss-text font-sans">
      {/* Header */}
      <header className="border-b border-jss-green-dark/20 px-4 py-4 lg:px-6 flex items-center justify-between bg-white sticky top-0 z-40">
        <div className="flex items-center gap-3 lg:gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 text-jss-green-primary"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="bg-jss-green-dark text-jss-green-light p-1.5 lg:p-2 rounded">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm lg:text-base text-jss-green-primary truncate max-w-[120px] lg:max-w-none">JSS Admin Panel</h1>
            <p className="text-[8px] lg:text-[10px] uppercase font-bold opacity-40">System Operator</p>
          </div>
        </div>
        <button onClick={() => logout()} className="text-[10px] lg:text-xs uppercase font-bold px-3 py-1.5 lg:px-4 lg:py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-2">
          <LogOut size={14} /> <span className="hidden sm:inline">Ieșire</span>
        </button>
      </header>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-jss-green-dark/60 backdrop-blur-sm z-30 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar Navigation */}
        <aside className={`fixed lg:static inset-y-0 left-0 w-64 border-r border-jss-green-dark/10 p-6 space-y-8 bg-jss-beige-warm z-40 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="space-y-4">
            {[
              { id: 'overview', icon: Package, label: 'Produse & Analiză' },
              { id: 'farms', icon: CheckCircle, label: 'Ferme Partenere' },
              { id: 'partners', icon: Store, label: 'Magazine Active' },
              { id: 'opportunities', icon: MapPin, label: 'Conductă Vânzări' },
              { id: 'team', icon: Users, label: 'Activitate Echipă' },
              { id: 'messages', icon: MessageSquare, label: 'Mesagerie' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => { setActiveView(btn.id as any); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 font-bold text-xs uppercase px-4 py-3 rounded-lg transition-all ${activeView === btn.id ? 'bg-jss-green-dark text-white shadow-lg' : 'text-jss-muted hover:bg-white/50'}`}
              >
                <btn.icon size={16} />
                {btn.label}
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-jss-green-dark/10 space-y-4">
            <p className="data-tag">Status Sistem</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-jss-green-light rounded-full" />
                <span className="text-[10px] font-bold opacity-60">Servicii Online</span>
              </div>
              <div className="text-[10px] space-y-1 opacity-40 font-mono">
                <p>v1.0.4 - Enterprise</p>
                <p>Region: EU-Buc</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-full">
          {/* Mobile Quick Navigation */}
          <nav className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
            {[
              { id: 'overview', icon: Package, label: 'Produse' },
              { id: 'farms', icon: CheckCircle, label: 'Ferme' },
              { id: 'partners', icon: Store, label: 'Magazine' },
              { id: 'opportunities', icon: MapPin, label: 'Lead-uri' },
              { id: 'team', icon: Users, label: 'Echipă' },
              { id: 'messages', icon: MessageSquare, label: 'Mesaje' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setActiveView(btn.id as any)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${activeView === btn.id ? 'bg-jss-green-dark text-white border-jss-green-dark shadow-lg' : 'bg-white text-jss-muted border-slate-200'}`}
              >
                <btn.icon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{btn.label}</span>
              </button>
            ))}
          </nav>

          {activeView === 'overview' && (
            <div className="space-y-6 lg:space-y-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
                <div>
                  <p className="data-tag">Vizualizare Date</p>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-jss-green-dark">Produse din Ferme</h2>
                </div>
                <div className="relative w-full lg:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input 
                    type="text" 
                    placeholder="Filtrăre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-xs pl-8 pr-4 py-2 outline-none focus:ring-2 focus:ring-jss-green-light/50 transition-all w-full"
                  />
                </div>
              </div>

              {/* Data Table / Mobile Cards */}
              <div className="space-y-4">
                <div className="lg:hidden space-y-4">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-jss-green-dark">{p.farmName || '---'}</h3>
                          <p className="text-[10px] opacity-60 italic">{p.type} ({p.certification})</p>
                        </div>
                        <button 
                          onClick={() => handleTogglePayment(p.id, p.paymentReceived)}
                          className={`text-[9px] font-bold px-3 py-1.5 rounded-full transition-all ${p.paymentReceived ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {p.paymentReceived ? 'APROBAT' : 'ÎN AȘTEPTARE'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cantitate</p>
                          <p className="text-xs font-mono font-bold">{p.quantity} KG</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Preț Min.</p>
                          <p className="text-xs font-bold">{p.pricePerKg} RON</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Livrare</p>
                          <p className="text-xs capitalize">{p.deliveryFrequency}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Magazin</p>
                          <p className="text-xs truncate">{partnerStores.find(s => s.id === p.partnerStoreId)?.name || '---'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fermă / Produs</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant. Săpt.</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Preț Min.</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Livrare</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Magazin</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-sm text-jss-green-dark">{p.farmName || '---'}</p>
                            <p className="text-[10px] opacity-60 italic">{p.type} ({p.certification})</p>
                          </td>
                          <td className="p-4 text-sm font-mono">{p.quantity} KG</td>
                          <td className="p-4 text-sm font-bold">{p.pricePerKg} RON</td>
                          <td className="p-4 text-[10px] capitalize">{p.deliveryFrequency}</td>
                          <td className="p-4 text-xs">
                            {partnerStores.find(s => s.id === p.partnerStoreId)?.name || <span className="opacity-30">---</span>}
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleTogglePayment(p.id, p.paymentReceived)}
                                  className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${p.paymentReceived ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                                >
                                  {p.paymentReceived ? 'APROBAT' : 'ÎN AȘTEPTARE'}
                                </button>
                                
                                <button 
                                  onClick={() => {
                                    const labels = p.manualLabels || [];
                                    const isTop = labels.includes('Top Vânzări');
                                    const newLabels = isTop ? labels.filter(l => l !== 'Top Vânzări') : [...labels, 'Top Vânzări'];
                                    updateDoc(doc(db, 'products', p.id), { manualLabels: newLabels });
                                  }}
                                  className={`p-1.5 rounded bg-jss-beige text-jss-green-primary hover:bg-jss-green-primary/10 ${p.manualLabels?.includes('Top Vânzări') ? 'ring-2 ring-jss-green-primary' : ''}`}
                                  title="Marchează Top Vânzări"
                                >
                                  <Star size={14} fill={p.manualLabels?.includes('Top Vânzări') ? 'currentColor' : 'none'} />
                                </button>

                                <button 
                                  onClick={() => updateDoc(doc(db, 'products', p.id), { stockAlert: !p.stockAlert })}
                                  className={`p-1.5 rounded ${p.stockAlert ? 'bg-red-100 text-red-600' : 'bg-jss-beige text-jss-muted'} hover:bg-red-50`}
                                  title="Alertă Stoc Forțată"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredProducts.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-serif italic text-sm">Nicio înregistrare găsită.</div>
                )}
              </div>
            </div>
          )}

          {activeView === 'farms' && (
            <div className="space-y-6 lg:space-y-8">
              <div>
                <p className="data-tag">Portofoliu JSS</p>
                <h2 className="text-2xl lg:text-3xl font-serif font-bold text-jss-green-dark">Ferme Partenere</h2>
              </div>

              <div className="space-y-6">
                {farmers.map((farmer) => {
                  const farmerProducts = allProducts.filter(p => p.farmerId === farmer.uid);
                  return (
                    <div key={farmer.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                      <div className="bg-jss-green-dark p-4 lg:p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-lg lg:text-xl font-serif font-bold">{farmer.farmName || 'Farmă fără nume'}</h3>
                          <p className="text-[10px] lg:text-xs opacity-60">Admin: {farmer.displayName} ({farmer.email})</p>
                        </div>
                        <div className="bg-jss-green-light/20 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg">
                          <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{farmerProducts.length} Produse</span>
                        </div>
                      </div>
                      
                      {farmerProducts.length > 0 ? (
                        <div className="p-0 overflow-x-auto border-b border-slate-100">
                          <table className="w-full text-left min-w-[700px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                              <tr>
                                <th className="p-4">Produs / Cert.</th>
                                <th className="p-4">Cant. Săpt.</th>
                                <th className="p-4">Preț Min.</th>
                                <th className="p-4">Livrare</th>
                                <th className="p-4">Comandă Min</th>
                                <th className="p-4">Ambalare / Valab.</th>
                                <th className="p-4 text-right">Status Plată</th>
                              </tr>
                            </thead>
                            <tbody>
                              {farmerProducts.map((p) => (
                                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-xs">
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      <div className="font-bold text-jss-green-primary">{p.type}</div>
                                      {p.isTopSelection && <Star size={12} className="fill-amber-400 text-amber-400" />}
                                      {p.forceAlert && <AlertTriangle size={12} className="text-red-500" />}
                                    </div>
                                    <div className="text-[9px] uppercase font-bold text-slate-400">{p.certification}</div>
                                    <div className="flex gap-1 mt-1">
                                      <button 
                                        onClick={() => updateDoc(doc(db, 'products', p.id), { isTopSelection: !p.isTopSelection })}
                                        className={`p-1 rounded ${p.isTopSelection ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
                                        title="Top Vânzări"
                                      >
                                        <Star size={10} />
                                      </button>
                                      <button 
                                        onClick={() => updateDoc(doc(db, 'products', p.id), { forceAlert: !p.forceAlert })}
                                        className={`p-1 rounded ${p.forceAlert ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}
                                        title="Alertă Stoc Forțată"
                                      >
                                        <AlertTriangle size={10} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono font-bold">{p.quantity} KG/L</td>
                                  <td className="p-4 font-bold">{p.pricePerKg} RON</td>
                                  <td className="p-4 capitalize">{p.deliveryFrequency}</td>
                                  <td className="p-4 font-mono">{p.minOrderQuantity} KG</td>
                                  <td className="p-4">
                                    <div className="capitalize">{p.packagingType}</div>
                                    <div className="text-[9px] opacity-60">{p.shelfLife}</div>
                                  </td>
                                  <td className="p-4 text-right">
                                    <button 
                                      onClick={() => handleTogglePayment(p.id, p.paymentReceived)}
                                      className={`text-[9px] font-bold px-2 py-1 rounded ${p.paymentReceived ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                                    >
                                      {p.paymentReceived ? 'APROBAT' : 'ÎN AȘTEPTARE'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic text-sm border-b border-slate-100">
                          Această fermă nu are încă produse listate.
                        </div>
                      )}

                      {/* Sales Management Panel */}
                      <div className="p-6 bg-slate-50/50 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                           <BarChart3 size={18} className="text-jss-green-primary" />
                           <h4 className="text-sm font-serif font-bold text-jss-green-dark uppercase tracking-wider">Management Vânzări & Rezultate</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                 <div>
                                   <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recomandare Echipa Vânzări</label>
                                   <textarea 
                                     defaultValue={farmer.salesRecommendation || ''}
                                     onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { salesRecommendation: e.target.value })}
                                     className="w-full text-sm border border-slate-100 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-jss-green-primary outline-none transition-all placeholder:italic"
                                     placeholder="Ex: Produsul X se vinde bine, recomandăm creșterea producției..."
                                     rows={3}
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Top Produse (Manual)</label>
                                   <input 
                                     type="text"
                                     defaultValue={farmer.topProducts?.join(', ') || ''}
                                     onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { topProducts: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                     className="w-full text-sm border border-slate-100 rounded-lg px-3 py-2 bg-slate-50 outline-none focus:bg-white"
                                     placeholder="Produs 1, Produs 2, Produs 3"
                                   />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vânzări Luna (RON)</label>
                                       <input 
                                         type="number"
                                         defaultValue={farmer.manualStats?.totalSales}
                                         onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { 'manualStats.totalSales': Number(e.target.value) })}
                                         className="w-full text-sm font-mono border border-slate-100 rounded-lg px-3 py-2 bg-slate-50"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nr. Comenzi</label>
                                       <input 
                                         type="number"
                                         defaultValue={farmer.manualStats?.ordersCount}
                                         onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { 'manualStats.ordersCount': Number(e.target.value) })}
                                         className="w-full text-sm font-mono border border-slate-100 rounded-lg px-3 py-2 bg-slate-50"
                                       />
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Acțiuni Rapide</p>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button 
                                      onClick={() => {
                                        const note = prompt("Descrie acțiunea (ex: Apel ofertă, Vizită magazin):");
                                        if (note) {
                                          addDoc(collection(db, 'teamActivities'), {
                                            type: note.toLowerCase().includes('apel') ? 'call' : note.toLowerCase().includes('ofert') ? 'offer' : 'visit',
                                            storeName: 'Magazin Client',
                                            agentName: 'Echipa JSS',
                                            notes: note,
                                            farmerId: farmer.uid,
                                            createdAt: serverTimestamp()
                                          });
                                        }
                                      }}
                                      className="flex items-center justify-center gap-2 bg-jss-green-primary/10 text-jss-green-primary py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-jss-green-primary hover:text-white transition-all"
                                    >
                                       <Plus size={14} /> Log Activitate
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const store = prompt("Nume Magazin Oportunitate:");
                                        if (store) {
                                          addDoc(collection(db, 'opportunities'), {
                                            storeName: store,
                                            status: 'Contactat',
                                            estimatedValue: 0,
                                            targetProducts: [],
                                            farmerId: farmer.uid,
                                            lastAction: 'Adăugat din panoul de gestiune fermă',
                                            nextStepDate: serverTimestamp(),
                                            createdAt: serverTimestamp()
                                          });
                                        }
                                      }}
                                      className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                       <Plus size={14} /> Oportunitate Nouă
                                    </button>
                                 </div>
                                 <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">Opp Actie</p>
                                       <input 
                                         type="number"
                                         defaultValue={farmer.manualStats?.oppsCount}
                                         onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { 'manualStats.oppsCount': Number(e.target.value) })}
                                         className="w-full text-center text-xs font-bold border-b border-transparent focus:border-jss-green-primary outline-none"
                                       />
                                    </div>
                                    <div className="text-center">
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">Mag. Cont.</p>
                                       <input 
                                         type="number"
                                         defaultValue={farmer.manualStats?.contactedStores}
                                         onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { 'manualStats.contactedStores': Number(e.target.value) })}
                                         className="w-full text-center text-xs font-bold border-b border-transparent focus:border-jss-green-primary outline-none"
                                       />
                                    </div>
                                    <div className="text-center">
                                       <p className="text-[8px] font-bold text-slate-400 uppercase">Cli. Câșt.</p>
                                       <input 
                                         type="number"
                                         defaultValue={farmer.manualStats?.wonClients}
                                         onBlur={(e) => updateDoc(doc(db, 'users', farmer.uid), { 'manualStats.wonClients': Number(e.target.value) })}
                                         className="w-full text-center text-xs font-bold border-b border-transparent focus:border-jss-green-primary outline-none"
                                       />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {farmers.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-serif italic text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                    Nu există încă fermieri înregistrați în platformă.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'partners' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="data-tag">Parteneriate Active</p>
                  <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Evidență Magazine Partener</h2>
                </div>
                <button 
                  onClick={() => setIsAddingStore(true)}
                  className="bg-jss-green-dark text-white rounded-lg px-6 py-2 shadow-lg font-bold text-xs hover:opacity-90"
                >
                   <Plus size={16} className="inline mr-1" /> Adaugă Magazin
                </button>
              </div>

              <div className="grid gap-8">
                {partnerStores.map((store) => {
                  const storeOrders = orders.filter(o => o.storeId === store.id);
                  const unpaidAmount = storeOrders.filter(o => !o.paid).reduce((sum, o) => sum + o.totalAmount, 0);

                  return (
                    <div key={store.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
                      <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">{store.type}</p>
                          <h3 className="text-xl font-serif font-bold text-jss-green-dark">{store.name}</h3>
                          <div className="flex gap-4 mt-1">
                            {store.cui && <p className="text-[10px] font-mono text-slate-400">CUI: {store.cui}</p>}
                            {store.regCom && <p className="text-[10px] font-mono text-slate-400">RC: {store.regCom}</p>}
                          </div>
                          {store.address && (
                            <p className="text-[10px] text-slate-500 italic mt-1 flex items-center gap-1">
                              <MapPin size={10} /> {store.address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-3">
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Status Relație</p>
                                <select 
                                  value={store.relationshipStatus || 'activ'}
                                  onChange={(e) => updateDoc(doc(db, 'partnerStores', store.id), { relationshipStatus: e.target.value })}
                                  className={`text-[9px] font-bold px-2 py-1 rounded bg-white border border-slate-200 outline-none uppercase cursor-pointer ${
                                    store.relationshipStatus === 'activ' ? 'text-green-600' : 
                                    store.relationshipStatus === 'in negociere' ? 'text-amber-600' : 'text-slate-500'
                                  }`}
                                >
                                  <option value="in negociere">În Negociere</option>
                                  <option value="activ">Activ</option>
                                  <option value="colaborare incheiata">Încheiată</option>
                                </select>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Prioritate</p>
                                <select 
                                  value={store.priority || 'medie'}
                                  onChange={(e) => updateDoc(doc(db, 'partnerStores', store.id), { priority: e.target.value })}
                                  className={`text-[9px] font-bold px-2 py-1 rounded bg-white border border-slate-200 outline-none uppercase cursor-pointer ${
                                    store.priority === 'mare' ? 'text-red-600 font-black' : 'text-slate-500'
                                  }`}
                                >
                                  <option value="mica">Mică</option>
                                  <option value="medie">Medie</option>
                                  <option value="mare">Mare 🔥</option>
                                </select>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total de încasat</p>
                                <p className={`text-lg font-mono font-bold ${unpaidAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                  {unpaidAmount.toLocaleString()} RON
                                </p>
                              </div>
                              <button 
                                onClick={async () => {
                                  if (confirm('Sigur vrei să ștergi acest magazin?')) {
                                    try { await deleteDoc(doc(db, 'partnerStores', store.id)); } catch (err) { console.error(err); }
                                  }
                                }}
                                className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#fcf8f1]/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                            <tr>
                              <th className="p-4">Nr. / Fact. / Fermă</th>
                              <th className="p-4">Produs</th>
                              <th className="p-4">Cant. / Preț</th>
                              <th className="p-4 text-center">Data Livrare</th>
                              <th className="p-4 text-right">Total Factură</th>
                              <th className="p-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {storeOrders.map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">#{o.orderNumber}</span>
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">FACT: {o.invoiceNumber}</span>
                                  </div>
                                  <p className="text-[9px] font-bold text-jss-green-dark uppercase mt-1">Sursă: {o.farmName}</p>
                                </td>
                                <td className="p-4 font-medium">{o.productName}</td>
                                <td className="p-4">
                                  <p className="font-mono">{o.quantity} KG</p>
                                  <p className="text-[9px] opacity-40">{o.pricePerKg} RON/KG</p>
                                </td>
                                <td className="p-4 text-center">
                                  {o.deliveryDate?.toDate().toLocaleDateString('ro-RO')}
                                </td>
                                <td className="p-4 text-right">
                                  <span className="font-mono font-bold text-sm">{o.totalAmount.toLocaleString()} RON</span>
                                </td>
                                <td className="p-4 text-right">
                                  <button 
                                    onClick={() => handleToggleOrderPayment(o.id, o.paid)}
                                    className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${
                                      o.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {o.paid ? 'ACHITAT' : 'RESTANȚ'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {storeOrders.length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-12 text-center text-slate-300 italic text-sm">
                                  Nicio tranzacție înregistrată pentru acest punct de lucru.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {storeOrders.some(o => o.observations) && (
                         <div className="p-4 bg-jss-beige/20 border-t border-slate-100 italic">
                           <p className="text-[9px] font-bold text-slate-300 uppercase mb-2">Note Administrative</p>
                           <div className="space-y-1">
                             {storeOrders.filter(o => o.observations).slice(-3).map(o => (
                               <div key={o.id} className="text-[10px] flex gap-2">
                                 <span className="font-bold text-slate-400 shrink-0">#{o.orderNumber}:</span>
                                 <span className="text-slate-500">"{o.observations}"</span>
                               </div>
                             ))}
                           </div>
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'opportunities' && (
            <div className="space-y-6 lg:space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <p className="data-tag">Lead Management CRM</p>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-jss-green-dark">Conductă Oportunități</h2>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsBulkAdding(true)} 
                    className="flex-1 sm:flex-none bg-jss-beige border border-jss-green-dark/20 text-jss-green-dark rounded-lg px-4 py-2 font-bold text-xs hover:bg-white transition-all shadow-sm"
                  >
                    <Plus size={16} className="inline mr-1" /> Import Lead-uri
                  </button>
                  <button onClick={() => setIsAddingPotential(true)} className="flex-1 sm:flex-none bg-jss-green-dark text-white rounded-lg px-6 py-2 shadow-lg font-bold text-xs hover:opacity-90">
                    <Plus size={16} className="inline mr-1" /> Lead Nou
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(opportunities.length > 0 ? opportunities : []).map((opp) => (
                  <div key={opp.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-jss-green-light transition-all shadow-sm group relative">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        opp.status === 'Castigat' ? 'bg-green-100 text-green-700' : 
                        opp.status === 'Oferta trimisa' ? 'bg-blue-100 text-blue-700' : 
                        opp.status === 'Negociere' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opp.status}
                      </span>
                      <button onClick={async () => {
                        if(confirm('Ștergi această oportunitate?')) {
                          await deleteDoc(doc(db, 'opportunities', opp.id));
                        }
                      }} className="text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold font-serif text-jss-green-dark">{opp.storeName}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{opp.targetProducts.join(', ')}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Valoare Estimatā</p>
                       <p className="text-lg font-mono font-bold text-jss-green-primary">{opp.estimatedValue.toLocaleString()} RON</p>
                    </div>

                    <div className="space-y-1">
                       <p className="text-[9px] text-slate-400 font-bold uppercase">Ultima Acțiune</p>
                       <p className="text-xs italic text-jss-muted line-clamp-2">"{opp.lastAction}"</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                       <div className="flex items-center gap-1.5 opacity-50">
                         <Calendar size={12} />
                         <span className="text-[10px] font-bold">Următorul pas: {opp.nextStepDate?.toDate().toLocaleDateString('ro-RO')}</span>
                       </div>
                       <button className="p-1 px-2 text-[10px] font-bold text-jss-green-dark hover:underline">Detalii</button>
                    </div>
                  </div>
                ))}
              </div>
              {opportunities.length === 0 && (
                <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 italic">
                  Nu există oportunități active în pipeline.
                </div>
              )}
            </div>
          )}

          {activeView === 'team' && (
            <div className="space-y-8">
               <div>
                  <p className="data-tag">Field Activity</p>
                  <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Log-uri Echipă JSS</h2>
               </div>

               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-50">
                    {activities.length > 0 ? activities.sort((a,b) => b.createdAt?.toDate() - a.createdAt?.toDate()).map(act => (
                      <div key={act.id} className="p-6 flex flex-wrap gap-6 items-center hover:bg-slate-50 transition-colors">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                           act.type === 'offer' ? 'bg-blue-50 text-blue-600' : 
                           act.type === 'call' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                         }`}>
                           {act.type === 'offer' ? <Plus size={20} /> : 
                            act.type === 'call' ? <Phone size={20} /> : <Users size={20} />}
                         </div>
                         <div className="flex-1 min-w-[200px]">
                            <p className="text-sm font-bold text-jss-green-dark">{act.storeName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{act.agentName}</span>
                               <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{act.type}</span>
                            </div>
                         </div>
                         <div className="flex-[2] min-w-[300px]">
                            <p className="text-xs text-jss-muted italic border-l-2 border-slate-100 pl-4">"{act.notes || act.result}"</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-mono font-bold text-slate-400">
                               {act.createdAt?.toDate().toLocaleDateString('ro-RO')}
                            </p>
                            <p className="text-[10px] font-bold text-slate-300">
                               {act.createdAt?.toDate().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                    )) : (
                      <div className="p-20 text-center text-slate-300 italic">Nicio activitate înregistrată azi.</div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {activeView === 'messages' && (
            <div className="space-y-6 lg:space-y-8 h-full">
              <div>
                <p className="data-tag">Comunicare Internă</p>
                <h2 className="text-2xl lg:text-3xl font-serif font-bold text-jss-green-dark">Mesagerie JSS</h2>
              </div>
              <MessagingSystem user={user} isAdmin={true} />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingStore || isAddingPotential || isBulkAdding) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingStore(false); setIsAddingPotential(false); setIsBulkAdding(false); }} className="absolute inset-0 bg-jss-green-dark/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 border border-slate-200"
            >
              {isBulkAdding ? (
                <>
                  <h2 className="text-2xl font-serif font-bold mb-2 text-jss-green-primary">Încărcare Listă Oportunități</h2>
                  <p className="text-xs text-slate-500 mb-6 italic">Introdu lista de parteneri (nume și site pe fiecare rând).<br/>Exemplu: Mircea Macelaru - lamirceamacelaru.ro</p>
                  <form onSubmit={handleBulkAdd} className="space-y-4">
                    <div className="relative">
                      <textarea 
                        required
                        placeholder="Nume Magazin 1 - site1.ro&#10;Nume Magazin 2 - site2.com"
                        rows={12}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50 font-mono pr-12"
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            setBulkText(prev => prev ? prev + '\n' + text : text);
                          } catch (err) {
                            alert('Nu am putut accesa clipboard-ul. Te rugăm să folosești Ctrl+V.');
                          }
                        }}
                        className="absolute top-3 right-3 p-2 bg-white border border-slate-200 rounded-lg text-jss-green-primary hover:bg-jss-beige transition-colors shadow-sm"
                        title="Lipește din Clipboard"
                      >
                        <ClipboardPaste size={18} />
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setIsBulkAdding(false)} className="flex-1 text-xs font-bold uppercase py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Anulare</button>
                      <button type="submit" className="flex-1 bg-jss-green-dark text-white text-xs font-bold uppercase py-3 rounded-lg hover:opacity-90 shadow-lg">Încarcă Lista</button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-serif font-bold mb-6 text-jss-green-primary border-b border-slate-100 pb-2">
                    {isAddingStore ? 'Adaugă Magazin Partener' : 'Adaugă Oportunitate București'}
                  </h2>
                  <form onSubmit={isAddingStore ? handleAddStore : handleAddPotential} className="space-y-4">
                    <div className="space-y-1">
                      <label className="data-tag">Nume Magazin</label>
                      <input 
                        required type="text"
                        value={isAddingStore ? newStore.name : newPotential.name}
                        onChange={(e) => isAddingStore ? setNewStore({...newStore, name: e.target.value}) : setNewPotential({...newPotential, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="data-tag">Profil Profile</label>
                      <select 
                        value={isAddingStore ? newStore.type : newPotential.type}
                        onChange={(e) => isAddingStore ? setNewStore({...newStore, type: e.target.value as any}) : setNewPotential({...newPotential, type: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none appearance-none cursor-pointer"
                      >
                        <option value="carmangerie">Carmangerie</option>
                        <option value="lactate">Lactate</option>
                        <option value="mixt">Mixt / General</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="data-tag">Link Website</label>
                      <input 
                        required={isAddingPotential} type="url" placeholder="https://..."
                        value={isAddingStore ? newStore.website : newPotential.website}
                        onChange={(e) => isAddingStore ? setNewStore({...newStore, website: e.target.value}) : setNewPotential({...newPotential, website: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50"
                      />
                    </div>
                    {isAddingStore && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="data-tag">CUI</label>
                            <input 
                              type="text" 
                              value={newStore.cui}
                              onChange={(e) => setNewStore({...newStore, cui: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="data-tag">Reg Com</label>
                            <input 
                              type="text" 
                              value={newStore.regCom}
                              onChange={(e) => setNewStore({...newStore, regCom: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="data-tag">Adresă de Livrare</label>
                          <input 
                            type="text" 
                            value={newStore.address}
                            onChange={(e) => setNewStore({...newStore, address: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-jss-green-light/50"
                          />
                        </div>
                      </>
                    )}
                    <div className="pt-4 flex gap-4">
                      <button type="button" onClick={() => { setIsAddingStore(false); setIsAddingPotential(false); }} className="flex-1 text-xs font-bold uppercase py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Anulare</button>
                      <button type="submit" className="flex-1 bg-jss-green-dark text-white text-xs font-bold uppercase py-3 rounded-lg hover:opacity-90 shadow-lg">Salvează</button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
