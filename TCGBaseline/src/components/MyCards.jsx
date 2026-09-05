import React from 'react';

export default function MyCards() {
  const token = localStorage.getItem('token');

  return (
    <div className="row m-auto p1" style={{ maxWidth: '1200px' }}>
      <div className="col-12">
        <h2>My Card Collection</h2>
        <p>Welcome! Here is where your personal card collection will be displayed.</p>

        {!token && (
          <div className="p05 bg-flag-red font-white br05">
            Warning: You are viewing this page without being logged in.
          </div>
        )}
      </div>
    </div>
  );
}