import { ICommand } from "dkrcommands";
import { error, safeReply } from "discord_bots_common";
import { dbConnection, tableName } from "..";
import { calculareRank } from "../role_utils";
import { EmbedBuilder } from "discord.js";
import { getClanInfo } from "../clan_utils";
import { readClansConfig, setOrAppendToRankMap, sortAndConstructRankMap } from "../utis";

export default {
    category: "Ranking",
    description: "Display clan leaderboard by rank",

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction }) => {

        await interaction?.deferReply();

        const clans = readClansConfig();
        if (!clans) {
            return safeReply(interaction, "❌ An error ocurred", true);
        }


        const allClans: {clanName: string, clan_members: string[]}[]= [];

        for (const clan_id in clans) {
            allClans.push(getClanInfo(clans, clan_id));
        }

        dbConnection.query(`select * from ${tableName}`,
            async function (err, results) {

                if (err) {
                    error(err);
                    return safeReply(interaction, "❌ Sql error ocurred");
                }

                const embed = new EmbedBuilder();
                embed.setColor("DarkAqua");
                embed.setTitle(`🏆 Clan Leaderboard`);

                const rank_map = new Map<number, string>();
                let total_users = 0;

                for (const clan_data of allClans) {

                    let total_chat_activity = 0;
                    let total_game_activity = 0;

                    for (const entry of results) {
                        if (clan_data.clan_members.includes(entry.uuid)) {
                            total_chat_activity += entry.chat_activity;
                            total_game_activity += entry.game_activity;
                        }
                    }
                    
                    total_users += clan_data.clan_members.length;
                    
                    setOrAppendToRankMap(rank_map, 
                        calculareRank(total_chat_activity, total_game_activity), 
                        `${clan_data.clanName} (${clan_data.clan_members.length})`);
                }

                await safeReply(interaction, sortAndConstructRankMap(embed, rank_map, total_users));

            });

    }
} as ICommand;