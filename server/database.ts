import mysql from 'mysql2/promise';

// Конфигурация подключения к MySQL базе данных
const dbConfig = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Создаем пул соединений для эффективного управления подключениями
export const pool = mysql.createPool(dbConfig);

// Функция для проверки подключения к базе данных
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Успешное подключение к MySQL базе данных');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Ошибка подключения к MySQL:', error);
    return false;
  }
}
