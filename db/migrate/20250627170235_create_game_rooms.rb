class CreateGameRooms < ActiveRecord::Migration[8.0]
  def change
    create_table :game_rooms do |t|
      t.string :name, null: false
      t.string :room_code, null: false
      t.integer :max_players, default: 4, null: false
      t.string :status, default: 'waiting', null: false

      t.timestamps
    end

    add_index :game_rooms, :room_code, unique: true
    add_index :game_rooms, :name, unique: true
  end
end
