class CreateGameBoards < ActiveRecord::Migration[7.1]
  def change
    create_table :game_boards do |t|
      t.string :room_code, null: false
      t.text :board_state, null: false
      t.datetime :created_at, null: false
    end

    add_index :game_boards, :room_code
  end
end
