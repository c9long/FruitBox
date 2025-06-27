class GameChannel < ApplicationCable::Channel
  def subscribed
    @game_room = GameRoom.find_by(room_code: params[:room_code])
    if @game_room
      stream_for @game_room
      # Send current game state to the new subscriber
      transmit({
        type: "game_state",
        board: @game_room.current_board,
        players: @game_room.players.map { |p| { id: p.id, name: p.name, score: p.score, color: p.color } },
        status: @game_room.status
      })
    else
      reject
    end
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  def join_room(data)
    player_name = data["player_name"]
    return unless @game_room && !@game_room.full?

    player = @game_room.players.create!(name: player_name)

    GameChannel.broadcast_to(@game_room, {
      type: "player_joined",
      player: { id: player.id, name: player.name, score: player.score, color: player.color },
      players: @game_room.players.map { |p| { id: p.id, name: p.name, score: p.score, color: p.color } }
    })
  end

  def make_move(data)
    player_id = data["player_id"]
    start_row = data["start_row"]
    start_col = data["start_col"]
    end_row = data["end_row"]
    end_col = data["end_col"]

    player = @game_room.players.find(player_id)
    return unless player

    # Calculate points and update board
    points = calculate_points(start_row, start_col, end_row, end_col)

    if points > 0
      # Valid move - update player score and board
      player.update!(score: player.score + points)

      # Create new board state after the move
      new_board = update_board_after_move(start_row, start_col, end_row, end_col)

      # Save the move
      @game_room.game_moves.create!(
        player: player,
        start_row: start_row,
        start_col: start_col,
        end_row: end_row,
        end_col: end_col,
        points_earned: points,
        board_state: new_board.to_json
      )

      GameChannel.broadcast_to(@game_room, {
        type: "move_made",
        player: { id: player.id, name: player.name, score: player.score, color: player.color },
        move: { start_row: start_row, start_col: start_col, end_row: end_row, end_col: end_col },
        points: points,
        board: new_board
      })
    else
      # Invalid move - notify the player
      GameChannel.broadcast_to(@game_room, {
        type: "invalid_move",
        player_id: player_id,
        message: "Invalid selection - must sum to 10"
      })
    end
  end

  def start_game(data)
    return unless @game_room.can_start?

    @game_room.update!(status: "playing")

    GameChannel.broadcast_to(@game_room, {
      type: "game_started",
      board: @game_room.current_board
    })
  end

  private

  def calculate_points(start_row, start_col, end_row, end_col)
    board = @game_room.current_board
    min_row = [ start_row, end_row ].min
    max_row = [ start_row, end_row ].max
    min_col = [ start_col, end_col ].min
    max_col = [ start_col, end_col ].max

    sum = 0
    selected_tiles = []

    # Calculate sum of selected apples
    for i in min_row..max_row
      for j in min_col..max_col
        if board[i][j] && board[i][j]["value"]
          sum += board[i][j]["value"]
          selected_tiles << [ i, j ]
        end
      end
    end

    # Return points if sum equals 10
    sum == 10 ? selected_tiles.length * 10 : 0
  end

  def update_board_after_move(start_row, start_col, end_row, end_col)
    board = @game_room.current_board.dup
    min_row = [ start_row, end_row ].min
    max_row = [ start_row, end_row ].max
    min_col = [ start_col, end_col ].min
    max_col = [ start_col, end_col ].max

    # Remove selected tiles
    for i in min_row..max_row
      for j in min_col..max_col
        board[i][j] = nil
      end
    end

    # Fill empty spaces by moving tiles down
    for j in 0..9
      # Move tiles down
      write_pos = 9
      for i in 9.downto(0)
        if board[i][j]
          if write_pos != i
            board[write_pos][j] = board[i][j]
            board[i][j] = nil
          end
          write_pos -= 1
        end
      end

      # Fill empty spaces with new tiles
      for i in 0..write_pos
        board[i][j] = {
          "fruit" => "\u{1F34E}",
          "value" => rand(1..9)
        }
      end
    end

    board
  end
end
