// api/debuggerApi.ts — API layer for communicating with the Python debugger backend.
import axios from 'axios';
import type { RunResponse } from '../types/debugger';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${BASE}/health`, { timeout: 5000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function runCode(code: string): Promise<RunResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const res = await axios.post<RunResponse>(`${BASE}/run`, { code }, {
      signal: controller.signal,
      timeout: 30000,
    });

    clearTimeout(timeout);
    return res.data;

  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
      throw new Error(
        'Request timed out. The server may be waking up from sleep — please try again in 30 seconds.'
      );
    }
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please wait a moment before running again.');
    }
    if (!error.response) {
      throw new Error(
        'Cannot reach the server. If this is your first request, the server may be waking up — please try again in 30 seconds.'
      );
    }
    throw new Error(error.response?.data?.detail || 'Execution failed. Please try again.');
  }
}
