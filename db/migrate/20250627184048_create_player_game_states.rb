class CreatePlayerGameStates < ActiveRecord::Migration[8.0]
  def change
    create_table :player_game_states do |t|
      t.references :player, null: false, foreign_key: true
      t.string :room_code
      t.text :board_state
      t.integer :score
      t.integer :time_remaining

      t.timestamps
    end
  end
end
