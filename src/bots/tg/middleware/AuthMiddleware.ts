/**
 * Middleware для авторизации и проверки прав доступа
 */

import { MiddlewareFunction } from '../types';
import AuthService from '../services/AuthService';
import { logger } from '../../../helpers';

export interface AuthMiddlewareOptions {
  requiredPermission?: string;
  requireAuth?: boolean;
  allowGuests?: boolean;
}

export const createAuthMiddleware = (
  authService: AuthService,
  options: AuthMiddlewareOptions = {}
): MiddlewareFunction => {
  const {
    requiredPermission,
    requireAuth = true,
    allowGuests = false,
  } = options;

  return async (ctx, next) => {
    try {
      // Проверяем наличие пользователя в контексте
      if (!ctx.from) {
        logger.warn('No user in context for auth middleware');
        await ctx.reply('Ошибка: пользователь не определен');
        return;
      }

      const telegramId = ctx.from.id;

      // Если требуется аутентификация
      if (requireAuth) {
        const authResult = await authService.authenticateUser(telegramId, ctx.from);

        if (!authResult.success) {
          logger.warn('Authentication failed', { 
            telegramId, 
            error: authResult.error 
          });

          if (allowGuests) {
            // Разрешаем гостевой доступ
            ctx.auth = {
              success: true,
              user: ctx.from,
              roles: [],
              permissions: [],
              isGuest: true,
            };
          } else {
            await ctx.reply(authResult.error || 'Ошибка аутентификации');
            return;
          }
        } else {
          ctx.auth = authResult;
        }

        // Проверка требуемого разрешения
        if (requiredPermission && !authService.hasPermission(telegramId, requiredPermission)) {
          logger.warn('Permission denied', { 
            telegramId, 
            requiredPermission 
          });

          await ctx.reply(`Доступ запрещен. Требуется разрешение: ${requiredPermission}`);
          return;
        }
      }

      await next();
    } catch (error) {
      logger.error('Auth middleware error:', error);
      await ctx.reply('Произошла ошибка при проверке доступа');
    }
  };
};

// Фабрики middleware для разных уровней доступа

export const requireAuth = (authService: AuthService): MiddlewareFunction =>
  createAuthMiddleware(authService, { requireAuth: true });

export const requireAdmin = (authService: AuthService): MiddlewareFunction =>
  createAuthMiddleware(authService, { 
    requiredPermission: 'access_admin_functions',
    requireAuth: true 
  });

export const requireManager = (authService: AuthService): MiddlewareFunction =>
  createAuthMiddleware(authService, { 
    requiredPermission: 'calculate_delivery',
    requireAuth: true 
  });

export const requireUser = (authService: AuthService): MiddlewareFunction =>
  createAuthMiddleware(authService, { 
    requiredPermission: 'calculate_delivery',
    requireAuth: true 
  });

export const allowGuests = (authService: AuthService): MiddlewareFunction =>
  createAuthMiddleware(authService, { 
    requireAuth: false,
    allowGuests: true 
  });

export const requirePermission = (
  authService: AuthService, 
  permission: string
): MiddlewareFunction =>
  createAuthMiddleware(authService, { 
    requiredPermission: permission,
    requireAuth: true 
  });

// Middleware для проверки прав на лету
export const checkPermission = (
  authService: AuthService,
  permission: string,
  onDenied?: (ctx: any) => Promise<void>
): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const hasPermission = await authService.hasPermission(ctx.from.id, permission);

    if (!hasPermission) {
      logger.warn('Permission check failed', { 
        telegramId: ctx.from.id, 
        permission 
      });

      if (onDenied) {
        await onDenied(ctx);
      } else {
        await ctx.reply(`Доступ запрещен. Требуется разрешение: ${permission}`);
      }
      return;
    }

    await next();
  };
};

// Middleware для проверки множественных разрешений
export const requireAnyPermission = (
  authService: AuthService,
  permissions: string[],
  onDenied?: (ctx: any) => Promise<void>
): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const hasAnyPermission = await authService.hasAnyPermission(ctx.from.id, permissions);

    if (!hasAnyPermission) {
      logger.warn('Multiple permissions check failed', { 
        telegramId: ctx.from.id, 
        permissions 
      });

      if (onDenied) {
        await onDenied(ctx);
      } else {
        await ctx.reply(`Доступ запрещен. Требуется одно из разрешений: ${permissions.join(', ')}`);
      }
      return;
    }

    await next();
  };
};

export const requireAllPermissions = (
  authService: AuthService,
  permissions: string[],
  onDenied?: (ctx: any) => Promise<void>
): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const hasAllPermissions = await authService.hasAllPermissions(ctx.from.id, permissions);

    if (!hasAllPermissions) {
      logger.warn('All permissions check failed', { 
        telegramId: ctx.from.id, 
        permissions 
      });

      if (onDenied) {
        await onDenied(ctx);
      } else {
        await ctx.reply(`Доступ запрещен. Требуются все разрешения: ${permissions.join(', ')}`);
      }
      return;
    }

    await next();
  };
};

// Middleware для проверки ролей
export const requireRole = (
  authService: AuthService,
  roleName: string,
  onDenied?: (ctx: any) => Promise<void>
): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const roles = await authService.getUserRoles(ctx.from.id);
    const hasRole = roles.some(role => role.name === roleName);

    if (!hasRole) {
      logger.warn('Role check failed', { 
        telegramId: ctx.from.id, 
        requiredRole: roleName 
      });

      if (onDenied) {
        await onDenied(ctx);
      } else {
        await ctx.reply(`Доступ запрещен. Требуется роль: ${roleName}`);
      }
      return;
    }

    await next();
  };
};

// Middleware для логирования действий
export const auditLog = (
  _authService: AuthService,
  action: string,
  resource?: string
): MiddlewareFunction => {
  return async (ctx, next) => {
    const start = Date.now();
    
    try {
      await next();
      
      const duration = Date.now() - start;
      
      logger.info('Action completed', {
        action,
        resource,
        telegramId: ctx.from?.id,
        username: ctx.from?.username,
        chatId: ctx.chat?.id,
        duration,
        success: true,
      });
    } catch (error: any) {
      const duration = Date.now() - start;
      
      logger.error('Action failed', {
        action,
        resource,
        telegramId: ctx.from?.id,
        username: ctx.from?.username,
        chatId: ctx.chat?.id,
        duration,
        error: error.message,
        success: false,
      });
      
      throw error;
    }
  };
};

// Middleware для ограничения частоты запросов
export const rateLimit = (
  maxRequests: number = 30,
  windowMs: number = 60000 // 1 минута
): MiddlewareFunction => {
  const requests = new Map<number, { count: number; resetTime: number }>();

  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const telegramId = ctx.from.id;
    const now = Date.now();
    const userRequests = requests.get(telegramId);

    if (!userRequests || now > userRequests.resetTime) {
      // Новый пользователь или истекшее время окна
      requests.set(telegramId, {
        count: 1,
        resetTime: now + windowMs,
      });
    } else if (userRequests.count >= maxRequests) {
      // Превышен лимит
      logger.warn('Rate limit exceeded', { 
        telegramId, 
        count: userRequests.count,
        maxRequests 
      });

      await ctx.reply(`Превышен лимит запросов. Попробуйте через ${Math.ceil((userRequests.resetTime - now) / 1000)} секунд`);
      return;
    } else {
      // Увеличиваем счетчик
      userRequests.count++;
    }

    await next();
  };
};

// Комбинированный middleware для админ-функций
export const adminOnly = (authService: AuthService): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const isAdmin = await authService.isUserAdmin(ctx.from.id);

    if (!isAdmin) {
      logger.warn('Admin access denied', { telegramId: ctx.from.id });
      await ctx.reply('Эта функция доступна только администраторам');
      return;
    }

    await next();
  };
};

// Комбинированный middleware для менеджерских функций
export const managerOnly = (authService: AuthService): MiddlewareFunction => {
  return async (ctx, next) => {
    if (!ctx.from) {
      await ctx.reply('Ошибка: пользователь не определен');
      return;
    }

    const isManager = await authService.isUserManager(ctx.from.id);

    if (!isManager) {
      logger.warn('Manager access denied', { telegramId: ctx.from.id });
      await ctx.reply('Эта функция доступна только менеджерам');
      return;
    }

    await next();
  };
};

export default {
  createAuthMiddleware,
  requireAuth,
  requireAdmin,
  requireManager,
  requireUser,
  allowGuests,
  requirePermission,
  checkPermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  auditLog,
  rateLimit,
  adminOnly,
  managerOnly,
};
