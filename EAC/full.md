# Exercício 1

## Enunciado

Considere a treliça (barra 2D) representada na Figura 1, com massa volúmica $\rho$. Utilizando o menor número de elementos finitos possível, determine:

a) O deslocamento vertical e horizontal no ponto D.
b) O esforço normal na barra DB.
c) As frequências naturais e os respetivos modos de vibração. Represente os modos de vibração.

---

## Descrição da Estrutura

A estrutura consiste em uma treliça com 3 barras concorrentes no nó $D$:
- **Nó A** (apoio fixo): $(0, 0)$
- **Nó B** (apoio fixo): $(L, 0)$
- **Nó C** (apoio fixo na parede): $(L, L)$
- **Nó D** (nó livre): $(0, L)$

### Propriedades das Barras:
- **Barra 1 (AD)**: Comprimento $L^{(1)} = L$, rigidez $E^{(1)}A^{(1)} = EA$
- **Barra 2 (BD)**: Comprimento $L^{(2)} = \sqrt{L^2 + L^2} = 1{,}414L$, rigidez $E^{(2)}A^{(2)} = 2EA$
- **Barra 3 (CD)**: Comprimento $L^{(3)} = L$, rigidez $E^{(3)}A^{(3)} = 3EA$

### Graus de Liberdade e Cargas no Nó D:
- $u_1$: Deslocamento horizontal no nó D (positivo para a direita)
- $u_2$: Deslocamento vertical no nó D (positivo para cima)
- Sistema com $2 \text{ g.l.} \Rightarrow [K]_{2\times 2}$
- Carga aplicada no nó D: Força horizontal $2P$ (para a direita), força vertical $P$ (para baixo, portanto $-P$).

---

## Tabela de Conectividade e Propriedades

| m.e | 1 | 2 | 3 | 4 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 | $90^\circ$ | $L$ |
| **(2)** | 1 | 2 | - | - | $-45^\circ$ | $1{,}414L$ |
| **(3)** | 1 | 2 | - | - | $0^\circ$ | $L$ |

---

## a) Deslocamentos

### Matriz de Rigidez Global $[K]$:

$$K_{11} = K_{33}^{(1)} + K_{11}^{(2)} + K_{11}^{(3)} = \frac{EA}{L} \cos^2 90^\circ + \frac{2EA}{1{,}414L} \cos^2(-45^\circ) + \frac{3EA}{L} \cos^2 0^\circ$$
$$K_{11} = \frac{EA}{L} \left( 0 + \frac{2}{1{,}414} \times 0{,}5 + 3 \times 1 \right) = \frac{EA}{L} \times 3{,}707$$

$$K_{12} = K_{34}^{(1)} + K_{12}^{(2)} + K_{12}^{(3)} = \frac{EA}{L} \sin 90^\circ \cos 90^\circ + \frac{2EA}{1{,}414L} \sin(-45^\circ) \cos(-45^\circ) + \frac{3EA}{L} \sin 0^\circ \cos 0^\circ$$
$$K_{12} = \frac{EA}{L} \left( 0 + \frac{2}{1{,}414} \times (-0{,}5) + 0 \right) = \frac{EA}{L} \times (-0{,}707)$$

$$K_{21} = K_{12} = \frac{EA}{L} \times (-0{,}707)$$

$$K_{22} = K_{44}^{(1)} + K_{22}^{(2)} + K_{22}^{(3)} = \frac{EA}{L} \sin^2 90^\circ + \frac{2EA}{1{,}414L} \sin^2(-45^\circ) + \frac{3EA}{L} \sin^2 0^\circ$$
$$K_{22} = \frac{EA}{L} \left( 1 + \frac{2}{1{,}414} \times 0{,}5 + 0 \right) = \frac{EA}{L} \times 1{,}707$$

Logo:
$$[K] = \frac{EA}{L} \begin{bmatrix} 3{,}707 & -0{,}707 \\ -0{,}707 & 1{,}707 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

$$\frac{EA}{L} \begin{bmatrix} 3{,}707 & -0{,}707 \\ -0{,}707 & 1{,}707 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 2P \\ -P \end{bmatrix}$$

$$\Rightarrow \begin{cases} 3{,}707 u_1 - 0{,}707 u_2 = 2 \frac{PL}{EA} \\ -0{,}707 u_1 + 1{,}707 u_2 = - \frac{PL}{EA} \end{cases}$$

### Resolução:
$$\begin{cases} u_1 = +0{,}4695 \frac{PL}{EA} \\ u_2 = -0{,}3934 \frac{PL}{EA} \end{cases}$$

---

## b) Esforço Normal (Barra 2)

Relações constitutivas e cinemáticas:
$$\sigma = E \cdot \varepsilon$$
$$\varepsilon = \frac{\delta}{L} \Rightarrow \sigma = \frac{E}{L} (u_{2,\text{local}} - u_{1,\text{local}})$$
$$\delta = u_{2,\text{local}} - u_{1,\text{local}}$$

Transformação de coordenadas:
$$\{u\}_{\text{local}} = [R]\{u\}_{\text{global}}$$
$$\begin{bmatrix} u_{1,\text{local}} \\ u_{2,\text{local}} \end{bmatrix} = \begin{bmatrix} \cos(-45^\circ) & \sin(-45^\circ) & 0 & 0 \\ 0 & 0 & \cos(-45^\circ) & \sin(-45^\circ) \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \\ 0 \\ 0 \end{bmatrix}$$

$$\Rightarrow \begin{cases} u_{1,\text{local}} = U_1 \cos(-45^\circ) + U_2 \sin(-45^\circ) \\ u_{2,\text{local}} = 0 \end{cases}$$

Substituindo os valores dos deslocamentos globais:
$$u_{1,\text{local}} = 0{,}4695 \frac{PL}{EA} \cos(-45^\circ) - 0{,}3934 \frac{PL}{EA} \sin(-45^\circ) = 0{,}607 \frac{PL}{EA}$$
$$u_{2,\text{local}} = 0$$

Tensão normal na Barra 2 (com módulo de elasticidade $2E$ e comprimento $1{,}414L$):
$$\sigma = \frac{2E}{1{,}414L} \left( 0 - 0{,}607 \frac{PL}{EA} \right) = -0{,}8586 \frac{P}{A}$$

Esforço Normal ($N$):
$$\sigma_N = \frac{N}{A} \Rightarrow N = \sigma_N \times A = -0{,}8586 P \quad (\text{Compressão})$$

---

## c) Modos de Vibração

Equação característica:
$$|[K] - \omega^2 [M]| = 0$$

### Matriz de Massa Global $[M]$ (Consistente):
Fórmula para termo diagonal de barra: $\frac{\rho A L}{3} = \frac{140 \rho A L}{420}$

$$M_{11} = M_{33}^{(1)} + M_{11}^{(2)} + M_{11}^{(3)} = \frac{\rho AL}{420} \times 140 \cos^2 90^\circ + \frac{\rho A (1{,}414L)}{420} \times 140 \cos^2(-45^\circ) + \frac{\rho AL}{420} \times 140 \cos^2 0^\circ$$
$$M_{11} = \frac{\rho AL}{420} (0 + 98{,}98 + 140) = \rho AL \times 0{,}569$$

$$M_{12} = M_{34}^{(1)} + M_{12}^{(2)} + M_{12}^{(3)} = \frac{\rho AL}{420} \times 140 \sin 90^\circ \cos 90^\circ + \frac{\rho A (1{,}414L)}{420} \times 140 \sin(-45^\circ) \cos(-45^\circ) + \frac{\rho AL}{420} \times 140 \sin 0^\circ \cos 0^\circ$$
$$M_{12} = \frac{\rho AL}{420} (0 - 98{,}98 + 0) = \rho AL \times (-0{,}236)$$

$$M_{22} = M_{44}^{(1)} + M_{22}^{(2)} + M_{22}^{(3)} = \frac{\rho AL}{420} \times 140 \sin^2 90^\circ + \frac{\rho A (1{,}414L)}{420} \times 140 \sin^2(-45^\circ) + \frac{\rho AL}{420} \times 140 \sin^2 0^\circ$$
$$M_{22} = \frac{\rho AL}{420} (140 + 98{,}98 + 0) = \rho AL \times 0{,}569$$

Logo:
$$[M] = \rho A L \begin{bmatrix} 0{,}569 & -0{,}236 \\ -0{,}236 & 0{,}569 \end{bmatrix}$$

### Equação de Autovalores:
$$\left| \frac{EA}{L} \begin{bmatrix} 3{,}707 & -0{,}707 \\ -0{,}707 & 1{,}707 \end{bmatrix} - \omega^2 \rho AL \begin{bmatrix} 0{,}569 & -0{,}236 \\ -0{,}236 & 0{,}569 \end{bmatrix} \right| = 0$$

Definindo $\lambda = \frac{\omega^2 \rho L^2}{E}$:
$$\left| \begin{bmatrix} 3{,}707 & -0{,}707 \\ -0{,}707 & 1{,}707 \end{bmatrix} - \lambda \begin{bmatrix} 0{,}569 & -0{,}236 \\ -0{,}236 & 0{,}569 \end{bmatrix} \right| = 0$$
$$\Rightarrow \left| \begin{bmatrix} 3{,}707 - 0{,}569\lambda & -0{,}707 + 0{,}236\lambda \\ -0{,}707 + 0{,}236\lambda & 1{,}707 - 0{,}569\lambda \end{bmatrix} \right| = 0$$
$$\Rightarrow (3{,}707 - 0{,}569\lambda)(1{,}707 - 0{,}569\lambda) - (-0{,}707 + 0{,}236\lambda)^2 = 0$$
$$\Rightarrow 0{,}268\lambda^2 - 2{,}747\lambda + 5{,}828 = 0$$

Resolvendo a equação quadrática:
$$\lambda = \frac{2{,}747 \pm \sqrt{(-2{,}747)^2 - 4 \times 0{,}268 \times 5{,}828}}{2 \times 0{,}268}$$
$$\Rightarrow \lambda_1 = 3 \quad \land \quad \lambda_2 = 7{,}25$$

Frequências naturais:
$$\omega_1 = \sqrt{\frac{\lambda_1 E}{\rho L^2}} = \sqrt{\frac{3E}{\rho L^2}} = \frac{1{,}73}{L} \sqrt{\frac{E}{\rho}}$$
$$\omega_2 = \sqrt{\frac{7{,}24 E}{\rho L^2}} = \frac{2{,}69}{L} \sqrt{\frac{E}{\rho}}$$

### Modos de Vibração (Autovetores):

#### Associado a $\lambda_1, \omega_1$:
$$\begin{bmatrix} 3{,}707 - 3(0{,}569) & -0{,}707 + 0{,}236(3) \\ -0{,}707 + 0{,}236(3) & 1{,}707 - 0{,}569(3) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} 2u_1 + 0{,}001u_2 = 0 \\ 0{,}001u_1 + 0u_2 = 0 \end{cases} \Rightarrow \begin{cases} u_1 = 0 \\ u_2 = \text{qualquer} \end{cases} \Rightarrow \text{Modo 1:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix}$$
*(Deslocamento puramente vertical no nó D)*

#### Associado a $\lambda_2, \omega_2$:
$$\begin{bmatrix} 3{,}707 - 7{,}24(0{,}569) & -0{,}707 + 0{,}236(7{,}24) \\ -0{,}707 + 0{,}236(7{,}24) & 1{,}707 - 0{,}569(7{,}24) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} -0{,}413 u_1 + 1 u_2 = 0 \\ 1 u_1 - 2{,}41 u_2 = 0 \end{cases} \Rightarrow u_1 = 2{,}43 u_2 \land u_1 = 2{,}41 u_2 \Rightarrow u_1 \approx 2{,}42 u_2 \Rightarrow \text{Modo 2:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 2{,}43 \\ 1 \end{bmatrix}$$
*(Deslocamento acoplado horizontal-vertical no nó D)*


# Exercício 2

## Enunciado

Considere a treliça (barra 2D) representada na Figura 2, com massa volúmica $\rho$, módulo de Young E, e secção transversal com área A. Utilizando o menor número de elementos finitos possível, determine:

a) O deslocamento vertical e horizontal no ponto D;
b) A tensão axial na barra DC;
c) As frequências naturais e os respetivos modos de vibração. Represente os modos de vibração.

---

## Descrição da Estrutura

A estrutura consiste em uma treliça com 3 barras concorrentes no nó $D$:
- **Nó A** (apoio fixo): $(-L/2, 0)$
- **Nó B** (apoio fixo): $(0, 0)$
- **Nó C** (apoio fixo): $(L/2, 0)$
- **Nó D** (nó livre): $(0, L)$

### Propriedades das Barras:
- **Barra 1 (AD)**: Comprimento $L^{(1)} = \sqrt{(L/2)^2 + L^2} = 1{,}118L$, rigidez $E^{(1)}A^{(1)} = EA$
- **Barra 2 (BD)**: Comprimento $L^{(2)} = L$, rigidez $E^{(2)}A^{(2)} = EA$
- **Barra 3 (CD)**: Comprimento $L^{(3)} = 1{,}118L$, rigidez $E^{(3)}A^{(3)} = EA$

### Graus de Liberdade e Cargas no Nó D:
- $u_1$: Deslocamento horizontal no nó D (positivo para a direita)
- $u_2$: Deslocamento vertical no nó D (positivo para cima)
- Sistema com $2 \text{ g.l.} \Rightarrow [K]_{2\times 2}$
- Carga aplicada no nó D: Força horizontal $P$ (para a esquerda, portanto $-P$), força vertical $P$ (para baixo, portanto $-P$).

---

## Tabela de Conectividade e Propriedades

| m.e | 1 | 2 | 3 | 4 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 | $63{,}435^\circ$ | $1{,}118L$ |
| **(2)** | - | - | 1 | 2 | $90^\circ$ | $L$ |
| **(3)** | 1 | 2 | - | - | $-63{,}435^\circ$ | $1{,}118L$ |

---

## a) Deslocamentos

### Matriz de Rigidez Global $[K]$:

$$K_{11} = K_{33}^{(1)} + K_{33}^{(2)} + K_{11}^{(3)} = \frac{EA}{1{,}118L} \cos^2 63{,}435^\circ + \frac{EA}{L} \cos^2 90^\circ + \frac{EA}{1{,}118L} \cos^2(-63{,}435^\circ)$$
$$K_{11} = \frac{EA}{L} \left( \frac{0{,}2}{1{,}118} + 0 + \frac{0{,}2}{1{,}118} \right) = \frac{EA}{L} \times 0{,}35778$$

$$K_{12} = K_{34}^{(1)} + K_{34}^{(2)} + K_{12}^{(3)} = \frac{EA}{1{,}118L} \sin 63{,}435^\circ \cos 63{,}435^\circ + \frac{EA}{L} \sin 90^\circ \cos 90^\circ + \frac{EA}{1{,}118L} \sin(-63{,}435^\circ) \cos(-63{,}435^\circ)$$
$$K_{12} = \frac{EA}{L} \left( \frac{0{,}4}{1{,}118} + 0 - \frac{0{,}4}{1{,}118} \right) = 0$$

$$K_{21} = K_{12} = 0$$

$$K_{22} = K_{44}^{(1)} + K_{44}^{(2)} + K_{22}^{(3)} = \frac{EA}{1{,}118L} \sin^2 63{,}435^\circ + \frac{EA}{L} \sin^2 90^\circ + \frac{EA}{1{,}118L} \sin^2(-63{,}435^\circ)$$
$$K_{22} = \frac{EA}{L} \left( \frac{0{,}8}{1{,}118} + 1 + \frac{0{,}8}{1{,}118} \right) = \frac{EA}{L} \times 2{,}4311$$

Logo:
$$[K] = \frac{EA}{L} \begin{bmatrix} 0{,}35778 & 0 \\ 0 & 2{,}4311 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

$$\frac{EA}{L} \begin{bmatrix} 0{,}35778 & 0 \\ 0 & 2{,}4311 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} -P \\ -P \end{bmatrix}$$

$$\Rightarrow \begin{cases} 0{,}35778 \frac{EA}{L} u_1 = -P \\ 2{,}4311 \frac{EA}{L} u_2 = -P \end{cases}$$

### Resolução:
$$\begin{cases} u_1 = -2{,}79 \frac{PL}{EA} \\ u_2 = -0{,}411 \frac{PL}{EA} \end{cases}$$

---

## b) Tensão Axial na Barra CD

Relações constitutivas e cinemáticas:
$$\sigma = E \cdot \varepsilon$$
$$\varepsilon = \frac{\delta}{L} \Rightarrow \sigma = \frac{E}{L_3} (u_{2,\text{local}} - u_{1,\text{local}})$$
$$\delta = u_{2,\text{local}} - u_{1,\text{local}}$$
$$\theta = -63{,}435^\circ$$

Transformação de coordenadas para a Barra 3:
$$\begin{bmatrix} u_{1,\text{local}} \\ u_{2,\text{local}} \end{bmatrix} = \begin{bmatrix} \cos(-63{,}435^\circ) & \sin(-63{,}435^\circ) & 0 & 0 \\ 0 & 0 & \cos(-63{,}435^\circ) & \sin(-63{,}435^\circ) \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \\ 0 \\ 0 \end{bmatrix}$$

$$\Rightarrow \begin{cases} u_{1,\text{local}} = U_1 \cos(-63{,}435^\circ) + U_2 \sin(-63{,}435^\circ) \\ u_{2,\text{local}} = 0 \end{cases}$$

Substituindo os deslocamentos globais do nó D:
$$u_{1,\text{local}} = -2{,}79 \frac{PL}{EA} \cos(-63{,}435^\circ) - 0{,}411 \frac{PL}{EA} \sin(-63{,}435^\circ) = -0{,}88 \frac{PL}{EA}$$
$$u_{2,\text{local}} = 0$$

Tensão normal na Barra CD:
$$\sigma = \frac{E}{1{,}118L} \left( 0 - \left(-0{,}88 \frac{PL}{EA}\right) \right) = +0{,}787 \frac{P}{A} \quad (\text{Tração})$$

---

## c) Modos de Vibração

Equação característica:
$$|[K] - \omega^2 [M]| = 0$$

### Matriz de Massa Global $[M]$ (Consistente):

> [!WARNING]
> **Nota sobre erro de cálculo no manuscrito:** 
> O manuscrito original contém um erro de soma nos termos de massa global. Ele esqueceu de somar a contribuição da Barra 3 para $M_{11}$ e $M_{22}$. Abaixo são apresentados os cálculos como constam no papel (com o erro) e a versão corrigida.

#### Valores do Manuscrito (com erro):
- $M_{11} = \rho A L \times 0{,}075$ (deveria ser $0{,}149$)
- $M_{12} = 0$
- $M_{22} = \rho A L \times 0{,}634$ (deveria ser $0{,}930$)

Logo, a matriz de massa do manuscrito é:
$$[M]_{\text{manuscrito}} = \rho A L \begin{bmatrix} 0{,}075 & 0 \\ 0 & 0{,}634 \end{bmatrix}$$

#### Valores Corrigidos:
- $M_{11} = M_{33}^{(1)} + M_{33}^{(2)} + M_{11}^{(3)} = \frac{\rho A (1{,}118L)}{420} \times 140 \cos^2(63{,}435^\circ) + 0 + \frac{\rho A (1{,}118L)}{420} \times 140 \cos^2(-63{,}435^\circ) = \rho A L \times 0{,}149$
- $M_{12} = 0$
- $M_{22} = M_{44}^{(1)} + M_{44}^{(2)} + M_{22}^{(3)} = \frac{\rho A (1{,}118L)}{420} \times 140 \sin^2(63{,}435^\circ) + \frac{\rho A L}{420} \times 140 \sin^2(90^\circ) + \frac{\rho A (1{,}118L)}{420} \times 140 \sin^2(-63{,}435^\circ) = \rho A L \times 0{,}930$

$$[M]_{\text{correto}} = \rho A L \begin{bmatrix} 0{,}149 & 0 \\ 0 & 0{,}930 \end{bmatrix}$$

---

### Resolução com os valores do manuscrito ($[M]_{\text{manuscrito}}$):

$$\left| \frac{EA}{L} \begin{bmatrix} 0{,}35778 & 0 \\ 0 & 2{,}4311 \end{bmatrix} - \omega^2 \rho AL \begin{bmatrix} 0{,}075 & 0 \\ 0 & 0{,}634 \end{bmatrix} \right| = 0$$

Definindo $\lambda = \frac{\omega^2 \rho L^2}{E}$:
$$\left| \begin{bmatrix} 0{,}35778 - 0{,}075\lambda & 0 \\ 0 & 2{,}4311 - 0{,}634\lambda \end{bmatrix} \right| = 0$$
$$\Rightarrow (0{,}35778 - 0{,}075\lambda)(2{,}4311 - 0{,}634\lambda) = 0$$
$$\Rightarrow 0{,}04755\lambda^2 - 0{,}4079\lambda + 0{,}865 = 0$$

Autovalores:
$$\lambda_1 = 3{,}84 \quad \land \quad \lambda_2 = 4{,}74$$

Frequências naturais:
$$\omega_1 = \sqrt{\frac{3{,}84 E}{\rho L^2}} = \frac{1{,}96}{L} \sqrt{\frac{E}{\rho}}$$
$$\omega_2 = \sqrt{\frac{4{,}74 E}{\rho L^2}} = \frac{2{,}178}{L} \sqrt{\frac{E}{\rho}}$$

### Modos de Vibração (Autovetores):

#### Associado a $\lambda_1, \omega_1$:
$$\begin{bmatrix} 0{,}35778 - 0{,}075(3{,}84) & 0 \\ 0 & 2{,}4311 - 0{,}634(3{,}84) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} 0{,}06978 u_1 + 0 u_2 = 0 \\ 0 u_1 - 0{,}00346 u_2 = 0 \end{cases} \Rightarrow \begin{cases} u_1 = 0 \\ u_2 = \text{qualquer} \end{cases} \Rightarrow \text{Modo 1:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix}$$
*(Deslocamento puramente vertical no nó D)*

#### Associado a $\lambda_2, \omega_2$:
$$\begin{bmatrix} 0{,}35778 - 0{,}075(4{,}74) & 0 \\ 0 & 2{,}4311 - 0{,}634(4{,}74) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} 0{,}00228 u_1 + 0 u_2 = 0 \\ 0 u_1 - 0{,}57406 u_2 = 0 \end{cases} \Rightarrow \begin{cases} u_1 = \text{qualquer} \\ u_2 = 0 \end{cases} \Rightarrow \text{Modo 2:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$$
*(Deslocamento puramente horizontal no nó D)*


# Exercício 3

## Enunciado

Considere a treliça (barra 2D) representada na Figura 3, com massa volúmica $\rho$, módulo de Young E, e secção transversal com área A. Utilizando o menor número de elementos finitos possível, determine:

a) O deslocamento vertical e horizontal no ponto C;
b) A tensão axial na barra AC;
c) As frequências naturais e os respetivos modos de vibração. Represente os modos de vibração.

---

## Descrição da Estrutura

A estrutura consiste em uma treliça com 3 barras concorrentes no nó $C$:
- **Nó A** (apoio fixo na parede superior esquerda): $(-L/2, L)$
- **Nó B** (apoio fixo na parede superior direita): $(L/2, L)$
- **Nó D** (apoio fixo no solo): $(0, -L)$
- **Nó C** (nó livre): $(0, 0)$

### Propriedades das Barras:
- **Barra 1 (CD)**: Comprimento $L^{(1)} = L$, rigidez $E^{(1)}A^{(1)} = EA$
- **Barra 2 (CA)**: Comprimento $L^{(2)} = \sqrt{(L/2)^2 + L^2} = 1{,}118L$, rigidez $E^{(2)}A^{(2)} = EA$
- **Barra 3 (CB)**: Comprimento $L^{(3)} = 1{,}118L$, rigidez $E^{(3)}A^{(3)} = EA$

### Graus de Liberdade e Cargas no Nó C:
- $u_1$: Deslocamento horizontal no nó C (positivo para a direita)
- $u_2$: Deslocamento vertical no nó C (positivo para cima)
- Sistema com $2 \text{ g.l.} \Rightarrow [K]_{2\times 2}$
- Carga aplicada no nó C: Força horizontal $P$ (para a esquerda, portanto $-P$), força vertical $2P$ (para baixo, portanto $-2P$).

---

## Tabela de Conectividade e Propriedades

| m.e | 1 | 2 | 3 | 4 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 | $90^\circ$ | $L$ |
| **(2)** | - | - | 1 | 2 | $-63{,}435^\circ$ | $1{,}118L$ |
| **(3)** | 1 | 2 | - | - | $63{,}435^\circ$ | $1{,}118L$ |

---

## a) Deslocamentos

### Matriz de Rigidez Global $[K]$:

$$K_{11} = K_{33}^{(1)} + K_{33}^{(2)} + K_{11}^{(3)} = \frac{EA}{L} \cos^2 90^\circ + \frac{EA}{1{,}118L} \cos^2(-63{,}435^\circ) + \frac{EA}{1{,}118L} \cos^2 63{,}435^\circ$$
$$K_{11} = \frac{EA}{L} \left( 0 + \frac{0{,}2}{1{,}118} + \frac{0{,}2}{1{,}118} \right) = \frac{EA}{L} \times 0{,}35778$$

$$K_{12} = K_{34}^{(1)} + K_{34}^{(2)} + K_{12}^{(3)} = \frac{EA}{L} \sin 90^\circ \cos 90^\circ + \frac{EA}{1{,}118L} \sin(-63{,}435^\circ) \cos(-63{,}435^\circ) + \frac{EA}{1{,}118L} \sin 63{,}435^\circ \cos 63{,}435^\circ$$
$$K_{12} = \frac{EA}{L} \left( 0 - \frac{0{,}4}{1{,}118} + \frac{0{,}4}{1{,}118} \right) = 0$$

$$K_{21} = K_{12} = 0$$

$$K_{22} = K_{44}^{(1)} + K_{44}^{(2)} + K_{22}^{(3)} = \frac{EA}{L} \sin^2 90^\circ + \frac{EA}{1{,}118L} \sin^2(-63{,}435^\circ) + \frac{EA}{1{,}118L} \sin^2 63{,}435^\circ$$
$$K_{22} = \frac{EA}{L} \left( 1 + \frac{0{,}8}{1{,}118} + \frac{0{,}8}{1{,}118} \right) = \frac{EA}{L} \times 2{,}4311$$

Logo:
$$[K] = \frac{EA}{L} \begin{bmatrix} 0{,}35778 & 0 \\ 0 & 2{,}4311 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

$$\frac{EA}{L} \begin{bmatrix} 0{,}35778 & 0 \\ 0 & 2{,}4311 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} -P \\ -2P \end{bmatrix}$$

$$\Rightarrow \begin{cases} 0{,}35778 \frac{EA}{L} u_1 = -P \\ 2{,}4311 \frac{EA}{L} u_2 = -2P \end{cases}$$

### Resolução:
$$\begin{cases} u_1 = -2{,}79 \frac{PL}{EA} \\ u_2 = -0{,}82 \frac{PL}{EA} \end{cases}$$

---

## b) Tensão Axial na Barra AC

Relações constitutivas e cinemáticas:
$$\sigma = E \cdot \varepsilon$$
$$\varepsilon = \frac{\delta}{L} \Rightarrow \sigma = \frac{E}{L_2} (u_{2,\text{local}} - u_{1,\text{local}})$$
$$\delta = u_{2,\text{local}} - u_{1,\text{local}}$$
$$\theta = -63{,}435^\circ$$

Transformação de coordenadas para a Barra 2 (AC):
Como o nó inicial A é fixo ($u_1 = 0, u_2 = 0$) e o nó final C é livre ($U_1, U_2$):
$$\begin{bmatrix} u_{1,\text{local}} \\ u_{2,\text{local}} \end{bmatrix} = \begin{bmatrix} \cos(-63{,}435^\circ) & \sin(-63{,}435^\circ) & 0 & 0 \\ 0 & 0 & \cos(-63{,}435^\circ) & \sin(-63{,}435^\circ) \end{bmatrix} \begin{bmatrix} 0 \\ 0 \\ U_1 \\ U_2 \end{bmatrix}$$

$$\Rightarrow \begin{cases} u_{1,\text{local}} = 0 \\ u_{2,\text{local}} = U_1 \cos(-63{,}435^\circ) + U_2 \sin(-63{,}435^\circ) \end{cases}$$

Substituindo os deslocamentos globais do nó C:
$$u_{2,\text{local}} = -2{,}79 \frac{PL}{EA} \cos(-63{,}435^\circ) - 0{,}82 \frac{PL}{EA} \sin(-63{,}435^\circ) = -0{,}515 \frac{PL}{EA}$$
$$u_{1,\text{local}} = 0$$

Tensão normal na Barra AC (com comprimento $1{,}118L$):
$$\sigma = \frac{E}{1{,}118L} \left( -0{,}515 \frac{PL}{EA} - 0 \right) = -0{,}4606 \frac{P}{A} \quad (\text{Compressão})$$

---

## c) Modos de Vibração

Equação característica:
$$|[K] - \omega^2 [M]| = 0$$

### Matriz de Massa Global $[M]$ (Consistente):

$$M_{11} = M_{33}^{(1)} + M_{33}^{(2)} + M_{11}^{(3)} = \frac{\rho AL}{420} \times 140 \cos^2 90^\circ + \frac{\rho A (1{,}118L)}{420} \times 140 \cos^2(-63{,}435^\circ) + \frac{\rho A (1{,}118L)}{420} \times 140 \cos^2 63{,}435^\circ$$
$$M_{11} = \frac{\rho AL}{420} (0 + 31{,}3 + 31{,}3) = \rho AL \times 0{,}149$$

$$M_{12} = M_{34}^{(1)} + M_{34}^{(2)} + M_{12}^{(3)} = \frac{\rho AL}{420} \times 140 \sin 90^\circ \cos 90^\circ + \frac{\rho A (1{,}118L)}{420} \times 140 \sin(-63{,}435^\circ) \cos(-63{,}435^\circ) + \frac{\rho A (1{,}118L)}{420} \times 140 \sin(63{,}435^\circ) \cos(63{,}435^\circ) = 0$$

$$M_{22} = M_{44}^{(1)} + M_{44}^{(2)} + M_{22}^{(3)} = \frac{\rho AL}{420} \times 140 \sin^2 90^\circ + \frac{\rho A (1{,}118L)}{420} \times 140 \sin^2(-63{,}435^\circ) + \frac{\rho A (1{,}118L)}{420} \times 140 \sin^2 63{,}435^\circ$$
$$M_{22} = \frac{\rho AL}{420} (140 + 125{,}2 + 125{,}2) = \rho AL \times 0{,}93$$

Logo:
$$[M] = \rho A L \begin{bmatrix} 0{,}149 & 0 \\ 0 & 0{,}93 \end{bmatrix}$$

---

### Resolução das Frequências e Autovalores:

$$\left| \frac{EA}{L} \begin{bmatrix} 0{,}35578 & 0 \\ 0 & 2{,}4311 \end{bmatrix} - \omega^2 \rho AL \begin{bmatrix} 0{,}149 & 0 \\ 0 & 0{,}93 \end{bmatrix} \right| = 0$$
*(Nota: No manuscrito, $K_{11}$ foi escrito como $0{,}35578$ em vez de $0{,}35778$ nesta etapa).*

Definindo $\lambda = \frac{\omega^2 \rho L^2}{E}$:
$$\left| \begin{bmatrix} 0{,}35578 - 0{,}149\lambda & 0 \\ 0 & 2{,}4311 - 0{,}93\lambda \end{bmatrix} \right| = 0$$
$$\Rightarrow (0{,}35578 - 0{,}149\lambda)(2{,}4311 - 0{,}93\lambda) = 0$$
$$\Rightarrow 0{,}13857\lambda^2 - 0{,}693\lambda + 0{,}865 = 0$$

Autovalores:
$$\lambda_1 = 2{,}40 \quad \land \quad \lambda_2 = 2{,}60$$

Frequências naturais:
$$\omega_1 = \sqrt{\frac{2{,}40 E}{\rho L^2}} = \frac{1{,}54}{L} \sqrt{\frac{E}{\rho}}$$
$$\omega_2 = \sqrt{\frac{2{,}60 E}{\rho L^2}} = \frac{1{,}61}{L} \sqrt{\frac{E}{\rho}}$$

---

### Modos de Vibração (Autovetores):

> [!WARNING]
> **Nota sobre inconsistência conceitual no manuscrito:**
> Na resolução dos autovetores, o manuscrito cometeu um erro conceitual de lógica ao identificar qual coordenada é livre (`qualquer`) e qual é zero. Como a matriz é diagonal:
> - Para $\lambda_1 \approx 2{,}40$, a primeira equação zera ($0 u_1 = 0$), logo $u_1$ é livre e $u_2 = 0$. O manuscrito escreveu incorretamente $u_1 = 0$ e $u_2 = \text{qualquer}$.
> - Para $\lambda_2 \approx 2{,}60$, a segunda equação zera, logo $u_2$ é livre e $u_1 = 0$. O manuscrito escreveu incorretamente $u_1 = \text{qualquer}$ e $u_2 = 0$.
> 
> Segue abaixo a transcrição literal do manuscrito e a respectiva correção.

#### Transcrição do Manuscrito (com erro de lógica):

##### Associado a $\lambda_1, \omega_1$:
$$\begin{bmatrix} 0{,}35578 - 0{,}149(2{,}40) & 0 \\ 0 & 2{,}4311 - 0{,}93(2{,}40) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} -0{,}00182 u_1 = 0 \\ 0{,}1991 u_2 = 0 \end{cases} \Rightarrow \begin{cases} u_1 = 0 \\ u_2 = \text{qualquer} \end{cases} \Rightarrow \text{Modo 1:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix}$$

##### Associado a $\lambda_2, \omega_2$:
$$\begin{bmatrix} 0{,}35578 - 0{,}149(2{,}60) & 0 \\ 0 & 2{,}4311 - 0{,}93(2{,}60) \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
$$\Rightarrow \begin{cases} -0{,}0316 u_1 = 0 \\ 0{,}0131 u_2 = 0 \end{cases} \Rightarrow \begin{cases} u_1 = \text{qualquer} \\ u_2 = 0 \end{cases} \Rightarrow \text{Modo 2:} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$$

---

#### Resolução Correta:

- **Modo 1** (associado a $\lambda_1 = 2{,}40$):
  $$\begin{bmatrix} 0 & 0 \\ 0 & 0{,}2 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix} \Rightarrow u_2 = 0 \text{ e } u_1 = 1 \Rightarrow \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 1 \\ 0 \end{bmatrix}$$
  *(Modo puramente horizontal)*

- **Modo 2** (associado a $\lambda_2 = 2{,}60$):
  $$\begin{bmatrix} -0{,}03 & 0 \\ 0 & 0 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix} \Rightarrow u_1 = 0 \text{ e } u_2 = 1 \Rightarrow \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix}$$
  *(Modo puramente vertical)*


# Exercício 4

## Enunciado

Considere a estrutura representada na Figura 4 com área e módulo de Young conforme especificado. Utilizando o menor número possível de elementos finitos de barra 2D determine:

a) Os deslocamentos nodais;
b) A zona crítica da estrutura (barra mais solicitada);
c) O deslocamento aproximado na barra AB a uma distância L/2 de A.

---

## Descrição da Estrutura

A estrutura consiste em uma treliça plana com 3 barras concorrentes no nó $B$:
- **Nó A** (apoio de rolo em plano inclinado a $30^\circ$): $(0, 0)$
- **Nó B** (nó livre): $(L/2, L)$
- **Nó C** (apoio fixo): $(L, 0)$
- **Nó D** (apoio fixo na parede vertical direita): $(1{,}5L, L)$

### Propriedades das Barras:
- **Barra 1 (AB)**: Comprimento $L^{(1)} = \sqrt{(L/2)^2 + L^2} = 1{,}118L$, rigidez $E^{(1)}A^{(1)} = EA$
- **Barra 2 (CB)**: Comprimento $L^{(2)} = 1{,}118L$, rigidez $E^{(2)}A^{(2)} = EA$
- **Barra 3 (BD)**: Comprimento $L^{(3)} = L$, rigidez $E^{(3)}A^{(3)} = 2EA$

### Graus de Liberdade (3 g.l.):
- $u_1$: Deslocamento do rolo A ao longo do plano inclinado a $30^\circ$ (positivo para cima e para a direita)
- $u_2$: Deslocamento horizontal do nó B (positivo para a direita)
- $u_3$: Deslocamento vertical do nó B (positivo para cima)

### Cargas aplicadas no Nó B:
- Força vertical $2P$ (para cima, portanto $+2P$)
- Força horizontal $3P$ (desenhada para a esquerda, mas utilizada nas equações como $+3P$, para a direita)

---

## Tabela de Conectividade e Propriedades

| m.e | 1 | 2 | 3 | 4 | $\theta_1$ (local A) | $\theta_2$ (global B) | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | 1 | - | 2 | 3 | $33{,}435^\circ$ | $63{,}435^\circ$ | $1{,}118L$ |
| **(2)** | 2 | 3 | - | - | $-63{,}435^\circ$ | $-63{,}435^\circ$ | $1{,}118L$ |
| **(3)** | 2 | 3 | - | - | $0^\circ$ | $0^\circ$ | $L$ |

*Nota: $\theta_1$ para a Barra 1 é o ângulo da barra em relação ao plano de movimento do rolo A (inclinado a $30^\circ$). Portanto, $\theta_1 = 63{,}435^\circ - 30^\circ = 33{,}435^\circ$.*

---

## a) Deslocamentos Nodais

### Matriz de Rigidez Global $[K]$:

$$K_{11} = K_{11}^{(1)} = \frac{EA}{1{,}118L} \cos^2 33{,}435^\circ = \frac{EA}{L} \times 0{,}624$$

$$K_{12} = K_{13}^{(1)} = -\frac{EA}{1{,}118L} \cos 33{,}435^\circ \cos 63{,}435^\circ = \frac{EA}{L} \times (-0{,}33)$$

$$K_{13} = K_{14}^{(1)} = -\frac{EA}{1{,}118L} \cos 33{,}435^\circ \sin 63{,}435^\circ = \frac{EA}{L} \times (-0{,}668)$$

$$K_{22} = K_{33}^{(1)} + K_{11}^{(2)} + K_{11}^{(3)} = \frac{EA}{1{,}118L} \cos^2 63{,}435^\circ + \frac{EA}{1{,}118L} \cos^2(-63{,}435^\circ) + \frac{2EA}{L} \cos^2 0^\circ$$
$$K_{22} = \frac{EA}{L} \left( \frac{0{,}2}{1{,}118} + \frac{0{,}2}{1{,}118} + 2 \right) = \frac{EA}{L} \times 2{,}36$$

$$K_{23} = K_{34}^{(1)} + K_{12}^{(2)} + K_{12}^{(3)} = \frac{EA}{1{,}118L} \sin 63{,}435^\circ \cos 63{,}435^\circ + \frac{EA}{1{,}118L} \sin(-63{,}435^\circ) \cos(-63{,}435^\circ) + 0 = 0$$

$$K_{33} = K_{44}^{(1)} + K_{22}^{(2)} + K_{22}^{(3)} = \frac{EA}{1{,}118L} \sin^2 63{,}435^\circ + \frac{EA}{1{,}118L} \sin^2(-63{,}435^\circ) + 0 = \frac{EA}{L} \times 1{,}431$$

Logo:
$$[K] = \frac{EA}{L} \begin{bmatrix} 0{,}624 & -0{,}33 & -0{,}668 \\ -0{,}33 & 2{,}36 & 0 \\ -0{,}668 & 0 & 1{,}431 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

$$\frac{EA}{L} \begin{bmatrix} 0{,}624 & -0{,}33 & -0{,}668 \\ -0{,}33 & 2{,}36 & 0 \\ -0{,}668 & 0 & 1{,}431 \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \\ U_3 \end{bmatrix} = \begin{bmatrix} 0 \\ 3P \\ 2P \end{bmatrix}$$

$$\Rightarrow \begin{cases} 0{,}624 U_1 - 0{,}33 U_2 - 0{,}668 U_3 = 0 \\ -0{,}33 U_1 + 2{,}36 U_2 = 3 \frac{PL}{EA} \\ -0{,}668 U_1 + 1{,}431 U_3 = 2 \frac{PL}{EA} \end{cases}$$

### Resolução:
$$\begin{cases} U_1 = 5{,}08 \frac{PL}{EA} \\ U_2 = 1{,}98 \frac{PL}{EA} \\ U_3 = 3{,}77 \frac{PL}{EA} \end{cases}$$

---

## b) Zona Crítica da Estrutura (Tensões Normais)

$$\sigma = E \cdot \varepsilon = \frac{E}{L_{\text{barra}}} (u_{2,\text{local}} - u_{1,\text{local}})$$

### Barra AB:
Como o nó A está rotacionado de $30^\circ$, o deslocamento local inicial é $u_{1,\text{local}} = U_1 \cos(33{,}435^\circ)$.
$$u_{1,\text{local}} = 5{,}08 \frac{PL}{EA} \cos(33{,}435^\circ) = 4{,}24 \frac{PL}{EA}$$
$$u_{2,\text{local}} = U_2 \cos(63{,}435^\circ) + U_3 \sin(63{,}435^\circ) = 1{,}98 \frac{PL}{EA} \cos(63{,}435^\circ) + 3{,}77 \frac{PL}{EA} \sin(63{,}435^\circ) = 4{,}25 \frac{PL}{EA}$$
$$\sigma_{AB} = \frac{E}{1{,}118L} (4{,}25 - 4{,}24) \frac{PL}{EA} = 0{,}008945 \frac{P}{A}$$

### Barra CB:
O nó C é fixo, logo o deslocamento local final é zero ($u_{2,\text{local}} = 0$). O deslocamento local inicial (nó B) é:
$$u_{1,\text{local}} = U_2 \cos(-63{,}435^\circ) + U_3 \sin(-63{,}435^\circ) = 1{,}98 \frac{PL}{EA} \cos(-63{,}435^\circ) + 3{,}77 \frac{PL}{EA} \sin(-63{,}435^\circ) = -2{,}486 \frac{PL}{EA}$$
$$\sigma_{CB} = \frac{E}{1{,}118L} (0 - (-2{,}486)) \frac{P}{A} = 2{,}22 \frac{P}{A} \quad (\text{Tração})$$

### Barra BD:
O nó D é fixo, logo $u_{2,\text{local}} = 0$. O deslocamento local inicial (nó B, $\theta = 0^\circ$) é:
$$u_{1,\text{local}} = U_2 \cos(0^\circ) + U_3 \sin(0^\circ) = 1{,}98 \frac{PL}{EA}$$
$$\sigma_{BD} = \frac{E}{L} (0 - 1{,}98) \frac{P}{A} = -1{,}98 \frac{P}{A} \quad (\text{Compressão})$$

### Conclusão:
A barra crítica é a **Barra CB** com tensão de tração de $\sigma_{CB} = 2{,}22 \frac{P}{A}$.

---

## c) Deslocamento Aproximado na Barra AB a $L/2$ de A

Utilizando funções de forma lineares:
$$u(x) = N_1 u_1 + N_2 u_2 = \left( 1 - \frac{x}{L_{\text{barra}}} \right) u_1 + \left( \frac{x}{L_{\text{barra}}} \right) u_2$$

Substituindo $x = L/2$ e $L_{\text{barra}} = 1{,}118L$:
$$u(x = L/2) = \left( 1 - \frac{L/2}{1{,}118L} \right) \times 4{,}24 \frac{PL}{EA} + \left( \frac{L/2}{1{,}118L} \right) \times 4{,}25 \frac{PL}{EA}$$
$$u(x = L/2) = \left( 1 - 0{,}4472 \right) \times 4{,}24 \frac{PL}{EA} + 0{,}4472 \times 4{,}25 \frac{PL}{EA} = 4{,}24 \frac{PL}{EA}$$


# Exercício 5

## Enunciado

Considere a estrutura representada na Figura 5 com área e módulo de Young conforme especificado. Utilizando o menor número possível de elementos finitos de barra 2D determine:

a) Os deslocamentos nodais;
b) O deslocamento aproximado na barra AB a uma distância L/2 de A;
c) A zona crítica da estrutura (barra mais solicitada).

---

## Descrição da Estrutura

A estrutura consiste em uma treliça plana com 3 barras concorrentes no nó $B$:
- **Nó A** (apoio fixo superior esquerdo): $(-L/2, L)$
- **Nó B** (nó livre): $(0, 0)$
- **Nó C** (apoio de rolo em plano inclinado a $-20^\circ$): $(L/2, 0)$
- **Nó D** (apoio fixo inferior): $(0, -L)$

### Propriedades das Barras:
- **Barra 1 (AB)**: Comprimento $L^{(1)} = \sqrt{(L/2)^2 + L^2} = 1{,}118L$, rigidez $E^{(1)}A^{(1)} = EA$
- **Barra 2 (DB)**: Comprimento $L^{(2)} = L$, rigidez $E^{(2)}A^{(2)} = EA$
- **Barra 3 (BC)**: Comprimento $L^{(3)} = L/2$, rigidez $E^{(3)}A^{(3)} = 2EA$

### Graus de Liberdade (3 g.l.):
- $u_1$: Deslocamento horizontal do nó B (positivo para a direita)
- $u_2$: Deslocamento vertical do nó B (positivo para cima)
- $u_3$: Deslocamento do rolo C ao longo do plano inclinado a $-20^\circ$ (positivo para baixo e para a direita)

### Cargas aplicadas no Nó B:
Força externa de módulo $2P$ sob um ângulo de $20^\circ$ abaixo da horizontal:
- Componente horizontal: $+2P \cos 20^\circ$
- Componente vertical: $+2P \sin 20^\circ$ (tratada como positiva no sentido global para cima no manuscrito)

---

## Tabela de Conectividade e Propriedades

| m.e | 1 | 2 | 3 | 4 | $\theta_1$ (global B) | $\theta_2$ (local C) | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 | $-63{,}435^\circ$ | $-63{,}435^\circ$ | $1{,}118L$ |
| **(2)** | - | - | 1 | 2 | $90^\circ$ | $90^\circ$ | $L$ |
| **(3)** | 1 | 2 | 3 | - | $0^\circ$ | $-20^\circ$ | $L/2$ |

---

## a) Deslocamentos Nodais

### Matriz de Rigidez Global $[K]$:

$$K_{11} = K_{33}^{(1)} + K_{33}^{(2)} + K_{11}^{(3)} = \frac{EA}{1{,}118L} \cos^2(-63{,}435^\circ) + \frac{EA}{L} \cos^2 90^\circ + \frac{2EA}{L/2} \cos^2 0^\circ$$
$$K_{11} = \frac{EA}{L} \left( \frac{0{,}2}{1{,}118} + 0 + 4 \right) = \frac{EA}{L} \times 4{,}179$$

$$K_{12} = K_{34}^{(1)} + K_{34}^{(2)} + K_{12}^{(3)} = \frac{EA}{1{,}118L} \sin(-63{,}435^\circ) \cos(-63{,}435^\circ) + 0 + 0 = \frac{EA}{L} \times (-0{,}358)$$

$$K_{13} = K_{13}^{(3)} = -\frac{2EA}{L/2} \cos 0^\circ \cos(-20^\circ) = \frac{EA}{L} \times (-3{,}759)$$

$$K_{22} = K_{44}^{(1)} + K_{44}^{(2)} + K_{22}^{(3)} = \frac{EA}{1{,}118L} \sin^2(-63{,}435^\circ) + \frac{EA}{L} \sin^2 90^\circ + 0$$
$$K_{22} = \frac{EA}{L} \left( \frac{0{,}8}{1{,}118} + 1 \right) = \frac{EA}{L} \times 1{,}716$$

$$K_{23} = K_{23}^{(3)} = -\frac{2EA}{L/2} \sin 0^\circ \cos(-20^\circ) = 0$$

$$K_{33} = K_{33}^{(3)} = \frac{2EA}{L/2} \cos^2(-20^\circ) = \frac{EA}{L} \times 3{,}532$$

Logo:
$$[K] = \frac{EA}{L} \begin{bmatrix} 4{,}179 & -0{,}358 & -3{,}759 \\ -0{,}358 & 1{,}716 & 0 \\ -3{,}759 & 0 & 3{,}532 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

$$\frac{EA}{L} \begin{bmatrix} 4{,}179 & -0{,}358 & -3{,}759 \\ -0{,}358 & 1{,}716 & 0 \\ -3{,}759 & 0 & 3{,}532 \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \\ U_3 \end{bmatrix} = \begin{bmatrix} 2P \cos 20^\circ \\ 2P \sin 20^\circ \\ 0 \end{bmatrix}$$

$$\Rightarrow \begin{cases} 4{,}179 U_1 - 0{,}358 U_2 - 3{,}759 U_3 = 2P \cos 20^\circ \\ -0{,}358 U_1 + 1{,}716 U_2 = 2P \sin 20^\circ \\ -3{,}759 U_1 + 3{,}532 U_3 = 0 \end{cases}$$

### Resolução:
$$\begin{cases} U_1 = 19{,}495 \frac{PL}{EA} \\ U_2 = 4{,}466 \frac{PL}{EA} \\ U_3 = 20{,}748 \frac{PL}{EA} \end{cases}$$

---

## b) Deslocamento Aproximado na Barra AB a $L/2$ de A

Utilizando funções de forma lineares:
Como o nó A é fixo, o deslocamento local inicial é $u_1 = 0$. O deslocamento local no nó B (fim da barra) é:
$$u_2 = U_1 \cos(-63{,}435^\circ) + U_2 \sin(-63{,}435^\circ)$$
$$u_2 = 19{,}495 \frac{PL}{EA} \cos(-63{,}435^\circ) + 4{,}466 \frac{PL}{EA} \sin(-63{,}435^\circ) = 4{,}724 \frac{PL}{EA}$$

Interpolação linear para a posição do ponto médio ($x = L/2$, comprimento total da barra $1{,}118L$):
$$u(x = L/2) = \frac{x}{L_{\text{barra}}} u_2 = \frac{L/2}{1{,}118L} \times 4{,}724 \frac{PL}{EA} = 2{,}11 \frac{PL}{EA}$$

---

## c) Zona Crítica da Estrutura (Tensões Normais)

$$\sigma = E \cdot \varepsilon = \frac{E}{L_{\text{barra}}} (u_{2,\text{local}} - u_{1,\text{local}})$$

### Barra AB:
$$\sigma_{AB} = \frac{E}{1{,}118L} (4{,}724 - 0) \frac{PL}{EA} = 4{,}2254 \frac{P}{A} \quad (\text{Tração})$$

### Barra BD:
O nó D é fixo ($u_{1,\text{local}} = 0$). O deslocamento local no nó B ($\theta = 90^\circ$) é:
$$u_{2,\text{local}} = U_1 \cos 90^\circ + U_2 \sin 90^\circ = U_2 = 4{,}466 \frac{PL}{EA}$$
$$\sigma_{BD} = \frac{E}{L} (4{,}466 - 0) \frac{P}{A} = 4{,}466 \frac{P}{A} \quad (\text{Tração})$$

### Barra BC:
O deslocamento local inicial no nó B é:
$$u_{1,\text{local}} = U_1 \cos 0^\circ + U_2 \sin 0^\circ = 19{,}495 \frac{PL}{EA}$$
O deslocamento local final no nó C é:
$$u_{2,\text{local}} = U_3 \cos(-20^\circ) = 20{,}748 \frac{PL}{EA} \cos(-20^\circ) = 19{,}497 \frac{PL}{EA}$$
$$\sigma_{BC} = \frac{E}{L/2} (19{,}497 - 19{,}495) \frac{PL}{EA} = 0{,}004 \frac{P}{A} \quad (\text{Tração})$$

### Conclusão:
A barra crítica é a **Barra BD** com tensão de tração de $\sigma_{BD} = 4{,}466 \frac{P}{A}$.


# Exercício 6

## Enunciado

Considere a estrutura representada na Figura 6 com área A e módulo de Young E. Utilizando o menor número possível de elementos finitos de barra 2D determine:

a) Os deslocamentos nodais;
b) A tensão axial na barra CD;
c) O deslocamento aproximado a meio da barra AB.

---

## Descrição da Estrutura

A estrutura é uma treliça plana composta por 4 barras e 4 nós ($A$, $B$, $C$, $D$):
- **Nó A** (apoio fixo superior): $(L, 2L)$
- **Nó B** (apoio de rolo vertical na parede esquerda, permite deslocamento vertical): $(0, L)$
- **Nó C** (apoio de rolo horizontal no piso, permite deslocamento horizontal): $(0, 0)$
- **Nó D** (apoio de rolo vertical na parede direita, permite deslocamento vertical): $(L, L)$

### Propriedades das Barras:
- **Barra 1**: Liga C a B. Comprimento $L^{(1)} = L$, ângulo local $\theta_1 = 90^\circ$.
- **Barra 2**: Liga D a A. Comprimento $L^{(2)} = L$, ângulo local $\theta_2 = 90^\circ$.
- **Barra 3**: Liga B a A. Comprimento $L^{(3)} = \sqrt{L^2 + L^2} = 1{,}414L$, ângulo local $\theta_3 = 45^\circ$.
- **Barra 4**: Liga C a D. Comprimento $L^{(4)} = 1{,}414L$, ângulo local $\theta_4 = 45^\circ$.
- Todas as barras têm rigidez axial constante $EA$.

### Graus de Liberdade (3 g.l.):
- $u_1$: Deslocamento horizontal do nó C (positivo para a direita)
- $u_2$: Deslocamento vertical do nó D (positivo para cima)
- $u_3$: Deslocamento vertical do nó B (positivo para cima)

### Cargas Aplicadas:
- Força horizontal de módulo $3F$ no nó C (apontando para a esquerda no diagrama).
- Força vertical de módulo $F$ no nó D (apontando para baixo).

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | 1 | - | - | 3 | $90^\circ$ | $L$ |
| **(2)** | - | 2 | - | - | $90^\circ$ | $L$ |
| **(3)** | - | 3 | - | - | $45^\circ$ | $1{,}414L$ |
| **(4)** | 1 | - | - | 2 | $45^\circ$ | $1{,}414L$ |

---

## a) Deslocamentos Nodais

### Rigidez da Estrutura:
Os coeficientes da matriz de rigidez global $[K]$ são dados pela contribuição de cada barra:

$$K_{11} = K_{11}^{(1)} + K_{11}^{(4)} = \frac{EA}{L} \cos^2(90^\circ) + \frac{EA}{1{,}414L} \cos^2(45^\circ) = 0 + \frac{EA}{1{,}414L} \times 0{,}5 = \frac{EA}{L} \times 0{,}354$$

$$K_{12} = K_{14}^{(4)} = \frac{EA}{1{,}414L} (-\sin 45^\circ \cos 45^\circ) = \frac{EA}{L} \times (-0{,}354)$$

$$K_{13} = K_{14}^{(1)} = \frac{EA}{L} (-\sin 90^\circ \cos 90^\circ) = 0$$

$$K_{22} = K_{22}^{(2)} + K_{44}^{(4)} = \frac{EA}{L} \sin^2(90^\circ) + \frac{EA}{1{,}414L} \sin^2(45^\circ) = \frac{EA}{L} (1 + 0{,}354) = \frac{EA}{L} \times 1{,}354$$

$$K_{23} = 0$$

$$K_{33} = K_{44}^{(1)} + K_{22}^{(3)} = \frac{EA}{L} \sin^2(90^\circ) + \frac{EA}{1{,}414L} \sin^2(45^\circ) = \frac{EA}{L} (1 + 0{,}354) = \frac{EA}{L} \times 1{,}354$$

A matriz de rigidez global é:
$$[K] = \frac{EA}{L} \begin{bmatrix} 0{,}354 & -0{,}354 & 0 \\ -0{,}354 & 1{,}354 & 0 \\ 0 & 0 & 1{,}354 \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:

> [!IMPORTANT]
> **Nota sobre Convenção de Sinais na Resolução:**
> No diagrama original, a força horizontal de magnitude $3F$ no nó C aponta para a **esquerda** (sentido negativo de $u_1$). No entanto, o estudante utilizou $+3F$ no vetor de forças $\{F\}$. Transcrevemos os cálculos seguindo a resolução do estudante. A força vertical no nó D aponta para baixo, sendo corretamente representada como $-F$ no vetor de forças.

$$\frac{EA}{L} \begin{bmatrix} 0{,}354 & -0{,}354 & 0 \\ -0{,}354 & 1{,}354 & 0 \\ 0 & 0 & 1{,}354 \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \\ U_3 \end{bmatrix} = \begin{bmatrix} 3F \\ -F \\ 0 \end{bmatrix}$$

$$\Rightarrow \begin{cases} 0{,}354 \frac{EA}{L} U_1 - 0{,}354 \frac{EA}{L} U_2 = 3F \\ -0{,}354 \frac{EA}{L} U_1 + 1{,}354 \frac{EA}{L} U_2 = -F \\ 1{,}354 \frac{EA}{L} U_3 = 0 \end{cases}$$

### Resolução do Sistema:
Somando as duas primeiras equações:
$$1{,}000 \frac{EA}{L} U_2 = 2F \Rightarrow U_2 = 2 \frac{FL}{EA}$$

Substituindo na primeira equação:
$$0{,}354 \frac{EA}{L} U_1 = 3F + 0{,}354 \frac{EA}{L} \left(2 \frac{FL}{EA}\right) = 3{,}708F \Rightarrow U_1 = 10{,}474 \frac{FL}{EA}$$

Para a terceira equação:
$$U_3 = 0$$

Deslocamentos nodais finais:
$$\begin{cases} U_1 = 10{,}474 \frac{FL}{EA} \\ U_2 = 2 \frac{FL}{EA} \\ U_3 = 0 \end{cases}$$

---

## b) Tensão Axial CD

Para a barra CD (Barra 4), conectada aos nós C e D.
A rotação global para local $[u] = [R] [\bar{u}]$ é:
$$\begin{bmatrix} u_{1,\text{local}} \\ u_{2,\text{local}} \end{bmatrix} = \begin{bmatrix} \cos 45^\circ & \sin 45^\circ & 0 & 0 \\ 0 & 0 & \cos 45^\circ & \sin 45^\circ \end{bmatrix} \begin{bmatrix} U_1 \\ 0 \\ 0 \\ U_2 \end{bmatrix}$$

$$\Rightarrow \begin{cases} u_{1,\text{local}} = U_1 \cos 45^\circ = 10{,}474 \times \cos 45^\circ \frac{FL}{EA} = 7{,}406 \frac{FL}{EA} \\ u_{2,\text{local}} = U_2 \sin 45^\circ = 2 \times \sin 45^\circ \frac{FL}{EA} = 1{,}414 \frac{FL}{EA} \end{cases}$$

Tensão normal $\sigma$:
$$\sigma = E \cdot \varepsilon$$
$$\varepsilon = \frac{\delta}{L^{(4)}} = \frac{u_{2,\text{local}} - u_{1,\text{local}}}{1{,}414L}$$

$$\sigma = \frac{E}{1{,}414L} \left(1{,}414 - 7{,}406\right) \frac{FL}{EA} = -4{,}24 \frac{F}{A} \quad (\text{Compressão})$$

> [!NOTE]
> No manuscrito original, a variável de força foi escrita como $P$ no resultado da tensão ($\sigma = -4{,}24 \frac{P}{A}$), embora no início as forças tenham sido definidas como $3F$ e $F$. O resultado em termos de $F$ é $\sigma = -4{,}24 \frac{F}{A}$.

---

## c) Deslocamento Aproximado a Meio da Barra AB

> [!NOTE]
> Esta seção refere-se à Barra 3 (barra inclinada ligando o nó B ao apoio fixo A). O estudante utilizou a rotação correspondente à inclinação de $45^\circ$ desta barra.

Relação de deslocamento local para global:
$$\begin{bmatrix} u_{1,\text{local}} \\ u_{2,\text{local}} \end{bmatrix} = \begin{bmatrix} \cos 45^\circ & \sin 45^\circ & 0 & 0 \\ 0 & 0 & \cos 45^\circ & \sin 45^\circ \end{bmatrix} \begin{bmatrix} 0 \\ U_3 \\ 0 \\ 0 \end{bmatrix}$$

$$\Rightarrow \begin{cases} u_{1,\text{local}} = U_3 \sin 45^\circ \\ u_{2,\text{local}} = 0 \end{cases}$$

Como $U_3 = 0$:
$$\begin{cases} u_{1,\text{local}} = 0 \\ u_{2,\text{local}} = 0 \end{cases} \Rightarrow \text{Não há deslocamento.}$$


# Exercício 7

## Enunciado

Considere a viga representada na Figura 7 com secção transversal com inércia I e módulo de Young E. Utilizando o menor número de elementos finitos possível, determine:

a) A rotação exata no ponto B (x=2L);
b) O deslocamento transversal aproximado em x=L;
c) O momento fletor no ponto A (x=0).

---

## Descrição da Estrutura

A estrutura consiste em uma viga horizontal de comprimento $2L$ sob flexão (viga de Euler-Bernoulli):
- **Nó A** (extremidade esquerda, $x = 0$): Engastado (deslocamento vertical e rotação impedidos).
- **Nó B** (extremidade direita, $x = 2L$): Apoiado simples (deslocamento vertical impedido, rotação livre).
- **Rigidez à flexão**: $EI$ constante.

### Graus de Liberdade (1 g.l.):
- $u_1$: Rotação no nó B ($x = 2L$), adotada como positiva no sentido anti-horário.

### Cargas Aplicadas:
Carga linearmente variável ao longo do comprimento da viga (de $x = 0$ a $x = 2L$):
- Intensidade em $x = 0$: $p/2$ (apontando para baixo)
- Intensidade em $x = 2L$: $p$ (apontando para baixo)

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 |
| :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | - | 1 |

*(Os graus de liberdade locais do elemento de viga são: translação vertical esquerda, rotação esquerda, translação vertical direita, rotação direita).*

---

## a) Rotação Exata em B ($x = 2L$)

### Função de Carga $f(x)$:
A carga distribuída $f(x)$ varia linearmente. Usando a forma $f(x) = P_2 \frac{x}{L} + P_1$ (sendo a viga de comprimento $2L$):
- Para $x = 0 \Rightarrow -\frac{p}{2} = P_1 \Rightarrow P_1 = -\frac{p}{2}$
- Para $x = 2L \Rightarrow -p = P_2 \left(\frac{2L}{2L}\right) - \frac{p}{2} \Rightarrow P_2 = -\frac{p}{2}$

Portanto, a função da carga é:
$$f(x) = -\frac{p}{2} \left(1 + \frac{x}{2L}\right)$$

### Vetor de Forças Nocionais Equivalentes $\{F^{eq}\}$:
Podemos decompor a carga distribuída em duas parcelas:
1. Carga uniforme de intensidade $-\frac{p}{2}$
2. Carga triangular de intensidade $-\frac{p}{2}$ no nó B (variando de $0$ no nó A a $-\frac{p}{2}$ no nó B).

O momento nodais equivalente no nó B (grau de liberdade local 4, $M_{2eq}$) é dado por:
$$M_{2eq} = - \left( \frac{\left(-\frac{p}{2}\right) (2L)^2}{20} \right) - \left( \frac{\left(-\frac{p}{2}\right) (2L)^2}{12} \right)$$
$$M_{2eq} = \frac{p L^2}{10} + \frac{p L^2}{6} = \frac{3p L^2 + 5p L^2}{30} = \frac{8p L^2}{30} = \frac{4p L^2}{15}$$

### Matriz de Rigidez Global $[K]$:
O único grau de liberdade ativo é a rotação na extremidade direita do elemento 1 (comprimento $l = 2L$):
$$K_{11} = K_{44}^{(1)} = \frac{EI}{(2L)^3} \times 4(2L)^2 = \frac{4EI}{2L} = 2\frac{EI}{L}$$

$$[K] = 2\frac{EI}{L}$$

### Equação de Equilíbrio $[K]\{u\} = \{F\}$:
$$2\frac{EI}{L} \times U_1 = \frac{4p L^2}{15}$$
$$\Rightarrow U_1 = \frac{2p L^3}{15EI}$$

A rotação exata em B ($x = 2L$) é:
$$\theta_B = \frac{2p L^3}{15EI}$$

---

## b) Deslocamento Transversal Aproximado em $x = L$

O deslocamento transversal $v(x)$ é interpolado usando as funções de forma de Hermite. Como apenas $u_4 = U_1$ é não-nulo:
$$v(x) = N_4(x) \cdot U_1$$

Sendo a função de forma $N_4(x)$ para um elemento de comprimento $2L$:
$$N_4(x) = -\frac{x^2}{2L} + \frac{x^3}{(2L)^2}$$

Substituindo $U_1$:
$$v(x) = \left( -\frac{x^2}{2L} + \frac{x^3}{(2L)^2} \right) \times \frac{2p L^3}{15EI}$$

Para $x = L$ (meio da viga):
$$v(x=L) = \left( -\frac{L^2}{2L} + \frac{L^3}{4L^2} \right) \times \frac{2p L^3}{15EI} = \left( -\frac{L}{2} + \frac{L}{4} \right) \times \frac{2p L^3}{15EI}$$
$$v(x=L) = -\frac{L}{4} \times \frac{2p L^3}{15EI} = -\frac{p L^4}{30EI}$$

---

## c) Momento Fletor no Ponto A ($x = 0$)

O momento fletor $M(x)$ na viga é dado pela relação:
$$M(x) = EI \frac{d^2 v}{dx^2}$$

Derivando a expressão do deslocamento $v(x)$:
$$v(x) = \left( -\frac{x^2}{2L} + \frac{x^3}{(2L)^2} \right) \times \frac{2p L^3}{15EI}$$
$$\frac{dv}{dx} = \left( -\frac{2x}{2L} + \frac{3x^2}{4L^2} \right) \times \frac{2p L^3}{15EI}$$
$$\frac{d^2 v}{dx^2} = \left( -\frac{1}{L} + \frac{6x}{4L^2} \right) \times \frac{2p L^3}{15EI}$$

Multiplicando por $EI$:
$$M(x) = \left( -\frac{1}{L} + \frac{3x}{2L^2} \right) \times \frac{2p L^3}{15}$$

No ponto A ($x = 0$):
$$M(x=0) = -\frac{1}{L} \times \frac{2p L^3}{15} = -\frac{2p L^2}{15}$$


# Exercício 8

## Enunciado

Considere a viga representada na Figura 8 com secção transversal com inércia I e módulo de Young E. Utilizando o menor número de elementos finitos possível, determine:

a) O deslocamento exacto a meio da viga (x=L);
b) A rotação aproximada em x=L/2;
c) O esforço transverso em x=3L/2.

---

## Descrição da Estrutura

A estrutura consiste em uma viga simplesmente apoiada de comprimento total $2L$, composta por dois vãos de comprimento $L$ cada (viga sob flexão de Euler-Bernoulli):
- **Nó esquerdo** ($x = 0$): Apoio simples (deslocamento vertical impedido, rotação livre).
- **Nó direito** ($x = 2L$): Apoio simples (deslocamento vertical impedido, rotação livre).
- **Rigidez à flexão**: $EI$ constante.

### Graus de Liberdade Originais (4 g.l.):
- $u_1$: Rotação no nó esquerdo ($x = 0$)
- $u_2$: Deslocamento vertical no meio da viga ($x = L$)
- $u_3$: Rotação no meio da viga ($x = L$)
- $u_4$: Rotação no nó direito ($x = 2L$)

### Aplicação de Simetria (2 g.l.):
A estrutura e o carregamento são perfeitamente simétricos em relação ao meio da viga ($x = L$). 
- O deslocamento vertical no meio $u_2$ é livre.
- A rotação no meio $u_3$ é nula por simetria ($u_3 = 0$).
- A rotação na extremidade direita é oposta à da esquerda ($u_4 = -u_1$).
Desta forma, analisando apenas a metade esquerda da viga (elemento de comprimento $L$):
- **g.l. 1 ($U_1$)**: Rotação na extremidade esquerda ($x = 0$).
- **g.l. 2 ($U_2$)**: Deslocamento vertical na extremidade direita ($x = L$).

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 | L |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | 1 | 2 | - | $L$ |

---

## a) Deslocamento Exato a Meio da Viga ($x = L$)

### Matriz de Rigidez do Elemento Simetrizado $[K]_{2\times 2}$:
Os termos da matriz de rigidez global $[K]$ são obtidos diretamente da rigidez do elemento 1 de comprimento $L$:

$$K_{11} = K_{22}^{(1)} = \frac{EI}{L^3} \times 4L^2 = 4\frac{EI}{L}$$

$$K_{12} = K_{23}^{(1)} = \frac{EI}{L^3} \times (-6L) = -6\frac{EI}{L^2}$$

$$K_{22} = K_{33}^{(1)} = \frac{EI}{L^3} \times 12 = 12\frac{EI}{L^3}$$

$$[K] = \frac{EI}{L^3} \begin{bmatrix} 4L^2 & -6L \\ -6L & 12 \end{bmatrix}$$

### Função de Carregamento $f(x)$ na Metade Esquerda:
A carga distribuída varia linearmente de $0$ em $x = 0$ a $-p$ em $x = L$ (apontando para baixo):
- $f(x) = P_2 \frac{x}{L} + P_1$
- Para $x = 0 \Rightarrow 0 = P_1 \Rightarrow P_1 = 0$
- Para $x = L \Rightarrow -p = P_2 \Rightarrow P_2 = -p$

Portanto, a função da carga é:
$$f(x) = -p \frac{x}{L}$$

### Vetor de Forças Nocionais Equivalentes $\{F\}$:
Para uma carga triangular com valor máximo na extremidade direita (nó 2):
- O momento nodais equivalente no nó 1 (local 2) é:
  $$M_{1eq} = -\frac{p L^2}{30}$$
- A força vertical equivalente no nó 2 (local 3) é:
  $$F_{2eq} = -\frac{7p L}{20}$$

Logo, o vetor de forças globais é:
$$\{F\} = \begin{bmatrix} -\frac{p L^2}{30} \\ -\frac{7p L}{20} \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F\}$:
$$\frac{EI}{L^3} \begin{bmatrix} 4L^2 & -6L \\ -6L & 12 \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \end{bmatrix} = \begin{bmatrix} -\frac{p L^2}{30} \\ -\frac{7p L}{20} \end{bmatrix}$$

$$\Rightarrow \begin{cases} 4\frac{EI}{L} U_1 - 6\frac{EI}{L^2} U_2 = -\frac{p L^2}{30} \\ -6\frac{EI}{L^2} U_1 + 12\frac{EI}{L^3} U_2 = -\frac{7p L}{20} \end{cases}$$

Multiplicando a primeira equação por $\frac{1{,}5}{L}$ e somando-a à segunda:
$$\left( 12 - 9 \right) \frac{EI}{L^3} U_2 = -\frac{7p L}{20} + 1{,}5 \left(-\frac{p L}{30}\right)$$
$$3 \frac{EI}{L^3} U_2 = -\frac{7p L}{20} - \frac{p L}{20} = -\frac{8p L}{20} = -\frac{2p L}{5}$$
$$\Rightarrow U_2 = -\frac{2p L^4}{15EI}$$

Substituindo $U_2$ na primeira equação:
$$4\frac{EI}{L} U_1 = 6\frac{EI}{L^2} \left(-\frac{2p L^4}{15EI}\right) - \frac{p L^2}{30} = -\frac{4p L^2}{5} - \frac{p L^2}{30} = -\frac{25p L^2}{30}$$
$$\Rightarrow U_1 = -\frac{5p L^3}{24EI}$$

Os deslocamentos globais são:
$$\begin{cases} U_1 = -\frac{5p L^3}{24EI} \\ U_2 = -\frac{2p L^4}{15EI} \end{cases}$$

O deslocamento vertical exato no meio da viga é:
$$v_{\text{meio}} = U_2 = -\frac{2p L^4}{15EI}$$

---

## b) Rotação Aproximada em $L/2$

A rotação ao longo da viga é dada por $\theta(x) = \frac{dv}{dx}$.
O deslocamento transversal $v(x)$ no elemento 1 é interpolado usando as funções de forma (com $u_1 = 0$ e $u_4 = 0$):
$$v(x) = N_2(x) U_1 + N_3(x) U_2$$

Substituindo as funções de forma para o elemento de comprimento $L$:
$$v(x) = \left( x - \frac{2x^2}{L} + \frac{x^3}{L^2} \right) \left(-\frac{5p L^3}{24EI}\right) + \left( \frac{3x^2}{L^2} - \frac{2x^3}{L^3} \right) \left(-\frac{2p L^4}{15EI}\right)$$

A rotação $\theta(x)$ é:
$$\theta(x) = \frac{dv}{dx} = \left( 1 - \frac{4x}{L} + \frac{3x^2}{L^2} \right) \left(-\frac{5p L^3}{24EI}\right) + \left( \frac{6x}{L^2} - \frac{6x^2}{L^3} \right) \left(-\frac{2p L^4}{15EI}\right)$$

Avaliando em $x = L/2$:
$$\theta(x=L/2) = \left( 1 - 2 + \frac{3}{4} \right) \left(-\frac{5p L^3}{24EI}\right) + \left( \frac{3}{L} - \frac{1{,}5}{L} \right) \left(-\frac{2p L^4}{15EI}\right)$$
$$\theta(x=L/2) = \left(-\frac{1}{4}\right) \left(-\frac{5p L^3}{24EI}\right) + \left(\frac{1{,}5}{L}\right) \left(-\frac{2p L^4}{15EI}\right)$$
$$\theta(x=L/2) = \frac{5p L^3}{96EI} - \frac{p L^3}{5EI} = -\frac{71p L^3}{480EI}$$

---

## c) Esforço Transverso em $x = \frac{3L}{2}$

Por razões de simetria do esforço cortante na viga simétrica com carregamento simétrico, a magnitude do esforço transverso $V(x)$ satisfaz:
$$V(x = 3L/2) = V(x = L/2)$$

O esforço transverso $V(x)$ é calculado pela derivada de terceira ordem do deslocamento:
$$V(x) = EI \frac{d^3 v}{dx^3}$$

> [!NOTE]
> **Nota sobre Erro de Escrita no Manuscrito:**
> No manuscrito original, a expressão para $\frac{d^2 v}{dx^2}$ foi escrita com um sinal incorreto no termo constante da primeira derivada (como $+4/L$ em vez de $-4/L$). No entanto, como esse termo é constante, sua derivada em relação a $x$ é nula, não afetando o cálculo de $\frac{d^3 v}{dx^3}$. O cálculo da força cortante permanece 100% correto.

Derivando a rotação $\theta(x)$:
$$\frac{d^2 v}{dx^2} = \left( -\frac{4}{L} + \frac{6x}{L^2} \right) \left(-\frac{5p L^3}{24EI}\right) + \left( \frac{6}{L^2} - \frac{12x}{L^3} \right) \left(-\frac{2p L^4}{15EI}\right)$$

$$\frac{d^3 v}{dx^3} = \frac{6}{L^2} \left(-\frac{5p L^3}{24EI}\right) - \frac{12}{L^3} \left(-\frac{2p L^4}{15EI}\right) = -\frac{5p L}{4EI} + \frac{8p L}{5EI} = \frac{7p L}{20EI}$$

Assim, o esforço transverso é:
$$V(x) = EI \left(\frac{7p L}{20EI}\right) = \frac{7p L}{20}$$

Desta forma:
$$V(x = 3L/2) = \frac{7p L}{20}$$



# Exercício 9

## Enunciado

Considere a viga representada na Figura 9 com secção transversal com inércia I e módulo de Young E. Utilizando o menor número de elementos finitos possível, determine:

a) A rotação no ponto B (x=2L);
b) Os pontos onde a rotação é nula;
c) A reação no ponto B.

---

## Descrição da Estrutura

A estrutura consiste em uma viga sob flexão (viga de Euler-Bernoulli) de comprimento $2L$:
- **Nó A** (extremidade esquerda, $x = 0$): Engastado (deslocamento vertical e rotação impedidos).
- **Nó B** (extremidade direita, $x = 2L$): Apoio simples (deslocamento vertical impedido, rotação livre).
- **Rigidez à flexão**: $EI$ constante.

### Metodologia para Determinação da Reação de Apoio:
Para determinar a reação de apoio vertical em B ($R_B$), acrescenta-se temporariamente um grau de liberdade vertical no nó B. Desta forma, o modelo possui 2 graus de liberdade na extremidade direita ($x = 2L$):
- **g.l. 1 ($U_1$)**: Deslocamento vertical no nó B (positivo para cima). A condição de fronteira real impõe $U_1 = 0$.
- **g.l. 2 ($U_2$)**: Rotação no nó B (positiva no sentido anti-horário).

### Cargas Aplicadas:
Carga linearmente variável ao longo de todo o comprimento $2L$:
- Intensidade em $x = 0$: $0$
- Intensidade em $x = 2L$: $p$ (apontando para baixo)

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 |
| :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 |

---

## a) Rotação em B ($U_2$) e c) Reação de Apoio em B ($R_B$)

### Matriz de Rigidez do Elemento ($l = 2L$) $[K]_{2\times 2}$:
Os coeficientes da matriz de rigidez global $[K]$ correspondentes aos graus de liberdade ativos na extremidade direita do elemento de comprimento $2L$ são:

$$K_{11} = K_{33}^{(1)} = \frac{EI}{(2L)^3} \times 12 = \frac{3EI}{2L^3}$$

$$K_{12} = K_{34}^{(1)} = \frac{EI}{(2L)^3} \times (-6(2L)) = -\frac{3EI}{2L^2}$$

$$K_{22} = K_{44}^{(1)} = \frac{EI}{(2L)^3} \times 4(2L)^2 = \frac{2EI}{L}$$

$$[K] = \frac{EI}{L^3} \begin{bmatrix} 3/2 & -3/2L \\ -3/2L & 2L^2 \end{bmatrix}$$

### Função de Carregamento $f(x)$:
A carga distribuída varia linearmente de $0$ em $x = 0$ a $-p$ em $x = 2L$:
$$f(x) = -p \frac{x}{2L}$$

### Vetor de Forças Nocionais Equivalentes $\{F^{eq}\}$:
Para uma carga triangular com valor máximo na extremidade direita (nó B):
- A força vertical equivalente em B (local 3) é:
  $$F_{1eq} = \frac{7(-p)(2L)}{20} = -\frac{7p L}{10}$$
- O momento nodais equivalente em B (local 4) é:
  $$M_{2eq} = - \left( \frac{-p (2L)^2}{20} \right) = \frac{p L^2}{5}$$

Portanto:
$$\{F^{eq}\} = \begin{bmatrix} -\frac{7p L}{10} \\ \frac{p L^2}{5} \end{bmatrix}$$

### Equações de Equilíbrio $[K]\{u\} = \{F^{eq}\} + \{R\}$:
Introduzindo a reação de apoio vertical $R_B$ associada ao deslocamento $U_1$:
$$\frac{EI}{L^3} \begin{bmatrix} 3/2 & -3/2L \\ -3/2L & 2L^2 \end{bmatrix} \begin{bmatrix} U_1 \\ U_2 \end{bmatrix} = \begin{bmatrix} -\frac{7p L}{10} + R_B \\ \frac{p L^2}{5} \end{bmatrix}$$

Como a condição de fronteira real é $U_1 = 0$:
$$\begin{cases} -\frac{3EI}{2L^2} U_2 = -\frac{7p L}{10} + R_B \\ 2\frac{EI}{L} U_2 = \frac{p L^2}{5} \end{cases}$$

### Resolução:
1. Da segunda equação, obtemos a **rotação em B**:
   $$U_2 = \frac{p L^3}{10EI}$$

2. Substituindo $U_2$ na primeira equação para encontrar a **reação em B**:
   $$-\frac{3EI}{2L^2} \left(\frac{p L^3}{10EI}\right) = -\frac{7p L}{10} + R_B$$
   $$-\frac{3p L}{20} = -\frac{14p L}{20} + R_B \Rightarrow R_B = \frac{11p L}{20}$$

---

## b) Posição de Rotação Nula ($\theta(x) = 0$)

A rotação ao longo do comprimento da viga é definida por $\theta(x) = \frac{dv}{dx}$.
O deslocamento transversal $v(x)$ é interpolado usando as funções de forma de Hermite. Dado que $u_1 = u_2 = u_3 = 0$ (devido ao engaste à esquerda e apoio à direita) e apenas $u_4 = U_2 = \frac{p L^3}{10EI}$ é ativo:
$$v(x) = N_4(x) \cdot U_2$$

Para um elemento de comprimento $2L$:
$$N_4(x) = -\frac{x^2}{2L} + \frac{x^3}{(2L)^2}$$

Portanto:
$$v(x) = \left( -\frac{x^2}{2L} + \frac{x^3}{4L^2} \right) \times \frac{p L^3}{10EI}$$

Derivando para obter a rotação $\theta(x)$:
$$\theta(x) = \frac{dv}{dx} = \left( -\frac{x}{L} + \frac{3x^2}{4L^2} \right) \times \frac{p L^3}{10EI}$$

Para encontrar os pontos de rotação nula ($\theta(x) = 0$):
$$\left( -\frac{x}{L} + \frac{3x^2}{4L^2} \right) = 0 \Rightarrow x \left( -\frac{1}{L} + \frac{3x}{4L^2} \right) = 0$$

As soluções são:
- $x = 0$ (posição do engaste na extremidade esquerda)
- $x = \frac{4L}{3}$ (ao longo do vão da viga)


# Exercício 10

## Enunciado

Considere a estrutura da Figura 10 com secção transversal com inércia I e área A, e módulo de Young E. Determine:

a) A matriz de rigidez do problema.
b) O vector de forças.

---

## Descrição da Estrutura

A estrutura é um pórtico plano composto por 3 elementos de barra sob flexão e esforço axial (elementos de pórtico plano):
- **Nó A** (apoio fixo/engaste inferior esquerdo): $(0, 0)$
- **Nó B** (nó intermediário na barra inclinada): $(L/2, L/2)$
- **Nó C** (nó de ligação/cotovelo): $(L, L)$
- **Nó D** (apoio fixo/engaste superior direito): $(3L, L)$

### Propriedades dos Elementos:
- **Elemento 1**: Liga o nó A ao nó B.
  - Projeções: Horizontal = $L/2$, Vertical = $L/2$.
  - Comprimento $L^{(1)} = \sqrt{(L/2)^2 + (L/2)^2} = 0{,}707L$.
  - Ângulo de inclinação local $\theta_1 = 45^\circ$.
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.
- **Elemento 2**: Liga o nó B ao nó C.
  - Projeções: Horizontal = $L/2$, Vertical = $L/2$.
  - Comprimento $L^{(2)} = 0{,}707L$.
  - Ângulo de inclinação local $\theta_2 = 45^\circ$.
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.
- **Elemento 3**: Liga o nó C ao nó D.
  - Comprimento $L^{(3)} = 2L$.
  - Ângulo de inclinação local $\theta_3 = 0^\circ$ (horizontal).
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.

### Graus de Liberdade (6 g.l.):
Como os nós A e D são engastes rígidos (deslocamentos horizontal, vertical e rotação impedidos), os graus de liberdade ativos são:
- **No Nó B (intermediário)**:
  - $u_1$: Deslocamento horizontal.
  - $u_2$: Deslocamento vertical (positivo para cima).
  - $u_3$: Rotação (positiva no sentido anti-horário).
- **No Nó C (cotovelo)**:
  - $u_4$: Deslocamento horizontal.
  - $u_5$: Deslocamento vertical (positivo para cima).
  - $u_6$: Rotação (positiva no sentido anti-horário).

### Cargas Aplicadas:
- Força pontual vertical concentrada $F$ no nó B (apontando para baixo).
- Carga uniformemente distribuída de intensidade $p$ ao longo do elemento 3 (horizontal), apontando para baixo.

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 | 5 | 6 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | - | 1 | 2 | 3 | $45^\circ$ | $0{,}707L$ |
| **(2)** | 1 | 2 | 3 | 4 | 5 | 6 | $45^\circ$ | $0{,}707L$ |
| **(3)** | 4 | 5 | 6 | - | - | - | $0^\circ$ | $2L$ |

---

## a) Matriz de Rigidez Global $[K]_{6\times 6}$

A matriz global de rigidez é simétrica e seus termos não-nulos são obtidos pela contribuição de cada elemento de pórtico plano em coordenadas globais.

### Contribuições de Rigidez dos Elementos Inclinados ($\theta = 45^\circ, L_e = 0{,}707L$):
Para $\theta = 45^\circ$: $\cos 45^\circ = 0{,}707$, $\sin 45^\circ = 0{,}707$.
Os termos locais transformados envolvem:
$$\frac{EA}{L_e} = \frac{EA}{0{,}707L} = 1{,}414 \frac{EA}{L}$$
$$\frac{EI}{L_e^3} = \frac{EI}{(0{,}707L)^3} = \frac{EI}{0{,}3535L^3} = 28{,}284 \frac{EI}{L^3}$$
$$\frac{12EI}{L_e^3} = \frac{12EI}{(0{,}707L)^3} = 33{,}941 \frac{EI}{L^3}$$
$$\frac{6EI}{L_e^2} = \frac{6EI}{(0{,}707L)^2} = 12 \frac{EI}{L^2}$$
$$\frac{4EI}{L_e} = \frac{4EI}{0{,}707L} = 5{,}657 \frac{EI}{L}$$

### Coeficientes da Matriz $[K]$:

$$K_{11} = K_{44}^{(1)} + K_{11}^{(2)} = 2 \times \left( \frac{EA}{0{,}707L} \cos^2 45^\circ + \frac{12EI}{(0{,}707L)^3} \sin^2 45^\circ \right) = \frac{EA}{L} \times 1{,}414 + \frac{EI}{L^3} \times 33{,}96$$

$$K_{12} = K_{45}^{(1)} + K_{12}^{(2)} = 2 \times \left( \left(\frac{EA}{0{,}707L} - \frac{12EI}{(0{,}707L)^3}\right) \cos 45^\circ \sin 45^\circ \right) = \frac{EA}{L} \times 1{,}414 - \frac{EI}{L^3} \times 33{,}96$$

$$K_{13} = K_{46}^{(1)} + K_{13}^{(2)} = \frac{6EI}{(0{,}707L)^2} \sin 45^\circ - \frac{6EI}{(0{,}707L)^2} \sin 45^\circ = 0$$

$$K_{14} = K_{14}^{(2)} = -\frac{EA}{0{,}707L} \cos^2 45^\circ - \frac{12EI}{(0{,}707L)^3} \sin^2 45^\circ = \frac{EA}{L} \times (-0{,}707) + \frac{EI}{L^3} \times (-16{,}98)$$

$$K_{15} = K_{15}^{(2)} = -\left(\frac{EA}{0{,}707L} - \frac{12EI}{(0{,}707L)^3}\right) \cos 45^\circ \sin 45^\circ = \frac{EA}{L} \times (-0{,}707) + \frac{EI}{L^3} \times 16{,}98$$

$$K_{16} = K_{16}^{(2)} = -\frac{6EI}{(0{,}707L)^2} \sin 45^\circ = \frac{EI}{L^2} \times (-8{,}480)$$

$$K_{22} = K_{55}^{(1)} + K_{22}^{(2)} = 2 \times \left( \frac{EA}{0{,}707L} \sin^2 45^\circ + \frac{12EI}{(0{,}707L)^3} \cos^2 45^\circ \right) = \frac{EA}{L} \times 1{,}414 + \frac{EI}{L^3} \times 33{,}96$$

$$K_{23} = K_{56}^{(1)} + K_{23}^{(2)} = -\frac{6EI}{(0{,}707L)^2} \cos 45^\circ + \frac{6EI}{(0{,}707L)^2} \cos 45^\circ = 0$$

$$K_{24} = K_{24}^{(2)} = K_{15}^{(2)} = \frac{EA}{L} \times (-0{,}707) + \frac{EI}{L^3} \times 16{,}98$$

$$K_{25} = K_{25}^{(2)} = -\frac{EA}{0{,}707L} \sin^2 45^\circ - \frac{12EI}{(0{,}707L)^3} \cos^2 45^\circ = \frac{EA}{L} \times (-0{,}707) + \frac{EI}{L^3} \times (-16{,}98)$$

$$K_{26} = K_{26}^{(2)} = \frac{6EI}{(0{,}707L)^2} \cos 45^\circ = \frac{EI}{L^2} \times 8{,}488$$

$$K_{33} = K_{66}^{(1)} + K_{33}^{(2)} = \frac{4EI}{0{,}707L} + \frac{4EI}{0{,}707L} = \frac{EI}{L} \times 11{,}315$$

$$K_{34} = K_{34}^{(2)} = \frac{6EI}{(0{,}707L)^2} \sin 45^\circ = \frac{EI}{L^2} \times 8{,}488$$

$$K_{35} = K_{35}^{(2)} = -\frac{6EI}{(0{,}707L)^2} \cos 45^\circ = \frac{EI}{L^2} \times (-8{,}488)$$

$$K_{36} = K_{36}^{(2)} = \frac{2EI}{0{,}707L} = \frac{EI}{L} \times 2{,}829$$

$$K_{44} = K_{44}^{(2)} + K_{11}^{(3)} = \left(\frac{EA}{0{,}707L} \cos^2 45^\circ + \frac{12EI}{(0{,}707L)^3} \sin^2 45^\circ\right) + \left(\frac{EA}{2L}\right) = \frac{EA}{L} \times 1{,}21 + \frac{EI}{L^3} \times 16{,}98$$

$$K_{45} = K_{45}^{(2)} + K_{12}^{(3)} = \left(\frac{EA}{0{,}707L} - \frac{12EI}{(0{,}707L)^3}\right) \cos 45^\circ \sin 45^\circ + 0 = \frac{EA}{L} \times 0{,}707 + \frac{EI}{L^3} \times (-16{,}98)$$

$$K_{46} = K_{46}^{(2)} + K_{13}^{(3)} = \frac{6EI}{(0{,}707L)^2} \sin 45^\circ + 0 = \frac{EI}{L^2} \times 8{,}488$$

$$K_{55} = K_{55}^{(2)} + K_{22}^{(3)} = \left(\frac{EA}{0{,}707L} \sin^2 45^\circ + \frac{12EI}{(0{,}707L)^3} \cos^2 45^\circ\right) + \left(\frac{12EI}{(2L)^3}\right) = \frac{EA}{L} \times 0{,}707 + \frac{EI}{L^3} \times 18{,}48$$

$$K_{56} = K_{56}^{(2)} + K_{23}^{(3)} = -\frac{6EI}{(0{,}707L)^2} \cos 45^\circ + \frac{6EI}{(2L)^2} = \frac{EI}{L^2} \times (-6{,}99)$$

$$K_{66} = K_{66}^{(2)} + K_{33}^{(3)} = \frac{4EI}{0{,}707L} + \frac{4EI}{2L} = \frac{EI}{L} \times 7{,}658$$

---

## b) Vetor Global de Forças $\{F\}_{6\times 1}$

As contribuições para o vetor global de forças advêm das cargas diretamente aplicadas e das forças nodais equivalentes do elemento horizontal sob carga distribuída:

### Forças Nodais Equivalentes do Elemento 3 (Horizontal, comprimento $2L$):
Sob uma carga uniformemente distribuída de intensidade $p$ (apontando para baixo):
- A força vertical equivalente na extremidade esquerda (nó C, global DOF 5) é:
  $$f_{5,\text{eq}}^{(3)} = -\frac{p \times 2L}{2} = -pL$$
- O momento nodal equivalente na extremidade esquerda (nó C, global DOF 6) é:
  $$f_{6,\text{eq}}^{(3)} = -\frac{p \times (2L)^2}{12} = -\frac{pL^2}{3}$$
- Outras componentes no nó C são nulas: $f_{4,\text{eq}}^{(3)} = 0$.

### Combinação com a Carga Concentrada no Nó B:
A força pontual vertical $F$ (apontando para baixo) atua diretamente no nó B, correspondendo ao grau de liberdade global $u_2$:
- $f_2 = -F$

### Vetor Global de Forças $\{F\}$:

$$\{F\} = \begin{bmatrix} f_1 \\ f_2 \\ f_3 \\ f_4 \\ f_5 \\ f_6 \end{bmatrix} = \begin{bmatrix} 0 \\ -F \\ 0 \\ 0 \\ -pL \\ -\frac{pL^2}{3} \end{bmatrix}$$


# Exercício 11

## Enunciado

Considere a estrutura da Figura 11 com secção transversal com inércia I e área A, e módulo de Young E. Determine:

a) A matriz de rigidez do problema;
b) O vetor de forças.

---

## Descrição da Estrutura

A estrutura consiste em um pórtico plano com 3 elementos de barra sob flexão e esforço axial:
- **Nó A** (apoio inferior esquerdo, $x = 0, y = 0$): Engastado.
- **Nó B** (cotovelo esquerdo): $(L, L)$.
- **Nó C** (cotovelo direito): $(3L, L)$.
- **Nó D** (apoio inferior direito, $x = 3L, y = 0$): Apoiado sobre rolos horizontais (permite deslocamento horizontal $u_7$ livre, com rotação e translação vertical impedidas).

### Propriedades dos Elementos:
- **Elemento 1**: Barra inclinada conectando o nó A ao nó B.
  - Projeções: Horizontal = $L$, Vertical = $L$.
  - Comprimento $L^{(1)} = \sqrt{L^2 + L^2} = 1{,}414L$.
  - Inclinação local $\theta_1 = 45^\circ$.
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.
- **Elemento 2**: Barra horizontal conectando o nó B ao nó C.
  - Comprimento $L^{(2)} = 2L$.
  - Inclinação local $\theta_2 = 0^\circ$.
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.
- **Elemento 3**: Barra vertical conectando o nó C ao nó D.
  - Comprimento $L^{(3)} = L$.
  - Inclinação local $\theta_3 = -90^\circ$ (do nó C para o nó D).
  - Rigidez axial $EA$ e rigidez à flexão $EI$ constantes.

### Graus de Liberdade (7 g.l.):
- **No Nó B**:
  - $u_1$: Deslocamento horizontal.
  - $u_2$: Deslocamento vertical.
  - $u_3$: Rotação.
- **No Nó C**:
  - $u_4$: Deslocamento horizontal.
  - $u_5$: Deslocamento vertical.
  - $u_6$: Rotação.
- **No Nó D**:
  - $u_7$: Deslocamento horizontal (adotado como positivo para a direita).

---

## Tabela de Conectividade (m.c)

| m.e | 1 | 2 | 3 | 4 | 5 | 6 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | - | 1 | 2 | 3 | $45^\circ$ | $1{,}414L$ |
| **(2)** | 1 | 2 | 3 | 4 | 5 | 6 | $0^\circ$ | $2L$ |
| **(3)** | 4 | 5 | 6 | - | - | 7 | $-90^\circ$ | $L$ |

> [!IMPORTANT]
> **Nota sobre a Tabela de Conectividade do Manuscrito:**
> Para a Barra 3 (vertical, ligando o nó C ao nó D), o deslocamento livre horizontal no apoio D é designado por $u_7$. Na tabela de conectividade, este grau de liberdade foi listado na 6ª coluna (`4 | 5 | 6 | - | - | 7`), que corresponde à rotação local no nó de extremidade. Isto reflete uma inconsistência conceitual na montagem manual do estudante, que colocou a translação $u_7$ na coluna de rotação (coluna 6). É precisamente devido a este erro de mapeamento que o momento final $M_2$ do Elemento 3 ($+0{,}0833pL^2$, que é a força nodal local na 6ª posição) foi incorretamente mapeado para a 7ª linha do vetor global de forças $\{F\}$. Transcrevemos os cálculos exatamente como realizados no manuscrito original para garantir a perfeita rastreabilidade.

---

## a) Matriz de Rigidez Global $[K]_{7\times 7}$

Os termos da matriz global de rigidez são compostos pelas contribuições de cada elemento.

### Coeficientes da Matriz $[K]$ (Páginas 25, 26, 27):

$$K_{11} = K_{44}^{(1)} + K_{11}^{(2)} = \frac{EA}{L} \times 0{,}853 + \frac{EI}{L^3} \times 2{,}12$$

$$K_{12} = K_{45}^{(1)} + K_{12}^{(2)} = \frac{EA}{L} \times 0{,}353 + \frac{EI}{L^3} \times (-2{,}12)$$

$$K_{13} = K_{46}^{(1)} + K_{13}^{(2)} = \frac{EI}{L^2} \times 2{,}12$$

$$K_{14} = K_{14}^{(2)} = \frac{EA}{L} \times (-0{,}5)$$

$$K_{15} = K_{15}^{(2)} = 0$$

$$K_{16} = K_{16}^{(2)} = 0$$

$$K_{17} = 0$$

$$K_{22} = K_{55}^{(1)} + K_{22}^{(2)} = \frac{EA}{L} \times 0{,}353 + \frac{EI}{L^3} \times 3{,}62$$

$$K_{23} = K_{56}^{(1)} + K_{23}^{(2)} = \frac{EI}{L^2} \times (-0{,}62)$$

$$K_{24} = K_{24}^{(2)} = 0$$

$$K_{25} = K_{25}^{(2)} = \frac{EI}{L^3} \times \left(-\frac{3}{2}\right)$$

$$K_{26} = K_{26}^{(2)} = \frac{EI}{L^2} \times \frac{3}{2}$$

$$K_{27} = 0$$

$$K_{33} = K_{66}^{(1)} + K_{33}^{(2)} = \frac{EI}{L} \times 4{,}83$$

$$K_{34} = K_{34}^{(2)} = 0$$

$$K_{35} = K_{35}^{(2)} = \frac{EI}{L^2} \times \left(-\frac{3}{2}\right)$$

$$K_{36} = K_{36}^{(2)} = \frac{EI}{L}$$

$$K_{37} = 0$$

$$K_{44} = K_{44}^{(2)} + K_{11}^{(3)} = \frac{EA}{L} \frac{1}{2} + \frac{EI}{L^3} \times 12$$

$$K_{45} = K_{45}^{(2)} + K_{12}^{(3)} = 0$$

$$K_{46} = K_{46}^{(2)} + K_{13}^{(3)} = \frac{EI}{L^2} \times 6$$

$$K_{47} = K_{15}^{(3)} = \frac{EI}{L^2} \times 6$$

$$K_{55} = K_{55}^{(2)} + K_{22}^{(3)} = \frac{EA}{L} \times (-1) + \frac{EI}{L^3} \times \frac{3}{2}$$

$$K_{56} = K_{56}^{(2)} + K_{23}^{(3)} = \frac{EI}{L^2} \times \left(-\frac{3}{2}\right)$$

$$K_{57} = K_{25}^{(3)} = 0$$

$$K_{66} = K_{66}^{(2)} + K_{33}^{(3)} = \frac{EI}{L} \times 6$$

$$K_{67} = K_{35}^{(3)} = \frac{EI}{L} \times 2$$

$$K_{77} = K_{55}^{(3)} = \frac{EI}{L} \times 4$$

*(Nota: Na página 27, o coeficiente $K_{77}$ é escrito como $K_{66}^{(3)}$ na expressão manual, resultando em $4\frac{EI}{L}$.)*

---

## b) Vetor Global de Forças $\{F\}_{7\times 1}$

O vetor global de forças é montado combinando as forças nodais equivalentes de cada um dos elementos sob cargas distribuídas.

### Elemento 1 (Barra Inclinada sob Carga Perpendicular Uniforme $p$):
A barra de comprimento $L_e = 1{,}414L$ sofre uma carga uniforme $p$ perpendicular.
As forças nodais equivalentes no sistema local são:
$$\{f^{(1)}\} = \begin{bmatrix} 0 & -0{,}707pL & -0{,}167pL^2 & 0 & -0{,}707pL & 0{,}167pL^2 \end{bmatrix}^T$$

Rotacionando para coordenadas globais com $\theta = 45^\circ$:
$$\{F^{(1)}\} = \begin{bmatrix} 0{,}5pL & -0{,}5pL & -0{,}167pL^2 & 0{,}5pL & -0{,}5pL & 0{,}167pL^2 \end{bmatrix}^T$$

### Elemento 2 (Barra Horizontal sob Carga Triangular $p$):
A barra horizontal de comprimento $2L$ possui carregamento triangular com máximo $p$ na extremidade direita. As forças equivalentes são:
$$\{F^{(2)}\} = \begin{bmatrix} 0 & -0{,}3pL & -0{,}133pL^2 & 0 & -0{,}7pL & 0{,}2pL^2 \end{bmatrix}^T$$

### Elemento 3 (Barra Vertical sob Carga Uniforme Horizontal $p$):
A barra vertical de comprimento $L$ está sujeita a uma carga uniforme horizontal $p$ para a esquerda. As forças equivalentes globais calculadas são:
$$\{F^{(3)}\} = \begin{bmatrix} -0{,}5pL & 0 & -0{,}0833pL^2 & -0{,}5pL & 0 & 0{,}0833pL^2 \end{bmatrix}^T$$

### Montagem do Vetor Global $\{F\}$:
Somando as contribuições nos nós livres:

- **g.l. 1**: $F_{1,\text{end}}^{(1)} + F_{1,\text{start}}^{(2)} = 0{,}5pL + 0 = 0{,}5pL$
- **g.l. 2**: $F_{2,\text{end}}^{(1)} + F_{2,\text{start}}^{(2)} = -0{,}5pL - 0{,}3pL = -0{,}8pL$
- **g.l. 3**: $F_{3,\text{end}}^{(1)} + F_{3,\text{start}}^{(2)} = 0{,}167pL^2 - 0{,}133pL^2 = 0{,}034pL^2$
- **g.l. 4**: $F_{4,\text{end}}^{(2)} + F_{1,\text{start}}^{(3)} = 0 - 0{,}5pL = -0{,}5pL$
- **g.l. 5**: $F_{5,\text{end}}^{(2)} + F_{2,\text{start}}^{(3)} = -0{,}7pL + 0 = -0{,}7pL$
- **g.l. 6**: $F_{6,\text{end}}^{(2)} + F_{3,\text{start}}^{(3)} = 0{,}2pL^2 - 0{,}0833pL^2 = 0{,}1167pL^2$
- **g.l. 7**: $F_{6,\text{end}}^{(3)} = 0{,}0833pL^2$

> [!NOTE]
> **Nota sobre o 7º Termo do Vetor de Forças:**
> Devido ao erro de mapeamento na tabela de conectividade (onde o grau de liberdade global $7$ foi associado ao corte/momento final da barra), o estudante somou o momento nodal $M_2$ do Elemento 3 ($+0{,}0833pL^2$) na linha $7$ do vetor de forças globais.

O vetor de forças global final do manuscrito é:
$$\{F\} = \begin{bmatrix} 0{,}5pL \\ -0{,}8pL \\ 0{,}034pL^2 \\ -0{,}5pL \\ -0{,}7pL \\ 0{,}1167pL^2 \\ 0{,}0833pL^2 \end{bmatrix}$$


# Exercício 12

## Enunciado

Considere a estrutura da Figura 12 com secção transversal com inércia I e área A, e módulo de Young E. Determine o vetor de forças.

---

## Descrição da Estrutura

A estrutura consiste em um pórtico plano com 3 elementos de barra sob flexão e esforço axial:
- **Nó A** (apoio inferior esquerdo, $x = 0, y = 0$): Engastado.
- **Nó B** (cotovelo esquerdo): $(L/2, L)$.
- **Nó C** (cotovelo direito): $(3L/2, L)$.
- **Nó D** (apoio inferior direito, $x = 2L, y = 0$): Engastado.

### Propriedades dos Elementos:
- **Elemento 1**: Barra inclinada conectando o nó A (engaste) ao nó B (cotovelo esquerdo).
  - Projeções: Horizontal = $L/2$, Vertical = $L$.
  - Comprimento $L^{(1)} = \sqrt{(L/2)^2 + L^2} = 1{,}118L$.
  - Inclinação local $\theta_1 = 63{,}435^\circ$ ($\tan\theta_1 = 2$).
  - Carregamento: Carga triangularmente distribuída perpendicular ao elemento, apontando para fora (esquerda/cima), com intensidade variando de $0$ na base (nó A) até $p$ no cotovelo (nó B).
- **Elemento 2**: Barra horizontal conectando o nó B ao nó C.
  - Comprimento $L^{(2)} = L$.
  - Inclinação local $\theta_2 = 0^\circ$.
  - Carregamento: Carga polinomialmente distribuída vertical para baixo, dada por $p(x) = p \frac{x^3}{L^3}$ (de $0$ no nó B a $p$ no nó C).
- **Elemento 3**: Barra inclinada conectando o nó C ao nó D (engaste).
  - Projeções: Horizontal = $L/2$, Vertical = $L$.
  - Comprimento $L^{(3)} = L^{(1)} = 1{,}118L$.
  - Inclinação local $\theta_3 = -63{,}435^\circ$.
  - Carregamento: Carga uniformemente distribuída perpendicular ao elemento, apontando para fora (direita/cima), com intensidade uniforme $p$.

### Graus de Liberdade (6 g.l. livres):
- **No Nó B (Cotovelo Esquerdo)**:
  - $u_1$: Deslocamento horizontal global (positivo para a direita).
  - $u_2$: Deslocamento vertical global (positivo para cima).
  - $u_3$: Rotação global (positiva no sentido anti-horário).
- **No Nó C (Cotovelo Direito)**:
  - $u_4$: Deslocamento horizontal global (positivo para a direita).
  - $u_5$: Deslocamento vertical global (positivo para cima).
  - $u_6$: Rotação global (positiva no sentido anti-horário).

---

## Tabela de Conectividade (m.c.)
*(Montada para maior clareza de interpretação)*

| m.e | 1 | 2 | 3 | 4 | 5 | 6 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | - | 1 | 2 | 3 | $63{,}435^\circ$ | $1{,}118L$ |
| **(2)** | 1 | 2 | 3 | 4 | 5 | 6 | $0^\circ$ | $L$ |
| **(3)** | 4 | 5 | 6 | - | - | - | $-63{,}435^\circ$ | $1{,}118L$ |

---

## Vetor Global de Forças $\{F\}_{6\times 1}$

O objetivo deste exercício é a montagem do vetor global de forças $\{F\}$, acumulando as contribuições das forças nodais equivalentes dos três elementos nos graus de liberdade livres.

### 1. Elemento 1 (Barra Inclinada sob Carga Triangular Perpendicular $p$)
* Comprimento local: $L_e = 1{,}118L$
* Carregamento local (perpendicular à barra, apontando para "baixo" local, isto é, para fora da estrutura): $q(x) = -p \frac{x}{L_e}$

#### Vetor de Forças Nodal Local $\{f^{(1)}\}$:
Utilizando as fórmulas padrão para carga triangular (0 na extremidade inicial, $q$ na final):
- $V_1 = \frac{3 q L_{e}}{20} = \frac{3(-p) \times 1{,}118L}{20} = -0{,}1677 pL$
- $M_1 = \frac{q L_{e}^2}{30} = \frac{-p \times (1{,}118L)^2}{30} = -0{,}04167 pL^2$
- $V_2 = \frac{7 q L_{e}}{20} = \frac{7(-p) \times 1{,}118L}{20} = -0{,}3913 pL$
- $M_2 = -\frac{q L_{e}^2}{20} = -\frac{-p \times (1{,}118L)^2}{20} = 0{,}0625 pL^2$

$$\{f^{(1)}\} = \begin{bmatrix} 0 \\ -0{,}1677 pL \\ -0{,}04167 pL^2 \\ 0 \\ -0{,}3913 pL \\ 0{,}0625 pL^2 \end{bmatrix}$$

#### Transformação para Coordenadas Globais ($\theta = 63{,}435^\circ$):
Com $\cos(63{,}435^\circ) = 0{,}4472$ e $\sin(63{,}435^\circ) = 0{,}8944$:
$$\{F^{(1)}\} = [R^{(1)}]^T \{f^{(1)}\}$$

Para os graus de liberdade livres no nó final B ($u_1, u_2, u_3$):
- $F_{1,\text{end}}^{(1)} = - V_2 \sin\theta = -(-0{,}3913 pL) \times 0{,}8944 = 0{,}35 pL$
- $F_{2,\text{end}}^{(1)} = V_2 \cos\theta = -0{,}3913 pL \times 0{,}4472 = -0{,}175 pL$
- $F_{3,\text{end}}^{(1)} = M_2 = 0{,}0625 pL^2$

$$\begin{bmatrix} F_1^{(1)} \\ F_2^{(1)} \\ F_3^{(1)} \end{bmatrix} = \begin{bmatrix} 0{,}35 pL \\ -0{,}175 pL \\ 0{,}0625 pL^2 \end{bmatrix}$$

---

### 2. Elemento 2 (Barra Horizontal sob Carga Polinomial $p(x) = p x^3 / L^3$)
* Comprimento local: $L_e = L$
* Carregamento local (vertical para baixo): $p(x) = -p \frac{x^3}{L^3}$

As forças nodais equivalentes globais (que coincidem com as locais pois $\theta = 0^\circ$) são obtidas por integração com as funções de forma de Hermite:

- **Shear no nó inicial (g.l. 2)**:
  $$F_2^{(2)} = -\int_0^L \left(p \frac{x^3}{L^3}\right) \left(1 - \frac{3x^2}{L^2} + \frac{2x^3}{L^3}\right) dx = -p \left[ \frac{x^4}{4L^3} - \frac{3x^6}{6L^5} + \frac{2x^7}{7L^6} \right]_0^L = -pL \left(\frac{1}{4} - \frac{1}{2} + \frac{2}{7}\right) = -0{,}036 pL$$

- **Momento no nó inicial (g.l. 3)**:
  $$F_3^{(2)} = -\int_0^L \left(p \frac{x^3}{L^3}\right) \left(x - \frac{2x^2}{L} + \frac{x^3}{L^2}\right) dx = -p \left[ \frac{x^5}{5L^3} - \frac{2x^6}{6L^4} + \frac{x^7}{7L^5} \right]_0^L = -pL^2 \left(\frac{1}{5} - \frac{1}{3} + \frac{1}{7}\right) = -0{,}0095 pL^2$$

- **Shear no nó final (g.l. 5)**:
  $$F_5^{(2)} = -\int_0^L \left(p \frac{x^3}{L^3}\right) \left(\frac{3x^2}{L^2} - \frac{2x^3}{L^3}\right) dx = -p \left[ \frac{3x^6}{6L^5} - \frac{2x^7}{7L^6} \right]_0^L = -pL \left(\frac{1}{2} - \frac{2}{7}\right) = -0{,}214 pL$$

- **Momento no nó final (g.l. 6)**:
  $$F_6^{(2)} = -\int_0^L \left(p \frac{x^3}{L^3}\right) \left(\frac{x^3}{L^2} - \frac{x^2}{L}\right) dx = -p \left[ \frac{x^7}{7L^5} - \frac{x^6}{6L^4} \right]_0^L = -pL^2 \left(\frac{1}{7} - \frac{1}{6}\right) = 0{,}024 pL^2$$

Forças nodais equivalentes para o Elemento 2:
$$\{F^{(2)}\} = \begin{bmatrix} 0 \\ -0{,}036 pL \\ -0{,}0095 pL^2 \\ 0 \\ -0{,}214 pL \\ 0{,}024 pL^2 \end{bmatrix}$$

---

### 3. Elemento 3 (Barra Inclinada sob Carga Uniforme Perpendicular $p$)
* Comprimento local: $L_e = 1{,}118L$
* Carregamento local (perpendicular à barra, apontando para fora): $q = -p$ (carga uniforme para baixo no plano local)

#### Vetor de Forças Nodal Local $\{f^{(3)}\}$:
- $V_1 = V_2 = -\frac{p \times 1{,}118L}{2} = -0{,}559 pL$
- $M_1 = -\frac{p \times (1{,}118L)^2}{12} = -0{,}104 pL^2$
- $M_2 = \frac{p \times (1{,}118L)^2}{12} = 0{,}104 pL^2$

$$\{f^{(3)}\} = \begin{bmatrix} 0 \\ -0{,}559 pL \\ -0{,}104 pL^2 \\ 0 \\ -0{,}559 pL \\ 0{,}104 pL^2 \end{bmatrix}$$

#### Transformação para Coordenadas Globais ($\theta = -63{,}435^\circ$):
Com $\cos(-63{,}435^\circ) = 0{,}4472$ e $\sin(-63{,}435^\circ) = -0{,}8944$:
$$\{F^{(3)}\} = [R^{(3)}]^T \{f^{(3)}\}$$

Para os graus de liberdade livres no nó inicial C ($u_4, u_5, u_6$):
- $F_{4,\text{start}}^{(3)} = - V_1 \sin\theta = -(-0{,}559 pL) \times (-0{,}8944) = -0{,}5 pL$
- $F_{5,\text{start}}^{(3)} = V_1 \cos\theta = -0{,}559 pL \times 0{,}4472 = -0{,}249 pL$
- $F_{6,\text{start}}^{(3)} = M_1 = -0{,}104 pL^2$

$$\begin{bmatrix} F_4^{(3)} \\ F_5^{(3)} \\ F_6^{(3)} \end{bmatrix} = \begin{bmatrix} -0{,}5 pL \\ -0{,}249 pL \\ -0{,}104 pL^2 \end{bmatrix}$$

---

## Montagem do Vetor Global $\{F\}$

Somando as contribuições de cada elemento nos respectivos graus de liberdade livres:

- **g.l. 1**: $F_1 = F_{1,\text{end}}^{(1)} + F_{1,\text{start}}^{(2)} = 0{,}35 pL + 0 = 0{,}35 pL$
- **g.l. 2**: $F_2 = F_{2,\text{end}}^{(1)} + F_{2,\text{start}}^{(2)} = -0{,}175 pL - 0{,}036 pL = -0{,}211 pL$
- **g.l. 3**: $F_3 = F_{3,\text{end}}^{(1)} + F_{3,\text{start}}^{(2)} = 0{,}0625 pL^2 - 0{,}0095 pL^2 = 0{,}053 pL^2$
- **g.l. 4**: $F_4 = F_{4,\text{end}}^{(2)} + F_{4,\text{start}}^{(3)} = 0 - 0{,}5 pL = -0{,}5 pL$
- **g.l. 5**: $F_5 = F_{5,\text{end}}^{(2)} + F_{5,\text{start}}^{(3)} = -0{,}214 pL - 0{,}249 pL = -0{,}463 pL$
- **g.l. 6**: $F_6 = F_{6,\text{end}}^{(2)} + F_{6,\text{start}}^{(3)} = 0{,}024 pL^2 + 0{,}104 pL^2 = 0{,}128 pL^2$

> [!IMPORTANT]
> **Nota sobre o 6º Termo ($F_6$) no Manuscrito:**
> No cálculo manual da soma do 6º termo (momento global no Nó C), o estudante fez uma soma direta $0{,}024 pL^2 + 0{,}104 pL^2 = 0{,}128 pL^2$. No entanto, o momento equivalente inicial do Elemento 3 é negativo ($M_1 = -0{,}104 pL^2$), logo a soma matematicamente correta deveria ser $0{,}024 - 0{,}104 = -0{,}080 pL^2$. Transcrevemos aqui os valores exatos calculados pelo estudante para manter a fidelidade perfeita com a resolução original do manuscrito.

O vetor de forças global final conforme escrito na página 30 é:
$$\{F\} = \begin{bmatrix} 0{,}35 pL \\ -0{,}211 pL \\ 0{,}053 pL^2 \\ -0{,}5 pL \\ -0{,}463 pL \\ 0{,}128 pL^2 \end{bmatrix}$$


# Exercício 13

## Enunciado

Considere a viga representada na Figura 13 com secção transversal com inércia I e área A, módulo de Young E, e massa volúmica $\rho$. Utilizando o menor número de elementos finitos possível, determine:

a) A rotação exata a meio da viga.
b) O momento fletor da viga em x=L/2.
c) A rotação aproximada em x=3L/4.
d) A tensão normal da viga em x= L/4.
e) As frequências naturais e os respetivos modos de vibração. Represente os modos de vibração.

---

## Descrição da Estrutura

O problema analisa uma viga contínua de comprimento total $L$, engastada em ambas as extremidades (A e B). A viga é modelada por dois elementos de igual comprimento $h = L/2$:
- **Elemento 1** (Esquerdo): Conecta o engaste esquerdo A ao nó central. Comprimento $L^{(1)} = L/2$. Sujeito a uma carga uniforme distribuída $3p$ orientada para cima.
- **Elemento 2** (Direito): Conecta o nó central ao engaste direito B. Comprimento $L^{(2)} = L/2$. Sujeito a uma carga linearmente variável (trapezoidal) orientada para cima, de $3p$ no nó central a $2p$ no engaste direito B.

### Graus de Liberdade do Nó Central (2 g.l.):
- $u_1$: Deslocamento vertical global (positivo para cima).
- $u_2$: Rotação global (positiva no sentido anti-horário).

---

## Tabela de Conectividade (m.c.)

| m.e | 1 | 2 | 3 | 4 | L |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | 1 | 2 | $L/2$ |
| **(2)** | 1 | 2 | - | - | $L/2$ |

---

## a) Matriz de Rigidez Global $[K]_{2\times 2}$

Os coeficientes de rigidez global associados aos graus de liberdade $u_1$ e $u_2$ são montados por superposição dos termos locais correspondentes da matriz de rigidez clássica de viga de Euler-Bernoulli:

- **g.l. 1 ($u_1$)**:
  $$K_{11} = K_{33}^{(1)} + K_{11}^{(2)} = \frac{EI}{(L/2)^3} \times 12 + \frac{EI}{(L/2)^3} \times 12 = 96\frac{EI}{L^3} + 96\frac{EI}{L^3} = 192 \frac{EI}{L^3}$$

- **g.l. 2 ($u_2$)**:
  $$K_{22} = K_{44}^{(1)} + K_{22}^{(2)} = \frac{EI}{(L/2)^3} \times 4 \left(\frac{L}{2}\right)^2 + \frac{EI}{(L/2)^3} \times 4 \left(\frac{L}{2}\right)^2 = 8\frac{EI}{L} + 8\frac{EI}{L} = 16 \frac{EI}{L}$$

- **Acoplamento ($u_1 \times u_2$)**:
  $$K_{12} = K_{34}^{(1)} + K_{12}^{(2)} = \frac{EI}{(L/2)^3} \left(-6 \times \frac{L}{2}\right) + \frac{EI}{(L/2)^3} \left(6 \times \frac{L}{2}\right) = -24\frac{EI}{L^2} + 24\frac{EI}{L^2} = 0$$

A matriz de rigidez global final é:
$$[K] = \frac{EI}{L^3} \begin{bmatrix} 192 & 0 \\ 0 & 16L^2 \end{bmatrix}$$

---

## b) Vetor Global de Forças $\{F\}_{2\times 1}$ e Deslocamentos

### Cargas Nodais Equivalentes:

#### Elemento 1 (Carga Uniforme $3p$ para cima):
No nó central (extremidade final do Elemento 1, correspondendo a $u_1, u_2$):
- $V_2 = \frac{3p \times (L/2)}{2} = 0{,}75 pL$
- $M_2 = -\frac{3p \times (L/2)^2}{12} = -0{,}0625 pL^2$

$$\{F^{(1)}\}_{\text{central}} = \begin{bmatrix} 0{,}75 pL \\ -0{,}0625 pL^2 \end{bmatrix}$$

#### Elemento 2 (Carga Trapezoidal de $3p$ a $2p$ para cima):
O carregamento local é modelado por $f(x) = 3p - p \frac{x}{L/2}$. Decompondo a carga em uma parcela uniforme de $3p$ e uma parcela triangular de intensidade linear variando de $0$ a $-p$:
No nó central (extremidade inicial do Elemento 2, correspondendo a $u_1, u_2$):
- $V_1 = V_{1,\text{retangular}} + V_{1,\text{triangular}} = \frac{3p \times (L/2)}{2} + \frac{3(-p) \times (L/2)}{20} = 0{,}75 pL - 0{,}075 pL = 0{,}675 pL$
- $M_1 = M_{1,\text{retangular}} + M_{1,\text{triangular}} = \frac{3p \times (L/2)^2}{12} + \frac{-p \times (L/2)^2}{30} = 0{,}0625 pL^2 - 0{,}00833 pL^2 = 0{,}0542 pL^2$

$$\{F^{(2)}\}_{\text{central}} = \begin{bmatrix} 0{,}675 pL \\ 0{,}0542 pL^2 \end{bmatrix}$$

### Vetor Global de Forças $\{F\}$:
Somando as contribuições no nó central:
- $F_1 = 0{,}75 pL + 0{,}675 pL = 1{,}425 pL$
- $F_2 = -0{,}0625 pL^2 + 0{,}0542 pL^2 = -0{,}0083 pL^2$

$$\{F\} = \begin{bmatrix} 1{,}425 pL \\ -0{,}0083 pL^2 \end{bmatrix}$$

### Resolução dos Deslocamentos:
Resolvendo $[K]\{u\} = \{F\}$:
1. $192 \frac{EI}{L^3} u_1 = 1{,}425 pL \implies u_1 = 0{,}00742 \frac{p L^4}{EI}$
2. $16 \frac{EI}{L} u_2 = -0{,}0083 pL^2 \implies u_2 = -0{,}000519 \frac{p L^3}{EI}$

---

## c) Momento Fletor da Viga no Ponto Central ($x = L/2$)

O momento fletor é calculado com a derivada de segunda ordem da função de deslocamento vertical $v(x)$ do Elemento 1 (utilizando as funções de forma de Hermite $N_3$ e $N_4$ referentes ao nó central livre):
$$v(x) = N_3(x) u_1 + N_4(x) u_2 = \left( \frac{3x^2}{(L/2)^2} - \frac{2x^3}{(L/2)^3} \right) u_1 + \left( -\frac{x^2}{L/2} + \frac{x^3}{(L/2)^2} \right) u_2$$

Derivando duas vezes em ordem a $x$:
$$\frac{d^2 v}{dx^2} = \left( \frac{6}{(L/2)^2} - \frac{12x}{(L/2)^3} \right) u_1 + \left( -\frac{2}{L/2} + \frac{6x}{(L/2)^2} \right) u_2$$

Sabendo que $M(x) = EI \frac{d^2 v}{dx^2}$, e avaliando no ponto central $x = L/2$:
$$M(L/2) = EI \left[ \left( \frac{6}{(L/2)^2} - \frac{12(L/2)}{(L/2)^3} \right) u_1 + \left( -\frac{2}{L/2} + \frac{6(L/2)}{(L/2)^2} \right) u_2 \right]$$
$$M(L/2) = EI \left[ -\frac{24}{L^2} u_1 + \frac{8}{L} u_2 \right]$$

Substituindo os valores calculados de $u_1$ e $u_2$:
$$M(L/2) = -\frac{24}{L^2} \left(0{,}00742 pL^4\right) + \frac{8}{L} \left(-0{,}000519 pL^3\right) = -0{,}17808 pL^2 - 0{,}004152 pL^2 = -0{,}1822 pL^2 \approx -0{,}182 pL^2$$

---

## d) Rotação Aproximada em $x = 3L/4$

O ponto $x = 3L/4$ corresponde a $x_{\text{local}} = L/4$ no Elemento 2. A rotação $\theta(x) = \frac{dv}{dx}$ neste elemento é obtida a partir das funções de Hermite $N_1$ e $N_2$ (associadas ao nó central móvel inicial):
$$v(x) = N_1(x) u_1 + N_2(x) u_2 = \left( 1 - \frac{3x^2}{(L/2)^2} + \frac{2x^3}{(L/2)^3} \right) u_1 + \left( x - \frac{2x^2}{L/2} + \frac{x^3}{(L/2)^2} \right) u_2$$

$$\theta(x) = \frac{dv}{dx} = \left( -\frac{6x}{(L/2)^2} + \frac{6x^2}{(L/2)^3} \right) u_1 + \left( 1 - \frac{4x}{L/2} + \frac{3x^2}{(L/2)^2} \right) u_2$$

Substituindo $x = L/4$ ($x = h/2$):
- Termo de $u_1$: $-\frac{6(L/4)}{(L/2)^2} + \frac{6(L/4)^2}{(L/2)^3} = -\frac{3}{L}$
- Termo de $u_2$: $1 - \frac{4(L/4)}{L/2} + \frac{3(L/4)^2}{(L/2)^2} = -0{,}25$

$$\theta(L/4) = -\frac{3}{L} \left(0{,}00742 \frac{p L^4}{EI}\right) - 0{,}25 \left(-0{,}000519 \frac{p L^3}{EI}\right) = -0{,}02226 \frac{p L^3}{EI} + 0{,}00013 \frac{p L^3}{EI} = -0{,}02213 \frac{p L^3}{EI}$$

---

## e) Tensão Normal da Viga em $x = L/4$

O ponto $x = L/4$ corresponde ao ponto médio do Elemento 1 ($x_{\text{local}} = L/4$).
O momento fletor no Elemento 1 em $x = L/4$ é:
$$M(L/4) = EI \left[ \left( \frac{6}{(L/2)^2} - \frac{12(L/4)}{(L/2)^3} \right) u_1 + \left( -\frac{2}{L/2} + \frac{6(L/4)}{(L/2)^2} \right) u_2 \right]$$
Como o termo de $u_1$ anula-se em $x = h/2$:
$$M(L/4) = EI \left[ 0 \times u_1 + \frac{2}{L} u_2 \right] = 2\frac{EI}{L} \left(-0{,}000519 \frac{p L^3}{EI}\right) = -0{,}001038 pL^2$$

A tensão normal devido à flexão é:
$$\sigma = -\frac{M y}{I} = \frac{0{,}001038 p L^2 y}{I}$$

---

## f) Análise Dinâmica (Vibrações Livres)

### Matriz de Massa Global $[M]_{2\times 2}$ (Consistente):
Composta pelas contribuições da matriz de massa consistente de Euler-Bernoulli dos Elementos 1 e 2 (comprimento $h = L/2$):

- **g.l. 1 ($u_1$)**:
  $$M_{11} = M_{33}^{(1)} + M_{11}^{(2)} = \frac{\rho A (L/2)}{420} \times 156 + \frac{\rho A (L/2)}{420} \times 156 = 0{,}3714 \rho A L$$

- **g.l. 2 ($u_2$)**:
  $$M_{22} = M_{44}^{(1)} + M_{22}^{(2)} = \frac{\rho A (L/2)}{420} \times 4\left(\frac{L}{2}\right)^2 + \frac{\rho A (L/2)}{420} \times 4\left(\frac{L}{2}\right)^2 = 0{,}002381 \rho A L^3$$

- **Acoplamento ($M_{12}$)**:
  $$M_{12} = M_{34}^{(1)} + M_{12}^{(2)} = \frac{\rho A (L/2)}{420} \left(-22 \times \frac{L}{2}\right) + \frac{\rho A (L/2)}{420} \left(22 \times \frac{L}{2}\right) = 0$$

A matriz global de massa consistente é:
$$[M] = \rho A L \begin{bmatrix} 0{,}371 & 0 \\ 0 & 0{,}002381 L^2 \end{bmatrix}$$

### Equação de Frequências Naturais:
$$|[K] - \omega^2 [M]| = 0$$

Substituindo $[K]$ e $[M]$ e definindo $\lambda = \frac{\omega^2 \rho A L^4}{EI}$:
$$\left| \begin{bmatrix} 192 & 0 \\ 0 & 16L^2 \end{bmatrix} - \lambda \begin{bmatrix} 0{,}371 & 0 \\ 0 & 0{,}002381 L^2 \end{bmatrix} \right| = 0$$
$$(192 - 0{,}371\lambda)(16 - 0{,}002381\lambda) = 0$$
$$0{,}00088\lambda^2 - 6{,}393\lambda + 3072 = 0$$

Resolvendo a equação do segundo grau para $\lambda$:
- $\lambda_1 = 517{,}371$
- $\lambda_2 = 6747{,}4$

As frequências naturais de vibração são:
- $\omega_1 = \sqrt{\frac{517{,}371 EI}{\rho A L^4}} = \frac{22{,}746}{L^2}\sqrt{\frac{EI}{\rho A}}$
- $\omega_2 = \sqrt{\frac{6747{,}4 EI}{\rho A L^4}} = \frac{82{,}14}{L^2}\sqrt{\frac{EI}{\rho A}}$

---

### Modos de Vibração (Forma do Modo):

#### Modo 1 ($\omega_1$):
Substituindo $\lambda_1 = 517{,}371$ no sistema homogêneo $[K - \omega^2 M]\{u\} = \{0\}$:
$$\begin{bmatrix} 0{,}055 & 0 \\ 0 & 14{,}768 L^2 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
Como $0{,}055 \approx 0$ (erro de truncamento numérico), o grau de liberdade $u_1$ é o modo livre, logo:
* $u_1 = 1$
* $u_2 = 0$
Este é o **modo simétrico** (deslocamento vertical puro no centro).

#### Modo 2 ($\omega_2$):
Substituindo $\lambda_2 = 6747{,}4$:
$$\begin{bmatrix} -2311 & 0 \\ 0 & -0{,}066 L^2 \end{bmatrix} \begin{bmatrix} u_1 \\ u_2 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$
Como $-0{,}066 \approx 0$ (erro de truncamento numérico), o grau de liberdade $u_2$ é o modo livre, logo:
* $u_1 = 0$
* $u_2 = 1$
Este é o **modo antissimétrico** (rotação pura no centro).

> [!IMPORTANT]
> **Nota sobre a Associação de Modos no Manuscrito:**
> Na página 34, o estudante cometeu uma inversão conceitual ao desenhar os modos:
> 1. Para $\lambda_1 = 517{,}371$, ele escreveu $u_1 = 0, u_2 = 1$ e desenhou a deformada antissimétrica correspondente ao Modo 2.
> 2. Para $\lambda_2 = 6747{,}4$, ele escreveu $u_1 = 0, u_2 = 0$ (provavelmente querendo dizer $u_1 = 1, u_2 = 0$) e desenhou a deformada simétrica correspondente ao Modo 1.
> Esta inversão inverte a ordenação física das frequências, pois o modo simétrico (flexão simples com 1 arco) possui menor energia e, consequentemente, menor frequência de vibração ($\omega_1$) do que o modo antissimétrico (2 arcos com rotação central). Transcrevemos o desenvolvimento exatamente como feito pelo estudante no manuscrito original.


# Exercício 14

## Enunciado

Considere a estrutura da Figura 14, em que as massas m estão sujeitas ao efeito de gravidade. Determine a força em cada uma das molas, utilizando o primeiro teorema de Castigliano (despreze a massa das molas).

---

## Descrição da Estrutura

O problema analisa um sistema mecânico dinâmico/estático unidimensional composto por duas massas e duas molas dispostas verticalmente sob a ação da gravidade (g.l. vertical positivo para baixo):
- **Teto** (Engaste fixo superior).
- **Mola 1**: Rigidez $k$, conectando o teto à Massa 1 ($u_1$).
- **Massa 1**: Massa $m$.
- **Mola 2**: Rigidez $2k$, conectando a Massa 1 ($u_1$) à Massa 2 ($u_2$).
- **Massa 2**: Massa $m$.

### Graus de Liberdade (2 g.l. livres):
- $u_1$: Deslocamento vertical da Massa 1 (positivo para baixo).
- $u_2$: Deslocamento vertical da Massa 2 (positivo para baixo).

---

## Tabela de Conectividade (m.c.)

| m.e | 1 | 2 |
| :---: | :---: | :---: |
| **(1)** | - | 1 |
| **(2)** | 1 | 2 |

---

## Matriz de Rigidez Global $[K]_{2\times 2}$

Os termos de rigidez global são montados combinando as rigidezes locais de cada mola:
- $K_{11} = K_{22}^{(1)} + K_{11}^{(2)} = k + 2k = 3k$
- $K_{12} = K_{12}^{(2)} = -2k$
- $K_{22} = K_{22}^{(2)} = 2k$

A matriz de rigidez global $[K]$ é:
$$[K] = \begin{bmatrix} 3k & -2k \\ -2k & 2k \end{bmatrix}$$

---

## Resolução pelo Princípio da Energia Potencial Mínima

Apesar do título indicar o uso do Teorema de Castigliano, o manuscrito resolve o problema através do Princípio da Energia Potencial Mínima ($\Pi = U_e - W$).

### 1. Energia de Deformação Elástica ($U_e$):
$$U_e = \frac{1}{2} k u_1^2 + \frac{1}{2} (2k) (u_2 - u_1)^2 = \frac{1}{2} \left[ k u_1^2 + 2k\left(u_1^2 - 2u_1u_2 + u_2^2\right) \right]$$

### 2. Trabalho das Forças Externas ($W$):
Ambas as massas sofrem a força peso $mg$ orientada para baixo (sentido positivo dos deslocamentos):
$$W = mg u_1 + mg u_2$$

### 3. Energia Potencial Total ($\Pi$):
$$\Pi = U_e - W = \frac{1}{2} \left[ k u_1^2 + 2k\left(u_1^2 - 2u_1u_2 + u_2^2\right) \right] - mg u_1 - mg u_2$$

---

## Minimização da Energia Potencial ($\delta\Pi = 0$)

Derivando a energia potencial total $\Pi$ em relação a cada grau de liberdade livre ($u_1$ e $u_2$):

- **Em relação a $u_1$**:
  $$\frac{\partial \Pi}{\partial u_1} = 0 \implies k u_1 + 2k u_1 - 2k u_2 = mg \implies 3k u_1 - 2k u_2 = mg$$

- **Em relação a $u_2$**:
  $$\frac{\partial \Pi}{\partial u_2} = 0 \implies 2k u_2 - 2k u_1 = mg \implies -2k u_1 + 2k u_2 = mg$$

### Sistema de Equações:
$$\begin{cases} 3k u_1 - 2k u_2 = mg \\ -2k u_1 + 2k u_2 = mg \end{cases}$$

Somando as duas equações diretamente para eliminar $u_2$:
$$k u_1 = 2mg \implies u_1 = \frac{2mg}{k}$$

Substituindo $u_1$ na segunda equação para obter $u_2$:
$$2k u_2 = mg + 2k \left(\frac{2mg}{k}\right) = 5mg \implies u_2 = \frac{5mg}{2k}$$

---

## Forças Internas nas Molas

- **Força na Mola 1 ($F^{(1)}$)**:
  $$F^{(1)} = k u_1 = k \left(\frac{2mg}{k}\right) = 2mg$$

- **Força na Mola 2 ($F^{(2)}$)**:
  $$F^{(2)} = 2k (u_2 - u_1) = 2k \left( \frac{5mg}{2k} - \frac{2mg}{k} \right) = 2k \left( \frac{mg}{2k} \right) = mg$$


# Exercício 15

## Enunciado

Considere a estrutura da Figura 15 com secção transversal com inércia I e área A, e módulo de Young E. Utilizando o menor número de elementos finitos possível, determine o vetor de forças.

---

## Descrição da Estrutura

A estrutura consiste em um pórtico plano com 3 elementos de barra sob flexão e esforço axial:
- **Nó A** (apoio superior esquerdo): Engastado.
- **Nó B** (cotovelo esquerdo): $(L, 0)$.
- **Nó C** (cotovelo direito): $(3L, 0)$.
- **Nó D** (apoio inferior direito): Engastado em $(3L, -L)$.

### Propriedades dos Elementos:
- **Elemento 1**: Barra inclinada conectando o engaste superior A ao nó B (cotovelo esquerdo).
  - Projeções: Horizontal = $L$, Vertical = $-L$.
  - Comprimento $L^{(1)} = \sqrt{L^2 + L^2} = 1{,}414L$.
  - Inclinação local $\theta_1 = -45^\circ$.
  - Carregamento: Carga triangularmente distribuída perpendicular ao elemento, apontando para "baixo/dentro" local, com intensidade variando de $0$ no engaste (nó A) até $2p$ no cotovelo (nó B).
- **Elemento 2**: Barra horizontal conectando o nó B ao nó C.
  - Comprimento $L^{(2)} = 2L$.
  - Inclinação local $\theta_2 = 0^\circ$.
  - Carregamento: Carga polinomialmente distribuída vertical para baixo, dada por $p(x) = \frac{2p x^2}{L}$.
- **Elemento 3**: Barra vertical conectando o nó C ao engaste inferior D.
  - Comprimento $L^{(3)} = L$.
  - Inclinação local $\theta_3 = -90^\circ$.
  - Carregamento: Carga horizontal uniforme de intensidade $3p$ direcionada para a esquerda (perpendicular ao elemento).

### Graus de Liberdade livres (6 g.l. livres):
- **No Nó B (Cotovelo Esquerdo)**:
  - $u_1$: Deslocamento horizontal global (positivo para a direita).
  - $u_2$: Deslocamento vertical global (positivo para cima).
  - $u_3$: Rotação global (positiva no sentido anti-horário).
- **No Nó C (Cotovelo Direito)**:
  - $u_4$: Deslocamento horizontal global (positivo para a direita).
  - $u_5$: Deslocamento vertical global (positivo para cima).
  - $u_6$: Rotação global (positiva no sentido anti-horário).

---

## Tabela de Conectividade (m.c.)
*(Montada para maior clareza de interpretação)*

| m.e | 1 | 2 | 3 | 4 | 5 | 6 | $\theta$ | L |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **(1)** | - | - | - | 1 | 2 | 3 | $-45^\circ$ | $1{,}414L$ |
| **(2)** | 1 | 2 | 3 | 4 | 5 | 6 | $0^\circ$ | $2L$ |
| **(3)** | 4 | 5 | 6 | - | - | - | $-90^\circ$ | $L$ |

---

## Vetor Global de Forças $\{F\}_{6\times 1}$

O objetivo deste exercício é a montagem do vetor global de forças $\{F\}$, acumulando as contribuições das forças nodais equivalentes dos três elementos nos graus de liberdade livres.

### 1. Elemento 1 (Barra Inclinada sob Carga Triangular Perpendicular $2p$)
* Comprimento local: $L_e = 1{,}414L$
* Carregamento local (perpendicular à barra, apontando para baixo local): $q(x) = -2p \frac{x}{L_e}$

#### Vetor de Forças Nodal Local $\{f^{(1)}\}$:
Utilizando as fórmulas clássicas de carga triangular (0 na extremidade inicial, $q$ na final):
- $V_1 = \frac{3 q L_{e}}{20} = \frac{3(-2p) \times 1{,}414L}{20} = -0{,}4242 pL$
- $M_1 = \frac{q L_{e}^2}{30} = \frac{-2p \times (1{,}414L)^2}{30} = -0{,}133 pL^2$
- $V_2 = \frac{7 q L_{e}}{20} = \frac{7(-2p) \times 1{,}414L}{20} = -0{,}99 pL$
- $M_2 = -\frac{q L_{e}^2}{20} = -\frac{-2p \times (1{,}414L)^2}{20} = 0{,}2 pL^2$

$$\{f^{(1)}\} = \begin{bmatrix} 0 \\ -0{,}4242 pL \\ -0{,}133 pL^2 \\ 0 \\ -0{,}99 pL \\ 0{,}2 pL^2 \end{bmatrix}$$

#### Transformação para Coordenadas Globais ($\theta = -45^\circ$):
Com $\cos(-45^\circ) = 0{,}707$ e $\sin(-45^\circ) = -0{,}707$:
$$\{F^{(1)}\} = [R^{(1)}]^T \{f^{(1)}\}$$

As componentes da força no nó inicial A (engaste, não livre) e nó final B (livre) são:
- **No Nó A (Início, g.l. não livres)**:
  - $F_{1,\text{start}}^{(1)} = - V_1 \sin\theta = -(-0{,}4242 pL) \times (-0{,}707) = -0{,}3 pL$
  - $F_{2,\text{start}}^{(1)} = V_1 \cos\theta = -0{,}4242 pL \times 0{,}707 = -0{,}3 pL$
  - $F_{3,\text{start}}^{(1)} = M_1 = -0{,}133 pL^2$
- **No Nó B (Fim, g.l. livres 1, 2, 3)**:
  - $F_{1,\text{end}}^{(1)} = - V_2 \sin\theta = -(-0{,}99 pL) \times (-0{,}707) = -0{,}7 pL$
  - $F_{2,\text{end}}^{(1)} = V_2 \cos\theta = -0{,}99 pL \times 0{,}707 = -0{,}7 pL$
  - $F_{3,\text{end}}^{(1)} = M_2 = 0{,}2 pL^2$

$$\{F^{(1)}\} = \begin{bmatrix} -0{,}3 pL \\ -0{,}3 pL \\ -0{,}133 pL^2 \\ -0{,}7 pL \\ -0{,}7 pL \\ 0{,}2 pL^2 \end{bmatrix}$$

> [!IMPORTANT]
> **Nota sobre o Mapeamento do Elemento 1 no Manuscrito:**
> Na montagem final do vetor global de forças (ver seção de montagem), o estudante cometeu um deslize conceitual importante ao mapear as forças do Elemento 1 nos g.l. do Nó B:
> 1. Para as forças verticais e horizontais (linhas 1 e 2 do vetor de forças global), ele usou incorretamente as forças do nó inicial A ($-0{,}3 pL$ e $-0{,}3 pL$) em vez das forças do nó final B ($-0{,}7 pL$ e $-0{,}7 pL$).
> 2. Para o momento (linha 3 do vetor global), ele usou corretamente a força do nó final B ($0{,}2 pL^2$).
> Para preservar a total rastreabilidade do manuscrito original, os valores exatos escritos pelo estudante foram mantidos e indicados na montagem final.

---

### 2. Elemento 2 (Barra Horizontal sob Carga Polinomial $p(x) = 2p x^2 / L$)
* Comprimento local: $L_e = 2L$
* Carregamento local (vertical para baixo): $p(x) = - \frac{2p x^2}{L}$

> [!NOTE]
> **Nota sobre Inconsistência de Unidades no Carregamento:**
> A fórmula dada no manuscrito para a carga de Elemento 2 é $p(x) = \frac{2p x^2}{L}$. Matematicamente, a integração resulta em forças proporcionais a $pL^2$ e momentos proporcionais a $pL^3$, em vez de $pL$ e $pL^2$. Isso significa que o parâmetro $p$ foi considerado pelo estudante como tendo unidade de força por unidade de área ($[F]/[L]^2$) ou houve um erro conceitual na escrita da equação do carregamento. Transcrevemos os cálculos integrados e as potências exatas de $L$ conforme escritos no manuscrito.

As forças nodais equivalentes globais (que coincidem com as locais pois $\theta = 0^\circ$) obtidas por integração com as funções de forma de Hermite são:

- **Shear no nó inicial (g.l. 2)**:
  $$F_2^{(2)} = -\int_0^{2L} \left( \frac{2p x^2}{L} \right) \left( 1 - \frac{3x^2}{(2L)^2} + \frac{2x^3}{(2L)^3} \right) dx = -\int_0^{2L} \left( \frac{2p x^2}{L} - \frac{6p x^4}{4L^3} + \frac{4p x^5}{8L^4} \right) dx = -1{,}06 pL^2$$
  *(Matematicamente, a integração exata fornece $-1{,}0667 pL^2 \approx -1{,}07 pL^2$, o estudante arredondou para $-1{,}06 pL^2$.)*

- **Momento no nó inicial (g.l. 3)**:
  $$F_3^{(2)} = -\int_0^{2L} \left( \frac{2p x^2}{L} \right) \left( x - \frac{2x^2}{2L} + \frac{x^3}{(2L)^2} \right) dx = -\int_0^{2L} \left( \frac{2p x^3}{L} - \frac{4p x^4}{2L^2} + \frac{2p x^5}{4L^3} \right) dx = -0{,}533 pL^3$$
  *(Matematicamente, a integração exata fornece $-\frac{8}{15}pL^3 = -0{,}5333 pL^3$.)*

- **Shear no nó final (g.l. 5)**:
  $$F_5^{(2)} = -\int_0^{2L} \left( \frac{2p x^2}{L} \right) \left( \frac{3x^2}{(2L)^2} - \frac{2x^3}{(2L)^3} \right) dx = -\int_0^{2L} \left( \frac{6p x^4}{4L^3} - \frac{4p x^5}{8L^4} \right) dx = -4{,}267 pL^2$$
  *(Matematicamente, a integração exata fornece $-\frac{64}{15}pL^2 = -4{,}2667 pL^2$.)*

- **Momento no nó final (g.l. 6)**:
  $$F_6^{(2)} = -\int_0^{2L} \left( \frac{2p x^2}{L} \right) \left( -\frac{x^2}{2L} + \frac{x^3}{(2L)^2} \right) dx = -\int_0^{2L} \left( -\frac{2p x^4}{2L^2} + \frac{2p x^5}{4L^3} \right) dx = 1{,}067 pL^3$$
  *(Matematicamente, a integração exata fornece $\frac{16}{15}pL^3 = 1{,}0667 pL^3$.)*

Vetor de forças nodais equivalentes do Elemento 2:
$$\{F^{(2)}\} = \begin{bmatrix} 0 \\ -1{,}06 pL^2 \\ -0{,}533 pL^3 \\ 0 \\ -4{,}267 pL^2 \\ 1{,}067 pL^3 \end{bmatrix}$$

---

### 3. Elemento 3 (Barra Vertical sob Carga Uniforme Horizontal $3p$ para a Esquerda)
* Comprimento local: $L_e = L$
* Carregamento: Carga uniforme lateral $3p$ apontando para a esquerda (negativo global $X$).

#### Vetor de Forças Nodal Global $\{F^{(3)}\}$:
Sendo uma barra perfeitamente vertical conectando o nó central C (início) ao engaste D (fim):
- No nó inicial C (g.l. livres 4, 5, 6):
  - $F_{4,\text{start}}^{(3)} = -\frac{3p \times L}{2} = -1{,}5 pL$
  - $F_{5,\text{start}}^{(3)} = 0$
  - $F_{6,\text{start}}^{(3)} = -\frac{3p \times L^2}{12} = -0{,}25 pL^2$
- No nó final D (engastado):
  - $F_{1,\text{end}}^{(3)} = -1{,}25 pL$ *(Nota: O valor correto deveria ser $-1{,}5 pL$, mas o estudante anotou $-1{,}25 pL$)*
  - $F_{2,\text{end}}^{(3)} = 0$
  - $F_{3,\text{end}}^{(3)} = \frac{3p \times L^2}{12} = 0{,}25 pL^2$

$$\{F^{(3)}\} = \begin{bmatrix} -1{,}5 pL \\ 0 \\ -0{,}25 pL^2 \\ -1{,}25 pL \\ 0 \\ 0{,}25 pL^2 \end{bmatrix}$$

Como o nó final D está engastado, utilizamos apenas as forças associadas ao nó inicial C (DOFs 4, 5, 6).

---

## Montagem do Vetor Global $\{F\}$

Somando as contribuições de cada elemento nos respectivos graus de liberdade livres:

- **g.l. 1**: $F_1 = F_{1,\text{end}}^{(1)} + F_{1,\text{start}}^{(2)}$
  * No manuscrito (lado esquerdo da soma): o estudante anota $-0{,}7 pL + 0$, mas na montagem final do lado direito escreve $-0{,}3 pL$.
- **g.l. 2**: $F_2 = F_{2,\text{end}}^{(1)} + F_{2,\text{start}}^{(2)}$
  * No manuscrito: o estudante anota $-0{,}7 pL - 1{,}06 pL^2$ na soma do lado esquerdo, mas no vetor final escreve $-0{,}3 pL + 1{,}06 pL^2$ (cometendo o erro de trocar o sinal de $1{,}06 pL^2$ e mudando para $-0{,}3 pL$).
- **g.l. 3**: $F_3 = F_{3,\text{end}}^{(1)} + F_{3,\text{start}}^{(2)} = 0{,}2 pL^2 - 0{,}533 pL^3$
- **g.l. 4**: $F_4 = F_{4,\text{end}}^{(2)} + F_{4,\text{start}}^{(3)} = 0 - 1{,}5 pL = -1{,}5 pL$
- **g.l. 5**: $F_5 = F_{5,\text{end}}^{(2)} + F_{5,\text{start}}^{(3)} = -4{,}267 pL^2 + 0 = -4{,}267 pL^2$
- **g.l. 6**: $F_6 = F_{6,\text{end}}^{(2)} + F_{6,\text{start}}^{(3)} = 1{,}067 pL^3 - 0{,}25 pL^2$

O vetor global de forças conforme escrito de forma final pelo estudante na página 37 é:
$$\{F\} = \begin{bmatrix} -0{,}3 pL \\ -0{,}3 pL + 1{,}06 pL^2 \\ 0{,}2 pL^2 - 0{,}533 pL^3 \\ -1{,}5 pL \\ -4{,}267 pL^2 \\ 1{,}067 pL^3 - 0{,}25 pL^2 \end{bmatrix}$$
