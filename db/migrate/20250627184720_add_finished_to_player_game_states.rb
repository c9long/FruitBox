class AddFinishedToPlayerGameStates < ActiveRecord::Migration[8.0]
  def change
    add_column :player_game_states, :finished, :boolean
    add_column :player_game_states, :final_score, :integer
  end
end
