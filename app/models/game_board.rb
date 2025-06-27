class GameBoard < ApplicationRecord
  validates :room_code, presence: true
  validates :board_state, presence: true

  def self.current_board(room_code)
    where(room_code: room_code).order(created_at: :desc).first
  end

  def self.create_new_board(room_code)
    # Generate a new 10x10 board configuration for the room
    board_state = generate_board_state
    create!(room_code: room_code, board_state: board_state)
  end

  private

  def self.generate_board_state
    # Create a 10x10 grid with apples and random values 1-9
    board = []
    10.times do |i|
      board[i] = []
      10.times do |j|
        board[i][j] = {
          fruit: "\u{1F34E}",
          value: rand(1..9) # Random number 1-9
        }
      end
    end

    board.to_json
  end
end
