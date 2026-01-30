const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Get all payments
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM payments ORDER BY id_payment"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error loading payments" });
  }
});

// Add payment
router.post("/", async (req, res) => {
  try {
    const { id_order, payment_date, amount, payment_type } = req.body;

    const result = await pool.query(
      "INSERT INTO payments (id_order, payment_date, amount, payment_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [id_order, payment_date, amount, payment_type]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error adding payment" });
  }
});

// Update payment
router.put("/:id", async (req, res) => {
  try {
    const { id_order, payment_date, amount, payment_type } = req.body;

    const result = await pool.query(
      "UPDATE payments SET id_order=$1, payment_date=$2, amount=$3, payment_type=$4 WHERE id_payment=$5 RETURNING *",
      [id_order, payment_date, amount, payment_type, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error updating payment" });
  }
});

// Delete payment
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM payments WHERE id_payment=$1", [
      req.params.id,
    ]);
    res.json({ message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting payment" });
  }
});

module.exports = router;
