import { ICommand } from "dkrcommands";
import { colors, error, info, safeReply, wrap } from "discord_bots_common";
import { dbConnection, getAllQuery, tableName } from "..";
import { calculareRank } from "../role_utils";
import { EmbedBuilder, Guild } from "discord.js";
import fs from 'fs';
import YAML from 'yaml'

function guildToString(guild: Guild | null): string {
    return `${guild?.id} (${wrap(guild?.name, colors.LIGHT_YELLOW)})`;
}

export default {
    category: 'Ranking',
    description: 'Display clan leaderboard by rank',

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction }) => {

        await interaction?.deferReply();

        let clans: any;
        try {
            clans = YAML.parse(fs.readFileSync(process.env.CLAN_PLUGIN_CONFIG_PATH!).toString()).clans.data;
        } catch (err) {
            error(err);
            return;
        }

        let allClans = new Map<string, string[]>();

        for(const clan_id in clans) {
            let clan_members: string[] = [];
            clan_members.push(clan_id);
            for (const clan_member of clans[clan_id].clanMembers) {
                clan_members.push(clan_member);
            }
            allClans.set(clans[clan_id].clanFinalName, clan_members);
        }

        dbConnection.query(`select * from ${tableName}`,
            async function (err, results) {

                if (err) {
                    error(err);
                    safeReply(interaction!, "❌ Sql error ocurred");
                    return;
                }

                let embed = new EmbedBuilder();
                embed.setColor("DarkAqua");
                embed.setTitle(`🏆 Clan Leaderboard`);

                let rank_map = new Map<number, string>();
                let total_users = 0;

                for (const [clan_name, clan_members] of allClans) {
                    let total_chat_activity = 0;
                    let total_game_activity = 0;
                    for (let entry of results) {
                        if (clan_members.includes(entry.uuid)) {
                            total_chat_activity += entry.chat_activity;
                            total_game_activity += entry.game_activity;
                        }
                    }
                    
                    total_users += clan_members.length;
                    const combined_clan_name = `${clan_name} (${clan_members.length})`;

                    const rank = calculareRank(total_chat_activity, total_game_activity);
                    if (rank_map.has(rank)) {
                        rank_map.set(rank, `${rank_map.get(rank)}, ${combined_clan_name}`);
                        continue;
                    }
                    rank_map.set(rank, combined_clan_name);
                }

                const rank_map_sorted = new Map([...rank_map.entries()]
                    .sort((a, b) => (isNaN(b[0]) ? 10000 : b[0]) - (isNaN(a[0]) ? 10000 : a[0])));

                for (const [rank, members] of rank_map_sorted) {
                    if (members) {
                        embed.addFields([
                            {
                                name: `Rank ${rank}`,
                                value: members
                            }
                        ]);
                    }
                }
                embed.setDescription(`${total_users} users 👤`);

                await safeReply(interaction!, embed);

            });

    }
} as ICommand