// FEM Solver for EAC (Estruturas de Alma Cheia)
// Handles Molas (Springs), Barras 2D (Trusses), Vigas (Beams), and Viga-Barras (Frames)

import { Expr, Matrix, solveEigenvalues, matrixSubtractScaled, buildModeShapeVector, exprFormatNumber } from '../../core/math.js';

// Helper: parse custom expression load
function parseExpressionLoad(exprStr) {
  if (!exprStr || exprStr.trim() === "") return null;
  // Clean mathematical syntax for JS eval
  let js = exprStr.replace(/\^/g, "**")
                 .replace(/\b(sin|cos|tan|sqrt|abs|exp|log)\b/g, "Math.$1");
  try {
    // Compile JS function
    const fn = new Function("vars", `
      const { x, L, le, Le, l } = vars;
      try {
        return ${js};
      } catch(e) {
        return 0;
      }
    `);
    return fn;
  } catch (e) {
    console.error("Syntax error in load expression:", exprStr, e);
    return null;
  }
}

// Helper: numerical Simpson's integration
function integrateExpression(fn, shapeIdx, L, type = "viga") {
  const n = 20;
  const h = L / n;
  let sum = 0;

  const evalAt = (x) => {
    const vars = { x, L, l: L, Le: L, le: L };
    const val = fn(vars) || 0;
    const xi = x / L;
    let s = 0;

    if (type === "barra2d") {
      if (shapeIdx === 1) s = 1 - xi;
      else if (shapeIdx === 2) s = xi;
    } else {
      // Beam shape functions
      if (shapeIdx === 1) s = 1 - 3 * xi * xi + 2 * xi * xi * xi;
      else if (shapeIdx === 2) s = x * (1 - xi) * (1 - xi);
      else if (shapeIdx === 3) s = 3 * xi * xi - 2 * xi * xi * xi;
      else if (shapeIdx === 4) s = x * (xi * xi - xi);
    }
    return val * s;
  };

  sum += evalAt(0) + evalAt(L);
  for (let i = 1; i < n; i++) {
    const coeff = (i % 2 === 0) ? 2 : 4;
    sum += coeff * evalAt(i * h);
  }
  return sum * h / 3;
}

// Helpers for degree of freedom formatting
function padRight(str, len) {
  return str + " ".repeat(Math.max(0, len - str.length));
}

// Cos and Sin in degrees
const cosd = (d) => Math.cos(d * Math.PI / 180);
const sind = (d) => Math.sin(d * Math.PI / 180);

export function solveEac(state) {
  const type = state.type || "barra2d";
  if (type === "mola") {
    return solveMolas(state);
  } else if (type === "barra2d") {
    return solveBarra2D(state);
  } else if (type === "viga") {
    return solveViga(state);
  } else if (type === "vigabarra2d") {
    return solveVigaBarra2D(state);
  }
  return { error: "Unknown structural type." };
}

// ==========================================
// 1. MOLAS SOLVER
// ==========================================
function solveMolas(state) {
  const nMass = state.nMass || 2;
  const nSpring = state.nSpring || 2;
  const springs = state.springs || [];
  const forces = state.forces || [];
  const activeOption = state.activeOption || 1;

  const K = Matrix.zeros(nMass, nMass);
  const steps = {};

  // Assemble stiffness matrix
  for (let e = 0; e < nSpring; e++) {
    const s = springs[e];
    if (!s) continue;
    const k_val = s.k || 1;
    const i = s.i; // 1-based or 0-based index. Let's assume 0-based for coding, 1-based in output
    const j = s.j;

    // Local matrix is k * [1, -1; -1, 1]
    const nodes = [i, j];
    for (let a = 0; a < 2; a++) {
      const ga = nodes[a];
      if (ga > 0 && ga <= nMass) {
        for (let b = 0; b < 2; b++) {
          const gb = nodes[b];
          if (gb > 0 && gb <= nMass) {
            const coeff = (a === b) ? k_val : -k_val;
            const expr = Expr.fromTerm(coeff, "k");
            K.addExpr(ga - 1, gb - 1, expr);

            const key = `${ga},${gb}`;
            steps[key] = steps[key] || { symbols: [], values: [] };
            const sym = (a === b) ? `k_s${e+1}` : `-k_s${e+1}`;
            const val = (a === b) ? `${exprFormatNumber(k_val)}*k` : `-${exprFormatNumber(k_val)}*k`;
            steps[key].symbols.push(sym);
            steps[key].values.push(val);
          }
        }
      }
    }
  }

  // Assemble mass matrix
  const M = Matrix.zeros(nMass, nMass);
  for (let i = 0; i < nMass; i++) {
    const m_val = state.masses && state.masses[i] ? state.masses[i].m : 1;
    M.set(i, i, Expr.fromTerm(m_val, "m"));
  }

  // Assemble force vector
  const F = [];
  for (let i = 0; i < nMass; i++) {
    const f_val = forces[i] ? forces[i].P : 0;
    const mg_val = forces[i] ? forces[i].mg : 0;
    const expr = new Expr(0);
    if (f_val !== 0) Expr.addInplace(expr, f_val, "P");
    if (mg_val !== 0) Expr.addInplace(expr, mg_val, "mg");
    F[i] = expr;
  }

  // Solve displacements
  const base = "k";
  const Kbar = K.toNumeric(base);
  const baseTerms = {};
  for (let i = 0; i < nMass; i++) {
    for (let b of F[i].getBases()) {
      baseTerms[b] = true;
    }
  }

  const u = [];
  const uByBase = {};
  for (let i = 0; i < nMass; i++) {
    u[i] = new Expr(0);
  }

  let solveErr = null;
  for (let b in baseTerms) {
    const Fb = [];
    for (let i = 0; i < nMass; i++) {
      Fb[i] = F[i].getCoeff(b);
    }
    const res = Matrix.solveNumeric(Kbar, Fb);
    if (!res.success) {
      solveErr = res.error;
      break;
    }
    uByBase[b] = res.solution;
    const displayBase = `${b}/k`;
    for (let i = 0; i < nMass; i++) {
      u[i] = u[i].add(Expr.fromTerm(res.solution[i], displayBase));
    }
  }

  const resolutionLines = [];

  // Render option steps
  if (activeOption === 1) {
    resolutionLines.push("### Equações de Equilíbrio $[K]\\{u\\} = \\{F\\}$:");
    for (let b in baseTerms) {
      resolutionLines.push(`**Em termos de $${b}$:**`);
      resolutionLines.push("$$\\begin{bmatrix}");
      for (let i = 0; i < nMass; i++) {
        let rStr = "";
        for (let j = 0; j < nMass; j++) {
          rStr += `${exprFormatNumber(Kbar[i][j])} & `;
        }
        resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
      }
      resolutionLines.push("\\end{bmatrix} \\begin{Bmatrix}");
      for (let i = 0; i < nMass; i++) {
        resolutionLines.push(`  u_${i+1} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix} = \\begin{Bmatrix}");
      for (let i = 0; i < nMass; i++) {
        const coef = F[i].getCoeff(b);
        resolutionLines.push(`  ${exprFormatNumber(coef)}${b} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix}$$");
    }

    resolutionLines.push("### Resolução dos Deslocamentos:");
    if (solveErr) {
      resolutionLines.push(`*Erro na resolução:* ${solveErr}`);
    } else {
      for (let i = 0; i < nMass; i++) {
        resolutionLines.push(`$$u_${i+1} = ${u[i].toLaTeX()}$$`);
      }
    }
  } else if (activeOption === 2) {
    resolutionLines.push("### Esforço Normal nas Molas:");
    for (let e = 0; e < nSpring; e++) {
      const s = springs[e];
      if (!s) continue;
      const k_val = s.k || 1;
      const i = s.i;
      const j = s.j;
      const u1 = i > 0 ? u[i - 1] : new Expr(0);
      const u2 = j > 0 ? u[j - 1] : new Expr(0);
      const delta = u2.sub(u1);
      const N = delta.scale(k_val);

      resolutionLines.push(`**Mola ${e+1} (conectando nós ${i} a ${j}):**`);
      resolutionLines.push(`$$N_{${e+1}} = k_{s${e+1}} \\cdot (u_{${j}} - u_{${i}})$$`);
      resolutionLines.push(`$$N_{${e+1}} = ${exprFormatNumber(k_val)}k \\cdot (${u2.toLaTeX()} - (${u1.toLaTeX()})) = ${N.toLaTeX()}$$`);
    }
  } else if (activeOption === 5) {
    resolutionLines.push("### Frequências Naturais e Modos de Vibração:");
    resolutionLines.push("$$\\left| [K] - \\omega^2 [M] \\right| = 0$$");

    const M_num = M.toNumeric("m");
    resolutionLines.push("$$\\det \\begin{bmatrix}");
    for (let i = 0; i < nMass; i++) {
      let rStr = "";
      for (let j = 0; j < nMass; j++) {
        const k_v = Kbar[i][j];
        const m_v = M_num[i][j];
        let term = `${exprFormatNumber(k_v)}`;
        if (m_v !== 0) {
          term += ` - ${exprFormatNumber(m_v)}\\lambda`;
        }
        rStr += `${term} & `;
      }
      resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
    }
    resolutionLines.push(`\\end{bmatrix} = 0 \\quad \\text{com } \\lambda = \\frac{\\omega^2 m}{k}$$`);

    const lams = solveEigenvalues(Kbar, M_num, nMass);
    if (lams.length === 0) {
      resolutionLines.push("*Não foi possível encontrar frequências naturais para este sistema.*");
    } else {
      resolutionLines.push("#### Autovalores ($\\lambda$):");
      lams.forEach((lam, idx) => {
        resolutionLines.push(`$$\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$$`);
      });

      resolutionLines.push("#### Frequências Naturais ($\\omega$):");
      lams.forEach((lam, idx) => {
        const w = Math.sqrt(lam);
        resolutionLines.push(`$$\\omega_{${idx+1}} = \\sqrt{\\lambda_{${idx+1}}} \\cdot \\sqrt{\\frac{k}{m}} = ${exprFormatNumber(w)} \\sqrt{\\frac{k}{m}} \\quad \\text{rad/s}$$`);
      });

      resolutionLines.push("#### Modos de Vibração (Autovetores):");
      lams.forEach((lam, idx) => {
        const A_sub = matrixSubtractScaled(Kbar, M_num, lam);
        const phi = buildModeShapeVector(A_sub);
        resolutionLines.push(`**Modo ${idx+1} ($\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$):**`);
        if (phi) {
          resolutionLines.push("$$\\Phi_{" + (idx+1) + "} = \\begin{Bmatrix}");
          phi.forEach(val => {
            resolutionLines.push(`  ${exprFormatNumber(val)} \\\\`);
          });
          resolutionLines.push("\\end{Bmatrix}$$");
        }
      });
    }
  }

  return {
    K, M, F, u, uByBase,
    steps: buildStiffnessAssemblyStepLines(K, steps, nMass),
    resolution: resolutionLines,
    eigenvalues: solveEigenvalues(Kbar, M.toNumeric("m"), nMass),
    modeShapes: getModeShapes(Kbar, M.toNumeric("m"), nMass)
  };
}

// ==========================================
// 2. BARRAS 2D (TRUSSES) SOLVER
// ==========================================
function solveBarra2D(state) {
  const nBar = state.nBar || 2;
  const nDof = state.nDof || 4;
  const bars = state.bars || [];
  const forces = state.forces || [];
  const activeOption = state.activeOption || 1;
  const activeBar = state.activeBar || 1;
  const activeX = state.activeX || 0.5;

  const K = Matrix.zeros(nDof, nDof);
  const steps = {};

  // Assemble stiffness matrix element-by-element
  for (let e = 0; e < nBar; e++) {
    const b = bars[e];
    if (!b) continue;
    const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
    const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
    const L = b.L || 1;
    const E = b.E || 1;
    const A = b.A || 1;
    const factor = L === 0 ? E : (E * A / L);
    const baseName = "EA/L";

    const c1 = cosd(th1), s1 = sind(th1);
    const c2 = cosd(th2), s2 = sind(th2);
    const v = [c1, s1, -c2, -s2];

    const dofs = b.dofs || [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const gi = dofs[i];
      if (gi > 0 && gi <= nDof) {
        for (let j = 0; j < 4; j++) {
          const gj = dofs[j];
          if (gj > 0 && gj <= nDof) {
            const val = v[i] * v[j] * factor;
            K.addTerm(gi - 1, gj - 1, val, baseName);

            const key = `${gi},${gj}`;
            steps[key] = steps[key] || { symbols: [], values: [] };
            const sym = `k${i+1}${j+1}_b${e+1}`;
            const valStr = `${exprFormatNumber(E*A)}*EA / ${exprFormatNumber(L)}L * trig`;
            steps[key].symbols.push(sym);
            steps[key].values.push(valStr);
          }
        }
      }
    }
  }

  // Assemble force vector
  const F = [];
  for (let i = 0; i < nDof; i++) {
    F[i] = Expr.fromTerm(forces[i] || 0, "P");
  }

  // Handle distributed load contributions on elements
  for (let e = 0; e < nBar; e++) {
    const b = bars[e];
    if (!b) continue;
    const L = b.L || 1;
    const p0 = b.p0 || 0;
    const pL = b.pL || 0;
    const pyStr = b.py || "";
    const dofs = b.dofs || [0, 0, 0, 0];

    const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
    const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
    const c1 = cosd(th1), s1 = sind(th1);
    const c2 = cosd(th2), s2 = sind(th2);

    let f1 = 0, f2 = 0;
    if (pyStr.trim() !== "") {
      const pyFn = parseExpressionLoad(pyStr);
      if (pyFn) {
        f1 = integrateExpression(pyFn, 1, L, "barra2d");
        f2 = integrateExpression(pyFn, 2, L, "barra2d");
      }
    } else {
      f1 = L/6 * (2 * p0 + pL);
      f2 = L/6 * (p0 + 2 * pL);
    }

    if (dofs[0] > 0 && dofs[0] <= nDof) F[dofs[0] - 1] = F[dofs[0] - 1].add(Expr.fromTerm(f1 * c1, "p"));
    if (dofs[1] > 0 && dofs[1] <= nDof) F[dofs[1] - 1] = F[dofs[1] - 1].add(Expr.fromTerm(f1 * s1, "p"));
    if (dofs[2] > 0 && dofs[2] <= nDof) F[dofs[2] - 1] = F[dofs[2] - 1].add(Expr.fromTerm(f2 * c2, "p"));
    if (dofs[3] > 0 && dofs[3] <= nDof) F[dofs[3] - 1] = F[dofs[3] - 1].add(Expr.fromTerm(f2 * s2, "p"));
  }

  // Solve displacements
  const base = "EA/L";
  const Kbar = K.toNumeric(base);
  const baseTerms = {};
  for (let i = 0; i < nDof; i++) {
    for (let b of F[i].getBases()) {
      baseTerms[b] = true;
    }
  }

  const u = [];
  const uByBase = {};
  for (let i = 0; i < nDof; i++) {
    u[i] = new Expr(0);
  }

  let solveErr = null;
  for (let b in baseTerms) {
    const Fb = [];
    for (let i = 0; i < nDof; i++) {
      Fb[i] = F[i].getCoeff(b);
    }
    const res = Matrix.solveNumeric(Kbar, Fb);
    if (!res.success) {
      solveErr = res.error;
      break;
    }
    uByBase[b] = res.solution;

    let displayBase = `${b}L/EA`;
    if (b === "p") displayBase = "pL^2/EA";
    for (let i = 0; i < nDof; i++) {
      u[i] = u[i].add(Expr.fromTerm(res.solution[i], displayBase));
    }
  }

  const resolutionLines = [];

  if (activeOption === 1) {
    resolutionLines.push("### Equações de Equilíbrio $[K]\\{U\\} = \\{F\\}$:");
    for (let b in baseTerms) {
      resolutionLines.push(`**Em termos de $${b}$:**`);
      resolutionLines.push("$$\\frac{EA}{L} \\begin{bmatrix}");
      for (let i = 0; i < nDof; i++) {
        let rStr = "";
        for (let j = 0; j < nDof; j++) {
          rStr += `${exprFormatNumber(Kbar[i][j])} & `;
        }
        resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
      }
      resolutionLines.push("\\end{bmatrix} \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        resolutionLines.push(`  U_${i+1} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix} = \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        const coef = F[i].getCoeff(b);
        resolutionLines.push(`  ${exprFormatNumber(coef)}${b} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix}$$");
    }

    resolutionLines.push("### Resolução dos Deslocamentos Nodais:");
    if (solveErr) {
      resolutionLines.push(`*Erro na resolução:* ${solveErr}`);
    } else {
      for (let i = 0; i < nDof; i++) {
        resolutionLines.push(`$$U_${i+1} = ${u[i].toLaTeX()}$$`);
      }
    }
  } else if (activeOption === 2) {
    resolutionLines.push("### Esforço Normal e Tensão por Elemento:");
    for (let e = 0; e < nBar; e++) {
      const b = bars[e];
      if (!b) continue;
      const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
      const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
      const L = b.L || 1;
      const E = b.E || 1;
      const A = b.A || 1;
      const dofs = b.dofs || [0, 0, 0, 0];

      const c1 = cosd(th1), s1 = sind(th1);
      const c2 = cosd(th2), s2 = sind(th2);

      const Nexpr = new Expr(0);
      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const u1_g = dofs[0] > 0 ? ub[dofs[0] - 1] : 0;
        const v1_g = dofs[1] > 0 ? ub[dofs[1] - 1] : 0;
        const u2_g = dofs[2] > 0 ? ub[dofs[2] - 1] : 0;
        const v2_g = dofs[3] > 0 ? ub[dofs[3] - 1] : 0;

        const u1_l = c1 * u1_g + s1 * v1_g;
        const u2_l = c2 * u2_g + s2 * v2_g;
        const diff = u2_l - u1_l;
        const Ncoef = (E * A / L) * diff;
        Nexpr.addInplace(Ncoef, baseName);
      }

      let typeStr = "";
      const bases = Nexpr.getBases();
      if (bases.length > 0) {
        const c = Nexpr.getCoeff(bases[0]);
        if (c > 1e-9) typeStr = " (Tração)";
        else if (c < -1e-9) typeStr = " (Compressão)";
      }

      resolutionLines.push(`**Barra ${e+1}:**`);
      resolutionLines.push(`  - Deslocamento local: $u_{1,loc} = U_{node1} \\cdot \\cos(\\theta_1) + V_{node1} \\cdot \\sin(\\theta_1)$`);
      resolutionLines.push(`  - Esforço Normal: $N = \\frac{EA}{L} (u_{2,loc} - u_{1,loc})$`);
      resolutionLines.push(`  - Tensão axial: $\\sigma = \\frac{N}{A} = \\frac{E}{L} (u_{2,loc} - u_{1,loc})$`);
      resolutionLines.push(`$$N_{${e+1}} = ${Nexpr.toLaTeX()}${typeStr}$$`);
      const stressExpr = Nexpr.scale(1 / A);
      resolutionLines.push(`$$\\sigma_{${e+1}} = ${stressExpr.toLaTeX()}\\frac{P}{A}$$`);
    }
  } else if (activeOption === 3) {
    resolutionLines.push(`### Deslocamento Axial ao longo da Barra ${activeBar}:`);
    const e = activeBar - 1;
    const b = bars[e];
    if (b) {
      const L = b.L || 1;
      const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
      const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
      const dofs = b.dofs || [0, 0, 0, 0];
      const xi = activeX / L;

      const c1 = cosd(th1), s1 = sind(th1);
      const c2 = cosd(th2), s2 = sind(th2);

      resolutionLines.push(`- Comprimento da Barra: $L_e = ${exprFormatNumber(L)}L$`);
      resolutionLines.push(`- Ponto analisado: $x = ${exprFormatNumber(activeX)}L \\quad (\\xi = ${exprFormatNumber(xi)})$`);
      resolutionLines.push(`- Funções de forma: $N_1(x) = 1 - \\xi, \\quad N_2(x) = \\xi$`);
      resolutionLines.push(`- Campo de deslocamento: $u(x) = N_1(x) u_{1,loc} + N_2(x) u_{2,loc}$`);

      const dispExpr = new Expr(0);
      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const u1_g = dofs[0] > 0 ? ub[dofs[0] - 1] : 0;
        const v1_g = dofs[1] > 0 ? ub[dofs[1] - 1] : 0;
        const u2_g = dofs[2] > 0 ? ub[dofs[2] - 1] : 0;
        const v2_g = dofs[3] > 0 ? ub[dofs[3] - 1] : 0;

        const u1_l = c1 * u1_g + s1 * v1_g;
        const u2_l = c2 * u2_g + s2 * v2_g;
        const u_x = u1_l * (1 - xi) + u2_l * xi;

        let dispBase = `${baseName}L/EA`;
        if (baseName === "p") dispBase = "pL^2/EA";
        dispExpr.addInplace(u_x, dispBase);
      }
      resolutionLines.push(`$$u(${exprFormatNumber(activeX)}L) = ${dispExpr.toLaTeX()}$$`);
    }
  } else if (activeOption === 4) {
    resolutionLines.push("### Zona Crítica ($|\\sigma|$ Máximo):");
    let maxSigmaVal = -1;
    let maxBarIdx = 0;
    let maxSigmaExpr = new Expr(0);

    for (let e = 0; e < nBar; e++) {
      const b = bars[e];
      if (!b) continue;
      const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
      const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
      const L = b.L || 1;
      const E = b.E || 1;
      const A = b.A || 1;
      const dofs = b.dofs || [0, 0, 0, 0];

      const c1 = cosd(th1), s1 = sind(th1);
      const c2 = cosd(th2), s2 = sind(th2);

      const Nexpr = new Expr(0);
      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const u1_g = dofs[0] > 0 ? ub[dofs[0] - 1] : 0;
        const v1_g = dofs[1] > 0 ? ub[dofs[1] - 1] : 0;
        const u2_g = dofs[2] > 0 ? ub[dofs[2] - 1] : 0;
        const v2_g = dofs[3] > 0 ? ub[dofs[3] - 1] : 0;

        const u1_l = c1 * u1_g + s1 * v1_g;
        const u2_l = c2 * u2_g + s2 * v2_g;
        const diff = u2_l - u1_l;
        const Ncoef = (E * A / L) * diff;
        Nexpr.addInplace(Ncoef, baseName);
      }

      const stressExpr = Nexpr.scale(1 / A);
      const bases = stressExpr.getBases();
      let val = 0;
      if (bases.length > 0) {
        val = Math.abs(stressExpr.getCoeff(bases[0]));
      }

      resolutionLines.push(`- Barra ${e+1}: $|\\sigma| = ${stressExpr.toLaTeX()} \\frac{P}{A}$`);
      if (val > maxSigmaVal) {
        maxSigmaVal = val;
        maxBarIdx = e + 1;
        maxSigmaExpr = stressExpr;
      }
    }

    resolutionLines.push("#### Conclusão:");
    resolutionLines.push(`A zona crítica é a **Barra ${maxBarIdx}**, solicitada ao esforço máximo de:`);
    resolutionLines.push(`$$|\\sigma|_{max} = ${maxSigmaExpr.toLaTeX()} \\frac{P}{A}$$`);
  } else if (activeOption === 5) {
    resolutionLines.push("### Frequências Naturais e Modos de Vibração:");
    resolutionLines.push("$$\\left| [K] - \\omega^2 [M] \\right| = 0$$");

    // Consistent Mass matrix assembly
    const M = Matrix.zeros(nDof, nDof);
    for (let e = 0; e < nBar; e++) {
      const b = bars[e];
      if (!b) continue;
      const L = b.L || 1;
      const A = b.A || 1;
      const fM = A * L; // mass matrix term
      const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
      const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
      const c1 = cosd(th1), s1 = sind(th1);
      const c2 = cosd(th2), s2 = sind(th2);

      const me = [
        [fM/3 * c1*c1, fM/3 * c1*s1, fM/6 * c1*c2, fM/6 * c1*s2],
        [fM/3 * s1*c1, fM/3 * s1*s1, fM/6 * s1*c2, fM/6 * s1*s2],
        [fM/6 * c2*c1, fM/6 * c2*s1, fM/3 * c2*c2, fM/3 * c2*s2],
        [fM/6 * s2*c1, fM/6 * s2*s1, fM/3 * s2*c2, fM/3 * s2*s2]
      ];

      const dofs = b.dofs || [0, 0, 0, 0];
      for (let a = 0; a < 4; a++) {
        const ga = dofs[a];
        if (ga > 0 && ga <= nDof) {
          for (let b_idx = 0; b_idx < 4; b_idx++) {
            const gb = dofs[b_idx];
            if (gb > 0 && gb <= nDof) {
              M.addTerm(ga - 1, gb - 1, me[a][b_idx], "rhoAL");
            }
          }
        }
      }
    }

    const Mbar = M.toNumeric("rhoAL");
    resolutionLines.push("$$\\det \\left( \\frac{EA}{L} [Kbar] - \\omega^2 \\rho AL [Mbar] \\right| = 0$$");
    resolutionLines.push("Definindo $\\lambda = \\frac{\\omega^2 \\rho L^2}{E}$:");
    resolutionLines.push("$$\\det \\begin{bmatrix}");
    for (let i = 0; i < nDof; i++) {
      let rStr = "";
      for (let j = 0; j < nDof; j++) {
        const k_v = Kbar[i][j];
        const m_v = Mbar[i][j];
        let term = `${exprFormatNumber(k_v)}`;
        if (m_v !== 0) {
          term += ` - ${exprFormatNumber(m_v)}\\lambda`;
        }
        rStr += `${term} & `;
      }
      resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
    }
    resolutionLines.push("\\end{bmatrix} = 0$$");

    const lams = solveEigenvalues(Kbar, Mbar, nDof);
    if (lams.length === 0) {
      resolutionLines.push("*O sistema excede 3 graus de liberdade livres ou não possui frequências reais disponíveis.*");
    } else {
      resolutionLines.push("#### Autovalores ($\\lambda$):");
      lams.forEach((lam, idx) => {
        resolutionLines.push(`$$\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$$`);
      });

      resolutionLines.push("#### Frequências Naturais ($\\omega$):");
      lams.forEach((lam, idx) => {
        const w = Math.sqrt(lam);
        resolutionLines.push(`$$\\omega_{${idx+1}} = \\frac{${exprFormatNumber(w)}}{L} \\sqrt{\\frac{E}{\\rho}} \\quad \\text{rad/s}$$`);
      });

      resolutionLines.push("#### Modos de Vibração (Autovetores):");
      lams.forEach((lam, idx) => {
        const A_sub = matrixSubtractScaled(Kbar, Mbar, lam);
        const phi = buildModeShapeVector(A_sub);
        resolutionLines.push(`**Modo ${idx+1} ($\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$):**`);
        if (phi) {
          resolutionLines.push("$$\\Phi_{" + (idx+1) + "} = \\begin{Bmatrix}");
          phi.forEach(val => {
            resolutionLines.push(`  ${exprFormatNumber(val)} \\\\`);
          });
          resolutionLines.push("\\end{Bmatrix}$$");
        }
      });
    }
  }

  // Consistent Mass matrix assembly (for animations)
  const M_anim = Matrix.zeros(nDof, nDof);
  for (let e = 0; e < nBar; e++) {
    const b = bars[e];
    if (!b) continue;
    const L = b.L || 1;
    const A = b.A || 1;
    const fM = A * L;
    const th1 = b.th1 !== undefined ? b.th1 : (b.theta || 0);
    const th2 = b.th2 !== undefined ? b.th2 : (b.theta || 0);
    const c1 = cosd(th1), s1 = sind(th1);
    const c2 = cosd(th2), s2 = sind(th2);

    const me = [
      [fM/3 * c1*c1, fM/3 * c1*s1, fM/6 * c1*c2, fM/6 * c1*s2],
      [fM/3 * s1*c1, fM/3 * s1*s1, fM/6 * s1*c2, fM/6 * s1*s2],
      [fM/6 * c2*c1, fM/6 * c2*s1, fM/3 * c2*c2, fM/3 * c2*s2],
      [fM/6 * s2*c1, fM/6 * s2*s1, fM/3 * s2*c2, fM/3 * s2*s2]
    ];

    const dofs = b.dofs || [0, 0, 0, 0];
    for (let a = 0; a < 4; a++) {
      const ga = dofs[a];
      if (ga > 0 && ga <= nDof) {
        for (let b_idx = 0; b_idx < 4; b_idx++) {
          const gb = dofs[b_idx];
          if (gb > 0 && gb <= nDof) {
            M_anim.addTerm(ga - 1, gb - 1, me[a][b_idx], "rhoAL");
          }
        }
      }
    }
  }
  const Mbar_anim = M_anim.toNumeric("rhoAL");

  return {
    K, F, u, uByBase,
    steps: buildStiffnessAssemblyStepLines(K, steps, nDof),
    resolution: resolutionLines,
    eigenvalues: solveEigenvalues(Kbar, Mbar_anim, nDof),
    modeShapes: getModeShapes(Kbar, Mbar_anim, nDof)
  };
}

// ==========================================
// 3. VIGAS (BEAMS) SOLVER
// ==========================================
function solveViga(state) {
  const nElem = state.nElem || 2;
  const nDof = state.nDof || 4;
  const elems = state.elems || [];
  const forces = state.forces || [];
  const activeOption = state.activeOption || 1;
  const activeElem = state.activeElem || 1;
  const activeX = state.activeX || 0.5;

  const K = Matrix.zeros(nDof, nDof);
  const steps = {};

  // Assemble stiffness matrix element-by-element
  for (let e = 0; e < nElem; e++) {
    const el = elems[e];
    if (!el) continue;
    const L = el.L || 1;
    const E = el.E || 1;
    const I_val = el.I || 1;
    const dofs = el.dofs || [0, 0, 0, 0];

    if (L === 0) {
      // Spring element
      const K_spring = E;
      const t1 = dofs[0];
      const t2 = dofs[2];
      const r1 = dofs[1];
      const r2 = dofs[3];

      const getSpringBase = (d1, d2) => {
        const is1_rot = d1 > 0 && d1 % 2 === 0;
        const is2_rot = d2 > 0 && d2 % 2 === 0;
        if (d1 > 0 && d2 > 0) {
          if (is1_rot && is2_rot) return "EI/L";
          else if (is1_rot || is2_rot) return "EI/L^2";
          else return "EI/L^3";
        } else if (d1 > 0) {
          return is1_rot ? "EI/L" : "EI/L^3";
        } else if (d2 > 0) {
          return is2_rot ? "EI/L" : "EI/L^3";
        }
        return "EI/L^3";
      };

      // Translational spring connections
      if (t1 > 0 && t1 <= nDof) {
        const base = getSpringBase(t1, null);
        K.addTerm(t1 - 1, t1 - 1, K_spring, base);
      }
      if (t2 > 0 && t2 <= nDof) {
        const base = getSpringBase(null, t2);
        K.addTerm(t2 - 1, t2 - 1, K_spring, base);
      }
      if (t1 > 0 && t1 <= nDof && t2 > 0 && t2 <= nDof) {
        const base = getSpringBase(t1, t2);
        K.addTerm(t1 - 1, t2 - 1, -K_spring, base);
        K.addTerm(t2 - 1, t1 - 1, -K_spring, base);
      }

      // Rotational spring connections
      if (r1 > 0 && r1 <= nDof) {
        const base = getSpringBase(r1, null);
        K.addTerm(r1 - 1, r1 - 1, K_spring, base);
      }
      if (r2 > 0 && r2 <= nDof) {
        const base = getSpringBase(null, r2);
        K.addTerm(r2 - 1, r2 - 1, K_spring, base);
      }
      if (r1 > 0 && r1 <= nDof && r2 > 0 && r2 <= nDof) {
        const base = getSpringBase(r1, r2);
        K.addTerm(r1 - 1, r2 - 1, -K_spring, base);
        K.addTerm(r2 - 1, r1 - 1, -K_spring, base);
      }
    } else {
      // Beam element stiffness matrix
      const k = [
        [12, 6 * L, -12, 6 * L],
        [6 * L, 4 * L * L, -6 * L, 2 * L * L],
        [-12, -6 * L, 12, -6 * L],
        [6 * L, 2 * L * L, -6 * L, 4 * L * L]
      ];

      for (let i = 0; i < 4; i++) {
        const gi = dofs[i];
        if (gi > 0 && gi <= nDof) {
          for (let j = 0; j < 4; j++) {
            const gj = dofs[j];
            if (gj > 0 && gj <= nDof) {
              let baseStr = "EI/L^3";
              let coeff = k[i][j] * E * I_val;
              const is_i_rot = (i === 1 || i === 3);
              const is_j_rot = (j === 1 || j === 3);

              if (is_i_rot && is_j_rot) {
                baseStr = "EI/L";
                coeff = coeff / (L * L);
              } else if (is_i_rot || is_j_rot) {
                baseStr = "EI/L^2";
                coeff = coeff / L;
              }

              K.addTerm(gi - 1, gj - 1, coeff, baseStr);

              const key = `${gi},${gj}`;
              steps[key] = steps[key] || { symbols: [], values: [] };
              steps[key].symbols.push(`k${i+1}${j+1}_v${e+1}`);
              steps[key].values.push(`${exprFormatNumber(coeff)}*${baseStr}`);
            }
          }
        }
      }
    }
  }

  // Assemble force vector
  const F = [];
  for (let i = 0; i < nDof; i++) {
    F[i] = Expr.fromTerm(forces[i] || 0, "P");
  }

  // Handle distributed load equivalent forces on elements
  for (let e = 0; e < nElem; e++) {
    const el = elems[e];
    if (!el || el.L === 0) continue;
    const L = el.L || 1;
    const p0 = el.p0 || 0;
    const pL = el.pL || 0;
    const pyStr = el.py || "";
    const dofs = el.dofs || [0, 0, 0, 0];

    let f = [0, 0, 0, 0];
    if (pyStr.trim() !== "") {
      const pyFn = parseExpressionLoad(pyStr);
      if (pyFn) {
        f[0] = integrateExpression(pyFn, 1, L, "viga");
        f[1] = integrateExpression(pyFn, 2, L, "viga");
        f[2] = integrateExpression(pyFn, 3, L, "viga");
        f[3] = integrateExpression(pyFn, 4, L, "viga");
      }
    } else {
      const P1 = p0;
      const P2 = pL - p0;
      f[0] = 3/20 * P2 * L + P1 * L / 2;
      f[1] = 1/30 * P2 * L * L + P1 * L * L / 12;
      f[2] = 7/20 * P2 * L + P1 * L / 2;
      f[3] = -1/20 * P2 * L * L - P1 * L * L / 12;
    }

    if (dofs[0] > 0 && dofs[0] <= nDof) F[dofs[0] - 1] = F[dofs[0] - 1].add(Expr.fromTerm(f[0], "p"));
    if (dofs[1] > 0 && dofs[1] <= nDof) F[dofs[1] - 1] = F[dofs[1] - 1].add(Expr.fromTerm(f[1], "p"));
    if (dofs[2] > 0 && dofs[2] <= nDof) F[dofs[2] - 1] = F[dofs[2] - 1].add(Expr.fromTerm(f[2], "p"));
    if (dofs[3] > 0 && dofs[3] <= nDof) F[dofs[3] - 1] = F[dofs[3] - 1].add(Expr.fromTerm(f[3], "p"));
  }

  // Solve displacements
  const base = "EI/L^3"; // base for standard displacements. Rotations will scale by EI/L^2
  const Kbar = K.toNumeric(base);
  const baseTerms = {};
  for (let i = 0; i < nDof; i++) {
    for (let b of F[i].getBases()) {
      baseTerms[b] = true;
    }
  }

  const u = [];
  const uByBase = {};
  for (let i = 0; i < nDof; i++) {
    u[i] = new Expr(0);
  }

  let solveErr = null;
  for (let b in baseTerms) {
    const Fb = [];
    for (let i = 0; i < nDof; i++) {
      Fb[i] = F[i].getCoeff(b);
    }
    const res = Matrix.solveNumeric(Kbar, Fb);
    if (!res.success) {
      solveErr = res.error;
      break;
    }
    uByBase[b] = res.solution;

    for (let i = 0; i < nDof; i++) {
      // Rotation degree of freedom scales differently
      const isRot = (i + 1) % 2 === 0;
      let displayBase = "";
      if (b === "p") {
        displayBase = isRot ? "pL^3/EI" : "pL^4/EI";
      } else {
        displayBase = isRot ? `${b}L^2/EI` : `${b}L^3/EI`;
      }
      u[i] = u[i].add(Expr.fromTerm(res.solution[i], displayBase));
    }
  }

  const resolutionLines = [];

  if (activeOption === 1) {
    resolutionLines.push("### Equações de Equilíbrio $[K]\\{u\\} = \\{F\\}$:");
    for (let b in baseTerms) {
      resolutionLines.push(`**Em termos de $${b}$:**`);
      resolutionLines.push("$$\\frac{EI}{L^3} \\begin{bmatrix}");
      for (let i = 0; i < nDof; i++) {
        let rStr = "";
        for (let j = 0; j < nDof; j++) {
          rStr += `${exprFormatNumber(Kbar[i][j])} & `;
        }
        resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
      }
      resolutionLines.push("\\end{bmatrix} \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        resolutionLines.push(`  u_{${i+1}} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix} = \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        const coef = F[i].getCoeff(b);
        resolutionLines.push(`  ${exprFormatNumber(coef)}${b} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix}$$");
    }

    resolutionLines.push("### Resolução dos Deslocamentos/Rotações nodais:");
    if (solveErr) {
      resolutionLines.push(`*Erro na resolução:* ${solveErr}`);
    } else {
      for (let i = 0; i < nDof; i++) {
        const isRot = (i + 1) % 2 === 0;
        const name = isRot ? `\\theta_{${Math.floor(i/2)+1}}` : `v_{${Math.floor(i/2)+1}}`;
        resolutionLines.push(`$$${name} = ${u[i].toLaTeX()}$$`);
      }
    }
  } else if (activeOption === 2) {
    resolutionLines.push("### Esforços e Momentos flectores nas extremidades:");
    resolutionLines.push("Os esforços locais nas extremidades dos elementos são calculados por: $\\{F^e\\} = [k^e]\\{u^e\\} - \\{F_{eq}^e\\}$");

    for (let e = 0; e < nElem; e++) {
      const el = elems[e];
      if (!el || el.L === 0) continue;
      const L = el.L || 1;
      const E = el.E || 1;
      const I_val = el.I || 1;
      const dofs = el.dofs || [0, 0, 0, 0];

      resolutionLines.push(`**Elemento ${e+1}:**`);

      // Stiffness matrix of element
      const k = [
        [12, 6 * L, -12, 6 * L],
        [6 * L, 4 * L * L, -6 * L, 2 * L * L],
        [-12, -6 * L, 12, -6 * L],
        [6 * L, 2 * L * L, -6 * L, 4 * L * L]
      ];

      const p0 = el.p0 || 0;
      const pL = el.pL || 0;
      const pyStr = el.py || "";
      let f_eq = [0, 0, 0, 0];
      if (pyStr.trim() !== "") {
        const pyFn = parseExpressionLoad(pyStr);
        if (pyFn) {
          f_eq[0] = integrateExpression(pyFn, 1, L, "viga");
          f_eq[1] = integrateExpression(pyFn, 2, L, "viga");
          f_eq[2] = integrateExpression(pyFn, 3, L, "viga");
          f_eq[3] = integrateExpression(pyFn, 4, L, "viga");
        }
      } else {
        const P1 = p0;
        const P2 = pL - p0;
        f_eq[0] = 3/20 * P2 * L + P1 * L / 2;
        f_eq[1] = 1/30 * P2 * L * L + P1 * L * L / 12;
        f_eq[2] = 7/20 * P2 * L + P1 * L / 2;
        f_eq[3] = -1/20 * P2 * L * L - P1 * L * L / 12;
      }

      // Compute internal forces
      const internalForces = [];
      for (let i = 0; i < 4; i++) {
        internalForces[i] = new Expr(0);
      }

      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const ue = [
          dofs[0] > 0 ? ub[dofs[0] - 1] : 0,
          dofs[1] > 0 ? ub[dofs[1] - 1] : 0,
          dofs[2] > 0 ? ub[dofs[2] - 1] : 0,
          dofs[3] > 0 ? ub[dofs[3] - 1] : 0
        ];

        // multiply Ke * ue
        const ke_ue = [];
        const factor = (E * I_val) / (L * L * L);
        for (let i = 0; i < 4; i++) {
          let sum = 0;
          for (let j = 0; j < 4; j++) {
            sum += k[i][j] * ue[j];
          }
          ke_ue[i] = sum * factor;
        }

        // subtract f_eq
        for (let i = 0; i < 4; i++) {
          let coef = ke_ue[i];
          if (baseName === "p") {
            coef -= f_eq[i];
          }
          internalForces[i].addInplace(coef, baseName);
        }
      }

      resolutionLines.push(`$$V_1 = ${internalForces[0].toLaTeX()} P \\quad M_1 = ${internalForces[1].toLaTeX()} PL$$`);
      resolutionLines.push(`$$V_2 = ${internalForces[2].toLaTeX()} P \\quad M_2 = ${internalForces[3].toLaTeX()} PL$$`);
    }
  } else if (activeOption === 3) {
    resolutionLines.push(`### Deslocamento e Rotação ao longo do Elemento ${activeElem}:`);
    const e = activeElem - 1;
    const el = elems[e];
    if (el && el.L > 0) {
      const L = el.L || 1;
      const dofs = el.dofs || [0, 0, 0, 0];
      const xi = activeX / L;

      resolutionLines.push(`- Comprimento: $L_e = ${exprFormatNumber(L)}L$`);
      resolutionLines.push(`- Ponto analisado: $x = ${exprFormatNumber(activeX)}L \\quad (\\xi = ${exprFormatNumber(xi)})$`);
      resolutionLines.push("- Equação de interpolação: $v(\\xi) = N_1(\\xi) v_1 + N_2(\\xi) \\theta_1 + N_3(\\xi) v_2 + N_4(\\xi) \\theta_2$");

      const N = [
        1 - 3 * xi * xi + 2 * xi * xi * xi,
        activeX * (1 - xi) * (1 - xi),
        3 * xi * xi - 2 * xi * xi * xi,
        activeX * (xi * xi - xi)
      ];

      const vExpr = new Expr(0);
      const thetaExpr = new Expr(0);

      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const ue = [
          dofs[0] > 0 ? ub[dofs[0] - 1] : 0,
          dofs[1] > 0 ? ub[dofs[1] - 1] : 0,
          dofs[2] > 0 ? ub[dofs[2] - 1] : 0,
          dofs[3] > 0 ? ub[dofs[3] - 1] : 0
        ];

        const v_xi = N[0] * ue[0] + N[1] * ue[1] + N[2] * ue[2] + N[3] * ue[3];
        let dispBase = `${baseName}L^3/EI`;
        if (baseName === "p") dispBase = "pL^4/EI";
        vExpr.addInplace(v_xi, dispBase);

        // Derivative of shape functions for rotation: theta(x) = v'(x)
        const N_prime = [
          (-6 * xi + 6 * xi * xi) / L,
          (1 - 4 * xi + 3 * xi * xi),
          (6 * xi - 6 * xi * xi) / L,
          (3 * xi * xi - 2 * xi)
        ];
        const t_xi = N_prime[0] * ue[0] + N_prime[1] * ue[1] + N_prime[2] * ue[2] + N_prime[3] * ue[3];
        let rotBase = `${baseName}L^2/EI`;
        if (baseName === "p") rotBase = "pL^3/EI";
        thetaExpr.addInplace(t_xi, rotBase);
      }

      resolutionLines.push(`$$v(${exprFormatNumber(activeX)}L) = ${vExpr.toLaTeX()}$$`);
      resolutionLines.push(`$$\\theta(${exprFormatNumber(activeX)}L) = ${thetaExpr.toLaTeX()}$$`);
    }
  } else if (activeOption === 5) {
    resolutionLines.push("### Frequências Naturais e Modos de Vibração:");
    resolutionLines.push("$$\\left| [K] - \\omega^2 [M] \\right| = 0$$");

    // Consistent mass matrix for beams
    const M = Matrix.zeros(nDof, nDof);
    for (let e = 0; e < nElem; e++) {
      const el = elems[e];
      if (!el || el.L === 0) continue;
      const L = el.L || 1;
      const A = el.A || 1;
      const fM = A * L / 420;

      const me = [
        [156 * fM, 22 * L * fM, 54 * fM, -13 * L * fM],
        [22 * L * fM, 4 * L * L * fM, 13 * L * fM, -3 * L * L * fM],
        [54 * fM, 13 * L * fM, 156 * fM, -22 * L * fM],
        [-13 * L * fM, -3 * L * L * fM, -22 * L * fM, 4 * L * L * fM]
      ];

      const dofs = el.dofs || [0, 0, 0, 0];
      for (let a = 0; a < 4; a++) {
        const ga = dofs[a];
        if (ga > 0 && ga <= nDof) {
          for (let b_idx = 0; b_idx < 4; b_idx++) {
            const gb = dofs[b_idx];
            if (gb > 0 && gb <= nDof) {
              M.addTerm(ga - 1, gb - 1, me[a][b_idx], "rhoAL");
            }
          }
        }
      }
    }

    const Mbar = M.toNumeric("rhoAL");
    resolutionLines.push("$$\\det \\left( \\frac{EI}{L^3} [Kbar] - \\omega^2 \\rho AL [Mbar] \\right) = 0$$");
    resolutionLines.push("Definindo autovalores $\\lambda = \\frac{\\omega^2 \\rho A L^4}{E I}$:");
    resolutionLines.push("$$\\det \\begin{bmatrix}");
    for (let i = 0; i < nDof; i++) {
      let rStr = "";
      for (let j = 0; j < nDof; j++) {
        const k_v = Kbar[i][j];
        const m_v = Mbar[i][j];
        let term = `${exprFormatNumber(k_v)}`;
        if (m_v !== 0) {
          term += ` - ${exprFormatNumber(m_v)}\\lambda`;
        }
        rStr += `${term} & `;
      }
      resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
    }
    resolutionLines.push("\\end{bmatrix} = 0$$");

    const lams = solveEigenvalues(Kbar, Mbar, nDof);
    if (lams.length === 0) {
      resolutionLines.push("*O sistema excede 3 DOFs livres ou não possui frequências reais disponíveis.*");
    } else {
      resolutionLines.push("#### Autovalores ($\\lambda$):");
      lams.forEach((lam, idx) => {
        resolutionLines.push(`$$\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$$`);
      });

      resolutionLines.push("#### Frequências Naturais ($\\omega$):");
      lams.forEach((lam, idx) => {
        const w = Math.sqrt(lam);
        resolutionLines.push(`$$\\omega_{${idx+1}} = \\frac{${exprFormatNumber(w)}}{L^2} \\sqrt{\\frac{EI}{\\rho A}} \\quad \\text{rad/s}$$`);
      });

      resolutionLines.push("#### Modos de Vibração (Autovetores):");
      lams.forEach((lam, idx) => {
        const A_sub = matrixSubtractScaled(Kbar, Mbar, lam);
        const phi = buildModeShapeVector(A_sub);
        resolutionLines.push(`**Modo ${idx+1} ($\\lambda_{${idx+1}} = ${exprFormatNumber(lam)}$):**`);
        if (phi) {
          resolutionLines.push("$$\\Phi_{" + (idx+1) + "} = \\begin{Bmatrix}");
          phi.forEach(val => {
            resolutionLines.push(`  ${exprFormatNumber(val)} \\\\`);
          });
          resolutionLines.push("\\end{Bmatrix}$$");
        }
      });
    }
  }

  // Consistent Mass Matrix (for animations)
  const M_anim = Matrix.zeros(nDof, nDof);
  for (let e = 0; e < nElem; e++) {
    const el = elems[e];
    if (!el || el.L === 0) continue;
    const L = el.L || 1;
    const A = el.A || 1;
    const fM = A * L / 420;

    const me = [
      [156 * fM, 22 * L * fM, 54 * fM, -13 * L * fM],
      [22 * L * fM, 4 * L * L * fM, 13 * L * fM, -3 * L * L * fM],
      [54 * fM, 13 * L * fM, 156 * fM, -22 * L * fM],
      [-13 * L * fM, -3 * L * L * fM, -22 * L * fM, 4 * L * L * fM]
    ];

    const dofs = el.dofs || [0, 0, 0, 0];
    for (let a = 0; a < 4; a++) {
      const ga = dofs[a];
      if (ga > 0 && ga <= nDof) {
        for (let b_idx = 0; b_idx < 4; b_idx++) {
          const gb = dofs[b_idx];
          if (gb > 0 && gb <= nDof) {
            M_anim.addTerm(ga - 1, gb - 1, me[a][b_idx], "rhoAL");
          }
        }
      }
    }
  }
  const Mbar_anim = M_anim.toNumeric("rhoAL");

  return {
    K, F, u, uByBase,
    steps: buildStiffnessAssemblyStepLines(K, steps, nDof),
    resolution: resolutionLines,
    eigenvalues: solveEigenvalues(Kbar, Mbar_anim, nDof),
    modeShapes: getModeShapes(Kbar, Mbar_anim, nDof)
  };
}

// ==========================================
// 4. VIGA-BARRA 2D (PÓRTICOS / FRAMES) SOLVER
// ==========================================
function solveVigaBarra2D(state) {
  const nElem = state.nElem || 2;
  const nDof = state.nDof || 6;
  const elems = state.elems || [];
  const forces = state.forces || [];
  const activeOption = state.activeOption || 1;
  const activeElem = state.activeElem || 1;
  const activeX = state.activeX || 0.5;

  const K = Matrix.zeros(nDof, nDof);
  const steps = {};

  // Assemble frame elements
  for (let e = 0; e < nElem; e++) {
    const el = elems[e];
    if (!el) continue;
    const L = el.L || 1;
    const E = el.E || 1;
    const A = el.A || 1;
    const I_val = el.I || 1;
    const th = el.theta || 0;
    const c = cosd(th), s = sind(th);
    const dofs = el.dofs || [0, 0, 0, 0, 0, 0];

    // Local frame element stiffness matrix Ke_local (6x6)
    const k_local = [
      [E*A/L,   0,             0,          -E*A/L,  0,             0],
      [0,       12*E*I_val/(L*L*L), 6*E*I_val/(L*L),  0,       -12*E*I_val/(L*L*L), 6*E*I_val/(L*L)],
      [0,       6*E*I_val/(L*L),  4*E*I_val/L,      0,       -6*E*I_val/(L*L),  2*E*I_val/L],
      [-E*A/L,  0,             0,          E*A/L,   0,             0],
      [0,       -12*E*I_val/(L*L*L), -6*E*I_val/(L*L), 0,       12*E*I_val/(L*L*L),  -6*E*I_val/(L*L)],
      [0,       6*E*I_val/(L*L),  2*E*I_val/L,      0,       -6*E*I_val/(L*L),  4*E*I_val/L]
    ];

    // Rotation Matrix R (6x6)
    const R = [
      [c, s, 0, 0, 0, 0],
      [-s, c, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0],
      [0, 0, 0, -s, c, 0],
      [0, 0, 0, 0, 0, 1]
    ];

    // Ke_global = R^T * Ke_local * R
    // Ke_global[i][j] = sum_p sum_q R[p][i] * Ke_local[p][q] * R[q][j]
    const k_global = [];
    for (let i = 0; i < 6; i++) {
      k_global[i] = [];
      for (let j = 0; j < 6; j++) {
        let sum = 0;
        for (let p = 0; p < 6; p++) {
          for (let q = 0; q < 6; q++) {
            sum += R[p][i] * k_local[p][q] * R[q][j];
          }
        }
        k_global[i][j] = sum;
      }
    }

    // Assemble global matrix K
    for (let i = 0; i < 6; i++) {
      const gi = dofs[i];
      if (gi > 0 && gi <= nDof) {
        for (let j = 0; j < 6; j++) {
          const gj = dofs[j];
          if (gj > 0 && gj <= nDof) {
            const val = k_global[i][j];
            K.addTerm(gi - 1, gj - 1, val, "EI/L^3");

            const key = `${gi},${gj}`;
            steps[key] = steps[key] || { symbols: [], values: [] };
            steps[key].symbols.push(`k${i+1}${j+1}_f${e+1}`);
            steps[key].values.push(`${exprFormatNumber(val)}*EI/L^3`);
          }
        }
      }
    }
  }

  // Assemble force vector
  const F = [];
  for (let i = 0; i < nDof; i++) {
    F[i] = Expr.fromTerm(forces[i] || 0, "P");
  }

  // Handle frame distributed loads
  for (let e = 0; e < nElem; e++) {
    const el = elems[e];
    if (!el || el.L === 0) continue;
    const L = el.L || 1;
    const p0 = el.p0 || 0;
    const pL = el.pL || 0;
    const pyStr = el.py || "";
    const th = el.theta || 0;
    const c = cosd(th), s = sind(th);
    const dofs = el.dofs || [0, 0, 0, 0, 0, 0];

    let f_local = [0, 0, 0, 0, 0, 0];
    if (pyStr.trim() !== "") {
      const pyFn = parseExpressionLoad(pyStr);
      if (pyFn) {
        f_local[1] = integrateExpression(pyFn, 1, L, "viga");
        f_local[2] = integrateExpression(pyFn, 2, L, "viga");
        f_local[4] = integrateExpression(pyFn, 3, L, "viga");
        f_local[5] = integrateExpression(pyFn, 4, L, "viga");
      }
    } else {
      const P1 = p0;
      const P2 = pL - p0;
      f_local[1] = 3/20 * P2 * L + P1 * L / 2;
      f_local[2] = 1/30 * P2 * L * L + P1 * L * L / 12;
      f_local[4] = 7/20 * P2 * L + P1 * L / 2;
      f_local[5] = -1/20 * P2 * L * L - P1 * L * L / 12;
    }

    // Convert local forces to global: F_global = R^T * F_local
    // F_global[i] = sum_p R[p][i] * F_local[p]
    const f_global = [];
    const R = [
      [c, s, 0, 0, 0, 0],
      [-s, c, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0],
      [0, 0, 0, -s, c, 0],
      [0, 0, 0, 0, 0, 1]
    ];

    for (let i = 0; i < 6; i++) {
      let sum = 0;
      for (let p = 0; p < 6; p++) {
        sum += R[p][i] * f_local[p];
      }
      f_global[i] = sum;
    }

    // Add to global forces F
    for (let i = 0; i < 6; i++) {
      const gi = dofs[i];
      if (gi > 0 && gi <= nDof) {
        F[gi - 1] = F[gi - 1].add(Expr.fromTerm(f_global[i], "p"));
      }
    }
  }

  // Solve displacements
  const base = "EI/L^3";
  const Kbar = K.toNumeric(base);
  const baseTerms = {};
  for (let i = 0; i < nDof; i++) {
    for (let b of F[i].getBases()) {
      baseTerms[b] = true;
    }
  }

  const u = [];
  const uByBase = {};
  for (let i = 0; i < nDof; i++) {
    u[i] = new Expr(0);
  }

  let solveErr = null;
  for (let b in baseTerms) {
    const Fb = [];
    for (let i = 0; i < nDof; i++) {
      Fb[i] = F[i].getCoeff(b);
    }
    const res = Matrix.solveNumeric(Kbar, Fb);
    if (!res.success) {
      solveErr = res.error;
      break;
    }
    uByBase[b] = res.solution;

    for (let i = 0; i < nDof; i++) {
      const isRot = (i + 1) % 3 === 0;
      let displayBase = "";
      if (b === "p") {
        displayBase = isRot ? "pL^3/EI" : "pL^4/EI";
      } else {
        displayBase = isRot ? `${b}L^2/EI` : `${b}L^3/EI`;
      }
      u[i] = u[i].add(Expr.fromTerm(res.solution[i], displayBase));
    }
  }

  const resolutionLines = [];

  if (activeOption === 1) {
    resolutionLines.push("### Equações de Equilíbrio $[K]\\{u\\} = \\{F\\}$:");
    for (let b in baseTerms) {
      resolutionLines.push(`**Em termos de $${b}$:**`);
      resolutionLines.push("$$\\frac{EI}{L^3} \\begin{bmatrix}");
      for (let i = 0; i < nDof; i++) {
        let rStr = "";
        for (let j = 0; j < nDof; j++) {
          rStr += `${exprFormatNumber(Kbar[i][j])} & `;
        }
        resolutionLines.push(`  ${rStr.slice(0, -3)} \\\\`);
      }
      resolutionLines.push("\\end{bmatrix} \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        resolutionLines.push(`  u_{${i+1}} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix} = \\begin{Bmatrix}");
      for (let i = 0; i < nDof; i++) {
        const coef = F[i].getCoeff(b);
        resolutionLines.push(`  ${exprFormatNumber(coef)}${b} \\\\`);
      }
      resolutionLines.push("\\end{Bmatrix}$$");
    }

    resolutionLines.push("### Resolução dos Deslocamentos/Rotações nodais:");
    if (solveErr) {
      resolutionLines.push(`*Erro na resolução:* ${solveErr}`);
    } else {
      for (let i = 0; i < nDof; i++) {
        const type = (i + 1) % 3;
        let name = "";
        if (type === 1) name = `u_{${Math.floor(i/3)+1}}`;
        else if (type === 2) name = `v_{${Math.floor(i/3)+1}}`;
        else name = `\\theta_{${Math.floor(i/3)+1}}`;

        resolutionLines.push(`$$${name} = ${u[i].toLaTeX()}$$`);
      }
    }
  } else if (activeOption === 2) {
    resolutionLines.push("### Esforços e Momentos nas extremidades (Coordenadas Locais):");
    resolutionLines.push("Os esforços locais são calculados por: $\\{F_{loc}^e\\} = [k_{loc}^e]\\{u_{loc}^e\\} - \\{F_{eq,loc}^e\\}$");

    for (let e = 0; e < nElem; e++) {
      const el = elems[e];
      if (!el || el.L === 0) continue;
      const L = el.L || 1;
      const E = el.E || 1;
      const A = el.A || 1;
      const I_val = el.I || 1;
      const th = el.theta || 0;
      const c = cosd(th), s = sind(th);
      const dofs = el.dofs || [0, 0, 0, 0, 0, 0];

      resolutionLines.push(`**Elemento ${e+1}:**`);

      const k_local = [
        [E*A/L,   0,             0,          -E*A/L,  0,             0],
        [0,       12*E*I_val/(L*L*L), 6*E*I_val/(L*L),  0,       -12*E*I_val/(L*L*L), 6*E*I_val/(L*L)],
        [0,       6*E*I_val/(L*L),  4*E*I_val/L,      0,       -6*E*I_val/(L*L),  2*E*I_val/L],
        [-E*A/L,  0,             0,          E*A/L,   0,             0],
        [0,       -12*E*I_val/(L*L*L), -6*E*I_val/(L*L), 0,       12*E*I_val/(L*L*L),  -6*E*I_val/(L*L)],
        [0,       6*E*I_val/(L*L),  2*E*I_val/L,      0,       -6*E*I_val/(L*L),  4*E*I_val/L]
      ];

      const R = [
        [c, s, 0, 0, 0, 0],
        [-s, c, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, c, s, 0],
        [0, 0, 0, -s, c, 0],
        [0, 0, 0, 0, 0, 1]
      ];

      const p0 = el.p0 || 0;
      const pL = el.pL || 0;
      const pyStr = el.py || "";
      let f_eq_local = [0, 0, 0, 0, 0, 0];
      if (pyStr.trim() !== "") {
        const pyFn = parseExpressionLoad(pyStr);
        if (pyFn) {
          f_eq_local[1] = integrateExpression(pyFn, 1, L, "viga");
          f_eq_local[2] = integrateExpression(pyFn, 2, L, "viga");
          f_eq_local[4] = integrateExpression(pyFn, 3, L, "viga");
          f_eq_local[5] = integrateExpression(pyFn, 4, L, "viga");
        }
      } else {
        const P1 = p0;
        const P2 = pL - p0;
        f_eq_local[1] = 3/20 * P2 * L + P1 * L / 2;
        f_eq_local[2] = 1/30 * P2 * L * L + P1 * L * L / 12;
        f_eq_local[4] = 7/20 * P2 * L + P1 * L / 2;
        f_eq_local[5] = -1/20 * P2 * L * L - P1 * L * L / 12;
      }

      const internalLoc = [];
      for (let i = 0; i < 6; i++) {
        internalLoc[i] = new Expr(0);
      }

      for (let baseName in uByBase) {
        const ub = uByBase[baseName];
        const u_glob = [
          dofs[0] > 0 ? ub[dofs[0] - 1] : 0,
          dofs[1] > 0 ? ub[dofs[1] - 1] : 0,
          dofs[2] > 0 ? ub[dofs[2] - 1] : 0,
          dofs[3] > 0 ? ub[dofs[3] - 1] : 0,
          dofs[4] > 0 ? ub[dofs[4] - 1] : 0,
          dofs[5] > 0 ? ub[dofs[5] - 1] : 0
        ];

        // u_local = R * u_global
        const u_loc = [];
        for (let i = 0; i < 6; i++) {
          let sum = 0;
          for (let j = 0; j < 6; j++) {
            sum += R[i][j] * u_glob[j];
          }
          u_loc[i] = sum;
        }

        // k_local * u_local
        const ke_ue = [];
        for (let i = 0; i < 6; i++) {
          let sum = 0;
          for (let j = 0; j < 6; j++) {
            sum += k_local[i][j] * u_loc[j];
          }
          ke_ue[i] = sum;
        }

        // subtract equivalent forces
        for (let i = 0; i < 6; i++) {
          let coef = ke_ue[i];
          if (baseName === "p") {
            coef -= f_eq_local[i];
          }
          internalLoc[i].addInplace(coef, baseName);
        }
      }

      resolutionLines.push(`$$N_1 = ${internalLoc[0].toLaTeX()} P \\quad V_1 = ${internalLoc[1].toLaTeX()} P \\quad M_1 = ${internalLoc[2].toLaTeX()} PL$$`);
      resolutionLines.push(`$$N_2 = ${internalLoc[3].toLaTeX()} P \\quad V_2 = ${internalLoc[4].toLaTeX()} P \\quad M_2 = ${internalLoc[5].toLaTeX()} PL$$`);
    }
  }

  return {
    K, F, u, uByBase,
    steps: buildStiffnessAssemblyStepLines(K, steps, nDof),
    resolution: resolutionLines,
    eigenvalues: [],
    modeShapes: []
  };
}

// Helpers to format the step-by-step stiffness matrix assembly explanation
function buildStiffnessAssemblyStepLines(K, steps, nDof) {
  const lines = ["**Montagem Passo a Passo do K Global:**"];
  for (let i = 1; i <= nDof; i++) {
    for (let j = 1; j <= nDof; j++) {
      const key = `${i},${j}`;
      if (steps[key]) {
        let left = `K_{${i}${j}} = ` + steps[key].symbols.join(" + ");
        left = left.replace(/\+ -/g, "- ");
        let middle = "= " + steps[key].values.join(" + ");
        middle = middle.replace(/\+ -/g, "- ");
        let right = `= ${K.get(i-1, j-1).toString()}`;
        lines.push(`$$${left}$$`);
        lines.push(`$$${middle}$$`);
        if (steps[key].symbols.length > 1 || middle !== right) {
          lines.push(`$$${right}$$`);
        }
        lines.push("---");
      }
    }
  }
  return lines;
}

// Helper to extract Mode Shapes list for animation
function getModeShapes(Kbar, Mbar, nDof) {
  const lams = solveEigenvalues(Kbar, Mbar, nDof);
  return lams.map(lam => {
    const A_sub = matrixSubtractScaled(Kbar, Mbar, lam);
    return buildModeShapeVector(A_sub);
  });
}
