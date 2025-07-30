import io
import os
import discord
from discord.ext import commands
import random
import asyncio
import time

TOKEN = os.getenv("TOKEN")

if not TOKEN:
    print("❌ ERROR: Bot token not found in environment variables.")
    exit(1)

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

PRIVATE_SERVER_LINKS = [
    "https://www.roblox.com/share?code=7cbd27e134dc14419dc6f59f0db4fae2&type=Server",
    "https://www.roblox.com/share?code=1c22942037557d45a6437c8d9ce795ec&type=Server",
    "https://www.roblox.com/share?code=64630bf5a8ac444bbf5cc45ef1a8141e&type=Server",
    "https://www.roblox.com/share?code=24d685f190d78d4a8fb56e16ae9c286f&type=Server",
    "https://www.roblox.com/share?code=c78a76c177dad84bb7db98308c6b11ce&type=Server",
    "https://www.roblox.com/share?code=c06c4e3ceb7bb644bfd8af298eb18d25&type=Server",
]

used_links = {}
REFRESH_TIME = 300  # 5 minutes

VOUCHES_CHANNEL_ID = 1378129031202865162
ORDER_CHANNEL_ID = 1378128360278065358
PRICES_CHANNEL_ID = 1379768871191318548
PRICES_MESSAGE_ID = 1396499645701820557

@bot.event
async def on_ready():
    print(f'✅ Bot is online as {bot.user} (ID: {bot.user.id})')
    print(f'📦 Loaded extensions: {list(bot.extensions.keys())}')
    print(f'🛠️ Registered cogs: {list(bot.cogs.keys())}')
    bot.loop.create_task(clean_used_links())

@bot.event
async def on_member_join(member):
    order_channel = bot.get_channel(ORDER_CHANNEL_ID)
    vouch_channel = bot.get_channel(VOUCHES_CHANNEL_ID)

    if order_channel:
        msg = await order_channel.send(f"🛍️ {member.mention} Buy Pets/Request Our Services Here! 🛍️")
        await asyncio.sleep(5)
        await msg.delete()

    if vouch_channel:
        msg = await vouch_channel.send(f"🎉 {member.mention} Check Out Our Reputable Vouches! 🎉")
        await asyncio.sleep(5)
        await msg.delete()

@bot.event
async def on_message(message):
    if message.channel.id == VOUCHES_CHANNEL_ID and not message.author.bot:
        await message.add_reaction("❤️")
    await bot.process_commands(message)

def admin_only():
    async def predicate(ctx):
        if ctx.command.name in ["payment", "prices"]:
            return True
        if ctx.author.guild_permissions.administrator:
            return True
        await ctx.send("❌ You don't have access to this command.")
        return False
    return commands.check(predicate)

@bot.command()
@admin_only()
async def gardenps(ctx):
    now = time.time()
    available_links = [link for link in PRIVATE_SERVER_LINKS if link not in used_links or now - used_links[link] > REFRESH_TIME]

    if not available_links:
        await ctx.send("⏳ All private server links are in use. Please try again shortly.")
        return

    chosen = random.choice(available_links)
    used_links[chosen] = now

    embed = discord.Embed(
        title="✅ Join the Private Server",
        description=(
            "Click the link below or copy it manually:\n"
            f"```{chosen}```\n"
            f"🔗 [Join Server]({chosen})"
        ),
        color=0x2ecc71
    )
    await ctx.send(embed=embed)
    # 📣 Reminder message
    await ctx.send("📣 **Ping @seller when you have joined the private server!**")

@bot.command()
@admin_only()
async def pslist(ctx):
    now = time.time()
    lines = []
    for link in PRIVATE_SERVER_LINKS:
        if link in used_links:
            time_left = max(0, REFRESH_TIME - (now - used_links[link]))
            lines.append(f"❌ {link} (Refresh in {int(time_left)}s)")
        else:
            lines.append(f"✅ {link} (Available)")
    await ctx.send("\n".join(lines))

@bot.command()
async def prices(ctx):
    channel = bot.get_channel(PRICES_CHANNEL_ID)
    if not channel:
        await ctx.send("❌ Could not find the prices channel.")
        return
    try:
        message = await channel.fetch_message(PRICES_MESSAGE_ID)
        await ctx.send(message.content)
    except:
        await ctx.send("❌ Unable to fetch prices message.")

@bot.command()
async def payment(ctx):
    embed = discord.Embed(
        title="💳 PAYMENT INFORMATION",
        description=(
            "**📢 IMPORTANT NOTICE**\n"
            "All payments **must** be sent as **'Friends & Family'**.\n"
            "❌ If you send it as **'Goods & Services'**, your order **will not** be filled — **no exceptions**.\n\n"
            "➡️ After paying, **ping your seller in this channel**.\n"
            "Please be patient while your order is processed."
        ),
        color=0xff0000
    )

    embed.add_field(
        name="__**━━ <:paypal:1388958258559189137> PAYPAL ━━**__",
        value=(
            "⚠️ **DO NOT PUT ANYTHING IN THE PAYMENT NOTE!**\n\n"
            "**Paypal:** **[Click Here](https://www.paypal.me/josephc2421)**\n"
        ),
        inline=False
    )

    embed.add_field(
        name="__**━━ <:cashapp:1388957465474764950> CASHAPP ━━**__",
        value=(
            "⚠️ **WHEN PAYING:**\n"
            "➡️ **DO NOT PUT ANYTHING IN THE NOTE**\n"
            "➡️ **PUT A PERIOD IN THE NOTE ONLY!**\n\n"
            "**[CLICK HERE TO PAY VIA CASHAPP](https://cash.app/$bloxlymarket)**\n\n"
	    "**[(Lemonade) CLICK HERE TO PAY VIA CASHAPP](https://cash.app/$bloxly)**\n\u200b"

        ),
        inline=False
    )

    embed.add_field(
        name="__**━━ 🛒 WEBSITE STORE ━━**__",
        value=(
            "⚠️ **ONLY USE THE WEBSITE IF YOU DON'T HAVE OTHER PAYMENT OPTIONS**\n\n"
            "**[BloxlyMart Store](https://payhip.com/BloxlyMarket)**\n\u200b"
        ),
        inline=False
    )

    await ctx.send(embed=embed)
    await ctx.send("📸 **Send a screenshot with your username and email used for the payment.**")


@bot.command()
async def cmds(ctx):
    cmds_list = [
        "!gardenps - Get a private server link (Admin only)",
        "!pslist - View all PS links and cooldowns (Admin only)",
        "!prices - Fetch prices message",
        "!payment - Show payment instructions",
        "!cmds - List all bot commands"
    ]
    await ctx.send("**Available Commands:**\n" + "\n".join(cmds_list))

async def clean_used_links():
    while True:
        now = time.time()
        for link in list(used_links):
            if now - used_links[link] > REFRESH_TIME:
                del used_links[link]
        await asyncio.sleep(60)

@bot.command(name="price")
async def price_alias(ctx):
    await prices(ctx)

@bot.command(name="payments")
async def payments_alias(ctx):
    await payment(ctx)

# ✅ Add this for async extension loading and startup
async def main():
    try:
        await bot.load_extension("ticket_module")
        print("✅ ticket_module loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load ticket_module: {e}")
    await bot.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(main())
