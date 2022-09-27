import { ChannelType, Client, ColorResolvable, Guild, GuildChannelCreateOptions, GuildMember, Role, Snowflake } from "discord.js";
import { colors, error, getBaseLog, guildToString, hsvToRgb, info, wrap } from "discord_bots_common";
import { chatActivityRatio, dbConnection, gameActivityRatio, getAllQuery } from ".";

import Mee6LevelsApi from "mee6-levels-api";

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(2, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
}

export async function getAllMembers(guild: Guild) {
    let members: GuildMember[] = [];
    let members_async = await guild.members.fetch();

    for (let member of members_async) {
        members.push(await member[1].fetch());
    }

    return members;
}

export async function getAllGuilds(client: Client) {
    let guilds: Guild[] = [];
    let guilds_async = await client.guilds.fetch();

    for (let guild of guilds_async) {
        guilds.push(await guild[1].fetch());
    }

    return guilds;
}

export async function createRoleIfNotExists(guild: Guild, name: string, color: ColorResolvable) {
    let role = guild.roles.cache.find(role => role.name === name);
    if (!role) {
        role = await guild.roles.create({
            name: name,
            color: color
        });
        info(`🔨 Created role: ${wrap(name, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
    }
    return role;
}

export async function createChannelIfNotExists(guild: Guild, options: GuildChannelCreateOptions, is_category?: boolean) {
    let channel = guild.channels.cache.find(channel => channel.name === options.name 
        && (channel.type == ChannelType.GuildCategory || !is_category));
    if (!channel) {
        channel = await guild.channels.create(options);
        info(`🔨 Created ${is_category ? "category" : "channel"} channel: ${wrap(options.name, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
    }
    return channel;
}

export async function tryToGetMember(guild: Guild, memberId: Snowflake) {
    try {
        return await guild.members.fetch(memberId);
    } catch (err) {
        info(`🚫 User ${wrap(memberId, colors.LIGHT_GREEN)} ${wrap("not present", colors.LIGHT_RED)} in ${guildToString(guild)}`);
        return undefined;
    }
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

export async function swapRoles(prev_role_name: string, member: GuildMember, new_roles: Role | Role[]) {
    new_roles = ([] as Role[]).concat(new_roles);

    // find all roles that start with prev_role_name (filter not matched(undefined) values)
    let previous_roles = member.roles.cache.map(element => element.name.startsWith(prev_role_name) ? element : undefined).filter(element => element);
    for (const previous_role of previous_roles) {
        //remove previous role if not present in new_roles
        if (previous_role && !new_roles.includes(previous_role)) {
            member.roles.remove(previous_role);
            info(`${wrap("📤 Removed", colors.LIGHT_RED)} role ${previous_role.name} from user ${wrap(member.user.tag, colors.LIGHT_RED)}`);
        }
    }
    for (const new_role of new_roles) {
        // add the new role if not present in old_roles
        if (!previous_roles.includes(new_role)) {
            info(`${wrap("📥 Added", colors.LIGHT_GREEN)} role ${wrap(new_role.name, colors.GREEN)} to user ${wrap(member.user.tag, colors.BLUE)}`);
            member.roles.add(new_role);
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