# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_06_27_170249) do
  create_table "game_moves", force: :cascade do |t|
    t.integer "game_room_id", null: false
    t.integer "player_id", null: false
    t.integer "start_row"
    t.integer "start_col"
    t.integer "end_row"
    t.integer "end_col"
    t.integer "points_earned"
    t.text "board_state"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_room_id"], name: "index_game_moves_on_game_room_id"
    t.index ["player_id"], name: "index_game_moves_on_player_id"
  end

  create_table "game_rooms", force: :cascade do |t|
    t.string "name"
    t.string "room_code"
    t.integer "max_players"
    t.string "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "players", force: :cascade do |t|
    t.integer "game_room_id", null: false
    t.string "name"
    t.integer "score"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_room_id"], name: "index_players_on_game_room_id"
  end

  add_foreign_key "game_moves", "game_rooms"
  add_foreign_key "game_moves", "players"
  add_foreign_key "players", "game_rooms"
end
