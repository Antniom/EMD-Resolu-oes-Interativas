local keys = {
  left = "left",
  right = "right",
  up = "up",
  down = "down",
  enter = "enter"
}

local Expr = {}
Expr.__index = Expr

local function exprIsZeroNumber(x)
  return math.abs(x or 0) < 1e-9
end

function Expr.new()
  return setmetatable({ terms = {}, const = 0 }, Expr)
end

function Expr.fromConst(c)
  local e = Expr.new()
  e.const = c or 0
  return e
end

function Expr.fromTerm(coef, base)
  local e = Expr.new()
  if base and not exprIsZeroNumber(coef) then
    e.terms[base] = coef
  end
  return e
end

function Expr.clone(e)
  local n = Expr.new()
  n.const = e.const or 0
  for k, v in pairs(e.terms or {}) do
    n.terms[k] = v
  end
  return n
end

function Expr.isZero(e)
  if not exprIsZeroNumber(e.const) then
    return false
  end
  for _, v in pairs(e.terms or {}) do
    if not exprIsZeroNumber(v) then
      return false
    end
  end
  return true
end

function Expr.addInplace(e, coef, base)
  if base == nil then
    e.const = (e.const or 0) + (coef or 0)
    return e
  end
  if exprIsZeroNumber(coef) then
    return e
  end
  local current = e.terms[base] or 0
  local nextVal = current + coef
  if exprIsZeroNumber(nextVal) then
    e.terms[base] = nil
  else
    e.terms[base] = nextVal
  end
  return e
end

function Expr.add(a, b)
  local e = Expr.clone(a)
  if b.const then
    e.const = (e.const or 0) + b.const
  end
  for base, coef in pairs(b.terms or {}) do
    Expr.addInplace(e, coef, base)
  end
  return e
end

function Expr.sub(a, b)
  local e = Expr.clone(a)
  if b.const then
    e.const = (e.const or 0) - b.const
  end
  for base, coef in pairs(b.terms or {}) do
    Expr.addInplace(e, -coef, base)
  end
  return e
end

function Expr.scale(e, s)
  local n = Expr.new()
  n.const = (e.const or 0) * s
  for base, coef in pairs(e.terms or {}) do
    local v = coef * s
    if not exprIsZeroNumber(v) then
      n.terms[base] = v
    end
  end
  return n
end

function Expr.getSingleBase(e)
  local base = nil
  if not exprIsZeroNumber(e.const) then
    return nil
  end
  for k, v in pairs(e.terms or {}) do
    if not exprIsZeroNumber(v) then
      if base and base ~= k then
        return nil
      end
      base = k
    end
  end
  return base
end

local function exprFormatNumber(x)
  if x == nil then
    return "0"
  end
  if exprIsZeroNumber(x) then
    return "0"
  end
  local ax = math.abs(x)
  local s
  if ax >= 1000 or ax < 0.001 then
    s = string.format("%.3g", x)
  else
    s = string.format("%.4g", x)
  end
  return s
end

local function exprSortKeys(t)
  local keys = {}
  for k in pairs(t) do
    table.insert(keys, k)
  end
  table.sort(keys)
  return keys
end

function Expr.toString(e)
  if Expr.isZero(e) then
    return "0"
  end

  local parts = {}
  local keys = exprSortKeys(e.terms or {})
  for _, base in ipairs(keys) do
    local coef = e.terms[base]
    if not exprIsZeroNumber(coef) then
      local absCoef = math.abs(coef)
      local sign = coef < 0 and "-" or "+"
      local coefStr
      if math.abs(absCoef - 1) < 1e-9 then
        coefStr = base
      else
        coefStr = exprFormatNumber(absCoef) .. "*" .. base
      end
      table.insert(parts, { sign = sign, text = coefStr })
    end
  end

  if not exprIsZeroNumber(e.const) then
    local sign = e.const < 0 and "-" or "+"
    table.insert(parts, { sign = sign, text = exprFormatNumber(math.abs(e.const)) })
  end

  if #parts == 0 then
    return "0"
  end

  local out = ""
  for i, p in ipairs(parts) do
    if i == 1 then
      if p.sign == "-" then
        out = "-" .. p.text
      else
        out = p.text
      end
    else
      out = out .. " " .. p.sign .. " " .. p.text
    end
  end
  return out
end

function Expr.getCoeff(e, base)
  return (e.terms or {})[base] or 0
end

function Expr.getBases(e)
  local bases = {}
  for base, coef in pairs(e.terms or {}) do
    if not exprIsZeroNumber(coef) then
      table.insert(bases, base)
    end
  end
  table.sort(bases)
  return bases
end

local Matrix = {}

function Matrix.zeros(rows, cols)
  local m = { rows = rows, cols = cols, data = {} }
  for i = 1, rows do
    m.data[i] = {}
    for j = 1, cols do
      m.data[i][j] = Expr.new()
    end
  end
  return m
end

function Matrix.identity(n)
  local m = Matrix.zeros(n, n)
  for i = 1, n do
    m.data[i][i] = Expr.fromConst(1)
  end
  return m
end

function Matrix.get(m, i, j)
  return m.data[i][j]
end

function Matrix.set(m, i, j, expr)
  m.data[i][j] = expr
end

function Matrix.addExpr(m, i, j, expr)
  m.data[i][j] = Expr.add(m.data[i][j], expr)
end

function Matrix.addTerm(m, i, j, coef, base)
  local e = m.data[i][j]
  Expr.addInplace(e, coef, base)
end

function Matrix.clone(m)
  local n = Matrix.zeros(m.rows, m.cols)
  for i = 1, m.rows do
    for j = 1, m.cols do
      n.data[i][j] = Expr.clone(m.data[i][j])
    end
  end
  return n
end

function Matrix.formatLines(m)
  local lines = {}
  for i = 1, m.rows do
    local rowParts = {}
    for j = 1, m.cols do
      table.insert(rowParts, Expr.toString(m.data[i][j]))
    end
    table.insert(lines, "[ " .. table.concat(rowParts, "  ") .. " ]")
  end
  return lines
end

function Matrix.vectorFormatLines(vec)
  local lines = {}
  for i = 1, #vec do
    table.insert(lines, "[ " .. Expr.toString(vec[i]) .. " ]")
  end
  return lines
end

function Matrix.extractSingleBase(m)
  local base = nil
  for i = 1, m.rows do
    for j = 1, m.cols do
      local b = Expr.getSingleBase(m.data[i][j])
      if b == nil then
        if not Expr.isZero(m.data[i][j]) then
          return nil
        end
      else
        if base == nil then
          base = b
        elseif base ~= b then
          return nil
        end
      end
    end
  end
  return base
end

function Matrix.toNumeric(m, base)
  local a = {}
  for i = 1, m.rows do
    a[i] = {}
    for j = 1, m.cols do
      local e = m.data[i][j]
      if base then
        a[i][j] = Expr.getCoeff(e, base)
      else
        a[i][j] = e.const or 0
      end
    end
  end
  return a
end

function Matrix.toNumericFull(m)
  local a = {}
  for i = 1, m.rows do
    a[i] = {}
    for j = 1, m.cols do
      local e = m.data[i][j]
      local v = e.const or 0
      for _, coef in pairs(e.terms or {}) do
        v = v + coef
      end
      a[i][j] = v
    end
  end
  return a
end

local function matrixSwapRows(mat, i, k)
  local tmp = mat[i]
  mat[i] = mat[k]
  mat[k] = tmp
end

function Matrix.solveNumeric(a, b)
  local n = #a
  local aug = {}
  for i = 1, n do
    aug[i] = {}
    for j = 1, n do
      aug[i][j] = a[i][j]
    end
    aug[i][n + 1] = b[i]
  end

  for col = 1, n do
    local pivot = col
    for row = col + 1, n do
      if math.abs(aug[row][col]) > math.abs(aug[pivot][col]) then
        pivot = row
      end
    end
    if math.abs(aug[pivot][col]) < 1e-12 then
      return nil, "Matriz singular"
    end
    if pivot ~= col then
      matrixSwapRows(aug, pivot, col)
    end

    local pivotVal = aug[col][col]
    for j = col, n + 1 do
      aug[col][j] = aug[col][j] / pivotVal
    end

    for row = 1, n do
      if row ~= col then
        local factor = aug[row][col]
        if math.abs(factor) > 1e-12 then
          for j = col, n + 1 do
            aug[row][j] = aug[row][j] - factor * aug[col][j]
          end
        end
      end
    end
  end

  local x = {}
  for i = 1, n do
    x[i] = aug[i][n + 1]
  end
  return x
end

-- ======================== UI FRAMEWORK ========================
local ui = {}

ui.colors = {
  tabBg = { 215, 215, 215 },
  tabActive = { 245, 245, 245 },
  tabBorder = { 130, 130, 130 },
  text = { 30, 30, 30 }
}

local function uiSetColor(gc, c)
  gc:setColorRGB(c[1], c[2], c[3])
end

local function uiClear(gc, w, h)
  gc:setColorRGB(255, 255, 255)
  gc:fillRect(0, 0, w, h)
end

-- Global hit testing stack
local HITS = {}
local function clearHits()
  HITS = {}
end

local function addHit(id, x, y, w, h, data)
  HITS[#HITS + 1] = { id = id, x = x, y = y, w = w, h = h, data = data }
end

local function hitAt(x, y)
  for i = #HITS, 1, -1 do
    local h = HITS[i]
    if x >= h.x and x <= h.x + h.w and y >= h.y and y <= h.y + h.h then
      return h
    end
  end
  return nil
end

local function trim(s)
  return s:match("^%s*(.-)%s*$")
end

local function fmtCell(v)
  if v == nil then return "" end
  local rounded = math.floor(v * 10000 + 0.5) / 10000
  if math.abs(rounded) < 1e-11 then rounded = 0 end
  if math.abs(rounded - math.floor(rounded + 0.5)) < 1e-11 then
    return tostring(math.floor(rounded + 0.5))
  end
  local s = string.format("%.4f", rounded)
  s = s:gsub("0+$", ""):gsub("%.$", "")
  return s
end

local function drawButton(gc, x, y, w, h, label, selected)
  if selected then
    gc:setColorRGB(190, 220, 255)
  else
    gc:setColorRGB(235, 235, 235)
  end
  gc:fillRect(x, y, w, h)
  gc:setColorRGB(80, 80, 80)
  gc:drawRect(x, y, w, h)
  gc:setColorRGB(20, 20, 20)
  gc:setFont("sansserif", "r", 9)
  gc:drawString(label, x + 4, y + 2, "top")
end

local function clipTextToWidth(gc, s, maxW)
  s = tostring(s or "")
  if maxW <= 4 then return "" end
  if gc:getStringWidth(s) <= maxW then return s end
  local out = s
  while #out > 0 and gc:getStringWidth(out .. "...") > maxW do
    out = string.sub(out, 1, #out - 1)
  end
  if out == "" then return "" end
  return out .. "..."
end

function ui.wrapText(gc, text, maxWidth)
  text = tostring(text or "")
  local isBold = false
  if string.sub(text, 1, 2) == "**" then
    isBold = true
    text = string.sub(text, 3)
  end

  if isBold then
    gc:setFont("sansserif", "b", 10)
  else
    gc:setFont("sansserif", "r", 10)
  end

  if gc:getStringWidth(text) <= maxWidth then
    gc:setFont("sansserif", "r", 10)
    if isBold then
      return { "**" .. text }
    else
      return { text }
    end
  end

  local words = {}
  for w in string.gmatch(text, "%S+") do
    table.insert(words, w)
  end
  local lines = {}
  local line = ""
  for i, w in ipairs(words) do
    local test = (line == "") and w or (line .. " " .. w)
    if gc:getStringWidth(test) <= maxWidth then
      line = test
    else
      if line ~= "" then
        if isBold then
          table.insert(lines, "**" .. line)
        else
          table.insert(lines, line)
        end
      end
      line = w
    end
  end
  if line ~= "" then
    if isBold then
      table.insert(lines, "**" .. line)
    else
      table.insert(lines, line)
    end
  end
  gc:setFont("sansserif", "r", 10)
  if #lines == 0 then
    return { "" }
  end
  return lines
end

function ui.newApp(title, tabs, context)
  local app = {
    title = title,
    tabs = tabs,
    active = 1,
    context = context,
    tabHeight = 18,
    padding = 6,
    scrollY = {},
    lineHeight = 14,
    width = 320,
    height = 240
  }

  function app:getActiveTab()
    return self.tabs[self.active]
  end

  function app:resize()
    if platform and platform.window then
      self.width = platform.window:width()
      self.height = platform.window:height()
    end
  end

  function app:paint(gc)
    self:resize()
    uiClear(gc, self.width, self.height)
    gc:setFont("sansserif", "r", 10)
    local y = 0

    local tabCount = #self.tabs
    local tabWidth = math.floor(self.width / tabCount)
    for i, tab in ipairs(self.tabs) do
      if i == self.active then
        uiSetColor(gc, ui.colors.tabActive)
      else
        uiSetColor(gc, ui.colors.tabBg)
      end
      gc:fillRect((i - 1) * tabWidth, y, tabWidth, self.tabHeight)
      uiSetColor(gc, ui.colors.tabBorder)
      gc:drawRect((i - 1) * tabWidth, y, tabWidth, self.tabHeight)
      uiSetColor(gc, ui.colors.text)
      gc:drawString(tab.title, (i - 1) * tabWidth + 4, y + 3, "top")
    end

    local contentX = self.padding
    local contentY = self.tabHeight + self.padding
    local contentW = self.width - 2 * self.padding
    local contentH = self.height - contentY - self.padding

    local tab = self:getActiveTab()
    if tab.render then
      tab:render(gc, contentX, contentY, contentW, contentH, self)
      return
    end

    local lines = {}
    if tab.getLines then
      lines = tab:getLines(self)
    end

    local scrollY = self.scrollY[self.active] or 0
    local lineHeight = self.lineHeight

    local wrappedLines = {}
    for _, line in ipairs(lines) do
      local w = ui.wrapText(gc, line, contentW)
      for _, wl in ipairs(w) do
        table.insert(wrappedLines, wl)
      end
    end

    local totalHeight = #wrappedLines * lineHeight
    if scrollY > math.max(0, totalHeight - contentH) then
      scrollY = math.max(0, totalHeight - contentH)
      self.scrollY[self.active] = scrollY
    end

    local startLine = math.floor(scrollY / lineHeight) + 1
    local yOffset = contentY - (scrollY % lineHeight)
    for i = startLine, #wrappedLines do
      local drawY = yOffset + (i - startLine) * lineHeight
      if drawY > contentY + contentH then
        break
      end
      local wl = wrappedLines[i]
      if string.sub(wl, 1, 2) == "**" then
        gc:setFont("sansserif", "b", 10)
        gc:drawString(string.sub(wl, 3), contentX, drawY, "top")
        gc:setFont("sansserif", "r", 10)
      else
        gc:drawString(wl, contentX, drawY, "top")
      end
    end
  end

  function app:scroll(delta)
    local tabIndex = self.active
    local current = self.scrollY[tabIndex] or 0
    current = math.max(0, current + delta)
    self.scrollY[tabIndex] = current
  end

  function app:keyDown(key)
    local tab = self:getActiveTab()
    if tab.handleKey then
      local handled = tab:handleKey(key, self)
      if handled then
        if platform and platform.window then
          platform.window:invalidate()
        end
        return
      end
    end

    if key == keys.left then
      self.active = math.max(1, self.active - 1)
    elseif key == keys.right then
      self.active = math.min(#self.tabs, self.active + 1)
    elseif key == keys.up then
      self:scroll(-self.lineHeight)
    elseif key == keys.down then
      self:scroll(self.lineHeight)
    end

    if platform and platform.window then
      platform.window:invalidate()
    end
  end

  function app:charIn(ch)
    if ch == "]" or ch == "t" or ch == "T" then
      self.active = (self.active % #self.tabs) + 1
      if platform and platform.window then platform.window:invalidate() end
      return
    elseif ch == "[" then
      self.active = ((self.active - 2 + #self.tabs) % #self.tabs) + 1
      if platform and platform.window then platform.window:invalidate() end
      return
    end

    local tab = self:getActiveTab()
    if tab.charIn and tab:charIn(ch, self) then
      if platform and platform.window then platform.window:invalidate() end
    end
  end

  function app:backspaceKey()
    local tab = self:getActiveTab()
    if tab.backspaceKey and tab:backspaceKey(self) then
      if platform and platform.window then platform.window:invalidate() end
    end
  end

  function app:escapeKey()
    local tab = self:getActiveTab()
    if tab.escapeKey and tab:escapeKey(self) then
      if platform and platform.window then platform.window:invalidate() end
    end
  end

  function app:mouseDown(x, y)
    if y <= self.tabHeight then
      local tabCount = #self.tabs
      local tabWidth = math.floor(self.width / tabCount)
      local index = math.floor(x / tabWidth) + 1
      if index >= 1 and index <= tabCount then
        self.active = index
        if platform and platform.window then
          platform.window:invalidate()
        end
        return
      end
    end

    local tab = self:getActiveTab()
    if tab.handleMouseDown then
      tab:handleMouseDown(x, y, self)
      if platform and platform.window then
        platform.window:invalidate()
      end
    end
  end

  return app
end

function ui.bind(app)
  function on.paint(gc)
    app:paint(gc)
  end
  function on.keyDown(key)
    app:keyDown(key)
  end
  function on.arrowKey(arrow)
    app:keyDown(arrow)
  end
  function on.enterKey()
    app:keyDown("enter")
  end
  function on.charIn(ch)
    app:charIn(ch)
  end
  function on.backspaceKey()
    app:backspaceKey()
  end
  function on.escapeKey()
    app:escapeKey()
  end
  function on.mouseDown(x, y)
    app:mouseDown(x, y)
  end
  function on.resize()
    app:resize()
  end
  if platform and platform.window then
    platform.window:invalidate()
  end
end

-- ======================== STORAGE PERSISTENCE ========================
local storage = {}
storage._mem = {}

function storage.save(key, value)
  if var and var.store then
    var.store(key, value)
  else
    storage._mem[key] = value
  end
end

function storage.load(key, default)
  if var and var.recall then
    local ok, value = pcall(function()
      return var.recall(key)
    end)
    if ok and value ~= nil then
      return value
    end
  end
  if storage._mem[key] ~= nil then
    return storage._mem[key]
  end
  return default
end

-- ======================== MOLA FEA ENGINE ========================
local Mola = {}

local function defaultState()
  return {
    nMass = 2,
    nSpring = 2,
    masses = { 1, 1 },
    springs = {
      { i = 0, j = 1, k = 1 },
      { i = 1, j = 2, k = 2 }
    },
    forces = { { P = 0, mg = 1 }, { P = 0, mg = 1 } },
    defOption = 2,
    defSelected = { [1] = true, [2] = true, [3] = true, [4] = true },
    tab1SelRow = 1,
    tab1SelCol = 1,
    tab1ScrollPx = 0,
    forceSelRow = 1,
    forceSelCol = 1,
    message = "Use setas para navegar e Enter para editar."
  }
end

local function ensureSizes(state)
  if state.nMass == nil then state.nMass = 2 end
  if state.nSpring == nil then state.nSpring = 2 end
  if state.nMass < 1 then state.nMass = 1 end
  if state.nMass > 6 then state.nMass = 6 end
  if state.nSpring < 1 then state.nSpring = 1 end
  if state.nSpring > 6 then state.nSpring = 6 end

  state.masses = state.masses or {}
  for i = 1, state.nMass do
    if state.masses[i] == nil then
      state.masses[i] = 1
    end
  end
  for i = state.nMass + 1, #state.masses do
    state.masses[i] = nil
  end

  state.springs = state.springs or {}
  for i = 1, state.nSpring do
    if state.springs[i] == nil then
      state.springs[i] = { i = i - 1, j = i, k = 1 }
    end
    if state.springs[i].k == nil then
      state.springs[i].k = 1
    end
    if state.springs[i].i == nil or state.springs[i].i > state.nMass or state.springs[i].i < 0 then
      state.springs[i].i = 0
    end
    if state.springs[i].j == nil or state.springs[i].j > state.nMass or state.springs[i].j < 0 then
      state.springs[i].j = 0
    end
  end
  for i = state.nSpring + 1, #state.springs do
    state.springs[i] = nil
  end

  state.forces = state.forces or {}
  for i = 1, state.nMass do
    if state.forces[i] == nil then
      state.forces[i] = { P = 0, mg = 0 }
    end
  end
  for i = state.nMass + 1, #state.forces do
    state.forces[i] = nil
  end
end

local storeGlobalVariables

local function saveState(state)
  storage.save("Mola_state", state)
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

local function formatSpringTerm(coef, e)
  local absCoef = math.abs(coef)
  local sym = (coef < 0 and "-" or "") .. "k^(" .. e .. ")"
  local val
  if math.abs(absCoef - 1) < 1e-9 then
    val = (coef < 0 and "-" or "") .. "k"
  else
    val = (coef < 0 and "-" or "") .. exprFormatNumber(absCoef) .. "*k"
  end
  return sym, val
end

local function assembleK(state)
  local n = state.nMass
  local K = Matrix.zeros(n, n)
  local steps = {}

  for e = 1, state.nSpring do
    local s = state.springs[e]
    local i = s.i
    local j = s.j
    local kcoef = s.k or 0

    if i > 0 then
      Matrix.addTerm(K, i, i, kcoef, "k")
      steps[i .. "," .. i] = steps[i .. "," .. i] or { symbols = {}, values = {} }
      local sym, val = formatSpringTerm(kcoef, e)
      table.insert(steps[i .. "," .. i].symbols, sym)
      table.insert(steps[i .. "," .. i].values, val)
    end
    if j > 0 then
      Matrix.addTerm(K, j, j, kcoef, "k")
      steps[j .. "," .. j] = steps[j .. "," .. j] or { symbols = {}, values = {} }
      local sym, val = formatSpringTerm(kcoef, e)
      table.insert(steps[j .. "," .. j].symbols, sym)
      table.insert(steps[j .. "," .. j].values, val)
    end
    if i > 0 and j > 0 then
      Matrix.addTerm(K, i, j, -kcoef, "k")
      Matrix.addTerm(K, j, i, -kcoef, "k")
      steps[i .. "," .. j] = steps[i .. "," .. j] or { symbols = {}, values = {} }
      steps[j .. "," .. i] = steps[j .. "," .. i] or { symbols = {}, values = {} }
      
      local sym1, val1 = formatSpringTerm(-kcoef, e)
      table.insert(steps[i .. "," .. j].symbols, sym1)
      table.insert(steps[i .. "," .. j].values, val1)
      
      local sym2, val2 = formatSpringTerm(-kcoef, e)
      table.insert(steps[j .. "," .. i].symbols, sym2)
      table.insert(steps[j .. "," .. i].values, val2)
    end
  end

  return K, steps
end

local function assembleM(state)
  local n = state.nMass
  local M = Matrix.zeros(n, n)
  for i = 1, n do
    Matrix.addTerm(M, i, i, state.masses[i] or 0, "m")
  end
  return M
end

local function assembleF(state)
  local n = state.nMass
  local F = {}
  for i = 1, n do
    local expr = Expr.new()
    Expr.addInplace(expr, state.forces[i].P or 0, "P")
    Expr.addInplace(expr, state.forces[i].mg or 0, "mg")
    F[i] = expr
  end
  return F
end

local function solveDisplacements(state)
  local K, _ = assembleK(state)
  local base = Matrix.extractSingleBase(K)
  if base == nil then
    return nil, "K tem múltiplos termos simbólicos."
  end

  local Kbar = Matrix.toNumeric(K, base)
  local F = assembleF(state)

  local baseTerms = {}
  for i = 1, #F do
    for _, b in ipairs(Expr.getBases(F[i])) do
      baseTerms[b] = true
    end
  end

  local u = {}
  for i = 1, state.nMass do
    u[i] = Expr.new()
  end

  for b, _ in pairs(baseTerms) do
    local Fb = {}
    for i = 1, #F do
      Fb[i] = Expr.getCoeff(F[i], b)
    end
    local ub, err = Matrix.solveNumeric(Kbar, Fb)
    if not ub then
      return nil, err
    end
    for i = 1, #ub do
      Expr.addInplace(u[i], ub[i], b .. "/" .. base)
    end
  end

  return u, nil
end

function mola_detectExercise(state)
  if state.nMass ~= 2 or state.nSpring ~= 2 then
    return nil
  end
  local s1 = state.springs[1]
  local s2 = state.springs[2]
  if not s1 or not s2 then return nil end
  
  local matchSprings = (s1.i == 0 and s1.j == 1 and math.abs(s1.k - 1) < 1e-5) or (s1.i == 1 and s1.j == 0 and math.abs(s1.k - 1) < 1e-5)
  matchSprings = matchSprings and ((s2.i == 1 and s2.j == 2 and math.abs(s2.k - 2) < 1e-5) or (s2.i == 2 and s2.j == 1 and math.abs(s2.k - 2) < 1e-5))
  if not matchSprings then return nil end
  
  local f1 = state.forces[1]
  local f2 = state.forces[2]
  if not f1 or not f2 then return nil end
  
  local matchForces = (math.abs(f1.P) < 1e-5 and math.abs(f1.mg - 1) < 1e-5)
  matchForces = matchForces and (math.abs(f2.P) < 1e-5 and math.abs(f2.mg - 1) < 1e-5)
  if not matchForces then return nil end
  
  return 14
end

local function buildKsLines(state)
  local K, steps = assembleK(state)
  local lines = { "**Ks (montagem elemento a elemento):" }

  for i = 1, state.nMass do
    for j = 1, state.nMass do
      local key = i .. "," .. j
      if steps[key] then
        local left = "K" .. i .. j .. " = " .. table.concat(steps[key].symbols, " + ")
        left = left:gsub(" %+ %-", " - ")
        local middle = "= " .. table.concat(steps[key].values, " + ")
        middle = middle:gsub(" %+ %-", " - ")
        local right = "= " .. Expr.toString(K.data[i][j])
        table.insert(lines, left)
        table.insert(lines, middle)
        if #steps[key].symbols > 1 or middle ~= right then
          table.insert(lines, right)
        end
        table.insert(lines, "")
      end
    end
  end

  return lines
end

local function buildDefOptionLines(state, option)
  local lines = {}
  local exNum = mola_detectExercise(state)
  if exNum == 14 then
    if option == 1 then
      table.insert(lines, "Resolução dos Deslocamentos:")
      table.insert(lines, "  Solução do sistema de equações:")
      table.insert(lines, "  { 3k*U1 - 2k*U2 = mg")
      table.insert(lines, "  { -2k*U1 + 2k*U2 = mg")
      table.insert(lines, "  <=> { U1 = 2*mg/k")
      table.insert(lines, "      { U2 = 5*mg/(2*k)")
    elseif option == 2 then
      table.insert(lines, "Π = Ue - W")
      table.insert(lines, "  Ue = 1/2 * k * U1^2 + 1/2 * 2k * (U2 - U1)^2")
      table.insert(lines, "     = 1/2 * [ k*U1^2 + 2k * (U1^2 - 2*U1*U2 + U2^2) ]")
      table.insert(lines, "  W = mg * U1 + mg * U2")
      table.insert(lines, "  Π = Ue - W = 1/2 * [ k*U1^2 + 2k * (U1^2 - 2*U1*U2 + U2^2) ] - mg*U1 - mg*U2")
    elseif option == 3 then
      table.insert(lines, "Equações de minimização:")
      table.insert(lines, "  dΠ/dU1 = 0 => k*U1 + 2k*U1 - 2k*U2 = mg")
      table.insert(lines, "             => 3k*U1 - 2k*U2 = mg")
      table.insert(lines, "  dΠ/dU2 = 0 => 2k*U2 - 2k*U1 = mg")
      table.insert(lines, "             => -2k*U1 + 2k*U2 = mg")
    elseif option == 4 then
      table.insert(lines, "Forças nas molas:")
      table.insert(lines, "  Força na mola 1:")
      table.insert(lines, "  F^(1) = k*U1")
      table.insert(lines, "        = k * (2*mg/k)")
      table.insert(lines, "        = 2*mg")
      table.insert(lines, "  Força na mola 2:")
      table.insert(lines, "  F^(2) = 2k * (U2 - U1)")
      table.insert(lines, "        = 2k * (5*mg/(2*k) - 2*mg/k)")
      table.insert(lines, "        = mg")
    end
    return lines
  end

  if option == 1 or option == 2 or option == 4 then
    local u, err = solveDisplacements(state)
    if not u then
      table.insert(lines, "Sistema global:")
      table.insert(lines, "[K]{U} = {F}")
      local K = assembleK(state)
      for _, line in ipairs(Matrix.formatLines(K)) do
        table.insert(lines, line)
      end
      table.insert(lines, "")
      local F = assembleF(state)
      for _, line in ipairs(Matrix.vectorFormatLines(F)) do
        table.insert(lines, line)
      end
      table.insert(lines, "")
      table.insert(lines, "Resolução automática indisponível: " .. err)
      return lines
    end

    if option == 1 then
      table.insert(lines, "Deslocamentos globais:")
      for i = 1, #u do
        table.insert(lines, "U" .. i .. " = " .. Expr.toString(u[i]))
      end
    elseif option == 2 then
      table.insert(lines, "Π = Ue - W")
      table.insert(lines, "Ue = 1/2 * U^T [K] U")
      table.insert(lines, "W = U^T {F}")
      table.insert(lines, "(Substituindo deslocamentos e forças):")
      
      local K = assembleK(state)
      local F = assembleF(state)
      
      local coeff_P2 = 0
      local coeff_P_mg = 0
      local coeff_mg2 = 0

      for i = 1, #u do
        local ui_P = Expr.getCoeff(u[i], "P/k")
        local ui_mg = Expr.getCoeff(u[i], "mg/k")
        
        local Fi_P = Expr.getCoeff(F[i], "P")
        local Fi_mg = Expr.getCoeff(F[i], "mg")

        coeff_P2 = coeff_P2 + ui_P * Fi_P
        coeff_P_mg = coeff_P_mg + ui_P * Fi_mg + ui_mg * Fi_P
        coeff_mg2 = coeff_mg2 + ui_mg * Fi_mg
      end

      local function formatQuadratic(c_P2, c_P_mg, c_mg2)
        local parts = {}
        local function addPart(val, label)
          if math.abs(val) > 1e-9 then
            local sign = val < 0 and "-" or "+"
            local absVal = math.abs(val)
            local coefStr = exprFormatNumber(absVal)
            table.insert(parts, { sign = sign, text = coefStr .. " * " .. label })
          end
        end
        addPart(c_P2, "P^2/k")
        addPart(c_P_mg, "P*mg/k")
        addPart(c_mg2, "(mg)^2/k")
        
        if #parts == 0 then return "0" end
        local out = ""
        for idx, p in ipairs(parts) do
          if idx == 1 then
            if p.sign == "-" then
              out = "-" .. p.text
            else
              out = p.text
            end
          else
            out = out .. " " .. p.sign .. " " .. p.text
          end
        end
        return out
      end

      local ueStr = formatQuadratic(0.5 * coeff_P2, 0.5 * coeff_P_mg, 0.5 * coeff_mg2)
      local wStr = formatQuadratic(coeff_P2, coeff_P_mg, coeff_mg2)
      local piStr = formatQuadratic(-0.5 * coeff_P2, -0.5 * coeff_P_mg, -0.5 * coeff_mg2)

      table.insert(lines, "Ue = " .. ueStr)
      table.insert(lines, "W = " .. wStr)
      table.insert(lines, "Π = Ue - W = " .. piStr)
    elseif option == 4 then
      table.insert(lines, "Forças nas molas:")
      for e = 1, state.nSpring do
        local s = state.springs[e]
        table.insert(lines, "--- Mola " .. e .. " ---")
        table.insert(lines, "Relações constitutivas:")
        table.insert(lines, "  f = k * δ")
        table.insert(lines, "  δ = u2 - u1")
        table.insert(lines, "Identificação dos deslocamentos:")
        local u1Name = s.i > 0 and ("U" .. s.i) or "0"
        local u2Name = s.j > 0 and ("U" .. s.j) or "0"
        table.insert(lines, "  u1 = " .. u1Name)
        table.insert(lines, "  u2 = " .. u2Name)
        
        local u1Val = s.i > 0 and u[s.i] or Expr.new()
        local u2Val = s.j > 0 and u[s.j] or Expr.new()
        local fi = Expr.sub(u2Val, u1Val)
        local forceExpr = Expr.scale(fi, s.k or 0)
        
        table.insert(lines, "Substituindo deslocamentos:")
        table.insert(lines, "  u1 = " .. Expr.toString(u1Val))
        table.insert(lines, "  u2 = " .. Expr.toString(u2Val))
        table.insert(lines, "  δ = " .. Expr.toString(u2Val) .. " - (" .. Expr.toString(u1Val) .. ") = " .. Expr.toString(fi))
        table.insert(lines, "Força na Mola " .. e .. ":")
        table.insert(lines, "  f = " .. (s.k or 1) .. "k * (" .. Expr.toString(fi) .. ")")
        table.insert(lines, "    = " .. Expr.toString(forceExpr))
        table.insert(lines, "")
      end
    end
  elseif option == 3 then
    table.insert(lines, "Equações de minimização:")
    for i = 1, state.nMass do
      table.insert(lines, "dΠ/dU" .. i .. " = 0  =>  K_" .. i .. "j * U_j = F_" .. i)
    end
  end

  return lines
end

local function buildDefLines(state)
  local lines = {}
  local option = state.defOption or 1
  local options = {
    "Deslocamentos nodais",
    "Energia potencial total (Π)",
    "Equações de minimização",
    "Força em cada mola"
  }

  table.insert(lines, "Opções:")
  for i, name in ipairs(options) do
    local cursor = (i == option) and "> " or "  "
    local selected = state.defSelected and state.defSelected[i]
    local marker = selected and "* " or "  "
    table.insert(lines, cursor .. marker .. name)
  end
  table.insert(lines, "")

  local optLines = buildDefOptionLines(state, option)
  for _, l in ipairs(optLines) do
    table.insert(lines, l)
  end

  return lines
end

local function buildMcTableLines(state)
  local lines = {}
  table.insert(lines, "**Tabela de conectividade (m.c.):")
  table.insert(lines, "| Mola | i | j | k |")
  for i = 1, state.nSpring do
    local s = state.springs[i]
    local row = "|  " .. i .. "   | " .. tostring(s.i) .. " | " .. tostring(s.j) .. " | " .. tostring(s.k) .. "k |"
    table.insert(lines, row)
  end
  table.insert(lines, "")
  table.insert(lines, "| Massa | m |")
  for i = 1, state.nMass do
    table.insert(lines, "|   " .. i .. "   | " .. tostring(state.masses[i]) .. "m |")
  end
  table.insert(lines, "(i=0 ou j=0 representa apoio fixo)")
  return lines
end

local function buildForceTableLines(state)
  local lines = {}
  table.insert(lines, "**Vetor de forças globais {F}:")
  for i = 1, state.nMass do
    local f = state.forces[i]
    table.insert(lines, "F" .. i .. " = " .. tostring(f.P) .. " P + " .. tostring(f.mg) .. " mg")
  end
  return lines
end

-- ======================== MAIN TAB REGISTRATION ========================
function Mola.start()
  local state = storage.load("Mola_state", defaultState())
  ensureSizes(state)

  local mcTab = { title = "m.c." }
  
  local function getCellValue(row, col)
    if col <= 3 then
      local s = state.springs[row]
      if not s then return nil end
      if col == 1 then return s.i
      elseif col == 2 then return s.j
      elseif col == 3 then return s.k
      end
    else
      return state.masses[row]
    end
    return nil
  end

  local function commitTab1Cell()
    if state.tab1SelRow == nil or state.tab1SelCol == nil then return false end
    if state.tab1EditText == nil then return true end

    local text = trim(state.tab1EditText)
    text = text:gsub(",", ".")
    local val = tonumber(text)

    local row = state.tab1SelRow
    local col = state.tab1SelCol

    if col == 1 or col == 2 then
      if text == "" then
        state.springs[row][col == 1 and "i" or "j"] = 0
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val < 0 or val > state.nMass then
        state.message = "GDL deve estar entre 0 e " .. tostring(state.nMass)
        return false
      end
      state.springs[row][col == 1 and "i" or "j"] = math.floor(val + 0.5)
    elseif col == 3 then
      if text == "" then
        state.springs[row].k = 1
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val <= 0 then
        state.message = "k deve ser positivo"
        return false
      end
      state.springs[row].k = val
    elseif col == 4 then
      if text == "" then
        state.masses[row] = 1
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val <= 0 then
        state.message = "Massa deve ser positiva"
        return false
      end
      state.masses[row] = val
    end

    state.tab1EditText = nil
    state.message = "Célula atualizada."
    saveState(state)
    return true
  end

  local function ensureTab1SelectionVisible(h)
    local cellTop = 0
    if state.tab1SelCol <= 3 then
      cellTop = 50 + 14 + 18 + (state.tab1SelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nSpring * 18
      cellTop = 50 + topTableH + 8 + 14 + 18 + (state.tab1SelRow - 1) * 18
    end
    local cellBottom = cellTop + 18
    local scroll = state.tab1ScrollPx or 0
    if cellTop - scroll < 50 then
      scroll = cellTop - 50
    elseif cellBottom - scroll > h then
      scroll = cellBottom - h
    end
    local totalH = 50 + (14 + 18 + state.nSpring * 18) + 8 + (14 + 18 + state.nMass * 18)
    state.tab1ScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  function mcTab:render(gc, x, y, w, h, app)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 10)
    gc:drawString("Mola - Identificação GDL e m.c.", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Molas:", x, y + 14, "top")
    gc:setColorRGB(200, 0, 0)
    gc:drawString(tostring(state.nSpring), x + 35, y + 14, "top")
    gc:setColorRGB(20, 20, 20)
    gc:drawString("GDL:", x + 65, y + 14, "top")
    gc:setColorRGB(0, 70, 190)
    gc:drawString(tostring(state.nMass), x + 90, y + 14, "top")

    local bx = x + w - 110
    drawButton(gc, bx, y, 50, 15, "+Mola", false)
    drawButton(gc, bx + 54, y, 50, 15, "-Mola", false)
    drawButton(gc, bx, y + 17, 22, 15, "-G", false)
    drawButton(gc, bx + 24, y + 17, 22, 15, "+G", false)

    clearHits()
    addHit("add_mola", bx, y, 50, 15)
    addHit("rem_mola", bx + 54, y, 50, 15)
    addHit("ng_minus", bx, y + 17, 22, 15)
    addHit("ng_plus", bx + 24, y + 17, 22, 15)

    -- Status Message
    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.tab1ScrollPx or 0
    local topCols = {
      { label = "i", col = 1, w = 45 },
      { label = "j", col = 2, w = 45 },
      { label = "k", col = 3, w = 60 }
    }
    local bottomCols = {
      { label = "m", col = 4, w = 60 }
    }

    local topY = y + 50 - scrollPx
    molas_drawMcSection(gc, x, topY, "Molas (i - j - k):", topCols, state.nSpring, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
    
    local topTableH = 14 + 18 + state.nSpring * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    molas_drawMcSection(gc, x, bottomY, "Massas (m):", bottomCols, state.nMass, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
  end

  function molas_drawMcSection(gc, x, y, title, cols, rowCount, selRow, selCol, editText, getVal)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 9)
    gc:drawString(title, x, y, "top")
    gc:setFont("sansserif", "r", 9)

    local headerY = y + 14
    local totalW = 18
    for i = 1, #cols do totalW = totalW + cols[i].w end

    gc:setColorRGB(240, 240, 240)
    gc:fillRect(x, headerY, totalW, 18)
    gc:setColorRGB(110, 110, 110)
    gc:drawRect(x, headerY, totalW, 18)
    gc:setColorRGB(20, 20, 20)
    gc:drawString("#", x + 5, headerY + 2, "top")

    local cx = x + 18
    for i = 1, #cols do
      local col = cols[i]
      gc:drawRect(cx, headerY, col.w, 18)
      gc:drawString(col.label, cx + 2, headerY + 2, "top")
      cx = cx + col.w
    end

    local rowY0 = headerY + 18
    for r = 1, rowCount do
      local yy = rowY0 + (r - 1) * 18
      gc:setColorRGB(255, 255, 255)
      gc:fillRect(x, yy, totalW, 18)
      gc:setColorRGB(170, 170, 170)
      gc:drawRect(x, yy, totalW, 18)
      gc:setColorRGB(20, 20, 20)
      gc:setFont("sansserif", "b", 9)
      gc:drawString(tostring(r), x + 4, yy + 2, "top")
      gc:setFont("sansserif", "r", 9)

      local ccx = x + 18
      for i = 1, #cols do
        local col = cols[i]
        local selected = (selRow == r and selCol == col.col)
        if selected then
          gc:setColorRGB(225, 240, 255)
          gc:fillRect(ccx + 1, yy + 1, col.w - 2, 16)
        end
        gc:setColorRGB(120, 120, 120)
        gc:drawRect(ccx, yy, col.w, 18)
        local text
        if selected and editText ~= nil then
          text = editText
        else
          text = fmtCell(getVal(r, col.col))
        end
        gc:setColorRGB(15, 15, 15)
        gc:drawString(clipTextToWidth(gc, text, col.w - 6), ccx + 2, yy + 2, "top")
        if selected then
          gc:setColorRGB(30, 90, 170)
          gc:drawRect(ccx, yy, col.w, 18)
        end
        addHit("mc_cell", ccx, yy, col.w, 18, { row = r, col = col.col })
        ccx = ccx + col.w
      end
    end
  end

  function mcTab:handleKey(key, app)
    if state.tab1EditText ~= nil then
      if not commitTab1Cell() then
        return true
      end
    end

    local row = state.tab1SelRow or 1
    local col = state.tab1SelCol or 1

    if key == keys.up then
      if col <= 3 then
        if row > 1 then
          row = row - 1
        else
          col = 4
          row = state.nMass
        end
      else
        if row > 1 then
          row = row - 1
        else
          col = 3
          row = state.nSpring
        end
      end
    elseif key == keys.down then
      if col <= 3 then
        if row < state.nSpring then
          row = row + 1
        else
          col = 4
          row = 1
        end
      else
        if row < state.nMass then
          row = row + 1
        else
          col = 1
          row = 1
        end
      end
    elseif key == keys.left then
      if col > 1 and col <= 3 then
        col = col - 1
      elseif col == 4 then
        col = 3
        row = math.min(row, state.nSpring)
      end
    elseif key == keys.right then
      if col < 3 then
        col = col + 1
      elseif col == 3 then
        col = 4
        row = math.min(row, state.nMass)
      end
    elseif key == keys.enter then
      local val = getCellValue(row, col)
      state.tab1EditText = val and tostring(val) or ""
      return true
    else
      return false
    end

    state.tab1SelRow = row
    state.tab1SelCol = col
    ensureTab1SelectionVisible(app.height - app.tabHeight - 12)
    return true
  end

  function mcTab:charIn(ch, app)
    if state.tab1SelRow == nil then return false end
    if ch:match("[0-9%+%-%.,eE]") then
      if state.tab1EditText == nil then state.tab1EditText = "" end
      state.tab1EditText = state.tab1EditText .. ch
      return true
    end
    return false
  end

  function mcTab:backspaceKey(app)
    if state.tab1SelRow == nil then return false end
    if state.tab1EditText ~= nil and #state.tab1EditText > 0 then
      state.tab1EditText = string.sub(state.tab1EditText, 1, #state.tab1EditText - 1)
      return true
    end
    return false
  end

  function mcTab:escapeKey(app)
    if state.tab1EditText ~= nil then
      state.tab1EditText = nil
      state.message = "Edição cancelada."
      return true
    end
    return false
  end

  function mcTab:handleMouseDown(x, y, app)
    local hit = hitAt(x, y)
    if not hit then return end

    if hit.id == "mc_cell" then
      if state.tab1EditText ~= nil then
        commitTab1Cell()
      end
      state.tab1SelRow = hit.data.row
      state.tab1SelCol = hit.data.col
    elseif hit.id == "add_mola" then
      if state.nSpring < 6 then
        state.nSpring = state.nSpring + 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "rem_mola" then
      if state.nSpring > 1 then
        state.nSpring = state.nSpring - 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "ng_minus" then
      if state.nMass > 1 then
        state.nMass = state.nMass - 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "ng_plus" then
      if state.nMass < 6 then
        state.nMass = state.nMass + 1
        ensureSizes(state)
        saveState(state)
      end
    end
  end

  local ksTab = { title = "Ks" }
  function ksTab:getLines()
    return buildKsLines(state)
  end

  local kTab = { title = "[K]" }
  function kTab:getLines()
    local K = assembleK(state)
    local M = assembleM(state)
    local lines = { "[K] global:" }
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "[M] global:")
    for _, line in ipairs(Matrix.formatLines(M)) do
      table.insert(lines, line)
    end
    return lines
  end

  local fTab = { title = "{F}" }

  local function commitForceCell()
    if state.forceSelRow == nil or state.forceSelCol == nil then return false end
    if state.forceEditText == nil then return true end

    local text = trim(state.forceEditText)
    text = text:gsub(",", ".")
    local val = tonumber(text)

    local row = state.forceSelRow
    local col = state.forceSelCol

    if text == "" then
      if col == 1 then state.forces[row].P = 0 else state.forces[row].mg = 0 end
      state.forceEditText = nil
      saveState(state)
      return true
    end

    if val == nil then
      state.message = "Valor de força inválido."
      return false
    end

    if col == 1 then
      state.forces[row].P = val
    else
      state.forces[row].mg = val
    end

    state.forceEditText = nil
    state.message = "Força atualizada."
    saveState(state)
    return true
  end

  function fTab:render(gc, x, y, w, h, app)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 10)
    gc:drawString("Forças Nodais Aplicadas {F}", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Nota: Edite as componentes simbólicas P e mg.", x, y + 14, "top")

    -- Status Message
    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 28, "top")

    local cols = {
      { label = "Componente P", col = 1, w = 80 },
      { label = "Componente mg", col = 2, w = 80 }
    }

    local headerY = y + 42
    local totalW = 18 + 80 + 80
    gc:setColorRGB(240, 240, 240)
    gc:fillRect(x, headerY, totalW, 18)
    gc:setColorRGB(110, 110, 110)
    gc:drawRect(x, headerY, totalW, 18)
    gc:setColorRGB(20, 20, 20)
    gc:drawString("#", x + 5, headerY + 2, "top")

    local cx = x + 18
    for i = 1, #cols do
      gc:drawRect(cx, headerY, cols[i].w, 18)
      gc:drawString(cols[i].label, cx + 2, headerY + 2, "top")
      cx = cx + cols[i].w
    end

    clearHits()
    local rowY0 = headerY + 18
    for r = 1, state.nMass do
      local yy = rowY0 + (r - 1) * 18
      gc:setColorRGB(255, 255, 255)
      gc:fillRect(x, yy, totalW, 18)
      gc:setColorRGB(170, 170, 170)
      gc:drawRect(x, yy, totalW, 18)
      gc:setColorRGB(20, 20, 20)
      gc:drawString("F" .. r, x + 4, yy + 2, "top")

      local ccx = x + 18
      for i = 1, #cols do
        local col = cols[i]
        local selected = (state.forceSelRow == r and state.forceSelCol == col.col)
        if selected then
          gc:setColorRGB(225, 240, 255)
          gc:fillRect(ccx + 1, yy + 1, col.w - 2, 16)
        end
        gc:setColorRGB(120, 120, 120)
        gc:drawRect(ccx, yy, col.w, 18)
        
        local text
        if selected and state.forceEditText ~= nil then
          text = state.forceEditText
        else
          local f = state.forces[r]
          text = f and tostring(col.col == 1 and f.P or f.mg) or "0"
        end

        gc:setColorRGB(15, 15, 15)
        gc:drawString(clipTextToWidth(gc, text, col.w - 6), ccx + 2, yy + 2, "top")
        if selected then
          gc:setColorRGB(30, 90, 170)
          gc:drawRect(ccx, yy, col.w, 18)
        end
        addHit("force_cell", ccx, yy, col.w, 18, { row = r, col = col.col })
        ccx = ccx + col.w
      end
    end
  end

  function fTab:handleKey(key, app)
    if state.forceEditText ~= nil then
      if not commitForceCell() then
        return true
      end
    end

    local row = state.forceSelRow or 1
    local col = state.forceSelCol or 1

    if key == keys.up then
      if row > 1 then
        row = row - 1
      else
        row = state.nMass
      end
    elseif key == keys.down then
      if row < state.nMass then
        row = row + 1
      else
        row = 1
      end
    elseif key == keys.left then
      col = 1
    elseif key == keys.right then
      col = 2
    elseif key == keys.enter then
      local f = state.forces[row]
      local val = f and (col == 1 and f.P or f.mg) or 0
      state.forceEditText = tostring(val)
      return true
    else
      return false
    end

    state.forceSelRow = row
    state.forceSelCol = col
    return true
  end

  function fTab:charIn(ch, app)
    if state.forceSelRow == nil then return false end
    if ch:match("[0-9%+%-%.,eE]") then
      if state.forceEditText == nil then state.forceEditText = "" end
      state.forceEditText = state.forceEditText .. ch
      return true
    end
    return false
  end

  function fTab:backspaceKey(app)
    if state.forceSelRow == nil then return false end
    if state.forceEditText ~= nil and #state.forceEditText > 0 then
      state.forceEditText = string.sub(state.forceEditText, 1, #state.forceEditText - 1)
      return true
    end
    return false
  end

  function fTab:escapeKey(app)
    if state.forceEditText ~= nil then
      state.forceEditText = nil
      state.message = "Edição cancelada."
      return true
    end
    return false
  end

  function fTab:handleMouseDown(x, y, app)
    local hit = hitAt(x, y)
    if not hit then return end

    if hit.id == "force_cell" then
      if state.forceEditText ~= nil then
        commitForceCell()
      end
      state.forceSelRow = hit.data.row
      state.forceSelCol = hit.data.col
    end
  end

  local function vectorToNumericMatrix(vec)
    local a = {}
    for i = 1, #vec do
      local e = vec[i]
      local v = 0
      if type(e) == "number" then
        v = e
      elseif type(e) == "table" and e.const then
        v = e.const or 0
        for _, coef in pairs(e.terms or {}) do
          v = v + coef
        end
      end
      a[i] = { v }
    end
    return a
  end

  local function storeOptionSequential(state, option, varName)
    -- Delete old sequential variables
    for j = 1, 150 do
      pcall(function() math.eval("DelVar " .. varName .. tostring(j)) end)
    end
    pcall(function() math.eval("DelVar " .. varName) end)

    local steps = {}
    local exNum = mola_detectExercise(state)
    if exNum == 14 then
      local lines = buildDefOptionLines(state, option)
      table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
    elseif option == 1 or option == 2 or option == 4 then
      local u, err = solveDisplacements(state)
      if not u then
        table.insert(steps, { type = "string", value = "Sistema global:\n[K]{U} = {F}\n\nMatriz de rigidez global [K] (em termos de k):" })
        local K = assembleK(state)
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças {F} (em termos de P, mg):" })
        local F = assembleF(state)
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução automática indisponível: " .. err })
      elseif option == 1 then
        local K = assembleK(state)
        local F = assembleF(state)
        table.insert(steps, { type = "string", value = "Matriz de rigidez global [K] (em termos de k):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças globais {F} (em termos de P, mg):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução dos Deslocamentos U (em termos de P/k, mg/k):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u) })
        local dispLines = {}
        for i = 1, #u do
          table.insert(dispLines, "U" .. i .. " = " .. Expr.toString(u[i]))
        end
        table.insert(steps, { type = "string", value = table.concat(dispLines, "\n") })
      elseif option == 2 then
        local K = assembleK(state)
        local F = assembleF(state)
        table.insert(steps, { type = "string", value = "Energia Potencial Total Π = Ue - W\nUe = 1/2 * U^T [K] U\nW = U^T {F}\n\nMatriz de rigidez [K] (em termos de k):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de deslocamentos {U} (em termos de P/k, mg/k):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u) })
        table.insert(steps, { type = "string", value = "Vetor de forças {F} (em termos de P, mg):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        local lines = buildDefOptionLines(state, 2)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      else
        local lines = buildDefOptionLines(state, option)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      end
    else
      local lines = buildDefOptionLines(state, option)
      table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
    end

    for i = 1, #steps do
      local step = steps[i]
      var.store(varName .. tostring(i), step.value)
    end
  end

  storeGlobalVariables = function(state)
    if not (var and var.store) then return end

    -- 1. Step-by-step resolution of K's (m_ks)
    local ksLines = buildKsLines(state)
    var.store("m_ks", table.concat(ksLines, "\n"))

    -- 2. Global stiffness matrix K (m_kmatrix) as a math matrix (numeric)
    local K = assembleK(state)
    local K_num = Matrix.toNumericFull(K)
    var.store("m_kmatrix", K_num)

    -- 3. Global mass matrix M (m_mmatrix) as a math matrix (numeric)
    local M = assembleM(state)
    local M_num = Matrix.toNumericFull(M)
    var.store("m_mmatrix", M_num)

    -- 4. Options in Def tab
    local optionNames = { "m_desln", "m_epot", "m_eqmin", "m_forcam" }
    for i = 1, #optionNames do
      local varName = optionNames[i]
      if state.defSelected and state.defSelected[i] then
        storeOptionSequential(state, i, varName)
      else
        for j = 1, 150 do
          pcall(function() math.eval("DelVar " .. varName .. tostring(j)) end)
        end
        pcall(function() math.eval("DelVar " .. varName) end)
      end
    end

    -- 5. Mega-string: full resolution in one variable (m_resolucao)
    -- Text-only: matrices are stored separately as real matrix objects.
    -- In Notes, use each matrix variable directly for proper matrix display.
    local totalLines = {}
    local exNum = mola_detectExercise(state)
    if exNum then
      table.insert(totalLines, "=== Exercicio " .. exNum .. " (Sebenta) ===")
      table.insert(totalLines, "")
    end
    table.insert(totalLines, "=== TABELA DE CONECTIVIDADE ===")
    for _, line in ipairs(buildMcTableLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== Ks (RIGIDEZ DE CADA ELEMENTO) ===")
    for _, line in ipairs(buildKsLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== [K] GLOBAL ===")
    table.insert(totalLines, "  >> Ver variavel: m_kmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== [M] GLOBAL ===")
    table.insert(totalLines, "  >> Ver variavel: m_mmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== FORCAS APLICADAS ===")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== RESOLUCAO (DEF) ===")
    local defOptions = {
      "Deslocamentos nodais",
      "Energia potencial total (Pi)",
      "Equacoes de minimizacao",
      "Forca em cada mola"
    }
    local hasSelected = false
    for i = 1, #defOptions do
      if state.defSelected and state.defSelected[i] then
        hasSelected = true
        table.insert(totalLines, "--- " .. defOptions[i] .. " ---")
        for _, line in ipairs(buildDefOptionLines(state, i)) do
          table.insert(totalLines, line)
        end
        table.insert(totalLines, "")
      end
    end
    if not hasSelected then
      table.insert(totalLines, "(Nenhuma opcao selecionada em Def)")
    end
    var.store("m_resolucao", table.concat(totalLines, "\n"))
  end

  local defTab = { title = "Def" }
  function defTab:getLines()
    return buildDefLines(state)
  end
  function defTab:handleKey(key)
    if key == keys.up then
      state.defOption = math.max(1, (state.defOption or 1) - 1)
      saveState(state)
      return true
    elseif key == keys.down then
      state.defOption = math.min(4, (state.defOption or 1) + 1)
      saveState(state)
      return true
    elseif key == keys.enter then
      local opt = state.defOption or 1
      state.defSelected = state.defSelected or {}
      state.defSelected[opt] = not state.defSelected[opt]
      saveState(state)
      return true
    end
    return false
  end

  local copiaTab = { title = "Copia" }
  function copiaTab:getLines()
    local lines = {}
    local exNum = mola_detectExercise(state)
    if exNum then
      table.insert(lines, "**Exercicio " .. exNum .. " (Sebenta)")
      table.insert(lines, "")
    end
    for _, line in ipairs(buildMcTableLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**Ks")
    for _, line in ipairs(buildKsLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**[K] e [M]")
    local K = assembleK(state)
    local M = assembleM(state)
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    for _, line in ipairs(Matrix.formatLines(M)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    local F = assembleF(state)
    for _, line in ipairs(Matrix.vectorFormatLines(F)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**Def")
    
    local options = {
      "Deslocamentos nodais",
      "Energia potencial total (Π)",
      "Equações de minimização",
      "Força em cada mola"
    }
    local hasSelected = false
    for i = 1, #options do
      if state.defSelected and state.defSelected[i] then
        hasSelected = true
        table.insert(lines, "**--- " .. options[i] .. " ---")
        for _, line in ipairs(buildDefOptionLines(state, i)) do
          table.insert(lines, line)
        end
        table.insert(lines, "")
      end
    end
    if not hasSelected then
      table.insert(lines, "(Nenhuma opção selecionada em Def)")
    end
    
    return lines
  end

  local app = ui.newApp("Mola", { mcTab, ksTab, kTab, fTab, defTab, copiaTab })
  ui.bind(app)

  -- Automatically store/populate variables on startup
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

if not _G.__TI_MAINMENU__ then
  Mola.start()
end

return Mola
