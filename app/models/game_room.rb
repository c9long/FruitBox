class GameRoom < ApplicationRecord
  has_many :players, dependent: :destroy
  has_many :game_moves, dependent: :destroy

  validates :name, presence: true, uniqueness: true
  validates :max_players, numericality: { greater_than: 0, less_than_or_equal_to: 4 }

  before_create :generate_room_code

  def full?
    players.count >= max_players
  end

  def can_start?
    players.count >= 2
  end

  def current_board
    # Get the latest board state from moves or generate new one
    last_move = game_moves.order(:created_at).last
    if last_move&.board_state
      JSON.parse(last_move.board_state)
    else
      generate_new_board
    end
  end

  def generate_new_board
    board = []
    for i in 0..9
      board[i] = []
      for j in 0..9
        board[i][j] = {
          fruit: "\u{1F34E}",
          value: rand(1..9)
        }
      end
    end
    board
  end

  private

  def generate_room_code
    self.room_code = SecureRandom.alphanumeric(6).upcase
  end
end
