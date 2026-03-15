import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Schema, getSchema } from '../api/client';

interface SchemaContextType {
  schema: Schema | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

export const useSchema = () => {
  const context = useContext(SchemaContext);
  if (context === undefined) {
    throw new Error('useSchema must be used within a SchemaProvider');
  }
  return context;
};

interface SchemaProviderProps {
  children: ReactNode;
}

export const SchemaProvider: React.FC<SchemaProviderProps> = ({ children }) => {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSchema();
      setSchema(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  return (
    <SchemaContext.Provider value={{ schema, loading, error, refetch: fetchSchema }}>
      {children}
    </SchemaContext.Provider>
  );
};
