import { Client, Role, Snowflake } from "discord.js";
import { chatActivityRatio, gameActivityRatio, getAllQuery } from "..";

import { colors, wrap } from "discord_bots_common/dist/utils/colors";
import { getAllGuilds, tryToGetMember, swapRoles, createRoleIfNotExists, getAllMembers } from "discord_bots_common/dist/utils/guild_utils";
import { info, error } from "discord_bots_common/dist/utils/logger";
import { getBaseLog, guildToString, hsvToRgb } from "discord_bots_common/dist/utils/utils";

import Mee6LevelsApi from "mee6-levels-api";
import { sqlQuery } from "./utils";

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(2, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
}

export async function updateUserRank(client: Client, userId: Snowflake, rank: number) {
    const guilds = await getAllGuilds(client);

    info(`🛠 Updating user: ${wrap(userId, colors.BLUE)}, in ${wrap(guilds.length, colors.GREEN)} guilds`);

    for (const guild of guilds) {
        const member = await tryToGetMember(guild, userId);

        if (member) {
            info(`⚙️ Updating rank of user ${wrap(member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);

            await swapRoles("Rank", member,
                await createRoleIfNotExists(guild, `Rank ${rank}`, hsvToRgb((rank / 20.0) % 1, 0.7, 0.9)));
        }
    }
}

export async function updateAllRanks(client: Client) {
    info(`${wrap("🕓 Time to update all ranks", colors.LIGHT_PURPLE)}`);

    const guilds = await getAllGuilds(client);

    info(`🛠 Updating mee6 levels in ${wrap(guilds.length, colors.GREEN)} guilds`);

    for (const guild of guilds) {
        info(`Geting members from ${guildToString(guild)}`);
        const members = await getAllMembers(guild);
        info(`🛠 Updating user mee6 levels of ${wrap(members.length, colors.GREEN)} members in ${wrap(guild.name, colors.BLUE)}`);
        try {
            const leaderBoard = await Mee6LevelsApi.getLeaderboard(guild);
            for (const member of members) {
                info(`🛠 Updating user ${member.user.tag}`);
                const member_mee = leaderBoard.find(user => user.id === member.id);
                info(`level - ${member_mee?.level} | rank - ${member_mee?.rank})`);
                await swapRoles("Level", member, await createRoleIfNotExists(guild, `Level ${member_mee?.level}`, hsvToRgb(((member_mee?.level || 0) / 30.0) % 1, 0.4, 0.9)));
            }
        } catch (err) {
            error(`${wrap(guild.name, colors.BLUE)} does not have a mee6 bot: ${err}`);
        }

    }

    const res = await sqlQuery(getAllQuery);

    if (res.error) {
        return;
    }

    for (const entry of res.results) {

        const rank = calculareRank(entry.chat_activity, entry.game_activity);

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
}

async function repositionRoles(roles: (Role | undefined)[], offset: number, role_color: colors, pos_color: colors) {
    for (let role_pos = 1; role_pos <= roles.length; role_pos++) {
        const role = roles.at(role_pos - 1);
        if (role?.position != role_pos + offset) {
            await role?.setPosition(role_pos + offset);
            info(`${wrap(role?.name, role_color)} | pos: ${wrap(role?.position, pos_color)}`);
        }
    }
}

export async function sortRoles(client: Client) {

    info(wrap("🕓 Time to sort roles...", colors.LIGHT_PURPLE));
    const guilds = await getAllGuilds(client);
    for (const guild of guilds) {
        info(`\nSorting roles in ${guildToString(guild)}`);

        const clan_roles = guild.roles.cache.map(role => role.name.startsWith("Clan") ? role : undefined)
            .filter(role => role)
            .sort((role1, role2) => (role1?.name || "").localeCompare((role2?.name || "")));

        const level_roles = guild.roles.cache.map(role => role.name.startsWith("Level") ? role : undefined)
            .filter(role => role)
            .sort((role1, role2) => {
                const substr1 = role1?.name.substring(6) || "";
                const substr2 = role2?.name.substring(6) || "";
                return ((substr1 != "undefined") ? Number.parseInt(substr1) : Number.MIN_SAFE_INTEGER) -
                    ((substr2 != "undefined") ? Number.parseInt(substr2) : Number.MIN_SAFE_INTEGER);
            });

        const rank_roles = guild.roles.cache.map(role => role.name.startsWith("Rank") ? role : undefined)
            .filter(role => role)
            .sort((role1, role2) => {
                const substr1 = role1?.name.substring(5) || "";
                const substr2 = role2?.name.substring(5) || "";
                return ((substr1 != "NaN") ? Number.parseInt(substr1) : Number.MAX_SAFE_INTEGER) -
                    ((substr2 != "NaN") ? Number.parseInt(substr2) : Number.MAX_SAFE_INTEGER);
            });

        await repositionRoles(level_roles, 0, colors.LIGHT_BLUE, colors.BLUE);
        await repositionRoles(rank_roles, level_roles.length, colors.LIGHT_GREEN, colors.GREEN);
        await repositionRoles(clan_roles, level_roles.length + rank_roles.length, colors.LIGHT_YELLOW, colors.YELLOW);

    }
    info(wrap("🟩 Sorting Done...", colors.PURPLE));
}