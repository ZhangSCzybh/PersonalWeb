import { useState, useEffect } from 'react';
import axios from 'axios';
import './Users.css';

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  date.setHours(date.getHours() + 8);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/auth/register', form);
      setShowModal(false);
      setForm({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该用户吗？')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const roleLabels = {
    admin: '管理员',
    user: '普通用户',
    ev: '新能源用户',
    resource: '资源用户',
    game: '游戏用户',
    fashion: '穿搭用户'
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>用户管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> 添加用户
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td><span className={`role-badge role-${user.role}`}>{roleLabels[user.role] || user.role}</span></td>
                  <td>{formatTime(user.createdAt)}</td>
                  <td>{formatTime(user.lastLoginAt)}</td>
                  <td>
                    <button className="btn btn-primary" onClick={() => {
                      setEditingUser(user);
                      setPasswordForm({ password: '', confirmPassword: '' });
                      setShowPasswordModal(true);
                    }}>
                      <i className="fas fa-key"></i> 修改密码
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(user.id)} style={{ marginLeft: '8px' }}>
                      <i className="fas fa-trash"></i> 删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加用户</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">普通用户</option>
                  <option value="ev">新能源用户</option>
                  <option value="resource">资源用户</option>
                  <option value="game">游戏用户</option>
                  <option value="fashion">穿搭用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {error && <p className="error-message">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>修改密码 - {editingUser?.username}</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (passwordForm.password !== passwordForm.confirmPassword) {
                alert('两次输入的密码不一致');
                return;
              }
              if (passwordForm.password.length < 6) {
                alert('密码长度至少6位');
                return;
              }
              try {
                await axios.put(`/api/auth/users/${editingUser.id}/password`, { password: passwordForm.password });
                alert('密码修改成功');
                setShowPasswordModal(false);
              } catch (err) {
                alert(err.response?.data?.error || '修改失败');
              }
            }}>
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
