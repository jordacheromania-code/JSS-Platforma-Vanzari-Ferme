import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Paperclip, Mail, X, FileText, ImageIcon, Table, ChevronRight, Search, Inbox, SendHorizontal, Trash2 } from 'lucide-react';
import { db, storage, auth } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  subject: string;
  body: string;
  attachments: { name: string; url: string; type: string }[];
  read: boolean;
  createdAt: any;
}

interface MessagingSystemProps {
  user: any;
  isAdmin: boolean;
}

export default function MessagingSystem({ user, isAdmin }: MessagingSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'sidebar' | 'list' | 'content'>('list'); // Mobile view state

  // New Message State
  const [newMsg, setNewMsg] = useState({
    receiverId: isAdmin ? '' : 'admin',
    subject: '',
    body: '',
    attachments: [] as { name: string; url: string; type: string }[]
  });

  useEffect(() => {
    // Determine query based on role and tab
    const q = query(
      collection(db, 'messages'),
      where(activeTab === 'inbox' ? 'receiverId' : 'senderId', '==', isAdmin && activeTab === 'inbox' ? 'admin' : user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    if (isAdmin) {
      const unsubFarmers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'farmer')), (s) => {
        setFarmers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => { unsubscribe(); unsubFarmers(); };
    }

    return () => unsubscribe();
  }, [activeTab, isAdmin, user.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.subject || !newMsg.body || (isAdmin && !newMsg.receiverId)) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || user.email,
        senderRole: isAdmin ? 'admin' : 'farmer',
        receiverId: newMsg.receiverId,
        subject: newMsg.subject,
        body: newMsg.body,
        attachments: newMsg.attachments,
        read: false,
        createdAt: serverTimestamp()
      });
      setIsComposing(false);
      setNewMsg({ receiverId: isAdmin ? '' : 'admin', subject: '', body: '', attachments: [] });
    } catch (err) {
      console.error(err);
      alert("Eroare la trimiterea mesajului.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setNewMsg(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url, type: file.type }]
      }));
    } catch (err) {
      console.error(err);
      alert("Eroare la încărcarea fișierului.");
    } finally {
      setIsUploading(false);
    }
  };

  const markAsRead = async (msg: Message) => {
    if (!msg.read && msg.receiverId === (isAdmin ? 'admin' : user.uid)) {
      try {
        await updateDoc(doc(db, 'messages', msg.id), { read: true });
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedMessage(msg);
    setView('content');
  };

  const deleteMessage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Sigur vrei să ștergi acest mesaj?")) {
      try {
        await deleteDoc(doc(db, 'messages', id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={16} />;
    if (type.includes('pdf')) return <FileText size={16} />;
    if (type.includes('sheet') || type.includes('excel')) return <Table size={16} />;
    return <Paperclip size={16} />;
  };

  return (
    <div className="flex h-[calc(100vh-160px)] lg:h-[calc(100vh-200px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
      {/* Sidebar Navigation */}
      <div className={`w-full lg:w-64 border-r border-slate-100 bg-slate-50/30 p-4 flex flex-col transition-all duration-300 ${view === 'sidebar' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}`}>
        <button 
          onClick={() => setIsComposing(true)}
          className="w-full bg-jss-green-dark text-white rounded-xl py-3 px-4 font-bold text-xs uppercase mb-6 shadow-lg shadow-jss-green-dark/20 flex items-center justify-center gap-2"
        >
          <Mail size={16} /> Compune Mesaj
        </button>

        <nav className="space-y-2">
          {[
            { id: 'inbox', icon: Inbox, label: 'Primite' },
            { id: 'sent', icon: SendHorizontal, label: 'Trimise' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { 
                setActiveTab(tab.id as any); 
                setSelectedMessage(null);
                setView('list');
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === tab.id ? 'bg-white text-jss-green-dark shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:bg-white/50'}`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={16} />
                {tab.label}
              </div>
              {tab.id === 'inbox' && messages.filter(m => !m.read).length > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {messages.filter(m => !m.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Message List */}
      <div className={`w-full lg:w-80 border-r border-slate-100 overflow-y-auto ${view === 'list' ? 'block' : 'hidden lg:block'}`}>
        <div className="lg:hidden p-4 border-b border-slate-100 flex items-center gap-2">
          <button onClick={() => setView('sidebar')} className="p-2 -ml-2 text-slate-400">
            <Inbox size={20} />
          </button>
          <h3 className="flex-1 font-bold text-sm text-jss-green-dark uppercase tracking-wider">
            {activeTab === 'inbox' ? 'Mesaje Primite' : 'Mesaje Trimise'}
          </h3>
        </div>
        {messages.length > 0 ? (
          <div>
            {messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => markAsRead(msg)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-jss-beige/20 relative group ${selectedMessage?.id === msg.id ? 'bg-jss-beige/30' : ''} ${!msg.read && activeTab === 'inbox' ? 'border-l-4 border-l-jss-green-light bg-blue-50/10' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-xs truncate ${!msg.read && activeTab === 'inbox' ? 'font-bold' : 'text-slate-500'}`}>
                    {activeTab === 'inbox' ? msg.senderName : (isAdmin ? (farmers.find(f => f.id === msg.receiverId)?.farmName || 'Către Ferma') : 'Departament Vanzari')}
                  </p>
                  <p className="text-[10px] opacity-40 font-mono">
                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <h4 className={`text-sm truncate mb-1 ${!msg.read && activeTab === 'inbox' ? 'font-bold text-jss-green-dark' : 'text-slate-700'}`}>
                  {msg.subject}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1">{msg.body}</p>
                
                <button 
                  onClick={(e) => deleteMessage(msg.id, e)}
                  className="absolute right-2 bottom-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-300 italic text-sm">Niciun mesaj.</div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 bg-slate-50/20 flex flex-col ${view === 'content' ? 'block' : 'hidden lg:flex'}`}>
        {selectedMessage ? (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="p-4 lg:p-8 bg-white border-b border-slate-100">
              <button 
                onClick={() => setView('list')}
                className="lg:hidden mb-4 flex items-center gap-1 text-xs font-bold text-jss-green-dark bg-jss-beige/50 px-3 py-1.5 rounded-lg"
              >
                ← Înapoi la listă
              </button>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-jss-green-dark mb-2">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-jss-green-dark text-jss-green-light flex items-center justify-center font-bold text-xs">
                      {selectedMessage.senderName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{selectedMessage.senderName}</p>
                      <p className="text-[10px] text-slate-400">
                        {selectedMessage.createdAt?.toDate().toLocaleString('ro-RO')}
                      </p>
                    </div>
                  </div>
                </div>
                <button 
                  className="bg-slate-50 hover:bg-slate-100 p-2 rounded-lg text-slate-400 transition-all"
                  onClick={() => setIsComposing(true)}
                  title="Răspunde"
                >
                  <Mail size={18} />
                </button>
              </div>

              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {selectedMessage.body}
              </div>
            </div>

            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div className="p-8 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip size={12} /> Atașamente ({selectedMessage.attachments.length})
                </p>
                <div className="flex flex-wrap gap-3">
                  {selectedMessage.attachments.map((file, i) => (
                    <a 
                      key={i} 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-jss-green-light transition-all shadow-sm group"
                    >
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-jss-green-light/10 transition-all">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-700 max-w-[120px] truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">Apasă pt. Vizualizare</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-slate-400 grayscale">
            <Mail size={80} className="mb-4" />
            <p className="font-serif italic">Selectează un mesaj pentru a-l citi.</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsComposing(false)}
              className="absolute inset-0 bg-jss-green-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-jss-green-dark p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Mail className="text-jss-green-light" />
                  <h3 className="text-lg font-serif font-bold">
                    {isAdmin ? 'Trimite Mesaj către Fermă' : 'Trimite Mesaj către Departamentul Vânzări'}
                  </h3>
                </div>
                <button onClick={() => setIsComposing(false)} className="hover:bg-white/10 p-2 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="p-8 space-y-6">
                {isAdmin && (
                  <div className="space-y-1">
                    <label className="data-tag">Destinatar (Fermier)</label>
                    <select 
                      required
                      value={newMsg.receiverId}
                      onChange={(e) => setNewMsg({...newMsg, receiverId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-jss-green-light/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Selectează o fermă...</option>
                      {farmers.map(f => (
                        <option key={f.id} value={f.id}>{f.farmName || f.displayName} ({f.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="data-tag">Subiect</label>
                  <input 
                    required
                    type="text"
                    placeholder="Subiectul mesajului..."
                    value={newMsg.subject}
                    onChange={(e) => setNewMsg({...newMsg, subject: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-jss-green-light/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="data-tag">Conținut Mesaj</label>
                  <textarea 
                    required
                    rows={8}
                    placeholder="Scrie mesajul aici..."
                    value={newMsg.body}
                    onChange={(e) => setNewMsg({...newMsg, body: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-jss-green-light/50 outline-none transition-all resize-none"
                  />
                </div>

                {/* Attachments Display */}
                {newMsg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newMsg.attachments.map((file, i) => (
                      <div key={i} className="bg-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold">
                        {getFileIcon(file.type)}
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setNewMsg(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }))}
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <label className={`cursor-pointer group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-jss-green-primary transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv" />
                    <Paperclip size={18} className="group-hover:rotate-45 transition-all duration-300" />
                    {isUploading ? 'Se încarcă...' : 'Atașează Document (PDF, JPG, Excel)'}
                  </label>

                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="bg-jss-green-dark text-white rounded-xl px-8 py-3 font-bold text-xs uppercase flex items-center gap-2 hover:translate-x-1 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    Trimite Mesaj <Send size={16} />
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
