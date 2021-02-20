const discord = require('discord.js');
const config = require("./config.json")
const fs = require('fs')

const client = new discord.Client();
let prefix = '!';
const startPoints = 2020;
let rouletteInzetMag = true;
let currentRouletteInzet = {};
let wheelInzetMag = true;
let currentWheel = {};
const helpImage = "https://cdn.discordapp.com/attachments/708321188945854538/812410074256375868/unknown.png";

let points = JSON.parse(fs.readFileSync("./points.json", "utf8"));

client.on("ready", function () {
    console.log("Bot is online");
});

client.on("message", function (msg) {



    if (msg.author.bot) {
        return;
    }

    if (msg.channel.type === "dm") {
        msg.channel.send("Private messages are disabled");
        return;
    }

    if (!points[msg.author.id]) {
        points[msg.author.id] = startPoints;

        fs.writeFile("./points.json", JSON.stringify(points), (err) => {
            if (err) console.warn(err);
        })
    }

    // true iff user is match Member
    if (msg.member.roles.cache.some(r => r.name.toLowerCase() === "match")) {

        //add money to user
        if (msg.content.startsWith(prefix + "add ")) {
            let message = msg.content.substring(prefix.length + 4)
            let arr = message.split(' ')
            let id = getUserFromMention(arr[0])
            addPoints(id, parseInt(arr[1]))
        }
    }


    //wheel game
    if (msg.content.startsWith(prefix + "wheel ")) {
        let message = msg.content.substr(prefix.length + 6);
        //user is match member
        if (msg.member.roles.cache.some(r => r.name.toLowerCase() === "match")) {
            if (message.startsWith('close')) {
                wheelInzetMag = false;
            }
            if (message.startsWith('multiply')) {
                let factor = parseFloat(message.split(' ')[1]) - 1
                for (let key in currentWheel) {
                    let amount = currentWheel[key];
                    addPoints(key, amount * factor)
                }
                wheelInzetMag = true;
                currentWheel = {};
            }
            if (message.startsWith('add')) {
                let amount = parseInt(message.split(' ')[1])
                for (let key in currentWheel) {
                    addPoints(key, amount)
                }
                wheelInzetMag = true;
                currentWheel = {};
            }
        }

        //user is not match member
        if (message.startsWith('bet')) {
            if (!wheelInzetMag) {
                msg.channel.send("Game in progress, betting is closed.");
            } else {
                let amount = parseFloat(message.split(' ')[1])
                if (!Number.isNaN(amount) && amount != 0) {
                    currentWheel[msg.author.id] = amount;
                    msg.channel.send("you have betted: " + amount)
                } else {
                    msg.channel.send("please give your bet in the following format: " + prefix + "wheel bet [number]")
                }
            }
        }


    }

    // check balance
    if (msg.content.startsWith(prefix + "balance")) {
        // check other peoples balance
        const parts = msg.content.split(" ");
        let mention;
        if (parts.length > 1) mention = parts[1];
        if (mention) {
            msg.channel.send("Balance of " + mention + " is " + points[getUserFromMention(mention)]);
        } else {
            msg.channel.send("Balance of " + msg.author.username + " is " + points[msg.author.id]);
        }
    }

    // roulette
    if (msg.content.startsWith(prefix + "roulette")) {
        roulette(msg);
    }


    if (msg.content === "MatCH") {
        msg.channel.send("\'Vo")
    }
})

function addPoints(authorID, amount) {
    if (!points[authorID]) {
        // user not found
        // msg.channel.send("User not found");
        return;
    }
    if (points[authorID] + amount < 0) {
        // No more money
        // msg.channel.send("Error: User would end with negative money");
        points[authorID] = 0;
        return;
    }

    // TODO add message to let users know how many points they won/lost

    points[authorID] = parseFloat(points[authorID]) + amount;

    fs.writeFile("./points.json", JSON.stringify(points), (err) => {
        if (err) console.warn(err);
    })
}

function roulette(msg) {
    const split = msg.content.split(" ");

    const command = split[1];
    if (command === "stop" && msg.member.roles.cache.some(r => r.name.toLowerCase() === "match")) {
        rouletteInzetMag = false;
        msg.channel.send("Roulette betting has stopped, spinning will start soon!");
        return;
    } else if (command === "start" && msg.member.roles.cache.some(r => r.name.toLowerCase() === "match")) {
        rouletteInzetMag = true;
        msg.channel.send("You can now place your bets for Roulette!")
        msg.channel.send(helpImage);
        // TODO: roulette help bericht hier
        return;
    } else if (command === "spin" && msg.member.roles.cache.some(r => r.name.toLowerCase() === "match")) {
        const outcome = split[2];
        rouletteSpin(msg, outcome);
        return;
    } else if (command === "help") {
        printRouletteHelp(msg);
        return;
    } else if (!rouletteInzetMag) {
        msg.channel.send("Roulette is not open for betting right now");
        return;
    }

    const inzet = split[1].toLowerCase();
    const hoeveelheid = parseFloat(split[2]);
    if (!inzet || isNaN(hoeveelheid) || hoeveelheid <= 0) {
        // verkeerde input
        msg.channel.send("Unknown input (error 1)");
        return;
    }

    // check valid input

    if (isNaN(getMultiplier(inzet))) {
        // verkeerde input
        msg.channel.send("Unknown input (error 2)");
        return;
    }

    if (!currentRouletteInzet[msg.author.id]) {
        currentRouletteInzet[msg.author.id] = [];
    }

    //check of de user niet meer geld inzet dan hij heeft
    let betAmount = hoeveelheid;
    for (let i of currentRouletteInzet[msg.author.id]) {
        betAmount += i.hoeveelheid;
    }
    if (betAmount > points[msg.author.id]) {
        msg.channel.send("You don't have that much money");
        return;
    }

    msg.channel.send("You bet " + hoeveelheid + " on " + inzet + " which has multiplier " + getMultiplier(inzet));


    currentRouletteInzet[msg.author.id].push({
        inzet: inzet,
        hoeveelheid: hoeveelheid
    });


}

function getMultiplier(inzet) {
    switch (inzet) {
        case "black":
        case "red":
        case "even":
        case "odd":
        case "1to18":
        case "19to36":
            return 1;
        case "1st":
        case "2nd":
        case "3rd":
        case "a":
        case "b":
        case "c":
            return 2;
        default:
            const num = parseInt(inzet);
            if (isNaN(num) || num < 0 || num > 36) {
                // verkeerde input
                return NaN;
            }
            return 35;
    }
}

function rouletteSpin(msg, outcome) {
    const num = parseInt(outcome);
    if (num < 0 || num > 36) {
        // verkeerde input
        msg.channel.send("Unknown input (error 3)");
        return;
    }

    // loop door alle personen
    for (const [userID, inzetArr] of Object.entries(currentRouletteInzet)) {
        let winAmount = 0;
        // loop door alle inzetten
        for (const inzetObj of inzetArr) {
            if (isWin(num, inzetObj.inzet)) {
                winAmount += (getMultiplier(inzetObj.inzet) * inzetObj.hoeveelheid);
            } else {
                winAmount -= inzetObj.hoeveelheid;
            }
        }
        addPoints(userID, winAmount);
        msg.channel.send(client.users.cache.find(user => user.id === userID).username + " has won " + winAmount + " and now has a balance of " + points[userID]);
    }
    // TODO do not allow betting more than your balance

    currentRouletteInzet = {};

}

function isWin(actualNumber, inzet) {
    switch (inzet) {
        case "black":
            return blacks.includes(actualNumber);
        case "red":
            return reds.includes(actualNumber);
        case "even":
            return actualNumber !== 0 && actualNumber % 2 === 0;
        case "odd":
            return actualNumber % 2 === 1;
        case "1to18":
            return actualNumber > 0 && actualNumber < 19;
        case "19to36":
            return actualNumber > 18 && actualNumber < 37;
        case "1st":
            return actualNumber > 0 && actualNumber < 13;
        case "2nd":
            return actualNumber > 12 && actualNumber < 25;
        case "3rd":
            return actualNumber > 24 && actualNumber < 37;
        case "a":
            return actualNumber % 3 === 1;
        case "b":
            return actualNumber % 3 === 2;
        case "c":
            return actualNumber !== 0 && actualNumber % 3 === 0;

        default:
            const num = parseInt(inzet);
            if (isNaN(inzet) || num < 0 || num > 36) {
                // verkeerde input
                // msg.channel.send("Unknown input (error 4)");
                return NaN;
            }
            return actualNumber === num;
    }
}

function setPoints(authorID, amount) {
    if (!points[authorID]) {
        // user not found
        return;
    }
    if (amount < 0) {
        // error
        return;
    }

    points[authorID] = amount;

    fs.writeFile("./points.json", JSON.stringify(points), (err) => {
        if (err) console.warn(err);
    })
}

function getUserFromMention(mention) {
    if (!mention) return;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }

        return client.users.cache.get(mention).id;
    }
}

function printRouletteHelp(msg) {
    msg.channel.send("After betting has opened you can bet by using \"!roulette <bet> <amount>\"\n" +
    "The options for bet are the following: \"black\", \"red\", \"1st\", \"2nd\", \"3rd\", \"1to18\", \"19to36\", \"a\", \"b\", \"c\" or any number\n" +
    "For example \"!roulette black 100\" or \"!roulette 5 2020\"\n" +
    "To make multiple bets simply type them in separate messages\n");
    msg.channel.send(helpImage);
}

const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const blacks = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

client.login(config.token)
