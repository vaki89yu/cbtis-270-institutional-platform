/** Utilidades de horario del aula. */

export const DIAS: Record<string, string> = {
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
};

export const DIAS_CORTOS: Record<string, string> = {
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
};

export type HorarioAula = {
  dias: string | null;
  horaInicio: string | null;
  horaFin: string | null;
};

export function textoHorario(h: HorarioAula): string | null {
  if (!h.dias && !h.horaInicio) return null;
  const dias = (h.dias ?? "")
    .split(",")
    .map((d) => DIAS_CORTOS[d.trim()])
    .filter(Boolean)
    .join(" · ");
  const horas = h.horaInicio ? `${h.horaInicio}${h.horaFin ? ` a ${h.horaFin}` : ""}` : "";
  return [dias, horas].filter(Boolean).join(" · ") || null;
}

/** ¿Es hoy día de clase de esta aula? */
export function esHoyDiaDeClase(h: HorarioAula, ahora = new Date()): boolean {
  if (!h.dias) return false;
  const hoy = String(ahora.getDay()); // 0=domingo
  return h.dias.split(",").map((d) => d.trim()).includes(hoy);
}

/** Minutos que faltan para que empiece (negativo si ya empezó). null si no aplica hoy. */
export function minutosParaEmpezar(h: HorarioAula, ahora = new Date()): number | null {
  if (!esHoyDiaDeClase(h, ahora) || !h.horaInicio) return null;
  const [hh, mm] = h.horaInicio.split(":").map(Number);
  if (!Number.isFinite(hh)) return null;
  const inicio = new Date(ahora);
  inicio.setHours(hh, mm || 0, 0, 0);
  return Math.round((inicio.getTime() - ahora.getTime()) / 60000);
}

/** Texto amable para el panel: "empieza en 20 min", "en clase ahora", etc. */
export function estadoDeClase(h: HorarioAula, ahora = new Date()): string | null {
  const min = minutosParaEmpezar(h, ahora);
  if (min === null) return null;
  if (min > 120) return `Hoy a las ${h.horaInicio}`;
  if (min > 0) return `Empieza en ${min} min`;

  if (h.horaFin) {
    const [hh, mm] = h.horaFin.split(":").map(Number);
    const fin = new Date(ahora);
    fin.setHours(hh, mm || 0, 0, 0);
    if (ahora.getTime() <= fin.getTime()) return "En clase ahora";
    return "Clase terminada hoy";
  }
  return "En clase ahora";
}
