import React from 'react';
import { Link } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { useAuth } from './AuthContext';

export default function Menu() {
  const { token } = useAuth(); // React now listens for token changes
  return (
    <div className='dropdown'>
      <h1><i className='fa-solid fa-bars'></i></h1>
      <div className='dropdown-content br05 border-sage bg-white font-black p1 shadow-subtle'>
        <ul className='list-style-none link-style-none'>
          <li><Link to="/"><i className="fa-solid fa-house"></i> Home</Link></li>
          <li><Link to="/update"><i className="fa-solid fa-database"></i> Update Database</Link></li>
          <li><Link to="/market"><i className="fa-solid fa-chart-line"></i> Add Current Price</Link></li>
          <hr className='m05' />
          <h4>My Account</h4>
          {token ? (<LogoutButton />) : (<li><Link to="/login"><i className="fa-solid fa-right-to-bracket"></i> Login</Link></li>)}
          <li><i className="fa-solid fa-user-plus"></i> Register</li>
          {token ? (<li><Link to="/my-cards"><i className="fa-solid fa-box-archive"></i> My Cards</Link></li>) : ("")}
        </ul>
      </div>
    </div>
    )
}