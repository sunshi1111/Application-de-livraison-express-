// Service API - connexion au backend FastAPI
import axios from 'axios';

// Configurer l'URL de base de l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Créer une instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Classe de service API
class ApiService {
  // API liées au système
  async getSystemData() {
    try {
      // 获取系统数据时会为每个包裹计算路径，可能较慢，延长超时
      // Récupération des données système (peut être lente car calcule les chemins pour chaque colis)
      const response = await api.get('/api/system/data', { timeout: 60000 });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des données système: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getSystemStats() {
    try {
      const response = await api.get('/api/system/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des statistiques système: ${error.response?.data?.detail || error.message}`);
    }
  }

  async regenerateSystem() {
    try {
      // Régénération impliquant la génération de données et l'insertion en masse, augmenter le timeout
      const response = await api.post('/api/system/regenerate', {}, { timeout: 60000 });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la régénération du système: ${error.response?.data?.detail || error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error(`Échec du contrôle de santé: ${error.response?.data?.detail || error.message}`);
    }
  }

  // API liées aux colis
  async getPackages(limit = null, category = null) {
    try {
      const params = {};
      if (limit !== null) params.limit = limit;
      if (category !== null) params.category = category;
      
      const response = await api.get('/api/packages', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération de la liste des colis: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getPackage(packageId) {
    try {
      const response = await api.get(`/api/packages/${packageId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Frontend-side not found error (translated to French)
        throw new Error('Colis introuvable');
      }
      throw new Error(`Échec de la récupération des informations du colis: ${error.response?.data?.detail || error.message}`);
    }
  }

  async searchPackages(query) {
    try {
      const response = await api.post('/api/packages/search', { query });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la recherche de colis: ${error.response?.data?.detail || error.message}`);
    }
  }

  async createScheduledPackage({ src, dst, category = 0, sendTime = 0 }) {
    try {
      const response = await api.post('/api/packages/schedule', {
        src,
        dst,
        category,
        sendTime
      });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la création du colis: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getPackagesBatch(ids = []) {
    try {
      const response = await api.post('/api/packages/batch', { ids });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des colis en lot: ${error.response?.data?.detail || error.message}`);
    }
  }

  // API liées aux itinéraires
  async calculatePath(src, dst, category = 0) {
    try {
      const response = await api.post('/api/path/calculate', {
        src,
        dst,
        category
      });
      return response.data;
    } catch (error) {
      throw new Error(`Échec du calcul d'itinéraire: ${error.response?.data?.detail || error.message}`);
    }
  }

  async calculateAlternativePath(src, dst, avoidNode, category = 0) {
    try {
      const response = await api.post('/api/path/alternative', {
        src,
        dst,
        avoid_node: avoidNode,
        category
      });
      return response.data;
    } catch (error) {
      throw new Error(`Échec du calcul d'itinéraire alternatif: ${error.response?.data?.detail || error.message}`);
    }
  }

  // API liées au réseau
  async getNodes() {
    try {
      const response = await api.get('/api/nodes');
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des données des nœuds: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getNodeCounts() {
    try {
      const response = await api.get('/api/nodes/counts');
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération du nombre de colis par nœud: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getNodeCountsAt(timestamp = 0) {
    try {
      const response = await api.get('/api/nodes/counts_at', { params: { timestamp } });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des compteurs de colis par temps: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getPackagesAtNode(nodeId, timestamp = null) {
    try {
      const params = {};
      if (timestamp !== null) params.timestamp = timestamp;
      const response = await api.get(`/api/nodes/${nodeId}/packages_at`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des colis présents au nœud à l'instant spécifié: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getSimBounds() {
    try {
      const response = await api.get('/api/system/sim_bounds');
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération de la plage de temps de simulation: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getEdges(edgeType = null) {
    try {
      const params = {};
      if (edgeType) params.edge_type = edgeType;
      
      const response = await api.get('/api/edges', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Échec de la récupération des données d'arêtes: ${error.response?.data?.detail || error.message}`);
    }
  }
}

// Créer une instance du service API
const apiService = new ApiService();

// Exporter le service API et fonctions utilitaires
export default apiService;

export const checkBackendConnection = async () => {
  try {
    await apiService.healthCheck();
    return { connected: true, message: 'Connexion au backend OK' };
  } catch (error) {
    return {
      connected: false,
      message: `Connexion au backend échouée: ${error.message}`,
      suggestion: 'Assurez-vous que le serveur backend est en cours d exécution (python main.py)'
    };
  }
};

export const formatApiError = (error) => {
  if (error.response) {
    // Le serveur a renvoyé une réponse d'erreur
    return {
      type: 'server_error',
      message: error.response.data?.detail || 'Erreur serveur',
      status: error.response.status
    };
  } else if (error.request) {
    // Requête envoyée mais aucune réponse reçue
    return {
      type: 'network_error',
      message: 'Échec de la connexion réseau, vérifiez si le backend est démarré',
      suggestion: "Exécutez start_backend.bat pour démarrer le serveur backend"
    };
  } else {
    // Autres erreurs
    return {
      type: 'unknown_error',
      message: error.message || 'Erreur inconnue'
    };
  }
};