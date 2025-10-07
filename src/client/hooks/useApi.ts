import { useMemo } from 'react';
import { apiClient } from '../api/client.js';

export const useApi = () => {
  return useMemo(() => apiClient, []);
};
