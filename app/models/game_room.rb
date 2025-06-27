class GameRoom < ApplicationRecord
  has_many :players, dependent: :destroy
  has_many :game_moves, dependent: :destroy
  has_many :game_boards, foreign_key: "room_code", primary_key: "room_code", dependent: :destroy

  validates :name, presence: true, uniqueness: true
  validates :max_players, numericality: { greater_than: 0, less_than_or_equal_to: 4 }

  before_create :generate_room_code

  def full?
    players.count >= max_players
  end

  def can_start?
    players.count >= 2
  end

  def empty?
    players.count == 0
  end

  def last_activity
    # Return the most recent activity (last player joined or last move made)
    last_player_activity = players.maximum(:updated_at)
    last_move_activity = game_moves.maximum(:created_at)

    [ last_player_activity, last_move_activity, updated_at ].compact.max
  end

  def should_be_cleaned_up?
    # Clean up if room is empty OR if it's been inactive for more than 5 minutes
    empty? || last_activity < 5.minutes.ago
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

  # Class method to clean up old empty rooms
  def self.cleanup_old_rooms
    rooms_to_delete = all.select { |room| room.should_be_cleaned_up? }
    count = rooms_to_delete.count

    if count > 0
      Rails.logger.info "Cleaning up #{count} rooms: #{rooms_to_delete.map(&:name).join(', ')}"
      where(id: rooms_to_delete.map(&:id)).destroy_all
    end

    count
  end

  private

  def generate_room_code
    self.room_code = SecureRandom.alphanumeric(6).upcase
  end
end
