import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

async function inspectDatabase() {
  try {
    // Get table structure
    const [columns] = await pool.execute('DESCRIBE client_sales_tracker');
    console.log('\n=== TABLE STRUCTURE ===\n');
    console.log(columns);
    
    // Get sample row
    const [rows] = await pool.execute('SELECT * FROM client_sales_tracker LIMIT 1');
    console.log('\n=== SAMPLE ROW ===\n');
    if (rows.length > 0) {
      console.log('Available fields:', Object.keys(rows[0]));
      console.log('\nSample data:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

inspectDatabase();
