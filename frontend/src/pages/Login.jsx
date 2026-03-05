import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [registerRole, setRegisterRole] = useState('user');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      try {
        await axios.post('/api/auth/register', { username, password, role: registerRole });
        await login(username, password);
        navigate('/home');
      } catch (err) {
        setError(err.response?.data?.error || '注册失败');
      }
    } else {
      try {
        await login(username, password);
        navigate('/home');
      } catch (err) {
        setError('用户名或密码错误');
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">zaiyebuhui</h1>
        <p className="login-subtitle">{isRegister ? '创建新账号' : '个人数据中心'}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">用户名</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label className="label">密码</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="label">确认密码</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">角色</label>
                <select 
                  className="select" 
                  value={registerRole} 
                  onChange={(e) => setRegisterRole(e.target.value)}
                >
                  <option value="user">普通用户</option>
                  <option value="ev">新能源用户</option>
                  <option value="resource">资源库用户</option>
                </select>
              </div>
            </>
          )}
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: '8px', justifyContent: 'center' }}>
            {isRegister ? '注册' : '登录'}
          </button>
        </form>
        <p className="login-hint" style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? '已有账号？立即登录' : '没有账号？点击注册'}
        </p>
      </div>
    </div>
  );
}
