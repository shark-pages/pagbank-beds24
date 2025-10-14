import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🔑 CONFIGURAÇÕES DO PAGBANK (SANDBOX)
const PAGBANK_API = "https://sandbox.api.pagseguro.com/checkouts"; // endpoint sandbox correto
const PAGBANK_TOKEN = "b6940cc1-4d79-443c-9d99-de7682afc434a8e978924133859309408537c3baae20984e-f51c-4cdc-8332-f0264b626f1d"; // substitua pelo seu token sandbox real

// 🔐 CONFIGURAÇÃO DO BEDS24 KEY
const BEDS24_KEY = "canario24key123"; // Key que será usada no Beds24

// ===============================
// ✅ Endpoint principal (/gateway) - POST
// Recebe dados do Beds24 e cria checkout no PagBank
// ===============================
app.post("/gateway", async (req, res) => {
  try {
    const { amount, currency, bookingid, customer_email, key } = req.body;

    // 🔑 Verificação da Key enviada pelo Beds24
    if (!key || key !== BEDS24_KEY) {
      return res.status(403).json({ success: false, message: "Key inválida" });
    }

    console.log("📩 Dados recebidos do Beds24:", req.body);

    // 🔹 Corpo do checkout PagBank
    const checkoutBody = {
      reference_id: bookingid,
      description: "Reserva Beds24",
      amount: {
        value: Math.round(parseFloat(amount) * 100), // R$100,00 = 10000 centavos
        currency: currency || "BRL"
      },
      payment_method: {
        type: "CREDIT_CARD"
      },
      notification_urls: [
        "https://pagbank-beds24.onrender.com/retorno_pagbank" // Webhook para notificações
      ]
    };

    // 🔹 Chamada à API PagBank
    const response = await fetch(PAGBANK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGBANK_TOKEN}`
      },
      body: JSON.stringify(checkoutBody)
    });

    const text = await response.text();
    console.log("📦 Resposta bruta PagBank:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Falha ao parsear JSON:", err);
      return res.json({ success: false, message: "Erro ao processar resposta PagBank" });
    }

    // 🔹 Extrai link de pagamento do PagBank
    const paymentLink = data.links?.find(l => l.rel === "PAY")?.href || null;

    if (!paymentLink) {
      console.error("❌ Link de pagamento não encontrado na resposta:", data);
      return res.json({ success: false, message: "Erro ao gerar link PagBank" });
    }

    // 🔹 Retorna link para o Beds24
    res.json({
      success: true,
      redirect_url: paymentLink
    });

  } catch (err) {
    console.error("❌ Erro no gateway:", err);
    res.status(500).json({ success: false, message: "Erro interno" });
  }
});

// ===============================
// ✅ Webhook de retorno do PagBank (/retorno_pagbank)
// Recebe notificações de pagamentos
// ===============================
app.post("/retorno_pagbank", (req, res) => {
  console.log("🔔 Notificação PagBank recebida:", req.body);
  // Aqui você pode atualizar status de reservas, enviar e-mails, etc.
  res.sendStatus(200);
});

// ===============================
// ✅ Endpoint GET de teste (/gateway)
// Apenas para verificar se o servidor está ativo via navegador
// ===============================
app.get("/gateway", (req, res) => {
  res.send("🚀 Servidor ativo! Endpoint /gateway funcionando.");
});

// Porta padrão Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));


