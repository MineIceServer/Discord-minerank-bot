import { ICommand } from "dkrcommands";
import { colors, error, getEnvironmentVar, info, safeReply, wrap } from "discord_bots_common";
import { dbConnection, tableName } from "..";
import { ApplicationCommandOptionType, ColorResolvable } from "discord.js";
import fs from "fs";
import YAML from "yaml";

export default {
    category: "Clans",
    description: "Set your clan color",

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    options: [
        {
            name: "color",
            description: "New color (hex or name)",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "clan",
            description: "Your clan",
            required: true,
            type: ApplicationCommandOptionType.Role
        }
    ],

    callback: async ({ interaction, user, guild }) => {

        const new_color = interaction!.options.getString("color")!;
        const clan_role = interaction!.options.getRole("clan")!;

        if (!clan_role.name.startsWith("Clan")) {
            return safeReply(interaction, "🚫 That does not look like a clan, clan roles start with 'Clan'", true);
        }

        let clans: any;
        try {
            clans = YAML.parse(fs.readFileSync(getEnvironmentVar("CLAN_PLUGIN_CONFIG_PATH")).toString()).clans.data;
        } catch (err) {
            error(err);
            return safeReply(interaction, "❌ An error ocurred", true);
        }

        let resolved_color: ColorResolvable;
        try {
            resolved_color = new_color as ColorResolvable;
        } catch (err) {
            error(err);
            return safeReply(interaction, "❌ Invalid color", true);
        }

        dbConnection.query(`SELECT * from ${tableName} WHERE ds_id = 'id_${user.id}'`,
            async function (err, results) {

                if (err) {
                    error(err);
                    return safeReply(interaction, "❌ An error occurred", true);
                }

                if (!results.length) {
                    return safeReply(interaction, "❌ Your discord account is not attached to any minecraft account, use `/minecraft` to attach", true);
                }

                info(`📄 ${wrap(user.tag, colors.LIGHT_GREEN)} used 'clan_color' with color ${wrap(new_color, colors.LIGHT_BLUE)}`);

                let owns = false;
                let exists = false;
                for (const result of results) {
                    if (result.uuid in clans) {
                        exists = true;
                        if (`Clan '${clans[result.uuid].clanFinalName}'` == clan_role.name) {
                            owns = true;
                            break;
                        }
                    }
                }

                if (!exists) {
                    return safeReply(interaction, "❌ You don't own any clans", true);
                }

                if (!owns) {
                    return safeReply(interaction, "❌ You are not the owner of the clan", true);
                }

                (await guild?.roles.fetch())?.get(clan_role.id)?.edit({ color: resolved_color });

                safeReply(interaction, `🎨 Updated color, new color: ${new_color}`, true);
            });

    }
} as ICommand;