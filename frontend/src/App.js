import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import InvoiceManagementPage from './pages/InvoiceManagementPage';
import { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            {!session ? (
              <>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/signup">Sign Up</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                <li>
                  <Link to="/upload">Upload</Link>
                </li>
                <li>
                  <Link to="/invoices">Invoices</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <hr />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/invoices" element={<InvoiceManagementPage />} />
          <Route path="/" element={<Home session={session} />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home({ session }) {
  return (
    <div>
      <h2>Home</h2>
      {session ? <p>You are logged in.</p> : <p>You are not logged in.</p>}
    </div>
  );
}

export default App;
