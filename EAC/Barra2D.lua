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
  if e == nil then return n end
  n.const = e.const or 0
  for k, v in pairs(e.terms or {}) do
    n.terms[k] = v
  end
  return n
end

function Expr.isZero(e)
  if e == nil then return true end
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
  if e == nil then return e end
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
  if b and b.const then
    e.const = (e.const or 0) + b.const
  end
  for base, coef in pairs(b and b.terms or {}) do
    Expr.addInplace(e, coef, base)
  end
  return e
end

function Expr.sub(a, b)
  local e = Expr.clone(a)
  if b and b.const then
    e.const = (e.const or 0) - b.const
  end
  for base, coef in pairs(b and b.terms or {}) do
    Expr.addInplace(e, -coef, base)
  end
  return e
end

function Expr.scale(e, s)
  local n = Expr.new()
  if e == nil then return n end
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
  if e == nil then return nil end
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
  if e == nil or Expr.isZero(e) then
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
  if e == nil then return 0 end
  return (e.terms or {})[base] or 0
end

function Expr.getBases(e)
  local bases = {}
  if e == nil then return bases end
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

-- ======================== TRIG/MATH UTILITIES ========================
local function cosd(d)
  return math.cos(math.rad(d or 0))
end

local function sind(d)
  return math.sin(math.rad(d or 0))
end

local function asNum(s, default)
  local t = trim(s)
  if t == "" then return default end
  t = t:gsub(",", ".")
  local v = tonumber(t)
  if v == nil then return default end
  return v
end

-- ======================== BARRA2D FEA ENGINE ========================
local Barra2D = {}

local function defaultState()
  return {
    nBar = 2,
    nDof = 4,
    bars = {
      { dofs = { 1, 2, 3, 4 }, th1 = 0, th2 = 0, theta = 0, L = 1, E = 1, A = 1, p0 = 0, pL = 0, py = "" },
      { dofs = { 1, 2, 3, 4 }, th1 = 0, th2 = 0, theta = 0, L = 1, E = 1, A = 1, p0 = 0, pL = 0, py = "" }
    },
    forces = { 0, 0, 0, 0 },
    defOption = 1,
    defBar = 1,
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
  if state.nBar == nil then state.nBar = 2 end
  if state.nDof == nil then state.nDof = 4 end
  if state.nBar < 1 then state.nBar = 1 end
  if state.nBar > 6 then state.nBar = 6 end
  if state.nDof < 1 then state.nDof = 1 end
  if state.nDof > 18 then state.nDof = 18 end

  state.bars = state.bars or {}
  for i = 1, state.nBar do
    if state.bars[i] == nil then
      state.bars[i] = { dofs = { 1, 2, 3, 4 }, th1 = 0, th2 = 0, theta = 0, L = 1, E = 1, A = 1, p0 = 0, pL = 0, py = "" }
    end
    state.bars[i].dofs = state.bars[i].dofs or { 1, 2, 3, 4 }
    for k = 1, 4 do
      if state.bars[i].dofs[k] == nil or state.bars[i].dofs[k] > state.nDof or state.bars[i].dofs[k] < 0 then
        state.bars[i].dofs[k] = 0
      end
    end
    if state.bars[i].th1 == nil then
      state.bars[i].th1 = state.bars[i].theta or 0
    end
    if state.bars[i].th2 == nil then
      state.bars[i].th2 = state.bars[i].theta or 0
    end
    if state.bars[i].p0 == nil then
      state.bars[i].p0 = state.bars[i].loadP or 0
    end
    if state.bars[i].pL == nil then
      state.bars[i].pL = 0
    end
    if state.bars[i].py == nil then
      state.bars[i].py = ""
    end
  end
  for i = state.nBar + 1, #state.bars do
    state.bars[i] = nil
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
  if state.defBar == nil then state.defBar = 1 end
  if state.defX == nil then state.defX = 0.5 end
end

local storeGlobalVariables

local function saveState(state)
  storage.save("Barra2D_state", state)
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

local function trigFactorName(i, j, th1, th2)
  local names = { "cos(" .. tostring(th1) .. "°)", "sin(" .. tostring(th1) .. "°)", "cos(" .. tostring(th2) .. "°)", "sin(" .. tostring(th2) .. "°)" }
  local signs = { 1, 1, -1, -1 }
  local sign = signs[i] * signs[j]
  local a = names[i]
  local b = names[j]
  local body
  if a == b then
    body = a .. "^2"
  else
    body = a .. "*" .. b
  end
  if sign < 0 then
    return "-" .. body
  end
  return body
end

local function barra2dContributionText(b, i, j, e)
  if (b.L or 1) == 0 then
    local factorStr = exprFormatNumber(b.E or 1) .. "*EA/L"
    local val = factorStr .. "*" .. trigFactorName(i, j, b.th1 or 0, b.th2 or 0)
    local sym = "k" .. i .. j .. "_s" .. e
    return sym, val
  end
  local num = (b.E or 1) * (b.A or 1)
  local den = b.L or 1
  local numStr = math.abs(num - 1) < 1e-9 and "EA" or (exprFormatNumber(num) .. "*EA")
  local denStr = math.abs(den - 1) < 1e-9 and "L" or (exprFormatNumber(den) .. "L")
  local factorStr = numStr .. "/" .. denStr
  local val = factorStr .. "*" .. trigFactorName(i, j, b.th1 or 0, b.th2 or 0)
  local sym = "k" .. i .. j .. "_b" .. e
  return sym, val
end

local function assembleK(state)
  local n = state.nDof
  local K = Matrix.zeros(n, n)
  local steps = {}

  for e = 1, state.nBar do
    local b = state.bars[e]
    local c1 = cosd(b.th1)
    local s1 = sind(b.th1)
    local c2 = cosd(b.th2)
    local s2 = sind(b.th2)
    local L = b.L or 1
    
    local factor, baseName
    if L == 0 then
      factor = b.E or 1
      baseName = "EA/L"
    else
      factor = (b.E or 1) * (b.A or 1) / L
      baseName = "EA/L"
    end

    local v = { c1, s1, -c2, -s2 }
    local k = {}
    for i = 1, 4 do
      k[i] = {}
      for j = 1, 4 do
        k[i][j] = v[i] * v[j]
      end
    end

    for i = 1, 4 do
      local gi = b.dofs[i]
      if gi and gi > 0 then
        for j = 1, 4 do
          local gj = b.dofs[j]
          if gj and gj > 0 then
            local expr = Expr.fromTerm(factor * k[i][j], baseName)
            Matrix.addExpr(K, gi, gj, expr)
            local key = gi .. "," .. gj
            steps[key] = steps[key] or { symbols = {}, values = {} }
            local sym, val = barra2dContributionText(b, i, j, e)
            table.insert(steps[key].symbols, sym)
            table.insert(steps[key].values, val)
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
      s = 1 - xi
    elseif shapeIdx == 2 then
      s = xi
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

  for e = 1, state.nBar do
    local b = state.bars[e]
    local L = b.L or 1
    local p0 = b.p0 or 0
    local pL = b.pL or 0
    local dofs = b.dofs
    local g1, g2, g3, g4 = dofs[1], dofs[2], dofs[3], dofs[4]

    local c1 = cosd(b.th1 or b.theta or 0)
    local s1 = sind(b.th1 or b.theta or 0)
    local c2 = cosd(b.th2 or b.theta or 0)
    local s2 = sind(b.th2 or b.theta or 0)

    local f1, f2 = 0, 0
    if b.py and b.py:gsub("%s+", "") ~= "" then
      local pyFn = parseExpr(b.py)
      if pyFn then
        f1 = integrateExpression(pyFn, 1, L)
        f2 = integrateExpression(pyFn, 2, L)
      else
        f1, f2 = 0, 0
        state.message = "Erro de sintaxe em p(x) da barra " .. e
      end
    else
      f1 = L/6 * (2 * p0 + pL)
      f2 = L/6 * (p0 + 2 * pL)
    end

    if g1 and g1 > 0 then Expr.addInplace(F[g1], f1 * c1, "p") end
    if g2 and g2 > 0 then Expr.addInplace(F[g2], f1 * s1, "p") end
    if g3 and g3 > 0 then Expr.addInplace(F[g3], f2 * c2, "p") end
    if g4 and g4 > 0 then Expr.addInplace(F[g4], f2 * s2, "p") end
  end

  return F
end

local function solveDisplacements(state)
  local K, _ = assembleK(state)
  local base = Matrix.extractSingleBase(K)
  if base == nil then
    return nil, nil, "K tem múltiplos termos simbólicos."
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
  local uByBase = {}
  for i = 1, state.nDof do
    u[i] = Expr.new()
  end

  for b, _ in pairs(baseTerms) do
    local Fb = {}
    for i = 1, #F do
      Fb[i] = Expr.getCoeff(F[i], b)
    end
    local ub, err = Matrix.solveNumeric(Kbar, Fb)
    if not ub then
      return nil, nil, err
    end
    uByBase[b] = ub
    local displayBase = b .. "/" .. base
    if base == "EA/L" then
      if b == "p" then
        displayBase = "pL^2/EA"
      else
        displayBase = b .. "L/EA"
      end
    end
    for i = 1, #ub do
      Expr.addInplace(u[i], ub[i], displayBase)
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

local function assembleMbar(state)
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

  for e = 1, state.nBar do
    local b = state.bars[e]
    local c1 = cosd(b.th1)
    local s1 = sind(b.th1)
    local c2 = cosd(b.th2)
    local s2 = sind(b.th2)
    local L = b.L or 1
    local A = b.A or 1
    local fM = A * L

    local me = {
      { fM/3 * c1*c1, fM/3 * c1*s1, fM/6 * c1*c2, fM/6 * c1*s2 },
      { fM/3 * s1*c1, fM/3 * s1*s1, fM/6 * s1*c2, fM/6 * s1*s2 },
      { fM/6 * c2*c1, fM/6 * c2*s1, fM/3 * c2*c2, fM/3 * c2*s2 },
      { fM/6 * s2*c1, fM/6 * s2*s1, fM/3 * s2*c2, fM/3 * s2*s2 }
    }

    local dofs = b.dofs
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

  return M, mContrib
end

local function barra_det3(A)
  return A[1][1] * (A[2][2] * A[3][3] - A[2][3] * A[3][2])
       - A[1][2] * (A[2][1] * A[3][3] - A[2][3] * A[3][1])
       + A[1][3] * (A[2][1] * A[3][2] - A[2][2] * A[3][1])
end

local function barra_bisectRoots(f, a, b, tol, ns, maxRoots)
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
      return barra_det3(A)
    end

    local lamMax = 0
    for i = 1, 3 do
      if math.abs(Mr[i][i]) > 1e-14 then
        lamMax = math.max(lamMax, math.abs(Kr[i][i] / Mr[i][i]))
      end
    end
    if lamMax < 1e-8 then lamMax = 1 end
    return barra_bisectRoots(fdet, 0.0, lamMax * 10.0, 1e-6, 200, 3)
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
    local n2 = math.abs(r2[1] or 0) + math.abs(r2[2] or 0)
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

local function buildDefOptionLines(state, option)
  local lines = {}
  local K = assembleK(state)
  local F = assembleF(state)
  local base = Matrix.extractSingleBase(K)
  
  local u, uByBase, err = solveDisplacements(state)
  if not u then
    table.insert(lines, "Sistema global:")
    table.insert(lines, "[K]{u} = {F}")
    for _, line in ipairs(Matrix.formatLines(K)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    for _, line in ipairs(Matrix.vectorFormatLines(F)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "Resolução automática indisponível: " .. err)
    return lines
  end

  if option == 1 then
    table.insert(lines, "Equações de Equilíbrio [K]{U} = {F}:")
    if base then
      local Kbar = Matrix.toNumeric(K, base)
      local baseTerms = {}
      for i = 1, #F do
        for _, b in ipairs(Expr.getBases(F[i])) do
          baseTerms[b] = true
        end
      end
      
      for fb, _ in pairs(baseTerms) do
        table.insert(lines, "Em termos de " .. fb .. ":")
        table.insert(lines, "=> Sistema:")
        for i = 1, state.nDof do
          local rowParts = {}
          for j = 1, state.nDof do
            local val = Kbar[i][j]
            if math.abs(val) > 1e-9 then
              local sign = val < 0 and "-" or "+"
              local absVal = math.abs(val)
              local termStr = ""
              if math.abs(absVal - 1) < 1e-9 then
                termStr = "U" .. j
              else
                termStr = exprFormatNumber(absVal) .. "*U" .. j
              end
              table.insert(rowParts, { sign = sign, text = termStr })
            end
          end
          
          local lhs = ""
          for idx, p in ipairs(rowParts) do
            if idx == 1 then
              if p.sign == "-" then
                lhs = "-" .. p.text
              else
                lhs = p.text
              end
            else
              lhs = lhs .. " " .. p.sign .. " " .. p.text
            end
          end
          if lhs == "" then lhs = "0" end
          
          local rhsCoef = Expr.getCoeff(F[i], fb)
          local rhsStr = ""
          local scaledBase = (base == "EA/L") and (fb .. "L/EA") or (base and (fb .. "/(" .. base .. ")") or fb)
          if fb == "p" and base == "EA/L" then
            scaledBase = "pL^2/EA"
          end
          if math.abs(rhsCoef) < 1e-9 then
            rhsStr = "0"
          else
            if math.abs(math.abs(rhsCoef) - 1) < 1e-9 then
              rhsStr = (rhsCoef < 0 and "-" or "") .. scaledBase
            else
              rhsStr = exprFormatNumber(rhsCoef) .. "*" .. scaledBase
            end
          end
          table.insert(lines, "   { " .. lhs .. " = " .. rhsStr)
        end
      end
    end
    
    table.insert(lines, "")
    table.insert(lines, "Resolução dos Deslocamentos:")
    for i = 1, #u do
      table.insert(lines, "U" .. i .. " = " .. Expr.toString(u[i]))
    end

    elseif option == 2 then
    table.insert(lines, "Esforço normal e tensão por barra:")
    for e = 1, state.nBar do
      local b = state.bars[e]
      local c1 = cosd(b.th1)
      local s1 = sind(b.th1)
      local c2 = cosd(b.th2)
      local s2 = sind(b.th2)
      local L = b.L or 1
      local dofs = b.dofs
      
      if L == 0 then
        table.insert(lines, "--- Mola " .. e .. " ---")
        table.insert(lines, "Relações constitutivas:")
        local kStr = exprFormatNumber(b.E or 1) .. "*EA/L"
        table.insert(lines, "  N = k * δ")
        table.insert(lines, "  N = (" .. kStr .. ") * (u2 - u1)")
        table.insert(lines, "  δ = u2 - u1")
      else
        table.insert(lines, "--- Barra " .. e .. " ---")
        table.insert(lines, "Relações constitutivas e cinemáticas:")
        table.insert(lines, "  σ = E * ε")
        local eStr = math.abs(b.E - 1) < 1e-9 and "E" or exprFormatNumber(b.E) .. "E"
        local lStr = math.abs(b.L - 1) < 1e-9 and "L" or exprFormatNumber(b.L) .. "L"
        table.insert(lines, "  σ = (" .. eStr .. ")/(" .. lStr .. ") * (u2 - u1)")
        table.insert(lines, "  δ = u2 - u1")
      end
      table.insert(lines, "Transformação de coordenadas:")
      
      local uName = {}
      for i = 1, 4 do
        local d = dofs[i]
        uName[i] = (d and d > 0) and ("U" .. d) or "0"
      end

      local function padR(str, len)
        return str .. string.rep(" ", math.max(0, len - #str))
      end

      local th1Str = exprFormatNumber(b.th1)
      local th2Str = exprFormatNumber(b.th2)
      local c1Str = "cos " .. th1Str
      local s1Str = "sin " .. th1Str
      local c2Str = "cos " .. th2Str
      local s2Str = "sin " .. th2Str

      local col1_w = math.max(10, #c1Str) + 1
      local col2_w = math.max(10, #s1Str) + 1
      local col3_w = math.max(10, #c2Str) + 1
      local col4_w = math.max(10, #s2Str) + 1

      local r1_col1 = padR(c1Str, col1_w)
      local r1_col2 = padR(s1Str, col2_w)
      local r1_col3 = padR("0", col3_w)
      local r1_col4 = padR("0", col4_w)

      local r2_col1 = padR("0", col1_w)
      local r2_col2 = padR("0", col2_w)
      local r2_col3 = padR(c2Str, col3_w)
      local r2_col4 = padR(s2Str, col4_w)

      local matrix_w = col1_w + col2_w + col3_w + col4_w

      table.insert(lines, "  {u} = [R]{U}:")
      table.insert(lines, "  {u1}   [ " .. r1_col1 .. r1_col2 .. r1_col3 .. r1_col4 .. "] {" .. uName[1] .. "}")
      table.insert(lines, "  {u2} = [ " .. r2_col1 .. r2_col2 .. r2_col3 .. r2_col4 .. "] {" .. uName[2] .. "}")
      table.insert(lines, "           " .. string.rep(" ", matrix_w) .. "  {" .. uName[3] .. "}")
      table.insert(lines, "           " .. string.rep(" ", matrix_w) .. "  {" .. uName[4] .. "}")
      
      local f1 = (uName[1] ~= "0" and uName[1] .. "*cos(" .. b.th1 .. "°)" or "")
      local f2 = (uName[2] ~= "0" and uName[2] .. "*sin(" .. b.th1 .. "°)" or "")
      local f1_full = (f1 ~= "" and f2 ~= "") and (f1 .. " + " .. f2) or (f1 .. f2)
      if f1_full == "" then f1_full = "0" end
      
      local f3 = (uName[3] ~= "0" and uName[3] .. "*cos(" .. b.th2 .. "°)" or "")
      local f4 = (uName[4] ~= "0" and uName[4] .. "*sin(" .. b.th2 .. "°)" or "")
      local f2_full = (f3 ~= "" and f4 ~= "") and (f3 .. " + " .. f4) or (f3 .. f4)
      if f2_full == "" then f2_full = "0" end
      
      table.insert(lines, "  u1 = " .. f1_full)
      table.insert(lines, "  u2 = " .. f2_full)

      local Nexpr = Expr.new()
      for baseName, ub in pairs(uByBase) do
        local dispScale = (base == "EA/L") and (baseName .. "L/EA") or (base and (baseName .. "/(" .. base .. ")") or baseName)
        if baseName == "p" and base == "EA/L" then
          dispScale = "pL^2/EA"
        end
        
        local u1 = (ub[dofs[1]] or 0)
        local v1 = (ub[dofs[2]] or 0)
        local u2 = (ub[dofs[3]] or 0)
        local v2 = (ub[dofs[4]] or 0)
        local u1l = c1 * u1 + s1 * v1
        local u2l = c2 * u2 + s2 * v2
        
        local sub1Parts = {}
        if u1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(u1) .. ")*cos(" .. b.th1 .. "°)") end
        if v1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(v1) .. ")*sin(" .. b.th1 .. "°)") end
        local sub1 = #sub1Parts > 0 and table.concat(sub1Parts, " + ") or "0"
        
        local sub2Parts = {}
        if u2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(u2) .. ")*cos(" .. b.th2 .. "°)") end
        if v2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(v2) .. ")*sin(" .. b.th2 .. "°)") end
        local sub2 = #sub2Parts > 0 and table.concat(sub2Parts, " + ") or "0"
        
        table.insert(lines, "Substituindo deslocamentos para " .. baseName .. ":")
        table.insert(lines, "  u1 = (" .. sub1 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u1l) .. " * " .. dispScale)
        table.insert(lines, "  u2 = (" .. sub2 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u2l) .. " * " .. dispScale)
        
        local diff = u2l - u1l
        local sigmaCoef, Ncoef
        if L == 0 then
          Ncoef = (b.E or 1) * diff
          sigmaCoef = Ncoef / (b.A > 0 and b.A or 1)
        else
          sigmaCoef = (b.E / L) * diff
          Ncoef = ((b.E * b.A) / L) * diff
        end
        Expr.addInplace(Nexpr, Ncoef, baseName)
        
        if L == 0 then
          table.insert(lines, "Esforço Normal na Mola " .. e .. ":")
          table.insert(lines, "  N = (" .. exprFormatNumber(b.E or 1) .. "*EA/L) * (" .. exprFormatNumber(u2l) .. " - (" .. exprFormatNumber(u1l) .. ")) * " .. dispScale)
          table.insert(lines, "    = " .. exprFormatNumber(Ncoef) .. " * " .. baseName)
        else
          local stressScale = baseName .. "/A"
          local eStr = math.abs(b.E - 1) < 1e-9 and "E" or exprFormatNumber(b.E) .. "E"
          local lStr = math.abs(b.L - 1) < 1e-9 and "L" or exprFormatNumber(b.L) .. "L"
          table.insert(lines, "Tensão normal na Barra " .. e .. ":")
          table.insert(lines, "  σ = (" .. eStr .. ")/(" .. lStr .. ") * (" .. exprFormatNumber(u2l) .. " - (" .. exprFormatNumber(u1l) .. ")) * " .. dispScale)
          table.insert(lines, "        = " .. exprFormatNumber(sigmaCoef) .. " * " .. stressScale)
        end
      end
      
      local t_c = ""
      local bases = Expr.getBases(Nexpr)
      if #bases > 0 then
        local coef = Expr.getCoeff(Nexpr, bases[1])
        if coef > 1e-9 then
          t_c = " (Tração)"
        elseif coef < -1e-9 then
          t_c = " (Compressão)"
        end
      end
      
      if L == 0 then
        table.insert(lines, "Esforço Normal (N):")
        table.insert(lines, "  N = " .. Expr.toString(Nexpr) .. t_c)
        table.insert(lines, "")
      else
        local aStr = math.abs(b.A - 1) < 1e-9 and "A" or exprFormatNumber(b.A) .. "A"
        local stressExpr = Expr.scale(Nexpr, 1 / (b.A or 1))
        local stressParts = {}
        for _, bn in ipairs(Expr.getBases(stressExpr)) do
          local coef = Expr.getCoeff(stressExpr, bn)
          table.insert(stressParts, exprFormatNumber(coef) .. "*" .. bn .. "/A")
        end
        local stressStr = table.concat(stressParts, " + ")
        if stressStr == "" then stressStr = "0" end
        
        table.insert(lines, "Esforço Normal (N):")
        table.insert(lines, "  N = σ * " .. aStr .. " = " .. Expr.toString(Nexpr) .. t_c)
        table.insert(lines, "  Tensão = " .. stressStr)
        table.insert(lines, "")
      end
    end

  elseif option == 3 then
    local e = state.defBar or 1
    if e < 1 then e = 1 end
    if e > state.nBar then e = state.nBar end
    local b = state.bars[e]
    local L_barra = b.L or 1
    local x_val = state.defX or (0.5 * L_barra)
    if x_val > L_barra then x_val = L_barra end
    local xi = x_val / L_barra
    local c1 = cosd(b.th1)
    local s1 = sind(b.th1)
    local c2 = cosd(b.th2)
    local s2 = sind(b.th2)
    local dofs = b.dofs
    
    -- Symbolic label for element length: "L" when n=1, "2L" when n=2, "L/2" when n=0.5
    local function makeLsym(n)
      if math.abs(n - 1) < 1e-9 then return "L" end
      local ni = math.floor(n + 0.5)
      if ni > 0 and math.abs(n - ni) < 1e-9 then return tostring(ni).."L" end
      local m = math.floor(1/n + 0.5)
      if m > 0 and math.abs(1/n - m) < 1e-9 then return "L/"..tostring(m) end
      return exprFormatNumber(n).."L"
    end
    local eLsym = makeLsym(L_barra)
    
    table.insert(lines, "Deslocamento axial na Barra " .. e .. " em x=" .. exprFormatNumber(x_val) .. "L (x/L_barra=" .. exprFormatNumber(xi) .. "):")
    table.insert(lines, "Transformação de coordenadas:")

    local uName = {}
    for i = 1, 4 do
      local d = dofs[i]
      uName[i] = (d and d > 0) and ("U" .. d) or "0"
    end

    local function padR(str, len)
      return str .. string.rep(" ", math.max(0, len - #str))
    end

    local th1Str = exprFormatNumber(b.th1)
    local th2Str = exprFormatNumber(b.th2)
    local c1Str = "cos " .. th1Str
    local s1Str = "sin " .. th1Str
    local c2Str = "cos " .. th2Str
    local s2Str = "sin " .. th2Str

    local col1_w = math.max(10, #c1Str) + 1
    local col2_w = math.max(10, #s1Str) + 1
    local col3_w = math.max(10, #c2Str) + 1
    local col4_w = math.max(10, #s2Str) + 1

    local r1_col1 = padR(c1Str, col1_w)
    local r1_col2 = padR(s1Str, col2_w)
    local r1_col3 = padR("0", col3_w)
    local r1_col4 = padR("0", col4_w)

    local r2_col1 = padR("0", col1_w)
    local r2_col2 = padR("0", col2_w)
    local r2_col3 = padR(c2Str, col3_w)
    local r2_col4 = padR(s2Str, col4_w)

    local matrix_w = col1_w + col2_w + col3_w + col4_w

    table.insert(lines, "  {u} = [R]{U}:")
    table.insert(lines, "  {u1}   [ " .. r1_col1 .. r1_col2 .. r1_col3 .. r1_col4 .. "] {" .. uName[1] .. "}")
    table.insert(lines, "  {u2} = [ " .. r2_col1 .. r2_col2 .. r2_col3 .. r2_col4 .. "] {" .. uName[2] .. "}")
    table.insert(lines, "           " .. string.rep(" ", matrix_w) .. "  {" .. uName[3] .. "}")
    table.insert(lines, "           " .. string.rep(" ", matrix_w) .. "  {" .. uName[4] .. "}")

    local f1 = (uName[1] ~= "0" and uName[1] .. "*cos(" .. b.th1 .. "°)" or "")
    local f2 = (uName[2] ~= "0" and uName[2] .. "*sin(" .. b.th1 .. "°)" or "")
    local f1_full = (f1 ~= "" and f2 ~= "") and (f1 .. " + " .. f2) or (f1 .. f2)
    if f1_full == "" then f1_full = "0" end

    local f3 = (uName[3] ~= "0" and uName[3] .. "*cos(" .. b.th2 .. "°)" or "")
    local f4 = (uName[4] ~= "0" and uName[4] .. "*sin(" .. b.th2 .. "°)" or "")
    local f2_full = (f3 ~= "" and f4 ~= "") and (f3 .. " + " .. f4) or (f3 .. f4)
    if f2_full == "" then f2_full = "0" end

    table.insert(lines, "  u1 = " .. f1_full)
    table.insert(lines, "  u2 = " .. f2_full)
    table.insert(lines, "")

    table.insert(lines, "Fórmula de interpolação:")
    table.insert(lines, "  u(x) = N1(x)*u1 + N2(x)*u2")
    table.insert(lines, "")
    table.insert(lines, "Funções de forma (L_e = " .. eLsym .. "):")
    table.insert(lines, "  N1(x) = 1 - x/" .. eLsym)
    table.insert(lines, "  N2(x) = x/" .. eLsym)
    table.insert(lines, "")

    local disp = Expr.new()
    for baseName, ub in pairs(uByBase) do
      local dispScale = (base == "EA/L") and (baseName .. "L/EA") or (base and (baseName .. "/(" .. base .. ")") or baseName)
      if baseName == "p" and base == "EA/L" then
        dispScale = "pL^2/EA"
      end

      local u1 = (ub[dofs[1]] or 0)
      local v1 = (ub[dofs[2]] or 0)
      local u2 = (ub[dofs[3]] or 0)
      local v2 = (ub[dofs[4]] or 0)
      local u1l = c1 * u1 + s1 * v1
      local u2l = c2 * u2 + s2 * v2
      local u_xi = u1l * (1 - xi) + u2l * xi
      Expr.addInplace(disp, u_xi, baseName)

      local sub1Parts = {}
      if u1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(u1) .. ")*cos(" .. b.th1 .. "°)") end
      if v1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(v1) .. ")*sin(" .. b.th1 .. "°)") end
      local sub1 = #sub1Parts > 0 and table.concat(sub1Parts, " + ") or "0"

      local sub2Parts = {}
      if u2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(u2) .. ")*cos(" .. b.th2 .. "°)") end
      if v2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(v2) .. ")*sin(" .. b.th2 .. "°)") end
      local sub2 = #sub2Parts > 0 and table.concat(sub2Parts, " + ") or "0"

      table.insert(lines, "Para " .. baseName .. ":")
      table.insert(lines, "  u1 = (" .. sub1 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u1l) .. " * " .. dispScale)
      table.insert(lines, "  u2 = (" .. sub2 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u2l) .. " * " .. dispScale)
      table.insert(lines, "Substituindo deslocamentos:")
      table.insert(lines, "  u(x) = (1 - x/" .. eLsym .. ")*(" .. exprFormatNumber(u1l) .. ") + (x/" .. eLsym .. ")*(" .. exprFormatNumber(u2l) .. ") * " .. dispScale)
      local x_str = exprFormatNumber(x_val) .. "L"
      table.insert(lines, "Substituindo x = " .. x_str .. ":")
      table.insert(lines, "  u(x) = (1 - " .. exprFormatNumber(xi) .. ")*(" .. exprFormatNumber(u1l) .. ") + (" .. exprFormatNumber(xi) .. ")*(" .. exprFormatNumber(u2l) .. ") * " .. dispScale)
      table.insert(lines, "       = " .. exprFormatNumber(u_xi) .. " * " .. dispScale)
    end
    
    table.insert(lines, "Resultado final:")
    local dispParts = {}
    for _, bn in ipairs(Expr.getBases(disp)) do
      local coef = Expr.getCoeff(disp, bn)
      local dispScale = (base == "EA/L") and (bn .. "L/EA") or (base and (bn .. "/(" .. base .. ")") or bn)
      if bn == "p" and base == "EA/L" then
        dispScale = "pL^2/EA"
      end
      table.insert(dispParts, exprFormatNumber(coef) .. "*" .. dispScale)
    end
    local dispStr = table.concat(dispParts, " + ")
    if dispStr == "" then dispStr = "0" end
    table.insert(lines, "  u(x) = " .. dispStr)

  elseif option == 4 then
    table.insert(lines, "Zona Crítica (|σ| Máximo):")
    local maxCoef = -1
    local maxBar = 1
    local maxSigma = Expr.new()
    
    for e = 1, state.nBar do
      local b = state.bars[e]
      local c1 = cosd(b.th1)
      local s1 = sind(b.th1)
      local c2 = cosd(b.th2)
      local s2 = sind(b.th2)
      local L = b.L or 1
      local dofs = b.dofs
      local SigmaExpr = Expr.new()
      
      for baseName, ub in pairs(uByBase) do
        local u1 = (ub[dofs[1]] or 0)
        local v1 = (ub[dofs[2]] or 0)
        local u2 = (ub[dofs[3]] or 0)
        local v2 = (ub[dofs[4]] or 0)
        local u1l = c1 * u1 + s1 * v1
        local u2l = c2 * u2 + s2 * v2
        local k_e_l = (b.E or 1) / L
        local coef = k_e_l * (u2l - u1l)
        Expr.addInplace(SigmaExpr, coef, baseName)
      end
      
      local bases = Expr.getBases(SigmaExpr)
      local val = 0
      if #bases > 0 then
        val = math.abs(Expr.getCoeff(SigmaExpr, bases[1]))
      end
      
      local stressParts = {}
      for _, bn in ipairs(Expr.getBases(SigmaExpr)) do
        local coef = Expr.getCoeff(SigmaExpr, bn)
        table.insert(stressParts, exprFormatNumber(coef) .. "*" .. bn .. "/A")
      end
      local stressStr = table.concat(stressParts, " + ")
      if stressStr == "" then stressStr = "0" end
      table.insert(lines, "  Barra " .. e .. ": |σ| = " .. stressStr)
      
      if val > maxCoef then
        maxCoef = val
        maxBar = e
        maxSigma = SigmaExpr
      end
    end
    
    table.insert(lines, "")
    table.insert(lines, "Conclusão:")
    table.insert(lines, "  Barra solicitada máxima: Barra " .. maxBar)
    local maxSigmaParts = {}
    for _, bn in ipairs(Expr.getBases(maxSigma)) do
      local coef = Expr.getCoeff(maxSigma, bn)
      table.insert(maxSigmaParts, exprFormatNumber(coef) .. "*" .. bn .. "/A")
    end
    local maxSigmaStr = table.concat(maxSigmaParts, " + ")
    if maxSigmaStr == "" then maxSigmaStr = "0" end
    table.insert(lines, "  Tensão Máxima |σ| = " .. maxSigmaStr)
  elseif option == 5 then
    table.insert(lines, "Frequências Naturais e Modos de Vibração:")
    table.insert(lines, "Equação característica:")
    table.insert(lines, "  |[K] - ω²*[M]| = 0")
    table.insert(lines, "")
    
    local M, mContrib = assembleMbar(state)
    local n = state.nDof
    
    table.insert(lines, "Matriz de Massa Global [M] (Consistente):")
    table.insert(lines, "Fórmula para termo diagonal de barra: (ρ*A*L)/3")
    table.insert(lines, "Fórmula para termo fora da diagonal: (ρ*A*L)/6")
    table.insert(lines, "Em termos de ρ*A*L:")
    
    for i = 1, n do
      for j = i, n do
        local mij = "M" .. i .. j
        local ent = mContrib[i][j]
        if #ent > 0 then
          local sym = {}
          for k = 1, #ent do
            local item = ent[k]
            local fracStr = ""
            local absCoef = math.abs(item.coef)
            if math.abs(absCoef - (1/3)) < 1e-5 then
              fracStr = "1/3"
            elseif math.abs(absCoef - (1/6)) < 1e-5 then
              fracStr = "1/6"
            else
              fracStr = exprFormatNumber(absCoef)
            end
            table.insert(sym, string.format("%s*ρ*A(%d)*L(%d)", fracStr, item.el, item.el))
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
    table.insert(lines, "")
    
    if base then
      local Kbar = Matrix.toNumeric(K, base)
      table.insert(lines, "Equação de Autovalores:")
      table.insert(lines, "Definindo λ = (ω² * ρ * L²) / E:")
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
        local omegas = {}
        for i = 1, #lams do
          local val = math.sqrt(lams[i])
          omegas[i] = val
          table.insert(lines, string.format("  ω_%d = √(λ_%d) * √(E/(ρ*L²)) = %s/L * √(E/ρ)", i, i, exprFormatNumber(val)))
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
    else
      table.insert(lines, "Frequências e modos indisponíveis sem base de rigidez simbólica.")
    end
  end

  return lines
end

local function buildDefLines(state)
  local lines = {}
  local option = state.defOption or 1
  local options = {
    "Deslocamentos nodais",
    "Esforço normal / tensão",
    "Deslocamento ao longo da barra",
    "Zona crítica (|σ| máximo)",
    "Frequências e modos de vibração"
  }

  table.insert(lines, "Opções:")
  for i, name in ipairs(options) do
    local cursor = (i == option) and "> " or "  "
    local selected = state.defSelected and state.defSelected[i]
    local marker = selected and "* " or "  "
    table.insert(lines, cursor .. marker .. name)
  end

  local cursor6 = (option == 6) and "> " or "  "
  local elemStr = "Barra: "
  if option == 6 and state.defEditText then
    elemStr = elemStr .. state.defEditText .. "_"
  else
    elemStr = elemStr .. tostring(state.defBar or 1)
  end
  table.insert(lines, cursor6 .. "  " .. elemStr)

  local cursor7 = (option == 7) and "> " or "  "
  local xStr = "x: "
  if option == 7 and state.defEditText then
    xStr = xStr .. state.defEditText .. "_"
  else
    local b = state.bars[state.defBar or 1]
    local maxL = b and b.L or 1
    xStr = xStr .. tostring(state.defX or (0.5 * maxL))
  end
  table.insert(lines, cursor7 .. "  " .. xStr)

  table.insert(lines, "")

  local activeOpt = state.defActiveOption or 1
  local optLines = buildDefOptionLines(state, activeOpt)
  for _, l in ipairs(optLines) do
    table.insert(lines, l)
  end

  return lines
end

local function buildMcTableLines(state)
  local lines = {}
  table.insert(lines, "**Tabela de conectividade (m.c.):")
  table.insert(lines, "| Barra | U1 | V1 | U2 | V2 | θ1 | θ2 | L | E | A |")
  for i = 1, state.nBar do
    local b = state.bars[i]
    local d = b.dofs
    local th1 = b.th1 or b.theta or 0
    local th2 = b.th2 or b.theta or 0
    local row = string.format("|   %d   | %d  | %d  | %d  | %d  | %d° | %d° | %.3g | %.3g | %.3g |",
      i, d[1], d[2], d[3], d[4], th1, th2, b.L, b.E, b.A)
    table.insert(lines, row)
  end
  return lines
end

local function buildForceTableLines(state)
  local lines = {}
  table.insert(lines, "**Forças Nodais aplicadas:")
  for i = 1, state.nDof do
    table.insert(lines, string.format("F%d = %.4g * P", i, state.forces[i] or 0))
  end
  table.insert(lines, "")
  table.insert(lines, "**Cargas distribuídas nas barras:")
  for i = 1, state.nBar do
    local b = state.bars[i]
    if b.py and b.py:gsub("%s+", "") ~= "" then
      table.insert(lines, string.format("Barra %d: p(x) = %s", i, b.py))
    else
      table.insert(lines, string.format("Barra %d: p(0) = %.4g , p(L) = %.4g",
        i, b.p0 or 0, b.pL or 0))
    end
  end
  return lines
end

-- ======================== TABS REGISTRATION ========================
function Barra2D.start()
  local state = storage.load("Barra2D_state", defaultState())
  ensureSizes(state)

  local mcTab = { title = "m.c." }

  local function getCellValue(row, col)
    local b = state.bars[row]
    if not b then return nil end
    if col >= 1 and col <= 4 then
      return b.dofs[col]
    elseif col == 5 then
      return b.th1 or b.theta or 0
    elseif col == 6 then
      return b.th2 or b.theta or 0
    elseif col == 7 then
      return b.L
    elseif col == 8 then
      return b.E
    elseif col == 9 then
      return b.A
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
      if text == "" then
        state.bars[row].dofs[col] = 0
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val < 0 or val > state.nDof then
        state.message = "GDL deve estar entre 0 e " .. tostring(state.nDof)
        return false
      end
      state.bars[row].dofs[col] = math.floor(val + 0.5)
    elseif col == 5 then
      if val == nil then return false end
      state.bars[row].th1 = val
      if state.bars[row].th2 == nil then state.bars[row].th2 = val end
    elseif col == 6 then
      if val == nil then return false end
      state.bars[row].th2 = val
      if state.bars[row].th1 == nil then state.bars[row].th1 = val end
    elseif col == 7 then
      if val == nil or val < 0 then
        state.message = "L deve ser positivo ou 0 para mola."
        return false
      end
      state.bars[row].L = val
    elseif col == 8 then
      if val == nil or val <= 0 then
        state.message = "E deve ser positivo."
        return false
      end
      state.bars[row].E = val
    elseif col == 9 then
      if val == nil or val <= 0 then
        state.message = "A deve ser positivo."
        return false
      end
      state.bars[row].A = val
    end

    state.tab1EditText = nil
    state.message = "Célula atualizada."
    saveState(state)
    return true
  end

  local function ensureTab1SelectionVisible(h)
    local cellTop = 0
    local isTopTable = (state.tab1SelCol <= 6)
    if isTopTable then
      cellTop = 50 + 14 + 18 + (state.tab1SelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nBar * 18
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
    local totalH = 50 + (14 + 18 + state.nBar * 18) + 8 + (14 + 18 + state.nBar * 18)
    state.tab1ScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  local function barra_drawMcSection(gc, x, y, title, cols, rowCount, selRow, selCol, editText, getVal)
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
    gc:drawString("Barra2D - Identificação GDL e m.c.", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Barras:", x, y + 14, "top")
    gc:setColorRGB(200, 0, 0)
    gc:drawString(tostring(state.nBar), x + 35, y + 14, "top")
    gc:setColorRGB(20, 20, 20)
    gc:drawString("GDL:", x + 65, y + 14, "top")
    gc:setColorRGB(0, 70, 190)
    gc:drawString(tostring(state.nDof), x + 90, y + 14, "top")

    local bx = x + w - 110
    drawButton(gc, bx, y, 50, 15, "+Barra", false)
    drawButton(gc, bx + 54, y, 50, 15, "-Barra", false)
    drawButton(gc, bx, y + 17, 22, 15, "-G", false)
    drawButton(gc, bx + 24, y + 17, 22, 15, "+G", false)

    clearHits()
    addHit("add_bar", bx, y, 50, 15)
    addHit("rem_bar", bx + 54, y, 50, 15)
    addHit("ng_minus", bx, y + 17, 22, 15)
    addHit("ng_plus", bx + 24, y + 17, 22, 15)

    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.tab1ScrollPx or 0
    local topCols = {
      { label = "U1", col = 1, w = 24 },
      { label = "V1", col = 2, w = 24 },
      { label = "U2", col = 3, w = 24 },
      { label = "V2", col = 4, w = 24 },
      { label = "θ1", col = 5, w = 38 },
      { label = "θ2", col = 6, w = 38 }
    }
    local bottomCols = {
      { label = "L", col = 7, w = 45 },
      { label = "E", col = 8, w = 45 },
      { label = "A", col = 9, w = 45 }
    }

    gc:clipRect("set", x, y + 50, w, h - 50)
    local topY = y + 50 - scrollPx
    barra_drawMcSection(gc, x, topY, "Barras (U1-V1-U2-V2 e θ):", topCols, state.nBar, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
    
    local topTableH = 14 + 18 + state.nBar * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    barra_drawMcSection(gc, x, bottomY, "Barras (L / E / A):", bottomCols, state.nBar, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
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
      if col <= 6 then
        if row > 1 then
          row = row - 1
        else
          col = 7
          row = state.nBar
        end
      else
        if row > 1 then
          row = row - 1
        else
          col = 1
          row = state.nBar
        end
      end
    elseif key == keys.down then
      if col <= 6 then
        if row < state.nBar then
          row = row + 1
        else
          col = 7
          row = 1
        end
      else
        if row < state.nBar then
          row = row + 1
        else
          col = 1
          row = 1
        end
      end
    elseif key == keys.left then
      if col > 1 and col <= 6 then
        col = col - 1
      elseif col >= 7 then
        col = col - 1
      end
    elseif key == keys.right then
      if col < 6 then
        col = col + 1
      elseif col == 6 then
        col = 7
        row = math.min(row, state.nBar)
      elseif col >= 7 and col < 9 then
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
    local b = state.bars[row]
    if b and (b.L or 1) == 0 then
      state.message = "Mola (L=0): coloca o valor numerico de K na col E. Ex: K=EA/L com E=A=1, L=2 => escreve 0.5"
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
      local b = state.bars[hit.data.row]
      if b and (b.L or 1) == 0 then
        state.message = "Mola (L=0): coloca o valor numerico de K na col E. Ex: K=EA/L com E=A=1, L=2 => escreve 0.5"
      else
        state.message = "Setas navegam nas células. Enter para editar."
      end
    elseif hit.id == "add_bar" then
      if state.nBar < 6 then
        state.nBar = state.nBar + 1
        ensureSizes(state)
        saveState(state)
      end
    elseif hit.id == "rem_bar" then
      if state.nBar > 1 then
        state.nBar = state.nBar - 1
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
      if state.nDof < 18 then
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
      local b = state.bars[row]
      if not b then return nil end
      if col == 2 then return b.p0
      elseif col == 3 then return b.pL
      elseif col == 4 then return b.py or ""
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
      local b = state.bars[row]
      if b then
        if col == 2 then
          if text == "" then b.p0 = 0 else b.p0 = val or 0 end
        elseif col == 3 then
          if text == "" then b.pL = 0 else b.pL = val or 0 end
        elseif col == 4 then
          b.py = text
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
    local totalH = 50 + (14 + 18 + state.nDof * 18) + 8 + (14 + 18 + state.nBar * 18)
    state.forceScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  function fTab:render(gc, x, y, w, h, app)
    gc:setColorRGB(20, 20, 20)
    gc:setFont("sansserif", "b", 10)
    gc:drawString("Forças Nodais e Cargas Globais", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Edite forças nodais (F1-Fn) e carga distribuída p(x)", x, y + 14, "top")

    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.forceScrollPx or 0
    local topCols = {
      { label = "Força (P)", col = 1, w = 110 }
    }
    local bottomCols = {
      { label = "p(0)", col = 2, w = 45 },
      { label = "p(L)", col = 3, w = 45 },
      { label = "p(x)", col = 4, w = 90 }
    }

    gc:clipRect("set", x, y + 50, w, h - 50)
    local topY = y + 50 - scrollPx
    barra_drawMcSection(gc, x, topY, "Forças Nodais F (U):", topCols, state.nDof, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
    
    local topTableH = 14 + 18 + state.nDof * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    barra_drawMcSection(gc, x, bottomY, "Carga Distribuída p(x):", bottomCols, state.nBar, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
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
          row = state.nBar
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
        if row < state.nBar then
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
        row = math.min(row, state.nBar)
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
    local K = assembleK(state)
    local F = assembleF(state)
    local base = Matrix.extractSingleBase(K)
    local baseStr = base and tostring(base) or "EA/L"
    local u, uByBase, err = solveDisplacements(state)

    if not u then
      if option ~= 5 then
        table.insert(steps, { type = "string", value = "Sistema global:\n[K]{u} = {F}\n\nMatriz de rigidez global [K] (em termos de " .. baseStr .. "):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças {F} (em termos de P, p*L):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução automática indisponível: " .. err })
      end
    end

    if #steps == 0 then
      if option == 1 then
        table.insert(steps, { type = "string", value = "Matriz de rigidez global [K] (em termos de " .. baseStr .. "):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças globais {F} (em termos de P, p*L):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução dos Deslocamentos U (em termos de PL/EA, pL^2/EA):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u) })
        local lines = buildDefOptionLines(state, 1)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      elseif option == 5 then
        table.insert(steps, { type = "string", value = "Frequências Naturais e Modos de Vibração:\nEquação característica: |[K] - ω²*[M]| = 0" })
        local M, mContrib = assembleMbar(state)
        local n = state.nDof

        local mLines = { "Matriz de Massa Global [M] (Consistente):", "Fórmula para termo diagonal de barra: (ρ*A*L)/3", "Fórmula para termo fora da diagonal: (ρ*A*L)/6", "Em termos de ρ*A*L:" }
        for i = 1, n do
          for j = i, n do
            local mij = "M" .. i .. j
            local ent = mContrib[i][j]
            if #ent > 0 then
              local sym = {}
              for k = 1, #ent do
                local item = ent[k]
                local fracStr = ""
                local absCoef = math.abs(item.coef)
                if math.abs(absCoef - (1/3)) < 1e-5 then
                  fracStr = "1/3"
                elseif math.abs(absCoef - (1/6)) < 1e-5 then
                  fracStr = "1/6"
                else
                  fracStr = exprFormatNumber(absCoef)
                end
                table.insert(sym, string.format("%s*ρ*A(%d)*L(%d)", fracStr, item.el, item.el))
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

        if base then
          local Kbar = Matrix.toNumeric(K, base)
          table.insert(steps, { type = "string", value = "Matriz de rigidez reduzida [Kbar] (em termos de " .. baseStr .. "):" })
          table.insert(steps, { type = "matrix", value = Kbar })

          local eqLines = { "Equação de Autovalores:", "Definindo λ = (ω² * ρ * L²) / E:", "  |[Kbar] - λ*[Mbar]| = 0", "" }
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
              table.insert(freqLines, string.format("  ω_%d = √(λ_%d) * √(E/(ρ*L²)) = %s/L * √(E/ρ)", i, i, exprFormatNumber(val)))
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
                table.insert(steps, { type = "string", value = "Vetor do modo shape normalizado {U} (adimensional):" })
                table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(phi) })
              end
            end
          end
        else
          table.insert(steps, { type = "string", value = "Frequências e modos indisponíveis sem base de rigidez simbólica." })
        end
      elseif option == 2 then
        table.insert(steps, { type = "string", value = "Esforço normal e tensão por barra:" })
        for e = 1, state.nBar do
          local b = state.bars[e]
          local c1 = cosd(b.th1)
          local s1 = sind(b.th1)
          local c2 = cosd(b.th2)
          local s2 = sind(b.th2)
          local L = b.L or 1
          local dofs = b.dofs

          local typeStr = (L == 0) and "Mola" or "Barra"
          table.insert(steps, { type = "string", value = "--- " .. typeStr .. " " .. e .. " ---\nTransformação de coordenadas {u} = [R]{U}:\nMatriz de Transposição [R] (adimensional):" })

          local R_elem = {
            { c1, s1, 0, 0 },
            { 0, 0, c2, s2 }
          }
          local U_elem = {}
          for i = 1, 4 do
            local d = dofs[i]
            U_elem[i] = (d and d > 0 and d <= #u) and u[d] or Expr.new()
          end
          local u_elem = {
            c1 * (U_elem[1] or 0) + s1 * (U_elem[2] or 0),
            c2 * (U_elem[3] or 0) + s2 * (U_elem[4] or 0)
          }

          table.insert(steps, { type = "matrix", value = R_elem })
          table.insert(steps, { type = "string", value = "Vetor de deslocamentos globais do elemento {U} (em termos de PL/EA, pL^2/EA):" })
          table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(U_elem) })
          table.insert(steps, { type = "string", value = "Vetor de deslocamentos locais do elemento {u} (em termos de PL/EA, pL^2/EA):" })
          table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u_elem) })
        end
        local lines = buildDefOptionLines(state, 2)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      elseif option == 3 then
        local e = state.defBar or 1
        if e < 1 then e = 1 end
        if e > state.nBar then e = state.nBar end
        local b = state.bars[e]
        local c1 = cosd(b.th1)
        local s1 = sind(b.th1)
        local c2 = cosd(b.th2)
        local s2 = sind(b.th2)
        local L = b.L or 1
        local dofs = b.dofs

        local typeStr = (L == 0) and "Mola" or "Barra"
        table.insert(steps, { type = "string", value = "--- " .. typeStr .. " " .. e .. " ---\nTransformação de coordenadas {u} = [R]{U}:" })

        local R_elem = {
          { c1, s1, 0, 0 },
          { 0, 0, c2, s2 }
        }
        local U_elem = {}
        for i = 1, 4 do
          local d = dofs[i]
          U_elem[i] = (d and d > 0 and d <= #u) and u[d] or Expr.new()
        end
        local u_elem = {
          c1 * (U_elem[1] or 0) + s1 * (U_elem[2] or 0),
          c2 * (U_elem[3] or 0) + s2 * (U_elem[4] or 0)
        }

        table.insert(steps, { type = "matrix", value = R_elem })
        table.insert(steps, { type = "string", value = "Vetor de deslocamentos globais do elemento {U}:" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(U_elem) })
        table.insert(steps, { type = "string", value = "Vetor de deslocamentos locais do elemento {u}:" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u_elem) })

        local lines = buildDefOptionLines(state, 3)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
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

    -- 1. Step-by-step resolution of K's (b_ks)
    local ksLines = buildKsLines(state)
    var.store("b_ks", table.concat(ksLines, "\n"))

    -- 2. Global stiffness matrix K (b_kmatrix) as a math matrix (numeric)
    local K = assembleK(state)
    local K_num = Matrix.toNumericFull(K)
    var.store("b_kmatrix", K_num)

    -- 3. Global mass matrix M (b_mmatrix) as a math matrix (numeric)
    local M, _ = assembleMbar(state)
    var.store("b_mmatrix", M)

    -- 4. Options in Def tab
    local optionNames = { "b_desln", "b_esfn", "b_deslb", "b_zcr", "b_vibr" }
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

    -- 5. Mega-string: full resolution in one variable (b_resolucao)
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
    table.insert(totalLines, "  >> Ver variavel: b_kmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== [M] GLOBAL ===")
    table.insert(totalLines, "  >> Ver variavel: b_mmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== FORCAS APLICADAS ===")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== RESOLUCAO (DEF) ===")
    local defOptions = {
      "Deslocamentos nodais",
      "Esforco normal / tensao",
      "Deslocamento ao longo da barra",
      "Zona critica (|s| maximo)",
      "Frequencias e modos de vibracao"
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
    var.store("b_resolucao", table.concat(totalLines, "\n"))
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
        if state.defOption == 6 then
          if val and val >= 1 and val <= state.nBar then
            state.defBar = math.floor(val)
          end
        elseif state.defOption == 7 then
          local b = state.bars[state.defBar or 1]
          local maxL = b and b.L or 1
          if val and val >= 0 and val <= maxL then
            state.defX = val
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
      if state.defOption >= 1 and state.defOption <= 5 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.down then
      state.defOption = math.min(7, (state.defOption or 1) + 1)
      if state.defOption >= 1 and state.defOption <= 5 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.left then
      if state.defOption == 6 then
        state.defBar = math.max(1, (state.defBar or 1) - 1)
        saveState(state)
        return true
      elseif state.defOption == 7 then
        local b = state.bars[state.defBar or 1]
        local maxL = b and b.L or 1
        local curX = state.defX or (0.5 * maxL)
        state.defX = math.max(0, math.floor((curX - 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      end
    elseif key == keys.right then
      if state.defOption == 6 then
        state.defBar = math.min(state.nBar, (state.defBar or 1) + 1)
        saveState(state)
        return true
      elseif state.defOption == 7 then
        local b = state.bars[state.defBar or 1]
        local maxL = b and b.L or 1
        local curX = state.defX or (0.5 * maxL)
        state.defX = math.min(maxL, math.floor((curX + 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      end
    elseif key == keys.enter then
      local opt = state.defOption or 1
      if opt >= 1 and opt <= 5 then
        state.defSelected = state.defSelected or {}
        state.defSelected[opt] = not state.defSelected[opt]
        saveState(state)
        return true
      elseif opt == 6 then
        state.defEditText = tostring(state.defBar or 1)
        return true
      elseif opt == 7 then
        local b = state.bars[state.defBar or 1]
        local maxL = b and b.L or 1
        state.defX = state.defX or (0.5 * maxL)
        state.defEditText = tostring(state.defX)
        return true
      end
    end
    return false
  end
  function defTab:charIn(ch, app)
    local opt = state.defOption or 1
    if opt == 6 or opt == 7 then
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
    if opt == 6 or opt == 7 then
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
      "Esforço normal / tensão",
      "Deslocamento ao longo da barra",
      "Zona crítica (|σ| máximo)",
      "Frequências e modos de vibração"
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

  local app = ui.newApp("Barra2D", { mcTab, ksTab, kTab, fTab, defTab, copiaTab })
  ui.bind(app)

  -- Automatically store/populate variables on startup
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

if not _G.__TI_MAINMENU__ then
  Barra2D.start()
end

return Barra2D
