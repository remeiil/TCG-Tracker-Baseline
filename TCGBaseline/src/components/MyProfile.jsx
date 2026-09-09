import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = `https://tcg-server.remeil.co.nz`;
const TANK_BASE_URL = `https://tank.remeil.co.nz`;

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // Password Reset Form State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);

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

  // Handle password change form submission to Tank Auth
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      setPwError('New password must be different from current password');
      return;
    }

    setPwSubmitting(true);

    try {
      const res = await fetch(`${TANK_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to change password');
      }

      setPwMessage(json.message || 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSubmitting(false);
    }
  };

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
          <div className="justify-between align-center mb05">
            <h3 className="m0">
              <i className="fa-solid fa-shield-halved mr05"></i> Party Auth System - profile information
            </h3>
            <button
              type="button"
              className="btn border-sage bg-cream cursor-pointer font-cordovan"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setPwError(null);
                setPwMessage(null);
              }}
            >
              <i className="fa-solid fa-key mr025"></i>
              {showPasswordForm ? ' Cancel' : ' Change Password'}
            </button>
          </div>

          {pwMessage && (
            <div className="p05 mb1 bg-sage font-white br025 text-center bold">
              {pwMessage}
            </div>
          )}

          {/* Collapsible Change Password Form */}
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="form p1 border-sage br05 bg-cream mb1">
              <h4 className="m0 mb05">Security Settings</h4>

              {pwError && (
                <div className="p05 mb05 bg-flag-red font-white br025 text-center bold">
                  {pwError}
                </div>
              )}

              <div className="row">
                <div className="col-12 mb05">
                  <label className="bold block font-sage mb025">Current Password</label>
                  <input
                    type="password"
                    className="p05 br025 border-sage"
                    style={{ width: '100%' }}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="col-sm-6 mb05">
                  <label className="bold block font-sage mb025">New Password</label>
                  <input
                    type="password"
                    className="p05 br025 border-sage"
                    style={{ width: '100%' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="col-sm-6 mb05">
                  <label className="bold block font-sage mb025">Confirm New Password</label>
                  <input
                    type="password"
                    className="p05 br025 border-sage"
                    style={{ width: '100%' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwSubmitting}
                className="btn bg-amber-flame font-white mt05"
                style={{ width: '100%' }}
              >
                {pwSubmitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}

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