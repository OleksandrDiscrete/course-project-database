const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "laundrydb",
  password: "Cat77779",
  port: 5432,
});

pool
  .connect()
  .then(() => console.log("Підключення до PostgreSQL успішне!"))
  .catch((err) => console.error("Помилка підключення до БД:", err));

module.exports = pool;
