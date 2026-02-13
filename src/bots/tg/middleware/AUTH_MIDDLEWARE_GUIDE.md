# 🛡️ **AuthMiddleware - Система авторизации и контроля доступа**

## 🎯 **Для чего нужен этот код:**

**AuthMiddleware** - это мощная система контроля доступа, которая обеспечивает:

1. **🔐 Аутентификацию** - проверка личности пользователя
2. **🎭 Авторизацию** - проверка прав и разрешений  
3. **📊 Аудит** - логирование действий
4. **⏱️ Ограничения** - rate limiting и защита

---

## 🏗️ **Основные компоненты:**

### **AuthMiddlewareOptions** - Настройки доступа:
```typescript
{
  requiredPermission?: string,  // Требуемое разрешение
  requireAuth?: boolean,      // Требовать ли аутентификацию
  allowGuests?: boolean       // Разрешить ли гостевой доступ
}
```

### **Результат аутентификации:**
```typescript
ctx.auth = {
  success: boolean,          // Успешность
  user: User,             // Данные пользователя
  roles: Role[],          // Роли пользователя
  permissions: string[],   // Разрешения
  isGuest: boolean        // Признак гостя
}
```

---

## 🚀 **Как использовать:**

### **1. Базовые фабрики middleware:**
```typescript
import { requireAuth, requireAdmin, requireUser, allowGuests } from './middleware/AuthMiddleware';

// Только аутентифицированные пользователи
bot.command('/profile', requireAuth(authService), async (ctx) => {
  await ctx.reply(`Ваш профиль: ${ctx.auth.user.firstName}`);
});

// Только администраторы
bot.command('/admin', requireAdmin(authService), async (ctx) => {
  await ctx.reply('Панель администратора');
});

// Только пользователи с правами
bot.command('/calculate', requireUser(authService), async (ctx) => {
  await ctx.reply('Калькулятор доставки');
});

// Разрешить гостям
bot.command('/help', allowGuests(authService), async (ctx) => {
  await ctx.reply('Справка (доступна всем)');
});
```

### **2. Проверка конкретных разрешений:**
```typescript
import { requirePermission, checkPermission } from './middleware/AuthMiddleware';

// Требовать конкретное разрешение
bot.command('/reports', requirePermission(authService, 'view_reports'), async (ctx) => {
  await ctx.reply('Отчеты');
});

// Проверка разрешения внутри обработчика
bot.command('/action', async (ctx) => {
  // Используем checkPermission middleware
  await checkPermission(authService, 'delete_data', async (ctx) => {
    await ctx.reply('Данные удалены');
  })(ctx, () => {}); // Пример использования
});
```

### **3. Множественные разрешения:**
```typescript
import { requireAnyPermission, requireAllPermissions } from './middleware/AuthMiddleware';

// Требовать ЛЮБОЕ из разрешений
bot.command('/moderate', requireAnyPermission(authService, [
  'delete_comments',
  'ban_users',
  'edit_posts'
]), async (ctx) => {
  await ctx.reply('Функции модерации');
});

// Требовать ВСЕ разрешения
bot.command('/super_admin', requireAllPermissions(authService, [
  'manage_users',
  'manage_system',
  'view_logs'
]), async (ctx) => {
  await ctx.reply('Супер-админ панель');
});
```

### **4. Проверка ролей:**
```typescript
import { requireRole } from './middleware/AuthMiddleware';

// Требовать конкретную роль
bot.command('/manager_panel', requireRole(authService, 'manager'), async (ctx) => {
  await ctx.reply('Панель менеджера');
});

// С кастомным сообщением при отказе
bot.command('/vip', requireRole(authService, 'vip', async (ctx) => {
  await ctx.reply('🚫 VIP-доступ только для премиум пользователей');
}), async (ctx) => {
  await ctx.reply('🌟 VIP-панель');
});
```

---

## 📊 **Продвинутые возможности:**

### **1. Аудит действий:**
```typescript
import { auditLog } from './middleware/AuthMiddleware';

// Логировать все действия
bot.use(auditLog(authService, 'user_action', 'bot_command'));

// Логировать конкретные действия
bot.command('/delete', 
  auditLog(authService, 'delete_user', 'user_management'),
  async (ctx) => {
    await ctx.reply('Пользователь удален');
  }
);
```

### **2. Rate Limiting:**
```typescript
import { rateLimit } from './middleware/AuthMiddleware';

// Ограничение 30 запросов в минуту
bot.use(rateLimit(30, 60000));

// Разные ограничения для разных команд
bot.command('/api', rateLimit(10, 60000), async (ctx) => {
  await ctx.reply('API endpoint (10 запросов/минуту)');
});
```

### **3. Комбинированные проверки:**
```typescript
import { adminOnly, managerOnly } from './middleware/AuthMiddleware';

// Только администраторы
bot.command('/system', adminOnly(authService), async (ctx) => {
  await ctx.reply('Системные функции');
});

// Только менеджеры
bot.command('/manage', managerOnly(authService), async (ctx) => {
  await ctx.reply('Управление');
});
```

---

## 🎯 **Пример реального использования:**

```typescript
// Инициализация
const authService = new AuthService(databaseManager);

// Глобальные middleware
bot.use(auditLog(authService, 'bot_request'));
bot.use(rateLimit(30, 60000));

// Публичные команды
bot.command('/start', allowGuests(authService), async (ctx) => {
  await ctx.reply('Добро пожаловать!');
});

// Пользовательские команды
bot.command('/profile', requireAuth(authService), async (ctx) => {
  await ctx.reply(`Профиль: ${ctx.auth.user.firstName}`);
});

// Команда с правами
bot.command('/calculate', 
  requirePermission(authService, 'calculate_delivery'),
  auditLog(authService, 'delivery_calculation'),
  async (ctx) => {
    await ctx.reply('Введите данные для расчета');
  }
);

// Административные команды
bot.command('/admin', 
  adminOnly(authService),
  auditLog(authService, 'admin_access', 'admin_panel'),
  async (ctx) => {
    await ctx.reply('🔧 Панель администратора');
  }
);
```

---

## 🛡️ **Система разрешений:**

| Уровень доступа | Разрешение | Пример использования |
|----------------|------------|-------------------|
| **Гость** | - | `/start`, `/help` |
| **Пользователь** | `calculate_delivery` | `/calculate`, `/history` |
| **Менеджер** | `manage_deliveries` | `/manage`, `/reports` |
| **Администратор** | `access_admin_functions` | `/admin`, `/system` |
| **Супер-админ** | `manage_system` | `/config`, `/logs` |

---

## 📋 **Доступные фабрики middleware:**

### **Базовые:**
- `requireAuth()` - Требовать аутентификацию
- `requireAdmin()` - Только администраторы
- `requireManager()` - Только менеджеры
- `requireUser()` - Только пользователи
- `allowGuests()` - Разрешить гостям

### **Разрешения:**
- `requirePermission(permission)` - Требовать конкретное разрешение
- `checkPermission(permission, onDenied)` - Проверка с кастомным действием
- `requireAnyPermission(permissions)` - Любое из разрешений
- `requireAllPermissions(permissions)` - Все разрешения

### **Роли:**
- `requireRole(roleName, onDenied)` - Требовать конкретную роль

### **Специальные:**
- `auditLog(action, resource)` - Логирование действий
- `rateLimit(maxRequests, windowMs)` - Ограничение частоты
- `adminOnly()` - Только администраторы
- `managerOnly()` - Только менеджеры

---

## ⚡ **Преимущества:**

- ✅ **Гибкость** - множество готовых фабрик
- ✅ **Безопасность** - многоуровневая проверка
- ✅ **Аудит** - полное логирование действий
- ✅ **Защита** - rate limiting и throttling
- ✅ **Комбинируемость** - можно смешивать middleware
- ✅ **Кастомизация** - свои сообщения при отказе

---

## 🔧 **Пример кастомного middleware:**

```typescript
// Создание кастомного middleware
const customAuth = createAuthMiddleware(authService, {
  requiredPermission: 'custom_action',
  requireAuth: true,
  allowGuests: false
});

// Использование
bot.command('/custom', customAuth, async (ctx) => {
  await ctx.reply('Кастомная функция с авторизацией');
});
```

---

## 📝 **Логирование и мониторинг:**

Middleware автоматически логирует:
- ✅ Успешные аутентификации
- ❌ Неудачные попытки доступа
- ⚠️ Отказы в разрешениях
- 📊 Статистику действий
- 🚫 Превышения rate limits

---

**🎉 AuthMiddleware - это профессиональная система контроля доступа для Enterprise-уровня!**
