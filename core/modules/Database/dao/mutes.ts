import { cloneDeep } from 'lodash-es';
import { DbInstance, SavePriority } from "../instance";
import { DatabaseMuteType } from "../databaseTypes";
import { genActionID } from "../dbUtils";
import { now } from '@lib/misc';
import consoleFactory from '@lib/console';
const console = consoleFactory('DatabaseDao');


/**
 * Data access object for the database "mutes" collection.
 */
export default class MutesDao {
    constructor(private readonly db: DbInstance) { }

    private get dbo() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj;
    }

    private get chain() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj.chain;
    }

    /**
     * Registers a mute action and returns its id
     */
    registerMute(
        ids: string[],
        author: string,
        reason: string,
        expiration: number | false,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (expiration !== false && (typeof expiration !== 'number')) throw new Error('Invalid expiration.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'mute');
            const toDB: DatabaseMuteType = {
                id: actionID,
                type: 'mute',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };
            this.chain.get('mutes')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register mute to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }

    /**
     * Searches for a mute in the database by the id, returns mute or null if not found
     */
    findMute(actionId: string): DatabaseMuteType | null {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');

        //Performing search
        const a = this.chain.get('mutes')
            .find({ id: actionId })
            .cloneDeep()
            .value();
        return (typeof a === 'undefined') ? null : a;
    }

    /**
     * Searches for any registered mute in the database by a list of identifiers and optional filters
     */
    findMany<T extends DatabaseMuteType>(
        idsArray: string[],
        customFilter: ((action: DatabaseMuteType) => action is T) | object = {}
    ): T[] {
        if (!Array.isArray(idsArray)) throw new Error('idsArray should be an array');
        const idsFilter = (action: DatabaseMuteType) => idsArray.some((fi) => action.ids.includes(fi))

        try {
            return this.chain.get('mutes')
                .filter(customFilter as (a: DatabaseMuteType) => a is T)
                .filter(idsFilter)
                .cloneDeep()
                .value();
        } catch (error) {
            const msg = `Failed to search for a registered mute database with error: ${(error as Error).message}`;
            console.verbose.error(msg);
            throw new Error(msg);
        }
    }

    /**
     * Returns the entire mutes array.
     */
    getRaw(): readonly DatabaseMuteType[] {
        if (!this.chain) return [];
        return this.chain.get('mutes').value();
    }

    /**
     * Approves a revocation request for a mute
     */
    approveRevoke(
        actionId: string,
        author: string,
        reason?: string,
    ): DatabaseMuteType {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');

        try {
            const action = this.chain.get('mutes')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);

            action.revocation.timestamp = now();
            action.revocation.approver = author;
            action.revocation.status = 'approved';
            if (reason) {
                action.revocation.reason = reason;
            }
            this.db.writeFlag(SavePriority.HIGH);
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }

    /**
     * Revokes expired mutes
     */
    revokeExpired(): string[] {
        const now = Math.floor(Date.now() / 1000);
        const expiredMutes = this.chain.get('mutes')
            .filter(m => m.expiration !== false && m.expiration < now && m.revocation.timestamp === null)
            .value();

        const revokedLicenses: string[] = [];
        for (const mute of expiredMutes) {
            mute.revocation.timestamp = now;
            mute.revocation.approver = 'SYSTEM';
            mute.revocation.reason = 'Mute expired';
            mute.revocation.status = 'approved';
            revokedLicenses.push(...mute.ids);
        }

        if (expiredMutes.length > 0) {
            this.db.writeFlag(SavePriority.HIGH);
        }
        return revokedLicenses;
    }
}