import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="fruitbox"
export default class extends Controller {
  static targets = ["board"]
  
  connect() {
    this.initializeGame()
  }
  
  initializeGame() {
    this.board = []
    this.score = 0
    this.isDragging = false
    this.startRow = -1
    this.startCol = -1
    this.endRow = -1
    this.endCol = -1
    this.selectionBox = null
    this.selectedTiles = new Set()
    this.hintsEnabled = false
    this.hintBoxes = []
    this.timeRemaining = 90 // 90 seconds = 1:30
    this.gameActive = true
    this.timerStarted = false
    this.timerInterval = null
    this.generateBoard()
    this.renderBoard()
    this.updateTimer() // Show initial time
  }
  
  generateBoard() {
    this.board = []
    for (let i = 0; i < 10; i++) {
      this.board[i] = []
      for (let j = 0; j < 10; j++) {
        this.board[i][j] = {
          fruit: '🍎',
          value: Math.floor(Math.random() * 9) + 1 // Random number 1-9
        }
      }
    }
  }
  
  renderBoard() {
    this.boardTarget.innerHTML = ''
    
    // Ensure the board container has relative positioning for hints
    this.boardTarget.style.position = 'relative'
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const tile = document.createElement('div')
        tile.className = 'w-12 h-12 bg-red-200 border-2 border-red-400 rounded-lg flex items-center justify-center text-xl cursor-pointer hover:bg-red-300 transition-colors relative'
        
        // Create the apple element
        const apple = document.createElement('div')
        apple.className = 'text-lg relative'
        apple.textContent = this.board[i][j].fruit
        
        // Create the number element positioned over the apple
        const number = document.createElement('div')
        number.className = 'absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg'
        number.textContent = this.board[i][j].value
        
        tile.appendChild(apple)
        tile.appendChild(number)
        
        tile.dataset.row = i
        tile.dataset.col = j
        
        // Add mouse event listeners for drag functionality
        tile.addEventListener('mousedown', (e) => this.handleMouseDown(e))
        tile.addEventListener('mouseover', (e) => this.handleMouseOver(e))
        
        this.boardTarget.appendChild(tile)
      }
    }
    
    // Add global mouse event listeners
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    document.addEventListener('mouseleave', (e) => this.handleMouseUp(e))
  }
  
  handleMouseDown(event) {
    if (!this.gameActive || (this.timerStarted && this.timeRemaining === 0)) return
    
    event.preventDefault()
    this.isDragging = true
    this.startRow = parseInt(event.currentTarget.dataset.row)
    this.startCol = parseInt(event.currentTarget.dataset.col)
    this.endRow = this.startRow
    this.endCol = this.startCol
    
    // Clear previous selection
    this.clearSelection()
    
    // Create selection box
    this.createSelectionBox()
    this.updateSelection()
  }
  
  handleMouseOver(event) {
    if (!this.gameActive || (this.timerStarted && this.timeRemaining === 0)) return
    
    if (this.isDragging) {
      event.preventDefault()
      this.endRow = parseInt(event.currentTarget.dataset.row)
      this.endCol = parseInt(event.currentTarget.dataset.col)
      this.updateSelection()
    }
  }
  
  handleMouseUp(event) {
    if (!this.gameActive || (this.timerStarted && this.timeRemaining === 0)) return
    
    if (this.isDragging) {
      this.isDragging = false
      this.checkAndDestroySelection()
      this.clearSelection()
    }
  }
  
  createSelectionBox() {
    this.selectionBox = document.createElement('div')
    this.selectionBox.className = 'absolute border-2 border-black bg-transparent pointer-events-none z-10'
    this.boardTarget.style.position = 'relative'
    this.boardTarget.appendChild(this.selectionBox)
  }
  
  updateSelection() {
    if (!this.selectionBox) return
    
    const minRow = Math.min(this.startRow, this.endRow)
    const maxRow = Math.max(this.startRow, this.endRow)
    const minCol = Math.min(this.startCol, this.endCol)
    const maxCol = Math.max(this.startCol, this.endCol)
    
    const tileSize = 48 // w-12 = 48px
    const gap = 4 // gap-1 = 4px
    
    const left = minCol * (tileSize + gap)
    const top = minRow * (tileSize + gap)
    const width = (maxCol - minCol + 1) * (tileSize + gap) - gap
    const height = (maxRow - minRow + 1) * (tileSize + gap) - gap
    
    this.selectionBox.style.left = `${left}px`
    this.selectionBox.style.top = `${top}px`
    this.selectionBox.style.width = `${width}px`
    this.selectionBox.style.height = `${height}px`
    
    // Update visual feedback for selected tiles (only if they have apples)
    this.updateSelectedTilesVisual(minRow, maxRow, minCol, maxCol)
  }
  
  updateSelectedTilesVisual(minRow, maxRow, minCol, maxCol) {
    // Clear previous selection visual
    this.selectedTiles.forEach(tileKey => {
      const [row, col] = tileKey.split(',').map(Number)
      const tile = this.boardTarget.querySelector(`[data-row="${row}"][data-col="${col}"]`)
      if (tile) {
        tile.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50')
      }
    })
    
    this.selectedTiles.clear()
    
    // No longer adding visual feedback to selected tiles - just the border box
  }
  
  clearSelection() {
    // Remove visual feedback from all tiles
    this.selectedTiles.forEach(tileKey => {
      const [row, col] = tileKey.split(',').map(Number)
      const tile = this.boardTarget.querySelector(`[data-row="${row}"][data-col="${col}"]`)
      if (tile) {
        tile.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50')
      }
    })
    
    this.selectedTiles.clear()
    
    // Remove selection box
    if (this.selectionBox) {
      this.selectionBox.remove()
      this.selectionBox = null
    }
  }
  
  checkAndDestroySelection() {
    const minRow = Math.min(this.startRow, this.endRow)
    const maxRow = Math.max(this.startRow, this.endRow)
    const minCol = Math.min(this.startCol, this.endCol)
    const maxCol = Math.max(this.startCol, this.endCol)
    
    let sum = 0
    const selectedTiles = []
    
    // Calculate sum of selected apples
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        if (this.board[i][j] && this.board[i][j].fruit === '🍎') {
          sum += this.board[i][j].value
          selectedTiles.push({ row: i, col: j })
        }
      }
    }
    
    // If sum equals 10, destroy the apples and add score
    if (sum === 10 && selectedTiles.length > 0) {
      // Start timer on first successful move
      if (!this.timerStarted) {
        this.startTimer()
      }
      
      selectedTiles.forEach(({ row, col }) => {
        // Set the slot to empty (null)
        this.board[row][col] = null
        
        // Update the display to show empty slot
        const tile = this.boardTarget.querySelector(`[data-row="${row}"][data-col="${col}"]`)
        if (tile) {
          const appleElement = tile.querySelector('div:first-child')
          const numberElement = tile.querySelector('div:last-child')
          
          appleElement.textContent = ''
          numberElement.textContent = ''
          tile.classList.remove('hover:bg-red-300')
          tile.classList.add('bg-gray-300', 'border-gray-400')
        }
      })
      
      // Add score (1 point per apple destroyed)
      this.score += selectedTiles.length
      this.updateScore()
      
      // Update hints if they're enabled
      if (this.hintsEnabled) {
        this.updateHints()
      }
      
      // Check if board is still solvable after destroying apples
      setTimeout(() => {
        if (!this.isBoardSolvable()) {
          this.generateNewBoard()
        }
      }, 100) // Small delay to ensure DOM updates are complete
    }
  }
  
  isBoardSolvable() {
    // Check all possible rectangular selections
    for (let startRow = 0; startRow < 10; startRow++) {
      for (let startCol = 0; startCol < 10; startCol++) {
        for (let endRow = startRow; endRow < 10; endRow++) {
          for (let endCol = startCol; endCol < 10; endCol++) {
            let sum = 0
            let hasApple = false
            
            // Calculate sum for this selection
            for (let i = startRow; i <= endRow; i++) {
              for (let j = startCol; j <= endCol; j++) {
                if (this.board[i][j] && this.board[i][j].fruit === '🍎') {
                  sum += this.board[i][j].value
                  hasApple = true
                }
              }
            }
            
            // If we found a valid combination, the board is solvable
            if (sum === 10 && hasApple) {
              return true
            }
          }
        }
      }
    }
    
    return false
  }
  
  getAllSolutions() {
    const solutions = []
    
    // Check all possible rectangular selections
    for (let startRow = 0; startRow < 10; startRow++) {
      for (let startCol = 0; startCol < 10; startCol++) {
        for (let endRow = startRow; endRow < 10; endRow++) {
          for (let endCol = startCol; endCol < 10; endCol++) {
            let sum = 0
            let hasApple = false
            
            // Calculate sum for this selection (only include existing apples)
            for (let i = startRow; i <= endRow; i++) {
              for (let j = startCol; j <= endCol; j++) {
                if (this.board[i][j] && this.board[i][j].fruit === '🍎') {
                  sum += this.board[i][j].value
                  hasApple = true
                }
              }
            }
            
            // If we found a valid combination, add it to solutions
            if (sum === 10 && hasApple) {
              solutions.push({
                startRow,
                startCol,
                endRow,
                endCol,
                sum
              })
            }
          }
        }
      }
    }
    
    return solutions
  }
  
  toggleHints() {
    this.hintsEnabled = !this.hintsEnabled
    
    if (this.hintsEnabled) {
      this.showHints()
      // Update button text
      const button = this.element.querySelector('[data-action="fruitbox#toggleHints"]')
      if (button) {
        button.textContent = 'Hide Hints'
        button.classList.remove('bg-green-500', 'hover:bg-green-600')
        button.classList.add('bg-red-500', 'hover:bg-red-600')
      }
    } else {
      this.hideHints()
      // Update button text
      const button = this.element.querySelector('[data-action="fruitbox#toggleHints"]')
      if (button) {
        button.textContent = 'Show Hints'
        button.classList.remove('bg-red-500', 'hover:bg-red-600')
        button.classList.add('bg-green-500', 'hover:bg-green-600')
      }
    }
  }
  
  showHints() {
    this.hideHints() // Clear any existing hints first
    
    const solutions = this.getAllSolutions()
    
    // Ensure the board container has relative positioning
    this.boardTarget.style.position = 'relative'
    
    solutions.forEach((solution, index) => {
      const hintBox = document.createElement('div')
      hintBox.className = 'absolute border-2 border-green-500 bg-transparent pointer-events-none z-5'
      
      const tileSize = 48 // w-12 = 48px
      const gap = 4 // gap-1 = 4px
      
      const minRow = Math.min(solution.startRow, solution.endRow)
      const maxRow = Math.max(solution.startRow, solution.endRow)
      const minCol = Math.min(solution.startCol, solution.endCol)
      const maxCol = Math.max(solution.startCol, solution.endCol)
      
      const left = minCol * (tileSize + gap)
      const top = minRow * (tileSize + gap)
      const width = (maxCol - minCol + 1) * (tileSize + gap) - gap
      const height = (maxRow - minRow + 1) * (tileSize + gap) - gap
      
      hintBox.style.left = `${left}px`
      hintBox.style.top = `${top}px`
      hintBox.style.width = `${width}px`
      hintBox.style.height = `${height}px`
      
      this.boardTarget.appendChild(hintBox)
      this.hintBoxes.push(hintBox)
    })
  }
  
  hideHints() {
    this.hintBoxes.forEach(box => {
      if (box && box.parentNode) {
        box.remove()
      }
    })
    this.hintBoxes = []
  }
  
  updateHints() {
    if (this.hintsEnabled) {
      this.showHints()
    }
  }
  
  generateNewBoard() {
    // Keep the current score, just generate a new board
    this.generateBoard()
    this.renderBoard()
    
    // Update hints if they're enabled
    if (this.hintsEnabled) {
      this.updateHints()
    }
    
    // Show a brief message to the user
    this.showNewBoardMessage()
  }
  
  showNewBoardMessage() {
    // Create or update message element
    let messageElement = document.getElementById('new-board-message')
    if (!messageElement) {
      messageElement = document.createElement('div')
      messageElement.id = 'new-board-message'
      messageElement.className = 'text-lg font-bold text-green-600 mb-4 text-center'
      this.element.insertBefore(messageElement, this.boardTarget)
    }
    
    messageElement.textContent = 'No more moves! New board generated. 🎉'
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (messageElement) {
        messageElement.remove()
      }
    }, 3000)
  }
  
  updateScore() {
    const scoreElement = document.getElementById('score')
    if (scoreElement) {
      scoreElement.textContent = this.score
    }
  }
  
  reset() {
    // Clear existing timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
    
    // Remove any game over overlay
    const gameOverOverlay = document.querySelector('.fixed.inset-0.bg-black')
    if (gameOverOverlay) {
      gameOverOverlay.remove()
    }
    
    this.hideHints()
    this.hintsEnabled = false
    this.timerStarted = false
    this.gameActive = true
    this.timeRemaining = 90
    this.score = 0
    this.generateBoard()
    this.renderBoard()
    this.updateTimer()
    this.updateScore()
  }
  
  startTimer() {
    if (this.timerStarted) return // Prevent multiple timers
    
    this.timerStarted = true
    
    const timerElement = document.getElementById('timer')
    if (!timerElement) {
      return
    }
    
    const updateDisplay = () => {
      const minutes = Math.floor(this.timeRemaining / 60)
      const seconds = this.timeRemaining % 60
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      // Visual feedback for low time
      if (this.timeRemaining <= 10) {
        timerElement.classList.remove('text-red-600', 'text-orange-500')
        timerElement.classList.add('text-red-600', 'animate-pulse')
      } else if (this.timeRemaining <= 30) {
        timerElement.classList.remove('text-red-600', 'animate-pulse')
        timerElement.classList.add('text-orange-500')
      }
    }
    
    this.timerInterval = setInterval(() => {
      this.timeRemaining--
      updateDisplay()
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval)
        timerElement.textContent = '00:00'
        this.endGame()
      }
    }, 1000)
  }
  
  updateTimer() {
    const timerElement = document.getElementById('timer')
    if (timerElement) {
      const minutes = Math.floor(this.timeRemaining / 60)
      const seconds = this.timeRemaining % 60
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  endGame() {
    this.gameActive = false
    clearInterval(this.timerInterval)
    
    // Show game over message
    this.showGameOverMessage()
    
    // Disable interactions
    this.disableGameInteractions()
  }
  
  showGameOverMessage() {
    const gameOverDiv = document.createElement('div')
    gameOverDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    gameOverDiv.innerHTML = `
      <div class="bg-white rounded-lg p-8 text-center max-w-md mx-4">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Time's Up!</h2>
        <p class="text-xl text-gray-600 mb-6">Final Score: <span class="font-bold text-blue-600">${this.score}</span></p>
        <button onclick="location.reload()" class="px-6 py-3 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition-colors">
          Play Again
        </button>
      </div>
    `
    document.body.appendChild(gameOverDiv)
  }
  
  disableGameInteractions() {
    // Remove event listeners from tiles
    const tiles = this.boardTarget.querySelectorAll('[data-row]')
    tiles.forEach(tile => {
      tile.style.pointerEvents = 'none'
      tile.style.opacity = '0.6'
    })
    
    // Disable buttons
    const buttons = this.element.querySelectorAll('button')
    buttons.forEach(button => {
      button.disabled = true
      button.style.opacity = '0.5'
      button.style.cursor = 'not-allowed'
    })
  }
}
