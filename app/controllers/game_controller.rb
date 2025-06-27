class GameController < ApplicationController
  before_action :cleanup_old_rooms, only: [ :multiplayer, :create_room ]

  def index
    # Single player mode
  end

  def multiplayer
    # Multiplayer lobby
  end

  def create_room
    @game_room = GameRoom.new(game_room_params)
    if @game_room.save
      redirect_to join_room_path(@game_room.room_code)
    else
      render :multiplayer, status: :unprocessable_entity
    end
  end

  def join_room
    @game_room = GameRoom.find_by(room_code: params[:room_code])

    unless @game_room
      redirect_to multiplayer_path, alert: "Room with code '#{params[:room_code]}' not found. It may have been deleted or the code may be incorrect."
      return
    end

    @player = @game_room.players.new
  end

  def join_game
    @game_room = GameRoom.find_by!(room_code: params[:room_code])

    Rails.logger.info "Join game attempt for room: #{@game_room.name}"
    Rails.logger.info "Room current players: #{@game_room.players.count}"
    Rails.logger.info "Room max players: #{@game_room.max_players}"
    Rails.logger.info "Player params: #{player_params}"

    if @game_room.full?
      Rails.logger.info "Room is full, redirecting"
      redirect_to join_room_path(@game_room.room_code), alert: "Room is full!"
      return
    end

    @player = @game_room.players.new(player_params)

    Rails.logger.info "Player valid? #{@player.valid?}"
    Rails.logger.info "Player errors: #{@player.errors.full_messages}" unless @player.valid?

    if @player.save
      Rails.logger.info "Player saved successfully with ID: #{@player.id}"
      redirect_to waiting_room_path(@game_room.room_code, @player.id)
    else
      Rails.logger.info "Player save failed, rendering join_room"
      render :join_room, status: :unprocessable_entity
    end
  end

  def waiting_room
    @game_room = GameRoom.find_by!(room_code: params[:room_code])
    @player = @game_room.players.find(params[:player_id])
  end

  def room
    @game_room = GameRoom.find_by!(room_code: params[:room_code])

    if params[:player_id]
      @player = @game_room.players.find(params[:player_id])
    end
  end

  def start_game
    @game_room = GameRoom.find_by!(room_code: params[:room_code])

    if @game_room.can_start?
      @game_room.update!(status: "playing")
      redirect_to game_room_path(@game_room.room_code, player_id: params[:player_id]), notice: "Game started!"
    else
      redirect_to waiting_room_path(@game_room.room_code, params[:player_id]), alert: "Need at least 2 players to start the game."
    end
  end

  def game_status
    @game_room = GameRoom.find_by!(room_code: params[:room_code])

    Rails.logger.info "Game status check for room: #{@game_room.name}"
    Rails.logger.info "Room status: #{@game_room.status}"
    Rails.logger.info "Players count: #{@game_room.players.count}"

    response_data = {
      status: @game_room.status || "waiting",
      players_count: @game_room.players.count,
      max_players: @game_room.max_players,
      can_start: @game_room.can_start?
    }

    Rails.logger.info "Returning JSON: #{response_data}"
    render json: response_data
  end

  def get_board
    @room = GameRoom.find_by(room_code: params[:room_code])
    @player = @room.players.find(params[:player_id])

    # Get or create board configuration for this room (shared between players)
    board_config = GameBoard.current_board(params[:room_code])
    board_config = GameBoard.create_new_board(params[:room_code]) unless board_config

    # Get or create player's game state
    player_state = PlayerGameState.current_state(@player.id, params[:room_code])
    player_state = PlayerGameState.create_initial_state(@player.id, params[:room_code], board_config.board_state) unless player_state

    # Return the visible board for this player (with collected apples hidden)
    visible_board = player_state.get_visible_board

    render json: {
      board: visible_board,
      player_id: @player.id,
      room_code: params[:room_code],
      score: player_state.score,
      time_remaining: player_state.time_remaining
    }
  end

  def cleanup_rooms
    # More aggressive cleanup for testing
    rooms_deleted = GameRoom.cleanup_old_rooms

    # Delete all rooms if requested
    if params[:delete_all]
      all_deleted = GameRoom.destroy_all.count
      rooms_deleted += all_deleted
    end

    # Also delete rooms with specific names for testing (keeping for backward compatibility)
    if params[:force_delete_name]
      force_deleted = GameRoom.where(name: params[:force_delete_name]).destroy_all.count
      rooms_deleted += force_deleted
    end

    redirect_to multiplayer_path, notice: "Cleaned up #{rooms_deleted} old rooms."
  end

  def collect_apples
    @room = GameRoom.find_by(room_code: params[:room_code])
    @player = @room.players.find(params[:player_id])

    # Get player's current game state
    player_state = PlayerGameState.current_state(@player.id, params[:room_code])

    if player_state
      # Collect the apples (positions should be array of [row, col] pairs)
      positions = params[:positions] || []
      player_state.collect_apples(positions)

      # Check if player needs a new board (no more valid moves)
      if !player_state.has_available_moves?
        # Generate new board configuration for the room
        new_board_config = GameBoard.create_new_board(params[:room_code])

        # Create new game state for this player with the new board
        PlayerGameState.create_initial_state(@player.id, params[:room_code], new_board_config.board_state)
      end

      # Return updated game state
      render json: {
        success: true,
        score: player_state.score,
        board: player_state.get_visible_board,
        needs_new_board: !player_state.has_available_moves?
      }
    else
      render json: { success: false, error: "Player state not found" }, status: :not_found
    end
  end

  def player_finished
    @room = GameRoom.find_by(room_code: params[:room_code])
    @player = @room.players.find(params[:player_id])

    # Get player's current game state
    player_state = PlayerGameState.current_state(@player.id, params[:room_code])

    if player_state
      # Mark player as finished
      player_state.update(finished: true, final_score: player_state.score)

      # Check if all players are finished
      all_players_finished = @room.players.all? do |player|
        state = PlayerGameState.current_state(player.id, params[:room_code])
        state&.finished
      end

      if all_players_finished
        # Mark room as finished
        @room.update(status: "finished")
      end

      render json: {
        success: true,
        all_players_finished: all_players_finished,
        final_score: player_state.score
      }
    else
      render json: { success: false, error: "Player state not found" }, status: :not_found
    end
  end

  def request_new_board
    @room = GameRoom.find_by(room_code: params[:room_code])
    @player = @room.players.find(params[:player_id])

    # Get player's current game state
    player_state = PlayerGameState.current_state(@player.id, params[:room_code])

    if player_state
      # Check if this player has already requested a new board
      if player_state.needs_new_board
        # Player already requested, check if there's a newer board available
        current_board = GameBoard.current_board(params[:room_code])
        newer_board = GameBoard.where(room_code: params[:room_code])
                              .where("created_at > ?", current_board.created_at)
                              .order(created_at: :desc)
                              .first

        if newer_board
          # Newer board available, create new game states for all players (preserving scores)
          new_player_states = []
          @room.players.each do |player|
            new_player_states << PlayerGameState.create_new_board_state(player.id, params[:room_code], newer_board.board_state)
          end

          render json: {
            success: true,
            new_board: new_player_states.first.get_visible_board,
            message: "New board available"
          }
        else
          # Still waiting for new board to be generated
          render json: {
            success: true,
            new_board: nil,
            message: "Waiting for new board to be generated"
          }
        end
      else
        # Mark this player as needing a new board
        player_state.update(needs_new_board: true)

        # Check if other player also needs new board
        other_players_finished = @room.players.where.not(id: @player.id).all? do |other_player|
          other_state = PlayerGameState.current_state(other_player.id, params[:room_code])
          other_state&.needs_new_board
        end

        if other_players_finished
          # Both players need new board, generate one
          new_board_config = GameBoard.create_new_board(params[:room_code])

          # Create new game states for all players (preserving scores)
          new_player_states = []
          @room.players.each do |player|
            new_player_states << PlayerGameState.create_new_board_state(player.id, params[:room_code], new_board_config.board_state)
          end

          render json: {
            success: true,
            new_board: new_player_states.first.get_visible_board,
            message: "New board generated for all players"
          }
        else
          # First player to request, generate new board immediately
          new_board_config = GameBoard.create_new_board(params[:room_code])

          # Create new game state for this player with the new board (preserving score)
          new_player_state = PlayerGameState.create_new_board_state(@player.id, params[:room_code], new_board_config.board_state)

          render json: {
            success: true,
            new_board: new_player_state.get_visible_board,
            message: "New board generated, waiting for other player"
          }
        end
      end
    else
      render json: { success: false, error: "Player state not found" }, status: :not_found
    end
  end

  private

  def cleanup_old_rooms
    Rails.logger.info "Running cleanup before action..."
    count = GameRoom.cleanup_old_rooms
    Rails.logger.info "Cleaned up #{count} rooms"
  end

  def game_room_params
    params.require(:game_room).permit(:name, :max_players)
  end

  def player_params
    params.require(:player).permit(:name)
  end
end
