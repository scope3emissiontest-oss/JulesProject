import React from "react";
import { UserAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
    const { session, loading } = UserAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    return <>{session ? children : <Navigate to="/" />}</>;
};

export default PrivateRoute;