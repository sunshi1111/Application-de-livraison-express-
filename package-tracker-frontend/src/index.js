import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Login from './pages/Login';
import CustomerTrack from './pages/CustomerTrack';
import AdminHome from './pages/AdminHome';
import NodeStatus from './pages/NodeStatus';
import PackageQuery from './pages/PackageQuery';
import Profile from './pages/Profile';
import UserHome from './pages/UserHome';
import UserProfile from './pages/UserProfile';
import SendPackage from './pages/SendPackage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './services/authService';

const RequireAuth = ({ role, children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth role="employee">
              <App />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth role="employee">
              <AdminHome />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/node-status"
          element={
            <RequireAuth role="employee">
              <NodeStatus />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard-overview"
          element={
            <RequireAuth role="employee">
              <App showPackageSearch={false} />
            </RequireAuth>
          }
        />
        <Route
          path="/package-query"
          element={
            <RequireAuth role="employee">
              <PackageQuery />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth role="employee">
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/track"
          element={
            <RequireAuth role="customer">
              <CustomerTrack />
            </RequireAuth>
          }
        />
        <Route
          path="/user"
          element={
            <RequireAuth role="customer">
              <UserHome />
            </RequireAuth>
          }
        />
        <Route
          path="/user/profile"
          element={
            <RequireAuth role="customer">
              <UserProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/user/send"
          element={
            <RequireAuth role="customer">
              <SendPackage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);