import { Client, GuildMember, OAuth2Guild, Role, Snowflake, User } from "discord.js";
import { colors, error, getBaseLog, hsvToRgb, info, wrap } from "discord_bots_common";
import { dbConnection, chatActivityRatio, gameActivityRatio, tableName } from ".";

function guildToString(guild: [Snowflake, OAuth2Guild]): string {
    return `${guild[0]} (${ wrap(guild[1], colors.LIGHT_YELLOW) })`;
}

export function calculareRank(chat_activity: number, game_activity: number) {
    return Math.floor(getBaseLog(5, chatActivityRatio * chat_activity + gameActivityRatio * game_activity + 1));
}

export async function updateUserRank(user: User, rank: number) {
    let guilds = await user.client.guilds.fetch();
    let rank_str = `Rank ${rank}`;

    info(`Updating rank of user ${wrap(user.tag, colors.LIGHT_GREEN)} in ${guilds.size} guilds`);

    for (let guild of guilds) {
        let guild_sync = await guild[1].fetch();
        info(`Updating rank of user ${wrap(user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);

        let role = guild_sync.roles.cache.find(role => role.name === rank_str);
        if (!role) {
            info(`created rank role: ${wrap(rank_str, colors.LIGHTER_BLUE)} in ${guildToString(guild)}`);
            role = await guild_sync.roles.create({
                name: `Rank ${rank}`,
                color: hsvToRgb((rank / 20.0) % 1, 0.7, 0.9)
            });
        }

        updateGuildMemberRank(guild_sync.members.cache.get(user.id)!, role);
    }
}

async function updateGuildMemberRank(member: GuildMember, role: Role) {

    info(`Updating rank of member ${wrap(member.id, colors.LIGHT_GREEN)}`);

    let previous_role = member?.roles.cache.find(role => role.name.startsWith("Rank"));
    if (previous_role != role) {
        //remove previous role
        if (previous_role) {
            info(`${wrap("removed", colors.LIGHT_RED)} role ${previous_role.name} from user ${wrap(member?.user.tag, colors.LIGHT_RED)}`);
            member?.roles.remove(previous_role);
        }
        info(`${wrap("added", colors.LIGHT_GREEN)} role ${wrap(role.name, colors.GREEN)} to user ${wrap(member?.user.tag, colors.BLUE)}`);
        // add the new role
        member?.roles.add(role);
    }
}

export function updateAllRanks(client: Client) {
    info("Time to update all ranks");
    dbConnection.query(`SELECT nickname ds_nickname, chat_activity, game_activity from ${tableName}`, async function (err, results) {
        if (err) {
            error(`${err.message}: ${err.message}`);
            return;
        }

        const guilds = await client.guilds.fetch();
        info("currently serving guilds: ");
        for (let guild of guilds) {
            info(guildToString(guild));
        }

        for (let entry of results) {

            if (!entry.ds_nickname) {
                continue;
            }
            
            let rank = calculareRank(entry.chat_activity, entry.game_activity);

            if (entry.ds_nickname.startsWith("id_")) {
                const user = client.users.cache.get(entry.ds_nickname.slice(3));
                if(user) {
                    info(`found user: ${wrap(user?.tag, colors.BLUE)}, minecraft nick: ${entry.nickname}, rank: ${wrap(rank, colors.GREEN)}`);
                    updateUserRank(user, rank);
                }
            } else {
                info(`found unconfirmed user: ${wrap(entry.ds_nickname, colors.BLUE)}, minecraft nick: ${entry.nickname}, rank: ${wrap(rank, colors.GREEN)}, skipping`);
            }
        }

    });
}