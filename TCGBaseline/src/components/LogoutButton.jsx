import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function LogoutButton() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        // 1. Remove the JWT token from storage
        logout();

        // 2. Redirect to the login page
        navigate('/login', { replace: true });
    };

    return (
        <li onClick={handleLogout}><i className="fa-solid fa-right-from-bracket"></i> Logout</li>
        
    );
}