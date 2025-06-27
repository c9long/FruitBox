Rails.application.routes.draw do
  get "game/index"
  get "game/multiplayer", to: "game#multiplayer", as: :multiplayer
  post "game/create_room", to: "game#create_room", as: :create_room
  get "game/join/:room_code", to: "game#join_room", as: :join_room
  post "game/join/:room_code", to: "game#join_game", as: :join_game
  get "game/waiting/:room_code/:player_id", to: "game#waiting_room", as: :waiting_room
  get "game/room/:room_code", to: "game#room", as: :game_room
  post "game/start/:room_code", to: "game#start_game", as: :start_game
  get "game/status/:room_code", to: "game#game_status", as: :game_status
  get "game/board/:room_code", to: "game#get_board", as: :get_board
  post "game/collect_apples/:room_code", to: "game#collect_apples", as: :collect_apples
  post "game/player_finished/:room_code", to: "game#player_finished", as: :player_finished
  post "game/request_new_board/:room_code", to: "game#request_new_board", as: :request_new_board
  post "game/cleanup_rooms", to: "game#cleanup_rooms", as: :cleanup_rooms

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "game#index"
end
