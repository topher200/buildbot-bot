module.exports = function(robot) {
    robot.enter(function(res) {
        var roomName = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(res.message.room).name;
        console.log(`received enter event. room name: ${roomName}`);
        if (roomName === 'bot-test') {
            console.log('replying to new user');
            var userName = robot.adapter.client.rtm.dataStore.getDMByName(res.message.user.name);
            console.log(`sending welcome message to ${username}`);
            // messages to users are sent like messages to rooms, except they're to a user's id
            res.messageRoom(userName.id, "Welcome to wordstream!");
        }
    });
};
