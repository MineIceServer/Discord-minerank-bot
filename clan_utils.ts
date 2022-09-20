import YAML from 'yaml'
import fs from 'fs'
import { colors, error, guildToString, info, wrap } from 'discord_bots_common';
import { ChannelType, Client, GuildChannelCreateOptions } from 'discord.js';
import { createChannelIfNotExists, createRoleIfNotExists, getAllGuilds, swapRoles, tryToGetMember } from './role_utils';
import { dbConnection, tableName } from '.';

export async function updateAllClans(client: Client) {

    info(`${wrap("🕓 Time to update all clans", colors.LIGHT_PURPLE)}`);

    let clans: any;
    try {
        clans = YAML.parse(fs.readFileSync(process.env.CLAN_PLUGIN_CONFIG_PATH!).toString()).clans.data;
    } catch (err) {
        error(err);
        return;
    }

    let registeredUsers = new Map<string, string>();
    let allUsers = new Map<string, string>();
    dbConnection.query(`select * from ${tableName}`,
        async function (err, results) {

            if (err) {
                error(err);
                return;
            }

            for (const result of results) {
                if (result.ds_id) {
                    registeredUsers.set(result.uuid, result.ds_id.slice(3));
                }
                allUsers.set(result.uuid, result.nickname);
            }
        });

    let guilds = await getAllGuilds(client);

    for (const clan_id in clans) {
        let clan_members: string[] = [];
        clan_members.push(clan_id);
        for (const clan_member of clans[clan_id].clanMembers) {
            clan_members.push(clan_member);
        }
        const clanName = clans[clan_id].clanFinalName;

        info(`\n🛠 Updating clan: ${wrap(clanName, colors.PURPLE)} with ${wrap(clan_members.length, colors.LIGHT_GREEN)} members`);

        for (const clan_member_id of clan_members) {
            const user_minecraft_nickname = allUsers.get(clan_member_id) || clan_member_id;

            if (registeredUsers.has(clan_member_id)) {

                const user_discord_id = registeredUsers.get(clan_member_id)!;
                info(`🛠 Updating user: ${wrap(registeredUsers.get(clan_member_id)!, colors.BLUE)} (minecraft: ${wrap(user_minecraft_nickname, colors.LIGHT_GREEN)}), in ${wrap(guilds.length, colors.GREEN)} guilds`);

                for (let guild of guilds) {

                    const guild_member = await tryToGetMember(guild, user_discord_id);
                    const clan_role = await createRoleIfNotExists(guild, `Clan '${clanName}'`, 'Random');

                    const text_channel_options: GuildChannelCreateOptions = {
                        name: `Clan '${clanName}'`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [{
                            id: guild.roles.everyone,
                            deny: ['ViewChannel']
                        }, {
                            id: clan_role,
                            allow: ['ViewChannel']
                        }]
                    }
                    let voice_channel_options = text_channel_options;
                    voice_channel_options.name = `Clan '${clanName}' voice`;
                    voice_channel_options.type = ChannelType.GuildVoice;

                    createChannelIfNotExists(guild, text_channel_options);
                    createChannelIfNotExists(guild, voice_channel_options);

                    if (guild_member) {
                        info(`⚙️ Updating clan of user ${wrap(guild_member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);
                        await swapRoles('Clan', guild_member, clan_role);
                    }
                }
            } else {
                info(`🟨 Minecraft user ${wrap(user_minecraft_nickname, colors.CYAN)} doesn't have a connected discord account`);
            }
        }
    }
}