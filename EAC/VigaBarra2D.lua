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

local function getLPower(baseStr)
  if not baseStr then return 0 end
  local p = 0
  local hasL = false
  if baseStr:find("L%^(%-?%d+)") then
    p = tonumber(baseStr:match("L%^(%-?%d+)")) or 0
    hasL = true
  elseif baseStr:find("L") then
    p = 1
    hasL = true
  end
  
  if hasL then
    if baseStr:find("/L%^(%d+)") then
      p = -tonumber(baseStr:match("/L%^(%d+)")) or 0
    elseif baseStr:find("/L") then
      p = -1
    end
  end
  return p
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

-- Evaluate every cell as a plain number by summing const + all symbolic term coefficients.
-- Valid because all parameters (E, A, I, L) are concrete numbers on a non-CAS calculator,
-- so the coefficient stored for each symbolic base is already the full numeric contribution.
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

local function matMul(a, b)
  local rows = #a
  local cols = #b[1]
  local mid = #b
  local res = {}
  for i = 1, rows do
    res[i] = {}
    for j = 1, cols do
      local sum = 0
      for k = 1, mid do
        sum = sum + a[i][k] * b[k][j]
      end
      res[i][j] = sum
    end
  end
  return res
end

local function matTranspose(a)
  local rows = #a
  local cols = #a[1]
  local t = {}
  for i = 1, cols do
    t[i] = {}
    for j = 1, rows do
      t[i][j] = a[j][i]
    end
  end
  return t
end

local function parseExpr(str)
  str = str:gsub("%s+", "")
  -- Normalize TI-Nspire calculator multiply symbols to plain '*'
  -- Middle dot (U+00B7): encoded as UTF-8 bytes C2 B7
  str = str:gsub("\xC2\xB7", "*")
  -- Multiplication sign (U+00D7): encoded as UTF-8 bytes C3 97
  str = str:gsub("\xC3\x97", "*")
  -- Dot operator (U+22C5): encoded as UTF-8 bytes E2 8B 85
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

local function getElementI(el, state)
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
        L = 1, -- Treat L in the inertia formula as the global unit reference length (L=1)
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

local function getInertiaSubstitution(el, state)
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
        L = 1, -- Treat L in the inertia formula as the global unit reference length (L=1)
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
      s = 1 - 3 * xi^2 + 2 * xi^3
    elseif shapeIdx == 3 then
      s = x * (1 - xi)^2
    elseif shapeIdx == 4 then
      s = xi
    elseif shapeIdx == 5 then
      s = 3 * xi^2 - 2 * xi^3
    elseif shapeIdx == 6 then
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

-- ======================== VIGABARRA2D FEA ENGINE ========================
local VigaBarra2D = {}

local function defaultState()
  return {
    nElem = 3,
    nDof = 6,
    elems = {
      { dofs = { 0, 0, 0, 1, 2, 3 }, th1 = -45, th2 = -45, L = 1.4142, E = 1, A = 1, I = 1, py0 = 0, pyL = -2, py = "" },
      { dofs = { 1, 2, 3, 4, 5, 6 }, th1 = 0, th2 = 0, L = 2, E = 1, A = 1, I = 1, py0 = 0, pyL = 0, py = "-2*x^2/L" },
      { dofs = { 4, 5, 6, 0, 0, 0 }, th1 = -90, th2 = -90, L = 1, E = 1, A = 1, I = 1, py0 = -3, pyL = -3, py = "" }
    },
    forces = { 0, 0, 0, 0, 0, 0 },
    defOption = 5,
    defActiveOption = 5,
    defSelected = { [5] = true },
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
  if state.nDof == nil then state.nDof = 6 end
  if state.nElem < 1 then state.nElem = 1 end
  if state.nElem > 6 then state.nElem = 6 end
  if state.nDof < 1 then state.nDof = 1 end
  if state.nDof > 36 then state.nDof = 36 end

  state.elems = state.elems or {}
  for i = 1, state.nElem do
    if state.elems[i] == nil then
      state.elems[i] = { dofs = { 1, 2, 3, 4, 5, 6 }, th1 = 0, th2 = 0, L = 1, E = 1, A = 1, I = 1, py0 = 0, pyL = 0, py = "" }
    end
    state.elems[i].dofs = state.elems[i].dofs or { 1, 2, 3, 4, 5, 6 }
    for k = 1, 6 do
      if state.elems[i].dofs[k] == nil or state.elems[i].dofs[k] > state.nDof or state.elems[i].dofs[k] < 0 then
        state.elems[i].dofs[k] = 0
      end
    end
    if state.elems[i].th1 == nil then state.elems[i].th1 = state.elems[i].theta or 0 end
    if state.elems[i].th2 == nil then state.elems[i].th2 = state.elems[i].theta or 0 end
    if state.elems[i].py0 == nil then state.elems[i].py0 = 0 end
    if state.elems[i].pyL == nil then state.elems[i].pyL = 0 end
    if state.elems[i].py == nil then state.elems[i].py = "" end
    -- Clear legacy px fields if present (migration)
    state.elems[i].px0 = nil
    state.elems[i].pxL = nil
    state.elems[i].px  = nil
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
end

local storeGlobalVariables

local function saveState(state)
  storage.save("VigaBarra2D_state", state)
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

local function vigaBarra2dContributionText(e, i, j, part, state)
  local el = state.elems[e]
  local L = el.L or 1
  local th1 = el.th1 or el.theta or 0
  local th2 = el.th2 or el.theta or 0
  local c1Str = "cos(" .. th1 .. "°)"
  local s1Str = "sin(" .. th1 .. "°)"
  local c2Str = "cos(" .. th2 .. "°)"
  local s2Str = "sin(" .. th2 .. "°)"
  
  local sym = "k" .. i .. j .. "_b" .. e
  local val = "0"
  
  if part == "A" then
    local num = (el.E or 1) * (el.A or 1)
    local den = L
    local numStr = math.abs(num - 1) < 1e-9 and "EA" or (exprFormatNumber(num) .. "*EA")
    local denStr = math.abs(den - 1) < 1e-9 and "L" or (exprFormatNumber(den) .. "L")
    local factorStr = numStr .. "/" .. denStr
    
    local trigTerms = {
      [1] = { [1] = c1Str .. "^2", [2] = c1Str .. "*" .. s1Str, [4] = "-" .. c1Str .. "*" .. c2Str, [5] = "-" .. c1Str .. "*" .. s2Str },
      [2] = { [1] = c1Str .. "*" .. s1Str, [2] = s1Str .. "^2", [4] = "-" .. s1Str .. "*" .. c2Str, [5] = "-" .. s1Str .. "*" .. s2Str },
      [4] = { [1] = "-" .. c1Str .. "*" .. c2Str, [2] = "-" .. s1Str .. "*" .. c2Str, [4] = c2Str .. "^2", [5] = c2Str .. "*" .. s2Str },
      [5] = { [1] = "-" .. c1Str .. "*" .. s2Str, [2] = "-" .. s1Str .. "*" .. s2Str, [4] = c2Str .. "*" .. s2Str, [5] = s2Str .. "^2" }
    }
    
    local term = trigTerms[i] and trigTerms[i][j]
    if term then
      val = factorStr .. "*" .. term
    end
    
  elseif part == "B" then
    local ratio = getInertiaSubstitution(el, state)
    local factorStr
    if ratio then
      local ratio_factor = ratio * (el.E or 1) * (el.A or 1)
      local ratio_factor_str = math.abs(ratio_factor - 1) < 1e-9 and "" or (exprFormatNumber(ratio_factor) .. "*")
      local denStr = ""
      local L_str = "L"
      if math.abs(L - 1) >= 1e-9 then
        L_str = "(" .. exprFormatNumber(L) .. "L)"
      end
      denStr = L_str .. "^3"
      factorStr = ratio_factor_str .. "EA*L^2/" .. denStr
    else
      local num = (el.E or 1) * (getElementI(el, state) or 1)
      local numStr = math.abs(num - 1) < 1e-9 and "EI" or (exprFormatNumber(num) .. "*EI")
      local denStr = ""
      local L_str = "L"
      if math.abs(L - 1) >= 1e-9 then
        L_str = "(" .. exprFormatNumber(L) .. "L)"
      end
      denStr = L_str .. "^3"
      factorStr = numStr .. "/" .. denStr
    end
    local L_val = L
    local L2_val = L * L
    
    local terms = {
      [1] = {
        [1] = "12*" .. s1Str .. "^2",
        [2] = "-12*" .. c1Str .. "*" .. s1Str,
        [3] = exprFormatNumber(-6 * L_val) .. "*L*" .. s1Str,
        [4] = "-12*" .. s1Str .. "*" .. s2Str,
        [5] = "12*" .. s1Str .. "*" .. c2Str,
        [6] = exprFormatNumber(-6 * L_val) .. "*L*" .. s1Str
      },
      [2] = {
        [1] = "-12*" .. c1Str .. "*" .. s1Str,
        [2] = "12*" .. c1Str .. "^2",
        [3] = exprFormatNumber(6 * L_val) .. "*L*" .. c1Str,
        [4] = "12*" .. c1Str .. "*" .. s2Str,
        [5] = "-12*" .. c1Str .. "*" .. c2Str,
        [6] = exprFormatNumber(6 * L_val) .. "*L*" .. c1Str
      },
      [3] = {
        [1] = exprFormatNumber(-6 * L_val) .. "*L*" .. s1Str,
        [2] = exprFormatNumber(6 * L_val) .. "*L*" .. c1Str,
        [3] = exprFormatNumber(4 * L2_val) .. "*L^2",
        [4] = exprFormatNumber(-6 * L_val) .. "*L*" .. s2Str,
        [5] = exprFormatNumber(6 * L_val) .. "*L*" .. c2Str,
        [6] = exprFormatNumber(2 * L2_val) .. "*L^2"
      },
      [4] = {
        [1] = "-12*" .. s1Str .. "*" .. s2Str,
        [2] = "12*" .. c1Str .. "*" .. s2Str,
        [3] = exprFormatNumber(-6 * L_val) .. "*L*" .. s2Str,
        [4] = "12*" .. s2Str .. "^2",
        [5] = "-12*" .. c2Str .. "*" .. s2Str,
        [6] = exprFormatNumber(-6 * L_val) .. "*L*" .. s2Str
      },
      [5] = {
        [1] = "12*" .. s1Str .. "*" .. c2Str,
        [2] = "-12*" .. c1Str .. "*" .. c2Str,
        [3] = exprFormatNumber(6 * L_val) .. "*L*" .. c2Str,
        [4] = "-12*" .. c2Str .. "*" .. s2Str,
        [5] = "12*" .. c2Str .. "^2",
        [6] = exprFormatNumber(-6 * L_val) .. "*L*" .. c2Str
      },
      [6] = {
        [1] = exprFormatNumber(-6 * L_val) .. "*L*" .. s1Str,
        [2] = exprFormatNumber(6 * L_val) .. "*L*" .. c1Str,
        [3] = exprFormatNumber(2 * L2_val) .. "*L^2",
        [4] = exprFormatNumber(-6 * L_val) .. "*L*" .. s2Str,
        [5] = exprFormatNumber(-6 * L_val) .. "*L*" .. c2Str,
        [6] = exprFormatNumber(4 * L2_val) .. "*L^2"
      }
    }
    
    local term = terms[i] and terms[i][j]
    if term then
      val = factorStr .. "*" .. term
    end
  end

  return sym, val
end

local function assembleK(state)
  local n = state.nDof
  local K = Matrix.zeros(n, n)
  local steps = {}

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    local EA = (el.E or 1) * (el.A or 1) / L
    local EI = (el.E or 1) * (getElementI(el, state) or 1) / (L * L * L)

    local kA = {
      { 1, 0, 0, -1, 0, 0 },
      { 0, 0, 0, 0, 0, 0 },
      { 0, 0, 0, 0, 0, 0 },
      { -1, 0, 0, 1, 0, 0 },
      { 0, 0, 0, 0, 0, 0 },
      { 0, 0, 0, 0, 0, 0 }
    }

    local kB = {
      { 0, 0, 0, 0, 0, 0 },
      { 0, 12, 6 * L, 0, -12, 6 * L },
      { 0, 6 * L, 4 * L * L, 0, -6 * L, 2 * L * L },
      { 0, 0, 0, 0, 0, 0 },
      { 0, -12, -6 * L, 0, 12, -6 * L },
      { 0, 6 * L, 2 * L * L, 0, -6 * L, 4 * L * L }
    }

    local th1 = el.th1 or el.theta or 0
    local th2 = el.th2 or el.theta or 0
    local c1 = cosd(th1)
    local s1 = sind(th1)
    local c2 = cosd(th2)
    local s2 = sind(th2)
    
    local R = {
      { c1, s1, 0, 0, 0, 0 },
      { -s1, c1, 0, 0, 0, 0 },
      { 0, 0, 1, 0, 0, 0 },
      { 0, 0, 0, c2, s2, 0 },
      { 0, 0, 0, -s2, c2, 0 },
      { 0, 0, 0, 0, 0, 1 }
    }

    local Rt = matTranspose(R)
    local kAg = matMul(Rt, matMul(kA, R))
    local kBg = matMul(Rt, matMul(kB, R))

    for i = 1, 6 do
      local gi = el.dofs[i]
      if gi and gi > 0 and gi <= n then
        for j = 1, 6 do
          local gj = el.dofs[j]
          if gj and gj > 0 and gj <= n then
            if math.abs(kAg[i][j]) > 1e-12 then
              local exprA = Expr.fromTerm(EA * kAg[i][j], "EA/L")
              Matrix.addExpr(K, gi, gj, exprA)
              local key = gi .. "," .. gj
              steps[key] = steps[key] or { symbols = {}, values = {} }
              local sym, val = vigaBarra2dContributionText(e, i, j, "A", state)
              local found = false
              for _, s in ipairs(steps[key].symbols) do
                if s == sym then found = true break end
              end
              if not found then table.insert(steps[key].symbols, sym) end
              table.insert(steps[key].values, val)
            end
            if math.abs(kBg[i][j]) > 1e-12 then
              local isRotI = (i == 3 or i == 6)
              local isRotJ = (j == 3 or j == 6)
              local ratio = getInertiaSubstitution(el, state)
              local baseB
              if ratio then
                if isRotI and isRotJ then
                  baseB = "EA*L"
                elseif isRotI or isRotJ then
                  baseB = "EA"
                else
                  baseB = "EA/L"
                end
              else
                if isRotI and isRotJ then
                  baseB = "EI/L"
                elseif isRotI or isRotJ then
                  baseB = "EI/L^2"
                else
                  baseB = "EI/L^3"
                end
              end
              local exprB = Expr.fromTerm(EI * kBg[i][j], baseB)
              Matrix.addExpr(K, gi, gj, exprB)
              local key = gi .. "," .. gj
              steps[key] = steps[key] or { symbols = {}, values = {} }
              local sym, val = vigaBarra2dContributionText(e, i, j, "B", state)
              local found = false
              for _, s in ipairs(steps[key].symbols) do
                if s == sym then found = true break end
              end
              if not found then table.insert(steps[key].symbols, sym) end
              table.insert(steps[key].values, val)
            end
          end
        end
      end
    end
  end

  return K, steps
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

local function assembleF(state)
  local n = state.nDof
  local F = {}
  for i = 1, n do
    local expr = Expr.new()
    Expr.addInplace(expr, state.forces[i] or 0, "P")
    F[i] = expr
  end

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    local py0 = el.py0 or 0
    local pyL = el.pyL or 0

    local flocal = {}
    -- No axial distributed load (px): flocal[1] and flocal[4] are always 0
    flocal[1] = 0
    flocal[4] = 0

    -- Check for custom p(x) expression (perpendicular load)
    if el.py and el.py:gsub("%s+", "") ~= "" then
      local pyFn = parseExpr(el.py)
      if pyFn then
        flocal[2] = integrateExpression(pyFn, 2, L)
        flocal[3] = integrateExpression(pyFn, 3, L)
        flocal[5] = integrateExpression(pyFn, 5, L)
        flocal[6] = integrateExpression(pyFn, 6, L)
      else
        flocal[2] = 0
        flocal[3] = 0
        flocal[5] = 0
        flocal[6] = 0
        state.message = "Erro de sintaxe em p(x) do elem " .. e
      end
    else
      flocal[2] = L * (7 * py0 + 3 * pyL) / 20
      flocal[3] = (L * L) * (3 * py0 + 2 * pyL) / 60
      flocal[5] = L * (3 * py0 + 7 * pyL) / 20
      flocal[6] = -(L * L) * (2 * py0 + 3 * pyL) / 60
    end

    local hasLoad = (math.abs(py0) > 1e-9 or math.abs(pyL) > 1e-9) or
                    (el.py and el.py:gsub("%s+", "") ~= "")

    if hasLoad then
      local th1 = el.th1 or el.theta or 0
      local th2 = el.th2 or el.theta or 0
      local c1 = cosd(th1)
      local s1 = sind(th1)
      local c2 = cosd(th2)
      local s2 = sind(th2)
      
      local R = {
        { c1, s1, 0, 0, 0, 0 },
        { -s1, c1, 0, 0, 0, 0 },
        { 0, 0, 1, 0, 0, 0 },
        { 0, 0, 0, c2, s2, 0 },
        { 0, 0, 0, -s2, c2, 0 },
        { 0, 0, 0, 0, 0, 1 }
      }
      local Rt = matTranspose(R)
      -- Determine L scaling powers for each local DOF
      local localPowers = { 1, 1, 2, 1, 1, 2 } -- default analytical
      
      if el.py and el.py:gsub("%s+", "") ~= "" then
        local pyScale, plScale = getExpressionScalingPowers(el.py)
        localPowers[2] = pyScale + plScale + 1
        localPowers[3] = pyScale + plScale + 2
        localPowers[5] = pyScale + plScale + 1
        localPowers[6] = pyScale + plScale + 2
      end

      for j = 1, 6 do
        local power = localPowers[j] or 1
        local base = "p"
        if power == 1 then
          base = "p*L"
        elseif power > 1 then
          base = "p*L^" .. power
        elseif power == -1 then
          base = "p/L"
        elseif power < -1 then
          base = "p/L^" .. (-power)
        end
        
        for i = 1, 6 do
          local val = Rt[i][j] * flocal[j]
          if math.abs(val) > 1e-12 then
            local g = el.dofs[i]
            if g and g > 0 and g <= n then
              Expr.addInplace(F[g], val, base)
            end
          end
        end
      end
    end
  end

  return F
end

local function solveDisplacements(state)
  -- 1. Identify DOF types (Translation vs Rotation) by checking the mesh elements.
  local dofTypes = {}
  for e = 1, state.nElem do
    local el = state.elems[e]
    for i = 1, 6 do
      local g = el.dofs[i]
      if g and g > 0 and g <= state.nDof then
        if i == 3 or i == 6 then
          dofTypes[g] = "R" -- Rotation
        else
          dofTypes[g] = "T" -- Translation
        end
      end
    end
  end

  -- Default any unassigned DOFs to T
  for i = 1, state.nDof do
    if not dofTypes[i] then
      dofTypes[i] = "T"
    end
  end

  -- 2. Define a reference length L_ref
  local L_ref = 1
  if state.elems[1] and state.elems[1].L and state.elems[1].L > 0 then
    L_ref = state.elems[1].L
  end

  -- 3. Construct Row and Column Scaling multipliers
  local rowScale = {}
  local colScale = {}
  for i = 1, state.nDof do
    if dofTypes[i] == "R" then
      rowScale[i] = 1
      colScale[i] = 1
    else
      rowScale[i] = L_ref
      colScale[i] = 1 / L_ref
    end
  end

  -- Assemble original numeric stiffness Kbar
  local K, _ = assembleK(state)
  local Kbar = Matrix.toNumericFull(K)

  -- Construct Kbar_scaled
  local Kbar_scaled = {}
  for i = 1, state.nDof do
    Kbar_scaled[i] = {}
    for j = 1, state.nDof do
      Kbar_scaled[i][j] = Kbar[i][j] * rowScale[i] * colScale[j]
    end
  end

  local F = assembleF(state)

  -- 4. Group terms of F by their primary load base (e.g. "p" or "P")
  local function getPrimaryBase(b)
    if b:sub(1,1) == "p" then return "p" end
    if b:sub(1,1) == "P" then return "P" end
    return b
  end

  local primaryBases = {}
  for i = 1, #F do
    for _, b in ipairs(Expr.getBases(F[i])) do
      local pb = getPrimaryBase(b)
      primaryBases[pb] = true
    end
  end

  local hasConst = false
  for i = 1, #F do
    if not exprIsZeroNumber(F[i].const or 0) then
      hasConst = true
      break
    end
  end
  if hasConst then
    primaryBases["_c"] = true
  end

  local U = {}
  local UByBase = {}
  for i = 1, state.nDof do
    U[i] = Expr.new()
  end

  -- 5. Solve the scaled system for each primary base
  for B, _ in pairs(primaryBases) do
    local Fb = {}
    local p_target = nil
    for i = 1, state.nDof do
      Fb[i] = 0
    end

    if B == "_c" then
      p_target = 0
      for i = 1, state.nDof do
        Fb[i] = F[i].const or 0
      end
    else
      for i = 1, state.nDof do
        local val = 0
        for baseName, coef in pairs(F[i].terms or {}) do
          if getPrimaryBase(baseName) == B then
            val = val + coef
            local p_base = getLPower(baseName)
            local p_scaled = (dofTypes[i] == "T") and (p_base + 1) or p_base
            if not p_target then
              p_target = p_scaled
            end
          end
        end
        Fb[i] = val
      end
    end

    if not p_target then p_target = 0 end

    -- Scale the load vector Fb using rowScale
    local Fb_scaled = {}
    for i = 1, state.nDof do
      Fb_scaled[i] = Fb[i] * rowScale[i]
    end

    -- Solve scaled system: Kbar_scaled * ub_scaled = Fb_scaled
    local ub_scaled, err = Matrix.solveNumeric(Kbar_scaled, Fb_scaled)
    if not ub_scaled then
      return nil, nil, err
    end

    -- Unscale to get physical numeric displacements
    local ub = {}
    for i = 1, state.nDof do
      ub[i] = ub_scaled[i] / colScale[i]
    end

    -- Format symbolic displacements with correct physical bases
    if B == "_c" then
      local bConst = "_c"
      UByBase[bConst] = ub
      for i = 1, #ub do
        Expr.addInplace(U[i], ub[i], nil)
      end
    else
      -- Separate into translation and rotation specific bases for UByBase
      for i = 1, state.nDof do
        local p_final = (dofTypes[i] == "T") and p_target or (p_target - 1)
        local baseName
        if p_final == 0 then
          baseName = B
        elseif p_final == 1 then
          baseName = B .. "*L"
        elseif p_final > 1 then
          baseName = B .. "*L^" .. p_final
        elseif p_final == -1 then
          baseName = B .. "/L"
        else
          baseName = B .. "/L^" .. (-p_final)
        end

        UByBase[baseName] = UByBase[baseName] or {}
        for k = 1, state.nDof do
          UByBase[baseName][k] = UByBase[baseName][k] or 0
        end
        UByBase[baseName][i] = ub[i]

        Expr.addInplace(U[i], ub[i], baseName)
      end
    end
  end

  return U, UByBase, nil
end

local function buildKsLines(state)
  local K, steps = assembleK(state)
  local lines = { "**Ks (montagem passo a passo):" }

  for e = 1, state.nElem do
    local el = state.elems[e]
    local th1 = el.th1 or el.theta or 0
    local th2 = el.th2 or el.theta or 0
    table.insert(lines, "Elemento " .. e .. ": θ1 = " .. th1 .. "°, θ2 = " .. th2 .. "°")
    table.insert(lines, "cos(θ1) = " .. fmtCell(cosd(th1)) .. " ; sin(θ1) = " .. fmtCell(sind(th1)))
    table.insert(lines, "cos(θ2) = " .. fmtCell(cosd(th2)) .. " ; sin(θ2) = " .. fmtCell(sind(th2)))
  end
  table.insert(lines, "")

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

-- Helper to parse a simple monomial: e.g. "2*x^2/L" -> coeff=2, x_power=2, l_power=-1
local function parseMonomial(str)
  str = str:gsub("%s+", ""):lower()
  if str == "" then return 0, 0, 0 end
  
  local coeff = 1
  local sign = 1
  local rest = str
  if str:sub(1,1) == "-" then
    sign = -1
    rest = str:sub(2)
  elseif str:sub(1,1) == "+" then
    rest = str:sub(2)
  end
  
  local numStr = rest:match("^([%d%.]+)")
  if numStr then
    coeff = tonumber(numStr) or 1
  end
  coeff = coeff * sign
  
  local x_power = 0
  if rest:find("x%^([%d]+)") then
    x_power = tonumber(rest:match("x%^([%d]+)")) or 0
  elseif rest:find("x") then
    x_power = 1
  end
  
  local l_power = 0
  if rest:find("/l%^([%d]+)") then
    l_power = -(tonumber(rest:match("/l%^([%d]+)")) or 1)
  elseif rest:find("/l") then
    l_power = -1
  elseif rest:find("l%^([%d]+)") and not rest:find("/l%^") then
    l_power = tonumber(rest:match("l%^([%d]+)")) or 1
  elseif rest:find("l") and not rest:find("/l") then
    l_power = 1
  end
  
  return coeff, x_power, l_power
end

-- Helper to print step-by-step custom integration terms
local function getCustomIntegrationSteps(el, shapeIdx)
  local loadExpr = el.py
  local coeff, x_power, l_power = parseMonomial(loadExpr)
  
  local sfTerms = {}
  local Le_num = el.L or 1
  
  if shapeIdx == 1 then
    sfTerms = {
      { c = 1, xp = 0, lep = 0 },
      { c = -1, xp = 1, lep = 1 }
    }
  elseif shapeIdx == 2 then
    sfTerms = {
      { c = 1, xp = 0, lep = 0 },
      { c = -3, xp = 2, lep = 2 },
      { c = 2, xp = 3, lep = 3 }
    }
  elseif shapeIdx == 3 then
    sfTerms = {
      { c = 1, xp = 1, lep = 0 },
      { c = -2, xp = 2, lep = 1 },
      { c = 1, xp = 3, lep = 2 }
    }
  elseif shapeIdx == 4 then
    sfTerms = {
      { c = 1, xp = 1, lep = 1 }
    }
  elseif shapeIdx == 5 then
    sfTerms = {
      { c = 3, xp = 2, lep = 2 },
      { c = -2, xp = 3, lep = 3 }
    }
  elseif shapeIdx == 6 then
    sfTerms = {
      { c = -1, xp = 2, lep = 1 },
      { c = 1, xp = 3, lep = 2 }
    }
  end
  
  local niStrParts = {}
  for idx, term in ipairs(sfTerms) do
    local tc = term.c
    local txp = term.xp
    local tlep = term.lep
    
    local part = ""
    local sign = ""
    if tc < 0 then
      sign = " - "
      tc = -tc
    elseif idx > 1 then
      sign = " + "
    end
    
    local num = ""
    if tc ~= 1 or (txp == 0 and tlep == 0) then
      num = tostring(tc)
    end
    
    local xTerm = ""
    if txp == 1 then
      xTerm = "x"
    elseif txp > 1 then
      xTerm = "x^" .. txp
    end
    
    local den = ""
    if tlep == 1 then
      den = "(" .. fmtCell(Le_num) .. "*L)"
    elseif tlep > 1 then
      den = "(" .. fmtCell(Le_num) .. "*L)^" .. tlep
    end
    
    if num ~= "" and xTerm ~= "" then
      if den ~= "" then
        part = sign .. num .. "*" .. xTerm .. "/" .. den
      else
        part = sign .. num .. "*" .. xTerm
      end
    elseif num ~= "" then
      if den ~= "" then
        part = sign .. num .. "/" .. den
      else
        part = sign .. num
      end
    elseif xTerm ~= "" then
      if den ~= "" then
        part = sign .. xTerm .. "/" .. den
      else
        part = sign .. xTerm
      end
    end
    table.insert(niStrParts, part)
  end
  local niStr = table.concat(niStrParts)
  if #sfTerms > 1 then
    niStr = "(" .. niStr .. ")"
  end
  
  local expandedParts = {}
  for idx, term in ipairs(sfTerms) do
    local tc = coeff * term.c
    local txp = x_power + term.xp
    local totLdenPower = -l_power + term.lep
    local denCoeff = math.pow(Le_num, term.lep)
    
    local sign = ""
    if tc < 0 then
      sign = " - "
      tc = -tc
    elseif idx > 1 then
      sign = " + "
    end
    
    local numStr = tostring(tc) .. "*p"
    local denStr = ""
    if denCoeff ~= 1 then
      denStr = tostring(denCoeff)
    end
    
    if txp == 1 then
      numStr = numStr .. "*x"
    elseif txp > 1 then
      numStr = numStr .. "*x^" .. txp
    end
    
    if totLdenPower == 1 then
      if denStr ~= "" then denStr = denStr .. "*L" else denStr = "L" end
    elseif totLdenPower > 1 then
      if denStr ~= "" then denStr = denStr .. "*L^" .. totLdenPower else denStr = "L^" .. totLdenPower end
    elseif totLdenPower == -1 then
      numStr = numStr .. "*L"
    elseif totLdenPower < -1 then
      numStr = numStr .. "*L^" .. (-totLdenPower)
    end
    
    local termStr = ""
    if denStr ~= "" then
      termStr = sign .. numStr .. "/" .. denStr
    else
      termStr = sign .. numStr
    end
    table.insert(expandedParts, termStr)
  end
  local expandedStr = table.concat(expandedParts)
  
  local function cleanStar(s)
    s = s:gsub("%*%*", "*")
    s = s:gsub("%*+", "*")
    s = s:gsub("([%d%.])%*p", "%1p")
    s = s:gsub("p%*x", "px")
    s = s:gsub("x%*x", "x^2")
    s = s:gsub("([%d%.])%*L", "%1L")
    s = s:gsub("([%d%.])%*x", "%1x")
    s = s:gsub("%*%*", "*")
    s = s:gsub(" %-  ", " - ")
    s = s:gsub(" %+  ", " + ")
    return s
  end
  
  niStr = cleanStar(niStr)
  expandedStr = cleanStar(expandedStr)
  
  local formattedLoad = loadExpr:gsub("([%d%.])%*x", "%1x"):gsub("([%d%.])%*p", "%1p"):gsub("p%*x", "px")
  if not formattedLoad:find("p") then
    -- Insert p after the leading coefficient and before x, so e.g. "-2x^2/L" -> "-2px^2/L"
    local inserted = formattedLoad:gsub("^(%-?%d*%.?%d*)(x)", "%1p%2")
    if inserted ~= formattedLoad then
      formattedLoad = inserted
    elseif formattedLoad:find("x") then
      formattedLoad = formattedLoad:gsub("x", "px", 1)
    else
      formattedLoad = formattedLoad .. "p"
    end
  end
  formattedLoad = cleanStar(formattedLoad)
  
  return formattedLoad, niStr, expandedStr
end
local function formatSymbolicValue(val, power)
  if math.abs(val) < 1e-9 then
    return "0"
  end
  local term = fmtCell(val)
  if power == 0 then
    return term .. "*p"
  elseif power == 1 then
    return term .. "*p*L"
  elseif power > 1 then
    return term .. "*p*L^" .. power
  elseif power == -1 then
    return term .. "*p/L"
  else
    return term .. "*p/L^" .. (-power)
  end
end

local function buildFVectorResolutionLines(state)
  local lines = {}
  local n = state.nDof

  for e = 1, state.nElem do
    local el = state.elems[e]
    local L = el.L or 1
    local py0 = el.py0 or 0
    local pyL = el.pyL or 0
    local customPy = el.py and el.py:gsub("%s+", "") ~= ""
    local hasPy = customPy or (math.abs(py0) > 1e-9 or math.abs(pyL) > 1e-9)

    local function doElement()
      if not hasPy then return end

      local th1 = el.th1 or el.theta or 0
      local th2 = el.th2 or el.theta or 0
      local Le_val = fmtCell(L) .. "L"
      if L == 1 then Le_val = "L" end

      table.insert(lines, "**-- Elemento " .. e .. " --")
      table.insert(lines, "Le = " .. fmtCell(L) .. "L = " .. fmtCell(L) .. " * L")
      table.insert(lines, "theta1 = " .. th1 .. "deg ; theta2 = " .. th2 .. "deg")

      -- Show determination of p(x) (perpendicular distributed load)
      if customPy then
        table.insert(lines, "p(x) = " .. el.py)
      elseif hasPy then
        if math.abs(py0 - pyL) < 1e-9 then
          table.insert(lines, "p(x) = " .. fmtCell(py0) .. "p (uniforme)")
        else
          local val0 = py0
          local valL = pyL
          local val0Str = fmtCell(val0) .. "p"
          local valLStr = fmtCell(valL) .. "p"
          table.insert(lines, "p(x) = P2 * (x/Le) + P1")
          table.insert(lines, "  x = 0  => " .. val0Str .. " = P1 => P1 = " .. val0Str)
          local p2Val = valL - val0
          local p2Str = fmtCell(p2Val) .. "p"
          table.insert(lines, "  x = Le => " .. valLStr .. " = P2 + P1 => P2 = " .. p2Str)
          local funcStr = ""
          if math.abs(val0) < 1e-9 then
            funcStr = p2Str .. " * (x/Le)"
          elseif math.abs(p2Val) < 1e-9 then
            funcStr = val0Str
          else
            funcStr = val0Str .. " + " .. p2Str .. " * (x/Le)"
            funcStr = funcStr:gsub("%+ %-", "- ")
          end
          table.insert(lines, "  p(x) = " .. funcStr)
        end
      end
      table.insert(lines, "")

      -- Compute local FEF numeric parts
      local f = { 0, 0, 0, 0, 0, 0 }
      -- f[1] and f[4] (axial) are always 0 (no axial distributed load)
      if customPy then
        local pyFn = parseExpr(el.py)
        if pyFn then
          f[2] = integrateExpression(pyFn, 2, L)
          f[3] = integrateExpression(pyFn, 3, L)
          f[5] = integrateExpression(pyFn, 5, L)
          f[6] = integrateExpression(pyFn, 6, L)
        end
      elseif hasPy then
        f[2] = L * (7 * py0 + 3 * pyL) / 20
        f[3] = (L * L) * (3 * py0 + 2 * pyL) / 60
        f[5] = L * (3 * py0 + 7 * pyL) / 20
        f[6] = -(L * L) * (2 * py0 + 3 * pyL) / 60
      end

      -- Local powers
      local localPowers = { 1, 1, 2, 1, 1, 2 }
      if el.py and el.py:gsub("%s+", "") ~= "" then
        local pyScale, plScale = getExpressionScalingPowers(el.py)
        localPowers[2] = pyScale + plScale + 1
        localPowers[3] = pyScale + plScale + 2
        localPowers[5] = pyScale + plScale + 1
        localPowers[6] = pyScale + plScale + 2
      end

      -- Detailed custom integration steps for p(x)
      if customPy then
        for _, j in ipairs({ 2, 3, 5, 6 }) do
          if math.abs(f[j]) > 1e-12 then
            local p_load_str, niStr, expandedStr = getCustomIntegrationSteps(el, j)
            table.insert(lines, "F_" .. j .. "^(" .. e .. ") = ∫_0^(" .. Le_val .. ") " .. p_load_str .. " * N" .. j .. " dx")
            table.insert(lines, "  = ∫_0^(" .. Le_val .. ") (" .. p_load_str .. ") * " .. niStr .. " dx")
            table.insert(lines, "  = ∫_0^(" .. Le_val .. ") (" .. expandedStr .. ") dx")
            local formattedResult = formatSymbolicValue(f[j], localPowers[j])
            table.insert(lines, "  = " .. formattedResult)
            table.insert(lines, "")
          end
        end
      end

      -- Build f_formulas for analytical
      local f_formulas = { "0", "0", "0", "0", "0", "0" }
      if hasPy then
        if not customPy then
          local val0Str = fmtCell(py0) .. "p"
          local valLStr = fmtCell(pyL) .. "p"
          if math.abs(py0 - pyL) < 1e-9 then
            f_formulas[2] = "(" .. val0Str .. ")*(" .. Le_val .. ")/2"
            f_formulas[3] = "(" .. val0Str .. ")*(" .. Le_val .. ")^2/12"
            f_formulas[5] = "(" .. val0Str .. ")*(" .. Le_val .. ")/2"
            f_formulas[6] = "-(" .. val0Str .. ")*(" .. Le_val .. ")^2/12"
          elseif math.abs(py0) < 1e-9 then
            f_formulas[2] = "3*(" .. valLStr .. ")*(" .. Le_val .. ")/20"
            f_formulas[3] = "(" .. valLStr .. ")*(" .. Le_val .. ")^2/30"
            f_formulas[5] = "7*(" .. valLStr .. ")*(" .. Le_val .. ")/20"
            f_formulas[6] = "-(" .. valLStr .. ")*(" .. Le_val .. ")^2/20"
          elseif math.abs(pyL) < 1e-9 then
            f_formulas[2] = "7*(" .. val0Str .. ")*(" .. Le_val .. ")/20"
            f_formulas[3] = "(" .. val0Str .. ")*(" .. Le_val .. ")^2/20"
            f_formulas[5] = "3*(" .. val0Str .. ")*(" .. Le_val .. ")/20"
            f_formulas[6] = "-(" .. val0Str .. ")*(" .. Le_val .. ")^2/30"
          else
            f_formulas[2] = "(" .. Le_val .. ")*(7*(" .. val0Str .. ")+3*(" .. valLStr .. "))/20"
            f_formulas[3] = "(" .. Le_val .. ")^2*(3*(" .. val0Str .. ")+2*(" .. valLStr .. "))/60"
            f_formulas[5] = "(" .. Le_val .. ")*(3*(" .. val0Str .. ")+7*(" .. valLStr .. "))/20"
            f_formulas[6] = "-(" .. Le_val .. ")^2*(2*(" .. val0Str .. ")+3*(" .. valLStr .. "))/60"
          end
        else
          f_formulas[2] = "F_2^(" .. e .. ")"
          f_formulas[3] = "F_3^(" .. e .. ")"
          f_formulas[5] = "F_5^(" .. e .. ")"
          f_formulas[6] = "F_6^(" .. e .. ")"
        end
      end

      -- Format formula vectors
      table.insert(lines, "{f}^(" .. e .. ") local formula:")
      local formStr = "{ " .. table.concat(f_formulas, " ; ") .. " }^T"
      table.insert(lines, formStr)
      table.insert(lines, "")

      table.insert(lines, "{f}^(" .. e .. ") local =")
      for j = 1, 6 do
        local formattedVal = formatSymbolicValue(f[j], localPowers[j])
        table.insert(lines, "  [ " .. formattedVal .. " ]")
      end
      table.insert(lines, "")

      -- Compute global FEF via R^T
      local c1 = cosd(th1)
      local s1 = sind(th1)
      local c2 = cosd(th2)
      local s2 = sind(th2)
      local R = {
        { c1,  s1, 0, 0,   0,  0 },
        { -s1, c1, 0, 0,   0,  0 },
        { 0,   0,  1, 0,   0,  0 },
        { 0,   0,  0, c2,  s2, 0 },
        { 0,   0,  0, -s2, c2, 0 },
        { 0,   0,  0, 0,   0,  1 }
      }
      local Rt = matTranspose(R)

      -- Check if th != 0
      local needsTransform = math.abs(th1) > 1e-9 or math.abs(th2) > 1e-9

      if needsTransform then
        table.insert(lines, "{F}^(" .. e .. ") = [R]^T x {f}^(" .. e .. "):")
        
        local fglobal = { 0, 0, 0, 0, 0, 0 }
        for i = 1, 6 do
          local expr = Expr.new()
          for j = 1, 6 do
            local val = Rt[i][j] * f[j]
            if math.abs(val) > 1e-12 then
              local power = localPowers[j] or 1
              local base = "p"
              if power == 1 then base = "p*L"
              elseif power > 1 then base = "p*L^" .. power
              elseif power == -1 then base = "p/L"
              elseif power < -1 then base = "p/L^" .. (-power)
              end
              Expr.addInplace(expr, val, base)
            end
          end
          fglobal[i] = expr
        end

        local function formatMatrixVectorProduct(Rt, f, localPowers, fglobal, dofs)
          local prodLines = {}
          local Rt_str = {}
          local Rt_w = {0, 0, 0, 0, 0, 0}
          for i = 1, 6 do
            Rt_str[i] = {}
            for j = 1, 6 do
              local s = fmtCell(Rt[i][j])
              Rt_str[i][j] = s
              Rt_w[j] = math.max(Rt_w[j], #s)
            end
          end
          local local_str = {}
          local local_max_w = 0
          for i = 1, 6 do
            local s = formatSymbolicValue(f[i], localPowers[i])
            local_str[i] = s
            local_max_w = math.max(local_max_w, #s)
          end
          local global_str = {}
          local global_max_w = 0
          for i = 1, 6 do
            local s = Expr.toString(fglobal[i])
            global_str[i] = s
            global_max_w = math.max(global_max_w, #s)
          end
          for i = 1, 6 do
            local rowParts = {}
            for j = 1, 6 do
              local s = Rt_str[i][j]
              table.insert(rowParts, s .. string.rep(" ", Rt_w[j] - #s))
            end
            local rt_row = "[ " .. table.concat(rowParts, "  ") .. " ]"
            local op_mult = (i == 3) and " * " or "   "
            local op_eq   = (i == 3) and " = " or "   "
            local l_val = local_str[i]
            local l_part = "[ " .. l_val .. string.rep(" ", local_max_w - #l_val) .. " ]"
            local g_val = global_str[i]
            local g_part = "[ " .. g_val .. string.rep(" ", global_max_w - #g_val) .. " ]"
            local d = dofs[i]
            local comment = (d and d > 0) and (" -> U" .. d) or " -> Restrito"
            table.insert(prodLines, "  " .. rt_row .. op_mult .. l_part .. op_eq .. g_part .. comment)
          end
          return prodLines
        end

        for _, prodLine in ipairs(formatMatrixVectorProduct(Rt, f, localPowers, fglobal, el.dofs)) do
          table.insert(lines, prodLine)
        end
        table.insert(lines, "")

        table.insert(lines, "{F}^(" .. e .. ") =")
        for i = 1, 6 do
          table.insert(lines, "  [ " .. Expr.toString(fglobal[i]) .. " ]")
        end
        table.insert(lines, "")
      else
        table.insert(lines, "{F}^(" .. e .. ") = {f}^(" .. e .. ") local (theta=0):")
        for i = 1, 6 do
          local expr = Expr.new()
          local power = localPowers[i] or 1
          local base = "p"
          if power == 1 then base = "p*L"
          elseif power > 1 then base = "p*L^" .. power
          elseif power == -1 then base = "p/L"
          elseif power < -1 then base = "p/L^" .. (-power)
          end
          Expr.addInplace(expr, f[i], base)
          local d = el.dofs[i]
          local comment = (d and d > 0) and (" -> U" .. d) or " -> Restrito"
          table.insert(lines, "  F_" .. i .. "^global = [ " .. Expr.toString(expr) .. " ]" .. comment)
        end
        table.insert(lines, "")
      end
    end

    doElement()
  end

  -- Nodal point loads
  local hasPointLoads = false
  for i = 1, state.nDof do
    if math.abs(state.forces[i] or 0) > 1e-9 then hasPointLoads = true break end
  end
  if hasPointLoads then
    table.insert(lines, "**Forças nodais (P):")
    for i = 1, state.nDof do
      local ff = state.forces[i] or 0
      if math.abs(ff) > 1e-9 then
        table.insert(lines, "F_" .. i .. " = " .. fmtCell(ff) .. "*P")
      end
    end
    table.insert(lines, "")
  end

  -- Final assembled {F}
  table.insert(lines, "**{F} (montado):")
  local F = assembleF(state)
  for i = 1, state.nDof do
    local fNodal = state.forces[i] or 0
    local sumTerms = {}
    if math.abs(fNodal) > 1e-9 then
      table.insert(sumTerms, fmtCell(fNodal) .. "*P")
    end

    for e = 1, state.nElem do
      local el = state.elems[e]
      local L = el.L or 1
      local py0 = el.py0 or 0
      local pyL = el.pyL or 0
      local customPy = el.py and el.py:gsub("%s+", "") ~= ""
      local hasPy = customPy or (math.abs(py0) > 1e-9 or math.abs(pyL) > 1e-9)

      if hasPy then
        for localIdx = 1, 6 do
          if el.dofs[localIdx] == i then
            local f = { 0, 0, 0, 0, 0, 0 }
            if customPy then
              local pyFn = parseExpr(el.py)
              if pyFn then
                f[2] = integrateExpression(pyFn, 2, L)
                f[3] = integrateExpression(pyFn, 3, L)
                f[5] = integrateExpression(pyFn, 5, L)
                f[6] = integrateExpression(pyFn, 6, L)
              end
            else
              f[2] = L * (7 * py0 + 3 * pyL) / 20
              f[3] = (L * L) * (3 * py0 + 2 * pyL) / 60
              f[5] = L * (3 * py0 + 7 * pyL) / 20
              f[6] = -(L * L) * (2 * py0 + 3 * pyL) / 60
            end

            local localPowers = { 1, 1, 2, 1, 1, 2 }
            if el.py and el.py:gsub("%s+", "") ~= "" then
              local pyScale, plScale = getExpressionScalingPowers(el.py)
              localPowers[2] = pyScale + plScale + 1
              localPowers[3] = pyScale + plScale + 2
              localPowers[5] = pyScale + plScale + 1
              localPowers[6] = pyScale + plScale + 2
            end

            local th1 = el.th1 or el.theta or 0
            local th2 = el.th2 or el.theta or 0
            local c1 = cosd(th1)
            local s1 = sind(th1)
            local c2 = cosd(th2)
            local s2 = sind(th2)
            local R = {
              { c1,  s1, 0, 0,   0,  0 },
              { -s1, c1, 0, 0,   0,  0 },
              { 0,   0,  1, 0,   0,  0 },
              { 0,   0,  0, c2,  s2, 0 },
              { 0,   0,  0, -s2, c2, 0 },
              { 0,   0,  0, 0,   0,  1 }
            }
            local Rt = matTranspose(R)

            local expr = Expr.new()
            for k = 1, 6 do
              local val = Rt[localIdx][k] * f[k]
              if math.abs(val) > 1e-12 then
                local power = localPowers[k] or 1
                local base = "p"
                if power == 1 then base = "p*L"
                elseif power > 1 then base = "p*L^" .. power
                elseif power == -1 then base = "p/L"
                elseif power < -1 then base = "p/L^" .. (-power)
                end
                Expr.addInplace(expr, val, base)
              end
            end

            if not Expr.isZero(expr) then
              table.insert(sumTerms, Expr.toString(expr))
            else
              table.insert(sumTerms, "0")
            end
          end
        end
      end
    end

    local sumStr = ""
    if #sumTerms == 0 then
      sumStr = "0"
    else
      sumStr = table.concat(sumTerms, " + ")
      sumStr = sumStr:gsub(" %+ %-", " - ")
      sumStr = sumStr:gsub("^ %+ ", "")
    end
    table.insert(lines, "  F" .. i .. " = " .. sumStr .. " = " .. Expr.toString(F[i]))
  end

  return lines
end

local function buildDefOptionLines(state, option)
  -- Option 5 (force vector) doesn't need displacement solve
  if option == 5 then
    return buildFVectorResolutionLines(state)
  end

  local lines = {}
  local U, UByBase, err = solveDisplacements(state)
  if not U then
    table.insert(lines, "Sistema global:")
    table.insert(lines, "[K]{U} = {F}")
    local K, _ = assembleK(state)
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
    for _, line in ipairs(buildFVectorResolutionLines(state)) do
      table.insert(lines, line)
    end
    table.insert(lines, "")
    table.insert(lines, "Equações de Equilíbrio [K]{U} = {F}:")
    local K, _ = assembleK(state)
    local F = assembleF(state)
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
      table.insert(lines, "  " .. lhs .. " = " .. Expr.toString(F[i]))
    end
    table.insert(lines, "")
    table.insert(lines, "Resolução dos Deslocamentos:")
    for i = 1, #U do
      table.insert(lines, "  U" .. i .. " = " .. Expr.toString(U[i]))
    end
  elseif option == 2 then
    table.insert(lines, "Esforço normal por elemento:")
    for e = 1, state.nElem do
      local el = state.elems[e]
      local th1 = el.th1 or el.theta or 0
      local th2 = el.th2 or el.theta or 0
      local c1 = cosd(th1)
      local s1 = sind(th1)
      local c2 = cosd(th2)
      local s2 = sind(th2)
      local L = el.L or 1
      local dofs = el.dofs

      table.insert(lines, "--- Elemento " .. e .. " ---")
      table.insert(lines, "Relações constitutivas e cinemáticas:")
      table.insert(lines, "  N = (E*A)/L * (u2 - u1)")
      table.insert(lines, "  δ = u2 - u1")
      table.insert(lines, "Transformação de coordenadas:")

      local uName = {}
      uName[1] = dofs[1] > 0 and ("U" .. dofs[1]) or "0"
      uName[2] = dofs[2] > 0 and ("U" .. dofs[2]) or "0"
      uName[3] = dofs[4] > 0 and ("U" .. dofs[4]) or "0"
      uName[4] = dofs[5] > 0 and ("U" .. dofs[5]) or "0"

      local function padR(str, len)
        return str .. string.rep(" ", math.max(0, len - #str))
      end

      local th1Str = exprFormatNumber(th1)
      local th2Str = exprFormatNumber(th2)
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

      local f1 = (uName[1] ~= "0" and uName[1] .. "*cos(" .. th1 .. "°)" or "")
      local f2 = (uName[2] ~= "0" and uName[2] .. "*sin(" .. th1 .. "°)" or "")
      local f1_full = (f1 ~= "" and f2 ~= "") and (f1 .. " + " .. f2) or (f1 .. f2)
      if f1_full == "" then f1_full = "0" end

      local f3 = (uName[3] ~= "0" and uName[3] .. "*cos(" .. th2 .. "°)" or "")
      local f4 = (uName[4] ~= "0" and uName[4] .. "*sin(" .. th2 .. "°)" or "")
      local f2_full = (f3 ~= "" and f4 ~= "") and (f3 .. " + " .. f4) or (f3 .. f4)
      if f2_full == "" then f2_full = "0" end

      table.insert(lines, "  u1 = " .. f1_full)
      table.insert(lines, "  u2 = " .. f2_full)
      table.insert(lines, "")

      local Nexpr = Expr.new()
      for baseName, ub in pairs(UByBase) do
        local U1 = (ub[dofs[1]] or 0)
        local V1 = (ub[dofs[2]] or 0)
        local U2 = (ub[dofs[4]] or 0)
        local V2 = (ub[dofs[5]] or 0)
        local u1l = c1 * U1 + s1 * V1
        local u2l = c2 * U2 + s2 * V2

        local sub1Parts = {}
        if U1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(U1) .. ")*cos(" .. th1 .. "°)") end
        if V1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(V1) .. ")*sin(" .. th1 .. "°)") end
        local sub1 = #sub1Parts > 0 and table.concat(sub1Parts, " + ") or "0"

        local sub2Parts = {}
        if U2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(U2) .. ")*cos(" .. th2 .. "°)") end
        if V2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(V2) .. ")*sin(" .. th2 .. "°)") end
        local sub2 = #sub2Parts > 0 and table.concat(sub2Parts, " + ") or "0"

        local dispScale = baseName
        if baseName == "_c" then
          dispScale = "const"
        end

        table.insert(lines, "Substituindo deslocamentos para " .. dispScale .. ":")
        table.insert(lines, "  u1 = (" .. sub1 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u1l) .. " * " .. dispScale)
        table.insert(lines, "  u2 = (" .. sub2 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u2l) .. " * " .. dispScale)

        local delta = (u2l - u1l) / L
        local val = (el.E or 1) * (el.A or 1) * delta
        Expr.addInplace(Nexpr, val, baseName)
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
      if Nexpr.const and math.abs(Nexpr.const) > 1e-9 then
        local coef = Nexpr.const
        if coef > 1e-9 then
          t_c = " (Tração)"
        elseif coef < -1e-9 then
          t_c = " (Compressão)"
        end
      end

      table.insert(lines, "Esforço Normal (N):")
      table.insert(lines, "  N = " .. Expr.toString(Nexpr) .. t_c)
      
      local area = el.A or 1
      if area <= 0 then area = 1 end
      local Aexpr = Expr.scale(Nexpr, 1 / area)
      table.insert(lines, "Tensão (σ) = N/A = " .. Expr.toString(Aexpr))
      table.insert(lines, "")
    end
  elseif option == 3 then
    local e = state.defElem or 1
    if e < 1 then e = 1 end
    if e > state.nElem then e = state.nElem end
    local el = state.elems[e]
    local xi = state.defX or 0.5
    local th1 = el.th1 or el.theta or 0
    local th2 = el.th2 or el.theta or 0
    local c1 = cosd(th1)
    local s1 = sind(th1)
    local c2 = cosd(th2)
    local s2 = sind(th2)
    local dofs = el.dofs
    local L = el.L or 1

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

    table.insert(lines, "Deslocamento axial local no Elemento " .. e .. " em x=" .. exprFormatNumber(xi * L) .. "L (x/L_barra=" .. exprFormatNumber(xi) .. "):")
    table.insert(lines, "Transformação de coordenadas:")

    local uName = {}
    uName[1] = dofs[1] > 0 and ("U" .. dofs[1]) or "0"
    uName[2] = dofs[2] > 0 and ("U" .. dofs[2]) or "0"
    uName[3] = dofs[4] > 0 and ("U" .. dofs[4]) or "0"
    uName[4] = dofs[5] > 0 and ("U" .. dofs[5]) or "0"

    local function padR(str, len)
      return str .. string.rep(" ", math.max(0, len - #str))
    end

    local th1Str = exprFormatNumber(th1)
    local th2Str = exprFormatNumber(th2)
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

    local f1 = (uName[1] ~= "0" and uName[1] .. "*cos(" .. th1 .. "°)" or "")
    local f2 = (uName[2] ~= "0" and uName[2] .. "*sin(" .. th1 .. "°)" or "")
    local f1_full = (f1 ~= "" and f2 ~= "") and (f1 .. " + " .. f2) or (f1 .. f2)
    if f1_full == "" then f1_full = "0" end

    local f3 = (uName[3] ~= "0" and uName[3] .. "*cos(" .. th2 .. "°)" or "")
    local f4 = (uName[4] ~= "0" and uName[4] .. "*sin(" .. th2 .. "°)" or "")
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
    for baseName, ub in pairs(UByBase) do
      local U1 = (ub[dofs[1]] or 0)
      local V1 = (ub[dofs[2]] or 0)
      local U2 = (ub[dofs[4]] or 0)
      local V2 = (ub[dofs[5]] or 0)
      local u1l = c1 * U1 + s1 * V1
      local u2l = c2 * U2 + s2 * V2
      local u_xi = u1l * (1 - xi) + u2l * xi
      Expr.addInplace(disp, u_xi, baseName)

      local sub1Parts = {}
      if U1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(U1) .. ")*cos(" .. th1 .. "°)") end
      if V1 ~= 0 then table.insert(sub1Parts, "(" .. exprFormatNumber(V1) .. ")*sin(" .. th1 .. "°)") end
      local sub1 = #sub1Parts > 0 and table.concat(sub1Parts, " + ") or "0"

      local sub2Parts = {}
      if U2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(U2) .. ")*cos(" .. th2 .. "°)") end
      if V2 ~= 0 then table.insert(sub2Parts, "(" .. exprFormatNumber(V2) .. ")*sin(" .. th2 .. "°)") end
      local sub2 = #sub2Parts > 0 and table.concat(sub2Parts, " + ") or "0"

      local dispScale = baseName
      if baseName == "_c" then
        dispScale = "const"
      end

      table.insert(lines, "Para " .. dispScale .. ":")
      table.insert(lines, "  u1 = (" .. sub1 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u1l) .. " * " .. dispScale)
      table.insert(lines, "  u2 = (" .. sub2 .. ") * " .. dispScale .. " = " .. exprFormatNumber(u2l) .. " * " .. dispScale)
      table.insert(lines, "Substituindo deslocamentos:")
      table.insert(lines, "  u(x) = (1 - x/" .. eLsym .. ")*(" .. exprFormatNumber(u1l) .. ") + (x/" .. eLsym .. ")*(" .. exprFormatNumber(u2l) .. ") * " .. dispScale)
      local x_str = exprFormatNumber(xi * L) .. "L"
      table.insert(lines, "Substituindo x = " .. x_str .. ":")
      table.insert(lines, "  u(x) = (1 - " .. exprFormatNumber(xi) .. ")*(" .. exprFormatNumber(u1l) .. ") + (" .. exprFormatNumber(xi) .. ")*(" .. exprFormatNumber(u2l) .. ") * " .. dispScale)
      table.insert(lines, "       = " .. exprFormatNumber(u_xi) .. " * " .. dispScale)
    end

    table.insert(lines, "")
    table.insert(lines, "Resultado final:")
    table.insert(lines, "  u(x) = " .. Expr.toString(disp))
  elseif option == 4 then
    table.insert(lines, "Zona Crítica (|N| Máximo):")
    local maxCoef = -1
    local maxElem = 1
    local maxN = Expr.new()
    for e = 1, state.nElem do
      local el = state.elems[e]
      local th1 = el.th1 or el.theta or 0
      local th2 = el.th2 or el.theta or 0
      local c1 = cosd(th1)
      local s1 = sind(th1)
      local c2 = cosd(th2)
      local s2 = sind(th2)
      local L = el.L or 1
      local dofs = el.dofs
      local Nexpr = Expr.new()
      for base, ub in pairs(UByBase) do
        local U1 = (ub[dofs[1]] or 0)
        local V1 = (ub[dofs[2]] or 0)
        local U2 = (ub[dofs[4]] or 0)
        local V2 = (ub[dofs[5]] or 0)
        local u1 = c1 * U1 + s1 * V1
        local u2 = c2 * U2 + s2 * V2
        local val = (el.E or 1) * (el.A or 1) * (u2 - u1) / L
        Expr.addInplace(Nexpr, val, base)
      end
      local bases = Expr.getBases(Nexpr)
      if #bases > 0 then
        local val = math.abs(Expr.getCoeff(Nexpr, bases[1]))
        if val > maxCoef then
          maxCoef = val
          maxElem = e
          maxN = Nexpr
        end
      end
    end
    table.insert(lines, "Elemento mais solicitado: Elemento " .. maxElem)
    table.insert(lines, "Esforço Normal Máximo |N| = " .. Expr.toString(maxN))
  elseif option == 5 then
    -- This branch is only reached if buildFVectorResolutionLines already returned.
    -- (Should not normally reach here due to early return above.)
    return buildFVectorResolutionLines(state)
  end

  return lines
end

local function buildDefLines(state)
  local lines = {}
  local option = state.defOption or 1
  local options = {
    "Deslocamentos globais (U)",
    "Esforço normal (N) e Tensão (σ)",
    "Deslocamento axial local u(x)",
    "Zona crítica",
    "Vetor de forças {F}"
  }

  table.insert(lines, "Opções:")
  for i, name in ipairs(options) do
    local cursor = (i == option) and "> " or "  "
    local selected = state.defSelected and state.defSelected[i]
    local marker = selected and "* " or "  "
    table.insert(lines, cursor .. marker .. name)
  end

  local cursor6 = (option == 6) and "> " or "  "
  local elemStr = "Elemento: "
  if option == 6 and state.defEditText then
    elemStr = elemStr .. state.defEditText .. "_"
  else
    elemStr = elemStr .. tostring(state.defElem or 1)
  end
  table.insert(lines, cursor6 .. "  " .. elemStr)

  local cursor7 = (option == 7) and "> " or "  "
  local xLStr = "x/L: "
  if option == 7 and state.defEditText then
    xLStr = xLStr .. state.defEditText .. "_"
  else
    xLStr = xLStr .. tostring(state.defX or 0.5)
  end
  table.insert(lines, cursor7 .. "  " .. xLStr)

  local cursor8 = (option == 8) and "> " or "  "
  local subISelected = state.useSubstitutedI and "* " or "  "
  table.insert(lines, cursor8 .. subISelected .. "Substituir I = nA(L^2)")

  local cursor9 = (option == 9) and "> " or "  "
  local subICoefStr = "  n: "
  if option == 9 and state.defEditText then
    subICoefStr = subICoefStr .. state.defEditText .. "_"
  else
    subICoefStr = subICoefStr .. tostring(state.subICoef or 2)
  end
  table.insert(lines, cursor9 .. "  " .. subICoefStr)

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
  table.insert(lines, "| Elem | U1 | V1 | θ1 | U2 | V2 | θ2 | θ1 | θ2 | L | E | A | I |")
  for i = 1, state.nElem do
    local el = state.elems[i]
    local d = el.dofs
    local coef = state.subICoef or 2
    local displayedI = state.useSubstitutedI and (tostring(coef) .. "A(L^2)") or el.I
    local row = string.format("|   %d  | %d  | %d  | %d   | %d  | %d  | %d   | %d°  | %d°  | %s | %s | %s | %s |",
      i, d[1], d[2], d[3], d[4], d[5], d[6], el.th1 or 0, el.th2 or 0, fmtVal(el.L), fmtVal(el.E), fmtVal(el.A), fmtVal(displayedI))
    table.insert(lines, row)
  end
  return lines
end

local function buildForceTableLines(state)
  local lines = {}
  table.insert(lines, "**Forças nodais aplicadas:")
  for i = 1, state.nDof do
    table.insert(lines, string.format("F%d = %.4g * P", i, state.forces[i] or 0))
  end
  table.insert(lines, "")
  table.insert(lines, "**Cargas distribuidas nos elementos:")
  for i = 1, state.nElem do
    local el = state.elems[i]
    local pStr = (el.py and el.py:gsub("%s+", "") ~= "") and ("p(x) = " .. el.py) or string.format("p(0) = %.4g, p(L) = %.4g", el.py0 or 0, el.pyL or 0)
    table.insert(lines, string.format("Elem %d: %s", i, pStr))
  end
  return lines
end

-- ======================== TABS REGISTRATION ========================
function VigaBarra2D.start()
  local state = storage.load("VigaBarra2D_state", defaultState())
  ensureSizes(state)

  local mcTab = { title = "m.c." }

  local function getCellValue(row, col)
    local el = state.elems[row]
    if not el then return nil end
    if col >= 1 and col <= 6 then
      return el.dofs[col]
    elseif col == 7 then return el.th1
    elseif col == 8 then return el.th2
    elseif col == 9 then return el.L
    elseif col == 10 then return el.E
    elseif col == 11 then return el.A
    elseif col == 12 then return el.I
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

    if col >= 1 and col <= 6 then
      if text == "" then
        state.elems[row].dofs[col] = 0
        state.tab1EditText = nil
        saveState(state)
        return true
      end
      if val == nil or val < 0 or val > state.nDof then
        state.message = "GDL deve estar entre 0 e " .. tostring(state.nDof)
        return false
      end
      state.elems[row].dofs[col] = math.floor(val + 0.5)
    elseif col == 7 then
      if val == nil then return false end
      state.elems[row].th1 = val
    elseif col == 8 then
      if val == nil then return false end
      state.elems[row].th2 = val
    elseif col == 9 then
      if val == nil or val <= 0 then return false end
      state.elems[row].L = val
    elseif col == 10 then
      if val == nil or val <= 0 then return false end
      state.elems[row].E = val
    elseif col == 11 then
      if val == nil or val <= 0 then return false end
      state.elems[row].A = val
    elseif col == 12 then
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
    end

    state.tab1EditText = nil
    state.message = "Celula atualizada."
    saveState(state)
    return true
  end

  local function ensureTab1SelectionVisible(h)
    local cellTop = 0
    if state.tab1SelCol <= 6 then
      cellTop = 50 + 14 + 18 + (state.tab1SelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nElem * 18
      cellTop = 50 + topTableH + 8 + 14 + 18 + (state.tab1SelRow - 1) * 18
    end
    local cellBottom = cellTop + 18
    local scroll = state.tab1ScrollPx or 0
    if cellTop - scroll < 50 then
      scroll = cellTop - 50
    elseif cellBottom - scroll > h then
      scroll = cellBottom - h
    end
    local totalH = 50 + (14 + 18 + state.nElem * 18) + 8 + (14 + 18 + state.nElem * 18)
    state.tab1ScrollPx = math.max(0, math.min(scroll, totalH - h))
  end

  local function vigaBarra_drawMcSection(gc, x, y, title, cols, rowCount, selRow, selCol, editText, getVal)
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
    gc:drawString("VigaBarra2D - Identificacao GDL e m.c.", x, y, "top")
    gc:setFont("sansserif", "r", 9)
    gc:drawString("Elementos:", x, y + 14, "top")
    gc:setColorRGB(200, 0, 0)
    gc:drawString(tostring(state.nElem), x + 55, y + 14, "top")
    gc:setColorRGB(20, 20, 20)
    gc:drawString("GDL:", x + 85, y + 14, "top")
    gc:setColorRGB(0, 70, 190)
    gc:drawString(tostring(state.nDof), x + 110, y + 14, "top")

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
      { label = "U1", col = 1, w = 24 },
      { label = "V1", col = 2, w = 24 },
      { label = "θ1", col = 3, w = 24 },
      { label = "U2", col = 4, w = 24 },
      { label = "V2", col = 5, w = 24 },
      { label = "θ2", col = 6, w = 24 }
    }
    local bottomCols = {
      { label = "θ1", col = 7, w = 45 },
      { label = "θ2", col = 8, w = 45 },
      { label = "L", col = 9, w = 45 },
      { label = "E", col = 10, w = 45 },
      { label = "A", col = 11, w = 45 },
      { label = "I", col = 12, w = 45 }
    }

    gc:clipRect("set", x, y + 50, w, h - 50)
    local topY = y + 50 - scrollPx
    vigaBarra_drawMcSection(gc, x, topY, "Elementos (U1-V1-θ1-U2-V2-θ2):", topCols, state.nElem, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
    
    local topTableH = 14 + 18 + state.nElem * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    vigaBarra_drawMcSection(gc, x, bottomY, "Geometria (θ1-θ2-L-E-A-I):", bottomCols, state.nElem, state.tab1SelRow, state.tab1SelCol, state.tab1EditText, getCellValue)
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
      if col <= 6 then
        if row < state.nElem then
          row = row + 1
        else
          col = 7
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
      end
    elseif key == keys.right then
      if col < 12 then
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
      state.message = "Edicao cancelada."
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
      if state.nDof < 36 then
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
    local K, _ = assembleK(state)
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
      if col == 2 then return el.py0
      elseif col == 3 then return el.pyL
      elseif col == 4 then return el.py or ""
      end
    end
    return nil
  end

  local function commitForceCell()
    if state.forceSelRow == nil or state.forceSelCol == nil then return false end
    if state.forceEditText == nil then return true end

    local text = trim(state.forceEditText)
    local row = state.forceSelRow
    local col = state.forceSelCol

    if col == 1 then
      text = text:gsub(",", ".")
      local val = tonumber(text)
      if text == "" then state.forces[row] = 0 else state.forces[row] = val or 0 end
    elseif col == 2 or col == 3 then
      local el = state.elems[row]
      if el then
        text = text:gsub(",", ".")
        local val = tonumber(text)
        local component = (col == 2) and "py0" or "pyL"
        if text == "" then el[component] = 0 else el[component] = val or 0 end
      end
    elseif col == 4 then
      local el = state.elems[row]
      if el then
        el.py = text
      end
    end

    state.forceEditText = nil
    state.message = "Celula atualizada."
    saveState(state)
    return true
  end

  local function ensureForceSelectionVisible(h)
    local cellTop = 0
    if state.forceSelCol == 1 then
      cellTop = 50 + 14 + 18 + (state.forceSelRow - 1) * 18
    else
      local topTableH = 14 + 18 + state.nDof * 18
      cellTop = 50 + topTableH + 8 + 14 + 18 + (state.forceSelRow - 1) * 18
    end
    local cellBottom = cellTop + 18
    local scroll = state.forceScrollPx or 0
    if cellTop - scroll < 50 then
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
    gc:drawString("Edite forças nodais (F1-Fn) e carga distribuida p(x) nos elementos", x, y + 14, "top")
    gc:setColorRGB(30, 90, 180)
    gc:drawString(state.message or "", x, y + 33, "top")

    local scrollPx = state.forceScrollPx or 0
    local topCols = {
      { label = "Força nodal (P)", col = 1, w = 120 }
    }
    local bottomCols = {
      { label = "p0", col = 2, w = 40 },
      { label = "pL", col = 3, w = 40 },
      { label = "p(x)", col = 4, w = 80 }
    }

    local topY = y + 50 - scrollPx
    vigaBarra_drawMcSection(gc, x, topY, "Forças Nodais F (U):", topCols, state.nDof, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
    
    local topTableH = 14 + 18 + state.nDof * 18
    local bottomY = y + 50 + topTableH + 8 - scrollPx
    vigaBarra_drawMcSection(gc, x, bottomY, "Cargas Distribuidas nos Elementos:", bottomCols, state.nElem, state.forceSelRow, state.forceSelCol, state.forceEditText, getForceCellValue)
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
    local col = state.forceSelCol
    local allowed = false
    if col == 4 then
      -- Accept standard expression characters plus TI-Nspire calculator multiply symbols:
      -- · (U+00B7 middle dot, UTF-8: \xC2\xB7), × (U+00D7, UTF-8: \xC3\x97), ⋅ (U+22C5, UTF-8: \xE2\x8B\x85)
      allowed = ch:match("[%w%+%-%*/%^%(%)%s%.%,]") ~= nil
             or ch == "\xC2\xB7"
             or ch == "\xC3\x97"
             or ch == "\xE2\x8B\x85"
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
      state.message = "Edicao cancelada."
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
      if option ~= 5 then
        table.insert(steps, { type = "string", value = "Sistema global:\n[K]{U} = {F}\n\nMatriz de rigidez global [K] (axial em EA/L, translacional em EI/L^3, misto em EI/L^2, rotacional em EI/L):" })
        local K, _ = assembleK(state)
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças {F} (forças em P, p*L; momentos em P*L, p*L^2):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução automática indisponível: " .. err })
      end
    end

    if #steps == 0 then
      if option == 1 then
        local K, _ = assembleK(state)
        table.insert(steps, { type = "string", value = "Matriz de rigidez global [K] (axial em EA/L, translacional em EI/L^3, misto em EI/L^2, rotacional em EI/L):" })
        table.insert(steps, { type = "matrix", value = Matrix.toNumericFull(K) })
        table.insert(steps, { type = "string", value = "Vetor de forças globais {F} (forças em P, p*L; momentos em P*L, p*L^2):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
        table.insert(steps, { type = "string", value = "Resolução dos Deslocamentos U (axial em PL/EA, pL^2/EA; translacional em PL^3/EI, pL^4/EI; rotação em PL^2/EI, pL^3/EI):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u) })
        local lines = buildDefOptionLines(state, 1)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      elseif option == 5 then
        -- Detailed element force vector step-by-step sequential storage
        for e = 1, state.nElem do
          local el = state.elems[e]
          local L = el.L or 1
          local py0 = el.py0 or 0
          local pyL = el.pyL or 0
          local customPy = el.py and el.py:gsub("%s+", "") ~= ""
          local hasPy = customPy or (math.abs(py0) > 1e-9 or math.abs(pyL) > 1e-9)

          if hasPy then
            local th1 = el.th1 or el.theta or 0
            local th2 = el.th2 or el.theta or 0
            local Le_val = fmtCell(L) .. "L"
            if L == 1 then Le_val = "L" end

            local elIntro = {
              "--- Elemento " .. e .. " ---",
              "Le = " .. fmtCell(L) .. "L",
              "theta1 = " .. th1 .. "deg ; theta2 = " .. th2 .. "deg"
            }
            if customPy then
              table.insert(elIntro, "p(x) = " .. el.py)
            else
              if math.abs(py0 - pyL) < 1e-9 then
                table.insert(elIntro, "p(x) = " .. fmtCell(py0) .. "p (uniforme)")
              else
                local val0Str = fmtCell(py0) .. "p"
                local valLStr = fmtCell(pyL) .. "p"
                local p2Val = pyL - py0
                local p2Str = fmtCell(p2Val) .. "p"
                local funcStr = ""
                if math.abs(py0) < 1e-9 then
                  funcStr = p2Str .. " * (x/Le)"
                elseif math.abs(p2Val) < 1e-9 then
                  funcStr = val0Str
                else
                  funcStr = val0Str .. " + " .. p2Str .. " * (x/Le)"
                  funcStr = funcStr:gsub("%+ %-", "- ")
                end
                table.insert(elIntro, "p(x) = " .. funcStr)
              end
            end
            table.insert(steps, { type = "string", value = table.concat(elIntro, "\n") })

            -- Integration details if custom load
            if customPy then
              local pyFn = parseExpr(el.py)
              local localPowers = { 1, 1, 2, 1, 1, 2 }
              local pyScale, plScale = getExpressionScalingPowers(el.py)
              localPowers[2] = pyScale + plScale + 1
              localPowers[3] = pyScale + plScale + 2
              localPowers[5] = pyScale + plScale + 1
              localPowers[6] = pyScale + plScale + 2

              local f = { 0, 0, 0, 0, 0, 0 }
              if pyFn then
                f[2] = integrateExpression(pyFn, 2, L)
                f[3] = integrateExpression(pyFn, 3, L)
                f[5] = integrateExpression(pyFn, 5, L)
                f[6] = integrateExpression(pyFn, 6, L)
              end

              local integLines = {}
              for _, j in ipairs({ 2, 3, 5, 6 }) do
                if math.abs(f[j]) > 1e-12 then
                  local p_load_str, niStr, expandedStr = getCustomIntegrationSteps(el, j)
                  table.insert(integLines, "F_" .. j .. "^(" .. e .. ") = ∫_0^(" .. Le_val .. ") " .. p_load_str .. " * N" .. j .. " dx")
                  table.insert(integLines, "  = ∫_0^(" .. Le_val .. ") (" .. p_load_str .. ") * " .. niStr .. " dx")
                  table.insert(integLines, "  = ∫_0^(" .. Le_val .. ") (" .. expandedStr .. ") dx")
                  local formattedResult = formatSymbolicValue(f[j], localPowers[j])
                  table.insert(integLines, "  = " .. formattedResult)
                  table.insert(integLines, "")
                end
              end
              if #integLines > 0 then
                table.insert(steps, { type = "string", value = table.concat(integLines, "\n") })
              end
            end

            -- Local vector f^(e)
            local f = { 0, 0, 0, 0, 0, 0 }
            if customPy then
              local pyFn = parseExpr(el.py)
              if pyFn then
                f[2] = integrateExpression(pyFn, 2, L)
                f[3] = integrateExpression(pyFn, 3, L)
                f[5] = integrateExpression(pyFn, 5, L)
                f[6] = integrateExpression(pyFn, 6, L)
              end
            else
              f[2] = L * (7 * py0 + 3 * pyL) / 20
              f[3] = (L * L) * (3 * py0 + 2 * pyL) / 60
              f[5] = L * (3 * py0 + 7 * pyL) / 20
              f[6] = -(L * L) * (2 * py0 + 3 * pyL) / 60
            end

            local f_formulas = { "0", "0", "0", "0", "0", "0" }
            if not customPy then
              local val0Str = fmtCell(py0) .. "p"
              local valLStr = fmtCell(pyL) .. "p"
              if math.abs(py0 - pyL) < 1e-9 then
                f_formulas[2] = "(" .. val0Str .. ")*(" .. Le_val .. ")/2"
                f_formulas[3] = "(" .. val0Str .. ")*(" .. Le_val .. ")^2/12"
                f_formulas[5] = "(" .. val0Str .. ")*(" .. Le_val .. ")/2"
                f_formulas[6] = "-(" .. val0Str .. ")*(" .. Le_val .. ")^2/12"
              elseif math.abs(py0) < 1e-9 then
                f_formulas[2] = "3*(" .. valLStr .. ")*(" .. Le_val .. ")/20"
                f_formulas[3] = "(" .. valLStr .. ")*(" .. Le_val .. ")^2/30"
                f_formulas[5] = "7*(" .. valLStr .. ")*(" .. Le_val .. ")/20"
                f_formulas[6] = "-(" .. valLStr .. ")*(" .. Le_val .. ")^2/20"
              elseif math.abs(pyL) < 1e-9 then
                f_formulas[2] = "7*(" .. val0Str .. ")*(" .. Le_val .. ")/20"
                f_formulas[3] = "(" .. val0Str .. ")*(" .. Le_val .. ")^2/20"
                f_formulas[5] = "3*(" .. val0Str .. ")*(" .. Le_val .. ")/20"
                f_formulas[6] = "-(" .. val0Str .. ")*(" .. Le_val .. ")^2/30"
              else
                f_formulas[2] = "(" .. Le_val .. ")*(7*(" .. val0Str .. ")+3*(" .. valLStr .. "))/20"
                f_formulas[3] = "(" .. Le_val .. ")^2*(3*(" .. val0Str .. ")+2*(" .. valLStr .. "))/60"
                f_formulas[5] = "(" .. Le_val .. ")*(3*(" .. val0Str .. ")+7*(" .. valLStr .. "))/20"
                f_formulas[6] = "-(" .. Le_val .. ")^2*(2*(" .. val0Str .. ")+3*(" .. valLStr .. "))/60"
              end
            else
              f_formulas[2] = "F_2^(" .. e .. ")"
              f_formulas[3] = "F_3^(" .. e .. ")"
              f_formulas[5] = "F_5^(" .. e .. ")"
              f_formulas[6] = "F_6^(" .. e .. ")"
            end

            table.insert(steps, { type = "string", value = "{f}^(" .. e .. ") local formula:\n" .. "{ " .. table.concat(f_formulas, " ; ") .. " }^T\n\n{f}^(" .. e .. ") local (forças em p*L, momentos em p*L^2):" })
            table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(f) })

            -- Global forces vector F^(e)
            local c1 = cosd(th1)
            local s1 = sind(th1)
            local c2 = cosd(th2)
            local s2 = sind(th2)
            local R = {
              { c1,  s1, 0, 0,   0,  0 },
              { -s1, c1, 0, 0,   0,  0 },
              { 0,   0,  1, 0,   0,  0 },
              { 0,   0,  0, c2,  s2, 0 },
              { 0,   0,  0, -s2, c2, 0 },
              { 0,   0,  0, 0,   0,  1 }
            }
            local Rt = matTranspose(R)
            local needsTransform = math.abs(th1) > 1e-9 or math.abs(th2) > 1e-9

            if needsTransform then
              table.insert(steps, { type = "string", value = "{F}^(" .. e .. ") = [R]^T x {f}^(" .. e .. "):\nMatriz de Transposição [R]^T:" })
              table.insert(steps, { type = "matrix", value = Rt })

              local localPowers = { 1, 1, 2, 1, 1, 2 }
              if el.py and el.py:gsub("%s+", "") ~= "" then
                local pyScale, plScale = getExpressionScalingPowers(el.py)
                localPowers[2] = pyScale + plScale + 1
                localPowers[3] = pyScale + plScale + 2
                localPowers[5] = pyScale + plScale + 1
                localPowers[6] = pyScale + plScale + 2
              end

              local fglobal = { 0, 0, 0, 0, 0, 0 }
              for i = 1, 6 do
                local expr = Expr.new()
                for j = 1, 6 do
                  local val = Rt[i][j] * f[j]
                  if math.abs(val) > 1e-12 then
                    local power = localPowers[j] or 1
                    local base = "p"
                    if power == 1 then base = "p*L"
                    elseif power > 1 then base = "p*L^" .. power
                    elseif power == -1 then base = "p/L"
                    elseif power < -1 then base = "p/L^" .. (-power)
                    end
                    Expr.addInplace(expr, val, base)
                  end
                end
                fglobal[i] = expr
              end

              table.insert(steps, { type = "string", value = "{F}^(" .. e .. ") global (forças em p*L, momentos em p*L^2):" })
              table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(fglobal) })
            else
              local localPowers = { 1, 1, 2, 1, 1, 2 }
              if el.py and el.py:gsub("%s+", "") ~= "" then
                local pyScale, plScale = getExpressionScalingPowers(el.py)
                localPowers[2] = pyScale + plScale + 1
                localPowers[3] = pyScale + plScale + 2
                localPowers[5] = pyScale + plScale + 1
                localPowers[6] = pyScale + plScale + 2
              end
              local fglobal = { 0, 0, 0, 0, 0, 0 }
              for i = 1, 6 do
                local expr = Expr.new()
                local power = localPowers[i] or 1
                local base = "p"
                if power == 1 then base = "p*L"
                elseif power > 1 then base = "p*L^" .. power
                elseif power == -1 then base = "p/L"
                elseif power < -1 then base = "p/L^" .. (-power)
                end
                Expr.addInplace(expr, f[i], base)
                fglobal[i] = expr
              end
              table.insert(steps, { type = "string", value = "{F}^(" .. e .. ") = {f}^(" .. e .. ") local (theta=0) (forças em p*L, momentos em p*L^2):" })
              table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(fglobal) })
            end
          end
        end

        -- Nodal point loads
        local hasPointLoads = false
        for i = 1, state.nDof do
          if math.abs(state.forces[i] or 0) > 1e-9 then hasPointLoads = true break end
        end
        if hasPointLoads then
          local pLines = { "Forças nodais (P):" }
          for i = 1, state.nDof do
            local ff = state.forces[i] or 0
            if math.abs(ff) > 1e-9 then
              table.insert(pLines, "F_" .. i .. " = " .. fmtCell(ff) .. "*P")
            end
          end
          table.insert(steps, { type = "string", value = table.concat(pLines, "\n") })
        end

        -- Final assembled force vector {F}
        local finalFeqs = { "{F} (montado):" }
        for i = 1, state.nDof do
          local fNodal = state.forces[i] or 0
          local sumTerms = {}
          if math.abs(fNodal) > 1e-9 then
            table.insert(sumTerms, fmtCell(fNodal) .. "*P")
          end

          for e = 1, state.nElem do
            local el = state.elems[e]
            local L = el.L or 1
            local py0 = el.py0 or 0
            local pyL = el.pyL or 0
            local customPy = el.py and el.py:gsub("%s+", "") ~= ""
            local hasPy = customPy or (math.abs(py0) > 1e-9 or math.abs(pyL) > 1e-9)

            if hasPy then
              for localIdx = 1, 6 do
                if el.dofs[localIdx] == i then
                  local f_elem = { 0, 0, 0, 0, 0, 0 }
                  if customPy then
                    local pyFn = parseExpr(el.py)
                    if pyFn then
                      f_elem[2] = integrateExpression(pyFn, 2, L)
                      f_elem[3] = integrateExpression(pyFn, 3, L)
                      f_elem[5] = integrateExpression(pyFn, 5, L)
                      f_elem[6] = integrateExpression(pyFn, 6, L)
                    end
                  else
                    f_elem[2] = L * (7 * py0 + 3 * pyL) / 20
                    f_elem[3] = (L * L) * (3 * py0 + 2 * pyL) / 60
                    f_elem[5] = L * (3 * py0 + 7 * pyL) / 20
                    f_elem[6] = -(L * L) * (2 * py0 + 3 * pyL) / 60
                  end

                  local localPowers = { 1, 1, 2, 1, 1, 2 }
                  if el.py and el.py:gsub("%s+", "") ~= "" then
                    local pyScale, plScale = getExpressionScalingPowers(el.py)
                    localPowers[2] = pyScale + plScale + 1
                    localPowers[3] = pyScale + plScale + 2
                    localPowers[5] = pyScale + plScale + 1
                    localPowers[6] = pyScale + plScale + 2
                  end

                  local th1 = el.th1 or el.theta or 0
                  local th2 = el.th2 or el.theta or 0
                  local c1 = cosd(th1)
                  local s1 = sind(th1)
                  local c2 = cosd(th2)
                  local s2 = sind(th2)
                  local R = {
                    { c1,  s1, 0, 0,   0,  0 },
                    { -s1, c1, 0, 0,   0,  0 },
                    { 0,   0,  1, 0,   0,  0 },
                    { 0,   0,  0, c2,  s2, 0 },
                    { 0,   0,  0, -s2, c2, 0 },
                    { 0,   0,  0, 0,   0,  1 }
                  }
                  local Rt = matTranspose(R)

                  local expr = Expr.new()
                  for k = 1, 6 do
                    local val = Rt[localIdx][k] * f_elem[k]
                    if math.abs(val) > 1e-12 then
                      local power = localPowers[k] or 1
                      local base = "p"
                      if power == 1 then base = "p*L"
                      elseif power > 1 then base = "p*L^" .. power
                      elseif power == -1 then base = "p/L"
                      elseif power < -1 then base = "p/L^" .. (-power)
                      end
                      Expr.addInplace(expr, val, base)
                    end
                  end

                  if not Expr.isZero(expr) then
                    table.insert(sumTerms, Expr.toString(expr))
                  else
                    table.insert(sumTerms, "0")
                  end
                end
              end
            end
          end

          local sumStr = ""
          if #sumTerms == 0 then
            sumStr = "0"
          else
            sumStr = table.concat(sumTerms, " + ")
            sumStr = sumStr:gsub(" %+ %-", " - ")
            sumStr = sumStr:gsub("^ %+ ", "")
          end
          table.insert(finalFeqs, "  F" .. i .. " = " .. sumStr .. " = " .. Expr.toString(F[i]))
        end
        table.insert(steps, { type = "string", value = table.concat(finalFeqs, "\n") .. "\n\nVetor global {F} (forças em P, p*L; momentos em P*L, p*L^2):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(F) })
      elseif option == 2 then
        table.insert(steps, { type = "string", value = "Esforço normal e tensão por elemento:" })
        for e = 1, state.nElem do
          local el = state.elems[e]
          local th1 = el.th1 or el.theta or 0
          local th2 = el.th2 or el.theta or 0
          local c1 = cosd(th1)
          local s1 = sind(th1)
          local c2 = cosd(th2)
          local s2 = sind(th2)
          local L = el.L or 1
          local dofs = el.dofs

          table.insert(steps, { type = "string", value = "--- Elemento " .. e .. " ---\nTransformação de coordenadas {u} = [R]{U}:\nMatriz de Transposição [R] (adimensional):" })

          local R_elem = {
            { c1, s1, 0, 0 },
            { 0, 0, c2, s2 }
          }
          local U_elem = {}
          U_elem[1] = (dofs[1] and dofs[1] > 0 and dofs[1] <= #u) and u[dofs[1]] or Expr.new()
          U_elem[2] = (dofs[2] and dofs[2] > 0 and dofs[2] <= #u) and u[dofs[2]] or Expr.new()
          U_elem[3] = (dofs[4] and dofs[4] > 0 and dofs[4] <= #u) and u[dofs[4]] or Expr.new()
          U_elem[4] = (dofs[5] and dofs[5] > 0 and dofs[5] <= #u) and u[dofs[5]] or Expr.new()

          local u_elem = {
            c1 * (U_elem[1] or 0) + s1 * (U_elem[2] or 0),
            c2 * (U_elem[3] or 0) + s2 * (U_elem[4] or 0)
          }

          table.insert(steps, { type = "matrix", value = R_elem })
          table.insert(steps, { type = "string", value = "Vetor de deslocamentos globais do elemento {U} (axial em PL/EA, pL^2/EA; translacional em PL^3/EI, pL^4/EI):" })
          table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(U_elem) })
          table.insert(steps, { type = "string", value = "Vetor de deslocamentos locais do elemento {u} (axial em PL/EA, pL^2/EA; translacional em PL^3/EI, pL^4/EI):" })
          table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(u_elem) })
        end
        local lines = buildDefOptionLines(state, 2)
        table.insert(steps, { type = "string", value = table.concat(lines, "\n") })
      elseif option == 3 then
        local e = state.defElem or 1
        if e < 1 then e = 1 end
        if e > state.nElem then e = state.nElem end
        local el = state.elems[e]
        local th1 = el.th1 or el.theta or 0
        local th2 = el.th2 or el.theta or 0
        local c1 = cosd(th1)
        local s1 = sind(th1)
        local c2 = cosd(th2)
        local s2 = sind(th2)
        local L = el.L or 1
        local dofs = el.dofs

        table.insert(steps, { type = "string", value = "--- Elemento " .. e .. " ---\nTransformação de coordenadas {u} = [R]{U}:\nMatriz de Transposição [R] (adimensional):" })

        local R_elem = {
          { c1, s1, 0, 0 },
          { 0, 0, c2, s2 }
        }
        local U_elem = {}
        U_elem[1] = (dofs[1] and dofs[1] > 0 and dofs[1] <= #u) and u[dofs[1]] or Expr.new()
        U_elem[2] = (dofs[2] and dofs[2] > 0 and dofs[2] <= #u) and u[dofs[2]] or Expr.new()
        U_elem[3] = (dofs[4] and dofs[4] > 0 and dofs[4] <= #u) and u[dofs[4]] or Expr.new()
        U_elem[4] = (dofs[5] and dofs[5] > 0 and dofs[5] <= #u) and u[dofs[5]] or Expr.new()

        local u_elem = {
          c1 * (U_elem[1] or 0) + s1 * (U_elem[2] or 0),
          c2 * (U_elem[3] or 0) + s2 * (U_elem[4] or 0)
        }

        table.insert(steps, { type = "matrix", value = R_elem })
        table.insert(steps, { type = "string", value = "Vetor de deslocamentos globais do elemento {U} (axial em PL/EA, pL^2/EA; translacional em PL^3/EI, pL^4/EI):" })
        table.insert(steps, { type = "matrix", value = vectorToNumericMatrix(U_elem) })
        table.insert(steps, { type = "string", value = "Vetor de deslocamentos locais do elemento {u} (axial em PL/EA, pL^2/EA; translacional em PL^3/EI, pL^4/EI):" })
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

    -- 1. Step-by-step resolution of K's (vb_ks)
    local ksLines = buildKsLines(state)
    var.store("vb_ks", table.concat(ksLines, "\n"))

    -- 2. Global stiffness matrix K (vb_kmatrix) as a math matrix (numeric)
    local K, _ = assembleK(state)
    local K_num = Matrix.toNumericFull(K)
    var.store("vb_kmatrix", K_num)

    -- 3. Options in Def tab
    local optionNames = { "vb_deslg", "vb_esfn", "vb_desll", "vb_zcr", "vb_vetorf" }
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

    -- 4. Mega-string: full resolution in one variable (vb_resolucao)
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
    table.insert(totalLines, "  >> Ver variavel: vb_kmatrix")
    table.insert(totalLines, "")
    table.insert(totalLines, "=== FORCAS APLICADAS ===")
    for _, line in ipairs(buildForceTableLines(state)) do
      table.insert(totalLines, line)
    end
    table.insert(totalLines, "")
    table.insert(totalLines, "=== RESOLUCAO (DEF) ===")
    local defOptions = {
      "Deslocamentos globais (U)",
      "Esforco normal (N) e Tensao (s)",
      "Deslocamento axial local u(x)",
      "Zona critica",
      "Vetor de forcas {F}"
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
    var.store("vb_resolucao", table.concat(totalLines, "\n"))
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
          if val and val >= 1 and val <= state.nElem then
            state.defElem = math.floor(val)
          end
        elseif state.defOption == 7 then
          if val and val >= 0 and val <= 1 then
            state.defX = val
          end
        elseif state.defOption == 9 then
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
      local opt = state.defOption or 1
      if opt == 1 then
        return false
      end
      state.defOption = opt - 1
      if state.defOption >= 1 and state.defOption <= 5 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.down then
      local opt = state.defOption or 1
      if opt == 9 then
        return false
      end
      state.defOption = opt + 1
      if state.defOption >= 1 and state.defOption <= 5 then
        state.defActiveOption = state.defOption
      end
      saveState(state)
      return true
    elseif key == keys.left then
      if state.defOption == 6 then
        state.defElem = math.max(1, (state.defElem or 1) - 1)
        saveState(state)
        return true
      elseif state.defOption == 7 then
        state.defX = math.max(0, math.floor(((state.defX or 0.5) - 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      elseif state.defOption == 9 then
        state.subICoef = math.max(0.1, math.floor(((state.subICoef or 2) - 0.5) * 10 + 0.5) / 10)
        saveState(state)
        return true
      end
    elseif key == keys.right then
      if state.defOption == 6 then
        state.defElem = math.min(state.nElem, (state.defElem or 1) + 1)
        saveState(state)
        return true
      elseif state.defOption == 7 then
        state.defX = math.min(1, math.floor(((state.defX or 0.5) + 0.05) * 100 + 0.5) / 100)
        saveState(state)
        return true
      elseif state.defOption == 9 then
        state.subICoef = math.floor(((state.subICoef or 2) + 0.5) * 10 + 0.5) / 10
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
        state.defEditText = tostring(state.defElem or 1)
        return true
      elseif opt == 7 then
        state.defX = state.defX or 0.5
        state.defEditText = tostring(state.defX)
        return true
      elseif opt == 8 then
        state.useSubstitutedI = not state.useSubstitutedI
        saveState(state)
        return true
      elseif opt == 9 then
        state.subICoef = state.subICoef or 2
        state.defEditText = tostring(state.subICoef)
        return true
      end
    end
    return false
  end
  function defTab:charIn(ch, app)
    local opt = state.defOption or 1
    if opt == 6 or opt == 7 or opt == 9 then
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
    if opt == 6 or opt == 7 or opt == 9 then
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
    local K, _ = assembleK(state)
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
      "Deslocamentos globais (U)",
      "Esforço normal (N) e Tensão (σ)",
      "Deslocamento axial local u(x)",
      "Zona crítica",
      "Vetor de forças {F}"
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

  local app = ui.newApp("VigaBarra2D", { mcTab, ksTab, kTab, fTab, defTab, copiaTab })
  ui.bind(app)

  -- Automatically store/populate variables on startup
  if storeGlobalVariables then
    storeGlobalVariables(state)
  end
end

if not _G.__TI_MAINMENU__ then
  VigaBarra2D.start()
end

return VigaBarra2D
