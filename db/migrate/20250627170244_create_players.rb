class CreatePlayers < ActiveRecord::Migration[8.0]
  def change
    create_table :players do |t|
      t.references :game_room, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :score, default: 0, null: false

      t.timestamps
    end
  end
end
