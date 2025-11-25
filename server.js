import express from "express";
import dotenv from "dotenv";
import { Client, Environment } from "@square/square";

dotenv.config();

const app = express();
app.use(express.json());

const client = new Client({
  environment:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? Environment.Production
      : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const paymentsApi = client.paymentsApi;

app.get("/config", (req, res) => {
  res.json({
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "production"
        : "sandbox",
  });
});

app.post("/create-payment", async (req, res) => {
  try {
    const { amount, sourceId, firstName, lastName } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount." });
    }

    if (!sourceId) {
      return res.status(400).json({ error: "Missing sourceId." });
    }

    const amountMoney = {
      amount: BigInt(Math.round(Number(amount) * 100)),
      currency: "USD"
    };

    const body = {
      sourceId,
      idempotencyKey: cryptoRandomString(),
      amountMoney,
      locationId: process.env.SQUARE_LOCATION_ID,
      autocomplete: true,
      note: `Payment from ${firstName ?? ""} ${lastName ?? ""}`
    };

    const { result } = await paymentsApi.createPayment(body);

    res.json({ success: true, payment: result.payment });
  } catch (err) {
    console.error("Square error:", err);
    const detail =
      err?.errors?.map((e) => e.detail).join("; ") || "Payment failed";
    res.status(500).json({ success: false, error: detail });
  }
});

function cryptoRandomString() {
  return [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server running on ${port}`));
