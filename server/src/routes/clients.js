const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");
const { customAlphabet } = require("nanoid");

const generateNumericId = customAlphabet("0123456789", 9);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hohlovs953@gmail.com",
    pass: "scza mddl gqqr spjb",
  },
});

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT c.*,
        (
          SELECT s.service_name
          FROM orders o
          JOIN order_details od ON o.id_order = od.id_order
          JOIN services s ON od.id_service = s.id_service
          WHERE o.id_client = c.id_client
          ORDER BY o.order_date DESC
          LIMIT 1
        ) as last_service
      FROM clients c
      ORDER BY c.id_client DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error loading clients" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      full_name,
      phone_number,
      email,
      registration_date,
      address,
      password,
    } = req.body;

    const id_client = parseInt(generateNumericId());

    const result = await pool.query(
      `INSERT INTO clients 
           (id_client, full_name, phone_number, email, registration_date, address, password) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING *`,
      [
        id_client,
        full_name,
        phone_number,
        email,
        registration_date,
        address,
        password,
      ]
    );

    const newClient = result.rows[0];

    if (email) {
      const mailOptions = {
        from: '"Mister Cleaner" <h953@gmail.com>',
        to: email,
        subject: "Вітаємо у Mister Cleaner!",
        html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2 style="color: #0d6efd;">Ласкаво просимо, ${full_name}!</h2>
                <p>Ви успішно зареєструвалися в сервісі <b>Mister Cleaner</b>.</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p><b>Ваші реєстраційні дані:</b></p>
                <ul>
                  <li><b>Ваш ID клієнта:</b> ${id_client}</li> <li><b>Телефон (Логін):</b> ${phone_number}</li>
                  <li><b>Адреса:</b> ${address || "Не вказана"}</li>
                </ul>
                <br/>
                <p style="color: #888; font-size: 12px;">З повагою, команда Mister Cleaner.</p>
              </div>
            `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("Mail error:", error.message);
        else console.log("Email sent:", info.response);
      });
    }

    res.json(newClient);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "Клієнт з таким телефоном вже існує" });
    }
    console.error(err);
    res.status(500).json({ error: "Error adding client" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone_number, password } = req.body;
    const result = await pool.query(
      "SELECT * FROM clients WHERE phone_number = $1",
      [phone_number]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Користувача не знайдено" });

    const client = result.rows[0];
    if (client.password === password) res.json(client);
    else res.status(401).json({ error: "Невірний пароль" });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { full_name, phone_number, email, registration_date, address } =
      req.body;
    const result = await pool.query(
      "UPDATE clients SET full_name=$1, phone_number=$2, email=$3, registration_date=$4, address=$5 WHERE id_client=$6 RETURNING *",
      [
        full_name,
        phone_number,
        email,
        registration_date,
        address,
        req.params.id,
      ]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error updating client" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id_client=$1", [req.params.id]);
    res.json({ message: "Client deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting client" });
  }
});

module.exports = router;
