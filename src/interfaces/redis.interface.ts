/**
 * User data stored in Redis interface
 */
export interface IRedisUserData {
  phone: string;
  registered: boolean;
  subscription_status: 'pending' | 'active' | 'inactive';
  failed_attempts: number;
  last_interaction?: number; // timestamp
}

/**
 * Cooldown data stored in Redis interface
 */
export interface IRedisCooldownData {
  phone: string;
  timestamp: number;
}

/**
 * Redis key formats
 */
export const REDIS_KEYS = {
  USER_PREFIX: 'user:',
  COOLDOWN_PREFIX: 'cooldown:',
}; 