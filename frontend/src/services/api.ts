import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Éviter les boucles infinies
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true },
        );

        const { access_token } = response.data;
        if (access_token) {
          Cookies.set("access_token", access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            expires: 1 / 96, // 15 minutes
          });
        }

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Nettoyage complet
        Cookies.remove("refresh_token");
        Cookies.remove("access_token");

        // Redirection seulement si pas déjà sur la page de login
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
          toast.error("Session expirée. Veuillez vous reconnecter.");
        }

        return Promise.reject(refreshError);
      }
    }

    // Ne pas afficher de toast pour les erreurs 401 (gérées par le refresh)
    if (error.response?.status !== 401) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

export default api;
