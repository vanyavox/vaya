import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './app/AuthLayout';
import { AppLayout } from './app/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Pairing } from './pages/Pairing';
import { Wishlists } from './pages/Wishlists';
import { WishlistDetail } from './pages/WishlistDetail';
import { Calendar } from './pages/Calendar';
import { Todos } from './pages/Todos';
import { CalendarFeed } from './pages/CalendarFeed';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './app/ProtectedRoute';
import { GuestRoute } from './app/GuestRoute';

export default function App() {
  return (
    <Routes>
      {/* Public — signed-in users are sent to /app */}
      <Route
        path="/"
        element={
          <GuestRoute>
            <Navigate to="/login" replace />
          </GuestRoute>
        }
      />
      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/pairing" element={<Pairing />} />
        <Route path="/app/wishes" element={<Wishlists />} />
        <Route path="/app/wishes/:id" element={<WishlistDetail />} />
        <Route path="/app/calendar" element={<Calendar />} />
        <Route path="/app/todos" element={<Todos />} />
        <Route path="/app/settings/calendar-feed" element={<CalendarFeed />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
