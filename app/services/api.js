
const API_BASE_URL = 'http://172.16.61.119:5000/api';

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong');
        }
        
        return result;
    } catch (error) {
        throw error;
    }
}

// Auth specific functions
export const authAPI = {
    signup: (userData) => apiRequest('/auth/signup', 'POST', userData),
    login: (credentials) => apiRequest('/auth/login', 'POST', credentials),
};

export default apiRequest;