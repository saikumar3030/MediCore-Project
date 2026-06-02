import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthUrl(url: string | undefined): boolean {
  return !!url && url.includes('/api/Auth/');
}

// Registers global axios request + response interceptors that mirror what
// `authInterceptor` (HttpInterceptorFn) does for Angular's HttpClient:
// attaches the Bearer token on every request, and on a 401 response,
// transparently refreshes the access token via the refresh-token endpoint
// and retries the original request.
// Called once at app startup from app.config.ts.
export function registerAxiosAuthInterceptor(auth: AuthService): void {
  axios.interceptors.request.use(config => {
    const token = auth.getToken();
    config.headers = config.headers ?? {};

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't override Content-Type when the caller is sending FormData —
    // axios needs to set the multipart boundary itself.
    if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  });

  axios.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;

      if (
        error.response?.status !== 401 ||
        !original ||
        original._retry ||
        isAuthUrl(original.url)
      ) {
        return Promise.reject(error);
      }

      if (!auth.getRefreshToken()) {
        auth.logout();
        return Promise.reject(error);
      }

      original._retry = true;

      try {
        const newToken = await firstValueFrom(auth.performRefresh());
        original.headers = original.headers ?? {};
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return axios(original);
      } catch (refreshErr) {
        auth.logout();
        return Promise.reject(refreshErr);
      }
    }
  );
}
