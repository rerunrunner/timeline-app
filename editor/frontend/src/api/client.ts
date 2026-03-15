import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface Column {
  name: string;
  type: string;
  not_null: boolean;
  default_value: any;
  primary_key: boolean;
}

export interface ForeignKey {
  column: string;
  references_table: string;
  references_column: string;
}

export interface CheckConstraint {
  expression: string;
  description: string;
}

export interface TableInfo {
  columns: Column[];
  foreign_keys: ForeignKey[];
  check_constraints: CheckConstraint[];
}

export interface Schema {
  tables: Record<string, TableInfo>;
  foreign_keys: Record<string, { references_table: string; references_column: string }>;
}

export interface ReferenceOption {
  value: string;
  label: string;
}

// API functions
export const getSchema = async (): Promise<Schema> => {
  const response = await api.get('/schema');
  return response.data;
};

export const getTableData = async (tableName: string, search?: string, limit?: number): Promise<any[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', limit.toString());
  
  const response = await api.get(`/tables/${tableName}?${params}`);
  return response.data;
};

export const getReferenceData = async (tableName: string, displayColumn?: string): Promise<ReferenceOption[]> => {
  const params = new URLSearchParams();
  if (displayColumn) params.append('display_column', displayColumn);
  
  const response = await api.get(`/tables/${tableName}/references?${params}`);
  return response.data;
};

export const createRecord = async (tableName: string, data: Record<string, any>): Promise<any> => {
  const response = await api.post(`/tables/${tableName}`, data);
  return response.data;
};

export const updateRecord = async (tableName: string, recordId: string, data: Record<string, any>): Promise<any> => {
  const response = await api.put(`/tables/${tableName}/${recordId}`, data);
  return response.data;
};

export const deleteRecord = async (tableName: string, recordId: string): Promise<any> => {
  const response = await api.delete(`/tables/${tableName}/${recordId}`);
  return response.data;
};

export default api;
