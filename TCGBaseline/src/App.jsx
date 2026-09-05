import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import CardGallery from './components/CardGallery'
import Menu from './components/Menu'
import Update from './components/Update';
import Market from './components/MarketPriceUpdate';
import Login from './components/Login';
import MyCards from './components/MyCards';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
    <div className='container'>
      {/* Header / Navbar */}
      <div className='row gradient-red shadow-subtle mb1 p05 font-white'>
        <div className='col-sm-1 center'>
          <Menu />
        </div>
        <div className='col-sm-10 center'>
            <h1>Rem's Baseline Card Tracker</h1>
        </div>
        <div className='col-sm-1 center'></div>
      </div>

      {/* Main Content Area */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<CardGallery />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes Group */}
        <Route path='/my-cards' element={<MyCards />} />

        {/* Admin-Only Routes */}
        <Route element={<ProtectedRoute requiredPermission="Admin - TCGBaseline" />}>
          <Route path="/update" element={<Update />} />
          <Route path="/market" element={<Market />} />
        </Route>

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
    </div>
    </AuthProvider>
  )
}

export default App