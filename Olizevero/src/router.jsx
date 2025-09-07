import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Signup from "./lib/Signup";
import Signin from "./lib/Signin";
import Dashboard from "./routes/Dashboard";
import PrivateRoute from "./lib/PrivateRoute";

export const router = createBrowserRouter([
    { path: "/", element: <App /> },
    { path: "/signup", element: <Signup /> },
    { path: "/signin", element: <Signin /> },
    {
        path: "/dashboard",
        element: (
            <PrivateRoute>
                <Dashboard />
            </PrivateRoute>
        ),
    },
]);