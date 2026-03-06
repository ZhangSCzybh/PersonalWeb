import { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

export default function Dashboard() {
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', category: '', icon: 'fa-link' });

  useEffect(() => {
    fetchBookmarks();
    fetchCategories();
  }, [selectedCategory, search]);

  const fetchBookmarks = async () => {
    const params = {};
    if (selectedCategory) params.category = selectedCategory;
    if (search) params.search = search;
    const res = await axios.get('/api/bookmarks', { params });
    setBookmarks(res.data);
  };

  const fetchCategories = async () => {
    const res = await axios.get('/api/bookmarks/categories');
    setCategories(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      await axios.put(`/api/bookmarks/${editing.id}`, form);
    } else {
      await axios.post('/api/bookmarks', form);
    }
    setShowModal(false);
    setForm({ title: '', url: '', category: '', icon: 'fa-link' });
    setEditing(null);
    fetchBookmarks();
  };

  const handleEdit = (bookmark) => {
    setEditing(bookmark);
    setForm(bookmark);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除？')) {
      await axios.delete(`/api/bookmarks/${id}`);
      fetchBookmarks();
    }
  };

  const handleClick = async (bookmark) => {
    await axios.post(`/api/bookmarks/${bookmark.id}/click`);
    setBookmarks(prev => prev.map(b => 
      b.id === bookmark.id ? { ...b, clickCount: b.clickCount + 1 } : b
    ));
    window.open(bookmark.url, '_blank');
  };

  const openModal = () => {
    setEditing(null);
    setForm({ title: '', url: '', category: selectedCategory || '', icon: 'fa-link' });
    setShowModal(true);
  };

  return (
    <div className="page">
      <div className="page-header flex-between">
        <h1 className="page-title">资源导航</h1>
        <button className="btn btn-primary" onClick={openModal}>
          <i className="fas fa-plus"></i> 添加书签
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="input search-input"
          placeholder="搜索书签..."
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
        {bookmarks.length === 0 ? (
          <div className="empty">暂无书签，点击添加</div>
        ) : (
          bookmarks.map(bookmark => (
            <div key={bookmark.id} className="bookmark-card" onClick={() => handleClick(bookmark)}>
              <div className="bookmark-icon">
                <i className={`fas ${bookmark.icon || 'fa-link'}`}></i>
              </div>
              <div className="bookmark-info">
                <h3>{bookmark.title}</h3>
                <p className="bookmark-url">{bookmark.url}</p>
                <span className="bookmark-category">{bookmark.category}</span>
              </div>
              <div className="bookmark-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(bookmark)}>
                  <i className="fas fa-edit"></i>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bookmark.id)}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              {bookmark.clickCount > 0 && (
                <div className="bookmark-count"><i className="fas fa-eye"></i> {bookmark.clickCount}</div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? '编辑书签' : '添加书签'}</h2>
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
