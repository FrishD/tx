const modulename = 'WebServer:PlayerStatus';
import { CtxWithBody } from '@modules/WebServer/ctxTypes';
import { PlayerClass } from '@lib/player/playerClasses';
import playerResolver from '@lib/player/playerResolver';

/**
 * Returns the mute and wager blacklist status for a given player license
 */
export default async function PlayerStatus(ctx: CtxWithBody) {
    //Check for the token
    const token = ctx.headers['x-txadmin-token'];
    if (token !== txCore.config.deployment.txAdminToken) {
        return ctx.send({
            isMuted: false,
            isWagerBlacklisted: false,
        });
    }

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