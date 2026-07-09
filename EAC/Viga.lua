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
  if type(v) == "string" then return v end
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
    height = 240,
    cachedLines = {}
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

  function app:clearCache()
    self.cachedLines = {}
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

    if not self.cachedLines then self.cachedLines = {} end
    local lines = self.cachedLines[self.active]
    if not lines then
      if tab.getLines then
        lines = tab:getLines(self)
      else
        lines = {}
      end
      self.cachedLines[self.active] = lines
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
        self:clearCache()
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
      if ch ~= "s" and ch ~= "S" and ch ~= "w" and ch ~= "W" then
        self:clearCache()
      end
      if platform and platform.window then platform.window:invalidate() end
    end
  end

  function app:backspaceKey()
    local tab = self:getActiveTab()
    if tab.backspaceKey and tab:backspaceKey(self) then
      self:clearCache()
      if platform and platform.window then platform.window:invalidate() end
    end
  end

  function app:escapeKey()
    local tab = self:getActiveTab()
    if tab.escapeKey and tab:escapeKey(self) then
      self:clearCache()
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
      self:clearCache()
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

-- ======================== BEAM MATH UTILITIES ========================
local function asNum(s, default)
  local t = trim(s)
  if t == "" then return default end
  t = t:gsub(",", ".")
  local v = tonumber(t)
  if v == nil then return default end
  return v
end

-- ======================== VIGA FEA ENGINE ========================
local Viga = {}

local function defaultState()
  return {
    nElem = 1,
    nDof = 4,
    elems = {
      { dofs = { 1, 2, 3, 4 }, L = 1, E = 1, I = 1, A = 1, p0 = 0, pL = 0, py = "" }
    },
    forces = { 0, 0, 0, 0 },
    defOption = 1,
    defElem = 1,
    defX = 0.5,
    tab1SelRow = 1,
    tab1SelCol = 1,
    tab1ScrollPx = 0,
    forceSelRow = 1,
    forceSelCol = 1,
    forceScrollPx = 0,
    message = "Setas navegam nas células. Enter para editar."
  }
end

local function ensureSizes(state)
  if state.nElem == nil then state.nElem = 1 end
  if state.nDof == nil then state.nDof = 2 end
  if state.nElem < 1 then state.nElem = 1 end
  if state.nElem > 6 then state.nElem = 6 end
  if state.nDof < 1 then state.nDof = 1 end
  if state.nDof > 24 then state.nDof = 24 end

  state.elems = state.elems or {}
  for i = 1, state.nElem do
    if state.elems[i] == nil then
      state.elems[i] = { dofs = { 1, 2, 3, 4 }, L = 1, E = 1, I = 1, A = 1, p0 = 0, pL = 0, py = "" }
    end
    state.elems[i].dofs = state.elems[i].dofs or { 1, 2, 3, 4 }
    for k = 1, 4 do
      if state.elems[i].dofs[k] == nil or state.elems[i].dofs[k] > state.nDof or state.elems[i].dofs[k] < 0 then
        state.elems[i].dofs[k] = 0
      end
    end
    if state.elems[i].p0 == nil then state.elems[i].p0 = state.elems[i].p or 0 end
    if state.elems[i].pL == nil then state.elems[i].pL = 0 end
    if state.elems[i].py == nil then state.elems[i].py = "" end
  end
  for i = state.nElem + 1, #state.elems do
    state.elems[i] = nil
  end

  state.forces = state.forces or {}
  for i = 1, state.nDof do
    if state.forces[i] == nil then
      state.forces[i] = 0
    end
  end
  for i = state.nDof + 1, #state.forces do
    state.forces[i] = nil
  end

  if state.defOption == nil then state.defOption = 1 end
  if state.defActiveOption == nil then state.defActiveOption = 1 end
  if state.defElem == nil then state.defElem = 1 end
  if state.defX == nil then state.defX = 0.5 end
  if state.forceSelRow == nil then state.forceSelRow = 1 end
  if state.forceSelCol == nil then state.forceSelCol = 1 end
  if state.tab1SelRow == nil then state.tab1SelRow = 1 end
  if state.tab1SelCol == nil then state.tab1SelCol = 1 end
end

local storeGlobalVariables

local function saveState(state)
  storage.save("Viga_state", state)
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

local function addEquivalentLoad(F, dofs, fVal, base)
  for i = 1, 4 do
    local g = dofs[i]
    if g and g > 0 and g <= #F then
      Expr.addInplace(F[g], fVal[i], base)
    end
  end
end

local function getRefs(state)
  return 1, 1
end

local getElementI
local getInertiaSubstitution

local function vigaElementStiffnessText(state, e, i, j, coef, L)
  local el = state.elems[e]
  local E_elem = el.E or 1
  local I_elem = getElementI(el, state)
  local EI_num = E_elem * I_elem

  local is_i_rot = (i == 2 or i == 4)
  local is_j_rot = (j == 2 or j == 4)

  local coef_base = coef
  local L_power = 3
  if is_i_rot and is_j_rot then
    coef_base = coef / (L * L)
    L_power = 1
  elseif is_i_rot or is_j_rot then
    coef_base = coef / L
    L_power = 2
  end

  local num = coef_base * EI_num
  local numStr = ""
  if math.abs(num - 1) < 1e-9 then
    numStr = "EI"
  elseif math.abs(num + 1) < 1e-9 then
    numStr = "-EI"
  else
    numStr = exprFormatNumber(num) .. "*EI"
  end

  local denStr = ""
  local L_str = "L"
  if math.abs(L - 1) >= 1e-9 then
    L_str = "(" .. exprFormatNumber(L) .. "L)"
  end

  if L_power == 1 then
    denStr = L_str
  else
    denStr = L_str .. "^" .. L_power
  end

  local factorStr = numStr .. "/" .. denStr
  return "k" .. i .. j .. "_b" .. e, factorStr
end

local function assembleKNumeric(state)
  local n = state.nDof
  local Kbar = {}
  for i = 1, n do
    Kbar[i] = {}
    for j = 1, n do
      Kbar[i][j] = 0
    end
  end

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    if L == 0 then
      -- It is a spring!
      local K_spring = el.E or 1
      
      -- Translational spring: dofs[1] and dofs[3]
      local t1 = el.dofs[1]
      local t2 = el.dofs[3]
      if t1 and t1 > 0 and t1 <= n then
        Kbar[t1][t1] = Kbar[t1][t1] + K_spring
      end
      if t2 and t2 > 0 and t2 <= n then
        Kbar[t2][t2] = Kbar[t2][t2] + K_spring
      end
      if t1 and t1 > 0 and t1 <= n and t2 and t2 > 0 and t2 <= n then
        Kbar[t1][t2] = Kbar[t1][t2] - K_spring
        Kbar[t2][t1] = Kbar[t2][t1] - K_spring
      end

      -- Rotational spring: dofs[2] and dofs[4]
      local r1 = el.dofs[2]
      local r2 = el.dofs[4]
      if r1 and r1 > 0 and r1 <= n then
        Kbar[r1][r1] = Kbar[r1][r1] + K_spring
      end
      if r2 and r2 > 0 and r2 <= n then
        Kbar[r2][r2] = Kbar[r2][r2] + K_spring
      end
      if r1 and r1 > 0 and r1 <= n and r2 and r2 > 0 and r2 <= n then
        Kbar[r1][r2] = Kbar[r1][r2] - K_spring
        Kbar[r2][r1] = Kbar[r2][r1] - K_spring
      end
    else
      local factor = (el.E or 1) * getElementI(el, state) / (L * L * L)

      local k = {
        { 12, 6 * L, -12, 6 * L },
        { 6 * L, 4 * L * L, -6 * L, 2 * L * L },
        { -12, -6 * L, 12, -6 * L },
        { 6 * L, 2 * L * L, -6 * L, 4 * L * L }
      }

      for i = 1, 4 do
        local gi = el.dofs[i]
        if gi and gi > 0 and gi <= n then
          for j = 1, 4 do
            local gj = el.dofs[j]
            if gj and gj > 0 and gj <= n then
              Kbar[gi][gj] = Kbar[gi][gj] + factor * k[i][j]
            end
          end
        end
      end
    end
  end

  return Kbar
end

local function assembleK(state)
  local n = state.nDof
  local K = Matrix.zeros(n, n)
  local steps = {}
  local L_ref, EI_ref = getRefs(state)

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    if L == 0 then
      -- It is a spring!
      local K_spring = el.E or 1

      local function getSpringBase(d1, d2)
        local is1_rot = (d1 and d1 > 0 and d1 % 2 == 0)
        local is2_rot = (d2 and d2 > 0 and d2 % 2 == 0)
        if d1 and d1 > 0 and d2 and d2 > 0 then
          if is1_rot and is2_rot then return "EI/L"
          elseif is1_rot or is2_rot then return "EI/L^2"
          else return "EI/L^3"
          end
        elseif d1 and d1 > 0 then
          return is1_rot and "EI/L" or "EI/L^3"
        elseif d2 and d2 > 0 then
          return is2_rot and "EI/L" or "EI/L^3"
        end
        return "EI/L^3"
      end

      -- Translational spring (dofs[1] and dofs[3])
      local t1 = el.dofs[1]
      local t2 = el.dofs[3]
      if t1 and t1 > 0 and t1 <= n then
        local base = getSpringBase(t1, nil)
        local expr = Expr.fromTerm(K_spring, base)
        Matrix.addExpr(K, t1, t1, expr)
        local key = t1 .. "," .. t1
        steps[key] = steps[key] or { symbols = {}, values = {} }
        table.insert(steps[key].symbols, "k_s" .. e)
        table.insert(steps[key].values, exprFormatNumber(K_spring) .. "*" .. base)
      end

      if t2 and t2 > 0 and t2 <= n then
        local base = getSpringBase(nil, t2)
        local expr = Expr.fromTerm(K_spring, base)
        Matrix.addExpr(K, t2, t2, expr)
        local key = t2 .. "," .. t2
        steps[key] = steps[key] or { symbols = {}, values = {} }
        table.insert(steps[key].symbols, "k_s" .. e)
        table.insert(steps[key].values, exprFormatNumber(K_spring) .. "*" .. base)
      end

      if t1 and t1 > 0 and t1 <= n and t2 and t2 > 0 and t2 <= n then
        local base = getSpringBase(t1, t2)
        local expr = Expr.fromTerm(-K_spring, base)
        Matrix.addExpr(K, t1, t2, expr)
        Matrix.addExpr(K, t2, t1, expr)
        
        local key1 = t1 .. "," .. t2
        steps[key1] = steps[key1] or { symbols = {}, values = {} }
        table.insert(steps[key1].symbols, "-k_s" .. e)
        table.insert(steps[key1].values, exprFormatNumber(-K_spring) .. "*" .. base)

        local key2 = t2 .. "," .. t1
        steps[key2] = steps[key2] or { symbols = {}, values = {} }
        table.insert(steps[key2].symbols, "-k_s" .. e)
        table.insert(steps[key2].values, exprFormatNumber(-K_spring) .. "*" .. base)
      end

      -- Rotational spring (dofs[2] and dofs[4])
      local r1 = el.dofs[2]
      local r2 = el.dofs[4]
      if r1 and r1 > 0 and r1 <= n then
        local base = getSpringBase(r1, nil)
        local expr = Expr.fromTerm(K_spring, base)
        Matrix.addExpr(K, r1, r1, expr)
        local key = r1 .. "," .. r1
        steps[key] = steps[key] or { symbols = {}, values = {} }
        table.insert(steps[key].symbols, "k_s" .. e)
        table.insert(steps[key].values, exprFormatNumber(K_spring) .. "*" .. base)
      end

      if r2 and r2 > 0 and r2 <= n then
        local base = getSpringBase(nil, r2)
        local expr = Expr.fromTerm(K_spring, base)
        Matrix.addExpr(K, r2, r2, expr)
        local key = r2 .. "," .. r2
        steps[key] = steps[key] or { symbols = {}, values = {} }
        table.insert(steps[key].symbols, "k_s" .. e)
        table.insert(steps[key].values, exprFormatNumber(K_spring) .. "*" .. base)
      end

      if r1 and r1 > 0 and r1 <= n and r2 and r2 > 0 and r2 <= n then
        local base = getSpringBase(r1, r2)
        local expr = Expr.fromTerm(-K_spring, base)
        Matrix.addExpr(K, r1, r2, expr)
        Matrix.addExpr(K, r2, r1, expr)
        
        local key1 = r1 .. "," .. r2
        steps[key1] = steps[key1] or { symbols = {}, values = {} }
        table.insert(steps[key1].symbols, "-k_s" .. e)
        table.insert(steps[key1].values, exprFormatNumber(-K_spring) .. "*" .. base)

        local key2 = r2 .. "," .. r1
        steps[key2] = steps[key2] or { symbols = {}, values = {} }
        table.insert(steps[key2].symbols, "-k_s" .. e)
        table.insert(steps[key2].values, exprFormatNumber(-K_spring) .. "*" .. base)
      end
    else
      local EI = (el.E or 1) * getElementI(el, state)
      local r_EI = EI / EI_ref
      local r_L = L_ref / L

      local k = {
        { 12, 6 * L, -12, 6 * L },
        { 6 * L, 4 * L * L, -6 * L, 2 * L * L },
        { -12, -6 * L, 12, -6 * L },
        { 6 * L, 2 * L * L, -6 * L, 4 * L * L }
      }

      for i = 1, 4 do
        local gi = el.dofs[i]
        if gi and gi > 0 and gi <= n then
          for j = 1, 4 do
            local gj = el.dofs[j]
            if gj and gj > 0 and gj <= n then
              local baseStr = "EI/L^3"
              local coeff = k[i][j] * r_EI * (r_L ^ 3)
              local is_i_rot = (i == 2 or i == 4)
              local is_j_rot = (j == 2 or j == 4)
              
              if is_i_rot and is_j_rot then
                baseStr = "EI/L"
                coeff = (k[i][j] / (L * L)) * r_EI * r_L
              elseif is_i_rot or is_j_rot then
                baseStr = "EI/L^2"
                coeff = (k[i][j] / L) * r_EI * (r_L ^ 2)
              end

              local expr = Expr.fromTerm(coeff, baseStr)
              Matrix.addExpr(K, gi, gj, expr)
              local key = gi .. "," .. gj
              steps[key] = steps[key] or { symbols = {}, values = {} }
              local sym, val = vigaElementStiffnessText(state, e, i, j, k[i][j], L)
              table.insert(steps[key].symbols, sym)
              table.insert(steps[key].values, val)
            end
          end
        end
      end
    end
  end

  return K, steps
end

local function parseExpr(str)
  str = str:gsub("%s+", "")
  -- Normalize TI-Nspire calculator multiply symbols to plain '*'
  str = str:gsub("\xC2\xB7", "*")
  str = str:gsub("\xC3\x97", "*")
  str = str:gsub("\xE2\x8B\x85", "*")
  local tokens = {}
  local pos = 1
  while pos <= #str do
    local char = str:sub(pos, pos)
    if char:match("[%d%.]") then
      local start = pos
      while pos <= #str and str:sub(pos, pos):match("[%d%.]") do
        pos = pos + 1
      end
      table.insert(tokens, { type = "number", val = tonumber(str:sub(start, pos - 1)) })
    elseif char:match("[a-zA-Z]") then
      local start = pos
      while pos <= #str and str:sub(pos, pos):match("[a-zA-Z0-9]") do
        pos = pos + 1
      end
      local name = str:sub(start, pos - 1)
      table.insert(tokens, { type = "variable", val = name })
    elseif char:match("[%+%-%*/%^%(%)]") then
      table.insert(tokens, { type = "operator", val = char })
      pos = pos + 1
    else
      pos = pos + 1
    end
  end

  local tIdx = 1
  local function peek() return tokens[tIdx] end
  local function get()
    local t = tokens[tIdx]
    tIdx = tIdx + 1
    return t
  end

  local expr

  local function primary()
    local t = get()
    if not t then return function(vars) return 0 end end
    if t.type == "number" then
      return function(vars) return t.val end
    elseif t.type == "variable" then
      local name = t.val
      if name == "sin" or name == "cos" or name == "tan" or name == "sqrt" or name == "abs" or name == "exp" or name == "log" then
        local nextT = get()
        if not nextT or nextT.val ~= "(" then return function(vars) return 0 end end
        local arg = expr()
        local nextT2 = get()
        if not nextT2 or nextT2.val ~= ")" then return function(vars) return 0 end end
        return function(vars)
          local val = arg(vars)
          if name == "sin" then return math.sin(val)
          elseif name == "cos" then return math.cos(val)
          elseif name == "tan" then return math.tan(val)
          elseif name == "sqrt" then return math.sqrt(val)
          elseif name == "abs" then return math.abs(val)
          elseif name == "exp" then return math.exp(val)
          elseif name == "log" then return math.log(val)
          end
          return 0
        end
      else
        return function(vars) return vars[name] or 0 end
      end
    elseif t.type == "operator" and t.val == "(" then
      local e = expr()
      local nextT = get()
      if not nextT or nextT.val ~= ")" then return function(vars) return 0 end end
      return e
    elseif t.type == "operator" and t.val == "-" then
      local p = primary()
      if not p then return function(vars) return 0 end end
      return function(vars) return -p(vars) end
    elseif t.type == "operator" and t.val == "+" then
      return primary()
    end
    return function(vars) return 0 end
  end

  local function power()
    local left = primary()
    if not left then return function(vars) return 0 end end
    local nextT = peek()
    if nextT and nextT.type == "operator" and nextT.val == "^" then
      get()
      local right = power()
      if not right then return function(vars) return 0 end end
      return function(vars) return left(vars) ^ right(vars) end
    end
    return left
  end

  local function factor()
    local left = power()
    if not left then return function(vars) return 0 end end
    while true do
      local nextT = peek()
      if nextT and nextT.type == "operator" and (nextT.val == "*" or nextT.val == "/") then
        local op = get().val
        local right = power()
        if not right then return function(vars) return 0 end end
        if op == "*" then
          local prevLeft = left
          left = function(vars) return prevLeft(vars) * right(vars) end
        else
          local prevLeft = left
          left = function(vars) return prevLeft(vars) / right(vars) end
        end
      else
        break
      end
    end
    return left
  end

  expr = function()
    local left = factor()
    if not left then return function(vars) return 0 end end
    while true do
      local nextT = peek()
      if nextT and nextT.type == "operator" and (nextT.val == "+" or nextT.val == "-") then
        local op = get().val
        local right = factor()
        if not right then return function(vars) return 0 end end
        if op == "+" then
          local prevLeft = left
          left = function(vars) return prevLeft(vars) + right(vars) end
        else
          local prevLeft = left
          left = function(vars) return prevLeft(vars) - right(vars) end
        end
      else
        break
      end
    end
    return left
  end

  local success, fn = pcall(expr)
  if success and fn then
    return fn
  else
    return nil
  end
end

local function preprocessFormula(str)
  str = str:gsub("%s+", "")
  
  local placeholders = {}
  local funcs = { "sin", "cos", "tan", "sqrt", "abs", "exp", "log" }
  for _, f in ipairs(funcs) do
    str = str:gsub(f, function(m)
      local placeholder = "__" .. m:upper() .. "__"
      placeholders[placeholder] = m
      return placeholder
    end)
  end

  local changed
  repeat
    changed = false
    str, count = str:gsub("([a-zA-Z])([a-zA-Z])", function(a, b)
      if a == "_" or b == "_" then
        return a .. b
      end
      changed = true
      return a .. "*" .. b
    end)
  until not changed

  str = str:gsub("([%d%.])([a-zA-Z])", "%1*%2")
  str = str:gsub("([a-zA-Z])([%d%.])", "%1*%2")

  str = str:gsub("([a-zA-Z])%(", "%1*(")
  str = str:gsub("([%d%.])%(", "%1*(")

  str = str:gsub("%)([a-zA-Z])", ")*%1")
  str = str:gsub("%)([%d%.])", ")*%1")
  str = str:gsub("%)%(", ")*(")

  for placeholder, original in pairs(placeholders) do
    str = str:gsub(placeholder, original)
  end

  return str
end

getElementI = function(el, state)
  local I = el.I or 1
  if state and state.useSubstitutedI then
    local coef = state.subICoef or 2
    I = tostring(coef) .. "*A*L^2"
  end
  if type(I) == "string" then
    local cleanStr = preprocessFormula(I)
    local fn = parseExpr(cleanStr)
    if fn then
      local vars = {
        A = el.A or 1,
        L = 1,
        E = el.E or 1,
        a = el.A or 1,
        l = 1,
        e = el.E or 1
      }
      local success, val = pcall(fn, vars)
      if success and val then
        return val
      end
    end
    return 1
  else
    return I
  end
end

getInertiaSubstitution = function(el, state)
  local formula = nil
  if state and state.useSubstitutedI then
    local coef = state.subICoef or 2
    formula = tostring(coef) .. "*A*L^2"
  elseif type(el.I) == "string" then
    formula = el.I
  end
  
  if formula then
    local cleanStr = preprocessFormula(formula)
    local fn = parseExpr(cleanStr)
    if fn then
      local vars = {
        A = el.A or 1,
        L = 1,
        E = el.E or 1,
        a = el.A or 1,
        l = 1,
        e = el.E or 1
      }
      local success, ratio = pcall(fn, vars)
      if success and ratio then
        return ratio
      end
    end
  end
  return nil
end

local function getExpressionScalingPowers(exprStr)
  if not exprStr or exprStr:gsub("%s+", "") == "" then
    return 0, 0
  end
  exprStr = exprStr:lower()
  local px = 0
  if exprStr:find("x%^3") then px = 3
  elseif exprStr:find("x%^2") then px = 2
  elseif exprStr:find("x") then px = 1
  end
  local pl = 0
  if exprStr:find("/l") then pl = -1
  elseif exprStr:find("%*l") then pl = 1
  end
  return px, pl
end

local function integrateExpression(fn, shapeIdx, L)
  local n = 20
  local h = L / n
  local sum = 0

  local function evalAt(x)
    local vars = { x = x, L = 1, l = 1, Le = L, le = L, p = 1 }
    local val = fn(vars) or 0
    local s = 0
    local xi = x / L
    if shapeIdx == 1 then
      s = 1 - 3 * xi^2 + 2 * xi^3
    elseif shapeIdx == 2 then
      s = x * (1 - xi)^2
    elseif shapeIdx == 3 then
      s = 3 * xi^2 - 2 * xi^3
    elseif shapeIdx == 4 then
      s = x * (xi^2 - xi)
    end
    return val * s
  end

  sum = sum + evalAt(0) + evalAt(L)
  for i = 1, n - 1 do
    local coeff = (i % 2 == 0) and 2 or 4
    sum = sum + coeff * evalAt(i * h)
  end

  return sum * h / 3
end

local function assembleF(state)
  local n = state.nDof
  local F = {}
  for i = 1, n do
    local expr = Expr.new()
    Expr.addInplace(expr, state.forces[i] or 0, "P")
    F[i] = expr
  end

  local GAUSS_PTS = { -0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526 }
  local api_GAUSS_WTS = { 0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538 }

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    local p0 = el.p0 or el.p or 0
    local pL = el.pL or 0
    local p1 = pL - p0
    local p2 = 0
    local p3 = 0

    local f = { 0, 0, 0, 0 }
    if el.py and el.py:gsub("%s+", "") ~= "" then
      local pyFn = parseExpr(el.py)
      if pyFn then
        f[1] = integrateExpression(pyFn, 1, L)
        f[2] = integrateExpression(pyFn, 2, L)
        f[3] = integrateExpression(pyFn, 3, L)
        f[4] = integrateExpression(pyFn, 4, L)
      else
        f[1], f[2], f[3], f[4] = 0, 0, 0, 0
        state.message = "Erro de sintaxe em p(x) do elem " .. e
      end
    else
      for k = 1, 4 do
        local eta = GAUSS_PTS[k]
        local xi = 0.5 * (1 + eta)
        local wt = api_GAUSS_WTS[k]

        local N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi
        local N2 = L * (xi - 2 * xi * xi + xi * xi * xi)
        local N3 = 3 * xi * xi - 2 * xi * xi * xi
        local N4 = L * (-xi * xi + xi * xi * xi)

        local p_xi = p0 + p1 * xi + p2 * xi * xi + p3 * xi * xi * xi
        local factor = 0.5 * L * wt * p_xi

        f[1] = f[1] + factor * N1
        f[2] = f[2] + factor * N2
        f[3] = f[3] + factor * N3
        f[4] = f[4] + factor * N4
      end
    end

    addEquivalentLoad(F, el.dofs, f, "p")
  end

  return F
end

local function getDofDirection(state, g)
  for e = 1, state.nElem do
    local el = state.elems[e]
    for k = 1, 4 do
      if el.dofs[k] == g then
        if k == 1 or k == 3 then
          return "translation"
        else
          return "rotation"
        end
      end
    end
  end
  return "translation"
end

local function getDofDisplayBase(state, g, b)
  local dir = getDofDirection(state, g)
  if b == "P" then
    if dir == "translation" then
      return "P*L^3/EI"
    else
      return "P*L^2/EI"
    end
  elseif b == "p" then
    if dir == "translation" then
      return "p*L^4/EI"
    else
      return "p*L^3/EI"
    end
  else
    return b .. "/EI"
  end
end

local function getForceDisplayBase(state, g, b)
  local dir = getDofDirection(state, g)
  if b == "P" then
    if dir == "translation" then
      return "P"
    else
      return "P*L"
    end
  elseif b == "p" then
    if dir == "translation" then
      return "p*L"
    else
      return "p*L^2"
    end
  else
    return b
  end
end

-- getRefs moved up in the file

local function getDofLScalingPower(state, g, b)
  local dir = getDofDirection(state, g)
  if b == "P" then
    return (dir == "translation") and 3 or 2
  elseif b == "p" then
    return (dir == "translation") and 4 or 3
  else
    return 0
  end
end

local function getForceLScalingPower(state, g, b)
  local dir = getDofDirection(state, g)
  if b == "P" then
    return (dir == "translation") and 0 or 1
  elseif b == "p" then
    return (dir == "translation") and 1 or 2
  else
    return 0
  end
end

local function getForceDisplayExpr(state, g, expr)
  local L_ref, _ = getRefs(state)
  local newExpr = Expr.new()
  newExpr.const = expr.const or 0
  for base, coef in pairs(expr.terms or {}) do
    local displayBase = getForceDisplayBase(state, g, base)
    local power = getForceLScalingPower(state, g, base)
    local normCoef = coef / (L_ref ^ power)
    Expr.addInplace(newExpr, normCoef, displayBase)
  end
  return newExpr
end

local function formatForceVectorLines(state, F)
  local lines = {}
  for i = 1, #F do
    local fDisplay = getForceDisplayExpr(state, i, F[i])
    table.insert(lines, "[ " .. Expr.toString(fDisplay) .. " ]")
  end
  return lines
end

local function solveDisplacements(state)
  local Kbar = assembleKNumeric(state)
  local F = assembleF(state)

  local baseTerms = {}
  for i = 1, #F do
    for _, b in ipairs(Expr.getBases(F[i])) do
      baseTerms[b] = true
    end
  end

  local u = {}
  local uByBase = {}
  for i = 1, state.nDof do
    u[i] = Expr.new()
  end

  local L_ref, EI_ref = getRefs(state)

  for b, _ in pairs(baseTerms) do
    local Fb = {}
    for i = 1, #F do
      Fb[i] = Expr.getCoeff(F[i], b)
    end
    local ub, err = Matrix.solveNumeric(Kbar, Fb)
    if not ub then
      return nil, nil, err
    end

    local normUb = {}
    for i = 1, #ub do
      local power = getDofLScalingPower(state, i, b)
      normUb[i] = ub[i] * EI_ref / (L_ref ^ power)
    end
    uByBase[b] = normUb

    for i = 1, #normUb do
      local displayBase = getDofDisplayBase(state, i, b)
      Expr.addInplace(u[i], normUb[i], displayBase)
    end
  end

  return u, uByBase, nil
end

local function buildKsLines(state)
  local K, steps = assembleK(state)
  local lines = { "**Ks (montagem passo a passo):" }

  for i = 1, state.nDof do
    for j = 1, state.nDof do
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

local function matchMC(mc1, mc2)
  if not mc1 or not mc2 then return false end
  if #mc1 ~= #mc2 then return false end
  for i = 1, #mc1 do
    local val1 = mc1[i] or 0
    local val2 = mc2[i] or 0
    if val1 ~= val2 then return false end
  end
  return true
end

local function detectVigaExercise(state)
  local elements = state.elems or {}
  local ng = state.nDof or 0
  if ng == 1 and #elements == 1 then
    local e1 = elements[1]
    if e1 and e1.dofs and matchMC(e1.dofs, {0,0,0,1}) then
      return 7
    end
  elseif ng == 2 and #elements == 1 then
    local e1 = elements[1]
    if e1 and e1.dofs and matchMC(e1.dofs, {0,1,2,0}) then
      return 8
    end
  end
  return nil
end

local function formatSymbolic(val, numVar, denVar)
  local sign = ""
  if val < 0 then
    sign = "-"
    val = -val
  end
  if math.abs(val) < 1e-9 then return "0" end
  local denoms = { 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60 }
  for _, d in ipairs(denoms) do
    local n = math.floor(val * d + 0.5)
    if math.abs(val - n / d) < 1e-5 then
      local top = ""
      if n == 1 then
        top = numVar
      else
        top = tostring(n) .. numVar
      end
      local bottom = denVar or ""
      if d > 1 then
        if bottom ~= "" then
          bottom = tostring(d) .. bottom
        else
          bottom = tostring(d)
        end
      end
      if bottom ~= "" then
        return sign .. top .. "/" .. bottom
      else
        return sign .. top
      end
    end
  end
  local term = string.format("%.4g", val) .. numVar
  if denVar and denVar ~= "" then
    return sign .. term .. "/" .. denVar
  else
    return sign .. term
  end
end

local function formatCustomLoadSymbolic(val, isMoment, el)
  local pyScale, plScale = getExpressionScalingPowers(el.py)
  local power = pyScale + plScale + (isMoment and 2 or 1)
  local numVar = "p"
  local denVar = ""
  if power == 1 then
    numVar = "p*L"
  elseif power > 1 then
    numVar = "p*L^" .. power
  elseif power == -1 then
    denVar = "L"
  elseif power < -1 then
    denVar = "L^" .. (-power)
  end
  return formatSymbolic(val, numVar, denVar)
end

local function buildEquilibriumAndDisplacementsLines(state, u, uByBase, F)
  local lines = {}
  
  local K = assembleK(state)
  local Kbar = assembleKNumeric(state)
  local exNum = detectVigaExercise(state)

  -- 1. Distributed load parameterization per element
  for e = 1, state.nElem do
    local el = state.elems[e]
    local isCustom = (el.py and el.py:gsub("%s+", "") ~= "")
    if isCustom then
      table.insert(lines, "  f = " .. el.py .. " (definido por p(x))")
      table.insert(lines, "")
    else
      local p0 = el.p0 or 0
      local pL = el.pL or 0
      if math.abs(p0) > 1e-9 or math.abs(pL) > 1e-9 then
        local Le = el.L or 1
        local Le_str = (Le == 1) and "L" or (tostring(Le) .. "L")
        local P1 = p0
        local P2 = pL - p0
        local P1_str = formatSymbolic(P1, "p", "")
        local P2_str = formatSymbolic(P2, "p", "")
        
        table.insert(lines, "  f = P2 * (x/L) + P1")
        table.insert(lines, "  {")
        table.insert(lines, "    x = 0  => " .. formatSymbolic(p0, "p", "") .. " = P2 * 0/" .. Le_str .. " + P1 <=> P1 = " .. P1_str .. " //")
        table.insert(lines, "    x = " .. Le_str .. " => " .. formatSymbolic(pL, "p", "") .. " = P2 * " .. Le_str .. "/" .. Le_str .. " + (" .. P1_str .. ") <=> P2 = " .. P2_str .. " //")
        table.insert(lines, "  }")
        table.insert(lines, "")
      end
    end
  end

  -- 2. Local equivalent loads
  local F_assembled = {}
  for i = 1, state.nDof do
    F_assembled[i] = {
      nodal = state.forces[i] or 0,
      elements = {}
    }
  end

  for e = 1, state.nElem do
    local el = state.elems[e]
    local Le = el.L or 1
    if Le > 0 then
      local Le_str = (Le == 1) and "L" or (tostring(Le) .. "L")
      local isCustom = (el.py and el.py:gsub("%s+", "") ~= "")
      
      local F1eq_val, M1eq_val, F2eq_val, M2eq_val
      local F1eq_str, M1eq_str, F2eq_str, M2eq_str
      
      if isCustom then
        local pyFn = parseExpr(el.py)
        if pyFn then
          F1eq_val = integrateExpression(pyFn, 1, Le)
          M1eq_val = integrateExpression(pyFn, 2, Le)
          F2eq_val = integrateExpression(pyFn, 3, Le)
          M2eq_val = integrateExpression(pyFn, 4, Le)
        else
          F1eq_val, M1eq_val, F2eq_val, M2eq_val = 0, 0, 0, 0
        end
        F1eq_str = formatCustomLoadSymbolic(F1eq_val, false, el)
        M1eq_str = formatCustomLoadSymbolic(M1eq_val, true, el)
        F2eq_str = formatCustomLoadSymbolic(F2eq_val, false, el)
        M2eq_str = formatCustomLoadSymbolic(M2eq_val, true, el)
      else
        local p0 = el.p0 or 0
        local pL = el.pL or 0
        local P1 = p0
        local P2 = pL - p0
        
        F1eq_val = (3/20 * P2 * Le + P1 * Le / 2)
        M1eq_val = (1/30 * P2 * Le^2 + P1 * Le^2 / 12)
        F2eq_val = (7/20 * P2 * Le + P1 * Le / 2)
        M2eq_val = (-1/20 * P2 * Le^2 - P1 * Le^2 / 12)
        
        F1eq_str = formatSymbolic(F1eq_val, "pL", "")
        M1eq_str = formatSymbolic(M1eq_val, "pL^2", "")
        F2eq_str = formatSymbolic(F2eq_val, "pL", "")
        M2eq_str = formatSymbolic(M2eq_val, "pL^2", "")
      end
      
      local dofs = el.dofs
      local localNames = { "F1eq", "M1eq", "F2eq", "M2eq" }
      local localVals = { F1eq_val, M1eq_val, F2eq_val, M2eq_val }
      local localStrs = { F1eq_str, M1eq_str, F2eq_str, M2eq_str }
      
      for k = 1, 4 do
        local g = dofs[k]
        if g and g > 0 and g <= state.nDof then
          table.insert(F_assembled[g].elements, {
            elem = e,
            name = localNames[k],
            val = localVals[k],
            str = localStrs[k]
          })
        end
      end
      
      local hasLoad = false
      if isCustom then
        hasLoad = true
      else
        local p0 = el.p0 or 0
        local pL = el.pL or 0
        if math.abs(p0) > 1e-9 or math.abs(pL) > 1e-9 then
          hasLoad = true
        end
      end
      
      if hasLoad then
        local activeLocal = {}
        for k = 1, 4 do
          local g = dofs[k]
          if g and g > 0 and g <= state.nDof then
            table.insert(activeLocal, k)
          end
        end
        
        if #activeLocal > 0 then
          local comps = {}
          for k = 1, 4 do
            table.insert(comps, localNames[k])
          end
          local activeNames = {}
          for _, k in ipairs(activeLocal) do
            table.insert(activeNames, localNames[k])
          end
          
          local note = " => só há " .. table.concat(activeNames, " e ")
          if #activeLocal > 1 then
            note = "  } Apenas temos " .. table.concat(activeNames, " e ")
          end
          
          table.insert(lines, "  {F^(" .. e .. ")} = { " .. table.concat(comps, ", ") .. " }" .. note)
          
          if isCustom then
            for _, k in ipairs(activeLocal) do
              local fName = localNames[k]
              local fValStr = localStrs[k]
              table.insert(lines, "    " .. fName .. " = ∫_0^" .. Le_str .. " (" .. el.py .. ") * N" .. k .. " dx = " .. fValStr .. " //")
            end
          else
            local p0 = el.p0 or 0
            local pL = el.pL or 0
            local P1 = p0
            local P2 = pL - p0
            local P1_str = formatSymbolic(P1, "p", "")
            local P2_str = formatSymbolic(P2, "p", "")
            for _, k in ipairs(activeLocal) do
              if k == 1 then
                table.insert(lines, "    F1eq = (3/20 * (" .. P2_str .. ") * " .. Le_str .. " + (" .. P1_str .. ") * " .. Le_str .. " / 2) = " .. F1eq_str .. " //")
              elseif k == 2 then
                table.insert(lines, "    M1eq = (1/30 * (" .. P2_str .. ") * " .. Le_str .. "^2 + (" .. P1_str .. ") * " .. Le_str .. "^2 / 12) = " .. M1eq_str .. " //")
              elseif k == 3 then
                table.insert(lines, "    F2eq = (7/20 * (" .. P2_str .. ") * " .. Le_str .. " + (" .. P1_str .. ") * " .. Le_str .. " / 2) = " .. F2eq_str .. " //")
              elseif k == 4 then
                table.insert(lines, "    M2eq = (-1/20 * (" .. P2_str .. ") * " .. Le_str .. "^2 - (" .. P1_str .. ") * " .. Le_str .. "^2 / 12) = " .. M2eq_str .. " //")
              end
            end
          end
          table.insert(lines, "")
        end
      end
    end
  end

  -- 3. Global force vector assembly
  local F_lines_disp = {}
  for i = 1, state.nDof do
    local terms = {}
    local nf = state.forces[i] or 0
    if math.abs(nf) > 1e-9 then
      local dir = getDofDirection(state, i)
      local base = (dir == "translation") and "P" or "P*L"
      table.insert(terms, formatSymbolic(nf, base, ""))
    end
    for _, c in ipairs(F_assembled[i].elements) do
      table.insert(terms, c.name .. "^(" .. c.elem .. ")")
    end
    local lhs = table.concat(terms, " + "):gsub(" %+ %-", " - ")
    if lhs == "" then lhs = "0" end
    
    local rhs = getForceDisplayExpr(state, i, F[i])
    local rhs_str = Expr.toString(rhs)
    
    table.insert(lines, "  F" .. i .. " = " .. lhs .. " = " .. rhs_str .. " //")
    table.insert(F_lines_disp, rhs_str)
  end
  table.insert(lines, "")
  
  table.insert(lines, "  F =")
  for i = 1, #F_lines_disp do
    table.insert(lines, "      | " .. F_lines_disp[i] .. " |")
  end
  table.insert(lines, "")

  -- 4. Solving K * U = F
  if state.nDof == 1 then
    local Le = 1
    for e = 1, state.nElem do
      if state.elems[e].L > 0 then
        Le = state.elems[e].L
        break
      end
    end
    local Le_str = (Le == 1) and "L" or (tostring(Le) .. "L")
    local K11_val = Kbar[1][1]
    local K11_str = formatSymbolic(K11_val, "EI", "L")
    
    table.insert(lines, "  K11 = K44^(1) = EI/(" .. Le_str .. ")^3 * 4(" .. Le_str .. ")^2 = " .. K11_str .. " //")
    table.insert(lines, "")
    table.insert(lines, "  [K] = " .. K11_str)
    table.insert(lines, "")
    table.insert(lines, "  [F] = ?")
    table.insert(lines, "")
    table.insert(lines, "  [K] [U] = [F] <=> " .. K11_str .. " * U1 = " .. F_lines_disp[1] .. " <=> U1 = " .. Expr.toString(u[1]) .. " //")
    table.insert(lines, "")
  elseif state.nDof == 2 then
    local Le = 1
    for e = 1, state.nElem do
      if state.elems[e].L > 0 then
        Le = state.elems[e].L
        break
      end
    end
    local Le_str = (Le == 1) and "L" or (tostring(Le) .. "L")
    
    -- Format Matrix equation
    local type1 = getDofDirection(state, 1)
    local type2 = getDofDirection(state, 2)
    
    local function getRawCoeff(expr, t1, t2)
      local l_pow = 0
      if t1 == "rotation" then l_pow = l_pow + 1 end
      if t2 == "rotation" then l_pow = l_pow + 1 end
      
      local val = 0
      for base, coef in pairs(expr.terms or {}) do
        val = val + coef
      end
      return val * (Le ^ 3)
    end
    
    local c11 = getRawCoeff(K.data[1][1], type1, type1)
    local c12 = getRawCoeff(K.data[1][2], type1, type2)
    local c21 = getRawCoeff(K.data[2][1], type2, type1)
    local c22 = getRawCoeff(K.data[2][2], type2, type2)
    
    local function formatCellWithLe(val, t1, t2)
      local l_pow = 0
      if t1 == "rotation" then l_pow = l_pow + 1 end
      if t2 == "rotation" then l_pow = l_pow + 1 end
      
      local c = val
      if l_pow == 1 then
        c = val / Le
      elseif l_pow == 2 then
        c = val / (Le * Le)
      end
      
      local c_str = tostring(math.floor(c + 0.5))
      if c < 0 then
        c_str = "-" .. tostring(math.floor(math.abs(c) + 0.5))
      end
      
      if l_pow == 0 then
        return c_str
      elseif l_pow == 1 then
        if c_str == "1" then return Le_str
        elseif c_str == "-1" then return "-" .. Le_str
        else return c_str .. Le_str
        end
      elseif l_pow == 2 then
        if c_str == "1" then return "(" .. Le_str .. ")^2"
        elseif c_str == "-1" then return "-(" .. Le_str .. ")^2"
        else return c_str .. "(" .. Le_str .. ")^2"
        end
      end
    end
    
    local s11 = formatCellWithLe(c11, type1, type1)
    local s12 = formatCellWithLe(c12, type1, type2)
    local s21 = formatCellWithLe(c21, type2, type1)
    local s22 = formatCellWithLe(c22, type2, type2)
    
    local maxLen = math.max(#s11, #s21)
    local s11_pad = s11 .. string.rep(" ", maxLen - #s11)
    local s21_pad = s21 .. string.rep(" ", maxLen - #s21)
    
    table.insert(lines, "  [K] [u] = [F] <=> (EI/" .. Le_str .. "^3) * [ " .. s11_pad .. "  " .. s12 .. " ] { U1 } = { " .. F_lines_disp[1] .. " }")
    table.insert(lines, "                                       [ " .. s21_pad .. "  " .. s22 .. " ] { U2 }   { " .. F_lines_disp[2] .. " }")
    table.insert(lines, "")
    
    -- Format equations
    local k11_str = Expr.toString(K.data[1][1])
    local k12_str = Expr.toString(K.data[1][2])
    local k21_str = Expr.toString(K.data[2][1])
    local k22_str = Expr.toString(K.data[2][2])
    
    local function formatEquationRow(k1, k2, f)
      local part1 = k1 .. " * U1"
      local part2 = ""
      if k2:sub(1,1) == "-" then
        part2 = " - " .. k2:sub(2) .. " * U2"
      else
        part2 = " + " .. k2 .. " * U2"
      end
      return part1 .. part2 .. " = " .. f
    end
    
    table.insert(lines, "  <=> { " .. formatEquationRow(k11_str, k12_str, F_lines_disp[1]))
    table.insert(lines, "      { " .. formatEquationRow(k21_str, k22_str, F_lines_disp[2]))
    table.insert(lines, "")
    table.insert(lines, "  <=> { U1 = " .. Expr.toString(u[1]) .. " //")
    table.insert(lines, "      { U2 = " .. Expr.toString(u[2]) .. " //")
    if exNum == 8 then
      table.insert(lines, "      -- deslocamento exato a meio da viga")
    end
    table.insert(lines, "")
  else
    table.insert(lines, "Sistema [K]{U} = {F}:")
  local K = assembleK(state)
  local K_lines = Matrix.formatLines(K)
  
  local U_lines = {}
  for i = 1, state.nDof do
    table.insert(U_lines, "[ U" .. i .. " ]")
  end
  
  local F_lines = formatForceVectorLines(state, F)
  
  -- Find max length of K_lines and U_lines for vertical alignment
  local maxKLen = 0
  for i = 1, #K_lines do
    if #K_lines[i] > maxKLen then
      maxKLen = #K_lines[i]
    end
  end
  
  local maxULen = 0
  for i = 1, #U_lines do
    if #U_lines[i] > maxULen then
      maxULen = #U_lines[i]
    end
  end
  
  local mid = math.ceil(state.nDof / 2)
  for i = 1, state.nDof do
    local kPart = K_lines[i] .. string.rep(" ", maxKLen - #K_lines[i])
    local uPart = U_lines[i] .. string.rep(" ", maxULen - #U_lines[i])
    local fPart = F_lines[i]
    
    local opMult = (i == mid) and " * " or "   "
    local opEq = (i == mid) and " = " or "   "
    
    table.insert(lines, "  " .. kPart .. opMult .. uPart .. opEq .. fPart)
  end
  table.insert(lines, "")
  
  -- 2. Show the system of equations
  table.insert(lines, "Equações de Equilíbrio:")
  for i = 1, state.nDof do
    local rowParts = {}
    for j = 1, state.nDof do
      local valExpr = K.data[i][j]
      if not Expr.isZero(valExpr) then
        local coefStr = Expr.toString(valExpr)
        local termStr
        if coefStr == "1" then
          termStr = "U" .. j
        elseif coefStr == "-1" then
          termStr = "-U" .. j
        else
          termStr = "(" .. coefStr .. ")*U" .. j
        end
        table.insert(rowParts, termStr)
      end
    end
    local lhs = table.concat(rowParts, " + ")
    lhs = lhs:gsub(" %+ %-", " - ")
    if lhs == "" then lhs = "0" end
    local fDisplay = getForceDisplayExpr(state, i, F[i])
    table.insert(lines, "  " .. lhs .. " = " .. Expr.toString(fDisplay))
  end
  table.insert(lines, "")
  
  -- 3. Show resolution of displacements
  table.insert(lines, "Resolução dos Deslocamentos:")
  for i = 1, #u do
    table.insert(lines, "  U" .. i .. " = " .. Expr.toString(u[i]))
  end
  end
  table.insert(lines, "")
  return lines
end

local function formatShapeTerm(coef, L_power)
  local coefStr = exprFormatNumber(coef)
  if coefStr == "0" then return "0" end
  if L_power == 0 then
    return coefStr
  elseif L_power == 1 then
    if coefStr == "1" then return "L"
    elseif coefStr == "-1" then return "-L"
    else return coefStr .. "*L"
    end
  elseif L_power == -1 then
    if coefStr == "1" then return "1/L"
    elseif coefStr == "-1" then return "-1/L"
    else return coefStr .. "/L"
    end
  elseif L_power == -2 then
    if coefStr == "1" then return "1/L^2"
    elseif coefStr == "-1" then return "-1/L^2"
    else return coefStr .. "/L^2"
    end
  elseif L_power == -3 then
    if coefStr == "1" then return "1/L^3"
    elseif coefStr == "-1" then return "-1/L^3"
    else return coefStr .. "/L^3"
    end
  end
  return coefStr
end

local function formatShapeTermL(coef, L_power, L_sym)
  local coefStr = exprFormatNumber(coef)
  if coefStr == "0" then return "0" end
  if L_power == 0 then
    return coefStr
  elseif L_power == 1 then
    if coefStr == "1" then return L_sym
    elseif coefStr == "-1" then return "-" .. L_sym
    else return coefStr .. "*" .. L_sym
    end
  elseif L_power == -1 then
    if coefStr == "1" then return "1/" .. L_sym
    elseif coefStr == "-1" then return "-1/" .. L_sym
    else return coefStr .. "/" .. L_sym
    end
  elseif L_power == -2 then
    local L2 = "(" .. L_sym .. ")^2"
    if L_sym == "L" then L2 = "L^2" end
    if coefStr == "1" then return "1/" .. L2
    elseif coefStr == "-1" then return "-1/" .. L2
    else return coefStr .. "/" .. L2
    end
  elseif L_power == -3 then
    local L3 = "(" .. L_sym .. ")^3"
    if L_sym == "L" then L3 = "L^3" end
    if coefStr == "1" then return "1/" .. L3
    elseif coefStr == "-1" then return "-1/" .. L3
    else return coefStr .. "/" .. L3
    end
  end
  return coefStr
end

local function formatFourTerms(p1_str, v1, p2_str, v2, p3_str, v3, p4_str, v4)
  local parts = {}
  local function addTerm(p_str, v)
    if p_str ~= "0" and not Expr.isZero(v) then
      table.insert(parts, p_str .. "*(" .. Expr.toString(v) .. ")")
    end
  end
  addTerm(p1_str, v1)
  addTerm(p2_str, v2)
  addTerm(p3_str, v3)
  addTerm(p4_str, v4)
  if #parts == 0 then return "0" end
  local s = table.concat(parts, " + ")
  s = s:gsub(" %+ %-", " - ")
  return s
end

local function getOptionDisplayBase(option, base)
  if base == "P" then
    if option == 2 then
      return "P*L^3/EI"
    elseif option == 3 then
      return "P*L^2/EI"
    elseif option == 4 then
      return "P*L"
    elseif option == 5 then
      return "P"
    end
  elseif base == "p" then
    if option == 2 then
      return "p*L^4/EI"
    elseif option == 3 then
      return "p*L^3/EI"
    elseif option == 4 then
      return "p*L^2"
    elseif option == 5 then
      return "p*L"
    end
  end
  if option == 2 or option == 3 then
    return base .. "/EI"
  else
    return base
  end
end

local function viga_det3(A)
  return A[1][1] * (A[2][2] * A[3][3] - A[2][3] * A[3][2])
       - A[1][2] * (A[2][1] * A[3][3] - A[2][3] * A[3][1])
       + A[1][3] * (A[2][1] * A[3][2] - A[2][2] * A[3][1])
end

local function viga_bisectRoots(f, a, b, tol, ns, maxRoots)
  local h = (b - a) / ns
  local roots = {}
  local x = a
  local prev = f(x)

  for i = 1, ns do
    local xn = x + h
    local cur = f(xn)

    if prev * cur < 0 then
      local lo, hi = x, xn
      for k = 1, 60 do
        local mid = 0.5 * (lo + hi)
        local fm = f(mid)
        if math.abs(fm) < tol or math.abs(hi - lo) < tol then
          table.insert(roots, mid)
          break
        end
        if f(lo) * fm < 0 then
          hi = mid
        else
          lo = mid
        end
      end
      if #roots >= (maxRoots or 3) then break end
    end

    prev = cur
    x = xn
  end

  table.sort(roots)
  return roots
end

local function solveEigenvalues(Kr, Mr, nf)
  local lam = {}

  if nf == 1 then
    if math.abs(Mr[1][1]) > 1e-14 then
      lam[1] = Kr[1][1] / Mr[1][1]
    else
      lam[1] = 0.0
    end
    return lam
  end

  if nf == 2 then
    local K11, K12, K22 = Kr[1][1], Kr[1][2], Kr[2][2]
    local M11, M12, M22 = Mr[1][1], Mr[1][2], Mr[2][2]
    local a = M11 * M22 - M12 * M12
    local b = -(K11 * M22 + K22 * M11 - 2.0 * K12 * M12)
    local c = K11 * K22 - K12 * K12

    if math.abs(a) < 1e-14 then
      if math.abs(b) > 1e-14 then
        local l1 = -c / b
        if l1 > -1e-8 then table.insert(lam, l1) end
      end
      table.sort(lam)
      return lam
    end

    local disc = b * b - 4.0 * a * c
    if disc < 0 then return {} end

    local rdisc = math.sqrt(disc)
    local l1 = (-b - rdisc) / (2.0 * a)
    local l2 = (-b + rdisc) / (2.0 * a)
    if l1 > -1e-8 then table.insert(lam, l1) end
    if l2 > -1e-8 then table.insert(lam, l2) end
    table.sort(lam)
    return lam
  end

  if nf == 3 then
    local function fdet(l)
      local A = {}
      for i = 1, 3 do
        A[i] = {}
        for j = 1, 3 do
          A[i][j] = Kr[i][j] - l * Mr[i][j]
        end
      end
      return viga_det3(A)
    end

    local lamMax = 0
    for i = 1, 3 do
      if math.abs(Mr[i][i]) > 1e-14 then
        lamMax = math.max(lamMax, math.abs(Kr[i][i] / Mr[i][i]))
      end
    end
    if lamMax < 1e-8 then lamMax = 1 end
    return viga_bisectRoots(fdet, 0.0, lamMax * 10.0, 1e-6, 200, 3)
  end

  return {}
end

local function matrixSubtractScaled(A, B, lam)
  local n = #A
  local R = {}
  for i = 1, n do
    R[i] = {}
    for j = 1, n do
      R[i][j] = A[i][j] - lam * B[i][j]
    end
  end
  return R
end

local function rowNorm3(row)
  return math.abs(row[1] or 0) + math.abs(row[2] or 0) + math.abs(row[3] or 0)
end

local function normalizeVector(v)
  local lastNonZeroIdx = nil
  for i = #v, 1, -1 do
    if math.abs(v[i] or 0) > 1e-9 then
      lastNonZeroIdx = i
      break
    end
  end

  if lastNonZeroIdx == nil then
    return v
  end

  local factor = v[lastNonZeroIdx]
  for i = 1, #v do
    v[i] = (v[i] or 0) / factor
  end

  for i = 1, #v do
    if math.abs(v[i]) < 1e-12 then
      v[i] = 0
    end
  end
  return v
end

local function buildModeShapeVector(A)
  local n = #A
  if n <= 0 then return nil end

  if n == 1 then
    return {1}
  end

  if n == 2 then
    local r1 = A[1] or {0, 0}
    local r2 = A[2] or {0, 0}
    local n1 = math.abs(r1[1] or 0) + math.abs(r1[2] or 0)
    local n2 = math.abs(r2[2] or 0) + math.abs(r2[2] or 0)
    local r = (n1 >= n2) and r1 or r2
    local v = {-(r[2] or 0), (r[1] or 0)}
    if math.abs(v[1]) < 1e-14 and math.abs(v[2]) < 1e-14 then
      v = {1, 1}
    end
    return normalizeVector(v)
  end

  if n == 3 then
    local rows = {
      A[1] or {0, 0, 0},
      A[2] or {0, 0, 0},
      A[3] or {0, 0, 0}
    }

    local idx = {1, 2, 3}
    table.sort(idx, function(i, j)
      return rowNorm3(rows[i]) > rowNorm3(rows[j])
    end)

    local pairs = {
      {idx[1], idx[2]},
      {idx[1], idx[3]},
      {idx[2], idx[3]}
    }

    local function cross(u, w)
      return {
        (u[2] or 0) * (w[3] or 0) - (u[3] or 0) * (w[2] or 0),
        (u[3] or 0) * (w[1] or 0) - (u[1] or 0) * (w[3] or 0),
        (u[1] or 0) * (w[2] or 0) - (u[2] or 0) * (w[1] or 0)
      }
    end

    for _, pr in ipairs(pairs) do
      local v = cross(rows[pr[1]], rows[pr[2]])
      if math.abs(v[1]) + math.abs(v[2]) + math.abs(v[3]) > 1e-12 then
        return normalizeVector(v)
      end
    end
    return {1, 1, 1}
  end

  local v = {}
  for i = 1, n do v[i] = 1 end
  return normalizeVector(v)
end

local function assembleM(state)
  local n = state.nDof
  local M = {}
  local mContrib = {}
  for i = 1, n do
    M[i] = {}
    mContrib[i] = {}
    for j = 1, n do
      M[i][j] = 0
      mContrib[i][j] = {}
    end
  end

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    local A = el.A or 1
    if L > 0 then
      local fM = A * L / 420

      local me = {
        { 156 * fM, 22 * L * fM, 54 * fM, -13 * L * fM },
        { 22 * L * fM, 4 * L * L * fM, 13 * L * fM, -3 * L * L * fM },
        { 54 * fM, 13 * L * fM, 156 * fM, -22 * L * fM },
        { -13 * L * fM, -3 * L * L * fM, -22 * L * fM, 4 * L * L * fM }
      }

      local dofs = el.dofs
      for a = 1, 4 do
        local ga = dofs[a]
        if ga and ga > 0 and ga <= n then
          for b_idx = 1, 4 do
            local gb = dofs[b_idx]
            if gb and gb > 0 and gb <= n then
              local val = me[a][b_idx]
              M[ga][gb] = M[ga][gb] + val
              table.insert(mContrib[ga][gb], {
                el = e,
                a = a,
                b = b_idx,
                coef = val
              })
            end
          end
        end
      end
    end
  end

  return M, mContrib
end

-- ── Helper: evaluate beam function numerically at xi = x/L ──────────────────
local function viga_evalFuncNum(el, uByBase, which, xi, r_L, r_EI)
  local dofs = el.dofs
  local s = 0
  for _, ub in pairs(uByBase) do
    local v1  = ub[dofs[1]] or 0
    local th1 = ub[dofs[2]] or 0
    local v2  = ub[dofs[3]] or 0
    local th2 = ub[dofs[4]] or 0
    local val = 0
    if which == "v" then
      val = (1-3*xi^2+2*xi^3)*v1 + ((xi-2*xi^2+xi^3)/r_L)*th1
          + (3*xi^2-2*xi^3)*v2   + ((-xi^2+xi^3)/r_L)*th2
    elseif which == "theta" then
      val = (6*(-xi+xi^2)*r_L)*v1 + (1-4*xi+3*xi^2)*th1
          + (6*(xi-xi^2)*r_L)*v2  + (-2*xi+3*xi^2)*th2
    elseif which == "M" then
      val = (6*(-1+2*xi)*r_EI*r_L^2)*v1 + ((-4+6*xi)*r_EI*r_L)*th1
          + (6*(1-2*xi)*r_EI*r_L^2)*v2  + ((-2+6*xi)*r_EI*r_L)*th2
    elseif which == "V" then
      val = (12*r_EI*r_L^3)*v1  + (6*r_EI*r_L^2)*th1
          + (-12*r_EI*r_L^3)*v2 + (6*r_EI*r_L^2)*th2
    end
    s = s + val
  end
  return s
end

-- ── Helper: evaluate beam function as Expr at xi = x/L ──────────────────────
local function viga_evalFuncExpr(el, uByBase, which, xi, r_L, r_EI)
  local dofs = el.dofs
  local dispOpt = (which=="v") and 2 or (which=="theta") and 3
               or (which=="M") and 4 or 5
  local res = Expr.new()
  for base, ub in pairs(uByBase) do
    local v1  = ub[dofs[1]] or 0
    local th1 = ub[dofs[2]] or 0
    local v2  = ub[dofs[3]] or 0
    local th2 = ub[dofs[4]] or 0
    local val = 0
    if which == "v" then
      val = (1-3*xi^2+2*xi^3)*v1 + ((xi-2*xi^2+xi^3)/r_L)*th1
          + (3*xi^2-2*xi^3)*v2   + ((-xi^2+xi^3)/r_L)*th2
    elseif which == "theta" then
      val = (6*(-xi+xi^2)*r_L)*v1 + (1-4*xi+3*xi^2)*th1
          + (6*(xi-xi^2)*r_L)*v2  + (-2*xi+3*xi^2)*th2
    elseif which == "M" then
      val = (6*(-1+2*xi)*r_EI*r_L^2)*v1 + ((-4+6*xi)*r_EI*r_L)*th1
          + (6*(1-2*xi)*r_EI*r_L^2)*v2  + ((-2+6*xi)*r_EI*r_L)*th2
    elseif which == "V" then
      val = (12*r_EI*r_L^3)*v1  + (6*r_EI*r_L^2)*th1
          + (-12*r_EI*r_L^3)*v2 + (6*r_EI*r_L^2)*th2
    end
    Expr.addInplace(res, val, getOptionDisplayBase(dispOpt, base))
  end
  return res
end

-- ── Options 7-11: max/zero finding with full symbolic display ────────────────
local function buildMaxZeroOptionLines(state, option, u, uByBase)
  local lines = {}
  local e = state.defElem or 1
  if e < 1 then e = 1 end
  if e > state.nElem then e = state.nElem end
  local el  = state.elems[e]
  local L   = el.L or 1   -- L_elem = L * L_ref = L * 1, so el.L = n means n*L
  if L == 0 then
    table.insert(lines, "Elemento "..e.." e uma mola (L=0), nao aplicavel.")
    return lines
  end

  local dofs  = el.dofs
  local L_ref, EI_ref = getRefs(state)  -- always 1, 1
  local r_EI  = (el.E or 1) * getElementI(el, state) / EI_ref
  local r_L   = L_ref / L   -- = 1/L

  -- Symbolic label for element length: "L" when n=1, "2L" when n=2, "L/2" when n=0.5
  local function makeLsym(n)
    if math.abs(n - 1) < 1e-9 then return "L" end
    local ni = math.floor(n + 0.5)
    if ni > 0 and math.abs(n - ni) < 1e-9 then return tostring(ni).."L" end
    local m = math.floor(1/n + 0.5)
    if m > 0 and math.abs(1/n - m) < 1e-9 then return "L/"..tostring(m) end
    return exprFormatNumber(n).."L"
  end
  local eLsym  = makeLsym(L)
  local eLsym2 = "("..eLsym..")^2"
  local eLsym3 = "("..eLsym..")^3"
  -- simplified: for integer n, avoid extra parens
  if L == math.floor(L + 0.5) and math.abs(L - math.floor(L + 0.5)) < 1e-9 then
    eLsym2 = eLsym.."^2"
    eLsym3 = eLsym.."^3"
  end

  -- local displacement Expr values
  local uv    = {}
  for i = 1, 4 do
    local d = dofs[i]
    uv[i] = (d and d > 0 and d <= #u) and u[d] or Expr.new()
  end

  -- per-option configuration
  local findWhich, evalWhich
  local funcNameFind, funcNameEval
  local headline, condLine, genFormula
  local shapeLines, shapeNames

  if option == 7 then
    findWhich = "theta"; evalWhich = "v"
    funcNameFind = "v'(x)"; funcNameEval = "v(x)"
    headline   = "Deslocamento maximo - Elem. "..e.." (L_e = "..eLsym.."):"
    condLine   = "Condicao: v'(x) = 0"
    genFormula = "v'(x) = N'1(x)*v1 + N'2(x)*th1 + N'3(x)*v2 + N'4(x)*th2"
    shapeLines = {
      "  N'1(x) = 6*(-(x/"..eLsym..") + (x/"..eLsym..")^2)/("..eLsym..")" ,
      "  N'2(x) = 1 - 4*(x/"..eLsym..") + 3*(x/"..eLsym..")^2"             ,
      "  N'3(x) = 6*((x/"..eLsym..") - (x/"..eLsym..")^2)/("..eLsym..")"  ,
      "  N'4(x) = -2*(x/"..eLsym..") + 3*(x/"..eLsym..")^2"
    }
    shapeNames = {
      "(6*(-(x/"..eLsym..") + (x/"..eLsym..")^2)/("..eLsym.."))" ,
      "(1 - 4*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)"             ,
      "(6*((x/"..eLsym..") - (x/"..eLsym..")^2)/("..eLsym.."))"  ,
      "(-2*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)"
    }
  elseif option == 8 then
    findWhich = "M"; evalWhich = "theta"
    funcNameFind = "M(x)"; funcNameEval = "th(x)"
    headline   = "Rotacao maxima - Elem. "..e.." (L_e = "..eLsym.."):"
    condLine   = "Condicao: M(x) = 0  [pois th'(x) = M(x)/EI]"
    genFormula = "M(x) = EI*(N''1(x)*v1 + N''2(x)*th1 + N''3(x)*v2 + N''4(x)*th2)"
    shapeLines = {
      "  N''1(x) = 6*(-1 + 2*(x/"..eLsym.."))/"..eLsym2,
      "  N''2(x) = (-4 + 6*(x/"..eLsym.."))/("..eLsym..")"               ,
      "  N''3(x) = 6*(1 - 2*(x/"..eLsym.."))/"..eLsym2,
      "  N''4(x) = (-2 + 6*(x/"..eLsym.."))/("..eLsym..")"               
    }
    shapeNames = {
      "(EI*6*(-1+2*(x/"..eLsym.."))/"..eLsym2..")"        ,
      "(EI*(-4+6*(x/"..eLsym.."))/("..eLsym.."))"         ,
      "(EI*6*(1-2*(x/"..eLsym.."))/"..eLsym2..")"         ,
      "(EI*(-2+6*(x/"..eLsym.."))/("..eLsym.."))"
    }
  elseif option == 9 then
    findWhich = "V"; evalWhich = "M"
    funcNameFind = "V(x)"; funcNameEval = "M(x)"
    headline   = "Momento maximo - Elem. "..e.." (L_e = "..eLsym.."):"
    condLine   = "Condicao: V(x) = 0  [pois M'(x) = V(x)]"
    genFormula = "V(x) = EI*(N'''1(x)*v1 + N'''2(x)*th1 + N'''3(x)*v2 + N'''4(x)*th2)"
    shapeLines = {
      "  N'''1(x) = 12/"..eLsym3,
      "  N'''2(x) = 6/"..eLsym2,
      "  N'''3(x) = -12/"..eLsym3,
      "  N'''4(x) = 6/"..eLsym2
    }
    shapeNames = {
      "(EI*12/"..eLsym3..")"   ,
      "(EI*6/"..eLsym2..")"    ,
      "(EI*(-12)/"..eLsym3..")" ,
      "(EI*6/"..eLsym2..")"    
    }
  elseif option == 10 then
    findWhich = "v"; evalWhich = nil
    funcNameFind = "v(x)"; funcNameEval = nil
    headline   = "Zeros de v(x) - Elem. "..e.." (L_e = "..eLsym.."):"
    condLine   = "Condicao: v(x) = 0"
    genFormula = "v(x) = N1(x)*v1 + N2(x)*th1 + N3(x)*v2 + N4(x)*th2"
    shapeLines = {
      "  N1(x) = 1 - 3*(x/"..eLsym..")^2 + 2*(x/"..eLsym..")^3"                                     ,
      "  N2(x) = ("..eLsym..")*(( x/"..eLsym..") - 2*(x/"..eLsym..")^2 + (x/"..eLsym..")^3)"       ,
      "  N3(x) = 3*(x/"..eLsym..")^2 - 2*(x/"..eLsym..")^3"                                         ,
      "  N4(x) = ("..eLsym..")*(-(x/"..eLsym..")^2 + (x/"..eLsym..")^3)"
    }
    shapeNames = {
      "(1 - 3*(x/"..eLsym..")^2 + 2*(x/"..eLsym..")^3)"                                      ,
      "("..eLsym..")*(( x/"..eLsym..") - 2*(x/"..eLsym..")^2 + (x/"..eLsym..")^3)"        ,
      "(3*(x/"..eLsym..")^2 - 2*(x/"..eLsym..")^3)"                                         ,
      "("..eLsym..")*(-(x/"..eLsym..")^2 + (x/"..eLsym..")^3)"
    }
  elseif option == 11 then
    findWhich = "theta"; evalWhich = nil
    funcNameFind = "v'(x)"; funcNameEval = nil
    headline   = "Zeros de th(x)=v'(x) - Elem. "..e.." (L_e = "..eLsym.."):"
    condLine   = "Condicao: v'(x) = 0"
    genFormula = "v'(x) = N'1(x)*v1 + N'2(x)*th1 + N'3(x)*v2 + N'4(x)*th2"
    shapeLines = {
      "  N'1(x) = 6*(-(x/"..eLsym..") + (x/"..eLsym..")^2)/("..eLsym..")" ,
      "  N'2(x) = 1 - 4*(x/"..eLsym..") + 3*(x/"..eLsym..")^2"             ,
      "  N'3(x) = 6*((x/"..eLsym..") - (x/"..eLsym..")^2)/("..eLsym..")"  ,
      "  N'4(x) = -2*(x/"..eLsym..") + 3*(x/"..eLsym..")^2"
    }
    shapeNames = {
      "(6*(-(x/"..eLsym..") + (x/"..eLsym..")^2)/("..eLsym.."))" ,
      "(1 - 4*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)"             ,
      "(6*((x/"..eLsym..") - (x/"..eLsym..")^2)/("..eLsym.."))"  ,
      "(-2*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)"
    }
  end

  table.insert(lines, headline)
  table.insert(lines, condLine)
  table.insert(lines, "")

  -- General formula (before any substitution)
  table.insert(lines, genFormula)
  table.insert(lines, "")
  table.insert(lines, "Funcoes de forma (L_e = "..eLsym.."):")
  for _, sl in ipairs(shapeLines) do
    table.insert(lines, sl)
  end
  table.insert(lines, "")

  -- Displacement values
  local dispLabels = {"v1", "th1", "v2", "th2"}
  table.insert(lines, "Deslocamentos locais (Elem. "..e.."):")
  for i = 1, 4 do
    table.insert(lines, "  "..dispLabels[i].." = "..Expr.toString(uv[i]))
  end
  table.insert(lines, "")

  -- Substituted expression (skip zero terms)
  local terms = {}
  for i = 1, 4 do
    local ustr = Expr.toString(uv[i])
    if ustr ~= "0" then
      table.insert(terms, shapeNames[i].."*("..ustr..")")
    end
  end
  table.insert(lines, "Substituindo:")
  if #terms == 0 then
    table.insert(lines, "  "..funcNameFind.." = 0  (todos deslocamentos nulos)")
  else
    local sub_line = "  "..funcNameFind.." = "..terms[1]
    for i = 2, #terms do
      sub_line = sub_line .. " + " .. terms[i]
    end
    sub_line = sub_line:gsub(" %+ %-", " - ")
    table.insert(lines, sub_line)
  end
  table.insert(lines, "")

  local function f_num(xi)
    return viga_evalFuncNum(el, uByBase, findWhich, xi, r_L, r_EI)
  end
  local roots = viga_bisectRoots(f_num, 0.0, 1.0, 1e-6, 200, 8)

  -- format x = xi * L_e as a fraction of the symbolic L
  local function fmtX(xi_r)
    local xval = xi_r * L   -- numeric coefficient of L
    local xN = exprFormatNumber(xval)
    return xN .. "L"
  end

  if option == 10 or option == 11 then
    table.insert(lines, "Resolvendo "..funcNameFind.." = 0:")
    local valid = {}
    for _, xi_r in ipairs(roots) do
      if xi_r > 0.005 and xi_r < 0.995 then table.insert(valid, xi_r) end
    end
    if #valid == 0 then
      table.insert(lines, "  Nenhuma raiz interior em ]0, "..eLsym.."[.")
    else
      for _, xi_r in ipairs(valid) do
        table.insert(lines, "  => x = "..fmtX(xi_r))
      end
    end
  else
    local condStr = (option==7) and "v'(x) = 0"
                 or (option==8) and "M(x) = 0"
                 or "V(x) = 0"
    table.insert(lines, "Resolvendo "..condStr.." (bisseccao numerica):")
    local valid = {}
    for _, xi_r in ipairs(roots) do
      if xi_r > 0.005 and xi_r < 0.995 then table.insert(valid, xi_r) end
    end
    if #valid == 0 then
      if option == 9 then
        local M0 = viga_evalFuncExpr(el, uByBase, "M", 0.0, r_L, r_EI)
        local M1 = viga_evalFuncExpr(el, uByBase, "M", 1.0, r_L, r_EI)
        table.insert(lines, "  V constante no elemento (sem extremo interior).")
        table.insert(lines, "  M(x=0)      = "..Expr.toString(M0))
        table.insert(lines, "  M(x="..eLsym..") = "..Expr.toString(M1))
      else
        table.insert(lines, "  Nenhum extremo interior encontrado.")
      end
    else
      for _, xi_r in ipairs(valid) do
        local xs = fmtX(xi_r)
        table.insert(lines, "  => x = "..xs)
        table.insert(lines, "")
        local val_expr = viga_evalFuncExpr(el, uByBase, evalWhich, xi_r, r_L, r_EI)
        table.insert(lines, "  "..funcNameEval.."(x = "..xs..") =")
        table.insert(lines, "  "..Expr.toString(val_expr))
      end
    end
  end

  return lines
end

local function buildDefOptionLines(state, option)
  local lines = {}
  local u, uByBase, err = solveDisplacements(state)
  local F = assembleF(state)
  if not u then
    table.insert(lines, "Sistema global:")
    table.insert(lines, "[K]{u} = {F}")
    local K = assembleK(state)
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    for _, line in ipairs(formatForceVectorLines(state, F)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "Resolução automática indisponível: " .. err)
    return lines
  end

  if option == 1 then
    local eqLines = buildEquilibriumAndDisplacementsLines(state, u, uByBase, F)
    for _, l in ipairs(eqLines) do
      table.insert(lines, l)
    end
    return lines
  end

  if option == 6 then
    table.insert(lines, "Frequências Naturais e Modos de Vibração:")
    table.insert(lines, "Equação característica:")
    table.insert(lines, "  |[K] - ω²*[M]| = 0")
    table.insert(lines, "")

    local M, mContrib = assembleM(state)
    local n = state.nDof

    table.insert(lines, "Matriz de Massa Global [M] (Consistente):")
    table.insert(lines, "Fórmula para v1, v2, θ1, θ2 consistentemente:")
    table.insert(lines, "  (ρ*A*L)/420 * [ 156, 22L, 54, -13L; 22L, 4L^2, 13L, -3L^2; 54, 13L, 156, -22L; -13L, -3L^2, -22L, 4L^2 ]")
    table.insert(lines, "Em termos de ρ*A*L:")

    for i = 1, n do
      for j = i, n do
        local mij = "M" .. i .. j
        local ent = mContrib[i][j]
        if #ent > 0 then
          local sym = {}
          for k = 1, #ent do
            local item = ent[k]
            local item_L = state.elems[item.el].L or 1
            local coef_idx = {
              { "156", "22*L", "54", "-13*L" },
              { "22*L", "4*L^2", "13*L", "-3*L^2" },
              { "54", "13*L", "156", "-22*L" },
              { "-13*L", "-3*L^2", "-22*L", "4*L^2" }
            }
            local term_formula = coef_idx[item.a][item.b]
            term_formula = term_formula:gsub("L%^2", exprFormatNumber(item_L^2) .. "*L^2")
            term_formula = term_formula:gsub("L", exprFormatNumber(item_L) .. "*L")
            table.insert(sym, string.format("(%s)/420 * ρ*A(%d)*L(%d)", term_formula, item.el, item.el))
          end
          local valStr = exprFormatNumber(M[i][j])
          table.insert(lines, "  " .. mij .. " = " .. table.concat(sym, " + ") .. " = " .. valStr)
        else
          table.insert(lines, "  " .. mij .. " = 0")
        end
        if j > i then
          table.insert(lines, "  M" .. j .. i .. " = " .. mij .. " = " .. exprFormatNumber(M[i][j]) .. " (simetria)")
        end
      end
    end

    local Kbar = assembleKNumeric(state)
    table.insert(lines, "")
    table.insert(lines, "Definindo λ = (ω² * ρ * A * L⁴) / (E * I):")
    table.insert(lines, "  |[Kbar] - λ*[Mbar]| = 0")
    table.insert(lines, "")

    local midRow = math.max(1, math.floor((n + 1) / 2))
    for i = 1, n do
      local rowStr = "  | "
      for j = 1, n do
        local k_val = Kbar[i][j]
        local m_val = M[i][j]
        local term = exprFormatNumber(k_val)
        if math.abs(m_val) > 1e-9 then
          if m_val < 0 then
            term = term .. " + " .. exprFormatNumber(math.abs(m_val)) .. "*λ"
          else
            term = term .. " - " .. exprFormatNumber(m_val) .. "*λ"
          end
        end
        rowStr = rowStr .. string.format("%-22s", term)
      end
      rowStr = rowStr .. " |"
      if i == midRow then
        rowStr = rowStr .. " = 0"
      end
      table.insert(lines, rowStr)
    end
    table.insert(lines, "")

    if n == 2 then
      local K11, K12, K22 = Kbar[1][1], Kbar[1][2], Kbar[2][2]
      local M11, M12, M22 = M[1][1], M[1][2], M[2][2]
      local a = M11 * M22 - M12 * M12
      local b = -(K11 * M22 + K22 * M11 - 2.0 * K12 * M12)
      local c = K11 * K22 - K12 * K12
      
      local bSign = b >= 0 and "+" or "-"
      local cSign = c >= 0 and "+" or "-"
      table.insert(lines, "Equação quadrática resolvente:")
      table.insert(lines, string.format("  %s*λ² %s %s*λ %s %s = 0", 
        exprFormatNumber(a), bSign, exprFormatNumber(math.abs(b)), cSign, exprFormatNumber(math.abs(c))))
    elseif n > 2 then
      table.insert(lines, "Equação característica polinomial obtida.")
    end

    local lams = solveEigenvalues(Kbar, M, n)
    if #lams == 0 then
      table.insert(lines, "Não foi possível encontrar autovalores reais.")
    else
      table.insert(lines, "")
      table.insert(lines, "Autovalores (λ):")
      for i = 1, #lams do
        table.insert(lines, string.format("  λ_%d = %s", i, exprFormatNumber(lams[i])))
      end
      table.insert(lines, "")
      
      table.insert(lines, "Frequências naturais (ω):")
      for i = 1, #lams do
        local val = math.sqrt(lams[i])
        table.insert(lines, string.format("  ω_%d = √(λ_%d) * √(EI/(ρ*A*L⁴)) = %s/L² * √(EI/(ρ*A))", i, i, exprFormatNumber(val)))
      end
      table.insert(lines, "")
      
      table.insert(lines, "Modos de Vibração (Autovetores):")
      for modeIdx = 1, #lams do
        local lam = lams[modeIdx]
        local A_sub = matrixSubtractScaled(Kbar, M, lam)
        local phi = buildModeShapeVector(A_sub)
        
        table.insert(lines, string.format("  Modo %d (λ_%d = %s):", modeIdx, modeIdx, exprFormatNumber(lam)))
        table.insert(lines, "  [[Kbar] - λ*[Mbar]] {U} = 0 =>")
        
        for r = 1, n do
          local rowStr = "    [ "
          for c = 1, n do
            rowStr = rowStr .. string.format("%-10s", exprFormatNumber(A_sub[r][c]))
          end
          rowStr = rowStr .. " ]"
          rowStr = rowStr .. string.format(" {U_%d}", r)
          if r == midRow then
            rowStr = rowStr .. " = 0"
          end
          table.insert(lines, rowStr)
        end
        
        if phi then
          table.insert(lines, "  Vetor do modo shape normalizado:")
          for j = 1, #phi do
            table.insert(lines, string.format("    U_%d = %s", j, exprFormatNumber(phi[j])))
          end
        end
        table.insert(lines, "")
      end
    end
    return lines
  end

  -- Options 7-11: max/zero finding
  if option >= 7 and option <= 11 then
    for _, l in ipairs(buildMaxZeroOptionLines(state, option, u, uByBase)) do
      table.insert(lines, l)
    end
    return lines
  end

  local e = state.defElem or 1
  if e < 1 then e = 1 end
  if e > state.nElem then e = state.nElem end
  local xi = state.defX or 0.5
  local el = state.elems[e]
  local L = el.L or 1
  local dofs = el.dofs

  -- Prepend equilibrium and displacements
  local eqLines = buildEquilibriumAndDisplacementsLines(state, u, uByBase, F)
  for _, l in ipairs(eqLines) do
    table.insert(lines, l)
  end

  if L == 0 then
    table.insert(lines, "Pós-processamento não aplicável a molas (elemento " .. e .. " é uma mola).")
    return lines
  end

  -- Symbolic label for element length: "L" when n=1, "2L" when n=2, "L/2" when n=0.5
  local function makeLsym(n)
    if math.abs(n - 1) < 1e-9 then return "L" end
    local ni = math.floor(n + 0.5)
    if ni > 0 and math.abs(n - ni) < 1e-9 then return tostring(ni).."L" end
    local m = math.floor(1/n + 0.5)
    if m > 0 and math.abs(1/n - m) < 1e-9 then return "L/"..tostring(m) end
    return exprFormatNumber(n).."L"
  end
  local eLsym = makeLsym(L)
  local eLsym2 = "("..eLsym..")^2"
  local eLsym3 = "("..eLsym..")^3"
  if L == math.floor(L + 0.5) and math.abs(L - math.floor(L + 0.5)) < 1e-9 then
    eLsym2 = eLsym.."^2"
    eLsym3 = eLsym.."^3"
  end

  -- Get local displacements
  local v1_val = (dofs[1] > 0 and dofs[1] <= #u) and u[dofs[1]] or Expr.new()
  local theta1_val = (dofs[2] > 0 and dofs[2] <= #u) and u[dofs[2]] or Expr.new()
  local v2_val = (dofs[3] > 0 and dofs[3] <= #u) and u[dofs[3]] or Expr.new()
  local theta2_val = (dofs[4] > 0 and dofs[4] <= #u) and u[dofs[4]] or Expr.new()

  table.insert(lines, "Deslocamentos locais no Elemento " .. e .. ":")
  table.insert(lines, "  v1 (gdl " .. dofs[1] .. ") = " .. Expr.toString(v1_val))
  table.insert(lines, "  θ1 (gdl " .. dofs[2] .. ") = " .. Expr.toString(theta1_val))
  table.insert(lines, "  v2 (gdl " .. dofs[3] .. ") = " .. Expr.toString(v2_val))
  table.insert(lines, "  θ2 (gdl " .. dofs[4] .. ") = " .. Expr.toString(theta2_val))
  table.insert(lines, "")

  local res = Expr.new()
  local L_ref, EI_ref = getRefs(state)
  local r_EI = (el.E or 1) * getElementI(el, state) / EI_ref
  local r_L = L_ref / L

  for base, ub in pairs(uByBase) do
    local v1 = ub[dofs[1]] or 0
    local theta1 = ub[dofs[2]] or 0
    local v2 = ub[dofs[3]] or 0
    local theta2 = ub[dofs[4]] or 0

    if option == 2 then
      -- Deflection v(x) = N1*v1 + N2*θ1 + N3*v2 + N4*θ2
      local N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi
      local N2 = xi - 2 * xi * xi + xi * xi * xi
      local N3 = 3 * xi * xi - 2 * xi * xi * xi
      local N4 = -xi * xi + xi * xi * xi
      local val = N1 * v1 + (N2 / r_L) * theta1 + N3 * v2 + (N4 / r_L) * theta2
      Expr.addInplace(res, val, getOptionDisplayBase(2, base))
    elseif option == 3 then
      -- Slope θ(x) = dN1*v1 + dN2*θ1 + dN3*v2 + dN4*θ2
      local dN1 = 6 * (-xi + xi * xi)
      local dN2 = 1 - 4 * xi + 3 * xi * xi
      local dN3 = 6 * (xi - xi * xi)
      local dN4 = -2 * xi + 3 * xi * xi
      local val = (dN1 * r_L) * v1 + dN2 * theta1 + (dN3 * r_L) * v2 + dN4 * theta2
      Expr.addInplace(res, val, getOptionDisplayBase(3, base))
    elseif option == 4 then
      -- Moment M(x) = E*I*v''(x)
      local ddN1 = 6 * (-1 + 2 * xi)
      local ddN2 = -4 + 6 * xi
      local ddN3 = 6 * (1 - 2 * xi)
      local ddN4 = -2 + 6 * xi
      local val = (ddN1 * r_EI * r_L * r_L) * v1 + (ddN2 * r_EI * r_L) * theta1 + (ddN3 * r_EI * r_L * r_L) * v2 + (ddN4 * r_EI * r_L) * theta2
      Expr.addInplace(res, val, getOptionDisplayBase(4, base))
    elseif option == 5 then
      -- Shear V(x) = E*I*v'''(x)
      local dddN1 = 12
      local dddN2 = 6
      local dddN3 = -12
      local dddN4 = 6
      local val = (dddN1 * r_EI * r_L * r_L * r_L) * v1 + (dddN2 * r_EI * r_L * r_L) * theta1 + (dddN3 * r_EI * r_L * r_L * r_L) * v2 + (dddN4 * r_EI * r_L * r_L) * theta2
      Expr.addInplace(res, val, getOptionDisplayBase(5, base))
    end
  end

  if option == 2 then
    local N1_str = formatShapeTermL(1 - 3 * xi * xi + 2 * xi * xi * xi, 0, eLsym)
    local N2_str = formatShapeTermL(xi - 2 * xi * xi + xi * xi * xi, 1, eLsym)
    local N3_str = formatShapeTermL(3 * xi * xi - 2 * xi * xi * xi, 0, eLsym)
    local N4_str = formatShapeTermL(-xi * xi + xi * xi * xi, 1, eLsym)
    table.insert(lines, "Fórmula de interpolação:")
    table.insert(lines, "  v(x) = N1(x)*v1 + N2(x)*θ1 + N3(x)*v2 + N4(x)*θ2")
    table.insert(lines, "")
    table.insert(lines, "Funções de forma (L_e = " .. eLsym .. "):")
    table.insert(lines, "  N1(x) = 1 - 3*(x/" .. eLsym .. ")^2 + 2*(x/" .. eLsym .. ")^3")
    table.insert(lines, "  N2(x) = (" .. eLsym .. ")*((x/" .. eLsym .. ") - 2*(x/" .. eLsym .. ")^2 + (x/" .. eLsym .. ")^3)")
    table.insert(lines, "  N3(x) = 3*(x/" .. eLsym .. ")^2 - 2*(x/" .. eLsym .. ")^3")
    table.insert(lines, "  N4(x) = (" .. eLsym .. ")*(-(x/" .. eLsym .. ")^2 + (x/" .. eLsym .. ")^3)")
    table.insert(lines, "")
    table.insert(lines, "Substituindo deslocamentos:")
    table.insert(lines, "  v(x) = " .. formatFourTerms("(1 - 3*(x/"..eLsym..")^2 + 2*(x/"..eLsym..")^3)", v1_val, "(("..eLsym..")*((x/"..eLsym..") - 2*(x/"..eLsym..")^2 + (x/"..eLsym..")^3))", theta1_val, "(3*(x/"..eLsym..")^2 - 2*(x/"..eLsym..")^3)", v2_val, "(("..eLsym..")*(-(x/"..eLsym..")^2 + (x/"..eLsym..")^3))", theta2_val))
    table.insert(lines, "")
    local x_str = exprFormatNumber(xi * L) .. "L"
    table.insert(lines, "Substituindo x = " .. x_str .. ":")
    table.insert(lines, "  v(x) = " .. formatFourTerms(N1_str, v1_val, N2_str, theta1_val, N3_str, v2_val, N4_str, theta2_val))
  elseif option == 3 then
    local dN1_str = formatShapeTermL(6 * (-xi + xi * xi), -1, eLsym)
    local dN2_str = formatShapeTermL(1 - 4 * xi + 3 * xi * xi, 0, eLsym)
    local dN3_str = formatShapeTermL(6 * (xi - xi * xi), -1, eLsym)
    local dN4_str = formatShapeTermL(-2 * xi + 3 * xi * xi, 0, eLsym)
    table.insert(lines, "Fórmula de interpolação da rotação:")
    table.insert(lines, "  θ(x) = N'1(x)*v1 + N'2(x)*θ1 + N'3(x)*v2 + N'4(x)*θ2")
    table.insert(lines, "")
    table.insert(lines, "Derivadas das funções de forma (L_e = " .. eLsym .. "):")
    table.insert(lines, "  N'1(x) = 6*(-(x/" .. eLsym .. ") + (x/" .. eLsym .. ")^2)/(" .. eLsym .. ")")
    table.insert(lines, "  N'2(x) = 1 - 4*(x/" .. eLsym .. ") + 3*(x/" .. eLsym .. ")^2")
    table.insert(lines, "  N'3(x) = 6*((x/" .. eLsym .. ") - (x/" .. eLsym .. ")^2)/(" .. eLsym .. ")")
    table.insert(lines, "  N'4(x) = -2*(x/" .. eLsym .. ") + 3*(x/" .. eLsym .. ")^2")
    table.insert(lines, "")
    table.insert(lines, "Substituindo deslocamentos:")
    table.insert(lines, "  θ(x) = " .. formatFourTerms("(6*(-(x/"..eLsym..") + (x/"..eLsym..")^2)/("..eLsym.."))", v1_val, "(1 - 4*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)", theta1_val, "(6*((x/"..eLsym..") - (x/"..eLsym..")^2)/("..eLsym.."))", v2_val, "(-2*(x/"..eLsym..") + 3*(x/"..eLsym..")^2)", theta2_val))
    table.insert(lines, "")
    local x_str = exprFormatNumber(xi * L) .. "L"
    table.insert(lines, "Substituindo x = " .. x_str .. ":")
    table.insert(lines, "  θ(x) = " .. formatFourTerms(dN1_str, v1_val, dN2_str, theta1_val, dN3_str, v2_val, dN4_str, theta2_val))
  elseif option == 4 then
    local ddN1_str = formatShapeTermL(6 * (-1 + 2 * xi), -2, eLsym)
    local ddN2_str = formatShapeTermL(-4 + 6 * xi, -1, eLsym)
    local ddN3_str = formatShapeTermL(6 * (1 - 2 * xi), -2, eLsym)
    local ddN4_str = formatShapeTermL(-2 + 6 * xi, -1, eLsym)
    local displayedI = state.useSubstitutedI and (tostring(state.subICoef or 2) .. "A(L^2)") or el.I
    local EI_val = (el.E or 1) * getElementI(el, state)
    table.insert(lines, "Fórmula de interpolação do momento fletor (E = " .. (el.E or 1) .. ", I = " .. tostring(displayedI) .. "):")
    table.insert(lines, "  M(x) = E*I*( N''1(x)*v1 + N''2(x)*θ1 + N''3(x)*v2 + N''4(x)*θ2 )")
    table.insert(lines, "")
    table.insert(lines, "Segundas derivadas das funções de forma (L_e = " .. eLsym .. "):")
    table.insert(lines, "  N''1(x) = 6*(-1 + 2*(x/" .. eLsym .. "))/" .. eLsym2)
    table.insert(lines, "  N''2(x) = (-4 + 6*(x/" .. eLsym .. "))/(" .. eLsym .. ")")
    table.insert(lines, "  N''3(x) = 6*(1 - 2*(x/" .. eLsym .. "))/" .. eLsym2)
    table.insert(lines, "  N''4(x) = (-2 + 6*(x/" .. eLsym .. "))/(" .. eLsym .. ")")
    table.insert(lines, "")
    table.insert(lines, "Substituindo deslocamentos:")
    table.insert(lines, "  M(x) = " .. exprFormatNumber(EI_val) .. " * ( " .. formatFourTerms("(6*(-1 + 2*(x/"..eLsym.."))/"..eLsym2..")", v1_val, "((-4 + 6*(x/"..eLsym.."))/("..eLsym.."))", theta1_val, "(6*(1 - 2*(x/"..eLsym.."))/"..eLsym2..")", v2_val, "((-2 + 6*(x/"..eLsym.."))/("..eLsym.."))", theta2_val) .. " )")
    table.insert(lines, "")
    local x_str = exprFormatNumber(xi * L) .. "L"
    table.insert(lines, "Substituindo x = " .. x_str .. ":")
    table.insert(lines, "  M(x) = " .. exprFormatNumber(EI_val) .. " * ( " .. formatFourTerms(ddN1_str, v1_val, ddN2_str, theta1_val, ddN3_str, v2_val, ddN4_str, theta2_val) .. " )")
  elseif option == 5 then
    local dddN1_str = formatShapeTermL(12, -3, eLsym)
    local dddN2_str = formatShapeTermL(6, -2, eLsym)
    local dddN3_str = formatShapeTermL(-12, -3, eLsym)
    local dddN4_str = formatShapeTermL(6, -2, eLsym)
    local displayedI = state.useSubstitutedI and (tostring(state.subICoef or 2) .. "A(L^2)") or el.I
    local EI_val = (el.E or 1) * getElementI(el, state)
    table.insert(lines, "Fórmula de interpolação do esforço transverso (E = " .. (el.E or 1) .. ", I = " .. tostring(displayedI) .. "):")
    table.insert(lines, "  V(x) = E*I*( N'''1(x)*v1 + N'''2(x)*θ1 + N'''3(x)*v2 + N'''4(x)*θ2 )")
    table.insert(lines, "")
    table.insert(lines, "Terceiras derivadas das funções de forma (L_e = " .. eLsym .. "):")
    table.insert(lines, "  N'''1(x) = 12/" .. eLsym3)
    table.insert(lines, "  N'''2(x) = 6/" .. eLsym2)
    table.insert(lines, "  N'''3(x) = -12/" .. eLsym3)
    table.insert(lines, "  N'''4(x) = 6/" .. eLsym2)
    table.insert(lines, "")
    table.insert(lines, "Substituindo deslocamentos:")
    table.insert(lines, "  V(x) = " .. exprFormatNumber(EI_val) .. " * ( " .. formatFourTerms("(12/"..eLsym3..")", v1_val, "(6/"..eLsym2..")", theta1_val, "(-12/"..eLsym3..")", v2_val, "(6/"..eLsym2..")", theta2_val) .. " )")
    table.insert(lines, "")
    local x_str = exprFormatNumber(xi * L) .. "L"
    table.insert(lines, "Substituindo x = " .. x_str .. ":")
    table.insert(lines, "  V(x) = " .. exprFormatNumber(EI_val) .. " * ( " .. formatFourTerms(dddN1_str, v1_val, dddN2_str, theta1_val, dddN3_str, v2_val, dddN4_str, theta2_val) .. " )")
  end

  local names = { "", "v(x)", "θ(x)", "M(x)", "V(x)" }
  table.insert(lines, "")
  table.insert(lines, "Elemento " .. e .. " em x=" .. exprFormatNumber(xi * L) .. "L:")
  table.insert(lines, "  " .. names[option] .. " = " .. Expr.toString(res))
  return lines
end

local function buildDefLines(state)
  local lines = {}
  local option = state.defOption or 1
  local options = {
    "Deslocamentos nodais",
    "Deflexao da viga v(x)",
    "Rotacao da viga th(x)",
    "Momento fletor M(x)",
    "Esforco transverso V(x)",
    "Frequencias e modos de vibracao",
    "Deslocamento maximo v_max",
    "Rotacao maxima th_max",
    "Momento maximo M_max",
    "Zeros de v(x) = 0",
    "Zeros de th(x) = 0"
  }

  table.insert(lines, "Opcoes:")
  for i, name in ipairs(options) do
    local cursor = (i == option) and "> " or "  "
    local selected = state.defSelected and state.defSelected[i]
    local marker = selected and "* " or "  "
    table.insert(lines, cursor .. marker .. name)
  end

  local cursor12 = (option == 12) and "> " or "  "
  local elemStr = "Elemento: "
  if option == 12 and state.defEditText then
    elemStr = elemStr .. state.defEditText .. "_"
  else
    elemStr = elemStr .. tostring(state.defElem or 1)
  end
  table.insert(lines, cursor12 .. "  " .. elemStr)

  local cursor13 = (option == 13) and "> " or "  "
  local xLStr = "x/L: "
  if option == 13 and state.defEditText then
    xLStr = xLStr .. state.defEditText .. "_"
  else
    xLStr = xLStr .. tostring(state.defX or 0.5)
  end
  table.insert(lines, cursor13 .. "  " .. xLStr)

  local cursor14 = (option == 14) and "> " or "  "
  local subISelected = state.useSubstitutedI and "* " or "  "
  table.insert(lines, cursor14 .. subISelected .. "Substituir I = nA(L^2)")

  local cursor15 = (option == 15) and "> " or "  "
  local subICoefStr = "n: "
  if option == 15 and state.defEditText then
    subICoefStr = subICoefStr .. state.defEditText .. "_"
  else
    subICoefStr = subICoefStr .. tostring(state.subICoef or 2)
  end
  table.insert(lines, cursor15 .. "  " .. subICoefStr)

  table.insert(lines, "")

  local activeOpt = state.defActiveOption or 1
  local optLines = buildDefOptionLines(state, activeOpt)
  for _, l in ipairs(optLines) do
    table.insert(lines, l)
  end

  return lines
end

local function fmtVal(val)
  if type(val) == "number" then
    return string.format("%.3g", val)
  else
    return tostring(val)
  end
end

local function buildMcTableLines(state)
  local lines = {}
  table.insert(lines, "**Tabela de conectividade (m.c.):")
  table.insert(lines, "| Elemento | v1 | θ1 | v2 | θ2 | L | E | I | A |")
  for i = 1, state.nElem do
    local el = state.elems[i]
    local d = el.dofs
    local coef = state.subICoef or 2
    local displayedI = state.useSubstitutedI and (tostring(coef) .. "A(L^2)") or el.I
    local row = string.format("|    %d     | %d  | %d   | %d  | %d   | %s | %s | %s | %s |",
      i, d[1], d[2], d[3], d[4], fmtVal(el.L), fmtVal(el.E), fmtVal(displayedI), fmtVal(el.A))
    table.insert(lines, row)
  end
  return lines
end

local function buildForceTableLines(state)
  local lines = {}
  table.insert(lines, "**Forças e Momentos nodais aplicados:")
  for i = 1, state.nDof do
    local displayBase = getForceDisplayBase(state, i, "P")
    table.insert(lines, string.format("F%d = %.4g * %s", i, state.forces[i] or 0, displayBase))
  end
  table.insert(lines, "")
  table.insert(lines, "**Cargas distribuídas nas vigas:")
  for i = 1, state.nElem do
    local el = state.elems[i]
    if el.py and el.py:gsub("%s+", "") ~= "" then
      table.insert(lines, string.format("Viga %d: p(x) = %s", i, el.py))
    else
      table.insert(lines, string.format("Viga %d: p(0) = %.4g , p(L) = %.4g",
        i, el.p0 or 0, el.pL or 0))
    end
  end
  return lines
end

-- ======================== TABS REGISTRATION ========================
function Viga.start()
  local state = storage.load("Viga_state", defaultState())
  ensureSizes(state)

  local mcTab = { title = "m.c." }

  local function getCellValue(row, col)
    local el = state.elems[row]
    if not el then return nil end
    if col >= 1 and col <= 4 then
      return el.dofs[col]
    elseif col == 5 then return el.L
    elseif col == 6 then return el.E
    elseif col == 7 then return el.I
    elseif col == 8 then return el.A
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

    if col >= 1 and col <= 4 then
      if text == "" or text == "-" then
        state.elems[row].dofs[col] = 0
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val < -1 or val > state.nDof then
        state.message = "GDL deve estar entre -1 e " .. tostring(state.nDof)
        return false
      end
      state.elems[row].dofs[col] = math.floor(val + 0.5)
    elseif col == 5 then
      if val == nil or val < 0 then return false end
      state.elems[row].L = val
    elseif col == 6 then
      if val == nil or val <= 0 then return false end
      state.elems[row].E = val
    elseif col == 7 then
      local numVal = tonumber(text)
      if numVal then
        if numVal <= 0 then
          state.message = "I deve ser maior que 0"
          return false
        end
        state.elems[row].I = numVal
      else
        if text == "" then
          state.message = "I invalido"
          return false
        end
        local cleanStr = preprocessFormula(text)
        local fn = parseExpr(cleanStr)
        if not fn then
          state.message = "Erro de sintaxe na formula de I"
          return false
        end
        local dummyVars = { A = 1, L = 1, E = 1, a = 1, l = 1, e = 1 }
        local success, testVal = pcall(fn, dummyVars)
        if not success or not testVal then
          state.message = "Erro ao avaliar formula de I"
          return false
        end
        state.elems[row].I = text
      end
    elseif col == 8 then
      if val == nil or val <= 0 then return false end
      state.elems[row].A = val
    end

    state.tab1EditText = nil
    state.message = "Célula atualizada."
    saveState(state)
    return true
  end

  local function ensureTab1SelectionVisible(h)
    local cellTop = 0
    local isTopTable = (state.tab1SelCol <= 4)
    if isTopTable then
      cellTop = 50 + 14 + 18 + (state.tab1SelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nElem * 18
      cellTop = 50 + topTableH + 8 + 14 + 18 + (state.tab1SelRow - 1) * 18
    end
    local cellBottom = cellTop + 18
    local scroll = state.tab1ScrollPx or 0
    if isTopTable then
      scroll = 0
    elseif cellTop - scroll < 50 then
      scroll = cellTop - 50
    elseif cellBottom - scroll > h then
      scroll = cellBottom - h
    end
    local totalH = 50 + (14 + 18 + state.nElem * 18) + 8 + (14 + 18 + state.nElem * 18)
    state.tab1ScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  local function viga_drawMcSection(gc, x, y, title, cols, rowCount, selRow, selCol, editText, getVal)
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

  function mcTab:render(gc, x, y, w, h, app)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 10)
    gc:drawString("Viga -Identificação GDL e m.c.", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Vigas:", x, y + 14, "top")
    gc:setColorRGB(200, 0, 0)
    gc:drawString(tostring(state.nElem), x + 35, y + 14, "top")
    gc:setColorRGB(20, 20, 20)
    gc:drawString("GDL:", x + 65, y + 14, "top")
    gc:setColorRGB(0, 70, 190)
    gc:drawString(tostring(state.nDof), x + 90, y + 14, "top")

    local bx = x + w - 110
    drawButton(gc, bx, y, 50, 15, "+Elem", false)
    drawButton(gc, bx + 54, y, 50, 15, "-Elem", false)
    drawButton(gc, bx, y + 17, 22, 15, "-G", false)
    drawButton(gc, bx + 24, y + 17, 22, 15, "+G", false)

    clearHits()
    addHit("add_elem", bx, y, 50, 15)
    addHit("rem_elem", bx + 54, y, 50, 15)
    addHit("ng_minus", bx, y + 17, 22, 15)
    addHit("ng_plus", bx + 24, y + 17, 22, 15)

    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.tab1ScrollPx or 0
    local topCols = {
      { label = "v1", col = 1, w = 24 },
      { label = "θ1", col = 2, w = 24 },
      { label = "v2", col = 3, w = 24 },
      { label = "θ2", col = 4, w = 24 }
    }
    local bottomCols = {
      { label = "L", col = 5, w = 45 },
      { label = "E", col = 6, w = 45 },
      { label = "I", col = 7, w = 45 },
      { label = "A", col = 8, w = 45 }
    }

    gc:clipRect("set", x, y + 50, w, h - 50)
    local topY = y + 50 - scrollPx
    viga_drawMcSection(gc, x, topY, "Vigas (v1-θ1-v2-θ2):", topCols, state.nElem, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
    
    local topTableH = 14 + 18 + state.nElem * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    viga_drawMcSection(gc, x, bottomY, "Geometria (L / E / I / A):", bottomCols, state.nElem, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
    gc:clipRect("reset")
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
      if col <= 4 then
        if row > 1 then
          row = row - 1
        else
          col = 5
          row = state.nElem
        end
      else
        if row > 1 then
          row = row - 1
        else
          col = 1
          row = state.nElem
        end
      end
    elseif key == keys.down then
      if col <= 4 then
        if row < state.nElem then
          row = row + 1
        else
          col = 5
          row = 1
        end
      else
        if row < state.nElem then
          row = row + 1
        else
          col = 1
          row = 1
        end
      end
    elseif key == keys.left then
      if col > 1 and col <= 4 then
        col = col - 1
      elseif col >= 5 then
        col = col - 1
      end
    elseif key == keys.right then
      if col < 4 then
        col = col + 1
      elseif col == 4 then
        col = 5
        row = math.min(row, state.nElem)
      elseif col >= 5 and col < 8 then
        col = col + 1
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
    local el = state.elems[row]
    if el and (el.L or 1) == 0 then
      state.message = "Mola (L=0): coloca o valor numerico de K na col E. Ex: K=8EI/L^3 com E=I=1, L=1 => escreve 8"
    else
      state.message = "Setas navegam nas células. Enter para editar."
    end
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
      local el = state.elems[hit.data.row]
      if el and (el.L or 1) == 0 then
        state.message = "Mola (L=0): coloca o valor numerico de K na col E. Ex: K=8EI/L^3 com E=I=1, L=1 => escreve 8"
      else
        state.message = "Setas navegam nas células. Enter para editar."
      end
    elseif hit.id == "add_elem" then
      if state.nElem < 6 then
        state.nElem = state.nElem + 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "rem_elem" then
      if state.nElem > 1 then
        state.nElem = state.nElem - 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "ng_minus" then
      if state.nDof > 1 then
        state.nDof = state.nDof - 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "ng_plus" then
      if state.nDof < 24 then
        state.nDof = state.nDof + 1
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
    local lines = { "[K] global:" }
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    return lines
  end

  local fTab = { title = "{F}" }

  local function getForceCellValue(row, col)
    if col == 1 then
      return state.forces[row]
    else
      local el = state.elems[row]
      if not el then return nil end
      if col == 2 then return el.p0
      elseif col == 3 then return el.pL
      elseif col == 4 then return el.py or ""
      end
    end
    return nil
  end

  local function commitForceCell()
    if state.forceSelRow == nil or state.forceSelCol == nil then return false end
    if state.forceEditText == nil then return true end

    local text = trim(state.forceEditText)
    local val = nil
    if state.forceSelCol ~= 4 then
      text = text:gsub(",", ".")
      val = tonumber(text)
    end

    local row = state.forceSelRow
    local col = state.forceSelCol

    if col == 1 then
      if text == "" then state.forces[row] = 0 else state.forces[row] = val or 0 end
    else
      local el = state.elems[row]
      if el then
        if col == 2 then
          if text == "" then el.p0 = 0 else el.p0 = val or 0 end
        elseif col == 3 then
          if text == "" then el.pL = 0 else el.pL = val or 0 end
        elseif col == 4 then
          el.py = text
        end
      end
    end

    state.forceEditText = nil
    state.message = "Célula atualizada."
    saveState(state)
    return true
  end

  local function ensureForceSelectionVisible(h)
    local cellTop = 0
    local isTopTable = (state.forceSelCol == 1)
    if isTopTable then
      cellTop = 50 + 14 + 18 + (state.forceSelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nDof * 18
      cellTop = 50 + topTableH + 8 + 14 + 18 + (state.forceSelRow - 1) * 18
    end
    local cellBottom = cellTop + 18
    local scroll = state.forceScrollPx or 0
    if isTopTable then
      scroll = 0
    elseif cellTop - scroll < 50 then
      scroll = cellTop - 50
    elseif cellBottom - scroll > h then
      scroll = cellBottom - h
    end
    local totalH = 50 + (14 + 18 + state.nDof * 18) + 8 + (14 + 18 + state.nElem * 18)
    state.forceScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  function fTab:render(gc, x, y, w, h, app)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 10)
    gc:drawString("Forças e Cargas Distribuídas", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Edite forças nodais (F1-Fn) e carga distribuída p(x)", x, y + 14, "top")

    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.forceScrollPx or 0
    local topCols = {
      { label = "Força nodal (P)", col = 1, w = 120 }
    }
    local bottomCols = {
      { label = "p(0)", col = 2, w = 45 },
      { label = "p(L)", col = 3, w = 45 },
      { label = "p(x)", col = 4, w = 90 }
    }

    gc:clipRect("set", x, y + 50, w, h - 50)
    local topY = y + 50 - scrollPx
    viga_drawMcSection(gc, x, topY, "Forças Nodais F (U):", topCols, state.nDof, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
    
    local topTableH = 14 + 18 + state.nDof * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    viga_drawMcSection(gc, x, bottomY, "Carga Distribuída p(x):", bottomCols, state.nElem, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
    gc:clipRect("reset")
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
      if col == 1 then
        if row > 1 then
          row = row - 1
        else
          col = 2
          row = state.nElem
        end
      else
        if row > 1 then
          row = row - 1
        else
          col = 1
          row = state.nDof
        end
      end
    elseif key == keys.down then
      if col == 1 then
        if row < state.nDof then
          row = row + 1
        else
          col = 2
          row = 1
        end
      else
        if row < state.nElem then
          row = row + 1
        else
          col = 1
          row = 1
        end
      end
    elseif key == keys.left then
      if col > 1 then
        col = col - 1
        if col == 1 then
          row = math.min(row, state.nDof)
        end
      end
    elseif key == keys.right then
      if col == 1 then
        col = 2
        row = math.min(row, state.nElem)
      elseif col < 4 then
        col = col + 1
      end
    elseif key == keys.enter then
      local val = getForceCellValue(row, col)
      state.forceEditText = val and tostring(val) or ""
      return true
    else
      return false
    end

    state.forceSelRow = row
    state.forceSelCol = col
    ensureForceSelectionVisible(app.height - app.tabHeight - 12)
    return true
  end

  function fTab:charIn(ch, app)
    if state.forceSelRow == nil then return false end
    local allowed = false
    if state.forceSelCol == 4 then
      allowed = ch:match("[%w%+%-%*/%^%(%)%s%.%,]") ~= nil
             or ch == "\xC2\xB7"    -- UTF-8 middle dot ·
             or ch == "\xC3\x97"    -- UTF-8 × multiplication sign
             or ch == "\xE2\x8B\x85" -- UTF-8 ⋅ dot operator
    else
      allowed = ch:match("[0-9%+%-%.,eE]") ~= nil
    end
    if allowed then
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

    if hit.id == "mc_cell" then
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
    local u, uByBase, err = solveDisplacements(state)
    local F = assembleF(state)

    if not u then
      if option ~= 6 then
        table.insert(steps, { type = "string", value = "Sistema global:\n[K]{u} = {F}\n\nMatriz de rigidez global [K] (termos translacionais em EI/L^3, mistos em EI/L^2, rotacionais em EI/L):" })
        local K = assembleK(state)
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças {F} (forças em P, p*L; momentos em P*L, p*L^2):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução automática indisponível: " .. err })
      end
    end

    if #steps == 0 then
      if option == 1 then
        local K = assembleK(state)
        table.insert(steps, { type = "string", value = "Matriz de rigidez global [K] (termos translacionais em EI/L^3, mistos em EI/L^2, rotacionais em EI/L):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças globais {F} (forças em P, p*L; momentos em P*L, p*L^2):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução dos Deslocamentos U (deslocamentos em PL^3/EI, pL^4/EI; rotações em PL^2/EI, pL^3/EI):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u) })
        local lines = buildDefOptionLines(state, 1)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      elseif option == 6 then
        table.insert(steps, { type = "string", value = "Frequências Naturais e Modos de Vibração:\nEquação característica: |[K] - ω²*[M]| = 0" })
        local M, mContrib = assembleM(state)
        local n = state.nDof

        local mLines = { "Matriz de Massa Global [M] (Consistente, em termos de ρ*A*L):", "Fórmula para v1, v2, θ1, θ2 consistentemente:", "  (ρ*A*L)/420 * [ 156, 22L, 54, -13L; 22L, 4L^2, 13L, -3L^2; 54, 13L, 156, -22L; -13L, -3L^2, -22L, 4L^2 ]", "Em termos de ρ*A*L:" }
        for i = 1, n do
          for j = i, n do
            local mij = "M" .. i .. j
            local ent = mContrib[i][j]
            if #ent > 0 then
              local sym = {}
              for k = 1, #ent do
                local item = ent[k]
                local item_L = state.elems[item.el].L or 1
                local coef_idx = {
                  { "156", "22*L", "54", "-13*L" },
                  { "22*L", "4*L^2", "13*L", "-3*L^2" },
                  { "54", "13*L", "156", "-22*L" },
                  { "-13*L", "-3*L^2", "-22*L", "4*L^2" }
                }
                local term_formula = coef_idx[item.a][item.b]
                term_formula = term_formula:gsub("L%^2", exprFormatNumber(item_L^2) .. "*L^2")
                term_formula = term_formula:gsub("L", exprFormatNumber(item_L) .. "*L")
                table.insert(sym, string.format("(%s)/420 * ρ*A(%d)*L(%d)", term_formula, item.el, item.el))
              end
              local valStr = exprFormatNumber(M[i][j])
              table.insert(mLines, "  " .. mij .. " = " .. table.concat(sym, " + ") .. " = " .. valStr)
            else
              table.insert(mLines, "  " .. mij .. " = 0")
            end
            if j > i then
              table.insert(mLines, "  M" .. j .. i .. " = " .. mij .. " = " .. exprFormatNumber(M[i][j]) .. " (simetria)")
            end
          end
        end
        table.insert(steps, { type = "string", value = table.concat(mLines, "\n") })
        table.insert(steps, { type = "matrix", value = M })

        -- Kbar stiffness matrix
        local Kbar = assembleKNumeric(state)
        table.insert(steps, { type = "string", value = "Matriz de rigidez reduzida [Kbar] (termos translacionais em EI/L^3, mistos em EI/L^2, rotacionais em EI/L):" })
        table.insert(steps, { type = "matrix", value = Kbar })

        local eqLines = { "Definindo λ = (ω² * ρ * A * L⁴) / (E * I):", "  |[Kbar] - λ*[Mbar]| = 0", "" }
        local midRow = math.max(1, math.floor((n + 1) / 2))
        for i = 1, n do
          local rowStr = "  | "
          for j = 1, n do
            local k_val = Kbar[i][j]
            local m_val = M[i][j]
            local term = exprFormatNumber(k_val)
            if math.abs(m_val) > 1e-9 then
              if m_val < 0 then
                term = term .. " + " .. exprFormatNumber(math.abs(m_val)) .. "*λ"
              else
                term = term .. " - " .. exprFormatNumber(m_val) .. "*λ"
              end
            end
            rowStr = rowStr .. string.format("%-22s", term)
          end
          rowStr = rowStr .. " |"
          if i == midRow then
            rowStr = rowStr .. " = 0"
          end
          table.insert(eqLines, rowStr)
        end

        if n == 2 then
          local K11, K12, K22 = Kbar[1][1], Kbar[1][2], Kbar[2][2]
          local M11, M12, M22 = M[1][1], M[1][2], M[2][2]
          local a = M11 * M22 - M12 * M12
          local b = -(K11 * M22 + K22 * M11 - 2.0 * K12 * M12)
          local c = K11 * K22 - K12 * K12
          local bSign = b >= 0 and "+" or "-"
          local cSign = c >= 0 and "+" or "-"
          table.insert(eqLines, "")
          table.insert(eqLines, "Equação quadrática resolvente:")
          table.insert(eqLines, string.format("  %s*λ² %s %s*λ %s %s = 0", 
            exprFormatNumber(a), bSign, exprFormatNumber(math.abs(b)), cSign, exprFormatNumber(math.abs(c))))
        elseif n > 2 then
          table.insert(eqLines, "")
          table.insert(eqLines, "Equação característica polinomial obtida.")
        end
        table.insert(steps, { type = "string", value = table.concat(eqLines, "\n") })

        local lams = solveEigenvalues(Kbar, M, n)
        if #lams == 0 then
          table.insert(steps, { type = "string", value = "Não foi possível encontrar autovalores reais." })
        else
          table.insert(steps, { type = "string", value = "Autovalores (λ):" })
          table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(lams) })

          local freqLines = { "Frequências naturais (ω):" }
          for i = 1, #lams do
            local val = math.sqrt(lams[i])
            table.insert(freqLines, string.format("  ω_%d = √(λ_%d) * √(EI/(ρ*A*L⁴)) = %s/L² * √(EI/(ρ*A))", i, i, exprFormatNumber(val)))
          end
          table.insert(steps, { type = "string", value = table.concat(freqLines, "\n") })

          for modeIdx = 1, #lams do
            local lam = lams[modeIdx]
            local A_sub = matrixSubtractScaled(Kbar, M, lam)
            local phi = buildModeShapeVector(A_sub)

            local modeLines = { string.format("Modo %d (λ_%d = %s):", modeIdx, modeIdx, exprFormatNumber(lam)), "  [[Kbar] - λ*[Mbar]] {U} = 0 =>" }
            for r = 1, n do
              local rowStr = "    [ "
              for c = 1, n do
                rowStr = rowStr .. string.format("%-10s", exprFormatNumber(A_sub[r][c]))
              end
              rowStr = rowStr .. " ]"
              rowStr = rowStr .. string.format(" {U_%d}", r)
              if r == midRow then
                rowStr = rowStr .. " = 0"
              end
              table.insert(modeLines, rowStr)
            end
            table.insert(steps, { type = "string", value = table.concat(modeLines, "\n") })
            table.insert(steps, { type = "matrix", value = A_sub })

            if phi then
              table.insert(steps, { type = "string", value = "Vetor de modo de vibração {phi} (deslocamentos normalizados, rotações em termos de 1/L):" })
              table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(phi) })
            end
          end
        end
      else
        local lines = buildDefOptionLines(state, option)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      end
    end

    for i = 1, #steps do
      local step = steps[i]
      var.store(varName .. tostring(i), step.value)
    end
  end

  storeGlobalVariables = function(state)
    if not (var and var.store) then return end

    -- 1. Step-by-step resolution of K's (v_ks)
    local ksLines = buildKsLines(state)
    var.store("v_ks", table.concat(ksLines, "\n"))

    -- 2. Global stiffness matrix K (v_kmatrix) as a math matrix (numeric)
    local K = assembleK(state)
    local K_num = Matrix.toNumericFull(K)
    var.store("v_kmatrix", K_num)

    -- 3. Global mass matrix M (v_mmatrix) as a math matrix (numeric)
    local M = assembleM(state)
    var.store("v_mmatrix", M)

    -- 4. Options in Def tab
    local optionNames = {
      "v_desln", "v_deflex", "v_rotac", "v_momf", "v_esft", "v_vibr",
      "v_deslmax", "v_rotmax", "v_mommax", "v_zerov", "v_zeroth"
    }
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

    -- 5. Mega-string: full resolution in one variable (v_resolucao)
    -- Text-only: matrices are stored separately as real matrix objects.
    -- In Notes, use each matrix variable directly for proper matrix display.
    local totalLines = {}
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
    table.insert(totalLines, "  >> Ver variavel: v_kmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== [M] GLOBAL ===")
    table.insert(totalLines, "  >> Ver variavel: v_mmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== FORCAS APLICADAS ===")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== RESOLUCAO (DEF) ===")
    local defOptions = {
      "Deslocamentos nodais",
      "Deflexao da viga v(x)",
      "Rotacao da viga th(x)",
      "Momento fletor M(x)",
      "Esforco transverso V(x)",
      "Frequencias e modos de vibracao",
      "Deslocamento maximo v_max",
      "Rotacao maxima th_max",
      "Momento maximo M_max",
      "Zeros de v(x) = 0",
      "Zeros de th(x) = 0"
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
    var.store("v_resolucao", table.concat(totalLines, "\n"))
  end

  local defTab = { title = "Def" }
  function defTab:getLines()
    return buildDefLines(state)
  end
  function defTab:handleKey(key)
    if state.defEditText ~= nil then
      if key == keys.enter then
        local text = trim(state.defEditText)
        text = text:gsub(",", ".")
        local val = tonumber(text)
        if state.defOption == 12 then
          if val and val >= 1 and val <= state.nElem then
            state.defElem = math.floor(val)
          end
        elseif state.defOption == 13 then
          if val and val >= 0 and val <= 1 then
            state.defX = val
          end
        elseif state.defOption == 15 then
          if val and val > 0 then
            state.subICoef = val
          end
        end
        state.defEditText = nil
        saveState(state)
        return true
      elseif key == keys.escape then
        state.defEditText = nil
        saveState(state)
        return true
      end
    end

    if key == keys.up then
      state.defOption = math.max(1, (state.defOption or 1) - 1)
      if state.defOption >= 1 and state.defOption <= 11 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.down then
      state.defOption = math.min(15, (state.defOption or 1) + 1)
      if state.defOption >= 1 and state.defOption <= 11 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.left then
      if state.defOption == 12 then
        state.defElem = math.max(1, (state.defElem or 1) - 1)
        saveState(state)
        return true
      elseif state.defOption == 13 then
        state.defX = math.max(0, math.floor(((state.defX or 0.5) - 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      elseif state.defOption == 15 then
        state.subICoef = math.max(0.1, math.floor(((state.subICoef or 2) - 0.5) * 10 + 0.5) / 10)
        saveState(state)
        return true
      end
    elseif key == keys.right then
      if state.defOption == 12 then
        state.defElem = math.min(state.nElem, (state.defElem or 1) + 1)
        saveState(state)
        return true
      elseif state.defOption == 13 then
        state.defX = math.min(1, math.floor(((state.defX or 0.5) + 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      elseif state.defOption == 15 then
        state.subICoef = math.floor(((state.subICoef or 2) + 0.5) * 10 + 0.5) / 10
        saveState(state)
        return true
      end
    elseif key == keys.enter then
      local opt = state.defOption or 1
      if opt >= 1 and opt <= 11 then
        state.defSelected = state.defSelected or {}
        state.defSelected[opt] = not state.defSelected[opt]
        saveState(state)
        return true
      elseif opt == 12 then
        state.defEditText = tostring(state.defElem or 1)
        return true
      elseif opt == 13 then
        state.defX = state.defX or 0.5
        state.defEditText = tostring(state.defX)
        return true
      elseif opt == 14 then
        state.useSubstitutedI = not state.useSubstitutedI
        saveState(state)
        return true
      elseif opt == 15 then
        state.subICoef = state.subICoef or 2
        state.defEditText = tostring(state.subICoef)
        return true
      end
    end
    return false
  end
  function defTab:charIn(ch, app)
    local opt = state.defOption or 1
    if opt == 12 or opt == 13 or opt == 15 then
      if ch:match("[0-9%+%-%.,eE]") then
        if state.defEditText == nil then state.defEditText = "" end
        state.defEditText = state.defEditText .. ch
        return true
      end
    end
    if state.defEditText == nil then
      if ch == "s" or ch == "S" then
        app:scroll(app.lineHeight)
        return true
      elseif ch == "w" or ch == "W" then
        app:scroll(-app.lineHeight)
        return true
      end
    end
    return false
  end
  function defTab:backspaceKey(app)
    local opt = state.defOption or 1
    if opt == 12 or opt == 13 or opt == 15 then
      if state.defEditText ~= nil and #state.defEditText > 0 then
        state.defEditText = string.sub(state.defEditText, 1, #state.defEditText - 1)
        return true
      end
    end
    return false
  end
  function defTab:escapeKey(app)
    if state.defEditText ~= nil then
      state.defEditText = nil
      saveState(state)
      return true
    end
    return false
  end

  local copiaTab = { title = "Copia" }
  function copiaTab:getLines()
    local lines = {}
    for _, line in ipairs(buildMcTableLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**Ks")
    for _, line in ipairs(buildKsLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**[K] global")
    local K = assembleK(state)
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "**Def")
    
    local options = {
      "Deslocamentos nodais",
      "Deflexao da viga v(x)",
      "Rotacao da viga th(x)",
      "Momento fletor M(x)",
      "Esforco transverso V(x)",
      "Frequencias e modos de vibracao",
      "Deslocamento maximo v_max",
      "Rotacao maxima th_max",
      "Momento maximo M_max",
      "Zeros de v(x) = 0",
      "Zeros de th(x) = 0"
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

  function copiaTab:charIn(ch, app)
    if ch == "s" or ch == "S" then
      app:scroll(app.lineHeight)
      return true
    elseif ch == "w" or ch == "W" then
      app:scroll(-app.lineHeight)
      return true
    end
    return false
  end

  local app = ui.newApp("Viga", { mcTab, ksTab, kTab, fTab, defTab, copiaTab })
  ui.bind(app)

  -- Automatically store/populate variables on startup
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

if not _G.__TI_MAINMENU__ then
  Viga.start()
end

return Viga
