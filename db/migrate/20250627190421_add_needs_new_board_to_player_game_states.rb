class AddNeedsNewBoardToPlayerGameStates < ActiveRecord::Migration[8.0]
  def change
    add_column :player_game_states, :needs_new_board, :boolean
  end
end
