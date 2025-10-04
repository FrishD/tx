--================================================================
--[[
    This resource is part of the txAdmin resource.
    Copyright (C) 2024- Zua - All Rights Reserved
    Zua is the main author of this resource file.
    You can contact me on discord: Zua
]]
--================================================================

-- Event to handle muting from the backend
RegisterNetEvent('txAdmin:events:playerMuted', function(data)
    local targetPlayer = txAdmin.players.getPlayer(data.targetNetId)
    if targetPlayer then
        MumbleSetPlayerMuted(targetPlayer.id, true)
        targetPlayer:sendAlert('You have been muted by an admin. Reason: ' .. data.reason)
    end
end)

-- Event to handle unmuting from the backend
RegisterNetEvent('txAdmin:events:playerUnmuted', function(data)
    local targetPlayer = txAdmin.players.getPlayer(data.targetNetId)
    if targetPlayer then
        MumbleSetPlayerMuted(targetPlayer.id, false)
        targetPlayer:sendAlert('You have been unmuted by an admin or your mute has expired.')
    end
end)

-- When a player connects, the backend will check if they are muted
-- and if so, will mute them via an event if needed.
-- The check is done in the JS backend via the /player/checkJoin endpoint.