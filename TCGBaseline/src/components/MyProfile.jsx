import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = `http://${window.location.hostname}:3000`;

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/my-profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch profile information');
        }

        setProfile(json.data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchProfile();
    }
  }, [token]);

  if (loading) return <div className="p1 text-center">Loading profile...</div>;
  if (error) return <div className="p1 text-center font-danger">Error: {error}</div>;
  if (!profile) return null;

  return (
    <div className="p1 m-auto" style={{ maxWidth: '800px' }}>
      <h2>My Profile</h2>

      {/* Local TCGBaseline Details */}
      <div className="border-sage br05 p1 bg-white shadow-subtle mb1">
        <h3>
          <i className="fa-solid fa-user-gear mr05"></i> {profile.name || profile.username}
        </h3>
        <p className="font-sage m0 mb05">Username: {profile.username}</p>

        <div className="row mt1">
          <div className="col-sm-6">
            <p>
              <strong>Account Created:</strong>{' '}
              {profile.created ? new Date(profile.created).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* External Non-Duplicative /me Data from Tank */}
      {profile.remote_extras && Object.keys(profile.remote_extras).length > 0 && (
        <div className="border-sage br05 p1 bg-white shadow-subtle">
          <h4>
            <i className="fa-solid fa-shield-halved mr05"></i> Party Auth System - profile information
          </h4>
          <div className="row">
            {Object.entries(profile.remote_extras).map(([key, value]) => (
              <div key={key} className="col-sm-6 mb05">
                <p className="m0 capitalize">
                  <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}