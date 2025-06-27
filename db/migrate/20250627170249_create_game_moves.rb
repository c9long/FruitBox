class CreateGameMoves < ActiveRecord::Migration[8.0]
  def change
    create_table :game_moves do |t|
      t.references :game_room, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.integer :start_row, null: false
      t.integer :start_col, null: false
      t.integer :end_row, null: false
      t.integer :end_col, null: false
      t.integer :points_earned, default: 0, null: false
      t.text :board_state

      t.timestamps
    end
  end
end
