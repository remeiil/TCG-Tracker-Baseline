import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const API_BASE_URL = `https://tank.remeil.co.nz`;

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed.');
        }

        // Pass both token and user object to AuthContext
        login(data.token, data.user);

        if (onLoginSuccess) {
            onLoginSuccess(data.user);
        }

        // Redirect to My Cards page on success
        navigate('/my-cards');
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col-sm-1 col-md-2 col-lg-4"></div>
      <div className="col-sm-10 col-md-8 col-lg-4 border-sage p2 br05">
        <h1 className="center">Login</h1>
        <p className="center">Use your Party Auth System login credentials</p>

        {error && (
          <div className="p05 mb1 br05 bg-flag-red font-white text-center">
            {error}
          </div>
        )}

        <form id="login-form" className="form" onSubmit={handleSubmit}>
          <label htmlFor="uname">Username: </label>
          <input
            type="text"
            id="uname"
            name="uname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="pword">Password: </label>
          <input
            type="password"
            id="pword"
            name="pword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="btn border bg-amber-flame"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Submit'}
          </button>
        </form>
      </div>
      <div className="col-sm-1 col-md-4"></div>
    </div>
  );
}