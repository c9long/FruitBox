class Player < ApplicationRecord
  belongs_to :game_room

  validates :name, presence: true
  validates :score, numericality: { greater_than_or_equal_to: 0 }

  def color
    # Assign different colors to players
    colors = [ "#3b82f6", "#10b981", "#f59e0b", "#ef4444" ]
    colors[id % colors.length]
  end
end
