import { Navigate, Route, Routes } from "react-router-dom";
import AdminLogin from "../pages/AdminLogin";
import { AdminLayout } from "../components/AdminLayout";
import Dashboard from "../pages/Dashboard";
import UsersList from "../pages/UsersList";
import KycList from "../pages/KycList";
import UserDetail from "../pages/UserDetail";
import CreateManager from "../pages/CreateManager";
import ManagersList from "../pages/ManagersList";
import CardsList from "../pages/CardsList";
import PhrasesList from "../pages/PhrasesList";
import DepositsPage from "../pages/DepositsPage";
import PayoutsPage from "../pages/PayoutsPage";
import PlansPage from "../pages/PlansPage";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UsersList />} />
        <Route path="users/pending" element={<UsersList statusFilter="pending" />} />
        <Route path="users/kyc" element={<KycList />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="managers" element={<ManagersList />} />
        <Route path="managers/create" element={<CreateManager />} />
        <Route path="cards" element={<CardsList />} />
        <Route path="phrases" element={<PhrasesList />} />
        <Route path="payments/deposits" element={<DepositsPage mode="pending" />} />
        <Route path="payments/log" element={<DepositsPage mode="log" />} />
        <Route path="payouts/requests" element={<PayoutsPage mode="pending" />} />
        <Route path="payouts/log" element={<PayoutsPage mode="log" />} />
        <Route path="plans" element={<PlansPage />} />
      </Route>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
