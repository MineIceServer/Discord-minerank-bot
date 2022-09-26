import { EmbedBuilder } from "discord.js";

export function sortAndConstructRankMap(embed: EmbedBuilder, rank_map: Map<number, string>, member_count: number) {
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
    embed.setDescription(`${member_count} users 👤`);
    return embed;
}

export function setOrAppendToMap(map: Map<string, string[]>, key: string, value: string) {
    if (map.has(key)) {
        map.get(key)!.push(value);
    } else {
        map.set(key, [value]);
    }
}

export function setOrAppendToRankMap(rank_map: Map<number, string>, rank: number, data: string): number {
    if(data) {
        if (rank_map.has(rank)) {
            rank_map.set(rank, `${rank_map.get(rank)}, ${data}`);
        } else {
            rank_map.set(rank, data);
        }
        return 1;
    }
    return 0;
}