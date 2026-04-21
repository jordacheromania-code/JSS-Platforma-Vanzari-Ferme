import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, Store, MapPin, CheckCircle, Clock, Truck, ChevronRight, LogOut, Info, MessageSquare } from 'lucide-react';
import { db, auth, logout, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, setDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';

import { POTENTIAL_PARTNERS } from '../constants/potentialPartners';
import MessagingSystem from './MessagingSystem';

export default function FarmerDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'products' | 'opportunities' | 'partners' | 'ledger' | 'store_orders' | 'messages'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [potentialStores, setPotentialStores] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingOrder, setIsAddingOrder] = useState<string | null>(null); // Store ID
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [showFarmNameInput, setShowFarmNameInput] = useState(!user.farmName);
  const [newFarmName, setNewFarmName] = useState('');

  // Order Form State
  const [orderFormData, setOrderFormData] = useState({
    orderNumber: '',
    invoiceNumber: '',
    productName: '',
    quantity: '',
    pricePerKg: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'termen',
    dueDate: '',
    observations: '',
    paid: false,
  });

  const [storeFormData, setStoreFormData] = useState({
    name: '',
    type: 'mixt' as 'carmangerie' | 'lactate' | 'mixt',
    cui: '',
    regCom: '',
    address: '',
    phone: '',
    website: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    type: '',
    quantity: '',
    pricePerKg: '',
    deliveryFrequency: 'saptamanal',
    minOrderQuantity: '',
    packagingType: 'vrac',
    shelfLife: '',
    certification: 'fara',
    deliveryTerms: '',
    paymentTerms: '',
    partnerStoreId: '',
  });

  useEffect(() => {
    if (!user.uid) return;

    // Fetch Products
    const q = query(collection(db, 'products'), where('farmerId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'products'));

    // Fetch Partner Stores
    const unsubscribeStores = onSnapshot(collection(db, 'partnerStores'), (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Potential Stores
    const unsubscribePotential = onSnapshot(collection(db, 'potentialPartners'), (snapshot) => {
      setPotentialStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Orders
    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), where('farmerId', '==', user.uid)), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeStores();
      unsubscribePotential();
      unsubscribeOrders();
    };
  }, [user.uid]);

  const handleUpdateFarmName = async () => {
    if (!newFarmName.trim()) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { farmName: newFarmName }, { merge: true });
      setShowFarmNameInput(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        quantity: Number(formData.quantity),
        pricePerKg: Number(formData.pricePerKg),
        minOrderQuantity: Number(formData.minOrderQuantity),
        farmerId: user.uid,
        farmName: user.farmName || newFarmName,
        paymentReceived: false,
        createdAt: serverTimestamp(),
      });
      setIsAddingProduct(false);
      setFormData({
        type: '',
        quantity: '',
        pricePerKg: '',
        deliveryFrequency: 'saptamanal',
        minOrderQuantity: '',
        packagingType: 'vrac',
        shelfLife: '',
        certification: 'fara',
        deliveryTerms: '',
        paymentTerms: '',
        partnerStoreId: '',
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'products');
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingOrder) return;
    try {
      const q = Number(orderFormData.quantity);
      const p = Number(orderFormData.pricePerKg);
      await addDoc(collection(db, 'orders'), {
        ...orderFormData,
        quantity: q,
        pricePerKg: p,
        totalAmount: q * p,
        deliveryDate: Timestamp.fromDate(new Date(orderFormData.deliveryDate)),
        dueDate: orderFormData.dueDate ? Timestamp.fromDate(new Date(orderFormData.dueDate)) : null,
        storeId: isAddingOrder,
        farmerId: user.uid,
        farmName: user.farmName || '',
        createdAt: serverTimestamp(),
      });
      setIsAddingOrder(null);
      setOrderFormData({
        orderNumber: '',
        invoiceNumber: '',
        productName: '',
        quantity: '',
        pricePerKg: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        dueDate: '',
        observations: '',
        paid: orderFormData.paymentMethod === 'cash',
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'orders');
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'partnerStores'), {
        ...storeFormData,
        addedByFarmerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAddingStore(false);
      setStoreFormData({
        name: '',
        type: 'mixt',
        cui: '',
        regCom: '',
        address: '',
        phone: '',
        website: '',
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'partnerStores');
    }
  };

  return (
    <div className="min-h-screen bg-jss-beige text-jss-text">
      {/* Header */}
      <header className="bg-white border-b border-jss-green-primary/10 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-jss-green-primary text-white p-2 rounded-lg">
            <Package size={24} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-jss-green-primary">Platformă Fermier</h1>
            <p className="text-xs text-jss-muted">Bun venit, {user.displayName}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-jss-muted text-sm hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Deconectare</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Farm Name Setup */}
        <AnimatePresence>
          {showFarmNameInput && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-jss-green-primary/20 space-y-4"
            >
              <div className="flex items-center gap-3 text-jss-green-primary">
                <Info size={20} />
                <h3 className="font-serif font-bold">Configurează numele fermei</h3>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ex: Ferma Noastră Bio"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  className="flex-1 bg-jss-beige border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-jss-green-primary outline-none"
                />
                <button 
                  onClick={handleUpdateFarmName}
                  className="bg-jss-green-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90"
                >
                  Salvează
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Tab Navigation */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-jss-green-primary/10 w-full overflow-x-auto no-scrollbar">
        <div className="flex min-w-max">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
          >
            Produsele Mele
          </button>
          <button 
            onClick={() => setActiveTab('partners')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'partners' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
          >
            Magazine Partenere
          </button>
          <button 
            onClick={() => setActiveTab('store_orders')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'store_orders' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
          >
            Comenzi Magazine
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
          >
            Registru
          </button>
          <button 
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'opportunities' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
          >
            Oportunități
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'} flex items-center gap-2`}
          >
            <MessageSquare size={16} /> Contact
          </button>
        </div>
      </div>

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Inventar Produse</h2>
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center justify-center gap-2 bg-jss-green-primary text-white px-4 py-3 sm:py-2 rounded-xl hover:opacity-90 shadow-sm font-bold text-sm"
              >
                <Plus size={20} />
                Adaugă Produs
              </button>
            </div>

            {/* Product List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <motion.div 
                  layout
                  key={product.id}
                  className="bg-white p-6 rounded-2xl border border-jss-green-primary/10 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{product.type}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          product.certification === 'bio' ? 'bg-green-600 text-white' : 
                          product.certification === 'traditional' ? 'bg-amber-600 text-white' : 
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {product.certification}
                        </span>
                      </div>
                      <p className="text-sm text-jss-muted">{product.quantity} kg/săpt @ {product.pricePerKg} RON/kg (min)</p>
                    </div>
                    {product.paymentReceived ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle size={12} /> Plătite
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Clock size={12} /> În așteptare
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="data-tag">Livrare</p>
                      <p className="flex items-center gap-1 text-jss-text"><Truck size={14} /> {product.deliveryFrequency}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="data-tag">Comandă Min</p>
                      <p className="text-jss-text">{product.minOrderQuantity} KG</p>
                    </div>
                    <div className="space-y-1">
                      <p className="data-tag">Valabilitate</p>
                      <p className="text-jss-text">{product.shelfLife}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="data-tag">Ambalare</p>
                      <p className="text-jss-text capitalize">{product.packagingType}</p>
                    </div>
                  </div>

                  {product.partnerStoreId && (
                    <div className="pt-4 border-t border-jss-beige flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-jss-muted">
                        <Store size={16} />
                        <span>Magazin Partener:</span>
                      </div>
                      <span className="font-bold">{stores.find(s => s.id === product.partnerStoreId)?.name || 'Încărcare...'}</span>
                    </div>
                  )}
                </motion.div>
              ))}

              {products.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-jss-green-primary/10 text-jss-muted/50 italic">
                  Nu ai adăugat încă niciun produs.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Magazine Partenere Active</h2>
              <div className="flex gap-2">
                <button 
                   onClick={() => setIsAddingStore(true)}
                   className="bg-white text-jss-green-primary border border-jss-green-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-jss-green-primary hover:text-white transition-all"
                >
                  <Plus size={18} /> Adaugă Magazin
                </button>
                <button 
                  onClick={() => setActiveTab('ledger')}
                  className="data-tag px-4 py-2 hover:bg-jss-green-primary hover:text-white transition-all cursor-pointer border border-jss-green-primary/20"
                >
                  Registru Comenzi și Plăți
                </button>
              </div>
            </div>
            
            <div className="grid gap-8 text-jss-text">
              {stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-jss-green-primary/30 p-12 text-center space-y-4">
                  <div className="bg-jss-green-primary/10 p-6 rounded-full text-jss-green-primary">
                    <Store size={48} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-jss-green-primary">Niciun Magazin Partener</h3>
                    <p className="text-sm text-jss-muted max-w-md mx-auto">
                      Pentru a înregistra livrări și a urmări soldul, trebuie mai întâi să adaugi detaliile magazinului partener (Nume, CUI, Adresă).
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsAddingStore(true)}
                    className="bg-jss-green-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    <Plus size={24} /> Configurează Primul Magazin
                  </button>
                </div>
              ) : (
                stores.map((store) => {
                  const storeOrders = orders.filter(o => o.storeId === store.id);
                  const unpaidAmount = storeOrders.filter(o => !o.paid).reduce((sum, o) => sum + o.totalAmount, 0);

                  return (
                    <motion.div 
                      layout
                      key={store.id}
                      className="bg-white rounded-3xl border border-jss-green-primary/10 shadow-lg overflow-hidden"
                    >
                      <div className="bg-jss-green-primary/5 p-6 border-b border-jss-green-primary/10 flex flex-wrap justify-between items-start gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-jss-green-primary text-white p-3 rounded-2xl">
                            <Store size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-serif font-bold text-jss-green-primary leading-tight">{store.name}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              <p className="text-[10px] text-jss-muted uppercase tracking-widest font-bold">{store.type}</p>
                              {store.cui && <p className="text-[10px] text-slate-500 font-mono">CUI: {store.cui}</p>}
                              {store.regCom && <p className="text-[10px] text-slate-500 font-mono">RC: {store.regCom}</p>}
                            </div>
                            {store.address && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600 italic">
                                 <MapPin size={12} /> {store.address}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-jss-muted uppercase">Sold de încasat</p>
                            <p className={`text-lg font-mono font-bold ${unpaidAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {unpaidAmount.toLocaleString()} RON
                            </p>
                          </div>
                          <button 
                            onClick={() => setIsAddingOrder(store.id)}
                            className="bg-jss-green-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-md transition-all active:scale-95"
                          >
                            <Plus size={18} /> Înregistrează Livrare
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                              <th className="p-4">Nr. Comandă / Factură</th>
                              <th className="p-4">Produs</th>
                              <th className="p-4">Cant. / Preț</th>
                              <th className="p-4 text-center">Data Livrării</th>
                              <th className="p-4 text-center">Data Scadență</th>
                              <th className="p-4">Tip Plată</th>
                              <th className="p-4 text-right">Total Factură</th>
                              <th className="p-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {storeOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4">
                                  <p className="text-xs font-bold text-jss-green-primary"># {order.orderNumber}</p>
                                  <p className="text-[10px] text-slate-400">Fact: {order.invoiceNumber}</p>
                                </td>
                                <td className="p-4 text-sm font-medium">{order.productName}</td>
                                <td className="p-4">
                                  <p className="text-xs font-mono">{order.quantity} KG</p>
                                  <p className="text-[9px] text-slate-400">{order.pricePerKg} RON/KG</p>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] text-slate-600 font-medium">
                                    <Clock size={12} />
                                    {order.deliveryDate?.toDate().toLocaleDateString('ro-RO')}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  {order.dueDate && (
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                                      !order.paid && order.dueDate.toDate() < new Date() ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      <Clock size={12} />
                                      {order.dueDate.toDate().toLocaleDateString('ro-RO')}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className="text-[10px] font-bold uppercase text-slate-500">
                                    {order.paymentMethod === 'cash' ? '💵 Cash Livrare' : '⏳ Termen Plată'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <p className="font-mono font-bold text-sm">{order.totalAmount.toLocaleString()} RON</p>
                                </td>
                                <td className="p-4 text-right">
                                  <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase ${
                                    order.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {order.paid ? 'ACHITAT' : 'NEACHITAT'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {storeOrders.length === 0 && (
                              <tr>
                                <td colSpan={8} className="p-12 text-center text-slate-300 italic text-sm">
                                  Nu există nicio livrare înregistrată pentru acest magazin.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {storeOrders.some(o => o.observations) && (
                        <div className="p-4 bg-jss-beige/30 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Observații Recente</p>
                          <div className="grid gap-2">
                            {storeOrders.filter(o => o.observations).slice(-2).map(o => (
                              <div key={o.id} className="text-[10px] flex gap-2">
                                <span className="font-bold min-w-[40px]">#{o.orderNumber}:</span>
                                <span className="italic">"{o.observations}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'store_orders' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Comenzi Magazine</h2>
                <p className="text-xs text-jss-muted mt-1">Gestiunea activă a comenzilor și urmărirea statusului de plată</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white px-4 py-2 rounded-xl border border-jss-green-primary/10 shadow-sm">
                  <p className="text-[10px] font-bold text-jss-muted uppercase">Comenzi în derulare</p>
                  <p className="text-lg font-bold text-jss-green-primary leading-none mt-1">
                    {orders.filter(o => !o.paid).length} Active
                  </p>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm">
                  <p className="text-[10px] font-bold text-red-400 uppercase">Facturi Scadente</p>
                  <p className="text-lg font-bold text-red-500 leading-none mt-1">
                    {orders.filter(o => !o.paid && o.dueDate?.toDate() < new Date()).length} Alertă
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-jss-beige animate-in fade-in">
                  <div className="bg-jss-beige w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-jss-muted">
                    <Package size={32} />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-jss-green-primary">Nu sunt comenzi înregistrate</h3>
                  <p className="text-sm text-jss-muted max-w-xs mx-auto mt-2 italic">După ce vei înregistra o livrare în secțiunea "Magazine Partenere", datele vor apărea aici pentru monitorizare.</p>
                </div>
              ) : (
                orders
                  .sort((a, b) => b.deliveryDate?.toDate() - a.deliveryDate?.toDate())
                  .map((order) => {
                    const store = stores.find(s => s.id === order.storeId);
                    const isOverdue = !order.paid && order.dueDate?.toDate() < new Date();

                    return (
                      <motion.div 
                        layout
                        key={order.id}
                        className={`bg-white rounded-2xl border ${isOverdue ? 'border-red-200' : 'border-jss-green-primary/10'} shadow-sm hover:shadow-md transition-all overflow-hidden`}
                      >
                        <div className={`p-4 ${isOverdue ? 'bg-red-50/30' : 'bg-slate-50/30'} border-b flex flex-wrap justify-between items-center gap-4`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-jss-green-primary text-white'}`}>
                              <Store size={18} />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-jss-green-dark">{store?.name || 'Magazin Extern'}</h4>
                              <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">
                                Order #{order.orderNumber} • Fact {order.invoiceNumber}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-jss-muted font-bold uppercase">Data Livrării</p>
                              <p className="text-xs font-mono font-bold">
                                {order.deliveryDate?.toDate().toLocaleDateString('ro-RO')}
                              </p>
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                            <div className="text-right">
                              <p className="text-[10px] text-jss-muted font-bold uppercase tracking-tight">Status Livrare</p>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">LIVRAT</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 grid md:grid-cols-4 gap-6">
                          <div>
                            <p className="data-tag">Produs și Detalii</p>
                            <p className="text-sm font-bold text-jss-green-primary">{order.productName}</p>
                            <p className="text-xs text-jss-muted mt-0.5">
                              {order.quantity} KG x {order.pricePerKg} RON/KG
                            </p>
                          </div>
                          
                          <div>
                            <p className="data-tag">Plată și Scadență</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">
                                {order.paymentMethod === 'cash' ? '💵 Cash la Livrare' : '⏳ Termen de Plată'}
                              </span>
                            </div>
                            {order.dueDate && (
                              <p className={`text-[10px] mt-2 flex items-center gap-1 font-bold ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                <Clock size={10} /> Scadență: {order.dueDate.toDate().toLocaleDateString('ro-RO')}
                                {isOverdue && <span className="animate-pulse">(!ÎNTÂRZIERE!)</span>}
                              </p>
                            )}
                          </div>

                          <div className="md:border-l md:pl-6">
                            <p className="data-tag">Valoare Factură</p>
                            <p className="text-xl font-mono font-bold text-jss-green-dark">
                              {order.totalAmount.toLocaleString()} RON
                            </p>
                            <p className="text-[9px] text-jss-muted uppercase font-bold mt-1">TVA Inclus</p>
                          </div>

                          <div className="flex flex-col justify-center space-y-2">
                             <button
                               onClick={async () => {
                                 // We need handleToggleOrderPayment or similar in FarmerDashboard or import from lib
                                 // For now I'll use simple setDoc/updateDoc logic directly if available or create a local handler
                                 try {
                                   await updateDoc(doc(db, 'orders', order.id), { paid: !order.paid });
                                 } catch (err) {
                                   console.error(err);
                                 }
                               }}
                               className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                                 order.paid 
                                 ? 'bg-green-600 text-white hover:bg-green-700' 
                                 : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-jss-green-primary hover:text-jss-green-primary'
                               }`}
                             >
                               {order.paid ? (
                                 <><CheckCircle size={14} /> Achitat Complet</>
                               ) : (
                                 <><Clock size={14} /> Marcare ca Achitat</>
                               )}
                             </button>
                             
                             {order.observations && (
                               <div className="p-2 bg-jss-beige/50 rounded-lg text-[10px] italic text-jss-muted border border-jss-beige">
                                 " {order.observations} "
                               </div>
                             )}
                          </div>
                        </div>
                      </motion.div>
                    );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Registru Comenzi și Plăți</h2>
                <p className="text-xs text-jss-muted mt-1">Toate livrările efectuate across magazinele partenere</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white p-3 rounded-2xl border border-jss-green-primary/10 text-right min-w-[150px]">
                  <p className="text-[10px] font-bold text-jss-muted uppercase tracking-tight">Total Neîncasat</p>
                  <p className="text-lg font-mono font-bold text-red-500">
                    {orders.filter(o => !o.paid).reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()} RON
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-jss-green-primary/10 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1100px]">
                  <thead>
                    <tr className="bg-jss-green-primary/5 text-[10px] font-bold uppercase text-jss-green-primary border-b border-jss-green-primary/10">
                      <th className="p-4">Data Livrării</th>
                      <th className="p-4">Comandă / Factură</th>
                      <th className="p-4">Magazin Partener</th>
                      <th className="p-4">Produs</th>
                      <th className="p-4">Cantitate / Preț</th>
                      <th className="p-4 text-right">Valoare</th>
                      <th className="p-4 text-center">Tip Plată</th>
                      <th className="p-4 text-center">Data Scadență</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .sort((a, b) => b.deliveryDate?.toDate() - a.deliveryDate?.toDate())
                      .map((order) => {
                        const store = stores.find(s => s.id === order.storeId);
                        const isOverdue = !order.paid && order.dueDate && order.dueDate.toDate() < new Date();

                        return (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700">
                                  {order.deliveryDate?.toDate().toLocaleDateString('ro-RO')}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {order.deliveryDate?.toDate().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-jss-green-primary"># {order.orderNumber}</p>
                              <p className="text-[10px] text-slate-400">Fact: {order.invoiceNumber}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-jss-beige rounded-lg text-jss-green-primary">
                                  <Store size={14} />
                                </div>
                                <span className="text-xs font-bold">{store?.name || '---'}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm font-medium">{order.productName}</td>
                            <td className="p-4">
                              <p className="text-xs font-mono font-medium">{order.quantity} KG</p>
                              <p className="text-[9px] text-slate-400">{order.pricePerKg} RON/KG</p>
                            </td>
                            <td className="p-4 text-right">
                              <p className="font-mono font-bold text-sm">{order.totalAmount.toLocaleString()} RON</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-[9px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">
                                {order.paymentMethod === 'cash' ? '💵 Cash' : '⏳ Termen'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {order.dueDate ? (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <Clock size={12} />
                                  {order.dueDate.toDate().toLocaleDateString('ro-RO')}
                                </div>
                              ) : <span className="text-slate-300">---</span>}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase inline-block min-w-[85px] text-center ${
                                order.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
                              }`}>
                                {order.paid ? 'ACHITAT' : 'NEACHITAT'}
                              </span>
                            </td>
                          </tr>
                        );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-20 text-center text-slate-300 italic text-sm">
                          Nu există nicio livrare înregistrată în baza de date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Oportunități Parteneriat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {potentialStores.map((store) => (
                <motion.div 
                  layout
                  key={store.id}
                  className="bg-white overflow-hidden rounded-2xl border border-jss-green-primary/10 shadow-sm h-full flex flex-col"
                >
                  <div className="bg-jss-green-primary/5 p-4 flex justify-between items-center border-b border-jss-green-primary/10">
                    <span className="text-[10px] uppercase tracking-widest font-bold bg-jss-green-primary text-white px-2 py-0.5 rounded">
                      {store.type}
                    </span>
                    <MapPin size={16} className="text-jss-muted/50" />
                  </div>
                  <div className="p-6 flex-1 space-y-4">
                    <h3 className="text-xl font-serif font-bold text-jss-green-primary">{store.name}</h3>
                    <p className="text-xs text-jss-muted">{store.city || 'București'}</p>
                    <a 
                      href={store.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-jss-green-primary font-bold text-sm hover:underline"
                    >
                      Vizitează Site <ChevronRight size={16} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
            {potentialStores.length === 0 && (
              <p className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 italic">
                Nu sunt oportunități active în listă. Administratorul va încărca partenerii noi în curând.
              </p>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Contact Departamentul de Vânzări</h2>
            <MessagingSystem user={user} isAdmin={false} />
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="absolute inset-0 bg-jss-green-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold border-b border-jss-beige pb-4 text-jss-green-primary">Adaugă Producție Detaliată</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[70vh] pr-2">
                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Tip Produs (Ex: Carne Vită, Lapte, Brânză)</label>
                  <input 
                    required
                    list="productTypes"
                    type="text" 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    placeholder="Selectează sau scrie tipul..."
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                  <datalist id="productTypes">
                    <option value="Carne Vită" />
                    <option value="Carne Porc" />
                    <option value="Carne Pasăre" />
                    <option value="Lapte Proaspăt" />
                    <option value="Brânză Telemea" />
                    <option value="Brânză de Vaci" />
                    <option value="Ouă" />
                    <option value="Legume Sezon" />
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Cantitate disp. / săptămână (kg/l)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Preț minim acceptat (RON/kg)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Frecvență Livrare</label>
                  <select 
                    value={formData.deliveryFrequency}
                    onChange={(e) => setFormData({...formData, deliveryFrequency: e.target.value as any})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none"
                  >
                    <option value="zilnic">Zilnic</option>
                    <option value="saptamanal">Săptămânal</option>
                    <option value="la comanda">La Comandă</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Cantitate min. per comandă</label>
                  <input 
                    required
                    type="number" 
                    value={formData.minOrderQuantity}
                    onChange={(e) => setFormData({...formData, minOrderQuantity: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Tip Ambalare</label>
                  <select 
                    value={formData.packagingType}
                    onChange={(e) => setFormData({...formData, packagingType: e.target.value as any})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none"
                  >
                    <option value="vrac">Vrac</option>
                    <option value="portionat">Porționat</option>
                    <option value="vidat">Vidat</option>
                    <option value="altceva">Altceva</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Termen Valabilitate</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: 5 zile, 1 an"
                    value={formData.shelfLife}
                    onChange={(e) => setFormData({...formData, shelfLife: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Certificări</label>
                  <select 
                    value={formData.certification}
                    onChange={(e) => setFormData({...formData, certification: e.target.value as any})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none"
                  >
                    <option value="fara">Fără Certificare</option>
                    <option value="bio">Bio / Organic</option>
                    <option value="traditional">Produs Tradițional</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Magazin Partener (Dacă există)</label>
                  <select 
                    value={formData.partnerStoreId}
                    onChange={(e) => setFormData({...formData, partnerStoreId: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none focus:ring-2 focus:ring-jss-green-primary/50"
                  >
                    <option value="">Alege un magazin...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingProduct(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-jss-muted hover:bg-jss-beige transition-colors"
                  >
                    Anulează
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-jss-green-primary text-white px-6 py-4 rounded-xl font-bold hover:opacity-90 shadow-lg"
                  >
                    Salvează Produs
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Order Modal */}
      <AnimatePresence>
        {isAddingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingOrder(null)}
              className="absolute inset-0 bg-jss-green-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold border-b border-jss-beige pb-4 text-jss-green-primary flex items-center gap-2">
                <Store size={24} /> Înregistrare Livrare Nouă
              </h2>
              <form onSubmit={handleAddOrder} className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[70vh] pr-2">
                <div className="space-y-1">
                  <label className="data-tag">Număr Comandă</label>
                  <input 
                    required
                    type="text" 
                    value={orderFormData.orderNumber}
                    onChange={(e) => setOrderFormData({...orderFormData, orderNumber: e.target.value})}
                    placeholder="Ex: JSS-001"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Număr Factură</label>
                  <input 
                    required
                    type="text" 
                    value={orderFormData.invoiceNumber}
                    onChange={(e) => setOrderFormData({...orderFormData, invoiceNumber: e.target.value})}
                    placeholder="Ex: FACT-001"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Nume Produs</label>
                  <input 
                    required
                    type="text" 
                    value={orderFormData.productName}
                    onChange={(e) => setOrderFormData({...orderFormData, productName: e.target.value})}
                    placeholder="Ex: Brânză Telemea Oaie"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Cantitate (kg)</label>
                  <input 
                    required
                    type="number" 
                    value={orderFormData.quantity}
                    onChange={(e) => setOrderFormData({...orderFormData, quantity: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Preț RON/kg</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={orderFormData.pricePerKg}
                    onChange={(e) => setOrderFormData({...orderFormData, pricePerKg: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Data Livrării</label>
                  <input 
                    required
                    type="date" 
                    value={orderFormData.deliveryDate}
                    onChange={(e) => setOrderFormData({...orderFormData, deliveryDate: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Tip Plată</label>
                  <select 
                    value={orderFormData.paymentMethod}
                    onChange={(e) => setOrderFormData({...orderFormData, paymentMethod: e.target.value as any})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none"
                  >
                    <option value="cash">Cash la livrare</option>
                    <option value="termen">Termen de plată</option>
                  </select>
                </div>
                {orderFormData.paymentMethod === 'termen' && (
                  <div className="col-span-2 space-y-1">
                    <label className="data-tag">Data Scadență</label>
                    <input 
                      required
                      type="date" 
                      value={orderFormData.dueDate}
                      onChange={(e) => setOrderFormData({...orderFormData, dueDate: e.target.value})}
                      className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                    />
                  </div>
                )}
                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Observații Comandă</label>
                  <textarea 
                    value={orderFormData.observations}
                    onChange={(e) => setOrderFormData({...orderFormData, observations: e.target.value})}
                    rows={3}
                    placeholder="Detalii despre ambalaj, stare produse, etc..."
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50 resize-none"
                  />
                </div>
                
                <div className="col-span-2 pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingOrder(null)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-jss-muted hover:bg-jss-beige transition-colors"
                  >
                    Anulează
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-jss-green-primary text-white px-6 py-4 rounded-xl font-bold hover:opacity-90 shadow-lg"
                  >
                    Confirmă Livrarea
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Store Modal */}
      <AnimatePresence>
        {isAddingStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStore(false)}
              className="absolute inset-0 bg-jss-green-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h2 className="text-2xl font-serif font-bold border-b border-jss-beige pb-4 text-jss-green-primary flex items-center gap-2">
                <Store size={24} /> Adaugă Magazin Partener
              </h2>
              <form onSubmit={handleAddStore} className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Nume Magazin / Punct de lucru</label>
                  <input 
                    required
                    type="text" 
                    value={storeFormData.name}
                    onChange={(e) => setStoreFormData({...storeFormData, name: e.target.value})}
                    placeholder="Ex: Carmangeria Centrală"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Tip Profil</label>
                  <select 
                    value={storeFormData.type}
                    onChange={(e) => setStoreFormData({...storeFormData, type: e.target.value as any})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none appearance-none"
                  >
                    <option value="mixt">Mixt</option>
                    <option value="carmangerie">Carmangerie</option>
                    <option value="lactate">Lactate</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Cod Unic Identificare (CUI)</label>
                  <input 
                    type="text" 
                    value={storeFormData.cui}
                    onChange={(e) => setStoreFormData({...storeFormData, cui: e.target.value})}
                    placeholder="Ex: RO123456"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Reg Com (RC)</label>
                  <input 
                    type="text" 
                    value={storeFormData.regCom}
                    onChange={(e) => setStoreFormData({...storeFormData, regCom: e.target.value})}
                    placeholder="Ex: J40/123/2023"
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="data-tag">Telefon Contact</label>
                  <input 
                    type="tel" 
                    value={storeFormData.phone}
                    onChange={(e) => setStoreFormData({...storeFormData, phone: e.target.value})}
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Adresa de Livrare (Completă)</label>
                  <textarea 
                    required
                    value={storeFormData.address}
                    onChange={(e) => setStoreFormData({...storeFormData, address: e.target.value})}
                    rows={2}
                    placeholder="Strada, Număr, Bloc, Localitate..."
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50 resize-none"
                  />
                </div>
                <div className="col-span-2 pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingStore(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-jss-muted hover:bg-jss-beige transition-colors"
                  >
                    Anulează
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-jss-green-primary text-white px-6 py-4 rounded-xl font-bold hover:opacity-90 shadow-lg"
                  >
                    Salvează Magazin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
