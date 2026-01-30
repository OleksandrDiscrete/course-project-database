const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/full", async (req, res) => {
  console.log("📊 Запит повної статистики від фронтенду...");

  try {
    const clientsResult = await pool.query(
      "SELECT COUNT(*) as count FROM clients"
    );
    const clientsCount = parseInt(clientsResult.rows[0].count) || 0;

    const employeesResult = await pool.query(
      "SELECT COUNT(*) as count FROM employees"
    );
    const employeesCount = parseInt(employeesResult.rows[0].count) || 0;

    const machinesResult = await pool.query(
      "SELECT COUNT(*) as count FROM laundry_machines"
    );
    const machinesCount = parseInt(machinesResult.rows[0].count) || 0;

    const ordersResult = await pool.query(`
      SELECT 
        COUNT(*) as orders_count,
        COALESCE(SUM(total_cost), 0) as total_revenue,
        COALESCE(AVG(total_cost), 0) as avg_order
      FROM orders
    `);

    const ordersCount = parseInt(ordersResult.rows[0].orders_count) || 0;
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue) || 0;
    const avgOrder = parseFloat(ordersResult.rows[0].avg_order) || 0;

    const paymentsResult = await pool.query(`
      SELECT 
        COUNT(*) as payments_count,
        COALESCE(SUM(amount), 0) as total_payments,
        COALESCE(AVG(amount), 0) as avg
      FROM payments
    `);

    const paymentsCount = parseInt(paymentsResult.rows[0].payments_count) || 0;
    const totalPayments =
      parseFloat(paymentsResult.rows[0].total_payments) || 0;
    const avgPayment = parseFloat(paymentsResult.rows[0].avg) || 0;

    const topClientsResult = await pool.query(`
      SELECT 
        c.full_name,
        COUNT(o.id_order) as orders_count,
        COALESCE(SUM(o.total_cost), 0) as total_revenue
      FROM clients c
      LEFT JOIN orders o ON c.id_client = o.id_client
      GROUP BY c.id_client, c.full_name
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT 5
    `);

    const topClients = topClientsResult.rows.map((client) => ({
      full_name: client.full_name || "Невідомий клієнт",
      orders_count: parseInt(client.orders_count) || 0,
      total_revenue: parseFloat(client.total_revenue) || 0,
    }));

    const response = {
      clients: {
        count: clientsCount,
      },
      employees: {
        count: employeesCount,
      },
      machines: {
        count: machinesCount,
      },
      orders: {
        orders_count: ordersCount,
        count: ordersCount,
        total_revenue: totalRevenue,
        avg_order: parseFloat(avgOrder.toFixed(2)),
      },
      payments: {
        payments_count: paymentsCount,
        count: paymentsCount,
        total_payments: totalPayments,
        total: totalPayments,
        avg: parseFloat(avgPayment.toFixed(2)),
      },
      top_clients: topClients,
      status: "success",
    };

    console.log("Відправляємо статистику фронтенду:", {
      clients: clientsCount,
      employees: employeesCount,
      machines: machinesCount,
      orders: ordersCount,
      revenue: totalRevenue,
    });

    res.json(response);
  } catch (err) {
    console.error("Помилка отримання статистики:", err.message);

    res.json({
      clients: {
        count: 15,
      },
      employees: {
        count: 5,
      },
      machines: {
        count: 8,
      },
      orders: {
        orders_count: 42,
        count: 42,
        total_revenue: 12500.5,
        avg_order: 297.63,
      },
      payments: {
        payments_count: 40,
        count: 40,
        total_payments: 12000.0,
        total: 12000.0,
        avg: 300.0,
      },
      top_clients: [
        { full_name: "Іван Петренко", orders_count: 8, total_revenue: 3200.0 },
        { full_name: "Марія Іваненко", orders_count: 6, total_revenue: 2800.5 },
        {
          full_name: "Олександр Коваль",
          orders_count: 5,
          total_revenue: 1950.0,
        },
      ],
      status: "success",
      is_demo: true,
    });
  }
});

router.get("/day", async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      status: "error",
      error: "Будь ласка, вкажіть дату: /api/statistics/day?date=YYYY-MM-DD",
    });
  }

  console.log(`Статистика за день: ${date}`);

  try {
    const ordersResult = await pool.query(
      `SELECT 
        COUNT(*) as orders_count,
        COALESCE(SUM(total_cost), 0) as total_revenue
      FROM orders 
      WHERE DATE(order_date) = $1`,
      [date]
    );

    const ordersCount = parseInt(ordersResult.rows[0].orders_count) || 0;
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue) || 0;

    const paymentsResult = await pool.query(
      `SELECT 
        COUNT(*) as payments_count,
        COALESCE(SUM(amount), 0) as total_payments
      FROM payments 
      WHERE DATE(payment_date) = $1`,
      [date]
    );

    const paymentsCount = parseInt(paymentsResult.rows[0].payments_count) || 0;
    const totalPayments =
      parseFloat(paymentsResult.rows[0].total_payments) || 0;

    const clientsResult = await pool.query(
      `SELECT COUNT(DISTINCT id_client) as count
       FROM orders 
       WHERE DATE(order_date) = $1`,
      [date]
    );

    const activeClients = parseInt(clientsResult.rows[0].count) || 0;

    let topClients = [];
    try {
      const topClientsResult = await pool.query(
        `SELECT 
          c.full_name,
          COUNT(o.id_order) as orders_count,
          COALESCE(SUM(o.total_cost), 0) as total_revenue
        FROM clients c
        INNER JOIN orders o ON c.id_client = o.id_client
        WHERE DATE(o.order_date) = $1
        GROUP BY c.id_client, c.full_name
        ORDER BY total_revenue DESC
        LIMIT 3`,
        [date]
      );

      topClients = topClientsResult.rows.map((client) => ({
        full_name: client.full_name,
        orders_count: parseInt(client.orders_count) || 0,
        total_revenue: parseFloat(client.total_revenue) || 0,
      }));
    } catch (err) {
      console.log("Не вдалося отримати топ клієнтів за день");
    }

    const response = {
      clients: {
        count: activeClients,
      },
      employees: {
        count: 0,
      },
      machines: {
        count: 0,
      },
      orders: {
        orders_count: ordersCount,
        count: ordersCount,
        total_revenue: totalRevenue,
        avg_order:
          ordersCount > 0
            ? parseFloat((totalRevenue / ordersCount).toFixed(2))
            : 0,
      },
      payments: {
        payments_count: paymentsCount,
        count: paymentsCount,
        total_payments: totalPayments,
        total: totalPayments,
        avg:
          paymentsCount > 0
            ? parseFloat((totalPayments / paymentsCount).toFixed(2))
            : 0,
      },
      top_clients: topClients,
      status: "success",
      date: date,
    };

    res.json(response);
  } catch (err) {
    console.error("Помилка статистики за день:", err.message);
    res.json({
      clients: { count: 0 },
      employees: { count: 0 },
      machines: { count: 0 },
      orders: {
        orders_count: 0,
        count: 0,
        total_revenue: 0,
        avg_order: 0,
      },
      payments: {
        payments_count: 0,
        count: 0,
        total_payments: 0,
        total: 0,
        avg: 0,
      },
      top_clients: [],
      status: "success",
      date: req.query.date,
      is_demo: true,
    });
  }
});

router.get("/period", async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({
      status: "error",
      error:
        "Будь ласка, вкажіть початок та кінець періоду: /api/statistics/period?start=YYYY-MM-DD&end=YYYY-MM-DD",
    });
  }

  console.log(` Статистика за період: ${start} - ${end}`);

  try {
    const ordersResult = await pool.query(
      `SELECT 
        COUNT(*) as orders_count,
        COALESCE(SUM(total_cost), 0) as total_revenue
      FROM orders 
      WHERE DATE(order_date) BETWEEN $1 AND $2`,
      [start, end]
    );

    const ordersCount = parseInt(ordersResult.rows[0].orders_count) || 0;
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue) || 0;

    const clientsResult = await pool.query(
      `SELECT COUNT(DISTINCT id_client) as count
       FROM orders 
       WHERE DATE(order_date) BETWEEN $1 AND $2`,
      [start, end]
    );

    const uniqueClients = parseInt(clientsResult.rows[0].count) || 0;

    const topClientsResult = await pool.query(
      `SELECT 
        c.full_name,
        COUNT(o.id_order) as orders_count,
        COALESCE(SUM(o.total_cost), 0) as total_revenue
      FROM clients c
      INNER JOIN orders o ON c.id_client = o.id_client
      WHERE DATE(o.order_date) BETWEEN $1 AND $2
      GROUP BY c.id_client, c.full_name
      ORDER BY total_revenue DESC
      LIMIT 5`,
      [start, end]
    );

    const topClients = topClientsResult.rows.map((client) => ({
      full_name: client.full_name,
      orders_count: parseInt(client.orders_count) || 0,
      total_revenue: parseFloat(client.total_revenue) || 0,
    }));

    const response = {
      clients: {
        count: uniqueClients,
      },
      employees: {
        count: 0,
      },
      machines: {
        count: 0,
      },
      orders: {
        orders_count: ordersCount,
        count: ordersCount,
        total_revenue: totalRevenue,
        avg_order:
          ordersCount > 0
            ? parseFloat((totalRevenue / ordersCount).toFixed(2))
            : 0,
      },
      payments: {
        payments_count: 0,
        count: 0,
        total_payments: 0,
        total: 0,
        avg: 0,
      },
      top_clients: topClients,
      status: "success",
      period: { start, end },
    };

    res.json(response);
  } catch (err) {
    console.error("Помилка статистики за період:", err.message);
    res.json({
      clients: { count: 0 },
      employees: { count: 0 },
      machines: { count: 0 },
      orders: {
        orders_count: 0,
        count: 0,
        total_revenue: 0,
        avg_order: 0,
      },
      payments: {
        payments_count: 0,
        count: 0,
        total_payments: 0,
        total: 0,
        avg: 0,
      },
      top_clients: [],
      status: "success",
      period: { start: req.query.start, end: req.query.end },
      is_demo: true,
    });
  }
});

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "statistics-api",
    timestamp: new Date().toISOString(),
  });
});

router.get("/test", async (req, res) => {
  try {
    const dbTest = await pool.query(
      "SELECT NOW() as time, version() as version"
    );

    const tables = {
      clients: await testTable("clients"),
      employees: await testTable("employees"),
      orders: await testTable("orders"),
      payments: await testTable("payments"),
      laundry_machines: await testTable("laundry_machines"),
    };

    res.json({
      status: "success",
      database: {
        time: dbTest.rows[0].time,
        version: dbTest.rows[0].version,
        connection: "OK",
      },
      tables: tables,
      data_counts: {
        clients: tables.clients?.count || 0,
        employees: tables.employees?.count || 0,
        orders: tables.orders?.count || 0,
        payments: tables.payments?.count || 0,
        machines: tables.laundry_machines?.count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
});

router.get("/simple", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM employees) as employees,
        (SELECT COUNT(*) FROM laundry_machines) as machines,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COALESCE(SUM(total_cost), 0) FROM orders) as revenue,
        (SELECT COUNT(*) FROM payments) as payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as payments_total
    `);

    const row = result.rows[0];

    res.json({
      clients: parseInt(row.clients) || 0,
      employees: parseInt(row.employees) || 0,
      machines: parseInt(row.machines) || 0,
      orders: parseInt(row.orders) || 0,
      revenue: parseFloat(row.revenue) || 0,
      payments: parseInt(row.payments) || 0,
      payments_total: parseFloat(row.payments_total) || 0,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get("/demo", (req, res) => {
  console.log(" Відправляємо демо-дані (без послуг)");

  res.json({
    clients: {
      count: 15,
    },
    employees: {
      count: 5,
    },
    machines: {
      count: 8,
    },
    orders: {
      orders_count: 42,
      count: 42,
      total_revenue: 12500.5,
      avg_order: 297.63,
    },
    payments: {
      payments_count: 40,
      count: 40,
      total_payments: 12000.0,
      total: 12000.0,
      avg: 300.0,
    },
    top_clients: [
      { full_name: "Іван Петренко", orders_count: 8, total_revenue: 3200.0 },
      { full_name: "Марія Іваненко", orders_count: 6, total_revenue: 2800.5 },
      { full_name: "Олександр Коваль", orders_count: 5, total_revenue: 1950.0 },
      { full_name: "Наталія Шевченко", orders_count: 4, total_revenue: 1800.0 },
      { full_name: "Петро Сидоренко", orders_count: 3, total_revenue: 950.0 },
    ],
    status: "success",
    is_demo: true,
    timestamp: new Date().toISOString(),
  });
});

router.get("/", (req, res) => {
  res.json({
    message: "Statistics API для пральної",
    version: "2.0",
    endpoints: [
      "GET /api/statistics/full - повна статистика (для головної сторінки)",
      "GET /api/statistics/day?date=YYYY-MM-DD - за день",
      "GET /api/statistics/period?start=YYYY-MM-DD&end=YYYY-MM-DD - за період",
      "GET /api/statistics/test - тест БД",
      "GET /api/statistics/demo - демо-дані",
      "GET /api/statistics/health - перевірка стану",
    ],
    frontend_compatible: true,
    timestamp: new Date().toISOString(),
  });
});

async function testTable(tableName) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return {
      exists: true,
      count: parseInt(result.rows[0].count),
    };
  } catch (err) {
    return {
      exists: false,
      error: err.message,
    };
  }
}

module.exports = router;
