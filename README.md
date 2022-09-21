# Discord_minerank_bot

This is a basic discord bot that attaches your discord account to a minecraft account.

## Features
  1. Gives ranks according to player's chat_activity and game_activity (written by a game plugin to a database)
  2. Integrates with `ClansLite` plugin and syncs clans with discord, creates personal voice and text channel per clan
  3. `leaderboard` and `clan_leaderboard` commands to view the leaderbords
  4. `/status` command to see basic information about your minecraft server

Example of a table:
| nickname         | chat_activity | game_activity      | ds_id                                                            |
|------------------|---------------|--------------------|------------------------------------------------------------------|
| Nickname1        |             4 |              17.55 | NULL                                                             |
| Nickname1        |             1 |                2.3 | ab171597dea22086fb43c1xb5e1ea339x17ceeec3e7df619c3522646e5ebd032 |
| Nickname2        |            22 |  329.1715499877934 | id_444811511122191111                                            |


## nickname
This is just player's nickname in minecraft

## chat_activity and game_activity
Those are just arbitrary values signifying player activity in the game, 
you need to use some minecraft plugin to collect activity and write it to the table

Discord rank is calculated as follows: log2(chat_activity * chatActivityRatio + game_activity * gameActivityRatio)
> chatActivityRatio and gameActivityRatio are configurable from the .yml config

## ds_id
This is player's discord id. The intended use is to first give a player some arbitrary value in minecraft and write it to the table,
then the player uses this value in discord with the `/minecraft` command

### Required configuration
`.env`
```ruby

TEST_SERVERS=<server1>,<server2>,<server3>,...
OWNERS=<owner1>,<owner2>,...

RANK_UPDATE_INTERVAL_MINUTES=<update interval (default is every 10 minutes)>
LOOKUP_SERVER=<your minecraft server address>

RANK_PLUGIN_CONFIG_PATH=<RankSystem config path (config.yml)>
CLAN_PLUGIN_CONFIG_PATH=<ClansLite config file path (clans.yml)>

TOKEN=<discord bot token>
```

`config.yml`
```yaml
tableName: <table name>
chatActivityRatio: <any number>
gameActivityRatio: <any number>
db:
  host: <database host>
  port: <database port>
  dbName: <database name>
  login: <database login>
  password: <database password>

```
