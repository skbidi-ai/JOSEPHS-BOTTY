const { Client, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, GatewayIntentBits, Partials, time, PermissionsBitField, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.ThreadMember
    ]
});

  // Host the bot:
  require('http')
    .createServer((req, res) => res.end(''))
    .listen(3030);

  client.once('ready', () => {
    console.log(client.user.username + ' is ready!');
    console.log('== The logs are starting from here ==');
    console.log('Log channel ID:', log);
    const logChannel = client.channels.cache.get(log);
    if (logChannel) {
      console.log('Log channel found:', logChannel.name);
    } else {
      console.error('Log channel NOT found! Check channel ID in config.js');
    }
    console.log('Logging config:', getLoggingConfig());
  });

const config = require("./config.js");
const CoinManager = require("./coins.js");
const fs = require('fs');
const owner = config.modmail.ownerID
const supportcat = config.modmail.supportId
const premiumcat = config.modmail.premiumId
const whitelistrole = config.modmail.whitelist
const staffID = config.modmail.staff
const log = config.logs.logschannel;
const cooldowns = new Map(); // Map to track cooldowns
const coinManager = new CoinManager();

// Logging configuration functions
function getLoggingConfig() {
  try {
    return JSON.parse(fs.readFileSync('./logging.json', 'utf8'));
  } catch (error) {
    // Default config if file doesn't exist
    const defaultConfig = {
      pointsTransactions: true,
      historyViews: true,
      ticketCreation: true,
      ticketDeletion: true,
      ticketClosure: true,
      balanceChecks: false,
      leaderboardViews: false,
      helpCommands: false
    };
    fs.writeFileSync('./logging.json', JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
}

function updateLoggingConfig(config) {
  fs.writeFileSync('./logging.json', JSON.stringify(config, null, 2));
}

function shouldLog(logType) {
  const config = getLoggingConfig();
  return config[logType] === true;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Coin commands
  if (message.content.toLowerCase().startsWith("!points")) {
    const args = message.content.split(" ");
    const command = args[1];

    // Check balance
    if (!command || command === "balance") {
      const userId = message.mentions.users.first()?.id || message.author.id;
      const balance = coinManager.getBalance(userId);
      const user = message.mentions.users.first() || message.author;

      const balanceEmbed = new EmbedBuilder()
        .setTitle("Points Balance")
        .setDescription(`${user.displayName} has **${balance}** Refferal Points`)
        .setColor("#00FF46")
        .setThumbnail(user.displayAvatarURL());

      // Log balance check if enabled
      if (shouldLog('balanceChecks') && userId !== message.author.id) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🔍 Balance Check Log")
          .setDescription(`**User:** ${message.author.displayName}\n**Checked Balance Of:** ${user.displayName}\n**Current Balance:** ${balance}`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `Target User ID: ${userId} | Checker ID: ${message.author.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }

      return message.channel.send({ embeds: [balanceEmbed] });
    }

    // Admin commands - check if user has admin permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== owner) {
      return message.channel.send("❌ You need administrator permissions to use this command.");
    }

    // Give coins
    if (command === "give") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[3]);

      if (!user || isNaN(amount) || amount <= 0) {
        return message.channel.send("❌ Usage: `!Points give @user amount`");
      }

      const oldBalance = coinManager.getBalance(user.id);
      const newBalance = coinManager.addCoins(user.id, amount, message.author.id);

      const giveEmbed = new EmbedBuilder()
        .setTitle("💰 Points Given")
        .setDescription(`Given **${amount}** Points to ${user.displayName}\nNew balance: **${newBalance}** Points`)
        .setColor("#00FF46")
        .setThumbnail(user.displayAvatarURL());

      message.channel.send({ embeds: [giveEmbed] });

      // Log to the logs channel if enabled
      if (shouldLog('pointsTransactions')) {
        const logEmbed = new EmbedBuilder()
          .setTitle("📊 Points Transaction Log")
          .setDescription(`**Action:** Points Given\n**Admin:** ${message.author.displayName}\n**User:** ${user.displayName}\n**Amount:** +${amount}\n**Old Balance:** ${oldBalance}\n**New Balance:** ${newBalance}`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${user.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }
    }

    // Remove coins
    else if (command === "remove") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[3]);

      if (!user || isNaN(amount) || amount <= 0) {
        return message.channel.send("❌ Usage: `!Points remove @user amount`");
      }

      const oldBalance = coinManager.getBalance(user.id);
      const newBalance = coinManager.removeCoins(user.id, amount, message.author.id);

      const removeEmbed = new EmbedBuilder()
        .setTitle("💰 Refferal Points Removed")
        .setDescription(`Removed **${amount}** Points from ${user.displayName}\nNew balance: **${newBalance}** Points`)
        .setColor("#00FF46")
        .setThumbnail(user.displayAvatarURL());

      message.channel.send({ embeds: [removeEmbed] });

      // Log to the logs channel if enabled
      if (shouldLog('pointsTransactions')) {
        const logEmbed = new EmbedBuilder()
          .setTitle("📊 Points Transaction Log")
          .setDescription(`**Action:** Points Removed\n**Admin:** ${message.author.displayName}\n**User:** ${user.displayName}\n**Amount:** -${amount}\n**Old Balance:** ${oldBalance}\n**New Balance:** ${newBalance}`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${user.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }
    }

    // Set coins
    else if (command === "set") {
      const user = message.mentions.users.first();
      const amount = parseInt(args[3]);

      if (!user || isNaN(amount) || amount < 0) {
        return message.channel.send("❌ Usage: `!Refferal Points @user amount`");
      }

      const oldBalance = coinManager.getBalance(user.id);
      const newBalance = coinManager.setCoins(user.id, amount, message.author.id);

      const setEmbed = new EmbedBuilder()
        .setTitle("💰 Refferal Points Set")
        .setDescription(`Set ${user.displayName}'s Refferal Points to **${newBalance}**`)
        .setColor("#00FF46")
        .setThumbnail(user.displayAvatarURL());

      message.channel.send({ embeds: [setEmbed] });

      // Log to the logs channel if enabled
      if (shouldLog('pointsTransactions')) {
        const logEmbed = new EmbedBuilder()
          .setTitle("📊 Points Transaction Log")
          .setDescription(`**Action:** Points Set\n**Admin:** ${message.author.displayName}\n**User:** ${user.displayName}\n**Old Balance:** ${oldBalance}\n**New Balance:** ${newBalance}`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${user.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }
    }

    // Leaderboard
    else if (command === "leaderboard" || command === "lb") {
      const leaderboard = coinManager.getLeaderboard(10);

      if (leaderboard.length === 0) {
        return message.channel.send("📊 No users have Refferal Points yet!");
      }

      let description = "";
      for (let i = 0; i < leaderboard.length; i++) {
        const [userId, coins] = leaderboard[i];
        const user = client.users.cache.get(userId);
        const username = user ? user.displayName : "Unknown User";
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        description += `${medal} **${username}** - ${coins} Refferal Points\n`;
      }

      const leaderboardEmbed = new EmbedBuilder()
        .setTitle("🏆 Refferal Points Leaderboard")
        .setDescription(description)
        .setColor("#00FF46")
        .setFooter({ text: `${message.guild.name} | Top 10 Users` });

      // Log leaderboard view if enabled
      if (shouldLog('leaderboardViews')) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🏆 Leaderboard View Log")
          .setDescription(`**User:** ${message.author.displayName}\n**Action:** Viewed leaderboard`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${message.author.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }

      message.channel.send({ embeds: [leaderboardEmbed] });
    }

    // History command
    else if (command === "history") {
      const user = message.mentions.users.first();

      if (!user) {
        return message.channel.send("❌ Usage: `!Points history @user`");
      }

      const history = coinManager.getHistory(user.id, 10);

      if (history.length === 0) {
        return message.channel.send(`📊 No transaction history found for ${user.displayName}.`);
      }

      let description = "";
      for (const transaction of history) {
        const admin = client.users.cache.get(transaction.adminId);
        const adminName = admin ? admin.displayName : "Unknown Admin";
        const date = new Date(transaction.timestamp).toLocaleDateString();
        const time = new Date(transaction.timestamp).toLocaleTimeString();

        let actionText = "";
        if (transaction.action === "give") {
          actionText = `📈 **+${transaction.amount}** points given`;
        } else if (transaction.action === "remove") {
          actionText = `📉 **-${transaction.amount}** points removed`;
        } else if (transaction.action === "set") {
          actionText = `⚖️ Points set to **${transaction.newBalance}**`;
        }

        description += `${actionText}\n`;
        description += `🔸 **Admin:** ${adminName}\n`;
        description += `🔸 **Balance:** ${transaction.oldBalance} → ${transaction.newBalance}\n`;
        description += `🔸 **Date:** ${date} at ${time}\n\n`;
      }

      const historyEmbed = new EmbedBuilder()
        .setTitle(`📊 Points History for ${user.displayName}`)
        .setDescription(description)
        .setColor("#00FF46")
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `Showing last 10 transactions | User ID: ${user.id}` });

      message.channel.send({ embeds: [historyEmbed] });

      // Log the history view to the logs channel if logging is enabled
      if (shouldLog('historyViews')) {
        const viewLogEmbed = new EmbedBuilder()
          .setTitle("👁️ History View Log")
          .setDescription(`**User:** ${message.author.displayName}\n**Viewed History Of:** ${user.displayName}\n**Action:** Viewed transaction history`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `Target User ID: ${user.id} | Viewer ID: ${message.author.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [viewLogEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }
    }

    // Help command
    else if (command === "help") {
      const helpEmbed = new EmbedBuilder()
        .setTitle("💰 Refferal Points System Help")
        .setDescription(`
**User Commands:**
\`!Points\` or \`!Points balance\` - Check your Refferal Points balance
\`!Points balance @user\` - Check another user's balance
\`!Points leaderboard\` - View the top 10 users

**Admin Commands:**
\`!Points give @user amount\` - Give Refferal Points to a user
\`!Points remove @user amount\` - Remove Refferal Points from a user
\`!Points set @user amount\` - Set a user's Refferal Points balance
\`!Points history @user\` - View transaction history for a user

**Owner Commands:**
\`!log status\` - View current logging settings
\`!log toggle <type>\` - Toggle specific logging type
\`!log enable <type>\` - Enable specific logging type
\`!log disable <type>\` - Disable specific logging type
        `)
        .setColor("#00FF46")
        .setFooter({ text: "Admin commands require Administrator permissions" });

      // Log help command usage if enabled
      if (shouldLog('helpCommands')) {
        const logEmbed = new EmbedBuilder()
          .setTitle("❓ Help Command Log")
          .setDescription(`**User:** ${message.author.displayName}\n**Action:** Viewed help command`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${message.author.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }

      message.channel.send({ embeds: [helpEmbed] });
    }
  }

  // Logging management commands (Owner only)
  if (message.content.toLowerCase().startsWith("!log") && message.author.id === owner) {
    const args = message.content.split(" ");
    const command = args[1];

    if (command === "status") {
      const config = getLoggingConfig();
      let statusText = "";

      Object.entries(config).forEach(([key, value]) => {
        const emoji = value ? "✅" : "❌";
        const readableName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        statusText += `${emoji} **${readableName}**: ${value ? 'Enabled' : 'Disabled'}\n`;
      });

      const statusEmbed = new EmbedBuilder()
        .setTitle("📊 Logging Status")
        .setDescription(statusText)
        .setColor("#00FF46")
        .setFooter({ text: "Use !log toggle <type> to change settings" });

      return message.channel.send({ embeds: [statusEmbed] });
    }

    if (command === "toggle" || command === "enable" || command === "disable") {
      const logType = args[2];
      const config = getLoggingConfig();

      if (!logType || !config.hasOwnProperty(logType)) {
        const availableTypes = Object.keys(config).join(", ");
        return message.channel.send(`❌ Invalid log type. Available types: ${availableTypes}`);
      }

      if (command === "toggle") {
        config[logType] = !config[logType];
      } else if (command === "enable") {
        config[logType] = true;
      } else if (command === "disable") {
        config[logType] = false;
      }

      updateLoggingConfig(config);

      const action = config[logType] ? 'enabled' : 'disabled';
      const emoji = config[logType] ? '✅' : '❌';

      const confirmEmbed = new EmbedBuilder()
        .setTitle("⚙️ Logging Updated")
        .setDescription(`${emoji} **${logType}** logging has been **${action}**`)
        .setColor("#00FF46");

      return message.channel.send({ embeds: [confirmEmbed] });
    }

    if (command === "help") {
      const helpEmbed = new EmbedBuilder()
        .setTitle("📝 Logging Management Help")
        .setDescription(`
**Commands:**
\`!log status\` - View current logging settings
\`!log toggle <type>\` - Toggle specific logging type
\`!log enable <type>\` - Enable specific logging type
\`!log disable <type>\` - Disable specific logging type

**Available Log Types:**
• \`pointsTransactions\` - Points give/remove/set actions
• \`historyViews\` - When someone views another user's history
• \`ticketCreation\` - When tickets are created
• \`ticketDeletion\` - When tickets are deleted
• \`ticketClosure\` - When tickets are closed
• \`balanceChecks\` - When someone checks another user's balance
• \`leaderboardViews\` - When someone views the leaderboard
• \`helpCommands\` - When someone uses help commands
        `)
        .setColor("#00FF46")
        .setFooter({ text: "Only the bot owner can manage logging settings" });

      return message.channel.send({ embeds: [helpEmbed] });
    }
  }

  if (message.author.id === owner) {
    if (message.content.toLowerCase().startsWith("!ticket-embed")) {
      message.delete();
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel("💰 Points Claiming Tickets")
            .setStyle(ButtonStyle.Primary)
            .setCustomId("support"),
          new ButtonBuilder()
            .setLabel("💸 Middleman Tickets")
            .setStyle(ButtonStyle.Primary)
            .setCustomId("premium")
        );

      const ticketmsg = new EmbedBuilder()
        .setTitle(`Bloxly Trading Tickets`)

        .setDescription(

          `**Welcome to our Ticket System!** 🎫
         ==========================
💰 **Points Claiming Tickets:** For claiming your referral points.

💸 **Middleman Tickets:** For using our free middleman services.
`
        )
        .setFooter({ text: `${message.guild.name} Tickets | Made by Bloxly Trading`, iconURL: message.guild.iconURL() })
        .setColor("#00FF46");

      message.channel.send({
        embeds: [ticketmsg],
        components: [row],
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "support" || interaction.customId === "premium") {
        const userId = interaction.user.id;

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("⚙️ Manage")
            .setCustomId("close")
            .setStyle(ButtonStyle.Primary)
        );

        const userBalance = coinManager.getBalance(interaction.user.id);

        const pointsEmbed = new EmbedBuilder()
          .setTitle("💰 Points Balance")
          .setDescription(`**${interaction.user.displayName}** currently has **${userBalance}** Refferal Points`)
          .setColor("#00FF46")
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: "Points Balance | Staff Information" });

        const supportmsg = new EmbedBuilder()
          .setTitle(`${interaction.user.displayName}'s Points Claiming Ticket`)
          .setDescription(
            "**Hello!**\nWelcome to your points claiming ticket! Our staff team will help you claim your referral points."
          )
          .setFooter({ text: `User ID: ${interaction.user.id} Bloxly Trading.` })
          .setColor("#00FF46");

        const premiummsg = new EmbedBuilder()
          .setTitle(`${interaction.user.displayName}'s Middleman Ticket`)
          .setDescription(
            "**Hello there!**\nPlease provide the details for your middleman service request, and our staff team will respond as fast as possible"
          )
          .setFooter({ text: `User ID: ${interaction.user.id} Bloxly Trading.` })
          .setColor("#00FF46");

        if (interaction.customId === "support") {
          const ticket = await interaction.guild.channels.create({
            name: `ticket ${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: supportcat,
            permissionOverwrites: [
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
              {
                id: whitelistrole,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
            ],
          });

          interaction.reply({
            content: `<#${ticket.id}> has been made for you under Points Claiming Category.`,
            ephemeral: true,
          });

          if (shouldLog('ticketCreation')) {
              const logChannel = client.channels.cache.get(log);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🎫 New Ticket Created")
                  .setDescription(`**User:** <@${interaction.user.id}> opened <#${ticket.id}> under Points Claiming Category!`)
                  .setColor("#00FF46")
                  .setTimestamp()
                  .setFooter({ text: `Ticket ID: ${ticket.id}` });

                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
              } else {
                console.error('Log channel not found:', log);
              }
            }
          ticket.send({
            content: `<@&${staffID}> <@${interaction.user.id}>\n**==========================**`,
            embeds: [supportmsg],
            components: [row2],
          });

          ticket.send({
            embeds: [pointsEmbed],
          });

          // Ask the user how many points they would like to claim with an embed
          const claimEmbed = new EmbedBuilder()
            .setTitle("💰 Points Claiming System")
            .setDescription("How many points would you like to claim?\n\nPlease respond with a number in the next 30 seconds.")
            .setColor("#00FF46")
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: "You have 30 seconds to respond" });

          const claimMessage = await ticket.send({ embeds: [claimEmbed] });

          // Create a message collector to listen for the user's response
          const collector = ticket.createMessageCollector({
            filter: m => m.author.id === interaction.user.id,
            time: 30000 // 30 seconds
          });

          collector.on('collect', async message => {
            const pointsToClaim = parseInt(message.content);

            if (isNaN(pointsToClaim) || pointsToClaim <= 0) {
              const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid Input")
                .setDescription("Invalid number of points. Please provide a valid number.")
                .setColor("#00FF46");
              message.reply({ embeds: [errorEmbed] });
              collector.stop();
              return;
            }

            const userBalance = coinManager.getBalance(interaction.user.id);

            if (pointsToClaim > userBalance) {
              const insufficientEmbed = new EmbedBuilder()
                .setTitle("❌ Insufficient Points")
                .setDescription(`You don't have enough points to claim that amount.\nYour current balance is **${userBalance}** points.`)
                .setColor("#00FF46");
              message.reply({ embeds: [insufficientEmbed] });
              collector.stop();
              return;
            }

            // Create approval buttons for admin
            const approvalRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setLabel("✅ Approve")
                  .setCustomId(`approve_${interaction.user.id}_${pointsToClaim}`)
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setLabel("❌ Deny")
                  .setCustomId(`deny_${interaction.user.id}_${pointsToClaim}`)
                  .setStyle(ButtonStyle.Danger)
              );

            const approvalEmbed = new EmbedBuilder()
              .setTitle("⏳ Awaiting Admin Approval")
              .setDescription(`**${interaction.user.displayName}** wants to claim **${pointsToClaim}** points.\n\nCurrent balance: **${userBalance}** points\nBalance after claim: **${userBalance - pointsToClaim}** points\n\n**Admin approval required.**`)
              .setColor("#00FF46")
              .setThumbnail(interaction.user.displayAvatarURL())
              .setFooter({ text: "Admin approval required | Staff use buttons below" });

            message.reply({ 
              content: `<@&${staffID}>`,
              embeds: [approvalEmbed], 
              components: [approvalRow] 
            });
            collector.stop();
          });

          collector.on('end', collected => {
            if (collected.size === 0) {
              const timeoutEmbed = new EmbedBuilder()
                .setTitle("⏰ Time Expired")
                .setDescription("You did not provide the number of points to claim in time.\n\n⚠️ **Deleting ticket in 5 minutes if there are no new messages.**")
                .setColor("#00FF46");
              ticket.send({ embeds: [timeoutEmbed] }).then(() => {
                setTimeout(async () => {
                  try {
                    const messages = await ticket.messages.fetch({ limit: 10 });
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    const recentMessages = messages.filter(msg => msg.createdTimestamp > fiveMinutesAgo && !msg.author.bot);

                    if (recentMessages.size === 0) {
                      if (shouldLog('ticketDeletion')) {
                        const logChannel = client.channels.cache.get(log);
                        if (logChannel) {
                          const logEmbed = new EmbedBuilder()
                            .setTitle("🗑️ Ticket Auto-Deleted")
                            .setDescription(`**Ticket:** ${ticket.name}\n**Reason:** No response within timeout period\n**Type:** Points Claiming`)
                            .setColor("#00FF46")
                            .setTimestamp()
                            .setFooter({ text: `Ticket ID: ${ticket.id}` });

                          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                        }
                      }
                      await ticket.delete();
                    }
                  } catch (error) {
                    console.error('Error in auto-deletion:', error);
                  }
                }, 5 * 60 * 1000);
              });
            }
          });
        }

        if (interaction.customId === "premium") {
          const ticket = await interaction.guild.channels.create({
            name: `ticket ${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: premiumcat,
            permissionOverwrites: [
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
              {
                id: whitelistrole,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
            ],
            });

          interaction.reply({
            content: `<#${ticket.id}> has been made for you under Middleman Services Category.`,
            ephemeral: true,
          });

          if (shouldLog('ticketCreation')) {
              const logChannel = client.channels.cache.get(log);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🎫 New Ticket Created")
                  .setDescription(`**User:** <@${interaction.user.id}> opened <#${ticket.id}> under Middleman Services Category!`)
                  .setColor("#00FF46")
                  .setTimestamp()
                  .setFooter({ text: `Ticket ID: ${ticket.id}` });

                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
              } else {
                console.error('Log channel not found:', log);
              }
            }
          ticket.send({
            content: `<@&${staffID}> <@${interaction.user.id}>\n**==========================**`,
            embeds: [premiummsg],
            components: [row2],
          });

          // Start the step-by-step question process
          let tradeData = {
            tradingPartner: null,
            items: null,
            gameOrPlatform: null,
            additionalInfo: null
          };

          // Question 1: Trading Partner
          const question1Embed = new EmbedBuilder()
            .setTitle("💸 Middleman Service - Question 1/3")
            .setDescription("**Who are you trading with?**\n\nPlease provide their Discord username, display name, or mention them.\n\nYou have 60 seconds to respond.")
            .setColor("#00FF46")
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: "Question 1 of 3 | 60 seconds to respond" });

          await ticket.send({ embeds: [question1Embed] });

          const collector1 = ticket.createMessageCollector({
            filter: m => m.author.id === interaction.user.id,
            time: 60000
          });

          collector1.on('collect', async message => {
            let tradingPartner = null;
            let partnerName = message.content.trim();

            // Check if they mentioned someone
            if (message.mentions.users.size > 0) {
              tradingPartner = message.mentions.users.first();
            } else {
              // Try to find the user by username or display name
              const guild = interaction.guild;

              // First try exact match
              const memberByUsername = guild.members.cache.find(member => 
                member.user.username.toLowerCase() === partnerName.toLowerCase()
              );

              const memberByDisplayName = guild.members.cache.find(member => 
                member.displayName.toLowerCase() === partnerName.toLowerCase()
              );

              if (memberByUsername) {
                tradingPartner = memberByUsername.user;
              } else if (memberByDisplayName) {
                tradingPartner = memberByDisplayName.user;
              } else {
                // Try partial match
                const partialMatch = guild.members.cache.find(member => 
                  member.user.username.toLowerCase().includes(partnerName.toLowerCase()) ||
                  member.displayName.toLowerCase().includes(partnerName.toLowerCase())
                );

                if (partialMatch) {
                  tradingPartner = partialMatch.user;
                }
              }
            }

            if (!tradingPartner) {
              const notFoundEmbed = new EmbedBuilder()
                .setTitle("❌ User Not Found")
                .setDescription(`Could not find a user with the name "${partnerName}". Please try mentioning them with @ or provide their exact username/display name.`)
                .setColor("#00FF46");
              message.reply({ embeds: [notFoundEmbed] });
              return;
            }

            if (tradingPartner.id === interaction.user.id) {
              const selfTradeEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid Trading Partner")
                .setDescription("You cannot trade with yourself! Please provide a different user.")
                .setColor("#00FF46");
              message.reply({ embeds: [selfTradeEmbed] });
              return;
            }

            // Create confirmation buttons for the ticket holder
            const confirmationRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setLabel("✅ Yes, this is correct")
                  .setCustomId(`confirm_partner_${tradingPartner.id}`)
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setLabel("❌ No, wrong person")
                  .setCustomId(`deny_partner_${tradingPartner.id}`)
                  .setStyle(ButtonStyle.Danger)
              );

            const confirmationEmbed = new EmbedBuilder()
              .setTitle("👤 Confirm Trading Partner")
              .setDescription(`Is **${tradingPartner.displayName}** (${tradingPartner.username}) the correct person you want to trade with?`)
              .setColor("#00FF46")
              .setThumbnail(tradingPartner.displayAvatarURL())
              .setFooter({ text: "Please confirm if this is the right person" });

            const confirmationMessage = await message.reply({ 
              embeds: [confirmationEmbed], 
              components: [confirmationRow] 
            });

            // Handle confirmation button interactions
            const confirmationFilter = (i) => {
              return (i.customId.startsWith('confirm_partner_') || i.customId.startsWith('deny_partner_')) && 
                     i.user.id === interaction.user.id;
            };

            const confirmationCollector = ticket.createMessageComponentCollector({
              filter: confirmationFilter,
              time: 60000,
              max: 1
            });

            confirmationCollector.on('collect', async (i) => {
              if (i.customId.startsWith('confirm_partner_')) {
                // User confirmed - add the trading partner
                tradeData.tradingPartner = tradingPartner;

                try {
                  await ticket.permissionOverwrites.create(tradingPartner.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    UseExternalEmojis: true
                  });

                  const addedEmbed = new EmbedBuilder()
                    .setTitle("✅ Trading Partner Added")
                    .setDescription(`${tradingPartner.displayName} has been added to this ticket and can now participate in the conversation.`)
                    .setColor("#00FF46")
                    .setThumbnail(tradingPartner.displayAvatarURL());

                  await i.update({ embeds: [addedEmbed], components: [] });

                } catch (error) {
                  console.error('Error adding trading partner:', error);

                  const errorEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Permission Error")
                    .setDescription(`Found ${tradingPartner.displayName} but couldn't add them to the ticket. Staff can manually add them.`)
                    .setColor("#00FF46");

                  await i.update({ embeds: [errorEmbed], components: [] });
                }

                collector1.stop();
                proceedToNextQuestion();

              } else if (i.customId.startsWith('deny_partner_')) {
                // User denied - ask for trading partner again
                const retryEmbed = new EmbedBuilder()
                  .setTitle("🔄 Please Try Again")
                  .setDescription("**Who are you trading with?**\n\nPlease provide their Discord username, display name, or mention them.\n\nYou have 60 seconds to respond.")
                  .setColor("#00FF46")
                  .setThumbnail(interaction.user.displayAvatarURL())
                  .setFooter({ text: "Question 1 of 3 | 60 seconds to respond" });

                await i.update({ embeds: [retryEmbed], components: [] });
                // Don't stop collector1, let it continue to collect the new response
              }
            });

            confirmationCollector.on('end', (collected) => {
              if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                  .setTitle("⏰ Confirmation Timeout")
                  .setDescription("You didn't confirm the trading partner in time. Please mention them again or ask staff for assistance.")
                  .setColor("#00FF46");

                confirmationMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
              }
            });

            return; // Don't proceed to next question yet

            async function proceedToNextQuestion() {

            // Question 2: Items being traded
              const question2Embed = new EmbedBuilder()
                .setTitle("💸 Middleman Service - Question 2/3")
                .setDescription("**What items/services are being traded?**\n\nPlease describe what you and your trading partner are exchanging.\n\nYou have 60 seconds to respond.")
                .setColor("#00FF46")
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: "Question 2 of 3 | 60 seconds to respond" });

              await ticket.send({ embeds: [question2Embed] });

              const collector2 = ticket.createMessageCollector({
                filter: m => m.author.id === interaction.user.id,
                time: 60000
              });

              collector2.on('collect', async message2 => {
                tradeData.items = message2.content;
                collector2.stop();

                // Set game to Roblox by default
                tradeData.gameOrPlatform = "Roblox";

                // Question 3: Additional Information (formerly question 4)
                const question3Embed = new EmbedBuilder()
                  .setTitle("💸 Middleman Service - Question 3/3")
                  .setDescription("**Any additional information or special conditions?**\n\n(Timeline, specific requirements, etc. Type 'none' if no additional info)\n\nYou have 60 seconds to respond.")
                  .setColor("#00FF46")
                  .setThumbnail(interaction.user.displayAvatarURL())
                  .setFooter({ text: "Question 3 of 3 | 60 seconds to respond" });

                await ticket.send({ embeds: [question3Embed] });

                const collector3 = ticket.createMessageCollector({
                  filter: m => m.author.id === interaction.user.id,
                  time: 60000
                });

                collector3.on('collect', async message3 => {
                  tradeData.additionalInfo = message3.content;
                  collector3.stop();

                  // Create final summary embed
                  const summaryEmbed = new EmbedBuilder()
                    .setTitle("💸 Middleman Service - Trade Summary")
                    .setDescription("**Trade details have been collected successfully!**\n\nHere's a summary of your trade request:")
                    .setColor("#00FF46")
                    .addFields(
                      { name: "👤 Requester", value: interaction.user.displayName, inline: true },
                      { name: "👤 Trading Partner", value: tradeData.tradingPartner.displayName, inline: true },
                      { name: "🎮 Game/Platform", value: tradeData.gameOrPlatform, inline: true },
                      { name: "📦 Items/Services", value: tradeData.items, inline: false },
                      { name: "📝 Additional Info", value: tradeData.additionalInfo === 'none' ? 'No additional information provided' : tradeData.additionalInfo, inline: false },
                      { name: "📋 Status", value: "Waiting for staff assistance", inline: false }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: "Bloxly Trading Middleman Service | Staff will assist you shortly" })
                    .setTimestamp();

                  await ticket.send({ 
                    content: `<@${interaction.user.id}> <@${tradeData.tradingPartner.id}> <@&1397719724372267194>`,
                    embeds: [summaryEmbed] 
                  });
                });

                collector3.on('end', collected => {
                  if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                      .setTitle("⏰ Time Expired")
                      .setDescription("You did not provide additional information in time.\n\n⚠️ **Deleting ticket in 5 minutes if there are no new messages.**")
                      .setColor("#00FF46");
                    ticket.send({ embeds: [timeoutEmbed] }).then(() => {
                      setTimeout(async () => {
                        try {
                          const messages = await ticket.messages.fetch({ limit: 10 });
                          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                          const recentMessages = messages.filter(msg => msg.createdTimestamp > fiveMinutesAgo && !msg.author.bot);

                          if (recentMessages.size === 0) {
                            if (shouldLog('ticketDeletion')) {
                              const logChannel = client.channels.cache.get(log);
                              if (logChannel) {
                                const logEmbed = new EmbedBuilder()
                                  .setTitle("🗑️ Ticket Auto-Deleted")
                                  .setDescription(`**Ticket:** ${ticket.name}\n**Reason:** No response within timeout period\n**Type:** Middleman Services`)
                                  .setColor("#00FF46")
                                  .setTimestamp()
                                  .setFooter({ text: `Ticket ID: ${ticket.id}` });

                                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                              }
                            }
                            await ticket.delete();
                          }
                        } catch (error) {
                          console.error('Error in auto-deletion:', error);
                        }
                      }, 5 * 60 * 1000);
                    });
                  }
                });
              });

              collector2.on('end', collected => {
                if (collected.size === 0) {
                  const timeoutEmbed = new EmbedBuilder()
                    .setTitle("⏰ Time Expired")
                    .setDescription("You did not provide item information in time.\n\n⚠️ **Deleting ticket in 5 minutes if there are no new messages.**")
                    .setColor("#00FF46");

                  ticket.send({ embeds: [timeoutEmbed] }).then(() => {
                    setTimeout(async () => {
                      try {
                        const messages = await ticket.messages.fetch({ limit: 10 });
                        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                        const recentMessages = messages.filter(msg => msg.createdTimestamp > fiveMinutesAgo && !msg.author.bot);

                        if (recentMessages.size === 0) {
                          if (shouldLog('ticketDeletion')) {
                            const logChannel = client.channels.cache.get(log);
                            if (logChannel) {
                              const logEmbed = new EmbedBuilder()
                                .setTitle("🗑️ Ticket Auto-Deleted")
                                .setDescription(`**Ticket:** ${ticket.name}\n**Reason:** No response within timeout period\n**Type:** Middleman Services`)
                                .setColor("#00FF46")
                                .setTimestamp()
                                .setFooter({ text: `Ticket ID: ${ticket.id}` });

                              logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                            }
                          }
                          await ticket.delete();
                        }
                      } catch (error) {
                        console.error('Error in auto-deletion:', error);
                      }
                    }, 5 * 60 * 1000);
                  });
                }
              });
            }
          });

          collector1.on('end', collected => {
            if (collected.size === 0) {
              const timeoutEmbed = new EmbedBuilder()
                .setTitle("⏰ Time Expired")
                .setDescription("You did not provide a trading partner in time. You can still mention them manually or ask staff for assistance.")
                .setColor("#00FF46");
              ticket.send({ embeds: [timeoutEmbed] });
            }
          });
        }
      }

      // Handle close button
      if (interaction.customId === "close") {
        // Check if the user has the whitelisted role
        const guild = interaction.guild;
        const member = guild.members.cache.get(interaction.user.id);

        if (!member.roles.cache.has(whitelistrole)) {
          // User is not whitelisted, send an ephemeral message
          interaction.reply({
            content: "You are not whitelisted to perform this action, You need helper role.",
            ephemeral: true,
          });
          return;
        }

        const deleteButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel("🗑️ Delete")
              .setCustomId("delete")
              .setStyle(ButtonStyle.Danger)
          );

        const close2Button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel("🔒 Close")
              .setCustomId("close2")
              .setStyle(ButtonStyle.Primary)
          );

        interaction.update({ content: `<@${interaction.user.id}> **Please click on either of the following button.**`, components: [deleteButton, close2Button] });
      }

      // Handle delete button
      if (interaction.customId === "delete") {
        // Delete the channel
        const channel = interaction.channel;
        channel.delete()
          .then(() => {
            if (shouldLog('ticketDeletion')) {
              const logChannel = client.channels.cache.get(log);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🗑️ Ticket Deleted")
                  .setDescription(`**User:** <@${interaction.user.id}> deleted a ticket.`)
                  .setColor("#00FF46")
                  .setTimestamp()
                  .setFooter({ text: `Ticket ID: ${channel.id}` });
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
              } else {
                console.error('Log channel not found:', log);
              }
            }
          })
          .catch(console.error);
      }

      // Handle close2 button
      if (interaction.customId === "close2") {
        interaction.channel.permissionOverwrites.set([
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }
        ]);
        interaction.reply(`<@${interaction.user.id}> closed the ticket.`);
        if (shouldLog('ticketClosure')) {
          const logChannel = client.channels.cache.get(log);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle("🔒 Ticket Closed")
              .setDescription(`**User:** <@${interaction.user.id}> closed a ticket.`)
              .setColor("#00FF46")
              .setTimestamp()
              .setFooter({ text: `Ticket ID: ${interaction.channel.id}` });
            logChannel.send({ embeds: [logEmbed] }).catch(console.error);
          } else {
            console.error('Log channel not found:', log);
          }
        }
      }

      // Handle deny button clicks  
      if (interaction.customId && interaction.customId.startsWith('deny_')) {
        const [_, userId, pointsToClaim] = interaction.customId.split('_');
        const user = await client.users.fetch(userId);
        const points = parseInt(pointsToClaim);

        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== owner) {
          return interaction.reply({
            content: "❌ You need administrator permissions to deny point claims.",
            ephemeral: true
          });
        }

        const deniedEmbed = new EmbedBuilder()
          .setTitle("❌ Claim Denied")
          .setDescription(`Your claim for **${points}** points has been denied by **${interaction.user.displayName}**.\n\n**Claim Failed**`)
          .setColor("#00FF46")
          .setThumbnail(user.displayAvatarURL());

        try {
          await user.send({ embeds: [deniedEmbed] });
        } catch (error) {
          console.error(`Could not send denial message to ${user.tag}.`, error);
        }

        const deniedStaffEmbed = new EmbedBuilder()
          .setTitle("❌ Claim Denied")
          .setDescription(`Claim for ${user.displayName} has been denied by **${interaction.user.displayName}**.\n\n**Claim Failed**`)
          .setColor("#00FF46");

        interaction.update({ embeds: [deniedStaffEmbed], components: [] });

        // Log the denial to the logs channel
        const logEmbed = new EmbedBuilder()
          .setTitle("❌ Points Claim Denied")
          .setDescription(`**Admin:** ${interaction.user.displayName}\n**User:** ${user.displayName}\n**Points Requested:** ${points}\n**Action:** Claim Denied\n**Status:** Claim Failed`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${userId} | Admin ID: ${interaction.user.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }

      // Handle approve button clicks
      if (interaction.customId && interaction.customId.startsWith('approve_')) {
        const [_, userId, pointsToClaim] = interaction.customId.split('_');
        const user = await client.users.fetch(userId);
        const points = parseInt(pointsToClaim);

        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== owner) {
          return interaction.reply({
            content: "❌ You need administrator permissions to approve point claims.",
            ephemeral: true
          });
        }

        const oldBalance = coinManager.getBalance(userId);
        coinManager.removeCoins(userId, points, interaction.user.id);
        const newBalance = coinManager.getBalance(userId);

        const successEmbed = new EmbedBuilder()
          .setTitle("✅ Points Claimed Successfully")
          .setDescription(`Successfully claimed **${points}** points for ${user.displayName}!\n**Admin:** ${interaction.user.displayName}\n**Old Balance:** ${oldBalance}\n**New Balance:** ${newBalance}`)
          .setColor("#00FF46")
          .setThumbnail(user.displayAvatarURL());

        interaction.update({ embeds: [successEmbed], components: [] });

        // Log the approval to the logs channel
        const logEmbed = new EmbedBuilder()
          .setTitle("✅ Points Claim Approved")
          .setDescription(`**Admin:** ${interaction.user.displayName}\n**User:** ${user.displayName}\n**Points Claimed:** ${points}\n**Old Balance:** ${oldBalance}\n**New Balance:** ${newBalance}\n**Action:** Claim Approved`)
          .setColor("#00FF46")
          .setTimestamp()
          .setFooter({ text: `User ID: ${userId} | Admin ID: ${interaction.user.id}` });

        const logChannel = client.channels.cache.get(log);
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        } else {
          console.error('Log channel not found:', log);
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.toLowerCase() === `!setup`) {
    // Create General Tickets category
    const generalTicketsCategory = await message.guild.channels.create({
      name: 'General Tickets',
      type: ChannelType.GuildCategory,
    });

    // Create Premium Tickets category
    const premiumTicketsCategory = await message.guild.channels.create({
      name: 'Premium Tickets',
      type: ChannelType.GuildCategory,
    });

    // Create Ticket Logs category
    const ticketLogsCategory = await message.guild.channels.create({
      name: 'Logs', 
      type: ChannelType.GuildCategory,
    });

    // Create a channel inside Ticket Logs category named 'ticket-logs'
    const ticket = await message.guild.channels.create({
      name: `ticket logs`,
      type: ChannelType.GuildText,
      parent: ticketLogsCategory,
      permissionOverwrites: [
        {
          id: message.author.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: whitelistrole,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: message.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
      });

    // Reply to the user in the channel where the command was received
    message.channel.send({ embeds: [new EmbedBuilder().setDescription('Ticket setup completed!').setColor("#00FF46")] });
  }
});

client.login(process.env.TOKEN);