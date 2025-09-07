import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Signin from "./lib/Signin";
import { UserAuth } from "./context/AuthContext";

function App() {
    const { session, loading } = UserAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && session) {
            navigate("/dashboard", { replace: true });
        }
    }, [session, loading, navigate]);

    // Show loading or signin page
    return loading ? <div>Loading...</div> : <Signin />;
}

export default App;