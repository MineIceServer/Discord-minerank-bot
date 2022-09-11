import { ICommand } from "dkrcommands";
import { safeReply } from "@discord_bots_common/utils";
import { dbConnection, tableName } from "..";
import { calculareRank, updateUserRank } from "../role_utils";

export default {
    category: 'Miscellaneous',
    description: 'Attach discord to minecraft nickname',

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,
    
    expectedArgs: 'id',
    expectedArgsTypes: ['STRING'],
    minArgs: 1,
    maxArgs: 1,

    callback: async ({ interaction, user }) => {

        let interaction_nn = interaction!;
        let id = interaction_nn.options.get("id");

        dbConnection.query(`SELECT * from ${tableName} WHERE ds_nickname = ${id}`, 
        async function (err, results) {
            if (err || !results.nickname) {
                safeReply(interaction_nn, "Invalid id", true);
            } else {
                dbConnection.query(`UPDATE ${tableName} SET ds_nickname = id_${user.id} WHERE ds_nickname = ${id}`);
                safeReply(interaction_nn, `Successfully attached to ${results.nickname}`, true);
                updateUserRank(user.client, user.id, calculareRank(results[0].chat_activity, results[0].game_activity));
            }
        });

    }
} as ICommand