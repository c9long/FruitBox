Rails.application.routes.draw do
  get "game/index"
  get "game/multiplayer", to: "game#multiplayer", as: :multiplayer
  post "game/create_room", to: "game#create_room", as: :create_room
  get "game/join/:room_code", to: "game#join_room", as: :join_room
  get "game/room/:room_code", to: "game#room", as: :game_room

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
