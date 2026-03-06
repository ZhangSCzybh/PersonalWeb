import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Wardrobe.css';

const COLORS = [
  { value: 'black', label: '黑色系', color: '#1a1a1a' },
  { value: 'white', label: '白色系', color: '#f5f5f5' },
  { value: 'gray', label: '灰色系', color: '#9ca3af' },
  { value: 'red', label: '红色系', color: '#ef4444' },
  { value: 'yellow', label: '黄色系', color: '#eab308' },
  { value: 'green', label: '绿色系', color: '#22c55e' },
  { value: 'brown', label: '褐色系', color: '#92400e' },
  { value: 'purple', label: '紫色系', color: '#a855f7' },
  { value: 'blue', label: '蓝色系', color: '#3b82f6' },
  { value: 'multi', label: '彩色系', color: 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)' },
];

const SEASONS = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

const OCCASIONS = [
  { value: 'daily', label: '日常' },
  { value: 'date', label: '约会' },
  { value: 'commute', label: '通勤' },
  { value: 'formal', label: '正式' },
  { value: 'sports', label: '运动' },
  { value: 'outdoor', label: '户外' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function Wardrobe() {
  const [activeTab, setActiveTab] = useState('wardrobe');
  const [categories, setCategories] = useState([]);
  const [clothes, setClothes] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    category_id: '',
    color: '',
    season: '',
    rating: '',
    search: ''
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingClothing, setEditingClothing] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    category_id: '',
    sub_category: '',
    image: null,
    imagePreview: null,
    color: 'gray',
    rating: 3,
    season: [],
    brand: '',
    fabric: '',
    size: '',
    tags: '',
    price: '',
    purchase_date: '',
    notes: ''
  });

  const [aiMode, setAiMode] = useState('custom');
  const [aiSeason, setAiSeason] = useState('spring');
  const [aiOccasion, setAiOccasion] = useState('daily');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedClothes, setSelectedClothes] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchClothes();
    fetchOutfits();
  }, []);

  useEffect(() => {
    fetchClothes();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/wardrobe/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchClothes = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.color) params.append('color', filters.color);
      if (filters.season) params.append('season', filters.season);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.search) params.append('search', filters.search);
      
      const res = await axios.get(`/api/wardrobe/clothes?${params}`);
      setClothes(res.data);
    } catch (err) {
      console.error('Failed to fetch clothes:', err);
    }
  };

  const fetchOutfits = async () => {
    try {
      const res = await axios.get('/api/wardrobe/outfits');
      setOutfits(res.data);
    } catch (err) {
      console.error('Failed to fetch outfits:', err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSeasonToggle = (season) => {
    setUploadForm(prev => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter(s => s !== season)
        : [...prev.season, season]
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.category_id) {
      alert('请选择分类');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (uploadForm.image instanceof File) {
        formData.append('image', uploadForm.image);
      }
      formData.append('category_id', uploadForm.category_id);
      formData.append('sub_category', uploadForm.sub_category);
      formData.append('color', uploadForm.color);
      formData.append('rating', uploadForm.rating);
      formData.append('season', uploadForm.season.join(',') || '');
      formData.append('brand', uploadForm.brand);
      formData.append('fabric', uploadForm.fabric);
      formData.append('size', uploadForm.size);
      formData.append('tags', uploadForm.tags);
      formData.append('price', uploadForm.price);
      formData.append('purchase_date', uploadForm.purchase_date);
      formData.append('notes', uploadForm.notes);

      if (editingClothing) {
        await axios.put(`/api/wardrobe/clothes/${editingClothing.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post('/api/wardrobe/clothes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowUploadModal(false);
      resetUploadForm();
      fetchClothes();
    } catch (err) {
      console.error('Failed to upload:', err);
      alert('上传失败');
    } finally {
      setLoading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      category_id: '',
      sub_category: '',
      image: null,
      imagePreview: null,
      color: 'gray',
      rating: 3,
      season: [],
      brand: '',
      fabric: '',
      size: '',
      tags: '',
      price: '',
      purchase_date: '',
      notes: ''
    });
    setEditingClothing(null);
  };

  const handleEdit = (clothing) => {
    setEditingClothing(clothing);
    setUploadForm({
      category_id: String(clothing.category_id),
      sub_category: clothing.sub_category || '',
      image: null,
      imagePreview: clothing.image_url,
      color: clothing.color || 'gray',
      rating: clothing.rating || 3,
      season: clothing.season ? clothing.season.split(',') : [],
      brand: clothing.brand || '',
      fabric: clothing.fabric || '',
      size: clothing.size || '',
      tags: clothing.tags || '',
      price: clothing.price || '',
      purchase_date: clothing.purchase_date || '',
      notes: clothing.notes || ''
    });
    setShowUploadModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这件服饰吗？')) return;
    try {
      await axios.delete(`/api/wardrobe/clothes/${id}`);
      fetchClothes();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleSelectClothing = (clothing) => {
    if (selectedClothes.find(c => c.id === clothing.id)) {
      setSelectedClothes(selectedClothes.filter(c => c.id !== clothing.id));
    } else if (selectedClothes.length < 4) {
      setSelectedClothes([...selectedClothes, clothing]);
    }
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setAiResult(null);

    try {
      const res = await axios.post('/api/ai/fashion-generate', {
        mode: aiMode,
        season: aiSeason,
        occasion: aiOccasion,
        prompt: aiPrompt,
        selected_clothes: selectedClothes.map(c => c.id)
      }, {
        timeout: 180000
      });

      if (res.data.success) {
        setAiResult(res.data.data);
        
        if (res.data.data.ai_image_url) {
          await axios.post('/api/wardrobe/outfits', {
            name: `AI穿搭-${new Date().toLocaleDateString()}`,
            occasion: aiOccasion,
            season: aiSeason,
            ai_image_url: res.data.data.ai_image_url,
            ai_suggestion: res.data.data.ai_suggestion,
            items: selectedClothes.map((c, idx) => ({
              clothes_id: c.id,
              type: idx === 0 ? 'top' : idx === 1 ? 'bottom' : idx === 2 ? 'shoes' : 'bag'
            }))
          });
          fetchOutfits();
        }
      } else {
        alert(res.data.error || '生成失败');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('AI生成失败，请稍后重试');
    } finally {
      setAiGenerating(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === parseInt(filters.category_id));
  const selectedUploadCategory = uploadForm.category_id ? categories.find(c => c.id === parseInt(uploadForm.category_id)) : null;

  return (
    <div className="wardrobe-page">
      <div className="page-header">
        <h1 className="page-title">衣橱管理</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => setActiveTab('wardrobe')}
        >
          我的衣橱
        </button>
        <button
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI 穿搭
        </button>
      </div>

      {activeTab === 'wardrobe' && (
        <div className="wardrobe-content">
          <div className="filters-bar">
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="filter-select"
            >
              <option value="">全部分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={filters.color}
              onChange={(e) => setFilters({ ...filters, color: e.target.value })}
              className="filter-select"
            >
              <option value="">全部颜色</option>
              {COLORS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={filters.season}
              onChange={(e) => setFilters({ ...filters, season: e.target.value })}
              className="filter-select"
            >
              <option value="">全部季节</option>
              {SEASONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
              className="filter-select"
            >
              <option value="">全部喜好</option>
              {[5, 4, 3, 2, 1].map(r => (
                <option key={r} value={r}>{'★'.repeat(r)}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="搜索品牌/标签/备注"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />

            <button className="add-btn" onClick={() => { resetUploadForm(); setShowUploadModal(true); }}>
              + 添加服饰
            </button>
          </div>

          <div className="category-tabs">
            {categories.map(cat => (
              <div key={cat.id} className="category-tab">
                <span className="category-name">{cat.name}</span>
                <span className="category-count">
                  {clothes.filter(c => c.category_id === cat.id || c.parent_category === cat.name).length}
                </span>
              </div>
            ))}
          </div>

          <div className="clothes-grid">
            {clothes.map(item => (
              <div key={item.id} className="clothing-card">
                <div className="clothing-image">
                  <img src={item.image_url} alt={item.category_name} />
                </div>
                <div className="clothing-info">
                  <div className="clothing-rating">
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </div>
                  <div className="clothing-meta">
                    <span className="color-dot" style={{ background: COLORS.find(c => c.value === item.color)?.color }}></span>
                    <span>{item.category_name}</span>
                  </div>
                  {item.season && (
                    <div className="clothing-seasons">
                      {item.season.split(',').map(s => (
                        <span key={s} className="season-tag">{SEASONS.find(se => se.value === s)?.label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="clothing-actions">
                  <button onClick={() => handleEdit(item)}>编辑</button>
                  <button onClick={() => handleDelete(item.id)} className="delete-btn">删除</button>
                </div>
              </div>
            ))}
          </div>

          {clothes.length === 0 && (
            <div className="empty-state">
              <p>暂无服饰，点击"添加服饰"开始管理你的衣橱</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="ai-content">
          <div className="ai-controls">
            <div className="mode-selector">
              <button
                className={`mode-btn ${aiMode === 'custom' ? 'active' : ''}`}
                onClick={() => setAiMode('custom')}
              >
                自定义搭配
              </button>
              <button
                className={`mode-btn ${aiMode === 'random' ? 'active' : ''}`}
                onClick={() => setAiMode('random')}
              >
                随机穿搭
              </button>
            </div>

            {aiMode === 'custom' && (
              <div className="select-clothes-section">
                <h3>选择服饰 (已选 {selectedClothes.length})</h3>
                <div className="selectable-clothes">
                  {clothes.map(item => (
                    <div
                      key={item.id}
                      className={`selectable-item ${selectedClothes.find(c => c.id === item.id) ? 'selected' : ''}`}
                      onClick={() => handleSelectClothing(item)}
                    >
                      <img src={item.image_url} alt={item.category_name} />
                      <div className="item-type">{item.category_name}</div>
                    </div>
                  ))}
                </div>
                {selectedClothes.length > 0 && (
                  <div className="selected-summary">
                    已选: {selectedClothes.map(c => c.category_name).join(' + ')}
                    <button onClick={() => setSelectedClothes([])}>清除</button>
                  </div>
                )}
              </div>
            )}

            <div className="ai-options">
              <div className="option-group">
                <label>目标季节</label>
                <div className="option-buttons">
                  {SEASONS.map(s => (
                    <button
                      key={s.value}
                      className={aiSeason === s.value ? 'active' : ''}
                      onClick={() => setAiSeason(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label>场合</label>
                <div className="option-buttons">
                  {OCCASIONS.map(o => (
                    <button
                      key={o.value}
                      className={aiOccasion === o.value ? 'active' : ''}
                      onClick={() => setAiOccasion(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label>描述关键字（可选）</label>
                <input
                  type="text"
                  placeholder="如：简约、商务、甜美..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="prompt-input"
                />
              </div>
            </div>

            <button
              className="generate-btn"
              onClick={handleAIGenerate}
              disabled={aiGenerating}
            >
              {aiGenerating ? '生成中...' : '开始生成穿搭'}
            </button>
          </div>

          <div className="ai-results">
            {aiGenerating && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>AI 正在生成穿搭，请稍候...</p>
              </div>
            )}

            {aiResult && (
              <div className="result-section">
                <h3>生成结果</h3>
                {aiResult.ai_image_url && (
                  <div className="result-image">
                    <img src={aiResult.ai_image_url} alt="AI穿搭" />
                  </div>
                )}
                {aiResult.ai_suggestion && (
                  <div className="result-suggestion">
                    <h4>搭配建议</h4>
                    <p>{aiResult.ai_suggestion}</p>
                  </div>
                )}
              </div>
            )}

            {!aiGenerating && !aiResult && (
              <div className="empty-results">
                <div className="empty-icon">👔</div>
                <p>选择季节和场合</p>
                <p>点击"开始生成穿搭"创建AI搭配</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingClothing ? '编辑服饰' : '添加服饰'}</h2>
            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label>图片 *</label>
                <div
                  className="image-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadForm.imagePreview ? (
                    <img src={uploadForm.imagePreview} alt="Preview" />
                  ) : (
                    <div className="upload-placeholder">
                      <span>点击上传图片</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>分类 *</label>
                  <select
                    value={uploadForm.category_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, category_id: e.target.value, sub_category: '' })}
                    required
                  >
                    <option value="">选择分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>子分类</label>
                  <select
                    value={uploadForm.sub_category}
                    onChange={(e) => setUploadForm({ ...uploadForm, sub_category: e.target.value })}
                  >
                    <option value="">选择子分类</option>
                    {selectedUploadCategory?.subCategories?.map(sub => (
                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>颜色 *</label>
                  <div className="color-options">
                    {COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        className={`color-btn ${uploadForm.color === c.value ? 'active' : ''}`}
                        style={{ background: c.color }}
                        onClick={() => setUploadForm({ ...uploadForm, color: c.value })}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>喜好值 *</label>
                  <div className="rating-options">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        type="button"
                        className={`star-btn ${r <= uploadForm.rating ? 'active' : ''}`}
                        onClick={() => setUploadForm({ ...uploadForm, rating: r })}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>季节 *</label>
                <div className="season-options">
                  {SEASONS.map(s => (
                    <label key={s.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={uploadForm.season.includes(s.value)}
                        onChange={() => handleSeasonToggle(s.value)}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>品牌</label>
                  <input
                    type="text"
                    value={uploadForm.brand}
                    onChange={(e) => setUploadForm({ ...uploadForm, brand: e.target.value })}
                    placeholder="品牌名称"
                  />
                </div>

                <div className="form-group">
                  <label>面料</label>
                  <input
                    type="text"
                    value={uploadForm.fabric}
                    onChange={(e) => setUploadForm({ ...uploadForm, fabric: e.target.value })}
                    placeholder="面料材质"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>尺码</label>
                  <select
                    value={uploadForm.size}
                    onChange={(e) => setUploadForm({ ...uploadForm, size: e.target.value })}
                  >
                    <option value="">选择尺码</option>
                    {SIZES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>价格</label>
                  <input
                    type="number"
                    value={uploadForm.price}
                    onChange={(e) => setUploadForm({ ...uploadForm, price: e.target.value })}
                    placeholder="价格（元）"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>购买时间</label>
                <input
                  type="date"
                  value={uploadForm.purchase_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, purchase_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>标签</label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="标签，用逗号分隔"
                />
              </div>

              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  rows={3}
                  placeholder="备注信息"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowUploadModal(false)}>
                  取消
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? '上传中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
