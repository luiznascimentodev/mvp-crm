import { client } from '../generated/api/client.gen';

// Configurar Base URL
client.setConfig({
  baseUrl: 'http://localhost:3333',
});

// Interceptor para adicionar Token JWT
client.interceptors.request.use((request) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    if (!request.headers) {
      request.headers = {};
    }
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

// Interceptor para tratamento de erro global (opcional)
client.interceptors.response.use((response) => {
  if (response.status === 401) {
    // Redirecionar para login ou limpar token
    // localStorage.removeItem('access_token');
    // window.location.href = '/login';
  }
  return response;
});

export { client };
