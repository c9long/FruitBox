class RoomCleanupJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Running room cleanup job..."
    GameRoom.cleanup_old_rooms
  end
end
