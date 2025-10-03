const modulename = 'WebServer:PlayerStatus';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { PlayerClass } from '@lib/player/playerClasses';
import playerResolver from '@lib/player/playerResolver';
import { now } from '@lib/misc';

/**
 * Returns the mute and wager blacklist status for a given player license
 */
export default async function PlayerStatus(ctx: AuthedCtx) {
    //Sanity check
    if (!ctx.params.license) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const license = ctx.params.license;

    //Finding the player
    let player: PlayerClass;
    try {
        player = playerResolver(undefined, undefined, license);
    } catch (error) {
        return ctx.send({
            isMuted: false,
            isWagerBlacklisted: false,
        });
    }

    //Check for active mute
    const activeMute = player.checkActiveAction('mute');

    //Check for wager blacklist
    const isWagerBlacklisted = player.checkActiveAction('wagerblacklist');

    return ctx.send({
        isMuted: !!activeMute,
        isWagerBlacklisted: !!isWagerBlacklisted,
    });
};