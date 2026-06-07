import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import HomePage         from './pages/HomePage';
import ListingForm      from './pages/ListingForm';
import ListingDetail    from './pages/ListingDetail';
import ProfilePage      from './pages/ProfilePage';
import UpdateAccount    from './pages/UpdateAccount';
import ChatsPage        from './pages/ChatsPage';
import ChatRoom         from './pages/ChatRoom';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 120 }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : children;
}

function Layout({ children }) {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

            {/* Private */}
            <Route path="/home"            element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/listings/form"   element={<PrivateRoute><ListingForm /></PrivateRoute>} />
            <Route path="/listings/:id"    element={<PrivateRoute><ListingDetail /></PrivateRoute>} />
            <Route path="/profile/:id"     element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/update-account"  element={<PrivateRoute><UpdateAccount /></PrivateRoute>} />
            <Route path="/chats"           element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
            <Route path="/chats/:id"       element={<PrivateRoute><ChatRoom /></PrivateRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
