import discord
from discord.ext import commands
import os
import json
from discord.ui import View, Select, Button

POINTS_FILE = "points.json"
REWARDS_FILE = "rewards.json"

async def setup(bot):
    await bot.add_cog(TicketModule(bot))
    print("✅ [ticket_module] Cog setup() called, TicketModule added")
