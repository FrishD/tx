-- This script is responsible for handling the client-side logic of the mute system.
-- It listens for events from the server and uses the pma-voice export to mute/unmute players.

MutedPlayers = {}

RegisterNetEvent('txcl:setMuted', function(targetNetId, isMuted, reason)
    local targetPlayer = GetPlayerFromServerId(targetNetId)
    if targetPlayer == -1 then return end

    -- Mute the player for the local client
    Citizen.InvokeNative(0xCC6C2EB1, targetNetId, isMuted)
    MutedPlayers[targetNetId] = isMuted

    -- If muting, show a notification to the player
    if isMuted and targetPlayer == PlayerId() then
        local msg = "You have been muted."
        if reason then
            msg = msg .. " Reason: " .. reason
        end
        TriggerEvent('chat:addMessage', {
            color = { 255, 0, 0 },
            multiline = true,
            args = { '[txAdmin]', msg }
        })
    end
end)

-- When a player leaves, remove them from the muted players list
AddEventHandler('playerDropped', function(playerServerId, reason)
    if MutedPlayers[playerServerId] then
        MutedPlayers[playerServerId] = nil
    end
end)

-- When the resource starts, re-apply mutes to all currently connected players
-- This is useful for when the script is restarted.
CreateThread(function()
    for _, player in ipairs(GetPlayers()) do
        local serverId = GetPlayerServerId(player)
        if MutedPlayers[serverId] then
            Citizen.InvokeNative(0xCC6C2EB1, serverId, true)
        end
    end
end)