import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import DarkVeil from '/src/components/DarkVeil.jsx';

const Signin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { signInUser } = UserAuth();
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await signInUser(email, password); // Use your signIn function

        if (error) {
            setError(error.message); // Set the error message if sign-in fails

            // Set a timeout to clear the error message after a specific duration (e.g., 3 seconds)
            setTimeout(() => {
                setError(null);
            }, 3000); // 3000 milliseconds = 3 seconds
        } else if (data.session) {
            // Redirect or perform any necessary actions after successful sign-in
            navigate("/dashboard");
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen bg-gray-900">
            <div className="w-full h-full absolute">
                <DarkVeil
                    hueShift={45}
                />
            </div>
            <div className="w-full flex items-center justify-center">
                <form onSubmit={handleSignIn} className="max-w-md w-full bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-lg text-white">
                    <h2 className="font-bold pb-2">Sign in</h2>
                    <p>
                        Don't have an account yet? <Link to="/signup">Sign up</Link>
                    </p>
                    <div className="flex flex-col py-4">
                        {/* <label htmlFor="Email">Email</label> */}<input
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-3 mt-2"
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Email"
                    />
                </div>
                <div className="flex flex-col py-4">
                    {/* <label htmlFor="Password">Password</label> */}
                    <input
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 mt-2"
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Password"
                    />
                </div>
                <button type="submit" disabled={loading} className="w-full mt-4">Sign In</button>
                {error && <p className="text-red-600 text-center pt-4">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default Signin;