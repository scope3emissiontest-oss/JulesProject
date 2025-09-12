import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import DarkVeil from '/src/components/DarkVeil.jsx';

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { session, signUpNewUser } = UserAuth();
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await signUpNewUser(email, password); // Call context function

            if (error) {
                setError(error.message); // Show error message on failure
            } else if (data.user) {
                navigate("/dashboard"); // Navigate to dashboard on success
            }
        } catch (err) {
            setError("An unexpected error occurred."); // Catch unexpected errors
        } finally {
            setLoading(false); // End loading state
        }
    };

    return ( ///////////////////////////////////////////////////////////////////////////////////////////////
        <div className="flex h-screen bg-gray-900">
            <div className="w-full h-full absolute">
                <DarkVeil 
                hueShift={45}
                />
            </div>
            <div className="w-full flex items-center justify-center">
                <form
                    onSubmit={handleSignUp}
                    className="max-w-md w-full bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-lg text-white"
                >
                    <h2 className="text-3xl font-bold pb-2 text-center">Sign Up</h2>
                    <p className="text-center text-gray-300">
                        Already have an account? <Link to="/" className="text-emerald-400 hover:text-emerald-300">Sign In</Link>
                    </p>
                        <div className="flex flex-col py-4">
                            {/* <label htmlFor="Email">Email</label> */}
                            <input
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 mt-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
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
                            className="p-3 mt-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                            type="password"
                            name="password"
                            id="password"
                            placeholder="Password"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50">
                        Sign Up
                    </button>
                    {error && <p className="text-red-600 text-center pt-4">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default Signup;