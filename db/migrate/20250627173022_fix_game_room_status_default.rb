class FixGameRoomStatusDefault < ActiveRecord::Migration[8.0]
  def change
    # Update existing records with nil status to 'waiting'
    GameRoom.where(status: nil).update_all(status: 'waiting')

    # Ensure the column has the proper default and constraints
    change_column_default :game_rooms, :status, from: nil, to: 'waiting'
    change_column_null :game_rooms, :status, false
  end
end
