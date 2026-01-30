const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET ALL
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM laundry_machines ORDER BY id_machine"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Помилка отримання машин" });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { model, status } = req.body;
    const result = await pool.query(
      "INSERT INTO laundry_machines (model, status) VALUES ($1, $2) RETURNING *",
      [model, status || "available"]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Помилка створення машини" });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { model, status } = req.body;

    let query = "UPDATE laundry_machines SET ";
    const values = [];
    const updates = [];

    if (model !== undefined) {
      updates.push(`model = $${updates.length + 1}`);
      values.push(model);
    }
    if (status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }

    if (updates.length === 0) return res.status(400).json({ error: "No data" });

    query += updates.join(", ");
    query += ` WHERE id_machine = $${updates.length + 1} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка оновлення" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM laundry_machines WHERE id_machine=$1", [
      req.params.id,
    ]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting" });
  }
});

module.exports = router;
