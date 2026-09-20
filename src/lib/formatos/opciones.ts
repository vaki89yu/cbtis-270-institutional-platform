/** Catálogos de opciones para los desplegables de los llenables logísticos */

export const GRUPOS = ["E", "F"] as const;
export const SEMESTRES = ["2", "3", "4", "5", "6"] as const;
export const TURNOS = ["Matutino", "Vespertino"] as const;

export const INCOTERMS_2020 = [
  "EXW – Obra",
  "FCA – Libre en portador",
  "FAS – Libre al costado del buque",
  "FOB – Libre a bordo",
  "CFR – Costo y flete",
  "CIF – Costo, seguro y flete",
  "CPT – Transporte pagado hasta",
  "CIP – Transporte y seguro pagados hasta",
  "DAP – Entregado en lugar",
  "DPU – Entregado en lugar sin descarga",
  "DDP – Con derechos aduanales pagados",
] as const;

export const UNIDADES_MEDIDA = [
  "PIEZA",
  "KILOGRAMO (KG)",
  "METRO (M)",
  "LITRO (L)",
  "TARRO / ROLO",
  "CAJA",
  "PAQUETE",
  "TONELADA (T)",
  "SERVICIO / JORNADA",
  "MILLAR",
] as const;

export const MEDIOS_TRANSPORTE = ["Carretero", "Ferroviario", "Aéreo", "Marítimo", "Multimodal"] as const;

export const CONFIGURACIONES_VEHICULARES = [
  "C2 – Tractocamión con semirremolque",
  "C3 – Camión de 2 ejes",
  "C5 – Camión de 5 ejes",
  "T3S1 – Tracto semirremolque de eje sencillo",
  "T3S2 – Tracto semirremolque tandem",
  "T3S3 – Tracto semirremolque triple eje",
] as const;

export const ESTADOS_OT = ["Borrador", "Emitida", "Aprobada", "Recepción parcial", "Recepción completa", "Cancelada"] as const;

export const PRIORIDADES = ["Urgente", "Alta", "Normal", "Baja"] as const;

export const GARANTIAS_OFERTA = [
  "3 días",
  "5 días",
  "7 días",
  "10 días",
  "15 días",
  "30 días (1 mes)",
  "60 días (2 meses)",
  "90 días (3 meses)",
  "180 días (6 meses)",
  "365 días (1 año)",
  "730 días (2 años)",
  "1095 días (3 años)",
  "No aplica",
] as const;

export const CONDICIONES_PAGO = [
  "Contado / anticipo",
  "Contado con ajustes",
  "Crédito 30 días",
  "Crédito 45 días",
  "Crédito 60 días",
  "Crédito 90 días",
  "Transferencia bancaria",
  "Caja chica autorizada",
  "Efectivo en contra entrega",
  "Acuerdo por reembolso programado",
  "Cheque a 30 días",
  "Pagos parciales por hito",
] as const;

export const TIEMPOS_ENTREGA = [
  "Mismo día (urgente)",
  "24 horas",
  "48 horas",
  "Entrega exprés (1-3 días hábiles)",
  "Rutina (3-5 días hábiles)",
  "Programado (5-10 días hábiles)",
  "Programado (10-20 días hábiles)",
  "Programado (20-30 días naturales)",
  "Consultar con provendor",
  "Días de inventario",
] as const;

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] as const;

export const MONEDAS = ["MXN – Peso mexicano", "USD – Dólar americano", "EUR – Euro", "CAD – Dólar canadiense"] as const;

export const TIPO_CAMBIO = ["8.50", "8.75", "9.00", "9.25", "9.50", "9.75", "10.00", "10.25", "10.50", "10.75", "11.00", "11.25", "11.50", "11.75", "12.00"] as const;

export const ADUANAS = [
  "070 · Adaptación de carga aérea",
  "240 · Ciudad Juárez, Chihuahua",
  "240 · Ciudad Juárez / El Paso",
] as const;

export const TIPOS_COMPROBANTE = ["Factura", "Nota de venta", "Remisión", "B/L", "AWB", "Carta Porte", "Orden de compra"] as const;

export const TIPOS_SELLO = ["Sello de seguridad numerado", "Sello RFID", "Sello plástico", "Sello metálico"] as const;

export const TIPOS_ENTREGA = ["Normal", "Urgente", "Refrigerado / cadena de frío", "Hazmat regulado"] as const;
