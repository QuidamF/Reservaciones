import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token_admin') || localStorage.getItem('token_public'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuthStatus = async () => {
            setLoading(true); // Start loading
            const adminToken = localStorage.getItem('token_admin');
            const publicToken = localStorage.getItem('token_public');
            let currentToken = adminToken || publicToken;

            if (currentToken) {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
                        headers: { Authorization: `Bearer ${currentToken}` },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(currentToken); // Update state with the token from localStorage
                    } else {
                        // Token is invalid on the backend, clear and logout
                        logout();
                    }
                } catch (error) {
                    console.error('Failed to fetch user or network error:', error);
                    logout();
                }
            } else {
                // No token found in localStorage, ensure states are cleared
                logout(); // Clears user and token states, and localStorage
            }
            setLoading(false); // End loading regardless of outcome
        };

        checkAuthStatus();
    }, []); // Empty dependency array means it runs only once on mount

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            const accessToken = data.access_token;

            // Fetch user details to determine role
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                setUser(userData);
                setToken(accessToken);

                // Store token based on role
                if (userData.is_admin) {
                    localStorage.setItem('token_admin', accessToken);
                    localStorage.removeItem('token_public'); // Clear other role's token
                } else {
                    localStorage.setItem('token_public', accessToken);
                    localStorage.removeItem('token_admin'); // Clear other role's token
                }
            } else {
                // If user data fetch fails, something is wrong, log out
                console.error('Failed to fetch user after login');
                logout();
                throw new Error('Failed to get user details after login');
            }
            return userData;
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to login');
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token_admin');
        localStorage.removeItem('token_public');
    };

    const value = { token, user, login, logout, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
