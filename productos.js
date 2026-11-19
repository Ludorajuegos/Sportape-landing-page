/* =====================================================================
   SPORT TAPE · RESPALDO DE PRODUCTOS
   Los combos, colores, tallas y el regalo se manejan en la hoja de Google
   "pagina web SporTape". Esta lista SOLO se usa si la hoja no responde.
   Lo que sí se edita aquí: el valor del ENVÍO.
   En la hoja, Tipo "Combo" lleva color y talla; Tipo "Producto" es venta al detal
   (sin color ni talla) y aparece en "Complementa tu combo".
   ===================================================================== */

// Valor del envío según la ciudad (la zona se calcula en el servidor)
const ENVIOS = {
  bogota:   { nombre: "Bogotá y Soacha", valor: 10000 },
  nacional: { nombre: "Resto del país",  valor: 17000 }
};

const TIENDA = {
  combos: [
    { tipo: "combo", id: "combo-deportivo", nombre: "Combo Deportivo", precio: 50000, precioAntes: null,
      incluye: ["Canilleras", "Medias antideslizantes", "Medias recortadas", "Cinta cohesiva"],
      fotos: ["img/combo-deportivo.jpg"], inventario: null },
    { tipo: "combo", id: "combo-balon", nombre: "Combo Deportivo Balón", precio: 100000, precioAntes: null,
      incluye: ["Canilleras", "Medias antideslizantes", "Medias recortadas", "Cinta cohesiva", "Balón premium", "Bomba manual", "Tula en malla"],
      fotos: ["img/combo-balon.jpg"], inventario: null },
    { tipo: "combo", id: "combo-bandas", nombre: "Combo Deportivo Bandas", precio: 100000, precioAntes: null,
      incluye: ["Canilleras", "Medias antideslizantes", "Medias recortadas", "Cinta cohesiva", "Bandas tubulares", "Bandas planas", "Lazo para saltar"],
      fotos: ["img/combo-bandas.jpg"], inventario: null },
    { tipo: "combo", id: "combo-pro", nombre: "Combo Deportivo PRO", precio: 140000, precioAntes: null,
      incluye: ["Canilleras", "Medias antideslizantes", "Medias recortadas", "Cinta cohesiva", "Balón premium", "Bomba manual", "Tula en malla", "Bandas tubulares", "Bandas planas", "Lazo para saltar"],
      fotos: ["img/combo-pro.jpg"], inventario: null }
    ,
    // Productos al detal: aparecen en "Complementa tu combo". Si llevan "opciones", el cliente elige una
    // (la foto número N corresponde a la opción número N).
    { tipo: "producto", id: "balon", nombre: "Balón", precio: 50000,
      descripcion: "Balón de fútbol tamaño oficial #5, diseñado para entrenamientos y competencias en césped natural o sintético. Cumple con las medidas y peso reglamentarios de la FIFA.",
      fotos: ["img/p-balon.jpg"], opciones: [], inventario: null },
    { tipo: "producto", id: "set-bandas", nombre: "Set de bandas de resistencia", precio: 50000,
      descripcion: "Kit completo de bandas elásticas deportivas, ideal para entrenamiento funcional, rehabilitación y fisioterapia. Incluye bandas tubulares con accesorios y bandas planas de diferentes resistencias.",
      fotos: ["img/p-bandas-gris.jpg", "img/p-bandas-rosado.jpg"], opciones: ["Gris", "Rosado"], inventario: null },
    { tipo: "producto", id: "cinta-cohesiva", nombre: "Cinta cohesiva", precio: 7000,
      descripcion: "Se adhiere sobre sí misma, no a la piel. Fija vendajes y da soporte ligero sin restar movilidad. Medida: 5 cm x 5 metros.",
      fotos: ["img/p-cinta-cohesiva.jpg"], guia: "img/colores-cinta-cohesiva.jpg", letras: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "Ñ", "O", "P", "Q", "T", "U", "V", "W", "X", "Y"], opciones: ["Blanco", "Negro", "Piel", "Café", "Verde neón", "Verde", "Aguamarina", "Verde oscuro", "Azul", "Azul claro", "Morado", "Rosado", "Rojo", "Naranja", "Amarillo", "Camuflado rosado", "Camuflado azul", "Camuflado verde", "Negro con huellas", "Azul con huellas", "Azul claro con huellas", "Rosado con huellas", "Rojo con huellas", "Amarillo con huellas"], inventario: null },
    { tipo: "producto", id: "cinta-kinesiologica", nombre: "Cinta kinesiológica", precio: 15000,
      descripcion: "Se pega directo sobre la piel. Facilita la circulación y activa la propiocepción muscular. Medida: 5 cm x 5 metros.",
      fotos: ["img/p-cinta-kinesiologica.jpg"], guia: "img/colores-cinta-kinesiologica.jpg", letras: ["A", "B", "C", "F", "H", "I", "J", "K", "L", "M", "N", "Ñ", "O", "P", "Q", "R", "S"], opciones: ["Blanco", "Negro", "Piel", "Verde", "Verde oscuro", "Azul", "Azul claro", "Morado", "Rosado", "Rojo", "Naranja", "Amarillo", "Camuflado rosado", "Camuflado azul", "Camuflado verde", "Camuflado verde claro", "Camuflado gris"], inventario: null },
    { tipo: "producto", id: "cinta-mtape", nombre: "Cinta Mtape", precio: 20000,
      descripcion: "Adhesiva, fuerte y rígida. Inmoviliza o da soporte firme en articulaciones. Medida: 5 cm x 10 metros.",
      fotos: ["img/p-cinta-mtape.jpg"], opciones: ["Blanco", "Negro", "Verde", "Azul", "Morado", "Amarillo"], inventario: null },
    { tipo: "producto", id: "cinta-pretape", nombre: "Cinta Pretape", precio: 20000,
      descripcion: "Va debajo de otras cintas adhesivas: evita irritaciones y facilita retirar el vendaje. Medida: 7 cm x 27 metros.",
      fotos: ["img/p-cinta-pretape.jpg"], opciones: ["Blanco", "Gris", "Verde oscuro", "Azul", "Morado", "Rosado"], inventario: null },
    { tipo: "producto", id: "media-clasica", nombre: "Media clásica deportiva", precio: 15000,
      descripcion: "Media antideslizante de caña media, con agarre en la planta. Talla única L (36 a 41 en calzado).",
      fotos: ["img/p-media-clasica.jpg"], opciones: ["Negro", "Blanco", "Amarillo", "Naranja", "Verde neón"], inventario: null },
    { tipo: "producto", id: "media-tobillera", nombre: "Media tobillera", precio: 15000,
      descripcion: "Media antideslizante corta, al tobillo, con agarre en la planta. Talla única L (36 a 41 en calzado).",
      fotos: ["img/p-media-tobillera.jpg"], opciones: ["Negro", "Blanco", "Rojo", "Azul"], inventario: null },
    { tipo: "producto", id: "media-larga", nombre: "Media larga", precio: 15000,
      descripcion: "Media antideslizante larga, hasta la rodilla, con agarre en la planta. Talla única L (36 a 41 en calzado).",
      fotos: ["img/p-media-larga.jpg"], opciones: ["Negro", "Azul rey", "Azul oscuro", "Amarillo", "Morado", "Blanco", "Verde neón", "Rosado", "Rojo"], inventario: null },
    { tipo: "producto", id: "media-cana", nombre: "Media caña", precio: 17000,
      descripcion: "Media antideslizante media caña, con agarre en la planta. Talla única L (36 a 41 en calzado).",
      fotos: ["img/p-media-cana.jpg"], opciones: ["Negro", "Negro con naranja", "Negro con verde neón", "Negro con rosado", "Blanco", "Rojo", "Verde neón", "Naranja", "Celeste", "Morado"], inventario: null }
  ],
  colores: [
    { nombre: "Negro", activo: true }, { nombre: "Blanco", activo: true }, { nombre: "Naranja", activo: true },
    { nombre: "Verde neón", activo: true }, { nombre: "Amarillo", activo: true },
    { nombre: "Rojo", activo: false }, { nombre: "Azul", activo: false }
  ],
  tallas: [
    { nombre: "M", detalle: "32 a 35 en calzado", activo: true },
    { nombre: "L", detalle: "36 a 41 en calzado", activo: true }
  ],
  regalo: { activo: true, titulo: "Perneras + canilleras de regalo",
    detalle: "En Black Days, con la compra de cualquier combo te regalamos unas perneras y unas canilleras.",
    termina: "2026-11-30T23:59:59-05:00" } // hasta el 30 de noviembre a medianoche (hora Colombia)
};

if (typeof module !== "undefined") module.exports = { ENVIOS, TIENDA };
