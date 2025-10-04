const modulename = 'WebServer:PlayerActions';
import humanizeDuration, { Unit } from 'humanize-duration';
import playerResolver from '@lib/player/playerResolver';
import { GenericApiResp } from '@shared/genericApiTypes';
import { PlayerClass, ServerPlayer } from '@lib/player/playerClasses';
import { anyUndefined, calcExpirationFromDuration } from '@lib/misc';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { SYM_CURRENT_MUTEX } from '@lib/symbols';
import { sendWagerBlacklistLog } from '@modules/DiscordBot/discordHelpers';
const console = consoleFactory(modulename);


/**
 * Actions route for the player modal
 */
export default async function PlayerActions(ctx: AuthedCtx) {
    //Sanity check
    if (anyUndefined(ctx.params.action)) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const action = ctx.params.action;
    const { mutex, netid, license } = ctx.query;
    const sendTypedResp = (data: GenericApiResp) => ctx.send(data);

    //Finding the player
    let player;
    try {
        const refMutex = mutex === 'current' ? SYM_CURRENT_MUTEX : mutex;
        player = playerResolver(refMutex, parseInt((netid as string)), license);
    } catch (error) {
        return sendTypedResp({ error: (error as Error).message });
    }

    //Delegate to the specific action handler
    if (action === 'save_note') {
        return sendTypedResp(await handleSaveNote(ctx, player));
    } else if (action === 'warn') {
        return sendTypedResp(await handleWarning(ctx, player));
    } else if (action === 'ban') {
        return sendTypedResp(await handleBan(ctx, player));
    } else if (action === 'whitelist') {
        return sendTypedResp(await handleSetWhitelist(ctx, player));
    } else if (action === 'message') {
        return sendTypedResp(await handleDirectMessage(ctx, player));
    } else if (action === 'kick') {
        return sendTypedResp(await handleKick(ctx, player));
    } else if (action === 'wagerblacklist') {
        return sendTypedResp(await handleWagerBlacklist(ctx, player));
    } else if (action === 'mute') {
        return sendTypedResp(await handleMute(ctx, player));
    } else if (action === 'flag') {
        return sendTypedResp(await handleFlag(ctx, player));
    } else {
        return sendTypedResp({ error: 'unknown action' });
    }
};


/**
 * Handle Save Note (open to all admins)
 */
async function handleSaveNote(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.note,
    )) {
        return { error: 'Invalid request.' };
    }
    const note = ctx.request.body.note.trim();

    try {
        player.setNote(note, ctx.admin.name);
        ctx.admin.logAction(`Set notes for ${player.license}`);
        return { success: true };
    } catch (error) {
        return { error: `Failed to save note: ${(error as Error).message}` };
    }
}


/**
 * Handle Send Warning
 */
async function handleWarning(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.reason,
    )) {
        return { error: 'Invalid request.' };
    }
    const reason = ctx.request.body.reason.trim() || 'no reason provided';

    //Check permissions
    if (!ctx.admin.testPermission('players.warn', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' };
    }

    //Validating server & player
    const allIds = player.getAllIdentifiers();
    if (!allIds.length) {
        return { error: 'Cannot warn a player with no identifiers.' };
    }

    //Register action
    let actionId;
    try {
        actionId = txCore.database.actions.registerWarn(
            allIds,
            ctx.admin.name,
            reason,
            player.displayName,
        );
    } catch (error) {
        return { error: `Failed to warn player: ${(error as Error).message}` };
    }
    ctx.admin.logAction(`Warned player "${player.displayName}": ${reason}`);

    // Dispatch `txAdmin:events:playerWarned`
    const eventSent = txCore.fxRunner.sendEvent('playerWarned', {
        author: ctx.admin.name,
        reason,
        actionId,
        targetNetId: (player instanceof ServerPlayer && player.isConnected) ? player.netid : null,
        targetIds: allIds,
        targetName: player.displayName,
    });

    if (eventSent) {
        return { success: true };
    } else {
        return { error: `Warn saved, but likely failed to send the warn in game (stdin error).` };
    }
}


/**
 * Handle Banning command
 */
async function handleBan(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (
        anyUndefined(
            ctx.request.body,
            ctx.request.body.duration,
            ctx.request.body.reason,
        )
    ) {
        return { error: 'Invalid request.' };
    }
    const durationInput = ctx.request.body.duration.trim();
    let reason = (ctx.request.body.reason as string).trim() || 'no reason provided';
    const approver = ctx.request.body.approver as string | undefined;

    //Calculating expiration/duration
    let calcResults;
    try {
        calcResults = calcExpirationFromDuration(durationInput);
    } catch (error) {
        return { error: (error as Error).message };
    }
    const { expiration, duration } = calcResults;
    const sevenDays = 7 * 24 * 60 * 60;

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' }
    }

    //Check for long ban approval
    let banApprover;
    if (expiration === false || (duration && duration >= sevenDays)) {
        if (!ctx.admin.testPermission('players.approve_bans', modulename)) {
            if (!approver) {
                return { error: 'You must select an approver for bans longer than 1 week.' };
            }
            const approverAdmin = txCore.adminStore.getAdminByName(approver);
            const approverHasPerms = approverAdmin && (
                approverAdmin.master === true
                || approverAdmin.permissions.includes('all_permissions')
                || approverAdmin.permissions.includes('players.approve_bans')
            );
            if (!approverHasPerms) {
                return { error: 'The selected approver does not have the required permissions.' };
            }
            banApprover = approver;
        }
    }

    //Validating player - hwids.length can be zero 
    const allIds = player.getAllIdentifiers();
    const allHwids = player.getAllHardwareIdentifiers();
    if (!allIds.length) {
        return { error: 'Cannot ban a player with no identifiers.' }
    }

    //Register action
    let actionId;
    try {
        actionId = txCore.database.actions.registerBan(
            allIds,
            ctx.admin.name,
            reason,
            expiration,
            player.displayName,
            allHwids,
            banApprover
        );
    } catch (error) {
        return { error: `Failed to ban player: ${(error as Error).message}` };
    }
    ctx.admin.logAction(`Banned player "${player.displayName}": ${reason}`);

    //No need to dispatch events if server is not online
    if (txCore.fxRunner.isIdle) {
        return { success: true };
    }


/**
 * Handle Flag
 */
async function handleFlag(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.reason,
    )) {
        return { error: 'Invalid request.' };
    }
    const reason = ctx.request.body.reason.trim() || 'no reason provided';
    const revoke = ctx.request.body.revoke || false;

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) { //using ban perm for now
        return { error: 'You don\'t have permission to execute this action.' };
    }

    if (revoke) {
        const activeFlags = txCore.database.actions.findMany(
            player.getAllIdentifiers(),
            undefined,
            { type: 'flag', 'revocation.timestamp': null }
        );
        if (!activeFlags.length) {
            return { error: 'This player is not flagged.' };
        }
        const actionToRevoke = activeFlags[0];

        try {
            txCore.database.actions.approveRevoke(actionToRevoke.id, ctx.admin.name, true, reason);
        } catch (error) {
            return { error: `Failed to unflag player: ${(error as Error).message}` };
        }
        ctx.admin.logAction(`Unflagged player "${player.displayName}".`);
        return { success: true };
    } else {
        const allIds = player.getAllIdentifiers();
        if (!allIds.length) {
            return { error: 'Cannot flag a player with no identifiers.' };
        }

        try {
            txCore.database.actions.registerFlag(allIds, ctx.admin.name, reason, player.displayName);
        } catch (error) {
            return { error: `Failed to flag player: ${(error as Error).message}` };
        }
        ctx.admin.logAction(`Flagged player "${player.displayName}": ${reason}`);
        return { success: true };
    }
}


/**
 * Handle Mute
 */
async function handleMute(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.reason,
    )) {
        return { error: 'Invalid request.' };
    }
    const reason = ctx.request.body.reason.trim() || 'no reason provided';
    const revoke = ctx.request.body.revoke || false;

    //Check permissions
    if (!ctx.admin.testPermission('players.mute', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' };
    }

    if (revoke) {
        const activeMutes = txCore.database.mutes.findMany(
            player.getAllIdentifiers(),
            { 'revocation.timestamp': null }
        );
        if (!activeMutes.length) {
            return { error: 'This player is not muted.' };
        }
        const actionToRevoke = activeMutes[0];

        try {
            txCore.database.mutes.approveRevoke(actionToRevoke.id, ctx.admin.name, reason);
        } catch (error) {
            return { error: `Failed to unmute player: ${(error as Error).message}` };
        }
        ctx.admin.logAction(`Unmuted player "${player.displayName}".`);

        if (player instanceof ServerPlayer && player.isConnected) {
            txCore.fxRunner.sendEvent('playerUnmuted', { targetNetId: player.netid });
        }

        return { success: true };
    } else {
        const durationInput = ctx.request.body.duration?.trim();
        if (typeof durationInput !== 'string' || !/^\d+$/.test(durationInput)) {
            return { error: 'Invalid duration. Must be a number in minutes.' };
        }

        let expiration;
        try {
            const durationMinutes = parseInt(durationInput, 10);
            expiration = (durationMinutes === 0) ? false : Math.floor(Date.now() / 1000) + (durationMinutes * 60);
        } catch (error) {
            return { error: `Invalid duration: ${(error as Error).message}` };
        }

        const allIds = player.getAllIdentifiers();
        if (!allIds.length) {
            return { error: 'Cannot mute a player with no identifiers.' };
        }

        try {
            txCore.database.mutes.registerMute(allIds, ctx.admin.name, reason, expiration, player.displayName);
        } catch (error) {
            return { error: `Failed to mute player: ${(error as Error).message}` };
        }
        const durationString = expiration === false ? 'permanently' : `for ${durationInput} minutes`;
        ctx.admin.logAction(`Muted player "${player.displayName}" ${durationString}: ${reason}`);

        if (player instanceof ServerPlayer && player.isConnected) {
            txCore.fxRunner.sendEvent('playerMuted', {
                targetNetId: player.netid,
                reason: reason,
            });
        }

        return { success: true };
    }
}

    //Prepare and send command
    let kickMessage, durationTranslated;
    const tOptions: any = {
        author: txCore.adminStore.getAdminPublicName(ctx.admin.name, 'punishment'),
        reason: reason,
    };
    if (expiration !== false && duration) {
        durationTranslated = txCore.translator.tDuration(
            duration * 1000,
            { units: ['d', 'h'] },
        );
        tOptions.expiration = durationTranslated;
        kickMessage = txCore.translator.t('ban_messages.kick_temporary', tOptions);
    } else {
        durationTranslated = null;
        kickMessage = txCore.translator.t('ban_messages.kick_permanent', tOptions);
    }

    // Dispatch `txAdmin:events:playerBanned`
    const eventSent = txCore.fxRunner.sendEvent('playerBanned', {
        author: ctx.admin.name,
        reason,
        actionId,
        expiration,
        durationInput,
        durationTranslated,
        targetNetId: (player instanceof ServerPlayer) ? player.netid : null,
        targetIds: player.ids,
        targetHwids: player.hwids,
        targetName: player.displayName,
        kickMessage,
    });

    if (eventSent) {
        return { success: true };
    } else {
        return { error: `Player banned, but likely failed to kick player (stdin error).` };
    }
}


/**
 * Handle Player Whitelist Action
 */
async function handleSetWhitelist(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.status,
    )) {
        return { error: 'Invalid request.' };
    }
    const status = (ctx.request.body.status === 'true' || ctx.request.body.status === true);

    //Check permissions
    if (!ctx.admin.testPermission('players.whitelist', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' }
    }

    try {
        player.setWhitelist(status);
        if (status) {
            ctx.admin.logAction(`Added ${player.license} to the whitelist.`);
        } else {
            ctx.admin.logAction(`Removed ${player.license} from the whitelist.`);
        }

        // Dispatch `txAdmin:events:whitelistPlayer`
        txCore.fxRunner.sendEvent('whitelistPlayer', {
            action: status ? 'added' : 'removed',
            license: player.license,
            playerName: player.displayName,
            adminName: ctx.admin.name,
        });

        return { success: true };
    } catch (error) {
        return { error: `Failed to save whitelist status: ${(error as Error).message}` };
    }
}


/**
 * Handle Direct Message Action
 */
async function handleDirectMessage(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.message,
    )) {
        return { error: 'Invalid request.' };
    }
    const message = ctx.request.body.message.trim();
    if (!message.length) {
        return { error: 'Cannot send a DM with empty message.' };
    }

    //Check permissions
    if (!ctx.admin.testPermission('players.direct_message', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' };
    }

    //Validating server & player
    if (!txCore.fxRunner.child?.isAlive) {
        return { error: 'The server is not running.' };
    }
    if (!(player instanceof ServerPlayer) || !player.isConnected) {
        return { error: 'This player is not connected to the server.' };
    }

    try {
        ctx.admin.logAction(`DM to "${player.displayName}": ${message}`);

        // Dispatch `txAdmin:events:playerDirectMessage`
        txCore.fxRunner.sendEvent('playerDirectMessage', {
            target: player.netid,
            author: ctx.admin.name,
            message,
        });

        return { success: true };
    } catch (error) {
        return { error: `Failed to save dm player: ${(error as Error).message}` };
    }
}


/**
 * Handle Kick Action
 */
async function handleKick(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.reason,
    )) {
        return { error: 'Invalid request.' };
    }
    const kickReason = ctx.request.body.reason.trim() || txCore.translator.t('kick_messages.unknown_reason');

    //Check permissions
    if (!ctx.admin.testPermission('players.kick', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' };
    }

    //Validating server & player
    if (!txCore.fxRunner.child?.isAlive) {
        return { error: 'The server is not running.' };
    }
    if (!(player instanceof ServerPlayer) || !player.isConnected) {
        return { error: 'This player is not connected to the server.' };
    }

    try {
        ctx.admin.logAction(`Kicked "${player.displayName}": ${kickReason}`);
        const dropMessage = txCore.translator.t(
            'kick_messages.player',
            { reason: kickReason }
        );

        // Dispatch `txAdmin:events:playerKicked`
        txCore.fxRunner.sendEvent('playerKicked', {
            target: player.netid,
            author: ctx.admin.name,
            reason: kickReason,
            dropMessage,
        });

        return { success: true };
    } catch (error) {
        return { error: `Failed to save kick player: ${(error as Error).message}` };
    }
}


/**
 * Handle Wager Blacklist
 */
async function handleWagerBlacklist(ctx: AuthedCtx, player: PlayerClass): Promise<GenericApiResp> {
    //Check if discord bot is ready
    if (!txCore.discordBot.isClientReady) {
        return { error: 'Discord bot is not ready. Please try again in a few seconds.' };
    }

    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.reason,
    )) {
        return { error: 'Invalid request.' };
    }
    const reason = ctx.request.body.reason.trim() || 'no reason provided';
    const revoke = ctx.request.body.revoke || false;

    if (revoke) {
        //Check perms
        if (!ctx.admin.testPermission('wager.head', modulename)) {
            return { error: 'You don\'t have permission to execute this action.' };
        }

        //Find active wager blacklist
        const activeBlacklist = txCore.database.actions.findMany(
            player.getAllIdentifiers(),
            undefined,
            { type: 'wagerblacklist', 'revocation.timestamp': null }
        );
        if (!activeBlacklist.length) {
            return { error: 'This user does not have an active wager blacklist.' };
        }
        const actionToRevoke = activeBlacklist[0];

        //Revoking action
        try {
            txCore.database.actions.approveRevoke(actionToRevoke.id, ctx.admin.name, true, reason);
        } catch (error) {
            return { error: `Failed to revoke wager blacklist: ${(error as Error).message}` };
        }

        //Remove role & send log
        if (txConfig.discordBot.wagerBlacklistRole) {
            try {
                const discordId = actionToRevoke.ids.find(id => id.startsWith('discord:'));
                if (discordId) {
                    const uid = discordId.substring(8);
                    await txCore.discordBot.removeMemberRole(uid, txConfig.discordBot.wagerBlacklistRole);
                    if (txConfig.discordBot.wagerRevokeLogChannel) {
                        const member = await txCore.discordBot.guild?.members.fetch(uid);
                        if (member) sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, ctx.admin.name, member, reason, true);
                    }
                }
            } catch (error) {
                console.error(`Failed to remove role or send log: ${(error as Error).message}`);
            }
        }
        ctx.admin.logAction(`Revoked wager blacklist for player "${player.displayName}".`);
        return { success: true };

    } else {
        //Check permissions
        if (!ctx.admin.testPermission('wager.staff', modulename)) {
            return { error: 'You don\'t have permission to execute this action.' };
        }

        //Validating server & player
        const allIds = player.getAllIdentifiers();
        if (!allIds.length) {
            return { error: 'Cannot wager blacklist a player with no identifiers.' };
        }

        //Register action
        try {
            txCore.database.actions.registerWagerBlacklist(
                allIds,
                ctx.admin.name,
                reason,
                player.displayName,
            );
        } catch (error) {
            return { error: `Failed to wager blacklist player: ${(error as Error).message}` };
        }
        ctx.admin.logAction(`Wager blacklisted player "${player.displayName}": ${reason}`);

        //Add role & send log
        if (txConfig.discordBot.wagerBlacklistRole) {
            try {
                const discordId = allIds.find(id => id.startsWith('discord:'));
                if (discordId) {
                    const uid = discordId.substring(8);
                    await txCore.discordBot.addMemberRole(uid, txConfig.discordBot.wagerBlacklistRole);
                    if (txConfig.discordBot.wagerBlacklistLogChannel) {
                        const member = await txCore.discordBot.guild?.members.fetch(uid);
                        if (member) sendWagerBlacklistLog(txConfig.discordBot.wagerBlacklistLogChannel, ctx.admin.name, member, reason);
                    }
                }
            } catch (error) {
                //Don't fail the whole command if the role removal fails
                console.error(`Failed to add role or send log: ${(error as Error).message}`);
            }
        }
        return { success: true };
    }
}
