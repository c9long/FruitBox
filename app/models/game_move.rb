class GameMove < ApplicationRecord
  belongs_to :game_room
  belongs_to :player

  validates :start_row, :start_col, :end_row, :end_col, presence: true
  validates :points_earned, numericality: { greater_than_or_equal_to: 0 }

  def selection_coordinates
    {
      start_row: start_row,
      start_col: start_col,
      end_row: end_row,
      end_col: end_col
    }
  end
end
