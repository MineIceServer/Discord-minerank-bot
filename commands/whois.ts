import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType, GuildMember, Role, User } from "discord.js";
import { dbConnection, tableName } from "..";
import { error, safeReply } from "discord_bots_common";

function getMinecraftNicknamesById(id: string) {
    return new Promise<{message: string, error?: boolean}>(resolve => {
        dbConnection.query(`SELECT * from ${tableName} WHERE ds_id = 'id_${id}'`,
            function (err, results) {

                if (err) {
                    error(err);
                    return resolve({ message: "❌ Sql error ocurred", error: true });
                }

                if (results.length) {
                    let message = "🖇 Associated minecraft nicknames:";
                    for (const result of results) {
                        message += ` ${result.nickname}`;
                    }
                    return resolve({ message: message });
                } else {
                    return resolve({ message: "🚫 No associated minecraft nicknames", error: true });
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

        const mentionable = interaction!.options.getMentionable("member");
        if (mentionable instanceof User || mentionable instanceof GuildMember) {
            await safeReply(interaction, (await getMinecraftNicknamesById(mentionable.id)).message, true);
        } else if (mentionable instanceof Role) {

            let str = `--stats of role ${mentionable.name}--`;
            const all_members = await guild?.members.fetch();
            let access_members = 0;
            if (all_members) {
                for (const [,member] of all_members) {
                    const nicknames = await getMinecraftNicknamesById(member.id);
                    if (!nicknames.error) {
                        if (str.length + nicknames.message.length < 1900) {
                            str += `\n${member.user.tag}: ${nicknames.message}`;
                        } else {
                            access_members ++;
                        }
                    }
                }
            }

            await safeReply(interaction, str + (access_members > 0) ? `... + ${access_members} more members` : "", true);
        }

    }
} as ICommand;