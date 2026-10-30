// Kontrat abort kodlarını okunur Türkçe mesajlara çevirir.
// Kodlar contract/sources/garden.move içindeki sabitlerle birebir eşleşir.

export const ABORT_MESSAGES: Record<number, string> = {
  0: "Bahçe parametreleri geçersiz.",
  1: "Bekleme süren dolmadı. Sayaç bitince tekrar sulayabilirsin.",
  2: "Bahçe olgunlaştı; artık sulama, büyütme ve fonlama kapalı.",
  3: "Bahçe henüz olgunlaşmadı. Hasat son aşamadan sonra açılır.",
  4: "Bir sonraki aşama için bekleme süresi dolmadı.",
  5: "Büyümek için yeterli su yok. Önce biraz daha sulanmalı.",
  6: "Sıfır SUI ile fonlanamaz. Bir miktar gir.",
  7: "Bu bahçeden payını zaten çektin.",
  8: "Bu bahçeye hiç katkın yok, çekilecek pay bulunmuyor.",
  9: "Bugünkü puan sınırına ulaştın. Yarın tekrar sulayabilirsin.",
};

/** Hata metninden Move abort kodunu çıkarır. */
export function extractAbortCode(text: string): number | null {
  const patterns = [
    /MoveAbort\([^)]*\)\s*,\s*(\d+)\)/, // MoveAbort(MoveLocation {...}, 1)
    /MoveAbort[\s\S]*?,\s*(\d+)\)\s*in command/,
    /abort[_ ]code[":\s]+(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Herhangi bir hatayı kullanıcıya gösterilecek metne çevirir. */
export function friendlyError(error: unknown, abortCode?: number | null): string {
  if (abortCode != null && ABORT_MESSAGES[abortCode]) return ABORT_MESSAGES[abortCode];

  const text = error instanceof Error ? error.message : String(error ?? "");
  const code = extractAbortCode(text);
  if (code != null && ABORT_MESSAGES[code]) return ABORT_MESSAGES[code];

  if (/reject|denied|cancel/i.test(text)) return "İşlemi cüzdanda reddettin.";
  if (/insufficient|InsufficientGas|balance/i.test(text))
    return "Cüzdanda yeterli SUI yok. Testnet faucet'ten SUI alabilirsin.";
  if (/network|fetch|timeout/i.test(text)) return "Ağa ulaşılamadı. Bağlantını kontrol edip tekrar dene.";
  return text ? `İşlem başarısız: ${text.slice(0, 160)}` : "Bilinmeyen bir hata oluştu.";
}
