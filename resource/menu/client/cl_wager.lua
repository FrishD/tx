-- This script is responsible for handling the client-side logic of the wager blacklist system.
-- It listens for events from the server and maintains a list of wager-blacklisted players.

WagerBlacklistedPlayers = {}

RegisterNetEvent('txcl:setWagerBlacklisted', function(targetNetId, isBlacklisted)
    WagerBlacklistedPlayers[targetNetId] = isBlacklisted
end)

-- When a player leaves, remove them from the list
AddEventHandler('playerDropped', function(playerServerId, reason)
    if WagerBlacklistedPlayers[playerServerId] then
        WagerBlacklistedPlayers[playerServerId] = nil
    end
end)