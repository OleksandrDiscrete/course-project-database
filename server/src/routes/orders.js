const express = require("express");
const router = require("express").Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hohlovs953@gmail.com",
    pass: "scza mddl gqqr spjb",
  },
});

function toLatin(word) {
  if (!word) return "";
  const converter = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ye",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "yi",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "yu",
    я: "ya",
    А: "A",
    Б: "B",
    В: "V",
    Г: "H",
    Ґ: "G",
    Д: "D",
    Е: "E",
    Є: "Ye",
    Ж: "Zh",
    З: "Z",
    И: "Y",
    І: "I",
    Ї: "Yi",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "Kh",
    Ц: "Ts",
    Ч: "Ch",
    Ш: "Sh",
    Щ: "Shch",
    Ь: "",
    Ю: "Yu",
    Я: "Ya",
    "'": "",
  };
  return String(word)
    .toString()
    .split("")
    .map((char) => converter[char] || char)
    .join("");
}

router.post("/send-receipt", async (req, res) => {
  const { orderId, email, clientName, clientPhone } = req.body;

  if (!orderId || !email) {
    return res.status(400).json({ error: "No orderId or email provided" });
  }

  try {
    const orderRes = await pool.query(
      "SELECT * FROM orders WHERE id_order = $1",
      [orderId]
    );
    if (orderRes.rows.length === 0)
      return res.status(404).json({ error: "Order not found" });
    const order = orderRes.rows[0];

    const detailsRes = await pool.query(
      `SELECT s.service_name, od.quantity, od.price 
       FROM order_details od
       JOIN services s ON od.id_service = s.id_service
       WHERE od.id_order = $1`,
      [orderId]
    );
    const items = detailsRes.rows;

    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    doc.fontSize(20).text("Mister Cleaner", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Receipt #${order.id_order}`, { align: "left" });
    doc
      .fontSize(10)
      .text(`Date: ${new Date(order.order_date).toLocaleDateString()}`);

    if (clientName) doc.text(`Client: ${toLatin(clientName)}`);
    if (clientPhone) doc.text(`Phone: ${clientPhone}`);

    let statusText = order.status;
    const statusMap = {
      waiting_for_confirmation: "Waiting for confirmation",
      confirmed: "Confirmed",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    if (statusMap[order.status]) statusText = statusMap[order.status];

    doc.text(`Status: ${statusText}`);

    doc.moveDown();
    doc.text("-------------------------------------------------------");
    doc.moveDown();

    items.forEach((item) => {
      const safeName = toLatin(item.service_name);
      doc
        .fontSize(12)
        .text(`${safeName} (x${item.quantity}) ... ${item.price} UAH`);
    });

    doc.moveDown();
    doc.text("-------------------------------------------------------");

    doc.fontSize(16).text(`TOTAL: ${order.total_cost} UAH`, { align: "right" });

    doc.moveDown();
    doc.fontSize(10).text("Thank you for choosing us!", { align: "center" });

    doc.end();

    doc.on("end", async () => {
      const pdfData = Buffer.concat(buffers);
      try {
        await transporter.sendMail({
          from: '"Mister Cleaner" <hohlovs953@gmail.com>',
          to: email,
          subject: `Your Receipt for Order #${order.id_order}`,
          html: `<h3>Thank you for your order!</h3><p>Your receipt is attached.</p>`,
          attachments: [
            {
              filename: `receipt_${order.id_order}.pdf`,
              content: pdfData,
              contentType: "application/pdf",
            },
          ],
        });
        res.json({ success: true, message: "Email sent successfully" });
      } catch (e) {
        console.error("Email error:", e);
        res.status(500).json({ error: "Failed to send email" });
      }
    });
  } catch (err) {
    console.error("Receipt error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/send-full-report", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  try {
    const ordersResult = (
      await pool.query(`
            SELECT COUNT(*) as orders_count, COALESCE(SUM(total_cost), 0) as total_revenue, COALESCE(AVG(total_cost), 0) as avg_order FROM orders
        `)
    ).rows[0];
    const paymentsTotal = (
      await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_payments FROM payments`
      )
    ).rows[0].total_payments;
    const topClientsResult = (
      await pool.query(`
            SELECT c.full_name, COUNT(o.id_order) as orders_count, COALESCE(SUM(o.total_cost), 0) as total_revenue
            FROM clients c LEFT JOIN orders o ON c.id_client = o.id_client
            GROUP BY c.id_client, c.full_name ORDER BY total_revenue DESC NULLS LAST LIMIT 5
        `)
    ).rows;
    const clientsCount = (
      await pool.query("SELECT COUNT(*) as count FROM clients")
    ).rows[0].count;
    const machinesCount = (
      await pool.query("SELECT COUNT(*) as count FROM laundry_machines")
    ).rows[0].count;
    const employeesCount = (
      await pool.query("SELECT COUNT(*) as count FROM employees")
    ).rows[0].count;

    const stats = {
      ordersCount: parseInt(ordersResult.orders_count || 0),
      totalRevenue: parseFloat(ordersResult.total_revenue || 0),
      avgOrder: parseFloat(ordersResult.avg_order || 0).toFixed(2),
      totalPayments: parseFloat(paymentsTotal || 0).toFixed(2),
      clientsCount: parseInt(clientsCount) || 0,
      machinesCount: parseInt(machinesCount) || 0,
      employeesCount: parseInt(employeesCount) || 0,
      topClients: topClientsResult.map((c) => ({
        name: toLatin(c.full_name),
        revenue: parseFloat(c.total_revenue).toFixed(2),
        count: parseInt(c.orders_count),
      })),
    };

    const doc = new PDFDocument({ margin: 50, layout: "portrait" });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    doc
      .fontSize(22)
      .text("Mister Cleaner Management Summary", { align: "center" });
    doc
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(14).text("1. General Metrics:", { underline: true });
    doc.moveDown(0.5);

    const metricsData = [
      ["Total Revenue:", `${stats.totalRevenue.toLocaleString("en-US")} UAH`],
      ["Total Payments:", `${stats.totalPayments} UAH`],
      ["Total Orders:", stats.ordersCount],
      ["Avg Order Value:", `${stats.avgOrder} UAH`],
      ["Total Clients:", stats.clientsCount],
      ["Total Machines:", stats.machinesCount],
      ["Total Employees:", stats.employeesCount],
    ];

    let startY = doc.y;
    metricsData.forEach(([label, value], i) => {
      const x = 50;
      const y = startY + i * 15;
      doc.font("Helvetica-Bold").text(label, x, y, { width: 150 });
      doc.font("Helvetica").text(value, x + 180, y);
    });
    doc.y = startY + metricsData.length * 15 + 20;

    doc.fontSize(14).text("2. Top 5 Clients by Revenue:", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Client Name", 50, tableTop);
    doc.text("Orders", 250, tableTop, { width: 60, align: "center" });
    doc.text("Total Spent (UAH)", 350, tableTop, {
      width: 150,
      align: "right",
    });
    doc
      .moveTo(50, tableTop + 12)
      .lineTo(550, tableTop + 12)
      .stroke();
    doc.font("Helvetica").fontSize(10);

    let y = tableTop + 17;
    stats.topClients.forEach((client) => {
      doc.text(client.name, 50, y);
      doc.text(client.count.toString(), 250, y, { width: 60, align: "center" });
      doc.text(client.revenue, 350, y, { width: 150, align: "right" });
      y += 15;
    });

    doc.end();

    doc.on("end", async () => {
      const pdfData = Buffer.concat(buffers);
      try {
        await transporter.sendMail({
          from: '"Mister Cleaner Reports" <hohlovs953@gmail.com>',
          to: email,
          subject: `[SUMMARY] Management Report - ${new Date().toLocaleDateString()}`,
          html: `<p>Attached is the statistical summary report for Mister Cleaner.</p>`,
          attachments: [
            {
              filename: `Summary_Report_${Date.now()}.pdf`,
              content: pdfData,
              contentType: "application/pdf",
            },
          ],
        });
        res.json({ success: true, message: "Report sent." });
      } catch (mailError) {
        console.error("Nodemailer error:", mailError);
        res.status(500).json({ error: "Failed to send email." });
      }
    });
  } catch (err) {
    console.error("Report generation CRASH:", err);
    res.status(500).json({
      error: "Server failed to generate the report. Check logs for SQL errors.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id_order DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error loading orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      id_client,
      id_machine,
      id_type,
      order_date,
      ready_date,
      status,
      total_cost,
    } = req.body;
    const machineValue = id_machine && id_machine !== "" ? id_machine : null;
    const typeValue = id_type && id_type !== "" ? id_type : null;

    const result = await pool.query(
      `INSERT INTO orders (id_client, id_machine, id_type, order_date, ready_date, status, total_cost) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        id_client,
        machineValue,
        typeValue,
        order_date,
        ready_date,
        status,
        total_cost,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error adding order" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      id_client,
      id_machine,
      id_type,
      order_date,
      ready_date,
      status,
      total_cost,
    } = req.body;
    const machineValue = id_machine && id_machine !== "" ? id_machine : null;
    const typeValue = id_type && id_type !== "" ? id_type : null;

    if (["cancelled", "completed", "broken"].includes(status)) {
      const oldOrder = await pool.query(
        "SELECT id_machine FROM orders WHERE id_order=$1",
        [req.params.id]
      );
      const machId = oldOrder.rows[0]?.id_machine;

      if (machId) {
        await pool.query(
          "UPDATE laundry_machines SET status = 'available' WHERE id_machine = $1",
          [machId]
        );
      }
    }

    const result = await pool.query(
      `UPDATE orders SET id_client=$1, id_machine=$2, id_type=$3, order_date=$4, ready_date=$5, status=$6, total_cost=$7 
       WHERE id_order=$8 RETURNING *`,
      [
        id_client,
        machineValue,
        typeValue,
        order_date,
        ready_date,
        status,
        total_cost,
        req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating order" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    const orderRes = await pool.query(
      "SELECT id_machine FROM orders WHERE id_order = $1",
      [orderId]
    );
    if (orderRes.rows.length > 0) {
      const machId = orderRes.rows[0].id_machine;
      if (machId) {
        await pool.query(
          "UPDATE laundry_machines SET status = 'available' WHERE id_machine = $1",
          [machId]
        );
      }
    }

    await pool.query("DELETE FROM payments WHERE id_order=$1", [orderId]);
    await pool.query("DELETE FROM order_details WHERE id_order=$1", [orderId]);

    await pool.query("DELETE FROM orders WHERE id_order=$1", [orderId]);

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting order: " + err.message });
  }
});

module.exports = router;
