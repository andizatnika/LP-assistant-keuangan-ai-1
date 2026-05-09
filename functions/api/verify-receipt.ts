interface Env {
  ANTHROPIC_API_KEY: string;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        isValid: false,
        reason: "Konfigurasi server belum lengkap (API Key missing). Silakan hubungi Admin.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { imageBase64, expectedPrice, expectedBank } = await context.request.json() as any;

    if (!imageBase64) {
      return new Response(JSON.stringify({ isValid: false, reason: "Gagal memproses gambar." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract base64 info
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Format gambar tidak valid.");
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    const prompt = `Anda adalah asisten verifikasi keuangan. Periksa gambar bukti transfer ini.
Tugas Anda:
1. Pastikan ini adalah bukti transfer bank yang asli dan sah (bukan editan kasar atau gambar lain).
2. Pastikan nominal transfer SAMA PERSIS dengan: Rp ${expectedPrice}
3. Pastikan bank tujuan transfer adalah: ${expectedBank}
4. Pastikan status transfer adalah BERHASIL/SUCCESS.

Balas HANYA dengan format JSON seperti ini:
{
  "isValid": true|false,
  "reason": "Penjelasan singkat dalam Bahasa Indonesia kenapa valid atau tidak valid"
}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic Error:", errorText);
      throw new Error("Gagal menghubungi AI Anthropic.");
    }

    const data = await anthropicResponse.json() as any;
    const aiText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "Gagal membaca output AI." };

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error: any) {
    console.error("Verification Function Error:", error);
    return new Response(
      JSON.stringify({
        isValid: false,
        reason: "Sistem AI sedang sibuk atau mengalami gangguan. Mohon coba lagi atau hubungi CS via WhatsApp.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
