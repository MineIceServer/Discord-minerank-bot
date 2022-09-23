import YAML from 'yaml'
import fs from 'fs'
import { colors, error, guildToString, info, wrap } from 'discord_bots_common';
import { CategoryChannel, ChannelType, Client, Role } from 'discord.js';
import { createChannelIfNotExists, createRoleIfNotExists, getAllGuilds, swapRoles, tryToGetMember } from './role_utils';
import { dbConnection, tableName } from '.';

export function getClanInfo(clans: any, clan_id: string): { clanName: string, clan_members: string[] } {
    let clan_members: string[] = [];
    clan_members.push(clan_id);
    for (const clan_member of clans[clan_id].clanMembers) {
        clan_members.push(clan_member);
    }
    const clanName = clans[clan_id].clanFinalName;
    return { clanName, clan_members }
}

export async function updateAllClans(client: Client) {

    info(`${wrap("🕓 Time to update all clans", colors.LIGHT_PURPLE)}`);

    let clans: any;
    try {
        clans = YAML.parse(fs.readFileSync(process.env.CLAN_PLUGIN_CONFIG_PATH!).toString()).clans.data;
    } catch (err) {
        error(err);
        return;
    }

    let discord_attached_users = new Map<string, string[]>();
    let uuid_to_nickname = new Map<string, string>();

    dbConnection.query(`select * from ${tableName} where ds_id is not null`,
        async function (err, results) {

            if (err) {
                error(err);
                return;
            }

            for (const result of results) {
                uuid_to_nickname.set(result.uuid, result.nickname);
                if (discord_attached_users.has(result.ds_id)) {
                    discord_attached_users.get(result.ds_id.slice(3))!.push(result.nickname);
                } else {
                    discord_attached_users.set(result.ds_id.slice(3), result.nickname);
                }
            }
        });

    let guilds = await getAllGuilds(client);

    let nickname_to_clan_name = new Map<string, string>();

    // create channels and roles for clans
    for (const clan_id in clans) {

        const clan_data = getClanInfo(clans, clan_id);

        let create_clan = false;

        for (const clan_members_uuid of clan_data.clan_members) {
            const nickname = uuid_to_nickname.get(clan_members_uuid);
            if (nickname) {
                nickname_to_clan_name.set(nickname, clan_data.clanName);
                create_clan = true;
            } else {
                info(`🟨 Clan member ${wrap(clan_members_uuid, colors.CYAN)} doesn't have a connected discord account`);
            }
        }

        // create clan if it has at least one member registered in discord
        if (create_clan) {
            for (let guild of guilds) {
                const clan_role = await createRoleIfNotExists(guild, `Clan '${clan_data.clanName}'`, 'Random');

                let category;
                if (process.env.CLAN_CHANNELS_CATEGORY) {
                    category = await createChannelIfNotExists(guild, {
                        name: process.env.CLAN_CHANNELS_CATEGORY,
                        type: ChannelType.GuildCategory
                    }) as CategoryChannel;
                }

                await createChannelIfNotExists(guild, {
                    name: `${clan_data.clanName}-text`.toLowerCase(),
                    type: ChannelType.GuildText,
                    parent: category,
                    permissionOverwrites: [{
                        id: guild.roles.everyone,
                        deny: ['ViewChannel']
                    }, {
                        id: clan_role,
                        allow: ['ViewChannel']
                    }]
                });

                await createChannelIfNotExists(guild, {
                    name: `${clan_data.clanName} Voice`,
                    type: ChannelType.GuildVoice,
                    parent: category,
                    permissionOverwrites: [{
                        id: guild.roles.everyone,
                        deny: ['ViewChannel']
                    }, {
                        id: clan_role,
                        allow: ['ViewChannel']
                    }]
                });
            }
        }
    }

    for (const [discord_user_id, minecraft_nicknames] of discord_attached_users) {
        info(`🛠 Updating user: ${wrap(discord_user_id, colors.BLUE)} (minecraft: ${wrap(minecraft_nicknames, colors.LIGHT_GREEN)}) in ${wrap(guilds.length, colors.GREEN)} guilds`);
        
        let clan_names: string[] = [];
        for (const nickname of minecraft_nicknames) {
            const clan_name = nickname_to_clan_name.get(nickname);
            if (clan_name && !clan_names.includes(clan_name)) {
                clan_names.push(clan_name);
            }
        }

        if (!clan_names.length) {
            info(`🟨 User is not present in any clans`);
            continue;
        }

        for (const guild of guilds) {

            let clan_roles: Role[] = [];
            
            for (const clan_name of clan_names) {
                clan_roles.push(await createRoleIfNotExists(guild, `Clan '${clan_name}'`, 'Random'));
            }

            const guild_member = await tryToGetMember(guild, discord_user_id);
            if (guild_member) {
                info(`⚙️ Updating clan roles (${clan_names}) of user ${wrap(guild_member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);
                await swapRoles('Clan', guild_member, clan_roles);
            }
        }
    }

}