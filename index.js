const discord = require('discord.js');
const config = require("./config.json")
const fs = require('fs')

const client = new discord.Client();
let prefix = '!'

client.on("ready", function() {
    console.log("Bot is online");
});

client.on("message", function(msg) {
    if(msg.content === "MatCH") {
        msg.channel.send("'Vo")
    }
})

client.login(config.token)