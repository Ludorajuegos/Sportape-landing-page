// SPORT TAPE · Cloudflare Worker
// Sirve la página y hace el trabajo de servidor:
//   /api/productos.js → combos, colores, tallas y regalo desde la hoja "pagina web SporTape"
//   /api/firmar       → calcula el total con los precios de la hoja y firma el pago de Wompi
//   /api/transaccion  → confirma con Wompi cómo quedó un pago
//   /api/wompi-eventos→ avisos automáticos de Wompi (URL de Eventos)
// Variables (Cloudflare → sportape → Settings → Variables and Secrets):
//   HOJA_PRODUCTOS, WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_KEY, WOMPI_EVENTS_KEY, PEDIDOS_URL
import respaldo from "./productos.js";

const { ENVIOS, TIENDA } = respaldo;
const PREFIJO = "STP-";
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const limpio = (v, max) => String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F]/g, " ").trim().slice(0, max);

/* ---------- Hoja de productos ---------- */
function leerCSV(texto) {
  const filas = []; let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}
function numero(v) {
  let t = String(v ?? "").trim();
  if (!t) return null;
  t = t.replace(/[.,]\d{1,2}$/, "");
  const d = t.replace(/[^\d]/g, "");
  return d ? Number(d) : null;
}
function fotos(v) {
  return String(v ?? "").split(/[\s,;]+/).filter(Boolean).map(f => {
    const drive = f.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1200`;
    if (/^https?:\/\//i.test(f)) return f;
    return f.includes("/") ? f.replace(/^\/+/, "") : `img/${f}`;
  });
}
// Fecha de cierre del regalo, hora de Colombia: "30/11/2026", "30/11/2026 23:59" o "2026-11-30"
export function fechaFin(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/), d, mes, a, h, mi;
  if (m) [, d, mes, a, h, mi] = m;
  else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/))) [, a, mes, d, h, mi] = m;
  else return null;
  const dos = n => String(n).padStart(2, "0");
  const iso = `${a}-${dos(mes)}-${dos(d)}T${h ? `${dos(h)}:${mi}:00` : "23:59:59"}-05:00`;
  return isNaN(Date.parse(iso)) ? null : iso;
}
const vencido = r => !!(r && r.termina && Date.now() > Date.parse(r.termina));

// Filas con Tipo: Combo, Producto (venta al detal, sin color ni talla), Color, Talla o Regalo
export function convertir(filas) {
  const enc = (filas[0] || []).map(norm);
  const col = n => enc.findIndex(h => h === n || h.startsWith(n));
  const c = { tipo: col("tipo"), activo: col("activo"), nombre: enc.indexOf("nombre"), precio: enc.indexOf("precio"),
    antes: col("precio antes"), incluye: col("incluye"), foto: col("foto"), enlace: col("enlace"), inventario: col("inventario"), termina: col("termina"), opciones: col("opciones") };
  if (c.tipo < 0 || c.nombre < 0) throw new Error("La hoja no tiene las columnas Tipo y Nombre.");
  const v = (f, k) => (c[k] >= 0 ? String(f[c[k]] ?? "").trim() : "");
  const datos = { combos: [], colores: [], tallas: [], regalo: { activo: false, titulo: "", detalle: "" } };
  const ids = new Set();
  for (const f of filas.slice(1)) {
    const tipo = norm(v(f, "tipo")), nombre = v(f, "nombre"), activo = norm(v(f, "activo")) !== "no";
    if (!nombre) continue;
    if (tipo === "combo" || tipo === "producto") {
      const precio = numero(v(f, "precio"));
      if (!activo || !(precio > 0)) continue;
      let id = slug(v(f, "enlace")) || slug(nombre);
      if (ids.has(id)) { let i = 2; while (ids.has(`${id}-${i}`)) i++; id = `${id}-${i}`; }
      ids.add(id);
      const antes = numero(v(f, "antes"));
      const texto = v(f, "incluye");
      datos.combos.push({ id, tipo, nombre, precio, precioAntes: antes > precio ? antes : null,
        incluye: tipo === "combo" ? texto.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean) : [],
        descripcion: tipo === "producto" ? texto : "",
        opciones: tipo === "producto" ? v(f, "opciones").split(/[,\n;]+/).map(s => s.trim()).filter(Boolean) : [],
        fotos: fotos(v(f, "foto")), inventario: numero(v(f, "inventario")) });
    } else if (tipo === "color") datos.colores.push({ nombre, activo });
    else if (tipo === "talla") datos.tallas.push({ nombre, detalle: v(f, "incluye"), activo });
    else if (tipo === "regalo") datos.regalo = { activo, titulo: nombre, detalle: v(f, "incluye"), termina: c.termina >= 0 ? fechaFin(v(f, "termina")) : (TIENDA.regalo?.termina || null) };
  }
  if (!datos.combos.some(x => x.tipo === "combo")) throw new Error("La hoja no tiene combos activos.");
  // Mientras la hoja no tenga filas de Tipo "Producto", se usan los productos al detal de productos.js
  if (!datos.combos.some(x => x.tipo === "producto"))
    datos.combos.push(...TIENDA.combos.filter(x => x.tipo === "producto" && !ids.has(x.id)));
  return datos;
}
function direcciones(enlace) {
  enlace = String(enlace || "").trim();
  const id = (enlace.match(/\/d\/([\w-]{20,})/) || [])[1] || (/^[\w-]{20,}$/.test(enlace) ? enlace : null);
  if (!id) return [];
  // Sin gid, Google exporta la primera pestaña (la hoja puede no tener gid=0)
  const gid = (enlace.match(/[#&?]gid=(\d+)/) || [])[1];
  return [`https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`];
}
let memoria = { hora: 0, datos: null };
async function leerTienda(env, maxEdad = 60000) {
  if (memoria.datos && Date.now() - memoria.hora < maxEdad) return memoria.datos;
  let aviso = "Falta la variable HOJA_PRODUCTOS.";
  for (const url of direcciones(env.HOJA_PRODUCTOS)) {
    try {
      const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(6000) });
      const texto = await r.text();
      if (!r.ok || /^\s*</.test(texto)) throw new Error(`La hoja respondió ${r.status}. ¿Está compartida como "Cualquier persona con el enlace"?`);
      memoria = { hora: Date.now(), datos: { ...convertir(leerCSV(texto)), origen: "hoja" } };
      return memoria.datos;
    } catch (e) { aviso = e.message; }
  }
  if (memoria.datos) return memoria.datos;
  return { ...TIENDA, origen: "respaldo", aviso };
}

/* ---------- Utilidades ---------- */
const json = (status, datos) => new Response(JSON.stringify(datos), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
async function sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const urlWompi = env => String(env.WOMPI_PUBLIC_KEY || "").trim().startsWith("pub_test_") ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1";

async function productosJS(env) {
  const d = await leerTienda(env);
  const { origen, aviso, ...tienda } = d;
  const js = `/* Sport Tape · productos desde ${origen === "hoja" ? "la hoja de Google" : "el respaldo (" + String(aviso).replace(/\*\//g, "") + ")"} */
Object.assign(TIENDA, ${JSON.stringify(tienda)});
`;
  return new Response(js, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=30" } });
}

/* ---------- Hoja "pedidos sportape" ---------- */
async function avisarPedidos(env, datos) {
  if (!env.PEDIDOS_URL) return;
  try {
    const r = await fetch(env.PEDIDOS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(datos), redirect: "follow", signal: AbortSignal.timeout(20000) });
    const res = await r.json().catch(() => ({}));
    if (!res.ok) console.error("Hoja de pedidos:", res.error || r.status);
  } catch (e) { console.error("Hoja de pedidos no respondió:", e.message); }
}
async function confirmarPago(env, id) {
  const r = await fetch(`${urlWompi(env)}/transactions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const t = (await r.json()).data || {};
  if (!String(t.reference || "").startsWith(PREFIJO)) return null;
  if (t.status === "APPROVED") await avisarPedidos(env, {
    accion: "pago", referencia: t.reference, transaccion: t.id, estado: t.status,
    valor: Math.round((t.amount_in_cents || 0) / 100), medio: t.payment_method_type || ""
  });
  return t;
}

/* ---------- Pago ---------- */
async function firmar(request, env, ctx) {
  const llavePublica = String(env.WOMPI_PUBLIC_KEY || "").trim(), secreto = String(env.WOMPI_INTEGRITY_KEY || "").trim();
  if (!llavePublica || !secreto) return json(500, { error: "Los pagos en línea se activan muy pronto. Intenta de nuevo más tarde." });
  const ambiente = llavePublica.startsWith("pub_test_") ? "test" : llavePublica.startsWith("pub_prod_") ? "prod" : "?";
  if (ambiente === "?" || !secreto.startsWith(`${ambiente}_integrity_`))
    return json(500, { error: "Las llaves de pago no coinciden. Revisa en Cloudflare que WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_KEY sean del mismo modo de Wompi (pruebas o producción)." });

  let items, destino, cliente;
  try { ({ items, envio: destino, cliente } = await request.json()); } catch { items = null; }
  if (!destino || !destino.departamento || !destino.ciudad) return json(400, { error: "Completa los datos de envío." });
  const ciudad = norm(destino.ciudad);
  const zona = (destino.departamento === "Bogotá D.C." || ciudad.startsWith("bogota") || ciudad === "soacha") ? "bogota" : "nacional";
  if (!Array.isArray(items) || !items.length || items.length > 20) return json(400, { error: "El carrito está vacío." });

  const tienda = await leerTienda(env, 30000);
  const colores = tienda.colores.filter(c => c.activo).map(c => c.nombre);
  const tallas = tienda.tallas.filter(t => t.activo).map(t => t.nombre);
  let total = 0;
  const partes = [], detalle = [], porCombo = {};
  let hayCombo = false;
  for (const it of items) {
    const combo = tienda.combos.find(c => c.id === it.id);
    const cantidad = Number(it.cantidad);
    if (!combo) return json(400, { error: "Uno de los productos ya no está disponible. Revisa tu carrito." });
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) return json(400, { error: "Revisa las cantidades del carrito." });
    const esCombo = combo.tipo !== "producto";
    const opciones = !esCombo && Array.isArray(combo.opciones) ? combo.opciones : [];
    if (opciones.length && !opciones.includes(it.color))
      return json(400, { error: `Elige el color de ${combo.nombre} en tu carrito.` });
    if (esCombo) hayCombo = true;
    if (esCombo && !colores.includes(it.color)) return json(400, { error: `El color ${it.color || ""} ya no está disponible. Elige otro en tu carrito.` });
    const conRegalo = esCombo && tienda.regalo?.activo && !vencido(tienda.regalo);
    // El regalo admite todos los colores de la hoja, también los que están agotados para el combo (rojo, azul)
    if (conRegalo && (!tienda.colores.some(c => c.nombre === it.regaloColor) || !tallas.includes(it.regaloTalla)))
      return json(400, { error: "Elige el color y la talla del regalo de tu combo." });
    if (esCombo && !tallas.includes(it.talla)) return json(400, { error: "Revisa la talla de tu carrito." });
    porCombo[combo.id] = (porCombo[combo.id] || 0) + cantidad;
    if (combo.inventario !== null && combo.inventario !== undefined && porCombo[combo.id] > combo.inventario)
      return json(400, { error: combo.inventario > 0 ? `Solo quedan ${combo.inventario} unidades de ${combo.nombre}.` : `${combo.nombre} está agotado.` });
    total += combo.precio * cantidad;
    partes.push(`${combo.id}x${cantidad}`);
    detalle.push({ id: combo.id, nombre: esCombo ? `${combo.nombre} (${it.color}, talla ${it.talla})${conRegalo ? ` + regalo (${it.regaloColor}, talla ${it.regaloTalla})` : ""}` : combo.nombre + (opciones.length ? ` (${it.color})` : ""), cantidad, precio: combo.precio });
  }
  total += ENVIOS[zona].valor;

  const referencia = `${PREFIJO}${Date.now().toString(36).toUpperCase()}-${partes.join("_").slice(0, 170)}-${zona === "bogota" ? "BOG" : "NAL"}`;
  const montoEnCentavos = Math.round(total * 100);
  const firma = await sha256(`${referencia}${montoEnCentavos}COP${secreto}`);

  const c = cliente && typeof cliente === "object" ? cliente : {};
  const campos = ["nombre", "cedula", "celular", "correo", "departamento", "ciudad", "direccion", "barrio", "localidad", "especificaciones"];
  ctx.waitUntil(avisarPedidos(env, {
    accion: "intento", referencia, total, envio: ENVIOS[zona].valor, items: detalle,
    regalo: hayCombo && tienda.regalo?.activo && !vencido(tienda.regalo) ? tienda.regalo.titulo : "",
    cliente: Object.fromEntries(campos.map(k => [k, limpio(c[k], 300)]))
  }));
  return json(200, { referencia, montoEnCentavos, firma, llavePublica });
}

async function transaccion(url, env) {
  const id = url.searchParams.get("id") || "";
  if (!/^[\w-]{5,80}$/.test(id)) return json(400, { error: "Transacción no válida." });
  try {
    const t = await confirmarPago(env, id);
    if (!t) return json(404, { error: "No encontramos el pago." });
    return json(200, { id: t.id, estado: t.status, valor: Math.round((t.amount_in_cents || 0) / 100), referencia: t.reference });
  } catch { return json(502, { error: "Wompi no respondió." }); }
}

async function eventosWompi(request, env) {
  let ev;
  try { ev = await request.json(); } catch { return json(400, { error: "Evento no válido." }); }
  const secreto = String(env.WOMPI_EVENTS_KEY || "").trim();
  if (!secreto) return json(200, { ok: true, nota: "Falta WOMPI_EVENTS_KEY" });
  const valor = ruta => ruta.split(".").reduce((o, k) => (o == null ? o : o[k]), ev.data);
  const cadena = (ev.signature?.properties || []).map(p => String(valor(p) ?? "")).join("") + String(ev.timestamp ?? "") + secreto;
  if (!ev.signature?.checksum || (await sha256(cadena)).toUpperCase() !== String(ev.signature.checksum).toUpperCase())
    return json(401, { error: "Firma no válida." });
  const t = ev.data?.transaction || {};
  if (ev.event === "transaction.updated" && t.id && String(t.reference || "").startsWith(PREFIJO) && t.status === "APPROVED")
    await confirmarPago(env, t.id);
  return json(200, { ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), { pathname } = url;
    if (pathname === "/api/productos.js") return productosJS(env);
    if (pathname === "/api/firmar") return request.method === "POST" ? firmar(request, env, ctx) : json(405, { error: "Método no permitido." });
    if (pathname === "/api/transaccion") return transaccion(url, env);
    if (pathname === "/api/wompi-eventos") return request.method === "POST" ? eventosWompi(request, env) : json(405, { error: "Método no permitido." });
    return env.ASSETS.fetch(request);
  }
};
