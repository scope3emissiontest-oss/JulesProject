import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // You'll want to redirect the user to the login page after logout.
    // This can be handled by a routing library like react-router-dom.
    window.location.href = '/login';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // This should be handled by a private route component
    return <div>You are not logged in.</div>;
  }

  return (
    <div>
      <h2>Profile</h2>
      <p>Email: {user.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
