class GameController < ApplicationController
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
    @game_room = GameRoom.find_by!(room_code: params[:room_code])
    @player = @game_room.players.new
  end

  def room
    @game_room = GameRoom.find_by!(room_code: params[:room_code])

    if params[:player] && params[:player][:name].present?
      # Create new player
      @player = @game_room.players.create!(name: params[:player][:name])
    elsif params[:player_id]
      # Find existing player
      @player = @game_room.players.find(params[:player_id])
    end
  end

  private

  def game_room_params
    params.require(:game_room).permit(:name, :max_players)
  end
end
