import { Controller } from "@hotwired/stimulus"

console.log("Multiplayer FruitBox controller file loaded!")

export default class extends Controller {
  static targets = ["board"]
  static values = {
    roomCode: String,
    playerId: Number,
    playerName: String,
    gameStatus: String
  }
  
  connect() {
    console.log("Multiplayer FruitBox controller connected")
    console.log("Board target found:", this.hasBoardTarget)
    console.log("Board target element:", this.boardTarget)
    console.log("Room code:", this.roomCodeValue)
    console.log("Player ID:", this.playerIdValue)
    console.log("Game status:", this.gameStatusValue)
    
    // Show controller status
    const statusElement = document.getElementById('controller-status')
    if (statusElement) {
      statusElement.textContent = 'Controller connected!'
      statusElement.className = 'text-sm text-green-500 mb-2'
    }
    
    this.score = 0
    this.gameTimer = null
    this.timeRemaining = 90 // 1:30 in seconds
    this.timerStarted = false
    this.isDragging = false
    this.startRow = -1
    this.startCol = -1
    this.endRow = -1
    this.endCol = -1
    this.selectionBox = null
    this.selectedTiles = new Set()
    this.gameActive = true
    this.hintMode = false
    this.hintBoxes = []
    
    if (this.gameStatusValue === 'playing') {
      console.log("Game is playing, loading board...")
      this.loadBoard()
    } else {
      console.log("Game status is not playing:", this.gameStatusValue)
    }
  }
  
  disconnect() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
    }
    if (this.completionCheckInterval) {
      clearInterval(this.completionCheckInterval)
    }
    if (this.boardPollInterval) {
      clearInterval(this.boardPollInterval)
    }
    this.hideHints()
    
    // Clear any status messages
    const messages = ['new-board-message', 'queued-board-message', 'no-moves-message']
    messages.forEach(id => {
      const message = document.getElementById(id)
      if (message) {
        message.remove()
      }
    })
  }
  
  async loadBoard() {
    try {
      console.log("Loading board for player", this.playerIdValue)
      const response = await fetch(`/game/board/${this.roomCodeValue}?player_id=${this.playerIdValue}`)
      const data = await response.json()
      console.log("Board data received:", data)
      
      if (data.board) {
        this.renderBoard(data.board)
        
        // Update score and timer if provided
        if (data.score !== undefined) {
          this.score = data.score
          this.updateScore()
        }
        
        if (data.time_remaining !== undefined) {
          this.timeRemaining = data.time_remaining
          this.updateTimer()
        }
      } else {
        console.error("No board data in response")
        // Render a test board to see if the rendering logic works
        const testBoard = this.generateTestBoard()
        this.renderBoard(testBoard)
      }
    } catch (error) {
      console.error("Error loading board:", error)
      console.log("Rendering test board as fallback...")
      // Render a test board to see if the rendering logic works
      const testBoard = this.generateTestBoard()
      this.renderBoard(testBoard)
    }
  }
  
  generateTestBoard() {
    const board = []
    for (let i = 0; i < 10; i++) {
      board[i] = []
      for (let j = 0; j < 10; j++) {
        board[i][j] = {
          fruit: '🍎',
          value: Math.floor(Math.random() * 9) + 1 // Random number 1-9
        }
      }
    }
    return board
  }
  
  renderBoard(boardState) {
    console.log("Rendering board:", boardState)
    console.log("Board target element:", this.boardTarget)
    console.log("Board state type:", typeof boardState)
    console.log("Board state length:", boardState ? boardState.length : 'null')
    
    if (!this.boardTarget) {
      console.error("Board target not found!")
      return
    }
    
    // Clear any existing hints when re-rendering
    this.hideHints()
    
    this.boardTarget.innerHTML = ''
    this.boardTarget.style.position = 'relative'
    
    // Use the board state from the database
    this.board = boardState
    
    // Debug: Check first few cells
    if (this.board && this.board[0] && this.board[0][0]) {
      console.log("First cell data:", this.board[0][0])
      console.log("First cell fruit:", this.board[0][0].fruit)
      console.log("First cell value:", this.board[0][0].value)
    }
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const tile = document.createElement('div')
        tile.className = 'w-12 h-12 bg-red-200 border-2 border-red-400 rounded-lg flex items-center justify-center text-xl cursor-pointer hover:bg-red-300 transition-colors relative'
        
        // Debug: Log cell data
        console.log(`Cell [${i}][${j}]:`, this.board[i][j])
        
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
        
        // Add mouse event listeners for drag functionality
        tile.addEventListener('mousedown', (e) => this.handleMouseDown(e))
        tile.addEventListener('mouseover', (e) => this.handleMouseOver(e))
        
        tile.dataset.row = i
        tile.dataset.col = j
        this.boardTarget.appendChild(tile)
      }
    }
    
    // Add global mouse event listeners
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    document.addEventListener('mouseleave', (e) => this.handleMouseUp(e))
    
    console.log("Board rendered with", this.boardTarget.children.length, "cells")
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
  
  async handleMouseUp(event) {
    if (!this.gameActive || (this.timerStarted && this.timeRemaining === 0)) return
    
    if (this.isDragging) {
      this.isDragging = false
      await this.checkAndDestroySelection()
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
  }
  
  clearSelection() {
    // Remove selection box
    if (this.selectionBox) {
      this.selectionBox.remove()
      this.selectionBox = null
    }
  }
  
  async checkAndDestroySelection() {
    const minRow = Math.min(this.startRow, this.endRow)
    const maxRow = Math.max(this.startRow, this.endRow)
    const minCol = Math.min(this.startCol, this.endCol)
    const maxCol = Math.max(this.startCol, this.endCol)
    
    let sum = 0
    const selectedPositions = []
    
    // Calculate sum of selected apples
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        const tile = this.boardTarget.querySelector(`[data-row="${i}"][data-col="${j}"]`)
        if (tile && tile.querySelector('div:first-child').textContent === '🍎') {
          const value = parseInt(tile.querySelector('div:last-child').textContent)
          sum += value
          selectedPositions.push([i, j])
        }
      }
    }
    
    // If sum equals 10, collect the apples via server
    if (sum === 10 && selectedPositions.length > 0) {
      try {
        const response = await fetch(`/game/collect_apples/${this.roomCodeValue}?player_id=${this.playerIdValue}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
          },
          body: JSON.stringify({ positions: selectedPositions })
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Start timer on first successful move
          if (!this.timerStarted) {
            this.startTimer()
            this.timerStarted = true
          }
          
          // Update score
          this.score = data.score
          this.updateScore()
          
          // Update board display
          if (data.board) {
            this.renderBoard(data.board)
            
            // Update hints if they're enabled
            if (this.hintMode) {
              this.showHints()
            } else {
              // Even if hints are disabled, check if there are no moves left
              this.checkForNoMoves()
            }
          }
          
          // If new board was generated, show notification
          if (data.needs_new_board) {
            console.log("New board generated for room")
          }
        } else {
          console.error("Failed to collect apples:", data.error)
        }
      } catch (error) {
        console.error("Error collecting apples:", error)
      }
    }
  }
  
  updateScore() {
    const scoreElement = document.getElementById('player-score')
    if (scoreElement) {
      scoreElement.textContent = this.score
    }
  }
  
  startTimer() {
    console.log("Starting timer for player", this.playerIdValue)
    this.gameTimer = setInterval(() => {
      this.timeRemaining -= 1
      this.updateTimer()
      
      if (this.timeRemaining <= 0) {
        this.endGame()
      }
    }, 1000)
  }
  
  updateTimer() {
    const minutes = Math.floor(this.timeRemaining / 60)
    const seconds = this.timeRemaining % 60
    const timerElement = document.getElementById('game-timer')
    
    if (timerElement) {
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  async endGame() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
    }
    
    // Notify server that player has finished
    try {
      await fetch(`/game/player_finished/${this.roomCodeValue}?player_id=${this.playerIdValue}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
    } catch (error) {
      console.error("Error notifying server of game completion:", error)
    }
    
    // Show final score
    alert(`Game Over! Your final score: ${this.score}`)
    
    // Keep player in the lobby - don't redirect
    console.log("Game ended, staying in lobby to wait for other player")
    
    // Optionally, you could show a "waiting for other player" message
    const gameContainer = document.querySelector('.game-container')
    if (gameContainer) {
      const waitingMessage = document.createElement('div')
      waitingMessage.className = 'text-center p-4 bg-blue-100 rounded-lg mt-4'
      waitingMessage.innerHTML = `
        <h3 class="text-lg font-bold text-blue-800">Game Complete!</h3>
        <p class="text-blue-600">Your final score: ${this.score}</p>
        <p class="text-sm text-blue-500 mt-2">Waiting for other player to finish...</p>
      `
      gameContainer.appendChild(waitingMessage)
    }
    
    // Start polling to check if both players are done
    this.checkGameCompletion()
  }
  
  async checkGameCompletion() {
    // Poll every 3 seconds to check if both players have finished
    this.completionCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`/game/status/${this.roomCodeValue}`)
        const data = await response.json()
        
        // If game is still active, keep checking
        if (data.status === 'playing') {
          return
        }
        
        // If game is finished, show final results
        if (data.status === 'finished') {
          this.showFinalResults(data)
          clearInterval(this.completionCheckInterval)
        }
      } catch (error) {
        console.error("Error checking game completion:", error)
      }
    }, 3000)
  }
  
  showFinalResults(data) {
    const gameContainer = document.querySelector('.game-container')
    if (gameContainer) {
      // Remove waiting message if it exists
      const waitingMessage = gameContainer.querySelector('.bg-blue-100')
      if (waitingMessage) {
        waitingMessage.remove()
      }
      
      // Show final results
      const resultsMessage = document.createElement('div')
      resultsMessage.className = 'text-center p-4 bg-green-100 rounded-lg mt-4'
      
      let resultsHTML = `
        <h3 class="text-lg font-bold text-green-800">Game Results</h3>
        <p class="text-green-600">Your final score: ${this.score}</p>
      `
      
      if (data.players) {
        resultsHTML += '<div class="mt-2"><p class="text-sm text-green-700">All players finished!</p></div>'
      }
      
      resultsHTML += `
        <button onclick="window.location.href='/game/multiplayer'" class="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Back to Lobby
        </button>
      `
      
      resultsMessage.innerHTML = resultsHTML
      gameContainer.appendChild(resultsMessage)
    }
  }
  
  toggleHint() {
    this.hintMode = !this.hintMode
    
    if (this.hintMode) {
      this.showHints()
    } else {
      this.hideHints()
    }
    
    // Update hint button appearance
    const hintButton = document.getElementById('hint-button')
    if (hintButton) {
      if (this.hintMode) {
        hintButton.textContent = 'Hide Hints'
        hintButton.className = 'px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-colors'
      } else {
        hintButton.textContent = 'Show Hints'
        hintButton.className = 'px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors'
      }
    }
  }
  
  showHints() {
    this.hideHints() // Clear any existing hints first
    
    const solutions = this.getAllSolutions()
    
    // Check if there are no moves available
    if (solutions.length === 0) {
      console.log("No moves available, showing no-moves message")
      this.showNoMovesMessage()
      return
    }
    
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
  
  showNoMovesMessage() {
    // Create or update message element
    let messageElement = document.getElementById('no-moves-message')
    if (!messageElement) {
      messageElement = document.createElement('div')
      messageElement.id = 'no-moves-message'
      messageElement.className = 'text-lg font-bold text-orange-600 mb-4 text-center'
      this.element.insertBefore(messageElement, this.boardTarget)
    }
    
    messageElement.textContent = 'No moves available! Waiting for new board... ⏳'
    
    // Automatically request new board after a short delay
    setTimeout(() => {
      this.requestNewBoard()
    }, 1000)
  }
  
  hideHints() {
    this.hintBoxes.forEach(box => {
      if (box && box.parentNode) {
        box.remove()
      }
    })
    this.hintBoxes = []
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
  
  checkForNoMoves() {
    const solutions = this.getAllSolutions()
    if (solutions.length === 0) {
      console.log("No more moves available, requesting new board")
      this.requestNewBoard()
    }
  }
  
  async requestNewBoard() {
    try {
      console.log("Requesting new board for room:", this.roomCodeValue, "player:", this.playerIdValue)
      
      const response = await fetch(`/game/request_new_board/${this.roomCodeValue}?player_id=${this.playerIdValue}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
      
      const data = await response.json()
      console.log("New board request response:", data)
      
      if (data.success) {
        if (data.new_board) {
          console.log("New board received, rendering...")
          // New board was generated, update the display
          this.renderBoard(data.new_board)
          
          // Reset game state for new board
          this.resetGameStateForNewBoard()
          
          // Re-show hints if they were enabled
          if (this.hintMode) {
            this.showHints()
          }
          
          // Show notification
          this.showNewBoardMessage()
        } else {
          console.log("No new board in response, showing queued message")
          // Board is queued, wait for other player
          this.showQueuedBoardMessage()
        }
      } else {
        console.error("Failed to request new board:", data.error)
      }
    } catch (error) {
      console.error("Error requesting new board:", error)
    }
  }
  
  resetGameStateForNewBoard() {
    // Reset selection state
    this.isDragging = false
    this.startRow = null
    this.startCol = null
    this.endRow = null
    this.endCol = null
    this.clearSelection()
    
    // Reset hint state
    this.hideHints()
    
    // Clear any status messages
    const messages = ['new-board-message', 'queued-board-message', 'no-moves-message']
    messages.forEach(id => {
      const message = document.getElementById(id)
      if (message) {
        message.remove()
      }
    })
    
    // Don't reset timer - let it continue running
    // The timer should continue from where it left off
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
  
  showQueuedBoardMessage() {
    // Create or update message element
    let messageElement = document.getElementById('queued-board-message')
    if (!messageElement) {
      messageElement = document.createElement('div')
      messageElement.id = 'queued-board-message'
      messageElement.className = 'text-lg font-bold text-blue-600 mb-4 text-center'
      this.element.insertBefore(messageElement, this.boardTarget)
    }
    
    messageElement.textContent = 'No more moves! Waiting for new board to be generated... ⏳'
    
    // Start polling for new board
    this.pollForNewBoard()
  }
  
  pollForNewBoard() {
    // Poll every 2 seconds for a new board
    this.boardPollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/game/board/${this.roomCodeValue}?player_id=${this.playerIdValue}`)
        const data = await response.json()
        
        if (data.board) {
          // Check if this is a different board (new board available)
          const currentBoardHash = JSON.stringify(this.board)
          const newBoardHash = JSON.stringify(data.board)
          
          if (currentBoardHash !== newBoardHash) {
            // New board available!
            clearInterval(this.boardPollInterval)
            
            // Remove queued message
            const queuedMessage = document.getElementById('queued-board-message')
            if (queuedMessage) {
              queuedMessage.remove()
            }
            
            // Update board and reset game state
            this.renderBoard(data.board)
            this.resetGameStateForNewBoard()
            
            // Re-show hints if they were enabled
            if (this.hintMode) {
              this.showHints()
            }
            
            // Show success message
            this.showNewBoardMessage()
          }
        }
      } catch (error) {
        console.error("Error polling for new board:", error)
      }
    }, 2000)
  }
  
  testConnection() {
    console.log("Testing controller connection...")
    console.log("Room code:", this.roomCodeValue)
    console.log("Player ID:", this.playerIdValue)
    console.log("Player name:", this.playerNameValue)
    console.log("Game status:", this.gameStatusValue)
    console.log("Board target:", this.boardTarget)
    
    // Test board rendering
    const testBoard = this.generateTestBoard()
    this.renderBoard(testBoard)
  }
  
  async fetchBoard() {
    try {
      const response = await fetch(`/game/board/${this.roomCodeValue}?player_id=${this.playerIdValue}`)
      const data = await response.json()
      console.log("Board data received:", data)
      
      if (data.board) {
        this.renderBoard(data.board)
      } else {
        console.error("No board data in response")
      }
    } catch (error) {
      console.error("Error fetching board:", error)
    }
  }
} 