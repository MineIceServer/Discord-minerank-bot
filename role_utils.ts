import { Client, Snowflake } from "discord.js";
import { colors, createRoleIfNotExists, error, getAllGuilds, getAllMembers, getBaseLog, guildToString, hsvToRgb, info, swapRoles, tryToGetMember, wrap } from "discord_bots_common";
import { chatActivityRatio, dbConnection, gameActivityRatio, getAllQuery } from ".";

import Mee6LevelsApi from "mee6-levels-api";

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(2, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
}

export async function updateUserRank(client: Client, userId: Snowflake, rank: number) {
    let guilds = await getAllGuilds(client);

    info(`🛠 Updating user: ${wrap(userId, colors.BLUE)}, in ${wrap(guilds.length, colors.GREEN)} guilds`);

    for (let guild of guilds) {
        let member = await tryToGetMember(guild, userId);

        if(member) {
            info(`⚙️ Updating rank of user ${wrap(member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);

            await swapRoles("Rank", member, 
                await createRoleIfNotExists(guild, `Rank ${rank}`, hsvToRgb((rank / 20.0) % 1, 0.7, 0.9)));
        }
    }
}

export async function updateAllRanks(client: Client) {
    info(`${wrap("🕓 Time to update all ranks", colors.LIGHT_PURPLE)}`);
    
    let guilds = await getAllGuilds(client);

    info(`🛠 Updating mee6 levels in ${wrap(guilds.length, colors.GREEN)} guilds`);

    for (let guild of guilds) {
        let members = await getAllMembers(guild);
        info(`🛠 Updating user mee6 levels of ${wrap(members.length, colors.GREEN)} members in ${wrap(guild.name, colors.BLUE)}`);
        try {
            for (const member of members) {
                const member_mee = await Mee6LevelsApi.getUserXp(guild, member);
                info(`🛠 Updating user ${member.user.tag} (${member_mee?.level} | ${member_mee?.rank})`);
                swapRoles("Level", member, await createRoleIfNotExists(guild, `Level ${member_mee?.level}`, hsvToRgb((member_mee?.level || 0 / 20.0) % 1, 0.3, 0.9)));
            }
        } catch (err) {
            error(`${wrap(guild.name, colors.BLUE)} does not have a mee6 bot: ${err}`);
        }

    }

    dbConnection.query(getAllQuery, async function (err, results) {

        if (err) {
            error(err);
            return;
        }

        for (let entry of results) {

            let rank = calculareRank(entry.chat_activity, entry.game_activity);

            if (entry.ds_id.startsWith("id_")) {
                info(`🟩 Found user: ${wrap(entry.ds_id, colors.BLUE)}, minecraft nick(s): ${wrap(entry.nickname, colors.LIGHT_GREEN)}, rank: ${wrap(rank, colors.GREEN)}`);
                try {
                    await updateUserRank(client, entry.ds_id.slice(3), rank);
                } catch (err) {
                    error(`❌ Insufficient permissions to update user ${wrap(entry.ds_id, colors.BLUE)}: ${err}`);
                }
                
            } else {
                info(`🟨 Found unconfirmed user: ${wrap(entry.ds_id, colors.BLUE)}, minecraft nick(s): ${wrap(entry.nickname, colors.LIGHT_GREEN)},\
 rank: ${wrap(rank, colors.GREEN)}, ${wrap("skipping", colors.LIGHT_RED)}`);
            }
        }

    });
}