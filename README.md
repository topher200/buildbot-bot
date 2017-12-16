# buildbot-bot

buildbot is a chat bot built on the [Hubot][hubot] framework. It was
initially generated by [generator-hubot][generator-hubot].

This specific hubot is made to talk to buildbot v0.8

[hubot]: http://hubot.github.com
[generator-hubot]: https://github.com/github/generator-hubot

### Running buildbot

#### Setup
Set environment vars by filling out a `.env` in this dir. contents:
 * export HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH="https://buildbot.YOUR_SITE.com"
 * export HUBOT_HTTP_AUTH="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" <- pass from apache
 * export HUBOT_DEBUG_LOGGING='on'  <--- very verbose!
 * export HUBOT_ACCEPT_BAD_SSL_CERTS= 0 | 1

Set the `http_auth` var with the username:password combo in apache by calling
`hubot buildbot auth <VAR>`.

#### Running
Run tests with
    $ ./run-tests.sh

You can start buildbot locally by running:
    $ bin/hubot

You'll see some start up output and a prompt:

    [Sat Feb 28 2015 12:38:27 GMT+0000 (GMT)] INFO Using default redis on localhost:6379
    buildbot>

Then you can interact with buildbot by typing `buildbot help`.

    buildbot> buildbot help
    buildbot animate me <query> - The same thing as `image me`, except adds [snip]
    buildbot help - Displays all of the help commands that buildbot knows about.
    ...
