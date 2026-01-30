const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET all
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM order_details ORDER BY id_detail"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання деталей замовлень" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM order_details WHERE id_detail=$1",
      [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання деталі" });
  }
});

// POST create (Додано price)
router.post("/", async (req, res) => {
  try {
    const { id_order, id_service, id_employee, quantity, price } = req.body;

    const result = await pool.query(
      "INSERT INTO order_details (id_order, id_service, id_employee, quantity, price) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [id_order, id_service, id_employee || null, quantity || 1, price || 0]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка створення деталі замовлення" });
  }
});

// PUT update (Додано price)
router.put("/:id", async (req, res) => {
  try {
    const { id_order, id_service, id_employee, quantity, price } = req.body;

    const result = await pool.query(
      "UPDATE order_details SET id_order=$1, id_service=$2, id_employee=$3, quantity=$4, price=$5 WHERE id_detail=$6 RETURNING *",
      [
        id_order,
        id_service,
        id_employee || null,
        quantity,
        price || 0,
        req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка оновлення деталі замовлення" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM order_details WHERE id_detail=$1", [
      req.params.id,
    ]);
    res.json({ message: "Деталь замовлення видалено" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення деталі замовлення" });
  }
});

module.exports = router;
