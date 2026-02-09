// Mock Supabase client
import { jest } from '@jest/globals';

export const createClient = jest.fn((url, key) => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      })
    },
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: table === 'user_profiles' ? { role: 'super_admin' } : null,
        error: null
      }),
      then: jest.fn((callback) => callback({
        data: [],
        error: null
      }))
    }))
  };
  return mockSupabase;
});