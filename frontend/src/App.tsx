import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import KitchenDisplay from './pages/KitchenDisplay';
import POS from './pages/POS';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />

            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'WAITER', 'CASHIER']} />}>
              <Route path="/tables" element={<Tables />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'KITCHEN_STAFF']} />}>
              <Route path="/kitchen" element={<KitchenDisplay />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'CASHIER']} />}>
              <Route path="/pos" element={<POS />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
