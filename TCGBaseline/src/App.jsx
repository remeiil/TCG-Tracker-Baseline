import { useState } from 'react'
import { Routes, Route } from 'react-router-dom';
import CardGallery from './components/CardGallery'
import Menu from './components/Menu'
import Update from './components/Update';
import Market from './components/MarketPriceUpdate';

function App() {
  return (
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
        <Route path="/" element={<CardGallery />} />
        <Route path="/update" element={<Update />} />
        <Route path="/market" element={<Market />} />
      </Routes>
      
    </div>
  )
}

export default App