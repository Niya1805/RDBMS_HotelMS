import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import BookingLookupPage from './pages/BookingLookupPage';
import ReviewsPage from './pages/ReviewsPage';
import AuthPage from './pages/AuthPage';
import GuestDashboardPage from './pages/GuestDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AboutContactPage from './pages/AboutContactPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/services/:sId" element={<ServiceDetailPage />} />
            <Route path="/checkout/:sId" element={<CheckoutPage />} />
            <Route path="/booking-confirmation/:bId" element={<BookingConfirmationPage />} />
            <Route path="/lookup" element={<BookingLookupPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<GuestDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/about" element={<AboutContactPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
