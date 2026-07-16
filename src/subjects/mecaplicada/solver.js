// Physics solver for Mecânica Aplicada (Applied Mechanics)
// Solves 1-DOF Mechanical Vibrations and 4-Bar Mechanism Kinematics/Dynamics

import { Matrix, exprFormatNumber, floatToFractionLaTeX } from '../../core/math.js';

export function solveMecAplicada(state) {
  const type = state.type || "vibracoes";

  if (type === "vibracoes") {
    return solveVibracoes(state);
  } else if (type === "quatro_barras") {
    return solveQuatroBarras(state);
  }

  return { success: false, error: "Tipo de exercício inválido." };
}

// 1. Mechanical Vibrations Solver
function solveVibracoes(state) {
  // Inputs
  const L = parseFloat(state.barLength) || 2.0; // Bar length (m)
  const m_bar = parseFloat(state.barMass) || 5.0; // Bar mass (kg)
  const d_O = parseFloat(state.pivotX) || 0.5; // Pivot position from left end A (m)
  
  const springs = state.springs || []; // { id, x, k }
  const dampers = state.dampers || []; // { id, x, c }
  const masses = state.masses || [];   // { id, x, m }
  
  const force = state.force || { x: 2.0, F0: 0.0, w: 0.0, type: 'sin' };
  const x0_deg = parseFloat(state.x0) || 5.0; // Initial angle (degrees)
  const v0 = parseFloat(state.v0) || 0.0;    // Initial angular velocity (rad/s)
  
  const x0 = x0_deg * Math.PI / 180; // convert to radians
  const g = 9.81;

  // 1. Equivalent Inertia about pivot O
  // homogeneous bar: I_bar = (1/12)*m*L^2 + m*(L/2 - d_O)^2
  const I_bar = (1/12) * m_bar * L * L + m_bar * Math.pow((L/2) - d_O, 2);
  let I_masses = 0;
  masses.forEach(m => {
    I_masses += m.m * Math.pow(m.x - d_O, 2);
  });
  const I_eq = I_bar + I_masses;

  // 2. Equivalent Stiffness (Springs about O)
  let k_eq = 0;
  springs.forEach(s => {
    k_eq += s.k * Math.pow(s.x - d_O, 2);
  });

  // 3. Equivalent Damping (Dampers about O)
  let c_eq = 0;
  dampers.forEach(d => {
    c_eq += d.c * Math.pow(d.x - d_O, 2);
  });

  // 4. Force moment amplitude about O
  const M_0 = (force.F0 || 0) * (force.x - d_O);
  const w_f = force.w || 0;

  // Damping characteristics
  if (I_eq <= 0) {
    return { success: false, error: "A inércia equivalente do sistema deve ser maior que zero." };
  }
  if (k_eq <= 0) {
    return { success: false, error: "A rigidez equivalente do sistema deve ser maior que zero (adicione pelo menos uma mola)." };
  }

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

  // Steady-state response calculations (forced vibration)
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

  // Analytical complete response calculation theta(t)
  // theta(t) = theta_h(t) + theta_p(t)
  const trajectory = [];
  const t_max = 8.0;
  const steps = 400;
  const dt = t_max / steps;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    
    // Particular solution theta_p(t) and its derivative
    let theta_p = 0;
    let dtheta_p = 0;
    if (M_0 !== 0 && w_f > 0) {
      if (force.type === 'sin') {
        theta_p = Theta_ss * Math.sin(w_f * t - phi);
        dtheta_p = Theta_ss * w_f * Math.cos(w_f * t - phi);
      } else {
        theta_p = Theta_ss * Math.cos(w_f * t - phi);
        dtheta_p = -Theta_ss * w_f * Math.sin(w_f * t - phi);
      }
    }

    // Initial conditions for homogeneous solution
    let theta_h0 = x0;
    let dtheta_h0 = v0;
    if (M_0 !== 0 && w_f > 0) {
      // theta_h0 = theta(0) - theta_p(0)
      // dtheta_h0 = v(0) - dtheta_p(0)
      let theta_p0 = 0;
      let dtheta_p0 = 0;
      if (force.type === 'sin') {
        theta_p0 = Theta_ss * Math.sin(-phi);
        dtheta_p0 = Theta_ss * w_f * Math.cos(-phi);
      } else {
        theta_p0 = Theta_ss * Math.cos(-phi);
        dtheta_p0 = -Theta_ss * w_f * Math.sin(-phi);
      }
      theta_h0 = x0 - theta_p0;
      dtheta_h0 = v0 - dtheta_p0;
    }

    // Homogeneous response theta_h(t)
    let theta_h = 0;
    if (c_eq === 0 || zeta === 0) {
      // Undamped
      theta_h = theta_h0 * Math.cos(w_n * t) + (dtheta_h0 / w_n) * Math.sin(w_n * t);
    } else if (zeta < 1) {
      // Underdamped
      const A_h = theta_h0;
      const B_h = (dtheta_h0 + zeta * w_n * theta_h0) / w_d;
      theta_h = Math.exp(-zeta * w_n * t) * (A_h * Math.cos(w_d * t) + B_h * Math.sin(w_d * t));
    } else if (Math.abs(zeta - 1) < 1e-4) {
      // Critically damped
      const A_h = theta_h0;
      const B_h = dtheta_h0 + w_n * theta_h0;
      theta_h = Math.exp(-w_n * t) * (A_h + B_h * t);
    } else {
      // Overdamped
      const s1 = -zeta * w_n + w_n * Math.sqrt(zeta * zeta - 1);
      const s2 = -zeta * w_n - w_n * Math.sqrt(zeta * zeta - 1);
      const C1 = (dtheta_h0 - s2 * theta_h0) / (s1 - s2);
      const C2 = (s1 * theta_h0 - dtheta_h0) / (s1 - s2);
      theta_h = C1 * Math.exp(s1 * t) + C2 * Math.exp(s2 * t);
    }

    const total_theta = theta_h + theta_p;
    trajectory.push({
      time: t,
      theta: total_theta,
      thetaDeg: total_theta * 180 / Math.PI,
      theta_h: theta_h,
      theta_p: theta_p
    });
  }

  // Create Step-by-Step LaTeX lines
  const res = [];
  res.push("### 1. Modelo Físico e Equação de Equilíbrio Dinâmico");
  res.push("Aplicando a equação do momento angular em torno do ponto de apoio fixo $O$ (sentido positivo direto anti-horário):");
  res.push("$$\\sum M_O = I_{eq} \\ddot{\\theta}$$");
  
  res.push("As forças que geram momentos em relação ao apoio $O$ são a rigidez das molas, o amortecimento dos pistões e a força de excitação externa. Para pequenas oscilações ($\\sin\\theta \\approx \\theta$):");
  res.push("$$\\sum M_O = - \\sum k_i (x_{k,i} - d_O)^2 \\theta - \\sum c_j (x_{c,j} - d_O)^2 \\dot{\\theta} + F(t) (x_F - d_O) = I_{eq} \\ddot{\\theta}$$");
  res.push("Rearranjando os termos na forma canónica linear de 1 G.D.L.:");
  res.push("$$I_{eq} \\ddot{\\theta} + c_{eq} \\dot{\\theta} + k_{eq} \\theta = M_{eq}(t)$$");

  res.push("### 2. Cálculo dos Parâmetros Equivalentes");
  res.push(`- **Inércia Equivalente ($I_{eq}$)**:`);
  res.push(`  $$I_{bar} = \\frac{1}{12} m_{bar} L^2 + m_{bar} \\left(\\frac{L}{2} - d_O\\right)^2 = \\frac{1}{12} (${m_bar}) (${L})^2 + ${m_bar} \\left(${L/2} - ${d_O}\\right)^2 = ${I_bar.toFixed(4)}\\text{ kg}\\cdot\\text{m}^2$$`);
  
  if (masses.length > 0) {
    let massTerms = masses.map(m => `${m.m}(${m.x} - ${d_O})^2`).join(" + ");
    res.push(`  $$I_{masses} = \\sum m_i (x_i - d_O)^2 = ${massTerms} = ${I_masses.toFixed(4)}\\text{ kg}\\cdot\\text{m}^2$$`);
  }
  res.push(`  $$I_{eq} = I_{bar} + I_{masses} = ${I_eq.toFixed(4)}\\text{ kg}\\cdot\\text{m}^2$$`);

  res.push(`- **Rigidez Equivalente ($k_{eq}$)**:`);
  if (springs.length > 0) {
    let springTerms = springs.map(s => `${s.k}(${s.x} - ${d_O})^2`).join(" + ");
    res.push(`  $$k_{eq} = \\sum k_i (x_{k,i} - d_O)^2 = ${springTerms} = ${k_eq.toFixed(2)}\\text{ N}\\cdot\\text{m/rad}$$`);
  } else {
    res.push(`  $$k_{eq} = 0\\text{ (Nenhuma mola ligada - sistema instável)}$$`);
  }

  res.push(`- **Amortecimento Equivalente ($c_{eq}$)**:`);
  if (dampers.length > 0) {
    let damperTerms = dampers.map(d => `${d.c}(${d.x} - ${d_O})^2`).join(" + ");
    res.push(`  $$c_{eq} = \\sum c_i (x_{c,i} - d_O)^2 = ${damperTerms} = ${c_eq.toFixed(2)}\\text{ N}\\cdot\\text{m}\\cdot\\text{s/rad}$$`);
  } else {
    res.push(`  $$c_{eq} = 0\\text{ (Sistema não amortecido)}$$`);
  }

  if (M_0 !== 0) {
    res.push(`- **Momento de Excitação Externo ($M_{eq}(t)$)**:`);
    res.push(`  $$M_0 = F_0 (x_F - d_O) = ${force.F0} (${force.x} - ${d_O}) = ${M_0.toFixed(2)}\\text{ N}\\cdot\\text{m}$$`);
    res.push(`  $$M_{eq}(t) = ${M_0.toFixed(2)} \\text{${force.type === 'sin' ? 'sin' : 'cos'}}(${w_f}\\text{ }t)\\text{ N}\\cdot\\text{m}$$`);
  }

  res.push("### 3. Propriedades Dinâmicas do Sistema");
  res.push(`- **Frequência Natural Angular ($\\omega_n$)**:`);
  res.push(`  $$\\omega_n = \\sqrt{\\frac{k_{eq}}{I_{eq}}} = \\sqrt{\\frac{${k_eq.toFixed(2)}}{${I_eq.toFixed(4)}}} = ${w_n.toFixed(4)}\\text{ rad/s}$$`);
  res.push(`  $$f_n = \\frac{\\omega_n}{2\\pi} = ${f_n.toFixed(4)}\\text{ Hz}$$`);

  res.push(`- **Amortecimento Crítico ($c_{crit}$)**:`);
  res.push(`  $$c_{crit} = 2 I_{eq} \\omega_n = 2 (${I_eq.toFixed(4)}) (${w_n.toFixed(4)}) = ${c_crit.toFixed(4)}\\text{ N}\\cdot\\text{m}\\cdot\\text{s/rad}$$`);

  res.push(`- **Fator de Amortecimento ($\\zeta$)**:`);
  res.push(`  $$\\zeta = \\frac{c_{eq}}{c_{crit}} = \\frac{${c_eq.toFixed(2)}}{${c_crit.toFixed(4)}} = ${zeta.toFixed(4)}$$`);
  res.push(`  Classificação: **${dampingType}**`);

  if (zeta > 0 && zeta < 1) {
    res.push(`- **Frequência Amortecida ($\\omega_d$)**:`);
    res.push(`  $$\\omega_d = \\omega_n \\sqrt{1 - \\zeta^2} = ${w_n.toFixed(4)} \\sqrt{1 - ${zeta.toFixed(4)}^2} = ${w_d.toFixed(4)}\\text{ rad/s}$$`);
    res.push(`  $$f_d = \\frac{\\omega_d}{2\\pi} = ${(w_d / (2 * Math.PI)).toFixed(4)}\\text{ Hz}$$`);
  }

  if (M_0 !== 0 && w_f > 0) {
    res.push("### 4. Resposta em Regime Permanente (Forçada)");
    res.push(`- **Razão de Frequências ($r$)**: $r = \\frac{\\omega_f}{\\omega_n} = \\frac{${w_f.toFixed(2)}}{${w_n.toFixed(4)}} = ${r.toFixed(4)}$`);
    res.push(`- **Fator de Amplificação Dinâmica ($M_f$)**:`);
    res.push(`  $$M_f = \\frac{1}{\\sqrt{(1 - r^2)^2 + (2 \\zeta r)^2}} = \\frac{1}{\\sqrt{(1 - ${r.toFixed(4)}^2)^2 + (2 \\cdot ${zeta.toFixed(4)} \\cdot ${r.toFixed(4)})^2}} = ${M_f.toFixed(4)}$$`);
    res.push(`- **Amplitude de Regime Permanente ($\\Theta_{ss}$)**:`);
    res.push(`  $$\\Theta_{ss} = \\frac{M_0}{k_{eq}} M_f = \\frac{${M_0.toFixed(2)}}{${k_eq.toFixed(2)}} (${M_f.toFixed(4)}) = ${Theta_ss.toFixed(6)}\\text{ rad} = ${(Theta_ss * 180 / Math.PI).toFixed(4)}^\\circ$$`);
    res.push(`- **Ângulo de Desfasamento ($\\phi$)**:`);
    res.push(`  $$\\phi = \\arctan\\left(\\frac{2\\zeta r}{1 - r^2}\\right) = \\arctan\\left(\\frac{2 \\cdot ${zeta.toFixed(4)} \\cdot ${r.toFixed(4)}}{1 - ${r.toFixed(4)}^2}\\right) = ${phi.toFixed(4)}\\text{ rad} = ${(phi * 180 / Math.PI).toFixed(2)}^\\circ$$`);
  }

  res.push("### 5. Resolução da Resposta Completa");
  res.push("A resposta completa é a sobreposição da resposta livre transitória $\\theta_h(t)$ com a resposta forçada estacionária $\\theta_p(t)$:");
  res.push("$$\\theta(t) = \\theta_h(t) + \\theta_p(t)$$");
  res.push(`Condições Iniciais: $\\theta(0) = ${x0_deg.toFixed(1)}^\\circ = ${x0.toFixed(4)}\\text{ rad}$, $\\dot{\\theta}(0) = ${v0.toFixed(2)}\\text{ rad/s}$.`);

  return {
    success: true,
    type: "vibracoes",
    results: {
      I_eq,
      I_bar,
      I_masses,
      k_eq,
      c_eq,
      M_0,
      w_n,
      f_n,
      c_crit,
      zeta,
      dampingType,
      w_d,
      Theta_ss,
      Theta_ss_deg: Theta_ss * 180 / Math.PI,
      phi,
      phi_deg: phi * 180 / Math.PI,
      r,
      M_f
    },
    trajectory: trajectory,
    resolutionMarkdown: res.join("\n")
  };
}

// 2. 4-Bar Mechanism Kinematics and Dynamics Solver
function solveQuatroBarras(state) {
  // Inputs
  const r1 = parseFloat(state.r1) || 0.1; // Crank OA (m)
  const r2 = parseFloat(state.r2) || 0.3; // Coupler AB (m)
  const r3 = parseFloat(state.r3) || 0.3; // Ground OD (m)
  const r4 = parseFloat(state.r4) || 0.2; // Follower DB (m)
  
  const m1 = parseFloat(state.m1) || 0.5; // Crank mass (kg)
  const m2 = parseFloat(state.m2) || 1.5; // Coupler mass (kg)
  const m4 = parseFloat(state.m4) || 1.0; // Follower mass (kg)
  
  const w1 = parseFloat(state.w1) || 2.0; // Crank constant speed (rad/s)
  const mode = state.assemblyMode || "open"; // open or crossed
  const activeTheta1Deg = parseFloat(state.theta1) || 45; // Selected angle for detail calculations (degrees)
  
  const g = 9.81;

  // Function to solve kinematics for a single angle theta1 (in radians)
  const solveKinematicsSingle = (t1) => {
    // Crank pin position A
    const xA = r1 * Math.cos(t1);
    const yA = r1 * Math.sin(t1);
    
    // Distance from A to D (D is at (r3, 0))
    const xD = r3;
    const yD = 0;
    const d = Math.sqrt(Math.pow(xD - xA, 2) + Math.pow(yD - yA, 2));
    
    // Check assembly condition
    if (d > r2 + r4 || d < Math.abs(r2 - r4)) {
      return { success: false };
    }
    
    // Geometric vector angle from A to D
    const gamma = Math.atan2(yD - yA, xD - xA);
    
    // Internal angle alpha_A inside triangle ABD
    const cos_alpha = (r2 * r2 + d * d - r4 * r4) / (2 * r2 * d);
    const alpha_A = Math.acos(Math.max(-1, Math.min(1, cos_alpha)));
    
    // Assemble mode
    let t2 = 0;
    if (mode === "open") {
      t2 = gamma - alpha_A;
    } else {
      t2 = gamma + alpha_A;
    }
    
    // Position of B
    const xB = xA + r2 * Math.cos(t2);
    const yB = yA + r2 * Math.sin(t2);
    
    // Angle of vector DB (D to B)
    const t4 = Math.atan2(yB - yD, xB - xD);
    
    // Angular velocities w2, w4
    const det = r2 * r4 * Math.sin(t2 - t4);
    if (Math.abs(det) < 1e-6) {
      return { success: false, lockingPoint: true };
    }
    
    const w2 = (r1 * w1 * Math.sin(t4 - t1)) / (r2 * Math.sin(t2 - t4));
    const w4 = (r1 * w1 * Math.sin(t2 - t1)) / (r4 * Math.sin(t2 - t4));
    
    // Angular accelerations a2, a4 (assuming constant speed w1, so alpha1 = 0)
    const A_acc = r1 * w1 * w1 * Math.cos(t1) + r2 * w2 * w2 * Math.cos(t2) - r4 * w4 * w4 * Math.cos(t4);
    const B_acc = r1 * w1 * w1 * Math.sin(t1) + r2 * w2 * w2 * Math.sin(t2) - r4 * w4 * w4 * Math.sin(t4);
    
    const a2 = (-A_acc * Math.cos(t4) + B_acc * Math.sin(t4)) / (r2 * Math.sin(t2 - t4));
    const a4 = (B_acc * Math.sin(t2) - A_acc * Math.cos(t2)) / (r4 * Math.sin(t2 - t4));

    // Linear accelerations of Centers of Mass (homogenous rods)
    // G1 (Crank):
    const axG1 = -0.5 * r1 * w1 * w1 * Math.cos(t1);
    const ayG1 = -0.5 * r1 * w1 * w1 * Math.sin(t1);
    
    // G2 (Coupler):
    const axG2 = -r1 * w1 * w1 * Math.cos(t1) - 0.5 * r2 * a2 * Math.sin(t2) - 0.5 * r2 * w2 * w2 * Math.cos(t2);
    const ayG2 = -r1 * w1 * w1 * Math.sin(t1) + 0.5 * r2 * a2 * Math.cos(t2) - 0.5 * r2 * w2 * w2 * Math.sin(t2);
    
    // G4 (Follower):
    const axG4 = -0.5 * r4 * a4 * Math.sin(t4) - 0.5 * r4 * w4 * w4 * Math.cos(t4);
    const ayG4 = 0.5 * r4 * a4 * Math.cos(t4) - 0.5 * r4 * w4 * w4 * Math.sin(t4);

    // Setup 9x9 matrix for Dynamic forces
    // Forces order in F vector: [Ox, Oy, Ax, Ay, Bx, By, Dx, Dy, M]
    // 9 equations of motion:
    // Link 1 (crank OA):
    // 1) Ox - Ax = m1 * axG1
    // 2) Oy - Ay = m1 * (ayG1 + g)
    // 3) M + Ax * r1 * sin(t1) - Ay * r1 * cos(t1) = m1 * g * (r1/2) * cos(t1)
    // Link 2 (coupler AB):
    // 4) Ax - Bx = m2 * axG2
    // 5) Ay - By = m2 * (ayG2 + g)
    // 6) -Ax * (r2/2)*sin(t2) + Ay * (r2/2)*cos(t2) - Bx * (r2/2)*sin(t2) + By * (r2/2)*cos(t2) = I_G2 * a2
    // Link 4 (follower DB):
    // 7) Bx + Dx = m4 * axG4
    // 8) By + Dy = m4 * (ayG4 + g)
    // 9) -Bx * r4 * sin(t4) + By * r4 * cos(t4) = I_D * a4 + m4 * g * (r4/2) * cos(t4)
    
    const I_G2 = (1/12) * m2 * r2 * r2;
    const I_D = (1/3) * m4 * r4 * r4;

    const M_mat = [];
    const P_vec = [];
    for (let r = 0; r < 9; r++) {
      M_mat[r] = new Array(9).fill(0);
    }

    // Eq 1: Ox - Ax = m1 * axG1
    M_mat[0][0] = 1;  // Ox
    M_mat[0][2] = -1; // Ax
    P_vec[0] = m1 * axG1;

    // Eq 2: Oy - Ay = m1*(ayG1 + g)
    M_mat[1][1] = 1;  // Oy
    M_mat[1][3] = -1; // Ay
    P_vec[1] = m1 * (ayG1 + g);

    // Eq 3: M + Ax*r1*sin(t1) - Ay*r1*cos(t1) = m1*g*(r1/2)*cos(t1)
    M_mat[2][8] = 1;  // M
    M_mat[2][2] = r1 * Math.sin(t1); // Ax
    M_mat[2][3] = -r1 * Math.cos(t1); // Ay
    P_vec[2] = m1 * g * 0.5 * r1 * Math.cos(t1);

    // Eq 4: Ax - Bx = m2 * axG2
    M_mat[3][2] = 1;  // Ax
    M_mat[3][4] = -1; // Bx
    P_vec[3] = m2 * axG2;

    // Eq 5: Ay - By = m2 * (ayG2 + g)
    M_mat[4][3] = 1;  // Ay
    M_mat[4][5] = -1; // By
    P_vec[4] = m2 * (ayG2 + g);

    // Eq 6: Moment G2
    M_mat[5][2] = -0.5 * r2 * Math.sin(t2); // Ax
    M_mat[5][3] = 0.5 * r2 * Math.cos(t2);  // Ay
    M_mat[5][4] = -0.5 * r2 * Math.sin(t2); // Bx
    M_mat[5][5] = 0.5 * r2 * Math.cos(t2);  // By
    P_vec[5] = I_G2 * a2;

    // Eq 7: Bx + Dx = m4 * axG4
    M_mat[6][4] = 1; // Bx
    M_mat[6][6] = 1; // Dx
    P_vec[6] = m4 * axG4;

    // Eq 8: By + Dy = m4 * (ayG4 + g)
    M_mat[7][5] = 1; // By
    M_mat[7][7] = 1; // Dy
    P_vec[7] = m4 * (ayG4 + g);

    // Eq 9: Moment D
    M_mat[8][4] = -r4 * Math.sin(t4); // Bx
    M_mat[8][5] = r4 * Math.cos(t4);  // By
    P_vec[8] = I_D * a4 + m4 * g * 0.5 * r4 * Math.cos(t4);

    const solverResult = Matrix.solveNumeric(M_mat, P_vec);
    let forces = null;
    if (solverResult.success) {
      const sol = solverResult.solution;
      forces = {
        Ox: sol[0], Oy: sol[1],
        Ax: sol[2], Ay: sol[3],
        Bx: sol[4], By: sol[5],
        Dx: sol[6], Dy: sol[7],
        M: sol[8]
      };
    }

    return {
      success: true,
      xA, yA, xB, yB, xD, yD,
      t1, t2, t4,
      t2Deg: t2 * 180 / Math.PI,
      t4Deg: t4 * 180 / Math.PI,
      w2, w4, a2, a4,
      forces
    };
  };

  // Generate full rotation cycle data for animation / plots (120 points)
  const trajectory = [];
  let isAnyLock = false;
  for (let i = 0; i < 120; i++) {
    const t1 = (i / 120) * 2 * Math.PI;
    const stepRes = solveKinematicsSingle(t1);
    if (!stepRes.success) {
      isAnyLock = true;
    }
    trajectory.push({
      crankAngle: t1,
      crankAngleDeg: t1 * 180 / Math.PI,
      ...stepRes
    });
  }

  // Active select angle analysis
  const t1_active = activeTheta1Deg * Math.PI / 180;
  const activeRes = solveKinematicsSingle(t1_active);

  if (!activeRes.success) {
    return {
      success: false,
      error: `O mecanismo não pôde ser montado ou está travado na posição $\\theta_1 = ${activeTheta1Deg}^\\circ$. Verifique o critério de Grashof.`
    };
  }

  // Create Step-by-Step LaTeX lines
  const res = [];
  res.push("### 1. Equações de Fecho de Cadeia Cinemática (Posição)");
  res.push("Considerando a cadeia de vetores em malha fechada $\\vec{r}_1 + \\vec{r}_2 = \\vec{r}_3 + \\vec{r}_4$ e projetando nos eixos coordenados:");
  res.push("$$r_1 \\cos\\theta_1 + r_2 \\cos\\theta_2 = r_3 + r_4 \\cos\\theta_4$$");
  res.push("$$r_1 \\sin\\theta_1 + r_2 \\sin\\theta_2 = r_4 \\sin\\theta_4$$");

  res.push(`Substituindo os valores no instante analisado ($\\theta_1 = ${activeTheta1Deg}^\\circ$):`);
  res.push(`- $r_1 = ${r1.toFixed(3)}\\text{ m}$, $r_2 = ${r2.toFixed(3)}\\text{ m}$, $r_3 = ${r3.toFixed(3)}\\text{ m}$, $r_4 = ${r4.toFixed(3)}\\text{ m}$`);
  res.push(`- $x_A = ${activeRes.xA.toFixed(4)}\\text{ m}$, $y_A = ${activeRes.yA.toFixed(4)}\\text{ m}$`);
  res.push(`Resolvendo geometricamente para o modo de montagem **${mode === 'open' ? 'Aberto' : 'Cruzado'}**:`);
  res.push(`$$\\theta_2 = ${activeRes.t2Deg.toFixed(4)}^\\circ = ${activeRes.t2.toFixed(4)}\\text{ rad}$$`);
  res.push(`$$\\theta_4 = ${activeRes.t4Deg.toFixed(4)}^\\circ = ${activeRes.t4.toFixed(4)}\\text{ rad}$$`);
  res.push(`- Ponto $B$ de articulação: $x_B = ${activeRes.xB.toFixed(4)}\\text{ m}$, $y_B = ${activeRes.yB.toFixed(4)}\\text{ m}$`);

  res.push("### 2. Análise Cinemática das Velocidades Angulares");
  res.push("Derivando as equações de posição em ordem ao tempo, mantendo os comprimentos das barras constantes:");
  res.push("$$\\begin{bmatrix} -r_2\\sin\\theta_2 & r_4\\sin\\theta_4 \\\\ r_2\\cos\\theta_2 & -r_4\\cos\\theta_4 \\end{bmatrix} \\begin{bmatrix} \\omega_2 \\\\ \\omega_4 \\end{bmatrix} = \\begin{bmatrix} r_1\\sin\\theta_1 \\\\ -r_1\\cos\\theta_1 \\end{bmatrix} \\omega_1$$");
  res.push("Substituindo os valores conhecidos:");
  res.push(`$$\\begin{bmatrix} ${(-r2 * Math.sin(activeRes.t2)).toFixed(4)} & ${(r4 * Math.sin(activeRes.t4)).toFixed(4)} \\\\ ${(r2 * Math.cos(activeRes.t2)).toFixed(4)} & ${(-r4 * Math.cos(activeRes.t4)).toFixed(4)} \\end{bmatrix} \\begin{bmatrix} \\omega_2 \\\\ \\omega_4 \\end{bmatrix} = \\begin{bmatrix} ${(r1 * w1 * Math.sin(t1_active)).toFixed(4)} \\\\ ${(-r1 * w1 * Math.cos(t1_active)).toFixed(4)} \\end{bmatrix}$$`);
  res.push(`Determinando as velocidades angulares:`);
  res.push(`$$\\omega_2 = ${activeRes.w2.toFixed(4)}\\text{ rad/s}$$`);
  res.push(`$$\\omega_4 = ${activeRes.w4.toFixed(4)}\\text{ rad/s}$$`);

  res.push("### 3. Análise Cinemática das Acelerações Angulares");
  res.push("Derivando o sistema de velocidades angulares em ordem ao tempo (com $\\alpha_1 = 0$):");
  res.push("$$\\begin{bmatrix} -r_2\\sin\\theta_2 & r_4\\sin\\theta_4 \\\\ r_2\\cos\\theta_2 & -r_4\\cos\\theta_4 \\end{bmatrix} \\begin{bmatrix} \\alpha_2 \\\\ \\alpha_4 \\end{bmatrix} = \\begin{bmatrix} A_{acc} \\\\ -B_{acc} \\end{bmatrix}$$");
  res.push("Onde:");
  res.push("$$A_{acc} = r_1\\omega_1^2\\cos\\theta_1 + r_2\\omega_2^2\\cos\\theta_2 - r_4\\omega_4^2\\cos\\theta_4$$");
  res.push("$$B_{acc} = r_1\\omega_1^2\\sin\\theta_1 + r_2\\omega_2^2\\sin\\theta_2 - r_4\\omega_4^2\\sin\\theta_4$$");
  res.push(`Efetuando os cálculos das acelerações angulares:`);
  res.push(`$$\\alpha_2 = ${activeRes.a2.toFixed(4)}\\text{ rad/s}^2$$`);
  res.push(`$$\\alpha_4 = ${activeRes.a4.toFixed(4)}\\text{ rad/s}^2$$`);

  if (activeRes.forces) {
    res.push("### 4. Análise Dinâmica Externa (Newton-Euler)");
    res.push("Construindo o diagrama de corpo livre para cada componente e equacionando as forças lineares de translação dos centros de massa ($G_i$) e a rotação:");
    res.push("- **Crank (Barra OA)**: Apoio fixo $O$, articulação móvel $A$.");
    res.push("- **Coupler (Barra AB)**: Articulações móveis $A$ e $B$.");
    res.push("- **Follower (Barra DB)**: Articulação móvel $B$, apoio fixo $D$.");
    res.push("Criamos o sistema de 9 equações algébricas lineares $\\mathbf{M}_{9\\times 9} \\mathbf{F}_{9\\times 1} = \\mathbf{P}_{9\\times 1}$ para resolver as reações nos apoios:");
    res.push("$$\\mathbf{F} = [O_x, O_y, A_x, A_y, B_x, B_y, D_x, D_y, M]^T$$");
    res.push("Resolvendo numericamente pelo método de eliminação de Gauss:");
    
    const f = activeRes.forces;
    res.push(`- **Reação em O**: $O_x = ${f.Ox.toFixed(2)}\\text{ N}$, $O_y = ${f.Oy.toFixed(2)}\\text{ N}$ $\\rightarrow$ Resultante: $R_O = ${Math.sqrt(f.Ox*f.Ox + f.Oy*f.Oy).toFixed(2)}\\text{ N}$`);
    res.push(`- **Reação em A**: $A_x = ${f.Ax.toFixed(2)}\\text{ N}$, $A_y = ${f.Ay.toFixed(2)}\\text{ N}$ $\\rightarrow$ Resultante: $R_A = ${Math.sqrt(f.Ax*f.Ax + f.Ay*f.Ay).toFixed(2)}\\text{ N}$`);
    res.push(`- **Reação em B**: $B_x = ${f.Bx.toFixed(2)}\\text{ N}$, $B_y = ${f.By.toFixed(2)}\\text{ N}$ $\\rightarrow$ Resultante: $R_B = ${Math.sqrt(f.Bx*f.Bx + f.By*f.By).toFixed(2)}\\text{ N}$`);
    res.push(`- **Reação em D**: $D_x = ${f.Dx.toFixed(2)}\\text{ N}$, $D_y = ${f.Dy.toFixed(2)}\\text{ N}$ $\\rightarrow$ Resultante: $R_D = ${Math.sqrt(f.Dx*f.Dx + f.Dy*f.Dy).toFixed(2)}\\text{ N}$`);
    res.push(`- **Binário Motor ($M$)**: $M = ${f.M.toFixed(4)}\\text{ N}\\cdot\\text{m}$ (anti-horário se positivo)`);
  }

  return {
    success: true,
    type: "quatro_barras",
    results: {
      xA: activeRes.xA,
      yA: activeRes.yA,
      xB: activeRes.xB,
      yB: activeRes.yB,
      t2: activeRes.t2,
      t2Deg: activeRes.t2Deg,
      t4: activeRes.t4,
      t4Deg: activeRes.t4Deg,
      w2: activeRes.w2,
      w4: activeRes.w4,
      a2: activeRes.a2,
      a4: activeRes.a4,
      forces: activeRes.forces,
      isAnyLock: isAnyLock
    },
    trajectory: trajectory,
    resolutionMarkdown: res.join("\n")
  };
}
