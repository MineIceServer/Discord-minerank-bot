import { Client, ColorResolvable, Guild, GuildChannelCreateOptions, GuildMember, Role, Snowflake } from "discord.js";
import { colors, error, getBaseLog, guildToString, hsvToRgb, info, wrap } from "discord_bots_common";
import { chatActivityRatio, dbConnection, gameActivityRatio, getAllQuery } from ".";

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(2, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
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
        info(`🔨 Created role: ${wrap(name, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
        role = await guild.roles.create({
            name: name,
            color: color
        });
    }
    return role;
}

export async function createChannelIfNotExists(guild: Guild, options: GuildChannelCreateOptions) {
    let channel = guild.channels.cache.find(channel => channel.name === options.name);
    if (!channel) {
        info(`🔨 Created channel: ${wrap(name, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
        channel = await guild.channels.create(options);
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

export async function swapRoles(prev_role_name: string, member: GuildMember, role: Role) {
    let previous_role = member.roles.cache.find(role => role.name.startsWith(prev_role_name));
    if (previous_role != role) {
        //remove previous role
        if (previous_role) {
            info(`${wrap("📤 Removed", colors.LIGHT_RED)} role ${previous_role.name} from user ${wrap(member.user.tag, colors.LIGHT_RED)}`);
            member.roles.remove(previous_role);
        }
        info(`${wrap("📥 Added", colors.LIGHT_GREEN)} role ${wrap(role.name, colors.GREEN)} to user ${wrap(member.user.tag, colors.BLUE)}`);
        // add the new role
        member.roles.add(role);
    }
}

export function updateAllRanks(client: Client) {
    info(`${wrap("🕓 Time to update all ranks", colors.LIGHT_PURPLE)}`);
    
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
                info(`🟨 Found unconfirmed user: ${wrap(entry.ds_id, colors.BLUE)}, minecraft nick: ${wrap(entry.nickname, colors.LIGHT_GREEN)},\
 rank: ${wrap(rank, colors.GREEN)}, ${wrap("skipping", colors.LIGHT_RED)}`);
            }
        }

    });
}