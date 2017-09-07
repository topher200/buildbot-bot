module.exports = function(robot) {
    robot.enter(function(res) {
        var roomName = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(res.message.room).name;
        console.log(`received enter message. room name: ${roomName}`);
        if (roomName === 'bot-test') {
            console.log('replying to new user');
            res.reply("Welcome to wordstream!");
        }
    });
};
