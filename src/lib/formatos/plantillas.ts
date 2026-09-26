/**
 * Catálogo de plantillas Excel descargables de la Biblioteca de Formatos.
 *
 * Cada plantilla se adscribe al módulo profesional que la utiliza, para que el
 * control de acceso por semestre funcione igual que con los formatos llenables.
 */

export type PlantillaExcel = {
  codigo: string;
  titulo: string;
  categoria: string;
  url: string;
  ext: string;
  /** Módulo profesional (1..5) */
  modulo: number;
};

export const PLANTILLAS_EXCEL: PlantillaExcel[] = [
  {
    codigo: "FOR-LOG-01",
    titulo: "Kardex de Control de Existencias (PEPS y Promedios)",
    categoria: "Almacén e Inventarios",
    url: "/formatos/FOR-LOG-01_Kardex-de-Control-de-Existencias_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 2,
  },
  {
    codigo: "FOR-LOG-02",
    titulo: "Orden de Compra y Requisición de Materiales",
    categoria: "Compras y Abastecimiento",
    url: "/formatos/FOR-LOG-02_Orden-de-Compra_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 1,
  },
  {
    codigo: "FOR-LOG-03",
    titulo: "Carta Porte · Guía de Llenado SAT",
    categoria: "Transporte y Rutas",
    url: "/formatos/FOR-LOG-03_Carta-Porte-Guia-de-Llenado_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 3,
  },
  {
    codigo: "FOR-LOG-04",
    titulo: "Matriz de Costeo de Fletes y Selección de Rutas",
    categoria: "Transporte y Rutas",
    url: "/formatos/FOR-LOG-04_Costeo-de-Fletes-y-Rutas_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 5,
  },
  {
    codigo: "FOR-LOG-05",
    titulo: "Pedimento Aduanal Simplificado (Importación A1)",
    categoria: "Comercio Exterior",
    url: "/formatos/FOR-LOG-05_Pedimento-Aduanal-A1_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 4,
  },
  {
    codigo: "FOR-LOG-06",
    titulo: "Checklist Pre-operacional de Montacargas y Seguridad",
    categoria: "Seguridad y Calidad",
    url: "/formatos/FOR-LOG-06_Checklist-Montacargas-y-Seguridad_CBTIS270.xlsx",
    ext: "xlsx",
    modulo: 2,
  },
];

export function plantillaPorCodigo(codigo: string) {
  return PLANTILLAS_EXCEL.find((p) => p.codigo === codigo);
}
