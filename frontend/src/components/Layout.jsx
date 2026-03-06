import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const socialLinks = [
  { name: '微信', icon: 'fab fa-weixin', url: 'wechat' },
  { name: '抖音', icon: 'fab fa-tiktok', url: 'douyin' },
  { name: 'Telegram', icon: 'fab fa-telegram', url: 'https://t.me/zaiyebuhui_zybh' },
  { name: 'GitHub', icon: 'fab fa-github', url: 'https://github.com/ZhangSCzybh' },
];

const START_DATE = new Date('2026-03-01T00:00:00');

function Footer() {
  const [uptime, setUptime] = useState('');
  const [pv, setPv] = useState(0);

  useEffect(() => {
    const fetchPv = async () => {
      try {
        const response = await fetch('/api/stats/pv');
        const data = await response.json();
        setPv(data.pv);
        
        await fetch('/api/stats/pv', { method: 'POST' });
      } catch (error) {
        console.error('Failed to fetch PV:', error);
      }
    };

    const updateUptime = () => {
      const now = new Date();
      const diff = now - START_DATE;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setUptime(`${days}天${hours}时${minutes}分${seconds}秒`);
    };

    fetchPv();
    const uptimeInterval = setInterval(updateUptime, 1000);

    return () => {
      clearInterval(uptimeInterval);
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <span className="footer-copyright">© 2026 再也不会 All rights reserved.</span>
        <span className="footer-divider">｜</span>
        <span className="footer-quote">逢人不说人间事,便是人间无事人</span>
        <span className="footer-divider">｜</span>
        <span className="footer-pv">本站总访问量：{pv.toLocaleString()} 次</span>
        <span className="footer-divider">｜</span>
        <span className="footer-uptime">已稳定运行 {uptime}</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWechat, setShowWechat] = useState(false);
  const [showDouyin, setShowDouyin] = useState(false);

  const handleSocialClick = (e, url) => {
    if (url === 'wechat') {
      e.preventDefault();
      setShowWechat(true);
    } else if (url === 'douyin') {
      e.preventDefault();
      setShowDouyin(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rolePermissions = {
    user: ['/home', '/dashboard', '/favorites', '/vehicles', '/records', '/analytics', '/bill','/games', '/ai-image', '/wardrobe'],
    ev: ['/home', '/favorites', '/vehicles', '/records', '/analytics'],
    resource: ['/home', '/dashboard', '/favorites'],
    admin: ['/home', '/dashboard', '/favorites', '/vehicles', '/records', '/analytics', '/bill', '/users', '/games', '/ai-image', '/wardrobe'],
    game: ['/home', '/favorites', '/games'],
    fashion: ['/home', '/favorites', '/wardrobe', '/ai-image']
  };

  const getAllowedRoutes = () => {
    const permissions = rolePermissions[user?.role] || rolePermissions.user;
    return permissions;
  };

  const navItems = [
    { to: '/home', label: '首页', icon: 'fa-home', roles: ['user', 'ev', 'admin', 'guest', 'resource', 'game', 'fashion'] },
    { to: '/favorites', label: '收藏夹', icon: 'fa-star', roles: ['user', 'ev', 'admin', 'guest', 'resource', 'game', 'fashion'] },
    { to: '/games', label: '游戏', icon: 'fa-gamepad', roles: ['game','admin','user'] },
    { to: '/ai-image', label: 'AI生图', icon: 'fa-magic', roles: ['admin','user', 'fashion'] },
    { to: '/wardrobe', label: '衣橱', icon: 'fa-tshirt', roles: ['admin','user', 'fashion'] },
    { to: '/dashboard', label: '资源库', icon: 'fa-bookmark', roles: ['user', 'admin', 'resource'] },
    { to: '/vehicles', label: '车辆', icon: 'fa-car', roles: ['user', 'ev', 'admin'] },
    { to: '/records', label: '充电', icon: 'fa-bolt', roles: ['user', 'ev', 'admin'] },
    { to: '/analytics', label: '分析', icon: 'fa-chart-line', roles: ['user', 'ev', 'admin'] },
    { to: '/bill', label: '账单', icon: 'fa-wallet', roles: ['user', 'admin'] },
    { to: '/users', label: '用户', icon: 'fa-users', roles: ['admin'] },
  ].filter(item => user ? item.roles.includes(user.role) : item.roles.includes('guest'));

  return (
    <div className="app">
      <nav className="navbar">
        <NavLink to="/home" className="navbar-brand">
          <img src="/uploads/home/5661772591473_.pic.jpg" alt="logo" className="navbar-logo" />
          <span className="navbar-title">zaiyebuhui</span>
        </NavLink>
        
        <div className="navbar-links desktop-only">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="navbar-actions">
          <div className="navbar-social desktop-only">
            {socialLinks.map(link => (
              <a 
                key={link.name}
                href={link.url}
                className="social-icon"
                title={link.name}
                target={link.url === 'wechat' || link.url === 'douyin' ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={(e) => handleSocialClick(e, link.url)}
              >
                <i className={link.icon}></i>
              </a>
            ))}
          </div>
          <div className="navbar-user desktop-only">
            {user ? (
              <>
                <span className="user-name">{user.username}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ borderRadius: '20px', padding: '10px 32px', fontWeight: 500,  fontSize: '15px' }}>
                Login
              </button>
            )}
          </div>
        </div>

        <button 
          className={`hamburger ${menuOpen ? 'open' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">菜单</span>
          {user && <span className="mobile-user-name">{user.username}</span>}
        </div>
        <div className="mobile-nav-links">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        <div className="mobile-social-section">
          <span className="mobile-social-title">关注我们</span>
          <div className="mobile-social-links">
            {socialLinks.map(link => (
              <a 
                key={link.name}
                href={link.url}
                className="mobile-social-link"
                target={link.url === 'wechat' || link.url === 'douyin' ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={(e) => { if (link.url === 'wechat') { e.preventDefault(); setShowWechat(true); } else if (link.url === 'douyin') { e.preventDefault(); setShowDouyin(true); } setMenuOpen(false); }}
              >
                <i className={link.icon}></i>
                <span>{link.name}</span>
              </a>
            ))}
          </div>
        </div>

        {user ? (
          <div className="mobile-menu-footer">
            <button className="btn btn-primary" onClick={() => { handleLogout(); setMenuOpen(false); }}>
              <i className="fas fa-sign-out-alt"></i> 退出登录
            </button>
          </div>
        ) : (
          <div className="mobile-menu-footer">
            <button className="btn btn-primary" onClick={() => { navigate('/login'); setMenuOpen(false); }}>
              <i className="fas fa-sign-in-alt"></i> 登录
            </button>
          </div>
        )}
      </div>

      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)}></div>}

      {showWechat && (
        <div className="wechat-modal" onClick={() => setShowWechat(false)}>
          <div className="wechat-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src="/uploads/home/5691772672167_.pic.jpg" alt="微信二维码" />
            <p>扫码添加微信</p>
            <button className="btn btn-secondary" onClick={() => setShowWechat(false)}>关闭</button>
          </div>
        </div>
      )}

      {showDouyin && (
        <div className="wechat-modal" onClick={() => setShowDouyin(false)}>
          <div className="wechat-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src="/uploads/home/5701772672347_.pic.jpg" alt="抖音二维码" />
            <p>扫码关注抖音</p>
            <button className="btn btn-secondary" onClick={() => setShowDouyin(false)}>关闭</button>
          </div>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
