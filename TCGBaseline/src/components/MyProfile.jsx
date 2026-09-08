import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = `http://localhost:3000`;

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

  // Helper to format ISO/UTC strings into the user's local timezone
  const formatLocalTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper to format values in the dynamic remote object
  const renderRemoteValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';

    // Auto-convert timestamp/date properties to local time
    if (key.includes('time') || key.includes('date') || key.includes('at') || key.includes('change')) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return formatLocalTimestamp(value);
      }
    }

    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };

  if (loading) return <div className="p1 text-center">Loading profile...</div>;
  if (error) return <div className="p1 text-center font-danger">Error: {error}</div>;
  if (!profile) return null;

  return (
    <div className="p1 m-auto" style={{ maxWidth: '800px' }}>
      <h1>My Profile</h1>

      {/* Local TCGBaseline Details */}
      <div className="border-sage br05 p1 bg-white shadow-subtle mb1">
        <h2>
          <i className="fa-solid fa-user-gear mr05"></i> {profile.name || profile.username}
        </h2>
        <p className="font-sage m0 mb05">Username: {profile.username}</p>

        <div className="row mt1">
          <div className="col-sm-6">
            <p>
              <strong>Account Created:</strong>{' '}
              {formatLocalTimestamp(profile.created)}
            </p>
          </div>
        </div>
      </div>

      {/* External Non-Duplicative /me Data from Tank */}
      {profile.remote_extras && Object.keys(profile.remote_extras).length > 0 && (
        <div className="border-sage br05 p1 bg-white shadow-subtle">
          <h3>
            <i className="fa-solid fa-shield-halved mr05"></i> Party Auth System - profile information
          </h3>
          <div className="row">
            {Object.entries(profile.remote_extras).map(([key, value]) => (
              <div key={key} className="col-sm-6 mb05">
                <p className="m0 capitalize">
                  <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                  {renderRemoteValue(key, value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}