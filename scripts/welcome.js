module.exports = function(robot) {
    robot.enter(function(res) {
        console.log(`received enter message: ${res}, ${res.message.room}`);
        if (res.message.room === 'bot-test') {
            console.log('replying to new user');
            res.reply("Welcome to wordstream!");
        }
    });
};
