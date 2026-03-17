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

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', category: '', icon: 'fa-link', description: '' });


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
    
    const isFileUpload = form.icon instanceof File;
    
    if (isFileUpload) {
      const data = new FormData();
      data.append('title', form.title);
      data.append('url', form.url);
      data.append('category', form.category);
      data.append('description', form.description);
      data.append('icon', form.icon);
      
      if (editing) {
        await axios.put(`/api/bookmarks/${editing.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/api/bookmarks', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    } else {
      if (editing) {
        await axios.put(`/api/bookmarks/${editing.id}`, form);
      } else {
        await axios.post('/api/bookmarks', form);
      }
    }
    
    setShowModal(false);
    setForm({ title: '', url: '', category: '', icon: 'fa-link', description: '' });
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
            placeholder="搜索书签、链接等..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary" onClick={openModal} style={{ borderRadius: '50px', padding: '8px 16px', fontSize: '14px' }}>
          <i className="fas fa-plus"></i> 添加资源
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="empty">暂无书签，点击添加</div>
      ) : selectedCategory ? (
        <div className="bookmarks-grid">
          {bookmarks.map(bookmark => (
            <div key={bookmark.id} className="bookmark-card" onClick={() => handleClick(bookmark)}>
              <div className="bookmark-icon">
                {bookmark.icon?.startsWith('/uploads') ? (
                  <img src={bookmark.icon} alt="" />
                ) : getFavicon(bookmark.url) ? (
                  <img src={getFavicon(bookmark.url)} alt="" />
                ) : (
                  <i className={`fas ${bookmark.icon || 'fa-link'}`}></i>
                )}
              </div>
              <div className="bookmark-info">
                <h3>{bookmark.title}</h3>
                <p className="bookmark-url">{bookmark.description || bookmark.url}</p>
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
          ))}
        </div>
      ) : (
        <div className="category-sections">
          {categories.map(cat => {
            const catBookmarks = bookmarks.filter(b => b.category === cat);
            if (catBookmarks.length === 0) return null;
            return (
              <div key={cat} className="category-section">
                <h3 className="category-title">{cat}</h3>
                <div className="bookmarks-grid">
                  {catBookmarks.map(bookmark => (
                    <div key={bookmark.id} className="bookmark-card" onClick={() => handleClick(bookmark)}>
                      <div className="bookmark-icon">
                        {bookmark.icon?.startsWith('/uploads') ? (
                          <img src={bookmark.icon} alt="" />
                        ) : getFavicon(bookmark.url) ? (
                          <img src={getFavicon(bookmark.url)} alt="" />
                        ) : (
                          <i className={`fas ${bookmark.icon || 'fa-link'}`}></i>
                        )}
                      </div>
                      <div className="bookmark-info">
                        <h3>{bookmark.title}</h3>
                        <p className="bookmark-url">{bookmark.description || bookmark.url}</p>
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

