/**
 * Заглушка для сервиса пользователей
 */

import { User, Role, Permission } from '../types';
import DatabaseManager from '../core/DatabaseManager';

export class UserService {
  constructor(private db: DatabaseManager) {}

  async createUser(userData: Partial<User>): Promise<User> {
    // Заглушка - всегда возвращаем фиксированного пользователя
    return {
      id: userData.id || 0,
      isBot: false,
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName,
      username: userData.username,
      languageCode: userData.languageCode || 'ru',
    };
  }

  async getUser(userId: number): Promise<User | null> {
    // Заглушка
    return {
      id: userId,
      isBot: false,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      languageCode: 'ru',
    };
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    // Заглушка
    return await this.getUser(userId) as User;
  }

  async deleteUser(userId: number): Promise<boolean> {
    // Заглушка - всегда успешно
    return true;
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    // Заглушка
    return [
      {
        id: 'user',
        name: 'Пользователь',
        permissions: [
          { id: 'calculate_delivery', name: 'Расчет доставки', description: 'Может рассчитывать доставку' },
          { id: 'view_own_history', name: 'Просмотр своей истории', description: 'Может просматривать свою историю' },
        ],
      },
    ];
  }

  async assignRole(userId: number, roleId: string): Promise<boolean> {
    // Заглушка - всегда успешно
    return true;
  }

  async removeRole(userId: number, roleId: string): Promise<boolean> {
    // Заглушка - всегда успешно
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    // Заглушка
    return [];
  }

  async getUsersByRole(roleId: string): Promise<User[]> {
    // Заглушка
    return [];
  }
}

export default UserService;
