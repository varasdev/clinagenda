import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Types
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://clinagenda-api.onrender.com';

const TOKEN_KEY = 'clinagenda_jwt_token';
const USER_KEY = 'clinagenda_user_data';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401, network errors, standardize error format
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Network error (no response)
    if (!error.response) {
      const networkError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar à API. Verifique sua conexão com a internet.',
      };
      return Promise.reject(networkError);
    }

    // 401 Unauthorized: token expired or invalid
    if (error.response.status === 401) {
      await clearAuthData();
      // Note: Navigation reset to login should be handled by the auth context
      const authError: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Sessão expirada. Faça login novamente.',
      };
      return Promise.reject(authError);
    }

    // 403 Forbidden
    if (error.response.status === 403) {
      const forbiddenError: ApiError = {
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para realizar esta ação.',
      };
      return Promise.reject(forbiddenError);
    }

    // 409 Conflict (e.g., horário ocupado)
    if (error.response.status === 409) {
      const data = error.response.data as { message?: string } | undefined;
      const conflictError: ApiError = {
        code: 'CONFLICT',
        message: data?.message || 'Conflito: o recurso já existe ou está indisponível.',
      };
      return Promise.reject(conflictError);
    }

    // Other errors: use backend message if available
    const data = error.response.data as { message?: string } | undefined;
    const apiError: ApiError = {
      code: `HTTP_${error.response.status}`,
      message: data?.message || error.message || 'Erro desconhecido.',
      details: error.response.data,
    };
    return Promise.reject(apiError);
  }
);

// Auth storage helpers
export const authStorage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async saveUser(user: any): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};

async function clearAuthData(): Promise<void> {
  await authStorage.clear();
}

// Auth endpoints
export const authApi = {
  async login(email: string, senha: string) {
    const response = await api.post<{
      mensagem: string;
      token: string;
      usuario: { id: string; nome: string; email: string; perfil: string; pacienteId?: string; profissionalId?: string };
    }>('/auth/login', { email, senha });
    return response.data;
  },

  async me() {
    const response = await api.get<{ mensagem: string; usuario: any }>('/auth/me');
    return response.data;
  },

  async registerPatient(data: {
    nome: string;
    email: string;
    senha: string;
    cpf: string;
    dataNascimento: string;
    telefone: string;
    endereco?: string;
  }) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

// Triagem endpoints
export const triagemApi = {
  async start() {
    const response = await api.post<{
      sessionId: string;
      stage: 'collecting' | 'recommendation' | 'emergency';
      reply: string;
      collected: { symptoms: string[]; duration: string | null; intensity: number | null };
      specialties: Array<{ especialidadeId: string; nome: string; reason: string; confidence: 'alta' | 'media' | 'baixa' }>;
      emergency: boolean;
      disclaimer?: string;
      triagemId?: string;
    }>('/triage/start');
    return response.data;
  },

  async sendMessage(sessionId: string, message: string) {
    const response = await api.post<{
      stage: 'collecting' | 'recommendation' | 'emergency';
      reply: string;
      collected: { symptoms: string[]; duration: string | null; intensity: number | null };
      specialties: Array<{ especialidadeId: string; nome: string; reason: string; confidence: 'alta' | 'media' | 'baixa' }>;
      emergency: boolean;
      disclaimer?: string;
      triagemId?: string;
    }>('/triage/message', { sessionId, message });
    return response.data;
  },

  async getResult(sessionId: string) {
    const response = await api.get<{
      triagemId: string;
      resumo: string;
      sintomas: string[];
      duracao: string;
      intensidade: number;
      especialidadesSugeridas: Array<{ especialidadeId: string; nome: string; reason: string; confidence: 'alta' | 'media' | 'baixa' }>;
      emergency: boolean;
      avisoExibido: boolean;
      criadoEm: string;
    }>(`/triage/${sessionId}/result`);
    return response.data;
  },
};

// Clínicas, Especialidades, Profissionais
export const catalogoApi = {
  async getClinicas() {
    const response = await api.get<any[]>('/clinicas');
    return response.data;
  },

  async getEspecialidades() {
    const response = await api.get<any[]>('/especialidades');
    return response.data;
  },

  async getProfissionais(filters?: { especialidadeId?: string; clinicaId?: string; nome?: string }) {
    const params = new URLSearchParams();
    if (filters?.especialidadeId) params.set('especialidadeId', filters.especialidadeId);
    if (filters?.clinicaId) params.set('clinicaId', filters.clinicaId);
    if (filters?.nome) params.set('nome', filters.nome);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<any[]>(`/profissionais${query}`);
    return response.data;
  },
};

// Disponibilidades
export const disponibilidadeApi = {
  async getByProfissional(profissionalId: string) {
    const response = await api.get<any[]>(`/disponibilidades?profissionalId=${profissionalId}`);
    return response.data;
  },
};

// Agendamentos
export const agendamentoApi = {
  async list(status?: 'agendado' | 'cancelado') {
    const query = status ? `?status=${status}` : '';
    const response = await api.get<any[]>(`/agendamentos${query}`);
    return response.data;
  },

  async create(data: { profissionalId: string; data: string; hora: string; observacoes?: string; triagemId?: string }) {
    const response = await api.post<{ mensagem: string; id: string; agendamento: any }>('/agendamentos', data);
    return response.data;
  },

  async cancel(agendamentoId: string) {
    const response = await api.put<{ mensagem: string; id: string; status: string }>(`/agendamentos/${agendamentoId}/cancelar`);
    return response.data;
  },

  async getById(agendamentoId: string) {
    const response = await api.get<any>(`/agendamentos/${agendamentoId}`);
    return response.data;
  },
};

// Paciente
export const pacienteApi = {
  async getById(pacienteId: string) {
    const response = await api.get<any>(`/pacientes/${pacienteId}`);
    return response.data;
  },

  async getMe() {
    // This will be called with the patient ID from auth context
    // The actual ID needs to come from the auth context
    throw new Error('Use getById with pacienteId from auth context');
  },

  async update(pacienteId: string, data: {
    nome?: string;
    telefone?: string;
    endereco?: string | {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      estado: string;
    }
  }) {
    const response = await api.put<{ mensagem: string }>(`/pacientes/${pacienteId}`, data);
    return response.data;
  },
};

// Health check
export const healthApi = {
  async check() {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;