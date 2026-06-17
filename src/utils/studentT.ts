export type StudentT95Entry = {
  grausLiberdade: number;
  fator: number;
};

// Quantis bilaterais de 95% (t_0.975) mantidos em tabela para auditoria.
export const STUDENT_T_95: StudentT95Entry[] = [
  { grausLiberdade: 1, fator: 12.706 },
  { grausLiberdade: 2, fator: 4.303 },
  { grausLiberdade: 3, fator: 3.182 },
  { grausLiberdade: 4, fator: 2.776 },
  { grausLiberdade: 5, fator: 2.571 },
  { grausLiberdade: 6, fator: 2.447 },
  { grausLiberdade: 7, fator: 2.365 },
  { grausLiberdade: 8, fator: 2.306 },
  { grausLiberdade: 9, fator: 2.262 },
  { grausLiberdade: 10, fator: 2.228 },
  { grausLiberdade: 11, fator: 2.201 },
  { grausLiberdade: 12, fator: 2.179 },
  { grausLiberdade: 13, fator: 2.16 },
  { grausLiberdade: 14, fator: 2.145 },
  { grausLiberdade: 15, fator: 2.131 },
  { grausLiberdade: 16, fator: 2.12 },
  { grausLiberdade: 17, fator: 2.11 },
  { grausLiberdade: 18, fator: 2.101 },
  { grausLiberdade: 19, fator: 2.093 },
  { grausLiberdade: 20, fator: 2.086 },
  { grausLiberdade: 21, fator: 2.08 },
  { grausLiberdade: 22, fator: 2.074 },
  { grausLiberdade: 23, fator: 2.069 },
  { grausLiberdade: 24, fator: 2.064 },
  { grausLiberdade: 25, fator: 2.06 },
  { grausLiberdade: 26, fator: 2.056 },
  { grausLiberdade: 27, fator: 2.052 },
  { grausLiberdade: 28, fator: 2.048 },
  { grausLiberdade: 29, fator: 2.045 },
  { grausLiberdade: 30, fator: 2.042 },
  { grausLiberdade: 40, fator: 2.021 },
  { grausLiberdade: 60, fator: 2 },
  { grausLiberdade: 120, fator: 1.98 },
];

export const calcularFatorStudentT95 = (veff: number) => {
  if (!Number.isFinite(veff)) return 1.96;
  if (veff <= 0) throw new Error("Graus de liberdade efetivos invalidos.");

  const grausInteiros = Math.floor(veff);
  const entrada =
    [...STUDENT_T_95]
      .reverse()
      .find((item) => item.grausLiberdade <= grausInteiros) || STUDENT_T_95[0];

  return entrada.fator;
};
