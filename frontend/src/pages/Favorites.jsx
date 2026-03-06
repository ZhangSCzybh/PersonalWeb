import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

export default function Favorites() {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', category: '', icon: 'fa-link' });

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
    
    if (editing) {
      await axios.put(`/api/favorites/${editing.id}`, form);
    } else {
      await axios.post('/api/favorites', form);
    }
    setShowModal(false);
    setForm({ title: '', url: '', category: '', icon: 'fa-link' });
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
    setForm({ title: '', url: '', category: selectedCategory || '', icon: 'fa-link' });
    setShowModal(true);
  };

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">收藏夹</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openModal}>
            <i className="fas fa-plus"></i> 添加收藏
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="input search-input"
          placeholder="搜索收藏..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="bookmarks-grid">
        {favorites.length === 0 ? (
          <div className="empty">暂无收藏</div>
        ) : (
          favorites.map(favorite => (
            <div key={favorite.id} className="bookmark-card" onClick={() => handleClick(favorite)}>
              <div className="bookmark-icon">
                <i className={`fas ${favorite.icon || 'fa-link'}`}></i>
              </div>
              <div className="bookmark-info">
                <h3>{favorite.title}</h3>
                <p className="bookmark-url">{favorite.url}</p>
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
          ))
        )}
      </div>

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
                <select
                  className="select"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                >
                  <option value="fa-link">🔗 链接</option>
                  <option value="fa-book">📚 书籍</option>
                  <option value="fa-video">🎬 视频</option>
                  <option value="fa-music">🎵 音乐</option>
                  <option value="fa-gamepad">🎮 游戏</option>
                  <option value="fa-code">💻 开发</option>
                  <option value="fa-shopping-cart">🛒 购物</option>
                  <option value="fa-newspaper">📰 新闻</option>
                </select>
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
