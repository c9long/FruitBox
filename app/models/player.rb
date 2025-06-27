class Player < ApplicationRecord
  belongs_to :game_room
  has_many :game_moves, dependent: :destroy
  has_many :player_game_states, dependent: :destroy

  validates :name, presence: true
  validates :score, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :name, uniqueness: { scope: :game_room_id, message: "is already taken in this room" }

  before_validation :set_default_score, on: :create

  def color
    # Assign different colors to players
    colors = [ "#3b82f6", "#10b981", "#f59e0b", "#ef4444" ]
    # Use a fallback if id is nil (player not saved yet)
    player_id = id || object_id
    colors[player_id % colors.length]
  end

  private

  def set_default_score
    self.score = 0 if score.nil?
  end
end
