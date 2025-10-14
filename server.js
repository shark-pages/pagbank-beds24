import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🔑 CONFIGURAÇÕES DO PAGBANK (SANDBOX)
const PAGBANK_API = "https://sandbox.api.pagseguro.com/checkout";
const PAGBANK_TOKEN = "SEU_TOKEN_SANDBOX_AQUI"; // substitua pela sua chave sandbox

// ✅ Endpoint que o Beds24 vai chamar
app.post("/gateway", async (req, res) => {
  try {
    const { amount, currency, bookingid, customer_email } = req.body;

    console.log("📩 Dados recebidos do Beds24:", req.body);

    // Cria o checkout PagBank
    const checkoutBody = {
      reference_id: bookingid,
      description: "Reserva Beds24",
      amount: {
        value: Math.round(parseFloat(amount) * 100),
        currency: currency || "BRL"
      },
      payment_method: {
        type: "CREDIT_CARD"
      },
      notification_urls: [
        "https://seu-site.com/retorno_pagbank" // substitua pelo seu endpoint real
      ]
    };

    const response = await fetch(PAGBANK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGBANK_TOKEN}`
      },
      body: JSON.stringify(checkoutBody)
    });

    const data = await response.json();

    console.log("📦 Resposta PagBank:", data);

    // Responde ao Beds24 com a URL de pagamento
    const paymentLink =
      data.links?.find(l => l.rel === "PAY")?.href || null;

    if (!paymentLink) {
      return res.json({ success: false, message: "Erro ao gerar link PagBank" });
    }

    res.json({
      success: true,
      redirect_url: paymentLink
    });

  } catch (err) {
    console.error("❌ Erro no gateway:", err);
    res.status(500).json({ success: false, message: "Erro interno" });
  }
});

// ✅ Webhook de retorno PagBank (opcional)
app.post("/retorno_pagbank", (req, res) => {
  console.log("🔔 Notificação PagBank:", req.body);
  res.sendStatus(200);
});

// Porta padrão Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
