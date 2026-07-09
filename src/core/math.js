// Symbolic Mathematical Engine for Structural Mechanics
// Replicates the Expr and Matrix classes from the Lua non-CAS engine

export class Expr {
  constructor(constVal = 0, terms = {}) {
    this.const = constVal;
    this.terms = {};
    for (let k in terms) {
      if (Math.abs(terms[k]) > 1e-9) {
        this.terms[k] = terms[k];
      }
    }
  }

  static fromConst(c) {
    return new Expr(c);
  }

  static fromTerm(coef, base) {
    const e = new Expr(0);
    if (base && Math.abs(coef) > 1e-9) {
      e.terms[base] = coef;
    }
    return e;
  }

  clone() {
    return new Expr(this.const, this.terms);
  }

  isZero() {
    if (Math.abs(this.const) > 1e-9) return false;
    for (let k in this.terms) {
      if (Math.abs(this.terms[k]) > 1e-9) return false;
    }
    return true;
  }

  add(other) {
    const res = this.clone();
    res.const += other.const;
    for (let k in other.terms) {
      res.terms[k] = (res.terms[k] || 0) + other.terms[k];
      if (Math.abs(res.terms[k]) < 1e-9) {
        delete res.terms[k];
      }
    }
    return res;
  }

  sub(other) {
    const res = this.clone();
    res.const -= other.const;
    for (let k in other.terms) {
      res.terms[k] = (res.terms[k] || 0) - other.terms[k];
      if (Math.abs(res.terms[k]) < 1e-9) {
        delete res.terms[k];
      }
    }
    return res;
  }

  scale(factor) {
    const res = new Expr(this.const * factor);
    for (let k in this.terms) {
      const v = this.terms[k] * factor;
      if (Math.abs(v) > 1e-9) {
        res.terms[k] = v;
      }
    }
    return res;
  }

  getSingleBase() {
    if (Math.abs(this.const) > 1e-9) return null;
    let base = null;
    for (let k in this.terms) {
      if (Math.abs(this.terms[k]) > 1e-9) {
        if (base && base !== k) return null;
        base = k;
      }
    }
    return base;
  }

  getCoeff(base) {
    if (base === null || base === undefined) return this.const;
    return this.terms[base] || 0;
  }

  getBases() {
    return Object.keys(this.terms).filter(k => Math.abs(this.terms[k]) > 1e-9);
  }

  toString() {
    if (this.isZero()) return "0";
    let parts = [];
    let keys = Object.keys(this.terms).sort();
    for (let k of keys) {
      let coef = this.terms[k];
      let absCoef = Math.abs(coef);
      let sign = coef < 0 ? "-" : "+";
      let termStr = Math.abs(absCoef - 1) < 1e-9 ? k : `${exprFormatNumber(absCoef)}*${k}`;
      parts.push({ sign, text: termStr });
    }
    if (Math.abs(this.const) > 1e-9) {
      let sign = this.const < 0 ? "-" : "+";
      parts.push({ sign, text: exprFormatNumber(Math.abs(this.const)) });
    }
    if (parts.length === 0) return "0";
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      let p = parts[i];
      if (i === 0) {
        out = p.sign === "-" ? `-${p.text}` : p.text;
      } else {
        out += ` ${p.sign} ${p.text}`;
      }
    }
    return out;
  }

  toLaTeX() {
    if (this.isZero()) return "0";
    let parts = [];
    let keys = Object.keys(this.terms).sort();
    for (let k of keys) {
      let coef = this.terms[k];
      let absCoef = Math.abs(coef);
      let sign = coef < 0 ? "-" : "+";
      
      let formattedKey = k;
      if (k.includes("/")) {
        let [num, den] = k.split("/");
        formattedKey = `\\frac{${num}}{${den}}`;
      }
      if (formattedKey.includes("^")) {
        formattedKey = formattedKey.replace(/\^(\d+)/g, "^{$1}");
      }
      
      let termStr = Math.abs(absCoef - 1) < 1e-9 ? formattedKey : `${exprFormatNumber(absCoef)}${formattedKey}`;
      parts.push({ sign, text: termStr });
    }
    if (Math.abs(this.const) > 1e-9) {
      let sign = this.const < 0 ? "-" : "+";
      parts.push({ sign, text: exprFormatNumber(Math.abs(this.const)) });
    }
    if (parts.length === 0) return "0";
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      let p = parts[i];
      if (i === 0) {
        out = p.sign === "-" ? `-${p.text}` : p.text;
      } else {
        out += ` ${p.sign} ${p.text}`;
      }
    }
    return out;
  }
}

export function exprFormatNumber(x) {
  if (x === null || x === undefined) return "0";
  if (Math.abs(x) < 1e-9) return "0";
  let ax = Math.abs(x);
  if (ax >= 1000 || ax < 0.001) {
    return parseFloat(x.toPrecision(3)).toString();
  } else {
    return parseFloat(x.toPrecision(4)).toString();
  }
}

export class Matrix {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.data = [];
    for (let i = 0; i < rows; i++) {
      this.data[i] = [];
      for (let j = 0; j < cols; j++) {
        this.data[i][j] = new Expr(0);
      }
    }
  }

  static zeros(rows, cols) {
    return new Matrix(rows, cols);
  }

  static identity(n) {
    const m = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      m.data[i][i] = new Expr(1);
    }
    return m;
  }

  get(i, j) {
    return this.data[i][j];
  }

  set(i, j, expr) {
    this.data[i][j] = expr;
  }

  addExpr(i, j, expr) {
    this.data[i][j] = this.data[i][j].add(expr);
  }

  addTerm(i, j, coef, base) {
    const term = Expr.fromTerm(coef, base);
    this.data[i][j] = this.data[i][j].add(term);
  }

  clone() {
    const m = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        m.data[i][j] = this.data[i][j].clone();
      }
    }
    return m;
  }

  extractSingleBase() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        let base = this.data[i][j].getSingleBase();
        if (base) return base;
      }
    }
    return null;
  }

  toNumeric(base) {
    const num = [];
    for (let i = 0; i < this.rows; i++) {
      num[i] = [];
      for (let j = 0; j < this.cols; j++) {
        num[i][j] = this.data[i][j].getCoeff(base);
      }
    }
    return num;
  }

  toNumericFull() {
    const num = [];
    for (let i = 0; i < this.rows; i++) {
      num[i] = [];
      for (let j = 0; j < this.cols; j++) {
        num[i][j] = this.data[i][j].const;
      }
    }
    return num;
  }

  formatLines() {
    const lines = [];
    for (let i = 0; i < this.rows; i++) {
      let row = "  [ ";
      for (let j = 0; j < this.cols; j++) {
        let s = this.data[i][j].toString();
        row += s.padEnd(16) + " ";
      }
      row += "]";
      lines.push(row);
    }
    return lines;
  }

  vectorFormatLines() {
    const lines = [];
    for (let i = 0; i < this.rows; i++) {
      lines.push(`  { ${this.data[i][0].toString()} }`);
    }
    return lines;
  }

  // Gaussian Elimination for A * x = B (numeric array solver)
  static solveNumeric(A_num, B_num) {
    const n = A_num.length;
    const A = [];
    for (let i = 0; i < n; i++) {
      A[i] = [...A_num[i]];
      A[i][n] = B_num[i]; // Augmented matrix
    }

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        let temp = A[i];
        A[i] = A[maxRow];
        A[maxRow] = temp;
      }

      // Make pivot 1
      let pivot = A[i][i];
      if (Math.abs(pivot) < 1e-12) {
        return { success: false, error: "Matriz singular ou instável." };
      }

      for (let k = i; k <= n; k++) {
        A[i][k] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          let factor = A[k][i];
          for (let j = i; j <= n; j++) {
            A[k][j] -= factor * A[i][j];
          }
        }
      }
    }

    const x = [];
    for (let i = 0; i < n; i++) {
      x[i] = A[i][n];
    }
    return { success: true, solution: x };
  }
}

// Eigenvalue bisection solver (matching Lua)
export function solveEigenvalues(Kr, Mr, nf) {
  const lam = [];

  if (nf === 1) {
    if (Math.abs(Mr[0][0]) > 1e-14) {
      lam[0] = Kr[0][0] / Mr[0][0];
    } else {
      lam[0] = 0.0;
    }
    return lam;
  }

  if (nf === 2) {
    const K11 = Kr[0][0], K12 = Kr[0][1], K22 = Kr[1][1];
    const M11 = Mr[0][0], M12 = Mr[0][1], M22 = Mr[1][1];
    const a = M11 * M22 - M12 * M12;
    const b = -(K11 * M22 + K22 * M11 - 2.0 * K12 * M12);
    const c = K11 * K22 - K12 * K12;

    if (Math.abs(a) < 1e-14) {
      if (Math.abs(b) > 1e-14) {
        const l1 = -c / b;
        if (l1 > -1e-8) lam.push(l1);
      }
      lam.sort((x, y) => x - y);
      return lam;
    }

    const disc = b * b - 4.0 * a * c;
    if (disc < 0) return [];

    const rdisc = Math.sqrt(disc);
    const l1 = (-b - rdisc) / (2.0 * a);
    const l2 = (-b + rdisc) / (2.0 * a);
    if (l1 > -1e-8) lam.push(l1);
    if (l2 > -1e-8) lam.push(l2);
    lam.sort((x, y) => x - y);
    return lam;
  }

  if (nf === 3) {
    const fdet = (l) => {
      const A = [];
      for (let i = 0; i < 3; i++) {
        A[i] = [];
        for (let j = 0; j < 3; j++) {
          A[i][j] = Kr[i][j] - l * Mr[i][j];
        }
      }
      // determinant of 3x3
      return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
           - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
           + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    };

    let lamMax = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(Mr[i][i]) > 1e-14) {
        lamMax = Math.max(lamMax, Math.abs(Kr[i][i] / Mr[i][i]));
      }
    }
    if (lamMax < 1e-8) lamMax = 1;
    return bisectionRoots(fdet, 0.0, lamMax * 10.0, 1e-6, 300, 3);
  }

  return [];
}

function bisectionRoots(f, a, b, tol, ns, maxRoots) {
  const h = (b - a) / ns;
  const roots = [];
  let x = a;
  let prev = f(x);

  for (let i = 1; i <= ns; i++) {
    let xn = x + h;
    let cur = f(xn);

    if (prev * cur < 0) {
      let lo = x, hi = xn;
      for (let k = 0; k < 60; k++) {
        let mid = 0.5 * (lo + hi);
        let fm = f(mid);
        if (Math.abs(fm) < tol || Math.abs(hi - lo) < tol) {
          roots.push(mid);
          break;
        }
        if (f(lo) * fm < 0) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      if (roots.length >= maxRoots) break;
    }

    prev = cur;
    x = xn;
  }

  roots.sort((x, y) => x - y);
  return roots;
}

export function matrixSubtractScaled(A, B, lam) {
  const n = A.length;
  const R = [];
  for (let i = 0; i < n; i++) {
    R[i] = [];
    for (let j = 0; j < n; j++) {
      R[i][j] = A[i][j] - lam * B[i][j];
    }
  }
  return R;
}

export function normalizeVector(v) {
  let lastNonZeroIdx = null;
  for (let i = v.length - 1; i >= 0; i--) {
    if (Math.abs(v[i]) > 1e-9) {
      lastNonZeroIdx = i;
      break;
    }
  }

  if (lastNonZeroIdx === null) return v;

  const factor = v[lastNonZeroIdx];
  const res = [];
  for (let i = 0; i < v.length; i++) {
    res[i] = v[i] / factor;
    if (Math.abs(res[i]) < 1e-12) res[i] = 0;
  }
  return res;
}

export function buildModeShapeVector(A) {
  const n = A.length;
  if (n <= 0) return null;
  if (n === 1) return [1];

  if (n === 2) {
    const r1 = A[0] || [0, 0];
    const r2 = A[1] || [0, 0];
    const n1 = Math.abs(r1[0]) + Math.abs(r1[1]);
    const n2 = Math.abs(r2[0]) + Math.abs(r2[1]);
    const r = n1 >= n2 ? r1 : r2;
    let v = [-r[1], r[0]];
    if (Math.abs(v[0]) < 1e-14 && Math.abs(v[1]) < 1e-14) {
      v = [1, 1];
    }
    return normalizeVector(v);
  }

  if (n === 3) {
    const rows = [A[0] || [0, 0, 0], A[1] || [0, 0, 0], A[2] || [0, 0, 0]];
    const norms = rows.map((r, idx) => ({ idx, norm: Math.abs(r[0]) + Math.abs(r[1]) + Math.abs(r[2]) }));
    norms.sort((x, y) => y.norm - x.norm);

    const cross = (u, w) => [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0]
    ];

    const pairs = [
      [norms[0].idx, norms[1].idx],
      [norms[0].idx, norms[2].idx],
      [norms[1].idx, norms[2].idx]
    ];

    for (let pr of pairs) {
      const v = cross(rows[pr[0]], rows[pr[1]]);
      if (Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]) > 1e-12) {
        return normalizeVector(v);
      }
    }
    return [1, 1, 1];
  }

  const v = new Array(n).fill(1);
  return normalizeVector(v);
}
