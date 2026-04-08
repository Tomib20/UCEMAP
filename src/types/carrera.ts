export type MateriaGrupo = "obligatoria" | "topico" | "tesis" | "requisito";

export type MateriaStatus = "aprobada" | "cursando" | "disponible" | "bloqueada";

export interface Materia {
  nro: number;
  nombre: string;
  anio: number;
  cuatrimestre: number;
  grupo: MateriaGrupo;
  correlativas: number[];
  creditos: number;
}

export interface Carrera {
  id: string;
  nombre: string;
  programa: string;
  plan: string;
  resolucion: string;
  titulo: string;
  anios: number;
  materias: Materia[];
  topicos_requeridos: number;
}
