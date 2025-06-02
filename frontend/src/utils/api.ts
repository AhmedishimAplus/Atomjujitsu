const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const getAuthToken = (): string | null => {
  // In a real application, you would get the token from a secure storage
  // For example, if using localStorage:
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { message: response.statusText };
    }
    throw errorData || new Error(`HTTP error! status: ${response.status}`);
  }
  // Check if the response has content before trying to parse it as JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text(); // Or handle as needed, e.g., return null or response itself
};

const handleError = (error: any) => {
  console.error('API call failed:', error);
  if (error.message) {
    throw new Error(`API Error: ${error.message}`);
  }
  throw new Error('An unknown API error occurred.');
};

export const get = async (endpoint: string, params: Record<string, any> = {}): Promise<any> => {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = new URL(`${baseUrl}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
    return handleResponse(response);
  } catch (error) {
    handleError(error);
  }
};

export const post = async (endpoint: string, data: any): Promise<any> => {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  } catch (error) {
    handleError(error);
  }
};

export const put = async (endpoint: string, data: any): Promise<any> => {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  } catch (error) {
    handleError(error);
  }
};

export const del = async (endpoint: string): Promise<any> => {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(response);
  } catch (error) {
    handleError(error);
  }
};
