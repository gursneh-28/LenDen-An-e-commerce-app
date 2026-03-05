
const API_BASE_URL = 'http://192.168.29.70:5000/api';

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

export const authAPI = {
    signup: (userData) => apiRequest('/auth/signup', 'POST', userData),
    login: (credentials) => apiRequest('/auth/login', 'POST', credentials),
};

export default apiRequest;