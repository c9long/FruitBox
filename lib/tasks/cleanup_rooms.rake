namespace :rooms do
  desc "Clean up empty rooms that have been inactive for more than 1 minute"
  task cleanup: :environment do
    puts "Cleaning up old empty rooms..."
    rooms_to_delete = GameRoom.all.select { |room| room.should_be_cleaned_up? }

    if rooms_to_delete.any?
      puts "Found #{rooms_to_delete.count} rooms to delete:"
      rooms_to_delete.each do |room|
        puts "  - #{room.name} (#{room.room_code}) - Last activity: #{room.last_activity}"
      end

      GameRoom.cleanup_old_rooms
      puts "Successfully deleted #{rooms_to_delete.count} rooms."
    else
      puts "No rooms to clean up."
    end
  end
end
