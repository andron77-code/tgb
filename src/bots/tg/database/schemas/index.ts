/**
 * Экспорт всех схем базы данных
 */

import * as fs from 'fs';
import * as path from 'path';

// Загружаем SQL схему
const initialSchemaSQL = fs.readFileSync(
  path.join(__dirname, '001_initial_schema.sql'),
  'utf8'
);

export { initialSchemaSQL };
