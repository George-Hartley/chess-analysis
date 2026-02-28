const evalBarCanvas = document.getElementById('evalBarCanvas')
const lineChartCanvas = document.getElementById('lineChartCanvas')

const evalBarCtx = evalBarCanvas.getContext('2d')
const lineChartCtx = lineChartCanvas.getContext('2d')

const maxEval = 500

const barColours = {
  white: '#ffffff',
  black: '#000000'
}

const lineColour = '#0077ff'
const highlightColour = '#ff0000'

let storedEvalArray = []

//  Utilitiy Functions

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function evalToPercent(evalCp) {
  const clamped = clamp(evalCp ?? 0, -maxEval, maxEval)
  const whitePercent = (clamped + maxEval) / (2 * maxEval)
  return {
    whitePercent,
    blackPercent: 1 - whitePercent
  }
}

function evalToY(evalCp, canvasHeight) {
  const clamped = clamp(evalCp ?? 0, -maxEval, maxEval)
  return ((maxEval - clamped) / (2 * maxEval)) * canvasHeight
}

// Eval Bar

function drawEvalBar(evalCp) {
  const w = evalBarCanvas.width
  const h = evalBarCanvas.height

  const { whitePercent, blackPercent } = evalToPercent(evalCp)

  evalBarCtx.clearRect(0, 0, w, h)

  evalBarCtx.fillStyle = barColours.black
  evalBarCtx.fillRect(0, 0, w, blackPercent * h)

  evalBarCtx.fillStyle = barColours.white
  evalBarCtx.fillRect(0, blackPercent * h, w, whitePercent * h)
}

// Line Chart

function buildLineChart(evalArray) {
  storedEvalArray = evalArray.slice()

  const w = lineChartCanvas.width
  const h = lineChartCanvas.height

  lineChartCtx.clearRect(0, 0, w, h)
  if (!storedEvalArray.length) return

  const stepX = storedEvalArray.length > 1
    ? w / (storedEvalArray.length - 1)
    : w

  const points = storedEvalArray.map((evalCp, i) => ({
    x: i * stepX,
    y: evalToY(evalCp, h)
  }))


  lineChartCtx.beginPath()
  lineChartCtx.moveTo(points[0].x, points[0].y)
  points.forEach(p => lineChartCtx.lineTo(p.x, p.y))
  lineChartCtx.lineTo(points[points.length - 1].x, 0)
  lineChartCtx.lineTo(0, 0)
  lineChartCtx.closePath()
  lineChartCtx.fillStyle = '#1e1e1e'
  lineChartCtx.fill()


  lineChartCtx.beginPath()
  lineChartCtx.moveTo(points[0].x, points[0].y)
  points.forEach(p => lineChartCtx.lineTo(p.x, p.y))
  lineChartCtx.lineTo(points[points.length - 1].x, h)
  lineChartCtx.lineTo(0, h)
  lineChartCtx.closePath()
  lineChartCtx.fillStyle = '#d4d4d4'
  lineChartCtx.fill()

  lineChartCtx.beginPath()
  lineChartCtx.strokeStyle = 'rgba(128, 128, 128, 0.4)'
  lineChartCtx.lineWidth = 1
  lineChartCtx.setLineDash([4, 4])
  lineChartCtx.moveTo(0, h / 2)
  lineChartCtx.lineTo(w, h / 2)
  lineChartCtx.stroke()
  lineChartCtx.setLineDash([])

  lineChartCtx.beginPath()
  lineChartCtx.strokeStyle = lineColour
  lineChartCtx.lineWidth = 1.5
  points.forEach((p, i) => {
    if (i === 0) lineChartCtx.moveTo(p.x, p.y)
    else         lineChartCtx.lineTo(p.x, p.y)
  })
  lineChartCtx.stroke()
}

function highlightLinePoint(currentMoveIndex) {
  if (!storedEvalArray.length) return

  const w = lineChartCanvas.width
  const h = lineChartCanvas.height

  const stepX = storedEvalArray.length > 1
  ? w / (storedEvalArray.length - 1)
  : w

  buildLineChart(storedEvalArray)

  if (currentMoveIndex >= 0 && currentMoveIndex < storedEvalArray.length) {
    const x = currentMoveIndex * stepX
    const y = evalToY(storedEvalArray[currentMoveIndex], h)

    lineChartCtx.fillStyle = highlightColour
    lineChartCtx.beginPath()
    lineChartCtx.arc(x, y, 4, 0, 2 * Math.PI)
    lineChartCtx.fill()
  }
}