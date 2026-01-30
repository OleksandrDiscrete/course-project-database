const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Сервер пральні працює!",
    version: "1.0.0",
    docs: "Перейдіть на /api/docs для списку маршрутів",
  });
});

app.get("/api/testdb", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Підключення до БД успішне!",
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error("Помилка БД:", err);
    res.status(500).json({
      error: "Помилка підключення до БД",
      details: err.message,
    });
  }
});

app.get("/api/docs", (req, res) => {
  res.json({
    title: "📚 API Документація",
    base_url: "http://localhost:3001/api",
    endpoints: {
      test: "GET /api/testdb - перевірка БД",
      clients: "GET/POST/PUT/DELETE /api/clients",
      orders: "GET/POST/PUT/DELETE /api/orders",
      payments: "GET/POST/PUT/DELETE /api/payments",
      machines: "GET/POST/PUT/DELETE /api/machines",
      services: "GET/POST/PUT/DELETE /api/services",
      service_types: "GET/POST/PUT/DELETE /api/service_types",
      employees: "GET/POST/PUT/DELETE /api/employees",
      order_details: "GET/POST/PUT/DELETE /api/order_details",
      statistics: [
        "GET /api/statistics - інформація про статистику",
        "GET /api/statistics/full - повна статистика",
        "GET /api/statistics/day?date=YYYY-MM-DD - статистика за день",
        "GET /api/statistics/period?start=YYYY-MM-DD&end=YYYY-MM-DD - статистика за період",
      ],
    },
  });
});

app.get("/api/db-tables", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    res.json({
      message: "Таблиці БД",
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (err) {
    res.status(500).json({
      error: "Помилка отримання таблиць",
      details: err.message,
    });
  }
});

const clientsRouter = require("./routes/clients");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const machinesRouter = require("./routes/machines");
const statisticsRouter = require("./routes/statistics");
const serviceTypesRouter = require("./routes/service_types");
const servicesRouter = require("./routes/services");
const employeesRouter = require("./routes/employees");
const orderDetailsRouter = require("./routes/order_details");

app.use("/api/clients", clientsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/machines", machinesRouter);
app.use("/api/service_types", serviceTypesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/order_details", orderDetailsRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api/orders", ordersRouter);

app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "Маршрут не знайдено",
    requested: req.originalUrl,
    available: "Перейдіть на /api/docs для списку доступних маршрутів",
  });
});

app.use((err, req, res, next) => {
  console.error("Серверна помилка:", err);
  res.status(500).json({
    error: "Внутрішня помилка сервера",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`

                СЕРВЕР ПРАЛЬНІ ЗАПУЩЕНО!               

 Порт: ${PORT}                                           
 URL: http://localhost:${PORT}                          
 Документація: http://localhost:${PORT}/api/docs        
 Перевірка БД: http://localhost:${PORT}/api/testdb      
 Таблиці БД: http://localhost:${PORT}/api/db-tables     

  `);
  console.log("CORS дозволено для:", [
    "http://localhost:3000",
    "http://localhost:3002",
  ]);
});
