class FixPlayerScoreDefault < ActiveRecord::Migration[8.0]
  def change
    change_column_default :players, :score, from: nil, to: 0
    change_column_null :players, :score, false
  end
end
