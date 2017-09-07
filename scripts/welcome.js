module.exports = function(robot) {
    robot.enter(function(res) {
        if (res.message.room === 'bot-test') {
            res.reply("Welcome to wordstream!");
        }
    });
};
