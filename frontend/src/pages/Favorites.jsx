import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
};

export default function Favorites() {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', category: '', icon: 'fa-link', description: '' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchFavorites();
    fetchCategories();
  }, [selectedCategory, search]);

  const fetchFavorites = async () => {
    const res = await axios.get('/api/favorites');
    let data = res.data;
    
    if (selectedCategory) {
      data = data.filter(f => f.category === selectedCategory);
    }
    if (search) {
      data = data.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) || f.url.toLowerCase().includes(search.toLowerCase()));
    }
    setFavorites(data);
  };

  const fetchCategories = async () => {
    const res = await axios.get('/api/favorites/categories');
    setCategories(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    const isFileUpload = form.icon instanceof File;
    
    if (isFileUpload) {
      const data = new FormData();
      data.append('title', form.title);
      data.append('url', form.url);
      data.append('category', form.category);
      data.append('description', form.description);
      data.append('icon', form.icon);
      
      if (editing) {
        await axios.put(`/api/favorites/${editing.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/api/favorites', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    } else {
      if (editing) {
        await axios.put(`/api/favorites/${editing.id}`, form);
      } else {
        await axios.post('/api/favorites', form);
      }
    }
    
    setShowModal(false);
    setForm({ title: '', url: '', category: '', icon: 'fa-link', description: '' });
    setEditing(null);
    fetchFavorites();
  };

  const handleEdit = (favorite) => {
    if (!isAdmin) return;
    setEditing(favorite);
    setForm(favorite);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (confirm('确定删除？')) {
      await axios.delete(`/api/favorites/${id}`);
      fetchFavorites();
    }
  };

  const handleClick = async (favorite) => {
    await axios.post(`/api/favorites/${favorite.id}/click`);
    setFavorites(prev => prev.map(f => 
      f.id === favorite.id ? { ...f, clickCount: f.clickCount + 1 } : f
    ));
    window.open(favorite.url, '_blank');
  };

  const openModal = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ title: '', url: '', category: selectedCategory || '', icon: 'fa-link', description: '' });
    setShowModal(true);
  };

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
        <h1 className="slogan" style={{ color: '#6a696dff' }}>
          {user?.username || 'zaiyebuhui'}{new Date().getFullYear()}'s <span className="slogan-highlight">资源库</span>
        </h1>
      </div>

      <div className="toolbar" style={{ maxWidth: '900px', margin: '0 auto 24px' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <select
            className="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">全部分类</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="text"
            className="search-input"
            placeholder="搜索收藏、链接..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={openModal} style={{ borderRadius: '50px', padding: '8px 16px', fontSize: '14px' }}>
            <i className="fas fa-plus"></i> 添加收藏
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="empty">暂无收藏</div>
      ) : selectedCategory ? (
        <div className="bookmarks-grid">
          {favorites.map(favorite => (
            <div key={favorite.id} className="bookmark-card" onClick={() => handleClick(favorite)}>
              <div className="bookmark-icon">
                {favorite.icon?.startsWith('/uploads') ? (
                  <img src={favorite.icon} alt="" />
                ) : getFavicon(favorite.url) ? (
                  <img src={getFavicon(favorite.url)} alt="" />
                ) : (
                  <i className={`fas ${favorite.icon || 'fa-link'}`}></i>
                )}
              </div>
              <div className="bookmark-info">
                <h3>{favorite.title}</h3>
                <p className="bookmark-url">{favorite.description || favorite.url}</p>
                <span className="bookmark-category">{favorite.category}</span>
              </div>
              {isAdmin && (
                <div className="bookmark-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(favorite)}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(favorite.id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              )}
              {favorite.clickCount > 0 && (
                <div className="bookmark-count"><i className="fas fa-eye"></i> {favorite.clickCount}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
          <div className="category-sections">
            {categories.map(cat => {
              const catFavorites = favorites.filter(f => f.category === cat);
              if (catFavorites.length === 0) return null;
              return (
                <div key={cat} className="category-section">
                  <h3 className="category-title">{cat}</h3>
                  <div className="bookmarks-grid">
                    {catFavorites.map(favorite => (
                      <div key={favorite.id} className="bookmark-card" onClick={() => handleClick(favorite)}>
                        <div className="bookmark-icon">
                          {favorite.icon?.startsWith('/uploads') ? (
                            <img src={favorite.icon} alt="" />
                          ) : getFavicon(favorite.url) ? (
                            <img src={getFavicon(favorite.url)} alt="" />
                          ) : (
                            <i className={`fas ${favorite.icon || 'fa-link'}`}></i>
                          )}
                        </div>
                        <div className="bookmark-info">
                          <h3>{favorite.title}</h3>
                          <p className="bookmark-url">{favorite.description || favorite.url}</p>
                        </div>
                        {isAdmin && (
                          <div className="bookmark-actions" onClick={e => e.stopPropagation()}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(favorite)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(favorite.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )}
                        {favorite.clickCount > 0 && (
                          <div className="bookmark-count"><i className="fas fa-eye"></i> {favorite.clickCount}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? '编辑收藏' : '添加收藏'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">标题</label>
                <input
                  type="text"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">URL</label>
                <input
                  type="url"
                  className="input"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">分类</label>
                <input
                  type="text"
                  className="input"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
                <datalist id="category-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">图标</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {form.icon instanceof File ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={URL.createObjectURL(form.icon)} alt="预览" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                      <button type="button" className="btn btn-secondary" onClick={() => setForm({ ...form, icon: 'fa-link' })} style={{ padding: '6px 12px', fontSize: '12px' }}>
                        清除
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        <i className="fas fa-upload"></i> 上传图片
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setForm({ ...form, icon: file });
                            }
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="label">描述</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="简短描述（可选）"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
