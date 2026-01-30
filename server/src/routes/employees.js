const express = require("express");
const router = express.Router();
const pool = require("../config/db");


router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id_employee, full_name, position, phone_number, hire_date FROM employees ORDER BY id_employee"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка GET /employees:", err);
    res.status(500).json({ error: "Помилка отримання працівників" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id_employee, full_name, position, phone_number, hire_date FROM employees WHERE id_employee=$1",
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка отримання працівника" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { full_name, position, phone_number, hire_date } = req.body;

    let dateValue = null;
    if (hire_date) {
      dateValue = String(hire_date).split("T")[0];
    }

    const result = await pool.query(
      "INSERT INTO employees (full_name, position, phone_number, hire_date) VALUES ($1,$2,$3,$4) RETURNING *",
      [full_name, position || "operator", phone_number, dateValue]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Помилка POST /employees:", err);
    res.status(500).json({ error: "Помилка створення", details: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, position, phone_number, hire_date } = req.body;

    console.log(`Оновлення ID=${id}.`, req.body);

    let query = "UPDATE employees SET ";
    const values = [];
    const updates = [];

    if (full_name !== undefined) {
      updates.push(`full_name = $${updates.length + 1}`);
      values.push(full_name);
    }

    if (position !== undefined) {
      updates.push(`position = $${updates.length + 1}`);
      values.push(position || null);
    }

    if (phone_number !== undefined) {
      updates.push(`phone_number = $${updates.length + 1}`);
      values.push(phone_number || null);
    }

    if (hire_date !== undefined) {
      updates.push(`hire_date = $${updates.length + 1}`);
      let dateValue = null;
      if (hire_date) {
        dateValue = String(hire_date).split(/[T ]/)[0];
      }
      values.push(dateValue);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Немає даних для оновлення" });
    }

    query += updates.join(", ");
    query += ` WHERE id_employee = $${updates.length + 1} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Працівника не знайдено" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("ПОМИЛКА ОНОВЛЕННЯ:", err.message);
    res.status(500).json({ error: "Помилка оновлення", details: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM employees WHERE id_employee=$1", [id]);
    res.json({ message: "Працівника видалено" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення" });
  }
});

module.exports = router;
