const TRIGGERS: [RegExp, string][] = [
  [/\bhola\b|\bhi\b|\bhey\b/i, "¡Hola! 👋 ¿En qué podemos ayudarte hoy?"],
  [/\bprecio\b|\bcosto\b|\bprice\b/i, "Con gusto te enviamos nuestra lista de precios. ¿Cuál servicio te interesa?"],
  [/\bgracias\b|\bthanks\b/i, "¡De nada! Estamos para servirte. 😊"],
  [/\badiós\b|\badios\b|\bbye\b|\bhasta luego\b/i, "¡Hasta luego! Que tengas un excelente día. 👋"],
];

export function getAutoReply(body: string): string | null {
  for (const [pattern, reply] of TRIGGERS) {
    if (pattern.test(body)) return reply;
  }
  return null;
}
