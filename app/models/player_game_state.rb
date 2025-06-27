class PlayerGameState < ApplicationRecord
  belongs_to :player

  validates :room_code, presence: true
  validates :score, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :time_remaining, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  def self.current_state(player_id, room_code)
    where(player_id: player_id, room_code: room_code).order(created_at: :desc).first
  end

  def self.create_initial_state(player_id, room_code, board_configuration)
    # Create initial state with all apples available
    initial_board_state = JSON.parse(board_configuration)

    # Mark all apples as available (not collected)
    initial_board_state.each_with_index do |row, i|
      row.each_with_index do |cell, j|
        cell["collected"] = false
      end
    end

    create!(
      player_id: player_id,
      room_code: room_code,
      board_state: initial_board_state.to_json,
      score: 0,
      time_remaining: 90, # 1:30 in seconds
      needs_new_board: false
    )
  end

  def self.create_new_board_state(player_id, room_code, board_configuration)
    # Get current state to preserve score and time
    current_state = current_state(player_id, room_code)

    # Create new board state with all apples available
    initial_board_state = JSON.parse(board_configuration)

    # Mark all apples as available (not collected)
    initial_board_state.each_with_index do |row, i|
      row.each_with_index do |cell, j|
        cell["collected"] = false
      end
    end

    # Preserve existing score and time, or use defaults if no current state
    existing_score = current_state&.score || 0
    existing_time = current_state&.time_remaining || 90

    create!(
      player_id: player_id,
      room_code: room_code,
      board_state: initial_board_state.to_json,
      score: existing_score,
      time_remaining: existing_time,
      needs_new_board: false
    )
  end

  def collect_apples(positions)
    # positions should be an array of [row, col] pairs
    board_state = JSON.parse(self.board_state)

    positions.each do |row, col|
      if board_state[row] && board_state[row][col] && !board_state[row][col]["collected"]
        board_state[row][col]["collected"] = true
        self.score += 1  # 1 point per apple collected
      end
    end

    self.board_state = board_state.to_json
    save!
  end

  def get_visible_board
    # Return board state showing only uncollected apples
    board_state = JSON.parse(self.board_state)

    board_state.each_with_index do |row, i|
      row.each_with_index do |cell, j|
        if cell["collected"]
          # Replace collected apple with empty cell
          cell["fruit"] = ""
          cell["value"] = ""
        end
      end
    end

    board_state
  end

  def has_available_moves?
    # Check if there are any valid combinations of uncollected apples that sum to 10
    board_state = JSON.parse(self.board_state)

    # Get all uncollected apple positions and values
    available_apples = []
    board_state.each_with_index do |row, i|
      row.each_with_index do |cell, j|
        if !cell["collected"] && cell["fruit"] == "\u{1F34E}"
          available_apples << { row: i, col: j, value: cell["value"] }
        end
      end
    end

    # Check if any combination sums to 10
    check_combinations(available_apples)
  end

  private

  def check_combinations(apples, target_sum = 10, current_sum = 0, start_index = 0)
    return current_sum == target_sum if current_sum >= target_sum

    (start_index...apples.length).each do |i|
      new_sum = current_sum + apples[i][:value]
      if new_sum <= target_sum
        if check_combinations(apples, target_sum, new_sum, i + 1)
          return true
        end
      end
    end

    false
  end
end
