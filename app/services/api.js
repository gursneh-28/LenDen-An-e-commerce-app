const API_BASE_URL = 'http://172.16.61.96:5000/api';

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

async function apiUpload(endpoint, formData) {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,

        });
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

export const requestAPI = {
    createRequest: (requestData) =>
        apiRequest('/requests/create', 'POST', requestData),

    getRequests: () =>
        apiRequest('/requests/all', 'GET')
};

export const itemAPI = {
    uploadItem: (formData) => apiUpload('/items/upload', formData),
    getItems: () => apiRequest('/items/all', 'GET'),
};

export default apiRequest;