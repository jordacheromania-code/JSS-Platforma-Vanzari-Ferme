import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Package, Store, Plus, Search, Trash2, CheckCircle, Clock, ExternalLink, LogOut, LayoutDashboard, MapPin, MessageSquare } from 'lucide-react';
import { db, logout, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';

import { POTENTIAL_PARTNERS } from '../constants/potentialPartners';
import MessagingSystem from './MessagingSystem';

export default function AdminDashboard({ user }: { user: any }) {
  const [activeView, setActiveView] = useState<'overview' | 'partners' | 'potential' | 'farms' | 'messages'>('overview');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [partnerStores, setPartnerStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [potentialStores, setPotentialStores] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      // Auto-seed if empty and we are looking at the potential view
      if (stores.length === 0 && activeView === 'potential') {
        seedPotentialPartners();
      }
    });

    const unsubFarmers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'farmer')), (snapshot) => {
      setFarmers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubPartners();
      unsubPotential();
      unsubFarmers();
      unsubOrders();
    };
  }, [activeView]);

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
      <header className="border-b border-jss-green-dark/20 px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-jss-green-dark text-jss-green-light p-2 rounded">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-jss-green-primary">JSS Admin Panel</h1>
            <p className="text-[10px] uppercase font-bold opacity-40">System Operator</p>
          </div>
        </div>
        <button onClick={() => logout()} className="text-xs uppercase font-bold px-4 py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-2">
          <LogOut size={14} /> Ieșire
        </button>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-jss-green-dark/10 min-h-[calc(100vh-73px)] p-6 space-y-8 bg-jss-beige-warm">
          <nav className="space-y-4">
            {[
              { id: 'overview', icon: Package, label: 'Centralizator' },
              { id: 'farms', icon: CheckCircle, label: 'Ferme Partenere' },
              { id: 'partners', icon: Store, label: 'Parteneri' },
              { id: 'potential', icon: Users, label: 'Oportunități' },
              { id: 'messages', icon: MessageSquare, label: 'Trimite Mesaj către Fermă' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setActiveView(btn.id as any)}
                className={`w-full flex items-center gap-3 font-bold text-xs uppercase px-4 py-3 rounded-lg transition-all ${activeView === btn.id ? 'bg-jss-green-dark text-white' : 'text-jss-muted hover:bg-white/50'}`}
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
        <main className="flex-1 p-8 overflow-y-auto">
          {activeView === 'overview' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="data-tag">Vizualizare Date</p>
                  <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Produse din Ferme</h2>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input 
                    type="text" 
                    placeholder="Filtrăre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-xs pl-8 pr-4 py-2 outline-none focus:ring-2 focus:ring-jss-green-light/50 transition-all w-64"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <td className="p-4">
                          <button 
                            onClick={() => handleTogglePayment(p.id, p.paymentReceived)}
                            className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${p.paymentReceived ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {p.paymentReceived ? 'PLĂTIT' : 'ÎN AȘTEPTARE'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-serif italic text-sm">Nicio înregistrare găsită.</div>
                )}
              </div>
            </div>
          )}

          {activeView === 'farms' && (
            <div className="space-y-8">
              <div>
                <p className="data-tag">Portofoliu JSS</p>
                <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Ferme Partenere</h2>
              </div>

              <div className="space-y-6">
                {farmers.map((farmer) => {
                  const farmerProducts = allProducts.filter(p => p.farmerId === farmer.uid);
                  return (
                    <div key={farmer.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                      <div className="bg-jss-green-dark p-6 text-white flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-serif font-bold">{farmer.farmName || 'Farmă fără nume'}</h3>
                          <p className="text-xs opacity-60">Admin: {farmer.displayName} ({farmer.email})</p>
                        </div>
                        <div className="bg-jss-green-light/20 px-4 py-2 rounded-lg">
                          <span className="text-xs font-bold uppercase tracking-widest">{farmerProducts.length} Produse</span>
                        </div>
                      </div>
                      
                      {farmerProducts.length > 0 ? (
                        <div className="p-0">
                          <table className="w-full text-left">
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
                                    <div className="font-bold text-jss-green-primary">{p.type}</div>
                                    <div className="text-[9px] uppercase font-bold text-slate-400">{p.certification}</div>
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
                                      {p.paymentReceived ? 'PLĂTIT' : 'ÎN AȘTEPTARE'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-12 text-center text-slate-400 italic text-sm">
                          Această fermă nu are încă produse listate.
                        </div>
                      )}
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
                        <div className="flex items-center gap-8">
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

          {activeView === 'potential' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="data-tag">Oportunități Market</p>
                  <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Magazine București</h2>
                </div>
                <div className="flex gap-3">
                  {potentialStores.length === 0 && (
                    <button onClick={seedPotentialPartners} className="text-xs font-bold border border-slate-200 rounded-lg px-4 py-2 hover:bg-amber-50">
                      Importă Exemple
                    </button>
                  )}
                  <button onClick={() => setIsAddingPotential(true)} className="bg-jss-green-dark text-white rounded-lg px-6 py-2 shadow-lg font-bold text-xs hover:opacity-90">
                    <Plus size={16} className="inline mr-1" /> Adaugă
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {(potentialStores.length > 0 ? potentialStores : POTENTIAL_PARTNERS.map((p, i) => ({ ...p, id: `def-${i}` }))).map((store) => (
                  <div key={store.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="data-tag !mb-0">{store.type}</span>
                      {!store.id.toString().startsWith('def-') && (
                        <button onClick={() => deleteDoc(doc(db, 'potentialPartners', store.id))} className="text-red-300 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <h3 className="text-xl font-bold font-serif text-jss-green-dark">{store.name}</h3>
                    <div className="flex items-center gap-2 opacity-50">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold uppercase">{store.city}</span>
                    </div>
                    <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-xs text-jss-green-primary flex items-center gap-1 hover:underline">
                      Site Web <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'messages' && (
            <div className="space-y-8 h-full">
              <div>
                <p className="data-tag">Comunicare Internă</p>
                <h2 className="text-3xl font-serif font-bold text-jss-green-dark">Mesagerie JSS</h2>
              </div>
              <MessagingSystem user={user} isAdmin={true} />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingStore || isAddingPotential) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingStore(false); setIsAddingPotential(false); }} className="absolute inset-0 bg-jss-green-dark/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200"
            >
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
                  <button type="button" onClick={() => { setIsAddingStore(false); setIsAddingPotential(false); }} className="flex-1 text-xs font-bold uppercase py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Anulări</button>
                  <button type="submit" className="flex-1 bg-jss-green-dark text-white text-xs font-bold uppercase py-3 rounded-lg hover:opacity-90 shadow-lg">Salvează</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
