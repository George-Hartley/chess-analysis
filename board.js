document.addEventListener('DOMContentLoaded', function () {

  const game = new Chess()
  const board = window.Chessground.Chessground(document.getElementById('board'), {
    orientation: 'white',
    fen: game.fen(),
    movable: { free: false, enabled: false },
    highlight: { lastMove: false, check: false },
    drawable: { enabled: true }
  })

  const stockfish = new Worker('libs/stockfish/stockfish.js')

  const pgnInput = document.getElementById('pgnInput')
  const loadBtn = document.getElementById('loadBtn')
  const prevBtn = document.getElementById('prevBtn')
  const nextBtn = document.getElementById('nextBtn')
  const resetBtn = document.getElementById('resetBtn')
  const moveDisplay = document.getElementById('moveDisplay')
  const whiteNameEl = document.getElementById('whiteName')
  const blackNameEl = document.getElementById('blackName')
  const pgnArea = document.getElementById('pgnArea')


  let moves = []
  let currentMoveIndex  = -1
  let isPrecomputing    = false
  let precomputeIndex   = 0

  //Canvas Sizing

  function resizeChartCanvas() {
    const canvas = document.getElementById('lineChartCanvas')
    canvas.width = document.getElementById('app').offsetWidth
  }

  resizeChartCanvas()
  window.addEventListener('resize', () => {
    resizeChartCanvas()
    buildLineChart(storedEvalArray)
    highlightLinePoint(currentMoveIndex)
  })


  // Move List

  function renderMoveList() {
    const moveList = document.getElementById('moveList')
    moveList.innerHTML = ''

    for (let i = 0; i < moves.length; i += 2) {
      const row = document.createElement('div')
      row.classList.add('moveRow')

      const whiteMove = document.createElement('span')
      whiteMove.textContent = moves[i].san
      whiteMove.classList.add('move', 'whiteMove')
      whiteMove.addEventListener('click', () => selectMove(i))
      row.appendChild(whiteMove)

      if (i + 1 < moves.length) {
        const blackMove = document.createElement('span')
        blackMove.textContent = moves[i + 1].san
        blackMove.classList.add('move', 'blackMove')
        blackMove.addEventListener('click', () => selectMove(i + 1))
        row.appendChild(blackMove)
      }

      moveList.appendChild(row)
    }
  }

  function highlightMove() {
    const moveEls = document.querySelectorAll('.move')
    moveEls.forEach(el => el.classList.remove('active'))
    if (moveEls[currentMoveIndex]) {
      moveEls[currentMoveIndex].classList.add('active')
      moveEls[currentMoveIndex].scrollIntoView({ block: 'nearest' })
    }
  }

  function selectMove(index) {
    currentMoveIndex = index
    updateBoard()
  }

  // Name extraction

  function extractPlayerNames(pgn) {
    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/)
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/)

    let whiteName = whiteMatch ? whiteMatch[1] : 'White'
    let blackName = blackMatch ? blackMatch[1] : 'Black'

    if (whiteName.length > 24) whiteName = whiteName.substring(0, 24)
    if (blackName.length > 24) blackName = blackName.substring(0, 24)

    return { whiteName, blackName }
  }

  // Load button

  loadBtn.addEventListener('click', () => {
    const pgn = pgnInput.value.trim()
    game.reset()

    if (game.load_pgn(pgn)) {
      moves = game.history().map(san => ({ san, eval: 0 }))
      currentMoveIndex = -1

      storedEvalArray = moves.map(() => 0)
      buildLineChart(storedEvalArray)
      highlightLinePoint(currentMoveIndex)
      drawEvalBar(0)

      pgnArea.classList.add('hidden')
      loadBtn.disabled = true
    } else {
      moves = []
      currentMoveIndex = -1
    }

    const names = extractPlayerNames(pgn)
    whiteNameEl.textContent = names.whiteName
    blackNameEl.textContent = names.blackName

    renderMoveList()
    highlightMove()
    updateUIControls()
    updateBoard()

    if (moves.length > 0) {
      isPrecomputing = true
      precomputeIndex = 0
      runPrecompute()
    }
  })

  // Engine Precompute

  function runPrecompute() {
    game.reset()
    for (let i = 0; i <= precomputeIndex; i++) {
      game.move(moves[i].san)
    }

    stockfish.currentEvalIndex = precomputeIndex
    stockfish.postMessage(`position fen ${game.fen()}`)
    stockfish.postMessage('go depth 15')
  }

  //engine status helper

  function updateEngineStatus(text, progress) {
  const statusText = document.getElementById('engineStatusText')
  if (statusText.textContent === 'Analysis complete') return
  statusText.textContent = text
  document.getElementById('engineStatusFill').style.width =
    `${Math.round(progress * 100)}%`
  }

 stockfish.onmessage = function (event) {
  const msg = event.data

  // Show the current search depth so the user knows the engine is working
if (msg.includes('info depth') && isPrecomputing && precomputeIndex < moves.length) {
  const depthMatch = msg.match(/info depth (\d+)/)
  if (depthMatch && parseInt(depthMatch[1]) > 0) {
    const currentDepth = depthMatch[1]
    const progress = precomputeIndex / moves.length
    updateEngineStatus(`Analysing move ${precomputeIndex + 1} of ${moves.length} - depth ${currentDepth}`,progress)
  }
}

  // Only store centipawn scores - mate scores use a different
  // numeric scale and would distort the evaluation graph if stored directly
  if (msg.includes('score')) {
      const match = msg.match(/score (cp|mate) (-?\d+)/)
      if (match) {
        const [, type, val] = match
        const idx = stockfish.currentEvalIndex

        if (type === 'cp') {
          const raw = parseInt(val, 10)
          // Stockfish returns eval from side-to-move perspective.
          // Even indices = after white's move = black to move, so negate to get white-relative eval.
          // Odd indices = after black's move = white to move, keep as is.
          const normalised = idx % 2 === 0 ? -raw : raw
          moves[idx].eval = normalised
          storedEvalArray[idx] = normalised
          highlightLinePoint(currentMoveIndex)
        } else if (type === 'mate') {
          // carry forward the previous eval rather than leaving this position as zero
          const prev = idx > 0 ? storedEvalArray[idx - 1] : 0
          moves[idx].eval = prev
          storedEvalArray[idx] = prev
          highlightLinePoint(currentMoveIndex)
        }
      }
    }

  if (msg.startsWith('bestmove') && isPrecomputing) {
    const match = msg.match(/bestmove (\S+)/)
    if (match) {
      moves[stockfish.currentEvalIndex].bestMove = match[1]
    }

    precomputeIndex++
    if (precomputeIndex < moves.length) {
      runPrecompute()
    } else {
      isPrecomputing = false
      updateEngineStatus('Analysis complete' , 1)
      buildLineChart(storedEvalArray)
      updateBoard()
      loadBtn.disabled = false
    }
  }
}

  // Other Buttons

  prevBtn.addEventListener('click', () => {
    if (currentMoveIndex > 0) {
      currentMoveIndex--
      updateBoard()
    }
  })

  nextBtn.addEventListener('click', () => {
    if (currentMoveIndex < moves.length - 1) {
      currentMoveIndex++
      updateBoard()
    }
  })

  // add keyboard navigation using arrow keys
  document.addEventListener('keydown', (e) => {
    // ignore key events when typing in text fields to avoid interfering with input
    const target = e.target
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return
    }

    if (e.key === 'ArrowLeft') {
      prevBtn.click()
    } else if (e.key === 'ArrowRight') {
      nextBtn.click()
    }
  })

  resetBtn.addEventListener('click', () => {
    currentMoveIndex = -1
    isPrecomputing = false
    loadBtn.disabled = false
    pgnArea.classList.remove('hidden')
    updateBoard()
  })

  // Board Rendering

  function updateBoard() {
    game.reset()
    for (let i = 0; i <= currentMoveIndex; i++) {
      game.move(moves[i].san)
    }

    board.set({
      fen: game.fen(),
      drawable: { shapes: [] }
    })

    updateMoveDisplay()
    updateUIControls()
    drawEvalBar(moves[currentMoveIndex]?.eval ?? 0)
    highlightMove()
    highlightLinePoint(currentMoveIndex)
    drawBestMoveArrow()
  }

  function drawBestMoveArrow() {
    if (currentMoveIndex < 0) return
    const bestMove = moves[currentMoveIndex]?.bestMove
    if (!bestMove) return

    const from = bestMove.substring(0, 2)
    const to   = bestMove.substring(2, 4)

    board.set({
      drawable: {
        enabled: true,
        shapes: [{ orig: from, dest: to, brush: 'green' }]
      }
    })
  }

  function updateMoveDisplay() {
    if (currentMoveIndex < 0 || moves.length === 0) {
      moveDisplay.textContent = 'Move 0 of 0'
    } else {
      moveDisplay.textContent =
        `Move ${currentMoveIndex + 1} of ${moves.length}: ${moves[currentMoveIndex].san}`
    }
  }

  function updateUIControls() {
    const hasMoves    = moves.length > 0
    prevBtn.disabled  = currentMoveIndex < 0
    nextBtn.disabled  = currentMoveIndex >= moves.length - 1
    resetBtn.disabled = !hasMoves
  }

  updateUIControls()

})