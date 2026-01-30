const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET all service types
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_types ORDER BY id_type"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання типів послуг" });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_types WHERE id_type = $1",
      [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання типу послуг" });
  }
});

// POST create
router.post("/", async (req, res) => {
  try {
    const { type_name, description } = req.body;
    const result = await pool.query(
      "INSERT INTO service_types (type_name, description) VALUES ($1,$2) RETURNING *",
      [type_name, description || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка створення типу послуг" });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const { type_name, description } = req.body;
    const result = await pool.query(
      "UPDATE service_types SET type_name=$1, description=$2 WHERE id_type=$3 RETURNING *",
      [type_name, description || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка оновлення типу послуг" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM service_types WHERE id_type=$1", [
      req.params.id,
    ]);
    res.json({ message: "Тип послуги видалено" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення типу послуг" });
  }
});

module.exports = router;
