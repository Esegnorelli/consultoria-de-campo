// API client for Consultoria de Campo

export interface Submission {
  id: number;
  unit_name: string;
  inspector_name: string;
  date: string;
  score: number;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionData {
  unit_name: string;
  inspector_name: string;
  date: string;
  score: number;
  data: any;
}

export interface UpdateSubmissionData {
  unit_name?: string;
  inspector_name?: string;
  date?: string;
  score?: number;
  data?: any;
}

const API_BASE = '/api';

export const api = {
  // Criar nova submissão
  async createSubmission(data: CreateSubmissionData): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create submission');
    }

    return response.json();
  },

  // Listar todas as submissões
  async getSubmissions(): Promise<Submission[]> {
    const response = await fetch(`${API_BASE}/submissions`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch submissions');
    }

    return response.json();
  },

  // Buscar uma submissão
  async getSubmission(id: number): Promise<Submission> {
    const response = await fetch(`${API_BASE}/submissions/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch submission');
    }

    return response.json();
  },

  // Atualizar submissão
  async updateSubmission(id: number, data: UpdateSubmissionData): Promise<Submission> {
    const response = await fetch(`${API_BASE}/submissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update submission');
    }

    return response.json();
  },

  // Excluir submissão
  async deleteSubmission(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/submissions/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete submission');
    }

    return response.json();
  },
};
