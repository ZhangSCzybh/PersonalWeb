import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Favorites from './pages/Favorites';
import Vehicles from './pages/Vehicles';
import Records from './pages/Records';
import Analytics from './pages/Analytics';
import Bill from './pages/Bill';
import Users from './pages/Users';
import Login from './pages/Login';
import Games from './pages/Games';

const rolePermissions = {
  user: ['/home', '/dashboard', '/favorites', '/vehicles', '/records', '/analytics', '/bill'],
  ev: ['/home', '/dashboard', '/favorites', '/vehicles', '/records', '/analytics'],
  resource: ['/home', '/dashboard', '/favorites'],
  admin: ['/home', '/dashboard', '/favorites', '/vehicles', '/records', '/analytics', '/bill', '/users', '/games'],
  game: ['/home', '/favorites', '/games']
};

function PrivateRoute({ children, path }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  const allowedRoutes = rolePermissions[user.role] || rolePermissions.user;
  if (!allowedRoutes.includes(path)) {
    return <Navigate to="/home" />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" />} />
            <Route path="home" element={<Home />} />
            <Route path="dashboard" element={
              <PrivateRoute path="/dashboard">
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="favorites" element={<Favorites />} />
            <Route path="games" element={<Games />} />
            <Route path="vehicles" element={
              <PrivateRoute path="/vehicles">
                <Vehicles />
              </PrivateRoute>
            } />
            <Route path="records" element={
              <PrivateRoute path="/records">
                <Records />
              </PrivateRoute>
            } />
            <Route path="analytics" element={
              <PrivateRoute path="/analytics">
                <Analytics />
              </PrivateRoute>
            } />
            <Route path="bill" element={
              <PrivateRoute path="/bill">
                <Bill />
              </PrivateRoute>
            } />
            <Route path="users" element={
              <PrivateRoute path="/users">
                <Users />
              </PrivateRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
