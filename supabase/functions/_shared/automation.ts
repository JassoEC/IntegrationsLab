const TRIGGERS: [RegExp, string][] = [
  // ── Greetings ────────────────────────────────────────────────────────────
  [
    /\bhola\b|\bbuenos días\b|\bbuenos dias\b|\bbuenas tardes\b|\bbuenas noches\b|\bhi\b|\bhey\b/i,
    "¡Hola! 👋 Bienvenido. ¿En qué podemos ayudarte hoy?\n\nPuedes preguntarnos sobre:\n• 🔧 Refacciones y compatibilidad\n• 🏥 Citas y consultas médicas\n• 💰 Precios y disponibilidad\n• 📍 Ubicación y horarios",
  ],

  // ── Catalog / Auto parts ─────────────────────────────────────────────────
  [
    /\bcatálogo\b|\bcatalogo\b|\brefaccion(es)?\b|\brefacción\b|\bparte(s)?\b|\bcomponente(s)?\b|\baccesorio(s)?\b/i,
    "🔧 *Catálogo de Refacciones*\n\nContamos con refacciones para las principales marcas:\n\n• 🚗 Motores y transmisiones\n• 🛑 Sistema de frenos (balatas, discos, cilindros)\n• ⚙️ Suspensión y dirección\n• 💡 Sistema eléctrico\n• ❄️ Aire acondicionado\n• 🔩 Filtros, bujías y consumibles\n\nIndícanos *marca, modelo y año* de tu vehículo para verificar disponibilidad. 🚘",
  ],

  // ── Vehicle compatibility ─────────────────────────────────────────────────
  [
    /\bcompatib(le|ilidad)\b|\bsirve para\b|\baplica para\b|\bmarca\b|\bmodelo\b|\baño\b|\bvehículo\b|\bvehiculo\b/i,
    "🔍 *Verificación de Compatibilidad*\n\nPara confirmar que la refacción es la correcta necesitamos:\n\n1️⃣ *Marca* del vehículo (Nissan, Toyota, Honda…)\n2️⃣ *Modelo* (Sentra, Corolla, Civic…)\n3️⃣ *Año* de fabricación\n4️⃣ *Tipo de motor* si lo conoces (1.6L, 2.0L…)\n\nEnvíanos esos datos y te confirmamos en minutos. ✅",
  ],

  // ── Stock availability ────────────────────────────────────────────────────
  [
    /\bdisponib(le|ilidad)\b|\bstock\b|\bhay\b|\btienen\b|\bexistencia\b/i,
    "📦 *Disponibilidad en Tienda*\n\nTenemos inventario en tienda física y pedidos especiales:\n\n• ✅ Piezas comunes: disponibles el mismo día\n• 📋 Piezas especiales: 24-48 horas hábiles\n• 🚚 Envío a domicilio disponible\n\nDinos qué refacción buscas y te confirmamos existencia al momento.",
  ],

  // ── Pricing / Quotes ──────────────────────────────────────────────────────
  [
    /\bprecio(s)?\b|\bcosto(s)?\b|\bcuánto (cuesta|vale|cobran)\b|\bcuanto (cuesta|vale|cobran)\b|\bpresupuesto\b|\bprice\b|\bcotización\b|\bcotizacion\b/i,
    "💰 *Precios y Cotizaciones*\n\nNuestros precios varían según la pieza y marca del vehículo. Manejamos:\n\n• 🏷️ Refacciones originales (OEM)\n• 🔄 Refacciones genéricas de calidad\n• ♻️ Piezas de recuperación\n\nEnvíanos el nombre de la pieza y datos de tu vehículo para darte una cotización exacta. 📋\n\n_Aceptamos efectivo, tarjeta y transferencia._",
  ],

  // ── Warranty ──────────────────────────────────────────────────────────────
  [
    /\bgarantía\b|\bgarantia\b|\bwarranty\b|\bdevolucion\b|\bdevolución\b/i,
    "🛡️ *Garantía en Refacciones*\n\nOfrecemos garantía en todos nuestros productos:\n\n• Refacciones originales: *6 a 12 meses*\n• Refacciones genéricas: *3 a 6 meses*\n• Piezas eléctricas: *30 días*\n\nLa garantía cubre defectos de fabricación. Guarda tu ticket de compra. 🧾",
  ],

  // ── Medical appointments ──────────────────────────────────────────────────
  [
    /\bcita(s)?\b|\bconsulta(s)?\b|\bagendar\b|\bappointment\b|\bturno\b/i,
    "🏥 *Agendar Cita Médica*\n\nPara agendar tu consulta necesitamos:\n\n1️⃣ *Nombre completo*\n2️⃣ *Especialidad* que requieres\n3️⃣ *Fecha y hora* de tu preferencia\n4️⃣ *¿Es primera vez* o consulta de seguimiento?\n\nNuestros horarios de atención:\n🕗 Lunes a Viernes: 8:00 - 20:00\n🕗 Sábados: 9:00 - 14:00",
  ],

  // ── Medical specialties ───────────────────────────────────────────────────
  [
    /\bespecialidad(es)?\b|\bespecialista(s)?\b|\bdoctor(es)?\b|\bmédico(s)?\b|\bmedico(s)?\b|\btratamiento(s)?\b/i,
    "👨‍⚕️ *Especialidades Médicas*\n\nContamos con los siguientes especialistas:\n\n• 🫀 Cardiología\n• 🧠 Neurología\n• 🦴 Ortopedia y Traumatología\n• 🍬 Endocrinología y Diabetes\n• 🫁 Neumología\n• 👁️ Oftalmología\n• 🧬 Medicina Interna\n\n¿Qué especialidad necesitas? Te indicamos disponibilidad y costos.",
  ],

  // ── Business hours ────────────────────────────────────────────────────────
  [
    /\bhorario(s)?\b|\bhora(s)?\b|\babierto\b|\bcerrado\b|\batienden\b|\bschedule\b|\bhours\b/i,
    "🕐 *Horarios de Atención*\n\n*Refacciones:*\n🔧 Lunes a Sábado: 8:00 - 19:00\n🔧 Domingo: 9:00 - 14:00\n\n*Consultorio Médico:*\n🏥 Lunes a Viernes: 8:00 - 20:00\n🏥 Sábado: 9:00 - 14:00\n🏥 Urgencias: 24/7\n\n_Últimos turnos 30 min antes del cierre._",
  ],

  // ── Location / Directions ─────────────────────────────────────────────────
  [
    /\bubicación\b|\bubicacion\b|\bdirección\b|\bdireccion\b|\bdónde\b|\bdonde (están|quedan|queda|estan)\b|\bcómo llegar\b|\bcomo llegar\b|\baddress\b/i,
    "📍 *Ubicación*\n\nNos encontramos en:\n\n*Av. Reforma 1234, Col. Centro*\nA 2 cuadras del Metro Insurgentes\n\n📌 https://maps.google.com/?q=Reforma+1234\n\n🅿️ Estacionamiento disponible\n🚌 Rutas: 80, 134, M-12",
  ],

  // ── Health insurance ──────────────────────────────────────────────────────
  [
    /\bseguro(s)?\b|\basseguradora\b|\bgmm\b|\binsurance\b|\bcobertura\b/i,
    "💳 *Seguros Médicos Aceptados*\n\nTrabajamos con las principales aseguradoras:\n\n• ✅ GNP Seguros\n• ✅ AXA\n• ✅ Metlife\n• ✅ BBVA Seguros\n• ✅ Mapfre\n• ✅ Seguros Monterrey\n\nTambién aceptamos pago directo. Consulta tu póliza para verificar cobertura. 📄",
  ],

  // ── Medical emergencies ───────────────────────────────────────────────────
  [
    /\burgencia(s)?\b|\bemergencia(s)?\b|\burgent\b|\bemargengy\b|\bes urgente\b/i,
    "🚨 *Urgencias Médicas*\n\nSi es una emergencia médica llama de inmediato:\n\n📞 *Urgencias: 800-XXX-XXXX*\n🏥 Atención 24/7\n\nSi puedes trasladarte, nuestra sala de urgencias está abierta las 24 horas en la misma dirección.\n\n_Para situaciones de riesgo de vida llama al 911._",
  ],

  // ── Shipping / Delivery ───────────────────────────────────────────────────
  [
    /\benvío\b|\benvio\b|\bentrega\b|\bshipping\b|\bdelivery\b|\bdomicilio\b/i,
    "🚚 *Envíos y Entregas*\n\nOfrecemos las siguientes opciones:\n\n• 🏪 *Recolección en tienda*: mismo día\n• 🏙️ *Envío local* (misma ciudad): 2-4 horas\n• 📦 *Envío nacional* (Estafeta/DHL): 1-3 días hábiles\n\nEnvíos gratis en pedidos mayores a $800 MXN. 🎉",
  ],

  // ── Thank you / Closing ───────────────────────────────────────────────────
  [
    /\bgracias\b|\bthanks\b|\bthank you\b|\bperfecto\b|\blisto\b|\bexcelente\b/i,
    "¡Con gusto! 😊 Estamos para servirte. Si tienes más preguntas no dudes en escribirnos.",
  ],
  [
    /\badiós\b|\badios\b|\bhasta luego\b|\bbye\b|\bnos vemos\b/i,
    "¡Hasta luego! 👋 Que tengas excelente día. Recuerda que estamos disponibles cuando nos necesites.",
  ],
]

export function getAutoReply(body: string): string | null {
  for (const [pattern, reply] of TRIGGERS) {
    if (pattern.test(body)) return reply
  }
  return null
}
