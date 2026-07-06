import React, { useState } from 'react';
import { Article } from '../types';
import { Search, Plus, Package, Edit2, Trash2, Tag, X, Save, Layers, RefreshCw, AppWindow } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { PREDEFINED_ARTICLES } from '../constants';

interface ArticlesProps {
  articles: Article[];
  onAddArticle: (article: Article) => void;
  onUpdateArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
}

const Articles: React.FC<ArticlesProps> = ({ articles, onAddArticle, onUpdateArticle, onDeleteArticle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.ref.toLowerCase().includes(searchTerm.toLowerCase());
    
    const itemCat = a.category || 'Autres';
    const matchesCat = selectedCategory === 'all' || itemCat.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCat;
  });

  const loadPredefinedTemplates = () => {
    if (confirm("Voulez-vous charger toutes les références d'articles prédéfinies pour Coworking et Call Center ?")) {
      let addedCount = 0;
      PREDEFINED_ARTICLES.forEach(pa => {
        // Only load if it doesn't already exist in the user's list
        const alreadyExists = articles.some(art => art.ref.toLowerCase() === pa.ref.toLowerCase());
        if (!alreadyExists) {
          onAddArticle({
            id: pa.id + '-' + Date.now(),
            ref: pa.ref,
            name: pa.name,
            price: pa.price,
            tva: pa.tva,
            unit: pa.unit,
            category: pa.category
          });
          addedCount++;
        }
      });
      alert(`${addedCount} article(s) prédéfini(s) ont été importés avec succès.`);
    }
  };

  const handleOpenModal = (article?: Article) => {
    setCurrentArticle(article || {
      id: 'art-' + Date.now(),
      ref: '',
      name: '',
      price: 0,
      tva: 19,
      unit: 'Unité',
      category: 'Autres'
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (currentArticle && currentArticle.name && currentArticle.ref) {
      if (articles.find(a => a.id === currentArticle.id)) {
        onUpdateArticle(currentArticle as Article);
      } else {
        onAddArticle(currentArticle as Article);
      }
      setIsModalOpen(false);
    }
  };

  const labelStyle = "block text-[10px] font-black text-[#7A776F] mb-1.5 uppercase tracking-widest";
  const inputStyle = "w-full px-4 py-3 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl focus:border-[#1A56DB] outline-none transition-all placeholder:text-[#B0ADA5] font-semibold text-xs";

  return (
    <div className="p-7 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#14120E]">Catalogue Articles</h2>
          <p className="text-xs text-[#7A776F] mt-1">{articles.length} article(s) au catalogue</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadPredefinedTemplates}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            title="Charger les modèles par défaut"
          >
            <RefreshCw size={14} className="animate-spin-slow" /> Charger Références Modèles
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-lg active:scale-95"
          >
            <Plus size={16} /> Nouvel Article
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-[#FAF8F4] border border-[#E4E0D8]/60 rounded-xl max-w-md">
        {['all', 'Coworking', 'Call Center', 'Autres'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              selectedCategory === cat
                ? 'bg-white text-[#1A56DB] border border-[#E4E0D8]/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {cat === 'all' ? 'Tous' : cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E4E0D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E4E0D8] flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher par désignation ou réf..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1EDE5] text-[#7A776F] uppercase text-[9px] font-bold">
              <tr>
                <th className="px-5 py-4">Article</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Prix HT</th>
                <th className="px-5 py-4">TVA</th>
                <th className="px-5 py-4">Unité</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#B0ADA5] italic">
                    Aucun article trouvé.
                  </td>
                </tr>
              ) : (
                filteredArticles.map(article => {
                  const cat = article.category || 'Autres';
                  return (
                    <tr key={article.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] text-[#7A776F] flex items-center justify-center">
                            <Tag size={12} />
                          </div>
                          <span className="font-bold text-[#14120E]">{article.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          cat.toLowerCase() === 'coworking'
                            ? 'bg-blue-100/70 text-blue-700 border border-blue-200'
                            : cat.toLowerCase() === 'call center'
                            ? 'bg-violet-100/70 text-violet-700 border border-violet-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                          {cat}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[#1A56DB] font-semibold">{article.ref}</td>
                      <td className="px-5 py-4 font-mono font-bold text-[#14120E]">
                        {formatCurrency(article.price, 'DT')}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#E6F8F4] text-[#0E7866] text-[10px] font-bold">
                          {article.tva}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#7A776F] uppercase font-bold text-[10px]">
                        {article.unit}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(article)}
                            className="p-2 text-[#7A776F] hover:bg-[#EBF2FF] hover:text-[#1A56DB] rounded-lg transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Supprimer cet article ?')) onDeleteArticle(article.id); }}
                            className="p-2 text-[#C0280F]/60 hover:bg-[#FFF1EE] hover:text-[#C0280F] rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Article Modal */}
      <AnimatePresence>
        {isModalOpen && currentArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#14120E]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E4E0D8] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#E4E0D8] flex justify-between items-center">
                <h3 className="text-lg font-black text-[#14120E] uppercase tracking-widest">
                  {articles.find(a => a.id === currentArticle.id) ? 'Modifier Article' : 'Nouvel Article'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="outline-none">
                  <X className="text-[#7A776F] hover:text-[#C0280F]" size={20} />
                </button>
              </div>

              <div className="p-8 space-y-5">
                {/* Predefined models quick selector */}
                {!articles.find(a => a.id === currentArticle.id) && (
                  <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl">
                    <label className={`${labelStyle} text-amber-900`}>✍️ Remplir depuis un modèle prédéfini</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const model = PREDEFINED_ARTICLES.find(m => m.id === val);
                          if (model) {
                            setCurrentArticle({
                              ...currentArticle,
                              ref: model.ref,
                              name: model.name,
                              price: model.price,
                              tva: model.tva,
                              unit: model.unit,
                              category: model.category
                            });
                          }
                        }
                      }}
                      className={`${inputStyle} bg-white h-10 border-amber-200 focus:border-amber-500 font-bold`}
                      defaultValue=""
                    >
                      <option value="">-- Choisir un modèle --</option>
                      <optgroup label="Espace Coworking">
                        {PREDEFINED_ARTICLES.filter(m => m.category === 'Coworking').map(m => (
                          <option key={m.id} value={m.id}>{m.ref} - {m.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Call Center">
                        {PREDEFINED_ARTICLES.filter(m => m.category === 'Call Center').map(m => (
                          <option key={m.id} value={m.id}>{m.ref} - {m.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Catégorie</label>
                    <select
                      value={currentArticle.category || 'Autres'}
                      onChange={e => setCurrentArticle({...currentArticle, category: e.target.value})}
                      className={`${inputStyle} bg-white`}
                    >
                      <option value="Coworking">Coworking</option>
                      <option value="Call Center">Call Center</option>
                      <option value="Autres">Autres</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Référence</label>
                    <input 
                      value={currentArticle.ref}
                      onChange={e => setCurrentArticle({...currentArticle, ref: e.target.value})}
                      placeholder="Ex: ART-001"
                      className={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Désignation</label>
                  <input 
                    value={currentArticle.name}
                    onChange={e => setCurrentArticle({...currentArticle, name: e.target.value})}
                    placeholder="Ex: Laptop Dell XPS"
                    className={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>Prix HT (DT)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={currentArticle.price ?? 0}
                      onChange={e => setCurrentArticle({...currentArticle, price: parseFloat(e.target.value) || 0})}
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Taux TVA (%)</label>
                    <select 
                      value={currentArticle.tva}
                      onChange={e => setCurrentArticle({...currentArticle, tva: parseInt(e.target.value)})}
                      className={inputStyle}
                    >
                      <option value={7}>7%</option>
                      <option value={13}>13%</option>
                      <option value={19}>19%</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Unité</label>
                    <input 
                      value={currentArticle.unit}
                      onChange={e => setCurrentArticle({...currentArticle, unit: e.target.value})}
                      placeholder="Ex: H, J, PCS"
                      className={inputStyle}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full bg-[#1A56DB] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#1648C4] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> ENREGISTRER L'ARTICLE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Articles;
