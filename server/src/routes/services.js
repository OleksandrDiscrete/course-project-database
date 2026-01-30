const express = require("express");
const router = express.Router();
const pool = require("../config/db");


router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM services ORDER BY id_service"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання послуг" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM services WHERE id_service = $1",
      [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання послуги" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { id_type, service_name, price } = req.body;

    const result = await pool.query(
      "INSERT INTO services (id_type, service_name, price) VALUES ($1,$2,$3) RETURNING *",
      [id_type, service_name, price]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка створення послуги" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const { id_type, service_name, price } = req.body;

    const result = await pool.query(
      "UPDATE services SET id_type=$1, service_name=$2, price=$3 WHERE id_service=$4 RETURNING *",
      [id_type, service_name, price, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка оновлення послуги" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM services WHERE id_service=$1", [
      req.params.id,
    ]);
    res.json({ message: "Послугу видалено" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення послуги" });
  }
});

module.exports = router;
