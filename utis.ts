import { EmbedBuilder } from "discord.js";
import { error } from "discord_bots_common";
import { MysqlError } from "mysql";
import { dbConnection, tableName } from ".";

export function sortAndConstructRankMap(embed: EmbedBuilder, rank_map: Map<number, string>, member_count: number) {
    const rank_map_sorted = new Map([...rank_map.entries()]
        .sort((a, b) => (isNaN(b[0]) ? 10000 : b[0]) - (isNaN(a[0]) ? 10000 : a[0])));

    for (const [rank, members] of rank_map_sorted) {
        if (members) {
            embed.addFields([{
                name: `Rank ${rank}`,
                value: members
                }
            ]);
        }
    }
    embed.setDescription(`${member_count} users 👤`);
    return embed;
}

export function setOrAppendToRankMap(rank_map: Map<number, string>, rank: number, data: string): number {
    if (data) {
        if (rank_map.has(rank)) {
            rank_map.set(rank, `${rank_map.get(rank)}, ${data}`);
        } else {
            rank_map.set(rank, data);
        }
        return 1;
    }
    return 0;
}

export function selectByDiscordId(id: string) {
    return sqlQuery(`SELECT * from ${tableName} WHERE ds_id = '${id}'`);
}

export function sqlQuery(query: string) {
    return new Promise<{ results?: any, error: MysqlError | null }>(resolve => {
        dbConnection.query(query,
            function (err, results) {
                if (err) {
                    error(`❌ An sql error ocurred while executing query: ${query} | error: ${err}`);
                }
                resolve({ results: results, error: err });
            });
    });
}
