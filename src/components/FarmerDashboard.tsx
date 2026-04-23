import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, Store, MapPin, CheckCircle, Clock, Truck, ChevronRight, LogOut, Info, MessageSquare, BarChart3, ArrowUpRight, ArrowDownLeft, AlertTriangle, Boxes, Search, LayoutDashboard, Calendar, Phone, Mail, ExternalLink } from 'lucide-react';
import { db, auth, logout, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, setDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';

import { POTENTIAL_PARTNERS } from '../constants/potentialPartners';
import MessagingSystem from './MessagingSystem';

export default function FarmerDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'opportunities' | 'partners' | 'ledger' | 'store_orders' | 'messages' | 'stocks'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [potentialStores, setPotentialStores] = useState<any[]>([]);
  const [farmerOpportunities, setFarmerOpportunities] = useState<any[]>([]);
  const [teamActivities, setTeamActivities] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingOrder, setIsAddingOrder] = useState<string | null>(null); // Store ID
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState<{[key: string]: number}>({});
  const [stockSearch, setStockSearch] = useState('');
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
    additionalInfo: '',
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

    // Fetch Farmer Specific Opportunities
    const unsubscribeOpps = onSnapshot(query(collection(db, 'opportunities'), where('farmerId', '==', user.uid)), (snapshot) => {
      setFarmerOpportunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Farmer Specific Team Activities
    const unsubscribeActivities = onSnapshot(query(collection(db, 'teamActivities'), where('farmerId', '==', user.uid)), (snapshot) => {
      setTeamActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeStores();
      unsubscribePotential();
      unsubscribeOrders();
      unsubscribeOpps();
      unsubscribeActivities();
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
        additionalInfo: '',
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
        {/* Farm Name Setup - AT TOP */}
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

        {/* Tab Navigation - MIDDLE */}
        <nav className="bg-white p-1 rounded-2xl shadow-sm border border-jss-green-primary/10 w-full mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-nowrap items-stretch gap-1">
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'products' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <Package size={18} className="shrink-0" />
              <span className="leading-tight">Catalog Produse</span>
            </button>
            <button 
              onClick={() => setActiveTab('stocks')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'stocks' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <Boxes size={18} className="shrink-0" />
              <span className="leading-tight">Stocuri</span>
            </button>
            <button 
              onClick={() => setActiveTab('partners')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'partners' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <Store size={18} className="shrink-0" />
              <span className="leading-tight">Magazine</span>
            </button>
            <button 
              onClick={() => setActiveTab('store_orders')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'store_orders' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <Truck size={18} className="shrink-0" />
              <span className="leading-tight">Comenzi</span>
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'ledger' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <BarChart3 size={18} className="shrink-0" />
              <span className="leading-tight">Registru</span>
            </button>
            <button 
              onClick={() => setActiveTab('opportunities')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'opportunities' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <MapPin size={18} className="shrink-0" />
              <span className="leading-tight">Oportunități</span>
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'messages' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <MessageSquare size={18} className="shrink-0" />
              <span className="leading-tight">Contact</span>
            </button>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center sm:text-left ${activeTab === 'overview' ? 'bg-jss-green-primary text-white shadow-md' : 'text-jss-muted hover:bg-jss-beige'}`}
            >
              <LayoutDashboard size={18} className="shrink-0" />
              <span className="leading-tight">Panou Control</span>
            </button>
          </div>
        </nav>


        {activeTab === 'stocks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Gestiune Stocuri</h2>
                <p className="text-xs text-jss-muted">Monitorizează și ajustează stocurile disponibile pentru livrare</p>
              </div>
              <div className="relative w-full sm:w-64">
                <input 
                  type="text" 
                  placeholder="Caută în stoc..." 
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full bg-white border border-jss-green-primary/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-jss-green-primary/50 outline-none shadow-sm"
                />
                <Search className="absolute left-3 top-2.5 text-jss-muted" size={16} />
              </div>
            </div>

            {/* Stock Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center gap-4">
                <div className="bg-jss-green-primary/10 p-3 rounded-xl text-jss-green-primary">
                  <Boxes size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-jss-muted uppercase">Total Produse</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Stoc Scăzut</p>
                  <p className="text-xl font-bold">{products.filter(p => p.quantity < (p.minOrderQuantity * 2)).length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Valoarea Stoc Est.</p>
                  <p className="text-xl font-bold text-mono">
                    {products.reduce((acc, p) => acc + (Number(p.quantity) * Number(p.pricePerKg)), 0).toLocaleString()} RON
                  </p>
                </div>
              </div>
            </div>

            {/* Unified Stock Control Table */}
            <div className="bg-white rounded-3xl border border-jss-green-primary/10 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                      <th className="p-4">Produs / Categorie</th>
                      <th className="p-4">Stoc Curent</th>
                      <th className="p-4">Indicator Nivel</th>
                      <th className="p-4 text-center">Ajustare Rapidă</th>
                      <th className="p-4 text-right">Ultima Actualizare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products
                      .filter(p => p.type.toLowerCase().includes(stockSearch.toLowerCase()))
                      .map((product) => {
                        const isLow = product.quantity < (product.minOrderQuantity * 2);
                        const progress = Math.min((product.quantity / (product.minOrderQuantity * 10 || 1)) * 100, 100);

                        return (
                          <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-amber-100 text-amber-600' : 'bg-jss-beige text-jss-green-primary'}`}>
                                  <Package size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-jss-green-primary">{product.type}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{product.certification} • {product.packagingType}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <p className={`text-lg font-mono font-bold ${isLow ? 'text-amber-600' : 'text-jss-green-dark'}`}>
                                  {product.quantity} <span className="text-xs uppercase">KG/L</span>
                                </p>
                                <p className="text-[9px] text-slate-400">Min. Comandă: {product.minOrderQuantity} KG</p>
                              </div>
                            </td>
                            <td className="p-4 w-48">
                              <div className="space-y-1.5">
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className={`h-full rounded-full ${product.stockAlert ? 'bg-red-500 animate-pulse' : isLow ? 'bg-amber-500' : 'bg-jss-green-primary'}`}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                                  <span className={product.stockAlert ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-slate-400'}>
                                    {product.stockAlert ? '🚨 Alertă Stoc' : isLow ? 'Nivel Scăzut' : 'Optim'}
                                  </span>
                                  <span className="text-slate-300">{Math.round(progress)}%</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    const val = Math.max(0, product.quantity - 1);
                                    updateDoc(doc(db, 'products', product.id), { quantity: val });
                                  }}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
                                  <ArrowDownLeft size={16} />
                                </button>
                                
                                <div className="flex gap-1 group">
                                  <input 
                                    type="number"
                                    placeholder="Qty..."
                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center focus:ring-1 focus:ring-jss-green-primary outline-none"
                                    value={stockAdjustment[product.id] || ''}
                                    onChange={(e) => setStockAdjustment({
                                      ...stockAdjustment,
                                      [product.id]: Number(e.target.value)
                                    })}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter' && stockAdjustment[product.id]) {
                                        const newVal = product.quantity + stockAdjustment[product.id];
                                        if (newVal >= 0) {
                                          await updateDoc(doc(db, 'products', product.id), { quantity: newVal });
                                          setStockAdjustment({ ...stockAdjustment, [product.id]: 0 });
                                        }
                                      }
                                    }}
                                  />
                                  <button 
                                    disabled={!stockAdjustment[product.id]}
                                    onClick={async () => {
                                      const newVal = product.quantity + (stockAdjustment[product.id] || 0);
                                      if (newVal >= 0) {
                                        await updateDoc(doc(db, 'products', product.id), { quantity: newVal });
                                        setStockAdjustment({ ...stockAdjustment, [product.id]: 0 });
                                      }
                                    }}
                                    className="p-1.5 bg-jss-green-primary text-white rounded-lg opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-all disabled:hidden"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                </div>

                                <button 
                                  onClick={() => {
                                    updateDoc(doc(db, 'products', product.id), { quantity: product.quantity + 1 });
                                  }}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                >
                                  <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <p className="text-[10px] font-bold text-slate-500">
                                {product.createdAt?.toDate ? product.createdAt.toDate().toLocaleDateString('ro-RO') : 'N/A'}
                              </p>
                              <p className="text-[9px] text-slate-300">
                                {product.createdAt?.toDate ? product.createdAt.toDate().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-300 italic text-sm">
                          Nu ai adăugat încă produse în catalog.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{product.type}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          product.certification === 'bio' ? 'bg-green-600 text-white' : 
                          product.certification === 'traditional' ? 'bg-amber-600 text-white' : 
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {product.certification}
                        </span>
                        {/* Auto Labels from Admin */}
                        {product.autoLabels?.map(label => (
                          <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                            {label}
                          </span>
                        ))}
                        {product.manualLabels?.map(label => (
                          <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-jss-muted">{product.quantity} kg/săpt @ {product.pricePerKg} RON/kg (min)</p>
                    </div>
                    {product.paymentReceived ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle size={12} /> Aprobat
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
              <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Magazine Partenere</h2>
              <button 
                onClick={() => setIsAddingStore(true)}
                className="bg-jss-green-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Adaugă Magazin
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => {
                const storeOrders = orders.filter(o => o.storeId === store.id);
                const totalValue = storeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                const lastOrder = storeOrders.sort((a, b) => {
                  const dateA = a.deliveryDate?.toDate() || 0;
                  const dateB = b.deliveryDate?.toDate() || 0;
                  return dateB - dateA;
                })[0];
                
                const frequency = storeOrders.length > 5 ? 'Des' : storeOrders.length > 0 ? 'Ocazional' : 'Inactiv';

                return (
                  <motion.div 
                    layout
                    key={store.id}
                    className="bg-white rounded-3xl border border-jss-green-primary/10 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="bg-jss-beige p-3 rounded-2xl text-jss-green-primary">
                          <Store size={24} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            store.relationshipStatus === 'activ' ? 'bg-green-100 text-green-700' : 
                            store.relationshipStatus === 'in negociere' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {store.relationshipStatus || 'activ'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            frequency === 'Des' ? 'border-green-200 text-green-600' : 'border-slate-200 text-slate-400'
                          }`}>
                            Frecv: {frequency}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-serif font-bold text-jss-green-primary">{store.name}</h3>
                        <p className="text-xs text-jss-muted flex items-center gap-1 mt-1">
                          <MapPin size={12} /> {store.address || 'Adresă nespecificată'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Comenzi</p>
                          <p className="text-lg font-mono font-bold">{storeOrders.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Valoare Gen.</p>
                          <p className="text-lg font-mono font-bold text-jss-green-primary">{totalValue.toLocaleString()} RON</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> Ultima comandă: {lastOrder ? lastOrder.deliveryDate?.toDate().toLocaleDateString('ro-RO') : 'Nicio comandă'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-jss-beige/20">
                      <button 
                        onClick={() => setIsAddingOrder(store.id)}
                        className="w-full bg-white border border-jss-green-primary text-jss-green-primary py-3 rounded-2xl text-xs font-bold hover:bg-jss-green-primary hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Înregistrare Livrare
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {stores.length === 0 && (
              <p className="p-20 text-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-3xl">
                Nu ai nicio locație parteneră înregistrată.
              </p>
            )}
          </div>
        )}

        {activeTab === 'store_orders' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Centralizator Comenzi</h2>
                <p className="text-sm text-jss-muted mt-1">Status plati si livrari consolidate</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white px-4 py-2 rounded-2xl border border-jss-green-primary/10 shadow-sm min-w-[120px]">
                  <p className="text-[10px] font-bold text-jss-muted uppercase">În derulare</p>
                  <p className="text-xl font-bold text-jss-green-primary">
                    {orders.filter(o => !o.paid).length}
                  </p>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100 shadow-sm min-w-[120px]">
                  <p className="text-[10px] font-bold text-red-400 uppercase">Scadente</p>
                  <p className="text-xl font-bold text-red-500">
                    {orders.filter(o => !o.paid && o.dueDate?.toDate() < new Date()).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orders.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl p-20 text-center border-2 border-dashed border-jss-beige animate-in fade-in">
                  <div className="bg-jss-beige w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-jss-muted">
                    <Package size={32} />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-jss-green-primary">Nu sunt comenzi înregistrate</h3>
                  <p className="text-sm text-jss-muted max-w-xs mx-auto mt-2 italic">Datele vor apărea aici imediat ce înregistrezi prima livrare.</p>
                </div>
              ) : (
                orders
                  .sort((a, b) => {
                    const dateA = a.deliveryDate?.toDate() || 0;
                    const dateB = b.deliveryDate?.toDate() || 0;
                    return dateB - dateA;
                  })
                  .map((order) => {
                    const store = stores.find(s => s.id === order.storeId);
                    const isOverdue = !order.paid && order.dueDate?.toDate() < new Date();

                    return (
                      <motion.div 
                        layout
                        key={order.id}
                        className={`bg-white rounded-3xl border ${isOverdue ? 'border-red-200 ring-2 ring-red-50' : 'border-jss-green-primary/10'} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col`}
                      >
                        <div className="p-5 flex-1 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-jss-green-primary/10 text-jss-green-primary'}`}>
                                <Store size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-jss-green-dark">{store?.name || 'Magazin Extern'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                                  #{order.orderNumber}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                              order.paid ? 'bg-green-100 text-green-700' : 
                              isOverdue ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.paid ? 'ACHITAT' : isOverdue ? 'SCADENT' : 'NEACHITAT'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-3 border-y border-slate-50">
                             <div>
                               <p className="text-[10px] text-slate-400 uppercase font-bold">Produs</p>
                               <p className="text-sm font-bold">{order.productName}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] text-slate-400 uppercase font-bold">Valoare</p>
                               <p className="text-sm font-mono font-bold text-jss-green-primary">{order.totalAmount.toLocaleString()} RON</p>
                             </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px]">
                            <p className="font-medium text-slate-400 flex items-center gap-1">
                              <Calendar size={12} /> {order.deliveryDate?.toDate().toLocaleDateString('ro-RO')}
                            </p>
                            {order.dueDate && (
                              <p className={`font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                <Clock size={12} /> {order.dueDate.toDate().toLocaleDateString('ro-RO')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">
                             {order.paymentMethod === 'cash' ? '💵 Cash' : '⏳ Termen'}
                           </span>
                           <button
                             onClick={async () => {
                               try {
                                 const orderRef = doc(db, 'orders', order.id);
                                 await updateDoc(orderRef, { paid: !order.paid });
                               } catch (err) {
                                  console.error(err);
                               }
                             }}
                             className="text-[10px] font-bold text-jss-green-primary hover:underline"
                           >
                             {order.paid ? 'Setează Neachitat' : 'Marchează Achitat'}
                           </button>
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
            <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Oportunități de Vânzare</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {farmerOpportunities.map((opp) => (
                <motion.div 
                  layout
                  key={opp.id}
                  className="bg-white overflow-hidden rounded-2xl border border-jss-green-primary/10 shadow-sm h-full flex flex-col"
                >
                  <div className="bg-jss-green-primary/5 p-4 flex justify-between items-center border-b border-jss-green-primary/10">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                      opp.status === 'Castigat' ? 'bg-green-500 text-white' :
                      opp.status === 'Pierdut' ? 'bg-red-500 text-white' :
                      opp.status === 'Oferta trimisa' ? 'bg-blue-500 text-white' :
                      opp.status === 'In discutie' ? 'bg-amber-500 text-white' :
                      'bg-slate-500 text-white'
                    }`}>
                      {opp.status}
                    </span>
                    <p className="text-[10px] font-bold text-jss-green-primary">
                      {opp.estimatedValue ? `${opp.estimatedValue.toLocaleString()} RON` : '---'}
                    </p>
                  </div>
                  <div className="p-6 flex-1 space-y-4">
                    <h3 className="text-xl font-serif font-bold text-jss-green-primary">{opp.storeName}</h3>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-xs">
                         <span className="font-bold text-slate-400">Ultima Acțiune:</span>
                         <span className="text-slate-600">{opp.lastAction || 'În analiză'}</span>
                       </div>
                       <div className="flex items-center gap-2 text-xs">
                         <span className="font-bold text-slate-400">Următorul Pas:</span>
                         <span className="text-slate-600 font-medium">{opp.nextStep || 'Stabilire contact'}</span>
                       </div>
                    </div>
                    {opp.note && (
                      <div className="p-3 bg-jss-beige/30 rounded-xl text-[10px] italic text-jss-muted border border-jss-beige">
                        "{opp.note}"
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Leads Section */}
            <div className="pt-8 border-t border-jss-green-primary/10">
              <h3 className="text-lg font-serif font-bold text-jss-green-dark mb-4">Magazine Vizate (Leads)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {potentialStores.map((store) => (
                  <div key={store.id} className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-jss-green-primary">{store.name}</p>
                      <p className="text-[10px] text-jss-muted">{store.city || 'București'} • {store.type}</p>
                    </div>
                    <a href={store.website} target="_blank" className="p-2 text-jss-green-primary hover:bg-jss-beige rounded-lg">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {farmerOpportunities.length === 0 && potentialStores.length === 0 && (
              <p className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 italic">
                Echipa noastră pregătește noi oportunități în acest moment.
              </p>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="tel:0765716692" className="bg-white p-6 rounded-3xl border border-jss-green-primary/10 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="bg-jss-green-primary/10 p-3 rounded-2xl text-jss-green-primary">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-jss-muted uppercase">Telefon Direct</p>
                  <p className="font-bold">0765 716 692</p>
                </div>
              </a>
              <div className="bg-white p-6 rounded-3xl border border-jss-green-primary/10 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-jss-muted uppercase">Program Suport</p>
                  <p className="font-bold">L-V: 09:00 - 18:00</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-jss-green-primary">Trimite un mesaj rapid</h3>
              <MessagingSystem user={user} isAdmin={false} />
            </div>
          </div>
        )}

        {/* BOTTOM: Panou de Control (Overview) */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jss-green-primary">Panou de Control</h2>
                <p className="text-sm text-jss-muted">Rezumatul activității tale comerciale gestionată de echipa noastră</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl border border-jss-green-primary/10 shadow-sm">
                <p className="text-[10px] font-bold text-jss-muted uppercase">Vânzări Luna Curentă</p>
                <p className="text-lg font-bold text-jss-green-primary">
                  {user.manualStats?.totalSales !== undefined 
                    ? user.manualStats.totalSales.toLocaleString()
                    : orders
                        .filter(o => {
                          const d = o.deliveryDate?.toDate();
                          const now = new Date();
                          return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        })
                        .reduce((acc, o) => acc + o.totalAmount, 0)
                        .toLocaleString()
                  } RON
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm space-y-1">
                <div className="flex justify-between items-start text-jss-green-primary/40">
                  <Truck size={20} />
                </div>
                <p className="text-xs font-bold text-jss-muted uppercase">Comenzi</p>
                <p className="text-2xl font-bold">{user.manualStats?.ordersCount ?? orders.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm space-y-1">
                <div className="flex justify-between items-start text-blue-400">
                  <MapPin size={20} />
                </div>
                <p className="text-xs font-bold text-jss-muted uppercase">Oportunități</p>
                <p className="text-2xl font-bold">{user.manualStats?.oppsCount ?? farmerOpportunities.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm space-y-1">
                <div className="flex justify-between items-start text-green-400">
                  <Store size={20} />
                </div>
                <p className="text-xs font-bold text-jss-muted uppercase">Magazine Contactate</p>
                <p className="text-2xl font-bold">{user.manualStats?.contactedStores ?? stores.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm space-y-1">
                <div className="flex justify-between items-start text-amber-400">
                  <CheckCircle size={20} />
                </div>
                <p className="text-xs font-bold text-jss-muted uppercase">Clienți Câștigați</p>
                <p className="text-2xl font-bold">
                  {user.manualStats?.wonClients ?? farmerOpportunities.filter(o => o.status === 'Castigat').length}
                </p>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-lg font-serif font-bold text-jss-green-primary flex items-center gap-2">
                  <BarChart3 size={20} /> Top 3 Produse
                </h3>
                <div className="space-y-3">
                  {user.topProducts && user.topProducts.length > 0 ? (
                    user.topProducts.map((name: string, idx: number) => (
                      <div key={name} className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-jss-beige flex items-center justify-center text-[10px] font-bold text-jss-green-primary">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold">{name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-jss-green-primary uppercase tracking-wider">Top Selecție</span>
                      </div>
                    ))
                  ) : (
                    Object.entries(
                      orders.reduce((acc, current) => {
                        acc[current.productName] = (acc[current.productName] || 0) + current.totalAmount;
                        return acc;
                      }, {} as {[key: string]: number})
                    )
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 3)
                      .map(([name, val], idx) => (
                        <div key={name} className="bg-white p-4 rounded-2xl border border-jss-green-primary/10 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-jss-beige flex items-center justify-center text-[10px] font-bold text-jss-green-primary">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-bold">{name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold bg-jss-green-primary/5 text-jss-green-primary px-3 py-1 rounded-lg">
                            {val.toLocaleString()} RON
                          </span>
                        </div>
                      ))
                  )}
                  {orders.length === 0 && (!user.topProducts || user.topProducts.length === 0) && (
                    <p className="text-sm text-jss-muted italic">Nu există date despre vânzări încă.</p>
                  )}
                </div>

                <div className="bg-jss-green-primary text-white p-6 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Info size={18} />
                    <h4 className="font-bold">Recomandare Echipa Vânzări</h4>
                  </div>
                  <p className="text-sm opacity-90">
                    {user.salesRecommendation || "Încă nu ai început colaborarea cu JSS. Contactează echipa pentru a programa o discuție."}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-serif font-bold text-jss-green-primary flex items-center gap-2">
                  <MessageSquare size={20} /> Activitate Echipă JSS
                </h3>
                <div className="bg-white rounded-3xl border border-jss-green-primary/10 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-50">
                    {teamActivities.length > 0 ? (
                      teamActivities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="p-4 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-jss-green-primary capitalize">
                              {activity.type === 'offer' ? '📄 Ofertă Trimisă' : 
                               activity.type === 'call' ? '📞 Apel Efectuat' : 
                               activity.type === 'acquisition' ? '🤝 Client Nou' : '📍 Vizită'}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {activity.createdAt?.toDate().toLocaleDateString('ro-RO')}
                            </span>
                          </div>
                          <p className="text-xs font-medium">{activity.storeName}</p>
                          <p className="text-[10px] text-jss-muted line-clamp-1">{activity.result || activity.notes}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-jss-muted/50 italic text-xs">
                        Echipa noastră pregătește primele acțiuni pentru ferma ta.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
                    <option value="Salam de Sibiu" />
                    <option value="Salam (Diverse tipuri)" />
                    <option value="Mezeluri (Parizer, Cremvurști)" />
                    <option value="Mușchi File / Pastramă" />
                    <option value="Șuncă / Bacon / Kaizer" />
                    <option value="Cârnați (Afumați/Proaspeți)" />
                    <option value="Hamburger / Mici" />
                    <option value="Lapte Proaspăt" />
                    <option value="Brânză Telemea" />
                    <option value="Brânză de Vaci" />
                    <option value="Cașcaval / Brânzeturi Maturate" />
                    <option value="Iaurt / Smântână" />
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

                <div className="col-span-2 space-y-1">
                  <label className="data-tag">Informații Suplimentare (Text Manual)</label>
                  <textarea 
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}
                    rows={4}
                    placeholder="Introdu aici orice alte detalii relevante despre produs, origine, condiții speciale etc..."
                    className="w-full bg-jss-beige border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-jss-green-primary/50 resize-none text-sm"
                  />
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
