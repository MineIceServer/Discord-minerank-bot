import { colors, error, guildToString, info, wrap, createChannelIfNotExists, createRoleIfNotExists, getAllGuilds, swapRoles, tryToGetMember, deleteChannelIfExists, getEnvironmentVar } from "discord_bots_common";
import { CategoryChannel, ChannelType, Client, Role } from "discord.js";
import { tableName } from ".";
import { setOrAppendToMap, sqlQuery } from "./utis";
import YAML from "yaml";
import fs from "fs";

export function readClansConfig() {
    try {
        return YAML.parse(fs.readFileSync(getEnvironmentVar("CLAN_PLUGIN_CONFIG_PATH")).toString()).clans.data;
    } catch (err) {
        return error(err);
    }
}

export function getClanInfo(clans: any, clan_id: string): { clanName: string, clan_members: string[] } {
    const clan_members: string[] = [];
    clan_members.push(clan_id);
    for (const clan_member of clans[clan_id].clanMembers) {
        clan_members.push(clan_member);
    }
    const clanName = clans[clan_id].clanFinalName;
    return { clanName, clan_members };
}

export async function updateAllClans(client: Client) {

    info(`${wrap("🕓 Time to update all clans", colors.LIGHT_PURPLE)}`);

    const clans = readClansConfig();
    if (!clans) {
        return;
    }

    const discord_id_to_nicknames = new Map<string, string[]>();
    const uuid_to_nickname = new Map<string, string>();

    const res = await sqlQuery(`select * from ${tableName} where ds_id LIKE 'id\\_%'`);

    if (res.error) {
        return error(res.error);
    }

    for (const result of res.results) {
        uuid_to_nickname.set(result.uuid, result.nickname);
        setOrAppendToMap(discord_id_to_nicknames, result.ds_id.slice(3), result.nickname);
    }

    const guilds = await getAllGuilds(client);

    const nickname_to_clan_name = new Map<string, string>();

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
            for (const guild of guilds) {
                const clan_role = await createRoleIfNotExists(guild, `Clan '${clan_data.clanName}'`, "Random");

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
                        deny: ["ViewChannel"]
                    }, {
                        id: clan_role,
                        allow: ["ViewChannel"]
                    }]
                });

                await createChannelIfNotExists(guild, {
                    name: `${clan_data.clanName} Voice`,
                    type: ChannelType.GuildVoice,
                    parent: category,
                    permissionOverwrites: [{
                        id: guild.roles.everyone,
                        deny: ["ViewChannel"]
                    }, {
                        id: clan_role,
                        allow: ["ViewChannel"]
                    }]
                });
            }
        } else {
            for (const guild of guilds) {
                await deleteChannelIfExists(guild, `${clan_data.clanName}-text`.toLowerCase());
                await deleteChannelIfExists(guild, `${clan_data.clanName} Voice`);
            }
        }
    }

    for (const [discord_user_id, minecraft_nicknames] of discord_id_to_nicknames) {
        info(`🛠 Updating user: ${wrap(discord_user_id, colors.BLUE)} (minecraft: ${wrap(minecraft_nicknames, colors.LIGHT_GREEN)}) in ${wrap(guilds.length, colors.GREEN)} guilds`);

        const clan_names: string[] = [];
        for (const nickname of minecraft_nicknames) {
            const clan_name = nickname_to_clan_name.get(nickname);
            if (clan_name && !clan_names.includes(clan_name)) {
                clan_names.push(clan_name);
            }
        }

        for (const guild of guilds) {

            const clan_roles: Role[] = [];

            for (const clan_name of clan_names) {
                clan_roles.push(await createRoleIfNotExists(guild, `Clan '${clan_name}'`, "Random"));
            }

            const guild_member = await tryToGetMember(guild, discord_user_id);
            if (guild_member) {
                info(`⚙️ Updating clan roles (${clan_names}) of user ${wrap(guild_member.user.tag, colors.LIGHT_GREEN)} in ${guildToString(guild)}`);
                await swapRoles("Clan", guild_member, clan_roles);
            }
        }
    }

}