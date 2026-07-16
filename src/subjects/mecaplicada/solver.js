// Physics solver for Mecânica Aplicada (Applied Mechanics)
// Solves Vibrations, 4-Bar Linkages, Slider-Crank, Sliding Rods, and Rolling Disks

import { Matrix } from '../../core/math.js';

export function solveMecAplicada(state) {
  const type = state.type || "vibracoes";

  if (type === "vibracoes") {
    return solveVibracoes(state);
  } else if (type === "quatro_barras") {
    return solveQuatroBarras(state);
  } else if (type === "biela_manivela") {
    return solveBielaManivela(state);
  } else if (type === "barra_deslizante") {
    return solveBarraDeslizante(state);
  } else if (type === "disco_rolante") {
    return solveDiscoRolante(state);
  }

  return { success: false, error: "Tipo de exercício inválido." };
}

// 1. Mechanical Vibrations Solver
function solveVibracoes(state) {
  const L = parseFloat(state.barLength) || 2.0;
  const m_bar = parseFloat(state.barMass) || 5.0;
  const d_O = parseFloat(state.pivotX) || 0.5;
  const springs = state.springs || [];
  const dampers = state.dampers || [];
  const masses = state.masses || [];
  const force = state.force || { x: 2.0, F0: 0.0, w: 0.0, type: 'sin' };
  const x0_deg = parseFloat(state.x0) || 5.0;
  const v0 = parseFloat(state.v0) || 0.0;
  const x0 = x0_deg * Math.PI / 180;
  const g = 9.81;

  const I_bar = (1/12) * m_bar * L * L + m_bar * Math.pow((L/2) - d_O, 2);
  let I_masses = 0;
  masses.forEach(m => { I_masses += m.m * Math.pow(m.x - d_O, 2); });
  const I_eq = I_bar + I_masses;

  let k_eq = 0;
  springs.forEach(s => { k_eq += s.k * Math.pow(s.x - d_O, 2); });

  let c_eq = 0;
  dampers.forEach(d => { c_eq += d.c * Math.pow(d.x - d_O, 2); });

  const M_0 = (force.F0 || 0) * (force.x - d_O);
  const w_f = force.w || 0;

  if (I_eq <= 0) return { success: false, error: "A inércia equivalente deve ser maior que zero." };
  if (k_eq <= 0) return { success: false, error: "A rigidez equivalente deve ser maior que zero." };

  const w_n = Math.sqrt(k_eq / I_eq);
  const f_n = w_n / (2 * Math.PI);
  const c_crit = 2 * I_eq * w_n;
  const zeta = c_eq / c_crit;

  let dampingType = "Não Amortecido";
  let w_d = w_n;
  if (c_eq > 0) {
    if (zeta < 1) {
      dampingType = "Sub-amortecido";
      w_d = w_n * Math.sqrt(1 - zeta * zeta);
    } else if (Math.abs(zeta - 1) < 1e-4) {
      dampingType = "Amortecimento Crítico";
      w_d = 0;
    } else {
      dampingType = "Sobreamortecido";
      w_d = 0;
    }
  }

  let Theta_ss = 0;
  let phi = 0;
  let r = 0;
  let M_f = 0;

  if (M_0 !== 0 && w_f > 0) {
    r = w_f / w_n;
    M_f = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    Theta_ss = (M_0 / k_eq) * M_f;
    phi = Math.atan2(2 * zeta * r, 1 - r * r);
    if (phi < 0) phi += 2 * Math.PI;
  }

  const trajectory = [];
  const steps = 400;
  const dt = 8.0 / steps;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    let theta_p = 0;
    if (M_0 !== 0 && w_f > 0) {
      theta_p = force.type === 'sin' ? Theta_ss * Math.sin(w_f * t - phi) : Theta_ss * Math.cos(w_f * t - phi);
    }

    let theta_h0 = x0;
    let dtheta_h0 = v0;
    if (M_0 !== 0 && w_f > 0) {
      const theta_p0 = force.type === 'sin' ? Theta_ss * Math.sin(-phi) : Theta_ss * Math.cos(-phi);
      const dtheta_p0 = force.type === 'sin' ? Theta_ss * w_f * Math.cos(-phi) : -Theta_ss * w_f * Math.sin(-phi);
      theta_h0 = x0 - theta_p0;
      dtheta_h0 = v0 - dtheta_p0;
    }

    let theta_h = 0;
    if (c_eq === 0 || zeta === 0) {
      theta_h = theta_h0 * Math.cos(w_n * t) + (dtheta_h0 / w_n) * Math.sin(w_n * t);
    } else if (zeta < 1) {
      const B_h = (dtheta_h0 + zeta * w_n * theta_h0) / w_d;
      theta_h = Math.exp(-zeta * w_n * t) * (theta_h0 * Math.cos(w_d * t) + B_h * Math.sin(w_d * t));
    } else if (Math.abs(zeta - 1) < 1e-4) {
      theta_h = Math.exp(-w_n * t) * (theta_h0 + (dtheta_h0 + w_n * theta_h0) * t);
    } else {
      const s1 = -zeta * w_n + w_n * Math.sqrt(zeta * zeta - 1);
      const s2 = -zeta * w_n - w_n * Math.sqrt(zeta * zeta - 1);
      const C1 = (dtheta_h0 - s2 * theta_h0) / (s1 - s2);
      const C2 = (s1 * theta_h0 - dtheta_h0) / (s1 - s2);
      theta_h = C1 * Math.exp(s1 * t) + C2 * Math.exp(s2 * t);
    }

    trajectory.push({
      time: t,
      theta: theta_h + theta_p,
      thetaDeg: (theta_h + theta_p) * 180 / Math.PI
    });
  }

  const res = [];
  res.push("### 1. Modelo Físico e Equação de Equilíbrio Dinâmico");
  res.push("$$\\sum M_O = I_{eq} \\ddot{\\theta}$$");
  res.push("$$I_{eq} \\ddot{\\theta} + c_{eq} \\dot{\\theta} + k_{eq} \\theta = M_{eq}(t)$$");
  res.push(`- **Inércia Equivalente ($I_{eq}$)**: $I_{eq} = ${I_eq.toFixed(4)}\\text{ kg}\\cdot\\text{m}^2$`);
  res.push(`- **Rigidez Equivalente ($k_{eq}$)**: $k_{eq} = ${k_eq.toFixed(2)}\\text{ N}\\cdot\\text{m/rad}$`);
  res.push(`- **Amortecimento Equivalente ($c_{eq}$)**: $c_{eq} = ${c_eq.toFixed(2)}\\text{ N}\\cdot\\text{m}\\cdot\\text{s/rad}$`);
  res.push("### 2. Propriedades Dinâmicas");
  res.push(`- Freq. Natural: $\\omega_n = ${w_n.toFixed(3)}\\text{ rad/s}$ ($f_n = ${f_n.toFixed(3)}\\text{ Hz}$)`);
  res.push(`- Razão de Amortecimento: $\\zeta = ${zeta.toFixed(4)}$ (${dampingType})`);

  return {
    success: true,
    type: "vibracoes",
    results: { I_eq, k_eq, c_eq, M_0, w_n, f_n, c_crit, zeta, dampingType, w_d, Theta_ss, Theta_ss_deg: Theta_ss * 180 / Math.PI, phi, r, M_f },
    trajectory,
    resolutionMarkdown: res.join("\n")
  };
}

// 2. 4-Bar Mechanism Solver
function solveQuatroBarras(state) {
  const r1 = parseFloat(state.r1) || 0.1;
  const r2 = parseFloat(state.r2) || 0.3;
  const r3 = parseFloat(state.r3) || 0.3;
  const r4 = parseFloat(state.r4) || 0.2;
  const m1 = parseFloat(state.m1) || 0.5;
  const m2 = parseFloat(state.m2) || 1.5;
  const m4 = parseFloat(state.m4) || 1.0;
  const w1 = parseFloat(state.w1) || 2.0;
  const mode = state.assemblyMode || "open";
  const activeTheta1Deg = parseFloat(state.theta1) || 45;
  const g = 9.81;

  const solveKinematicsSingle = (t1) => {
    const xA = r1 * Math.cos(t1);
    const yA = r1 * Math.sin(t1);
    const xD = r3;
    const yD = 0;
    const d = Math.sqrt(Math.pow(xD - xA, 2) + Math.pow(yD - yA, 2));

    if (d > r2 + r4 || d < Math.abs(r2 - r4)) return { success: false };

    const gamma = Math.atan2(yD - yA, xD - xA);
    const cos_alpha = (r2 * r2 + d * d - r4 * r4) / (2 * r2 * d);
    const alpha_A = Math.acos(Math.max(-1, Math.min(1, cos_alpha)));

    let t2 = mode === "open" ? gamma - alpha_A : gamma + alpha_A;
    const xB = xA + r2 * Math.cos(t2);
    const yB = yA + r2 * Math.sin(t2);
    const t4 = Math.atan2(yB - yD, xB - xD);

    const det = r2 * r4 * Math.sin(t2 - t4);
    if (Math.abs(det) < 1e-6) return { success: false, lockingPoint: true };
    
    const w2 = (r1 * w1 * Math.sin(t4 - t1)) / (r2 * Math.sin(t2 - t4));
    const w4 = (r1 * w1 * Math.sin(t2 - t1)) / (r4 * Math.sin(t2 - t4));

    const A_acc = r1 * w1 * w1 * Math.cos(t1) + r2 * w2 * w2 * Math.cos(t2) - r4 * w4 * w4 * Math.cos(t4);
    const B_acc = r1 * w1 * w1 * Math.sin(t1) + r2 * w2 * w2 * Math.sin(t2) - r4 * w4 * w4 * Math.sin(t4);
    const a2 = (-A_acc * Math.cos(t4) + B_acc * Math.sin(t4)) / (r2 * Math.sin(t2 - t4));
    const a4 = (B_acc * Math.sin(t2) - A_acc * Math.cos(t2)) / (r4 * Math.sin(t2 - t4));

    let CIR = null;
    const det_cir = Math.sin(t4 - t1);
    if (Math.abs(det_cir) > 1e-5) {
      CIR = {
        x: (r3 * Math.sin(t4) * Math.cos(t1)) / det_cir,
        y: (r3 * Math.sin(t4) * Math.sin(t1)) / det_cir
      };
    }

    // Solve forces (9x9)
    const axG1 = -0.5 * r1 * w1 * w1 * Math.cos(t1);
    const ayG1 = -0.5 * r1 * w1 * w1 * Math.sin(t1);
    const axG2 = -r1 * w1 * w1 * Math.cos(t1) - 0.5 * r2 * a2 * Math.sin(t2) - 0.5 * r2 * w2 * w2 * Math.cos(t2);
    const ayG2 = -r1 * w1 * w1 * Math.sin(t1) + 0.5 * r2 * a2 * Math.cos(t2) - 0.5 * r2 * w2 * w2 * Math.sin(t2);
    const axG4 = -0.5 * r4 * a4 * Math.sin(t4) - 0.5 * r4 * w4 * w4 * Math.cos(t4);
    const ayG4 = 0.5 * r4 * a4 * Math.cos(t4) - 0.5 * r4 * w4 * w4 * Math.sin(t4);

    const I_G2 = (1/12) * m2 * r2 * r2;
    const I_D = (1/3) * m4 * r4 * r4;

    const M_mat = [];
    const P_vec = [];
    for (let r = 0; r < 9; r++) M_mat[r] = new Array(9).fill(0);

    M_mat[0][0] = 1; M_mat[0][2] = -1; P_vec[0] = m1 * axG1;
    M_mat[1][1] = 1; M_mat[1][3] = -1; P_vec[1] = m1 * (ayG1 + g);
    M_mat[2][8] = 1; M_mat[2][2] = r1 * Math.sin(t1); M_mat[2][3] = -r1 * Math.cos(t1); P_vec[2] = m1 * g * 0.5 * r1 * Math.cos(t1);
    
    M_mat[3][2] = 1; M_mat[3][4] = -1; P_vec[3] = m2 * axG2;
    M_mat[4][3] = 1; M_mat[4][5] = -1; P_vec[4] = m2 * (ayG2 + g);
    M_mat[5][2] = -0.5 * r2 * Math.sin(t2); M_mat[5][3] = 0.5 * r2 * Math.cos(t2);
    M_mat[5][4] = -0.5 * r2 * Math.sin(t2); M_mat[5][5] = 0.5 * r2 * Math.cos(t2); P_vec[5] = I_G2 * a2;

    M_mat[6][4] = 1; M_mat[6][6] = 1; P_vec[6] = m4 * axG4;
    M_mat[7][5] = 1; M_mat[7][7] = 1; P_vec[7] = m4 * (ayG4 + g);
    M_mat[8][4] = -r4 * Math.sin(t4); M_mat[8][5] = r4 * Math.cos(t4); P_vec[8] = I_D * a4 + m4 * g * 0.5 * r4 * Math.cos(t4);

    const solverResult = Matrix.solveNumeric(M_mat, P_vec);
    let forces = null;
    if (solverResult.success) {
      forces = {
        Ox: solverResult.solution[0], Oy: solverResult.solution[1],
        Ax: solverResult.solution[2], Ay: solverResult.solution[3],
        Bx: solverResult.solution[4], By: solverResult.solution[5],
        Dx: solverResult.solution[6], Dy: solverResult.solution[7],
        M: solverResult.solution[8]
      };
    }

    return { success: true, xA, yA, xB, yB, xD, yD, t1, t2, t4, t2Deg: t2*180/Math.PI, t4Deg: t4*180/Math.PI, w2, w4, a2, a4, CIR, forces };
  };

  const trajectory = [];
  let isAnyLock = false;
  for (let i = 0; i < 120; i++) {
    const t1 = (i / 120) * 2 * Math.PI;
    const stepRes = solveKinematicsSingle(t1);
    if (!stepRes.success) isAnyLock = true;
    trajectory.push({ crankAngle: t1, crankAngleDeg: t1 * 180 / Math.PI, ...stepRes });
  }

  const t1_active = activeTheta1Deg * Math.PI / 180;
  const activeRes = solveKinematicsSingle(t1_active);

  if (!activeRes.success) {
    return { success: false, error: `Montagem impossível em $\\theta_1 = ${activeTheta1Deg}^\\circ$.` };
  }

  const res = [
    "### 1. Equações de Posição",
    `$$\\theta_2 = ${activeRes.t2Deg.toFixed(2)}^\\circ\\text{, }\\theta_4 = ${activeRes.t4Deg.toFixed(2)}^\\circ$$`,
    "### 2. Velocidades e Centro Instantâneo de Rotação (C.I.R.)",
    "O C.I.R. da barra acopladora $AB$ localiza-se na interseção dos prolongamentos das barras de suporte rotativo $OA$ e $DB$:",
    activeRes.CIR ? `$$x_{CIR} = ${activeRes.CIR.x.toFixed(4)}\\text{ m, } y_{CIR} = ${activeRes.CIR.y.toFixed(4)}\\text{ m}$$` : "$$C.I.R.\\text{ no infinito (translação pura).}$$"
  ];

  return {
    success: true,
    type: "quatro_barras",
    results: { ...activeRes, isAnyLock },
    trajectory,
    resolutionMarkdown: res.join("\n")
  };
}

// 3. Slider-Crank (Biela-Manivela) Solver
function solveBielaManivela(state) {
  const r1 = parseFloat(state.r1) || 0.05;
  const r2 = parseFloat(state.r2) || 0.18;
  const m1 = parseFloat(state.m1) || 0.5;
  const m2 = parseFloat(state.m2) || 1.5;
  const mp = parseFloat(state.mp) || 0.82;
  const w1 = parseFloat(state.w1) || 314.16;
  const activeTheta1Deg = parseFloat(state.theta1) || 90;
  const g = 9.81;

  const solveKinematicsSingle = (t1) => {
    const xA = r1 * Math.cos(t1);
    const yA = r1 * Math.sin(t1);
    const sin_t2 = -yA / r2;
    if (Math.abs(sin_t2) > 1.0) return { success: false };

    const t2 = Math.asin(sin_t2);
    const xB = xA + r2 * Math.cos(t2);

    if (Math.abs(Math.cos(t2)) < 1e-6) return { success: false, lockingPoint: true };
    const w2 = -w1 * (r1 * Math.cos(t1)) / (r2 * Math.cos(t2));
    const vB = -r1 * w1 * Math.sin(t1) - r2 * w2 * Math.sin(t2);

    const a2 = (r1 * w1 * w1 * Math.sin(t1) + r2 * w2 * w2 * Math.sin(t2)) / (r2 * Math.cos(t2));
    const aB = -r1 * w1 * w1 * Math.cos(t1) - r2 * a2 * Math.sin(t2) - r2 * w2 * w2 * Math.cos(t2);

    let CIR = null;
    if (Math.abs(Math.cos(t1)) > 1e-5) {
      CIR = { x: xB, y: xB * Math.sin(t1) / Math.cos(t1) };
    }

    const axG1 = -0.5 * r1 * w1 * w1 * Math.cos(t1);
    const ayG1 = -0.5 * r1 * w1 * w1 * Math.sin(t1);
    const axG2 = -r1 * w1 * w1 * Math.cos(t1) - 0.5 * r2 * a2 * Math.sin(t2) - 0.5 * r2 * w2 * w2 * Math.cos(t2);
    const ayG2 = -r1 * w1 * w1 * Math.sin(t1) + 0.5 * r2 * a2 * Math.cos(t2) - 0.5 * r2 * w2 * w2 * Math.sin(t2);
    const I_G2 = (1/12) * m2 * r2 * r2;

    const M_mat = [];
    const P_vec = [];
    for (let r = 0; r < 8; r++) M_mat[r] = new Array(8).fill(0);

    M_mat[0][0] = 1; M_mat[0][2] = -1; P_vec[0] = m1 * axG1;
    M_mat[1][1] = 1; M_mat[1][3] = -1; P_vec[1] = m1 * (ayG1 + g);
    M_mat[2][7] = 1; M_mat[2][2] = r1 * Math.sin(t1); M_mat[2][3] = -r1 * Math.cos(t1); P_vec[2] = m1 * g * 0.5 * r1 * Math.cos(t1);

    M_mat[3][2] = 1; M_mat[3][4] = -1; P_vec[3] = m2 * axG2;
    M_mat[4][3] = 1; M_mat[4][5] = -1; P_vec[4] = m2 * (ayG2 + g);
    M_mat[5][2] = -0.5 * r2 * Math.sin(t2); M_mat[5][3] = 0.5 * r2 * Math.cos(t2);
    M_mat[5][4] = -0.5 * r2 * Math.sin(t2); M_mat[5][5] = 0.5 * r2 * Math.cos(t2); P_vec[5] = I_G2 * a2;

    M_mat[6][4] = 1; P_vec[6] = mp * aB;
    M_mat[7][5] = 1; M_mat[7][6] = 1; P_vec[7] = mp * g;

    const solverResult = Matrix.solveNumeric(M_mat, P_vec);
    let forces = null;
    if (solverResult.success) {
      forces = {
        Ox: solverResult.solution[0], Oy: solverResult.solution[1],
        Ax: solverResult.solution[2], Ay: solverResult.solution[3],
        Bx: solverResult.solution[4], By: solverResult.solution[5],
        N: solverResult.solution[6], M: solverResult.solution[7]
      };
    }

    return { success: true, xA, yA, xB, yB: 0, t1, t2, t2Deg: t2*180/Math.PI, w2, vB, a2, aB, CIR, forces };
  };

  const trajectory = [];
  let isAnyLock = false;
  for (let i = 0; i < 120; i++) {
    const t1 = (i / 120) * 2 * Math.PI;
    const stepRes = solveKinematicsSingle(t1);
    if (!stepRes.success) isAnyLock = true;
    trajectory.push({ crankAngle: t1, crankAngleDeg: t1 * 180 / Math.PI, ...stepRes });
  }

  const t1_active = activeTheta1Deg * Math.PI / 180;
  const activeRes = solveKinematicsSingle(t1_active);

  if (!activeRes.success) return { success: false, error: "Biela-Manivela travada nesta posição." };

  const res = [
    "### 1. Posições e Restrição do Curso",
    `$$x_B = ${activeRes.xB.toFixed(4)}\\text{ m, } \\theta_2 = ${activeRes.t2Deg.toFixed(2)}^\\circ$$`,
    "### 2. Velocidades e Centro Instantâneo de Rotação (C.I.R.)",
    "O C.I.R. da biela $AB$ localiza-se na interseção da reta suporte $OA$ com a perpendicular ao movimento do pistão $B$ (reta vertical):",
    activeRes.CIR ? `$$x_{CIR} = ${activeRes.CIR.x.toFixed(4)}\\text{ m, } y_{CIR} = ${activeRes.CIR.y.toFixed(4)}\\text{ m}$$` : "$$C.I.R.\\text{ no infinito.}$$"
  ];

  return {
    success: true,
    type: "biela_manivela",
    results: { ...activeRes, isAnyLock },
    trajectory,
    resolutionMarkdown: res.join("\n")
  };
}

// 4. Sliding Rod (Barra Deslizante) Solver with CIR
function solveBarraDeslizante(state) {
  const L = parseFloat(state.L) || 2.0;       // Rod length (m)
  const thetaDeg = parseFloat(state.theta) || 60; // Angle with floor (degrees)
  const w = parseFloat(state.w) || 1.5;        // Constant angular velocity (rad/s)
  const m = parseFloat(state.m) || 3.0;        // Mass (kg)
  const g = 9.81;

  const t = thetaDeg * Math.PI / 180;

  // A is on horizontal floor (x_A, 0)
  // B is on vertical wall (0, y_B)
  const xA = L * Math.cos(t);
  const yA = 0;
  const xB = 0;
  const yB = L * Math.sin(t);

  // Kinematics:
  // vA = -L * w * sin(theta)
  // vB = L * w * cos(theta)
  const vA = -L * w * Math.sin(t);
  const vB = L * w * Math.cos(t);

  // Accelerations (assuming alpha = 0 for constant angular velocity)
  // aA = -L * w^2 * cos(theta)
  // aB = -L * w^2 * sin(theta)
  const aA = -L * w * w * Math.cos(t);
  const aB = -L * w * w * Math.sin(t);

  // Center of mass G coordinates and acceleration
  const xG = 0.5 * xA;
  const yG = 0.5 * yB;
  const axG = -0.5 * L * w * w * Math.cos(t);
  const ayG = -0.5 * L * w * w * Math.sin(t);

  // CIR coordinates: (xA, yB)
  const CIR = { x: xA, y: yB };

  // Dynamics (Newton-Euler):
  // Normal force from wall NA (horizontal, acts at B)
  // Normal force from floor NB (vertical, acts at A)
  // Let's write equilibrium:
  // NA = m * axG
  // NB - m*g = m * ayG => NB = m*(ayG + g)
  const NA = m * axG;
  const NB = m * (ayG + g);

  // Required torque or force to maintain motion is not solved since it is a free sliding bar,
  // but we can compute support reactions.

  // Trajectory: sweep theta from 90 to 0 degrees to see the evolution
  const trajectory = [];
  for (let i = 0; i <= 90; i++) {
    const ang = i * Math.PI / 180;
    const vA_step = -L * w * Math.sin(ang);
    const vB_step = L * w * Math.cos(ang);
    trajectory.push({
      crankAngle: ang,
      crankAngleDeg: i,
      success: true,
      vA: vA_step,
      vB: vB_step
    });
  }

  const res = [
    "### 1. Equações de Restrição Cinemática",
    "Considere o ponto $A(x_A, 0)$ no solo e $B(0, y_B)$ na parede vertical. O comprimento do degrau/barra rígida é constante:",
    "$$x_A^2 + y_B^2 = L^2$$",
    "Pode exprimir-se as posições em função do ângulo angular $\\theta$:",
    `$$x_A = L \\cos\\theta = ${xA.toFixed(3)}\\text{ m}$$`,
    `$$y_B = L \\sin\\theta = ${yB.toFixed(3)}\\text{ m}$$`,
    "### 2. Velocidades e Centro Instantâneo de Rotação (C.I.R.)",
    "A velocidade do ponto $A$ é estritamente horizontal (solo), logo a perpendicular passa na vertical por $A$ ($x = x_A$).",
    "A velocidade de $B$ é estritamente vertical (parede), logo a perpendicular passa na horizontal por $B$ ($y = y_B$).",
    "O C.I.R. localiza-se na interseção destas perpendiculares:",
    `$$x_{CIR} = x_A = ${CIR.x.toFixed(3)}\\text{ m, } y_{CIR} = y_B = ${CIR.y.toFixed(3)}\\text{ m}$$`,
    "As velocidades lineares são relacionadas pela rotação instantânea em torno do C.I.R.:",
    `$$v_A = -\\omega \\cdot (y_{CIR}) = -(${w})(${yB.toFixed(3)}) = ${vA.toFixed(3)}\\text{ m/s}$$`,
    `$$v_B = \\omega \\cdot (x_{CIR}) = (${w})(${xA.toFixed(3)}) = ${vB.toFixed(3)}\\text{ m/s}$$`,
    "### 3. Dinâmica e Forças nos Apoios (Newton-Euler)",
    "O centro de massa G acelera a:",
    `$$a_{G,x} = ${axG.toFixed(3)}\\text{ m/s}^2\\text{, } a_{G,y} = ${ayG.toFixed(3)}\\text{ m/s}^2$$`,
    `As forças normais nos apoios da parede ($N_A$) e do solo ($N_B$) são:`,
    `$$N_A = m \\cdot a_{G,x} = ${NA.toFixed(2)}\\text{ N}$$`,
    `$$N_B = m \\cdot (a_{G,y} + g) = ${NB.toFixed(2)}\\text{ N}$$`
  ];

  return {
    success: true,
    type: "barra_deslizante",
    results: { xA, yA, xB, yB, vA, vB, aA, aB, xG, yG, axG, ayG, CIR, NA, NB, theta: thetaDeg, w, L, m },
    trajectory,
    resolutionMarkdown: res.join("\n")
  };
}

// 5. Rolling Disk (Disco Rolante) Solver with CIR
function solveDiscoRolante(state) {
  const R = parseFloat(state.R) || 0.4;         // Radius (m)
  const vG = parseFloat(state.vG) || 2.0;       // Center velocity (m/s)
  const aG = parseFloat(state.aG) || 1.0;       // Center acceleration (m/s^2)
  const rP = parseFloat(state.rP) || 0.4;       // Radius of point P (m)
  const thetaPDeg = parseFloat(state.thetaP) || 45; // Angle of point P (degrees)
  const m = parseFloat(state.m) || 10.0;       // Mass of wheel (kg)
  const g = 9.81;

  const tP = thetaPDeg * Math.PI / 180;

  // Rolling without slipping:
  // w = vG / R (clockwise if vG > 0)
  // alpha = aG / R
  const w = vG / R;
  const alpha = aG / R;

  // Contact point C is the CIR (0, 0)
  // Center G is at (0, R)
  // Position of point P relative to G:
  const xP_rel = rP * Math.cos(tP);
  const yP_rel = rP * Math.sin(tP);
  
  const xP = xP_rel;
  const yP = R + yP_rel;

  // Velocity of P: vP = vG + w x r_P/G
  // vP_x = vG - w * yP_rel
  // vP_y = w * xP_rel
  const vPx = vG - w * yP_rel;
  const vPy = w * xP_rel;
  const vP = Math.sqrt(vPx*vPx + vPy*vPy);

  // Acceleration of P: aP = aG + alpha x r_P/G - w^2 * r_P/G
  // aP_x = aG - alpha * yP_rel - w^2 * xP_rel
  // aP_y = alpha * xP_rel - w^2 * yP_rel
  const aPx = aG - alpha * yP_rel - w*w * xP_rel;
  const aPy = alpha * xP_rel - w*w * yP_rel;
  const aP = Math.sqrt(aPx*aPx + aPy*aPy);

  // Acceleration of contact point C (CIR)
  // aC = aG + alpha x r_C/G - w^2 * r_C/G
  // Since r_C/G = (0, -R), aC = (aG - alpha*(-R), -w^2*(-R)) = (0, w^2 * R)
  const aCx = 0;
  const aCy = w * w * R;

  // Trajectory: sweep thetaP from 0 to 360 to plot point P velocity
  const trajectory = [];
  for (let i = 0; i <= 360; i += 5) {
    const ang = i * Math.PI / 180;
    const vPx_step = vG - w * rP * Math.sin(ang);
    const vPy_step = w * rP * Math.cos(ang);
    trajectory.push({
      crankAngle: ang,
      crankAngleDeg: i,
      success: true,
      vB: Math.sqrt(vPx_step*vPx_step + vPy_step*vPy_step) // map to vB to reuse chart
    });
  }

  const res = [
    "### 1. Condição de Rolamento sem Escorregamento",
    "Num disco que rola sem escorregar sobre uma superfície plana, o ponto de contacto instantâneo com o solo $C$ tem velocidade linear nula ($v_C = 0$).",
    "Isto identifica o ponto de contacto $C$ como o **Centro Instantâneo de Rotação (C.I.R.)** do disco.",
    "A velocidade angular $\\omega$ e a aceleração angular $\\alpha$ do disco relacionam-se diretamente com o centro $G$:",
    `$$\\omega = \\frac{v_G}{R} = \\frac{${vG}}{${R}} = ${w.toFixed(3)}\\text{ rad/s}$$`,
    `$$\\alpha = \\frac{a_G}{R} = \\frac{${aG}}{${R}} = ${alpha.toFixed(3)}\\text{ rad/s}^2$$`,
    "### 2. Cinemática do Ponto de Contacto (C.I.R.)",
    "Apesar do C.I.R. ter velocidade nula ($v_C = 0$), a sua aceleração **não é nula**! O ponto de contacto possui aceleração puramente vertical (normal) direcionada ao centro:",
    `$$a_C = \\omega^2 R = (${w.toFixed(3)})^2 (${R}) = ${aCy.toFixed(3)}\\text{ m/s}^2$$`,
    "### 3. Velocidade e Aceleração de um Ponto Genérico $P$",
    "A posição de $P$ em relação ao centro $G$ é:",
    `$$x_{P/G} = r_P \\cos\\theta_P = ${xP_rel.toFixed(3)}\\text{ m, } y_{P/G} = r_P \\sin\\theta_P = ${yP_rel.toFixed(3)}\\text{ m}$$`,
    "Usando a cinemática relativa:",
    `$$\\vec{v}_P = \\vec{v}_G + \\vec{\\omega} \\times \\vec{r}_{P/G} = (${vPx.toFixed(3)}\\vec{i} + ${vPy.toFixed(3)}\\vec{j})\\text{ m/s}$$`,
    `$$v_P = ${vP.toFixed(3)}\\text{ m/s}$$`,
    `$$\\vec{a}_P = \\vec{a}_G + \\vec{\\alpha} \\times \\vec{r}_{P/G} - \\omega^2 \\vec{r}_{P/G} = (${aPx.toFixed(3)}\\vec{i} + ${aPy.toFixed(3)}\\vec{j})\\text{ m/s}^2$$`,
    `$$a_P = ${aP.toFixed(3)}\\text{ m/s}^2$$`
  ];

  return {
    success: true,
    type: "disco_rolante",
    results: { R, vG, aG, rP, thetaP: thetaPDeg, w, alpha, xP, yP, vPx, vPy, vP, aPx, aPy, aP, aCx, aCy, m },
    trajectory,
    resolutionMarkdown: res.join("\n")
  };
}
