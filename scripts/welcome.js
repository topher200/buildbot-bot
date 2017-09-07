// Description:
//   Sends a welcome message (direct message) to users who join a given set of channels
//
// Dependencies:
//
// Configuration:
//   - specify ROOM_LIST as the set of channels
//   - specify WELCOME_MESSAGE as the message to send
//
// Commands:
//
// Author:
//   t.brown@wordstream.com

var ROOM_LIST = ['bot-test', 'welcome-bot'];

var WELCOME_MESSAGE = 'Welcome to Wordstream!';

module.exports = function(robot) {
    robot.enter(function(res) {
        var roomName = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(res.message.room).name;
        console.log(`received enter event. room name: ${roomName}, user: ${res.message.user.name}`);
        if (ROOM_LIST.includes(roomName)) {
            var userName = robot.adapter.client.rtm.dataStore.getDMByName(res.message.user.name);
            console.log(`sending welcome message to ${userName}`);
            // messages to users are sent like messages to rooms, except they're to a user's id
            robot.messageRoom(userName.id, WELCOME_MESSAGE);
        }
    });

    robot.respond(/welcome me/i, function(res) {
        var userName = robot.adapter.client.rtm.dataStore.getDMByName(res.message.user.name);
        console.log(`responding to 'welcome me' from ${res.message.user.name}`);
        robot.messageRoom(userName.id, WELCOME_MESSAGE);
    });
};
