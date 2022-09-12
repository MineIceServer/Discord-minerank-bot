import { Client, GuildMember, OAuth2Guild, Role, Snowflake } from "discord.js";
import { colors, error, getBaseLog, hsvToRgb, info, wrap } from "discord_bots_common";
import { chatActivityRatio, dbConnection, gameActivityRatio, tableName } from ".";

function guildToString(guild: [Snowflake, OAuth2Guild]): string {
    return `${guild[0]} (${wrap(guild[1], colors.LIGHT_YELLOW)})`;
}

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(2, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
}

export async function updateUserRank(client: Client, userId: Snowflake, rank: number) {
    let guilds = await client.guilds.fetch();
    let rank_str = `Rank ${rank}`;

    info(`updating user: ${wrap(userId, colors.BLUE)}, in ${wrap(guilds.size, colors.GREEN)} guilds`);

    for (let guild of guilds) {
        let guild_sync = await guild[1].fetch();
        let member;
        try{
            member = await guild_sync.members.fetch(userId);
        } catch (err) {
            info(`User ${wrap(userId, colors.LIGHT_GREEN)} not present in ${guildToString(guild)}`);
        }
        

        if(member) {
            info(`Updating rank of user ${wrap(member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);

            let role = guild_sync.roles.cache.find(role => role.name === rank_str);
            if (!role) {
                info(`created rank role: ${wrap(rank_str, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
                role = await guild_sync.roles.create({
                    name: `Rank ${rank}`,
                    color: hsvToRgb((rank / 20.0) % 1, 0.7, 0.9)
                });
            }

            await updateGuildMemberRank(member, role);
        }
       
    }
}

async function updateGuildMemberRank(member: GuildMember, role: Role) {

    let previous_role = member.roles.cache.find(role => role.name.startsWith("Rank"));
    if (previous_role != role) {
        //remove previous role
        if (previous_role) {
            info(`${wrap("removed", colors.LIGHT_RED)} role ${previous_role.name} from user ${wrap(member.user.tag, colors.LIGHT_RED)}`);
            member.roles.remove(previous_role);
        }
        info(`${wrap("added", colors.LIGHT_GREEN)} role ${wrap(role.name, colors.GREEN)} to user ${wrap(member.user.tag, colors.BLUE)}`);
        // add the new role
        member.roles.add(role);
    }
}

export function updateAllRanks(client: Client) {
    info(`${wrap("Time to update all ranks", colors.LIGHT_PURPLE)}`);
    dbConnection.query(`SELECT * from ${tableName}`, async function (err, results) {

        if (err) {
            error(`${err.message}: ${err.message}`);
            return;
        }

        const guilds = await client.guilds.fetch();
        info(`\ncurrently serving ${guilds.size} guilds: `);
        for (let guild of guilds) {
            info(guildToString(guild));
        }

        for (let entry of results) {

            if (!entry.ds_id) {
                continue;
            }

            let rank = calculareRank(entry.chat_activity, entry.game_activity);

            if (entry.ds_id.startsWith("id_")) {
                info(`found user: ${wrap(entry.ds_id, colors.BLUE)}, minecraft nick: ${wrap(entry.nickname, colors.LIGHT_GREEN)}, rank: ${wrap(rank, colors.GREEN)}`);
                try {
                    await updateUserRank(client, entry.ds_id.slice(3), rank);
                } catch (err) {
                    error(`Insufficient permissions to update user ${wrap(entry.ds_id, colors.BLUE)}: ${err}`);
                }
                
            } else {
                info(`found unconfirmed user: ${wrap(entry.ds_id, colors.BLUE)}, minecraft nick: ${wrap(entry.nickname, colors.LIGHT_GREEN)},\
 rank: ${wrap(rank, colors.GREEN)}, ${wrap("skipping", colors.LIGHT_RED)}`);
            }
        }

    });
}