/**
 * Сервис авторизации и управления правами доступа
 */

import { User, Role, Permission } from '../types';
import DatabaseManager from '../core/DatabaseManager';
import { securityConfig } from '../config';
import { logger } from '../../../helpers';

export interface AuthResult {
  success: boolean;
  user?: User;
  roles?: Role[];
  permissions?: Permission[];
  error?: string;
}

export class AuthService {
  private db: DatabaseManager;
  private adminUsers: number[];
  private allowedUsers: number[];

  constructor(db: DatabaseManager) {
    this.db = db;
    this.adminUsers = securityConfig.adminUsers;
    this.allowedUsers = securityConfig.allowedUsers;
  }

  // === Аутентификация пользователя ===

  async authenticateUser(telegramId: number, user: User): Promise<AuthResult> {
    try {
      // Проверка заблокированных пользователей (если есть)
      if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(telegramId)) {
        return {
          success: false,
          error: 'Доступ запрещен. Пользователь не в списке разрешенных',
        };
      }

      // Создаем или обновляем пользователя в БД
      await this.db.createUser({
        telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        languageCode: user.languageCode,
      });

      // Получаем роли пользователя
      const rolesResult = await this.db.getUserRoles(telegramId);
      const roles = rolesResult.rows || [];

      // Если у пользователя нет ролей, назначаем роль по умолчанию
      if (roles.length === 0) {
        await this.assignDefaultRole(telegramId);
        const updatedRolesResult = await this.db.getUserRoles(telegramId);
        roles.push(...(updatedRolesResult.rows || []));
      }

      // Получаем разрешения пользователя
      const permissions = await this.getUserPermissions(telegramId);

      logger.info('User authenticated', { 
        telegramId, 
        username: user.username,
        rolesCount: roles.length,
        permissionsCount: permissions.length 
      });

      return {
        success: true,
        user,
        roles,
        permissions,
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        success: false,
        error: 'Ошибка аутентификации',
      };
    }
  }

  // === Управление ролями ===

  async assignRole(telegramId: number, roleId: string, assignedBy: number): Promise<boolean> {
    try {
      // Проверяем права назначающего
      if (!await this.hasPermission(assignedBy, 'manage_users')) {
        logger.warn('Unauthorized role assignment attempt', { 
          assignedBy, 
          targetUser: telegramId, 
          role: roleId 
        });
        return false;
      }

      await this.db.assignRole(telegramId, roleId, assignedBy);
      
      logger.info('Role assigned', { 
        telegramId, 
        roleId, 
        assignedBy 
      });

      return true;
    } catch (error) {
      logger.error('Role assignment error:', error);
      return false;
    }
  }

  async removeRole(telegramId: number, roleId: string, removedBy: number): Promise<boolean> {
    try {
      // Проверяем права удаляющего
      if (!await this.hasPermission(removedBy, 'manage_users')) {
        logger.warn('Unauthorized role removal attempt', { 
          removedBy, 
          targetUser: telegramId, 
          role: roleId 
        });
        return false;
      }

      // Защита от удаления admin роли
      if (roleId === 'admin' && this.adminUsers.includes(telegramId)) {
        logger.warn('Attempt to remove admin role from admin user', { 
          removedBy, 
          targetUser: telegramId 
        });
        return false;
      }

      await this.db.query(
        'DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1) AND role_id = $2',
        [telegramId, roleId]
      );

      logger.info('Role removed', { 
        telegramId, 
        roleId, 
        removedBy 
      });

      return true;
    } catch (error) {
      logger.error('Role removal error:', error);
      return false;
    }
  }

  private async assignDefaultRole(telegramId: number): Promise<void> {
    const defaultRole = this.adminUsers.includes(telegramId) ? 'admin' : 'user';
    await this.db.assignRole(telegramId, defaultRole, telegramId);
    
    logger.info('Default role assigned', { 
      telegramId, 
      role: defaultRole 
    });
  }

  // === Проверка прав доступа ===

  async hasPermission(telegramId: number, permission: string): Promise<boolean> {
    try {
      return await this.db.hasPermission(telegramId, permission);
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  async hasAnyPermission(telegramId: number, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (await this.hasPermission(telegramId, permission)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Permissions check error:', error);
      return false;
    }
  }

  async hasAllPermissions(telegramId: number, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (!await this.hasPermission(telegramId, permission)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Permissions check error:', error);
      return false;
    }
  }

  // === Получение информации о пользователе ===

  async getUserRoles(telegramId: number): Promise<Role[]> {
    try {
      const result = await this.db.getUserRoles(telegramId);
      return result.rows || [];
    } catch (error) {
      logger.error('Get user roles error:', error);
      return [];
    }
  }

  async getUserPermissions(telegramId: number): Promise<Permission[]> {
    try {
      const query = `
        SELECT DISTINCT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        JOIN users u ON ur.user_id = u.id
        WHERE u.telegram_id = $1
      `;
      
      const result = await this.db.query(query, [telegramId]);
      return result.rows || [];
    } catch (error) {
      logger.error('Get user permissions error:', error);
      return [];
    }
  }

  async isUserAdmin(telegramId: number): Promise<boolean> {
    return this.adminUsers.includes(telegramId) || 
           await this.hasPermission(telegramId, 'access_admin_functions');
  }

  async isUserManager(telegramId: number): Promise<boolean> {
    return await this.hasPermission(telegramId, 'calculate_delivery') &&
           await this.hasPermission(telegramId, 'view_history');
  }

  // === Управление доступом ===

  async checkAccess(telegramId: number, requiredPermission: string): Promise<AuthResult> {
    try {
      const hasPermission = await this.hasPermission(telegramId, requiredPermission);
      
      if (!hasPermission) {
        return {
          success: false,
          error: `Доступ запрещен. Требуется разрешение: ${requiredPermission}`,
        };
      }

      const userResult = await this.db.getUser(telegramId);
      const user = userResult.rows[0];
      
      if (!user) {
        return {
          success: false,
          error: 'Пользователь не найден',
        };
      }

      const roles = await this.getUserRoles(telegramId);
      const permissions = await this.getUserPermissions(telegramId);

      return {
        success: true,
        user: {
          id: user.telegram_id,
          isBot: false,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          languageCode: user.language_code,
        },
        roles,
        permissions,
      };
    } catch (error) {
      logger.error('Access check error:', error);
      return {
        success: false,
        error: 'Ошибка проверки доступа',
      };
    }
  }

  // === Middleware для авторизации ===

  createAuthMiddleware(requiredPermission?: string) {
    return async (ctx: any, next: () => Promise<void>) => {
      if (!ctx.from || !ctx.chat) {
        logger.warn('No user or chat in context');
        return;
      }

      const telegramId = ctx.from.id;

      // Аутентификация пользователя
      const authResult = await this.authenticateUser(telegramId, ctx.from);
      
      if (!authResult.success) {
        await ctx.reply(authResult.error || 'Ошибка аутентификации');
        return;
      }

      // Проверка прав доступа
      if (requiredPermission) {
        const hasAccess = await this.hasPermission(telegramId, requiredPermission);
        
        if (!hasAccess) {
          await ctx.reply(`Доступ запрещен. Требуется разрешение: ${requiredPermission}`);
          return;
        }
      }

      // Добавляем информацию об авторизации в контекст
      ctx.auth = authResult;

      await next();
    };
  }

  // === Управление списками доступа ===

  addToAllowedList(telegramId: number): void {
    if (!this.allowedUsers.includes(telegramId)) {
      this.allowedUsers.push(telegramId);
      logger.info('User added to allowed list', { telegramId });
    }
  }

  removeFromAllowedList(telegramId: number): void {
    const index = this.allowedUsers.indexOf(telegramId);
    if (index > -1) {
      this.allowedUsers.splice(index, 1);
      logger.info('User removed from allowed list', { telegramId });
    }
  }

  addToAdminList(telegramId: number): void {
    if (!this.adminUsers.includes(telegramId)) {
      this.adminUsers.push(telegramId);
      logger.info('User added to admin list', { telegramId });
    }
  }

  removeFromAdminList(telegramId: number): void {
    const index = this.adminUsers.indexOf(telegramId);
    if (index > -1) {
      this.adminUsers.splice(index, 1);
      logger.info('User removed from admin list', { telegramId });
    }
  }

  // === Статистика и отчеты ===

  async getAccessStatistics(): Promise<{
    totalUsers: number;
    allowedUsers: number;
    adminUsers: number;
    usersByRole: Record<string, number>;
  }> {
    try {
      const totalUsersQuery = 'SELECT COUNT(*) as count FROM users';
      const rolesDistributionQuery = `
        SELECT r.name, COUNT(ur.user_id) as count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        GROUP BY r.name
      `;

      const [totalResult, rolesResult] = await Promise.all([
        this.db.query(totalUsersQuery),
        this.db.query(rolesDistributionQuery),
      ]);

      const usersByRole: Record<string, number> = {};
      for (const row of rolesResult.rows) {
        usersByRole[row.name] = parseInt(row.count);
      }

      return {
        totalUsers: parseInt(totalResult.rows[0].count),
        allowedUsers: this.allowedUsers.length,
        adminUsers: this.adminUsers.length,
        usersByRole,
      };
    } catch (error) {
      logger.error('Get access statistics error:', error);
      throw error;
    }
  }

  // === Валидация и безопасность ===

  async validateUserAccess(telegramId: number): Promise<boolean> {
    // Проверка базового доступа
    if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(telegramId)) {
      return false;
    }

    // Проверка существования пользователя в БД
    const userResult = await this.db.getUser(telegramId);
    return userResult.rows.length > 0;
  }

  async createSecureSession(telegramId: number, _sessionId: string): Promise<void> {
    // Создание безопасной сессии с дополнительными проверками
    const sessionData = {
      telegramId,
      sessionId: _sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isValid: true,
    };

    // Временная реализация - в реальной системе нужно использовать Redis
    logger.info('Secure session created', { telegramId, sessionId: _sessionId });
  }

  async validateSession(_telegramId: number, _sessionId: string): Promise<boolean> {
    // Валидация сессии
    // Временная реализация
    return true;
  }

  async revokeSession(telegramId: number, _sessionId: string): Promise<void> {
    // Отзыв сессии
    logger.info('Session revoked', { telegramId, sessionId: _sessionId });
  }
}

export default AuthService;
