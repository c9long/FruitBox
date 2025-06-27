import { Controller } from "@hotwired/stimulus"
import consumer from "../channels/consumer"

export default class extends Controller {
  static targets = ["board"]
  
  connect() {
    this.roomCode = this.element.dataset.roomCode
    this.playerId = this.element.dataset.playerId
    this.playerName = this.element.dataset.playerName
    
    this.board = []
    this.isDragging = false
    this.startRow = -1
    this.startCol = -1
    this.endRow = -1
    this.endCol = -1
    this.selectionBox = null
    this.gameActive = false
    
    this.subscribeToChannel()
    this.initializeGame()
  }
  
  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
  
  subscribeToChannel() {
    this.subscription = consumer.subscriptions.create(
      { channel: "GameChannel", room_code: this.roomCode },
      {
        connected: () => {
          console.log("Connected to game channel")
          this.addMessage("Connected to game room")
        },
        
        disconnected: () => {
          console.log("Disconnected from game channel")
          this.addMessage("Disconnected from game room")
        },
        
        received: (data) => {
          this.handleChannelMessage(data)
        }
      }
    )
  }
  
  handleChannelMessage(data) {
    switch (data.type) {
      case 'game_state':
        this.board = data.board
        this.renderBoard()
        this.updatePlayersList(data.players)
        this.updateRoomStatus(data.status)
        break
        
      case 'player_joined':
        this.addMessage(`${data.player.name} joined the game`)
        this.updatePlayersList(data.players)
        break
        
      case 'game_started':
        this.gameActive = true
        this.board = data.board
        this.renderBoard()
        this.updateRoomStatus('playing')
        this.addMessage("Game started!")
        break
        
      case 'move_made':
        this.board = data.board
        this.renderBoard()
        this.updatePlayerScore(data.player.id, data.player.score)
        this.addMessage(`${data.player.name} earned ${data.points} points!`)
        break
        
      case 'invalid_move':
        if (data.player_id == this.playerId) {
          this.addMessage("Invalid move - selection must sum to 10")
        }
        break
    }
  }
  
  initializeGame() {
    this.renderBoard()
  }
  
  renderBoard() {
    this.boardTarget.innerHTML = ''
    this.boardTarget.style.position = 'relative'
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const tile = document.createElement('div')
        tile.className = 'w-12 h-12 bg-red-200 border-2 border-red-400 rounded-lg flex items-center justify-center text-xl cursor-pointer hover:bg-red-300 transition-colors relative'
        
        if (this.board[i] && this.board[i][j]) {
          // Create the apple element
          const apple = document.createElement('div')
          apple.className = 'text-lg relative'
          apple.textContent = this.board[i][j].fruit || '🍎'
          
          // Create the number element positioned over the apple
          const number = document.createElement('div')
          number.className = 'absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg'
          number.textContent = this.board[i][j].value || '1'
          
          tile.appendChild(apple)
          tile.appendChild(number)
          
          // Add mouse event listeners for drag functionality
          tile.addEventListener('mousedown', (e) => this.handleMouseDown(e))
          tile.addEventListener('mouseover', (e) => this.handleMouseOver(e))
        } else {
          // Empty tile
          tile.className = 'w-12 h-12 bg-gray-100 border-2 border-gray-200 rounded-lg'
        }
        
        tile.dataset.row = i
        tile.dataset.col = j
        this.boardTarget.appendChild(tile)
      }
    }
    
    // Add global mouse event listeners
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    document.addEventListener('mouseleave', (e) => this.handleMouseUp(e))
  }
  
  handleMouseDown(event) {
    if (!this.gameActive) return
    
    event.preventDefault()
    this.isDragging = true
    this.startRow = parseInt(event.currentTarget.dataset.row)
    this.startCol = parseInt(event.currentTarget.dataset.col)
    this.endRow = this.startRow
    this.endCol = this.startCol
    
    this.clearSelection()
    this.createSelectionBox()
    this.updateSelection()
  }
  
  handleMouseOver(event) {
    if (!this.gameActive) return
    
    if (this.isDragging) {
      event.preventDefault()
      this.endRow = parseInt(event.currentTarget.dataset.row)
      this.endCol = parseInt(event.currentTarget.dataset.col)
      this.updateSelection()
    }
  }
  
  handleMouseUp(event) {
    if (!this.gameActive) return
    
    if (this.isDragging) {
      this.isDragging = false
      this.makeMove()
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
    if (this.selectionBox) {
      this.selectionBox.remove()
      this.selectionBox = null
    }
  }
  
  makeMove() {
    if (!this.playerId) return
    
    this.subscription.perform('make_move', {
      player_id: this.playerId,
      start_row: this.startRow,
      start_col: this.startCol,
      end_row: this.endRow,
      end_col: this.endCol
    })
  }
  
  startGame() {
    this.subscription.perform('start_game', {})
  }
  
  resetGame() {
    // This would need to be implemented in the channel
    this.addMessage("Reset game functionality coming soon!")
  }
  
  updatePlayersList(players) {
    const playersList = document.getElementById('players-list')
    if (!playersList) return
    
    playersList.innerHTML = ''
    players.forEach(player => {
      const playerDiv = document.createElement('div')
      playerDiv.className = 'flex items-center justify-between p-3 bg-gray-50 rounded'
      playerDiv.dataset.playerId = player.id
      
      playerDiv.innerHTML = `
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${player.color}"></div>
          <span class="font-medium">${player.name}</span>
        </div>
        <span class="text-sm font-bold text-blue-600" data-score="${player.id}">${player.score}</span>
      `
      
      playersList.appendChild(playerDiv)
    })
  }
  
  updatePlayerScore(playerId, score) {
    const scoreElement = document.querySelector(`[data-score="${playerId}"]`)
    if (scoreElement) {
      scoreElement.textContent = score
    }
    
    // Update own score display
    if (playerId == this.playerId) {
      const playerScoreElement = document.getElementById('player-score')
      if (playerScoreElement) {
        playerScoreElement.textContent = score
      }
    }
  }
  
  updateRoomStatus(status) {
    const statusElement = document.getElementById('room-status')
    if (statusElement) {
      statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1)
    }
  }
  
  addMessage(message) {
    const messagesContainer = document.getElementById('game-messages')
    if (!messagesContainer) return
    
    const messageDiv = document.createElement('div')
    messageDiv.className = 'text-sm text-gray-600 p-2 bg-gray-50 rounded'
    messageDiv.textContent = message
    
    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    
    // Remove old messages if there are too many
    while (messagesContainer.children.length > 10) {
      messagesContainer.removeChild(messagesContainer.firstChild)
    }
  }
} 