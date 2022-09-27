import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType, GuildMember, Role, User } from "discord.js";
import { dbConnection, tableName } from "..";
import { error, safeReply } from "discord_bots_common";

function getMinecraftNicknamesById(id: string) {
    return new Promise<string>(resolve => {
        dbConnection.query(`SELECT * from ${tableName} WHERE ds_id = 'id_${id}'`,
            function (err, results) {

                if (err) {
                    error(err);
                    return resolve("❌ Sql error ocurred");
                }

                if (results.length) {
                    let message = "🖇 Associated minecraft nicknames:";
                    for (const result of results) {
                        message += ` ${result.nickname}`;
                    }
                    return resolve(message);
                } else {
                    return resolve("🚫 No associated minecraft nicknames");
                }

            });
    });
}

export default {
    category: "Administration",
    description: "Display minecraft nicknames assiciated with a given user",

    slash: true,
    testOnly: true,
    ownerOnly: true,
    hidden: true,

    options: [
        {
            name: "member",
            description: "Server member",
            //descriptionLocalizations: {
            //    ru: "ID, который вы получили из майнкрафта"
            //},
            required: true,
            type: ApplicationCommandOptionType.Mentionable,
        }
    ],

    callback: async ({ interaction, guild }) => {

        const interaction_nn = interaction!;
        const mentionable = interaction_nn.options.getMentionable("member");
        if (mentionable instanceof User || mentionable instanceof GuildMember) {
            safeReply(interaction_nn, await getMinecraftNicknamesById(mentionable.id), true);
        } else if (mentionable instanceof Role) {
            const members = (await guild?.roles.fetch(mentionable.id))?.members;
            let str = `--stats of role ${mentionable.name} (${members?.size} users)--`;
            if (members) {
                for (const member of members) {
                    str += `\n${member[1].user.tag}: ${await getMinecraftNicknamesById(member[1].id)}`;
                }
            }
            await safeReply(interaction_nn, str, true);
        }

    }
} as ICommand;